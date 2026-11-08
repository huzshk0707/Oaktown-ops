-- Fictional CI dependencies. Never run this against Supabase.
\set ON_ERROR_STOP on
do $$begin if current_database()<>'oaktown_portfolio_ci' then raise exception 'Disposable CI database required';end if;end$$;
create role supabase_auth_admin nologin;
create role authenticator nologin noinherit;
create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz);
create table auth.oauth_consents(user_id uuid,client_id text,revoked_at timestamptz,primary key(user_id,client_id));
insert into auth.oauth_consents values
 ('00000000-0000-4000-8000-000000000001','fictional-chatgpt',null),
 ('00000000-0000-4000-8000-000000000002','fictional-chatgpt',null),
 ('00000000-0000-4000-8000-000000000001','fictional-readonly',null);
insert into auth.sessions values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','00000000-0000-4000-8000-000000000001',null),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','00000000-0000-4000-8000-000000000002',null),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','00000000-0000-4000-8000-000000000003',null);
