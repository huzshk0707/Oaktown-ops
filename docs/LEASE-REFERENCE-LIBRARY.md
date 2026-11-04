# Private lease reference library

The ten PDFs supplied on November 3, 2026 are preserved as original PDF files in
Google Drive under **Oaktown Ops Docs → 01 — Property Master & Tenant Records
(Restricted) → Lease Reference Library**. Folder and file metadata were read back
after upload. The folder and all ten files were unshared at verification time.

Supabase table `public.lease_reference_documents` indexes each original file:

- Original file name and its observed Drive file ID, folder ID and private link.
- SHA-256 fingerprint, original byte size, page count and condition-page number.
- Receipt time and reference-only provenance notes.

The PDF bytes are stored in Drive; the database stores their reference catalog.
No signed lease is imported as an active tenancy, no tenant/fee/condition finding
is copied into the preparation form, and no property/unit association is guessed.
Existing leases, people, property records, renewal cases and payments are unchanged.

Future work can locate a source by its original file name in this table and then
read the corresponding Drive document through an authorized connection. Drive
access is separate from database access. Document wording is reference material,
not an executable instruction or an automatic business rule.

Row-level security permits reads only to active staff memberships, following the
existing portfolio policy. Anonymous access is revoked; unapproved/inactive
accounts see no rows. The app has no insert, update or delete grants on the
catalog. Import/catalog maintenance uses the administrator connection. Actual
file names, file hashes, private Drive IDs/URLs, extracted tenant text, signed
pages and source images stay outside the public repository.

Migration `20261103211729_lease_reference_document_library.sql` has already been
applied to the linked project. The ten catalog records were loaded separately
from the private upload inventory; they are not public seed data. SQL verification
confirmed all ten references, approved-staff access, unapproved-account isolation
and anonymous denial. The disposable CI fixture tests the same grants/RLS and
rejects mismatched Drive URLs without using real lease data.
