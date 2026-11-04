-- Read-only, aggregate-only diagnostics. No tenant names, addresses or record IDs.
with checks as (
 select 'renewal_property_unit' as check_name,count(*) as violations
 from public.renewal_cases r join public.units u on u.id=r.unit_id
 where r.property_id is not null and r.property_id<>u.property_id
 union all
 select 'renewal_tenancy_unit',count(*)
 from public.renewal_cases r join public.tenancies t on t.id=r.tenancy_id
 where r.unit_id is not null and r.unit_id<>t.unit_id
 union all
 select 'renewal_lease_unit',count(*)
 from public.renewal_cases r join public.leases l on l.id=r.lease_id
 where r.unit_id is not null and r.unit_id<>l.unit_id
 union all
 select 'renewal_lease_tenancy',count(*)
 from public.renewal_cases r join public.leases l on l.id=r.lease_id
 where r.tenancy_id is not null and r.tenancy_id is distinct from l.tenancy_id
 union all
 select 'renewal_missing_unit',count(*) from public.renewal_cases
 where unit_id is null and (tenancy_id is not null or lease_id is not null)
 union all
 select 'task_property_unit',count(*)
 from public.ops_tasks t join public.units u on u.id=t.unit_id
 where t.property_id is not null and t.property_id<>u.property_id
 union all
 select 'task_tenancy_unit',count(*)
 from public.ops_tasks t join public.tenancies n on n.id=t.tenancy_id
 where t.unit_id is not null and t.unit_id<>n.unit_id
 union all
 select 'task_lease_unit',count(*)
 from public.ops_tasks t join public.leases l on l.id=t.lease_id
 where t.unit_id is not null and t.unit_id<>l.unit_id
 union all
 select 'task_lease_tenancy',count(*)
 from public.ops_tasks t join public.leases l on l.id=t.lease_id
 where t.tenancy_id is not null and t.tenancy_id is distinct from l.tenancy_id
 union all
 select 'task_missing_unit',count(*) from public.ops_tasks
 where unit_id is null and (tenancy_id is not null or lease_id is not null)
 union all
 select 'task_renewal_context',count(*)
 from public.ops_tasks t join public.renewal_cases r on r.id=t.renewal_case_id
 left join public.units u on u.id=r.unit_id
 where (t.property_id is not null and coalesce(r.property_id,u.property_id) is not null and t.property_id<>coalesce(r.property_id,u.property_id))
 or (t.unit_id is not null and r.unit_id is not null and t.unit_id<>r.unit_id)
 or (t.tenancy_id is not null and r.tenancy_id is not null and t.tenancy_id<>r.tenancy_id)
 or (t.lease_id is not null and r.lease_id is not null and t.lease_id<>r.lease_id)
 union all
 select 'source_unsupported_type',count(*) from public.source_links
 where entity_type not in ('property','properties','unit','units','person','people','tenancy','tenancies','lease','leases','booking','bookings','renewal_case','renewal_cases','task','ops_tasks')
 union all
 select 'source_missing_target',count(*) from public.source_links s
 where case
  when entity_type in ('property','properties') then not exists(select 1 from public.properties t where t.id=s.entity_id)
  when entity_type in ('unit','units') then not exists(select 1 from public.units t where t.id=s.entity_id)
  when entity_type in ('person','people') then not exists(select 1 from public.people t where t.id=s.entity_id)
  when entity_type in ('tenancy','tenancies') then not exists(select 1 from public.tenancies t where t.id=s.entity_id)
  when entity_type in ('lease','leases') then not exists(select 1 from public.leases t where t.id=s.entity_id)
  when entity_type in ('booking','bookings') then not exists(select 1 from public.bookings t where t.id=s.entity_id)
  when entity_type in ('renewal_case','renewal_cases') then not exists(select 1 from public.renewal_cases t where t.id=s.entity_id)
  when entity_type in ('task','ops_tasks') then not exists(select 1 from public.ops_tasks t where t.id=s.entity_id)
  else false
 end
)
select json_build_object(
 'violations',(select json_object_agg(check_name,violations) from checks),
 'counts',json_build_object(
  'properties',(select count(*) from public.properties),
  'units',(select count(*) from public.units),
  'tenancies',(select count(*) from public.tenancies),
  'leases',(select count(*) from public.leases),
  'renewal_cases',(select count(*) from public.renewal_cases),
  'property_only_renewals',(select count(*) from public.renewal_cases where unit_id is null),
  'tasks',(select count(*) from public.ops_tasks),
  'source_links',(select count(*) from public.source_links)
 )
) as portfolio_preflight;
