-- Disposable PostgreSQL CI only. Uses fictional file metadata, never real leases.
\set ON_ERROR_STOP on
reset role;
do $$begin if current_database()<>'oaktown_portfolio_ci' then raise exception 'Disposable database required';end if;end $$;
begin;

insert into public.lease_reference_documents(source_name,drive_file_id,drive_folder_id,drive_url,sha256,size_bytes,page_count)
values ('Fictional reference.pdf','fictional_drive_file','fictional_folder','https://drive.google.com/file/d/fictional_drive_file/view',repeat('a',64),12345,10);

do $$begin
 if not (select relrowsecurity from pg_class where oid='public.lease_reference_documents'::regclass) then raise exception 'RLS missing';end if;
 if has_table_privilege('anon','public.lease_reference_documents','SELECT') then raise exception 'Anonymous read grant';end if;
 if has_table_privilege('authenticated','public.lease_reference_documents','INSERT,UPDATE,DELETE') then raise exception 'Unexpected client write grant';end if;
 begin
  insert into public.lease_reference_documents(source_name,drive_file_id,drive_folder_id,drive_url,sha256,size_bytes,page_count)
  values ('Other fictional reference.pdf','fictional_file','fictional_folder','https://drive.google.com/file/d/wrong_file/view',repeat('b',64),12345,10);
  raise exception 'Mismatched Drive link accepted';
 exception when check_violation then null;end;
end $$;

set local role authenticated;
do $$declare who text;begin
 foreach who in array array['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003'] loop
  perform set_config('request.jwt.claim.sub',who,true);
  if (select count(*) from public.lease_reference_documents)<>1 then raise exception 'Approved staff cannot read reference';end if;
 end loop;
 foreach who in array array['00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000005'] loop
  perform set_config('request.jwt.claim.sub',who,true);
  if exists(select 1 from public.lease_reference_documents) then raise exception 'Unapproved staff can read references';end if;
 end loop;
end $$;
reset role;
set local role anon;
do $$begin
 begin perform 1 from public.lease_reference_documents limit 1;raise exception 'Anonymous read allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'Lease reference catalog permissions and Drive-link integrity passed' as result;
