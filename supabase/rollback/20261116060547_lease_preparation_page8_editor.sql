-- Never erase saved staff drafts or approval evidence as a rollback shortcut.
begin;
set local lock_timeout='5s';
do $$begin
 if exists(select 1 from ops_lease_private.preparations) or exists(select 1 from ops_lease_private.approvals)
 then raise exception 'Lease preparation history exists; preserve it before recovery';end if;
end$$;
drop function public.ops_lease_preparation(text,jsonb);
drop function ops_lease_private.validate_data(jsonb,boolean);
drop function ops_lease_private.staff_actor();
drop table ops_lease_private.approvals;
drop table ops_lease_private.preparations;
drop schema ops_lease_private;
commit;
