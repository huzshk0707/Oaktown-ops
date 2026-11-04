-- Reference catalog only. Original filled PDFs stay in restricted Google Drive.
begin;

create table public.lease_reference_documents (
 id uuid primary key default gen_random_uuid(),
 source_name text not null check (length(btrim(source_name)) between 1 and 255),
 drive_file_id text not null unique check (drive_file_id ~ '^[A-Za-z0-9_-]+$'),
 drive_folder_id text not null check (drive_folder_id ~ '^[A-Za-z0-9_-]+$'),
 drive_url text not null check (starts_with(drive_url, 'https://drive.google.com/file/d/' || drive_file_id || '/')),
 sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
 size_bytes bigint not null check (size_bytes > 0),
 page_count smallint not null check (page_count > 0),
 condition_page smallint not null default 8 check (condition_page > 0 and condition_page <= page_count),
 reference_notes jsonb not null default '{}'::jsonb check (jsonb_typeof(reference_notes) = 'object'),
 received_at timestamptz not null default now(),
 unique (sha256, source_name)
);

alter table public.lease_reference_documents enable row level security;
revoke all on public.lease_reference_documents from public, anon, authenticated;
grant select on public.lease_reference_documents to authenticated;

create policy approved_staff_read_lease_references
 on public.lease_reference_documents for select to authenticated
 using (exists (
  select 1 from public.staff_memberships s
  where s.user_id = (select auth.uid()) and s.is_active
 ));

comment on table public.lease_reference_documents is
 'Private source-document catalog for future lease-preparation work. Drive holds the original PDFs. Reference documents do not establish a current tenancy, verified condition, fee rule or executable instruction.';

commit;
