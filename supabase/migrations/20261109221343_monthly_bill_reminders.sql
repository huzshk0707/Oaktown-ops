-- Private recurring reminder configuration and per-month staff attestations.
-- No bill names, balances, account details or production schedule are seeded here.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
create schema ops_bill_private;
revoke all on schema ops_bill_private from public,anon,authenticated;
grant usage on schema ops_bill_private to authenticated;

create table ops_bill_private.rules(
 id uuid primary key default gen_random_uuid(),
 rule_key text not null unique check(length(rule_key) between 1 and 80),
 label text not null check(length(btrim(label)) between 1 and 100),
 recipient text not null check(length(btrim(recipient)) between 1 and 80),
 day_from integer not null check(day_from between 1 and 31),
 day_through integer not null check(day_through between day_from and 31),
 kind text not null check(kind in ('payment','autopay_check')),
 instructions text not null check(length(btrim(instructions)) between 1 and 1000),
 start_month date not null check(extract(day from start_month)=1),
 lead_days integer not null default 3 check(lead_days between 0 and 14),
 active boolean not null default true,
 source_ref text not null check(length(btrim(source_ref)) between 1 and 250),
 created_at timestamptz not null default clock_timestamp(),
 created_by_role text not null default session_user
);
create table ops_bill_private.events(
 id uuid primary key default gen_random_uuid(),
 rule_id uuid not null references ops_bill_private.rules(id),
 period date not null check(extract(day from period)=1),
 revision integer not null check(revision>0),
 action text not null check(action in ('reminded','verified','reopened')),
 actor_id uuid not null,
 note text check(length(note)<=500),
 occurred_at timestamptz not null default clock_timestamp(),
 unique(rule_id,period,revision)
);
create table ops_bill_private.occurrences(
 rule_id uuid not null references ops_bill_private.rules(id),
 period date not null check(extract(day from period)=1),
 revision integer not null check(revision>0),
 reminded_at timestamptz,
 verified_at timestamptz,
 note text check(length(note)<=500),
 last_action text not null check(last_action in ('reminded','verified','reopened')),
 last_event_id uuid not null references ops_bill_private.events(id),
 updated_at timestamptz not null,
 primary key(rule_id,period)
);
create index bill_occurrences_last_event_idx on ops_bill_private.occurrences(last_event_id);
alter table ops_bill_private.rules enable row level security;
alter table ops_bill_private.events enable row level security;
alter table ops_bill_private.occurrences enable row level security;
revoke all on all tables in schema ops_bill_private from public,anon,authenticated;

-- Private definers provide narrowly checked access to tables with no client grants.
-- Public API functions below remain invokers. No JWT user_metadata is trusted.
create function ops_bill_private.snapshot() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.staff_memberships
  where user_id=auth.uid() and is_active and role in ('admin','editor','viewer'))
 then raise exception 'Active staff access required' using errcode='42501';end if;
 if (select count(*) from ops_bill_private.rules)>100
  or (select count(*) from ops_bill_private.occurrences)>5000
 then raise exception 'Reminder record limit reached; review required' using errcode='54000';end if;
 select jsonb_build_object(
  'rules',coalesce((select jsonb_agg(to_jsonb(r)-'created_by_role' order by r.day_from,r.id) from ops_bill_private.rules r),'[]'::jsonb),
  'occurrences',coalesce((select jsonb_agg(to_jsonb(o) order by o.period,o.rule_id) from ops_bill_private.occurrences o),'[]'::jsonb),
  'can_edit',exists(select 1 from public.staff_memberships where user_id=auth.uid() and is_active and role in ('admin','editor'))
 ) into result;
 return result;
end$$;
revoke all on function ops_bill_private.snapshot() from public,anon;
grant execute on function ops_bill_private.snapshot() to authenticated;

create function ops_bill_private.record(
 p_rule uuid,p_period date,p_action text,p_expected_revision integer,p_note text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); rule ops_bill_private.rules%rowtype;
 old_row ops_bill_private.occurrences%rowtype; saved ops_bill_private.occurrences%rowtype;
 event_id uuid; version integer; note_text text:=nullif(btrim(p_note),''); stamp timestamptz:=clock_timestamp();
 current_month date:=date_trunc('month',statement_timestamp() at time zone 'America/New_York')::date;
begin
 if actor is null or not exists(select 1 from public.staff_memberships
  where user_id=actor and is_active and role in ('admin','editor'))
 then raise exception 'Active editor access required' using errcode='42501';end if;
 if p_rule is null or p_period is null or extract(day from p_period)<>1
  or p_expected_revision is null or p_expected_revision<0 or p_action is null
  or p_action not in ('reminded','verified','reopened') or length(coalesce(note_text,''))>500
 then raise exception 'Invalid reviewed reminder update' using errcode='22023';end if;
 if p_action in ('verified','reopened') and length(coalesce(note_text,''))<5
 then raise exception 'A short confirmation or reopening note is required' using errcode='22023';end if;
 -- Locks serialize each rule, including first writes where no occurrence exists.
 select * into rule from ops_bill_private.rules where id=p_rule and active for update;
 if not found or p_period<rule.start_month or p_period>(current_month+interval '1 month')::date
 then raise exception 'Reminder or month is not available' using errcode='22023';end if;
 select * into old_row from ops_bill_private.occurrences where rule_id=p_rule and period=p_period;
 if coalesce(old_row.revision,0)<>p_expected_revision
 then raise exception 'Reminder changed; refresh before saving' using errcode='40001';end if;
 if (old_row.verified_at is not null and p_action<>'reopened')
  or (old_row.verified_at is null and p_action='reopened')
 then raise exception 'Review the current confirmation state before updating' using errcode='22023';end if;
 version:=coalesce(old_row.revision,0)+1;
 insert into ops_bill_private.events(rule_id,period,revision,action,actor_id,note,occurred_at)
 values(p_rule,p_period,version,p_action,actor,note_text,stamp) returning id into event_id;
 insert into ops_bill_private.occurrences(rule_id,period,revision,reminded_at,verified_at,note,last_action,last_event_id,updated_at)
 values(p_rule,p_period,version,case when p_action='reminded' then stamp else old_row.reminded_at end,
  case when p_action='verified' then stamp else null end,note_text,p_action,event_id,stamp)
 on conflict(rule_id,period) do update set revision=excluded.revision,reminded_at=excluded.reminded_at,
  verified_at=excluded.verified_at,note=excluded.note,last_action=excluded.last_action,
  last_event_id=excluded.last_event_id,updated_at=excluded.updated_at
 returning * into saved;
 return to_jsonb(saved);
end$$;
revoke all on function ops_bill_private.record(uuid,date,text,integer,text) from public,anon;
grant execute on function ops_bill_private.record(uuid,date,text,integer,text) to authenticated;

create function public.ops_bill_reminders() returns jsonb
language sql stable security invoker set search_path='' as $$select ops_bill_private.snapshot()$$;
create function public.ops_bill_reminder_record(p_rule uuid,p_period date,p_action text,p_expected_revision integer,p_note text default null)
returns jsonb language sql security invoker set search_path='' as $$
 select ops_bill_private.record(p_rule,p_period,p_action,p_expected_revision,p_note)
$$;
revoke all on function public.ops_bill_reminders() from public,anon;
revoke all on function public.ops_bill_reminder_record(uuid,date,text,integer,text) from public,anon;
grant execute on function public.ops_bill_reminders() to authenticated;
grant execute on function public.ops_bill_reminder_record(uuid,date,text,integer,text) to authenticated;
commit;
