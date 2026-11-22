\set ON_ERROR_STOP on
-- This script is deliberately limited to the disposable GitHub Actions database.
do $$begin
 if current_database()<>'oaktown_portfolio_ci' then
  raise exception 'Disposable CI database required; refusing to run SQL write smoke test';
 end if;
end$$;

begin;
create temp table ops_write_smoke_test (
    id integer PRIMARY KEY,
    task_name text NOT NULL,
    status text NOT NULL
) ON COMMIT DROP;

insert into ops_write_smoke_test
    (id, task_name, status)
values
    (1, 'FICTIONAL - Integration Test', 'pending')
returning id, task_name, status;

update ops_write_smoke_test
set status = 'in_progress'
where id = 1
returning id, task_name, status;

select *
from ops_write_smoke_test
where id = 1;

do $$
declare current_status text;
begin
 select status into current_status from ops_write_smoke_test where id=1;
 if current_status is distinct from 'in_progress' then
  raise exception 'SQL smoke test readback mismatch: %',current_status;
 end if;
end$$;
rollback;

do $$begin
 if to_regclass('pg_temp.ops_write_smoke_test') is not null then
  raise exception 'Temporary smoke-test table survived rollback';
 end if;
end$$;
select 'Disposable SQL insert/update/readback/rollback passed; no persistent table or row remains' as result;
