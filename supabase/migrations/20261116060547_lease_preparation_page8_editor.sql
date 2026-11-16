-- Additive preparation/review infrastructure; never changes a property, unit,
-- tenancy, executed lease, task, payment or signature record.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
create schema ops_lease_private;
revoke all on schema ops_lease_private from public,anon,authenticated;
create table ops_lease_private.preparations(
 id uuid primary key,
 actor_id uuid not null references auth.users(id),
 unit_id uuid not null references public.units(id),
 lease_id uuid references public.leases(id),
 version integer not null default 1 check(version>0),
 status text not null check(status in ('draft','ready','approved')),
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<=250000),
 last_request uuid not null,
 receipt jsonb,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp()
);
create index ops_lease_preparations_actor on ops_lease_private.preparations(actor_id,updated_at desc,id);
create index ops_lease_preparations_unit on ops_lease_private.preparations(unit_id);
create index ops_lease_preparations_lease on ops_lease_private.preparations(lease_id);
alter table ops_lease_private.preparations enable row level security;
revoke all on ops_lease_private.preparations from public,anon,authenticated;
create table ops_lease_private.approvals(
 case_id uuid not null references ops_lease_private.preparations(id),
 version integer not null,
 actor_id uuid not null references auth.users(id),
 request_ref uuid not null,
 unit_id uuid not null references public.units(id),
 data jsonb not null,
 receipt jsonb not null,
 approved_at timestamptz not null default clock_timestamp(),
 primary key(case_id,version),unique(actor_id,request_ref)
);
create index ops_lease_approvals_unit on ops_lease_private.approvals(unit_id,approved_at desc);
alter table ops_lease_private.approvals enable row level security;
revoke all on ops_lease_private.approvals from public,anon,authenticated;

create function ops_lease_private.staff_actor() returns uuid
language plpgsql security definer set search_path='' as $$
declare c jsonb:=nullif(current_setting('request.jwt.claims',true),'')::jsonb; actor uuid:=auth.uid(); s auth.sessions%rowtype;
begin
 if actor is null or c->>'sub' is distinct from actor::text or c->>'role' is distinct from 'authenticated'
  or c->>'is_anonymous' is distinct from 'false' or nullif(c->>'client_id','') is not null
  or coalesce(c->>'session_id','') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
 then raise exception 'Native staff session required' using errcode='42501';end if;
 perform 1 from public.staff_memberships where user_id=actor and is_active and role in ('admin','editor') for share;
 if not found then raise exception 'Active staff editor access required' using errcode='42501';end if;
 select * into s from auth.sessions where id=(c->>'session_id')::uuid and user_id=actor and (not_after is null or not_after>clock_timestamp()) for share;
 if not found or nullif(to_jsonb(s)->>'oauth_client_id','') is not null then raise exception 'Native session expired or unavailable' using errcode='42501';end if;
 return actor;
end$$;
revoke all on function ops_lease_private.staff_actor() from public,anon,authenticated;

create function ops_lease_private.validate_data(d jsonb,ready boolean) returns void
language plpgsql security invoker set search_path='' as $$
declare s jsonb:=d->'state'; t jsonb:=d->'template'; k text; value jsonb; calendar date;
 areas text[]:=array['kitchen','living','exterior','systems','other']; area text; pos jsonb; occupied text[]:='{}'; position_key text; f jsonb; other_f jsonb; dims jsonb;
begin
 if jsonb_typeof(d) is distinct from 'object' or octet_length(d::text)>250000
  or d->>'schema_version' is distinct from 'oaktown.lease-preparation.v1' or jsonb_typeof(s) is distinct from 'object'
  or exists(select 1 from jsonb_object_keys(d) x where x not in ('schema_version','state','template','leaseId'))
 then raise exception 'Invalid lease preparation envelope' using errcode='22023';end if;
 if coalesce(s->>'bedrooms','') not in ('','1','2','3','4','5') or coalesce(s->>'bathrooms','') not in ('','1','2','3')
  or jsonb_typeof(s->'conditions') is distinct from 'object' or jsonb_typeof(s->'roomPlacements') is distinct from 'object'
 then raise exception 'Unsupported room layout; six-bedroom generation is unavailable' using errcode='22023';end if;
 for k,value in select * from jsonb_each(s->'conditions') loop
  if length(k)>150 or jsonb_typeof(value) is distinct from 'string' or length(value#>>'{}')>2000 then raise exception 'Invalid condition entry' using errcode='22023';end if;
 end loop;
 if not ready then return;end if;
 if s->'conditionsReviewed' is distinct from 'true'::jsonb or s->'approvalReviewed' is distinct from 'true'::jsonb or s->'depositStepReviewed' is distinct from 'true'::jsonb
  or coalesce(s->>'bedrooms','') not in ('1','2','3','4','5') or coalesce(s->>'bathrooms','') not in ('1','2','3') or coalesce(s->>'basement','') not in ('included','not-included')
  or coalesce(s->>'satisfactory','') not in ('Yes','No')
 then raise exception 'Confirm the handoff, room facts and condition review first' using errcode='22023';end if;
 foreach k in array array['address','cityline','leaseDate','start','end','rent','deposit','tenantName','emails','pets'] loop
  if coalesce(length(btrim(s->>k)),0)=0 then raise exception 'A required lease field is missing: %',k using errcode='22023';end if;
 end loop;
 foreach k in array array['leaseDate','start','end'] loop
  if s->>k !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid lease date' using errcode='22023';end if;
  calendar:=(s->>k)::date;if to_char(calendar,'YYYY-MM-DD')<>s->>k then raise exception 'Invalid lease calendar date' using errcode='22023';end if;
 end loop;
 if (s->>'end')::date<(s->>'start')::date then raise exception 'Lease term is reversed' using errcode='22023';end if;
 foreach k in array array['rent','deposit'] loop
  if regexp_replace(s->>k,'[$,]','','g') !~ '^[0-9]+(\.[0-9]{1,2})?$' then raise exception 'Invalid lease amount' using errcode='22023';end if;
 end loop;
 if regexp_replace(s->>'rent','[$,]','','g')::numeric<=0 then raise exception 'Positive confirmed rent required' using errcode='22023';end if;
 if jsonb_typeof(s->'utilities') is distinct from 'object' or jsonb_typeof(s->'appliances') is distinct from 'object'
  or jsonb_typeof(s->'occupants') is distinct from 'array' or jsonb_array_length(s->'occupants') not between 1 and 5
 then raise exception 'Confirm occupants, utilities and appliances' using errcode='22023';end if;
 foreach k in array array['Water','Electric','Gas','Trash','Internet'] loop
  if coalesce(s->'utilities'->>k,'') not in ('Landlord','Tenant') then raise exception 'Confirm utility %',k using errcode='22023';end if;
 end loop;
 foreach k in array array['Range','Refrigerator','Dishwasher','Blinds','Microwave','Garage Door Opener','Washer & Dryer'] loop
  if coalesce(s->'appliances'->>k,'') not in ('Yes','No') then raise exception 'Confirm appliance %',k using errcode='22023';end if;
 end loop;
 if jsonb_typeof(t) is distinct from 'object' or t->'originalReviewed' is distinct from 'true'::jsonb or t->'mappingReviewed' is distinct from 'true'::jsonb
  or coalesce(t->>'reference','')='' or coalesce(t->'map'->>'templateSha256','') !~ '^[a-f0-9]{64}$'
  or t->'map'->>'schema_version' is distinct from 'oaktown.lease-template-map.v1'
  or jsonb_typeof(t->'map'->'pages') is distinct from 'array' or jsonb_array_length(t->'map'->'pages')<>10
  or jsonb_typeof(t->'map'->'fields') is distinct from 'array' or jsonb_array_length(t->'map'->'fields') not between 1 and 250
  or jsonb_typeof(t->'map'->'protectedAreas') is distinct from 'array' or jsonb_array_length(t->'map'->'protectedAreas')>80
 then raise exception 'Review the exact approved ten-page blank master and field map' using errcode='22023';end if;
 for f in select * from jsonb_array_elements(t->'map'->'fields') loop
  if coalesce(f->>'page','') !~ '^(10|[1-9])$' or coalesce(f->>'font','') not in ('Helvetica','Times-Roman','Courier','Custom')
   or jsonb_typeof(f->'size') is distinct from 'number' or (f->>'size')::numeric not between 6 and 24
  then raise exception 'Invalid template field font or page' using errcode='22023';end if;
  dims:=t->'map'->'pages'->((f->>'page')::integer-1);
  foreach k in array array['x','y','width','height'] loop if jsonb_typeof(f->k) is distinct from 'number' then raise exception 'Invalid template rectangle' using errcode='22023';end if;end loop;
  if (f->>'x')::numeric<0 or (f->>'y')::numeric<0 or (f->>'width')::numeric<=0 or (f->>'height')::numeric<=0
   or (f->>'x')::numeric+(f->>'width')::numeric>coalesce((dims->>'width')::numeric,0) or (f->>'y')::numeric+(f->>'height')::numeric>coalesce((dims->>'height')::numeric,0)
   or f->>'key' like 'slot/%' and (f->>'page')::integer<>8
  then raise exception 'Template field lies outside its original page' using errcode='22023';end if;
  for other_f in select * from jsonb_array_elements(t->'map'->'protectedAreas') loop
   if other_f->>'page'=f->>'page' and (f->>'x')::numeric<(other_f->>'x')::numeric+(other_f->>'width')::numeric
    and (f->>'x')::numeric+(f->>'width')::numeric>(other_f->>'x')::numeric and (f->>'y')::numeric<(other_f->>'y')::numeric+(other_f->>'height')::numeric
    and (f->>'y')::numeric+(f->>'height')::numeric>(other_f->>'y')::numeric then raise exception 'Field overlaps protected signature area' using errcode='22023';end if;
  end loop;
 end loop;
 foreach k in array array['address','cityline','leaseDate','start','end','rent','deposit','tenantName','emails','pets','five','ten'] loop
  if not exists(select 1 from jsonb_array_elements(t->'map'->'fields') mapped_entry where mapped_entry->>'key'='term/'||k) then raise exception 'Map required lease field %',k using errcode='22023';end if;
 end loop;
 for k in select 'bathroom-'||n from generate_series(1,(s->>'bathrooms')::integer)n union all select 'bedroom-'||n from generate_series(1,(s->>'bedrooms')::integer)n loop areas:=array_append(areas,k);end loop;
 if s->>'basement'='included' then areas:=array_append(areas,'basement');end if;
 if s->'additionalRoom'='true'::jsonb then areas:=array_append(areas,'additional');end if;
 foreach area in array areas loop
  pos:=s->'roomPlacements'->area;
  if pos is null then pos:=jsonb_build_object('section',case when area in ('bedroom-5','bathroom-3') then 'unplaced' when area like 'bathroom-%' then 'bathroom' else area end,'column',case when area='bathroom-2' then 1 else 0 end,'row',0);end if;
  if coalesce(pos->>'section','') not in ('kitchen','bathroom','living','bedroom-1','bedroom-2','bedroom-3','bedroom-4','bedroom-5','basement','additional','exterior','systems','other')
   or coalesce(pos->>'column','') not in ('0','1') or coalesce(pos->>'row','') not in ('0','1','2') then raise exception 'Choose reviewed active room position for %',area using errcode='22023';end if;
  position_key:=(pos->>'section')||'/'||(pos->>'column')||'/'||(pos->>'row');
  if position_key=any(occupied) then raise exception 'Active room PDF positions collide' using errcode='22023';end if;occupied:=array_append(occupied,position_key);
  for k,value in select * from jsonb_each(s->'conditions') where key like area||'::%' loop
   if value#>>'{}'<>'' and not exists(select 1 from jsonb_array_elements(t->'map'->'fields') mapped_entry where mapped_entry->>'key'='slot/'||position_key||'/'||split_part(k,'::',2))
   then raise exception 'Map every entered observation for %',area using errcode='22023';end if;
  end loop;
 end loop;
end$$;
revoke all on function ops_lease_private.validate_data(jsonb,boolean) from public,anon,authenticated;

create function public.ops_lease_preparation(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=ops_lease_private.staff_actor(); p ops_lease_private.preparations%rowtype; a ops_lease_private.approvals%rowtype;
 uid uuid; lid uuid; d jsonb; status_value text; previous integer; request_id uuid; result jsonb; reference text;
begin
 if action is null or jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>270000 then raise exception 'Invalid preparation request' using errcode='22023';end if;
 if action='context' then
  uid:=(payload->>'unit_id')::uuid;
  select jsonb_build_object('unit',to_jsonb(u),'property',to_jsonb(pr),
   'leases',coalesce((select jsonb_agg(to_jsonb(l) order by l.term_end desc nulls last,l.id) from public.leases l where l.unit_id=u.id),'[]'),
   'rents',coalesce((select jsonb_agg(to_jsonb(r)) from public.rent_schedules r join public.leases l on l.id=r.lease_id where l.unit_id=u.id),'[]'))
   into result from public.units u join public.properties pr on pr.id=u.property_id where u.id=uid;
  if result is null then raise exception 'Unit unavailable' using errcode='P0002';end if;
  select * into a from ops_lease_private.approvals where unit_id=uid order by approved_at desc,case_id,version desc limit 1;
  return result||jsonb_build_object('approved_conditions',case when a.case_id is null then null else jsonb_build_object('case_id',a.case_id,'version',a.version,'approved_at',a.approved_at,
   'state',jsonb_build_object('bedrooms',a.data->'state'->'bedrooms','bathrooms',a.data->'state'->'bathrooms','basement',a.data->'state'->'basement','additionalRoom',a.data->'state'->'additionalRoom',
    'conditions',a.data->'state'->'conditions','roomLabels',a.data->'state'->'roomLabels','roomLocations',a.data->'state'->'roomLocations','roomPlacements',a.data->'state'->'roomPlacements')) end);
 elsif action='list' then
  uid:=nullif(payload->>'unit_id','')::uuid;
  return jsonb_build_object('cases',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,unit_id,lease_id,version,status,updated_at from ops_lease_private.preparations where actor_id=actor and (uid is null or unit_id=uid) order by updated_at desc,id limit 50)x),'[]'),
   'has_more',(select count(*)>50 from ops_lease_private.preparations where actor_id=actor and (uid is null or unit_id=uid)));
 elsif action='get' then
  select * into p from ops_lease_private.preparations where id=(payload->>'id')::uuid and actor_id=actor;
  if not found then raise exception 'Preparation not found for this account' using errcode='P0002';end if;
  return to_jsonb(p);
 elsif action='save' then
  d:=payload->'data';status_value:=payload->>'status';previous:=(payload->>'expected_version')::integer;request_id:=(payload->>'request_ref')::uuid;
  if status_value is null or status_value not in ('draft','ready') or previous is null or previous<0 or request_id is null then raise exception 'Invalid reviewed save request' using errcode='22023';end if;
  perform ops_lease_private.validate_data(d,status_value='ready');uid:=(d->'state'->>'unitId')::uuid;lid:=nullif(d->>'leaseId','')::uuid;
  perform 1 from public.units where id=uid for share;if not found then raise exception 'Unit unavailable' using errcode='P0002';end if;
  if lid is not null then perform 1 from public.leases where id=lid and unit_id=uid for share;if not found then raise exception 'Lease does not belong to selected unit' using errcode='22023';end if;end if;
  perform pg_advisory_xact_lock(hashtextextended('lease-preparation:'||(payload->>'id'),0));
  select * into p from ops_lease_private.preparations where id=(payload->>'id')::uuid for update;
  if found then
   if p.actor_id<>actor then raise exception 'Preparation not found for this account' using errcode='P0002';end if;
   if p.last_request=request_id then
    if p.data<>d or p.status<>status_value then raise exception 'Retry must keep the identical payload' using errcode='22023';end if;return to_jsonb(p);
   end if;
   if p.version<>previous then raise exception 'Preparation changed; reload and review newer work' using errcode='40001';end if;
   if p.unit_id<>uid then raise exception 'Start a separate preparation when changing units' using errcode='22023';end if;
   update ops_lease_private.preparations set lease_id=lid,data=d,status=status_value,version=version+1,last_request=request_id,receipt=null,updated_at=clock_timestamp() where id=p.id returning * into p;
  else
   if previous<>0 then raise exception 'Preparation no longer exists' using errcode='40001';end if;
   insert into ops_lease_private.preparations(id,actor_id,unit_id,lease_id,data,status,last_request) values((payload->>'id')::uuid,actor,uid,lid,d,status_value,request_id) returning * into p;
  end if;
  return to_jsonb(p);
 elsif action='approve' then
  previous:=(payload->>'expected_version')::integer;request_id:=(payload->>'request_ref')::uuid;reference:='APPROVE '||(payload->>'id')||' VERSION '||previous::text;
  if request_id is null or payload->'reviewed' is distinct from 'true'::jsonb or payload->>'confirmation' is distinct from reference then raise exception 'Exact native review confirmation required' using errcode='42501';end if;
  select * into p from ops_lease_private.preparations where id=(payload->>'id')::uuid and actor_id=actor for update;
  if not found then raise exception 'Preparation not found for this account' using errcode='P0002';end if;
  select * into a from ops_lease_private.approvals where case_id=p.id and actor_id=actor and request_ref=request_id;
  if found then
   if a.version<>previous+1 then raise exception 'Retry must keep the identical review version' using errcode='22023';end if;
   return to_jsonb(p)||jsonb_build_object('version',a.version,'status','approved','data',a.data,'receipt',a.receipt,'current',p.version=a.version);
  end if;
  if p.version<>previous or p.status<>'ready' then raise exception 'Preparation changed or is not ready; reload and review' using errcode='40001';end if;
  perform ops_lease_private.validate_data(p.data,true);
  result:=jsonb_build_object('schema_version','oaktown.lease-preparation-receipt.v1','id',p.id,'version',p.version+1,'approved_by',actor,'approved_at',clock_timestamp(),
   'template_sha256',p.data->'template'->'map'->>'templateSha256','data_sha256',encode(sha256(convert_to(p.data::text,'UTF8')),'hex'),'executed',false);
  update ops_lease_private.preparations set status='approved',version=version+1,receipt=result,updated_at=clock_timestamp() where id=p.id returning * into p;
  insert into ops_lease_private.approvals(case_id,version,actor_id,request_ref,unit_id,data,receipt) values(p.id,p.version,actor,request_id,p.unit_id,p.data,result);
  insert into public.ops_events(entity_type,entity_id,event_type,actor_id,summary,event_metadata) values('lease_preparation',p.id,'lease_preparation_approved_v1',actor,'Staff approved an unsigned lease preparation',
   jsonb_build_object('case_id',p.id,'version',p.version,'unit_id',p.unit_id,'lease_id',p.lease_id,'receipt',result));
  return to_jsonb(p);
 end if;
 raise exception 'Unsupported preparation operation' using errcode='22023';
end$$;
revoke all on function public.ops_lease_preparation(text,jsonb) from public,anon;
grant execute on function public.ops_lease_preparation(text,jsonb) to authenticated;
commit;
