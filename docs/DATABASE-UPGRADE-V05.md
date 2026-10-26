# Oaktown Ops portfolio database upgrade (v0.5)

**Applied:** October 26, 2026 to the existing Oaktown Ops Supabase project.  
**Database migrations:** `20261026171822_oaktown_portfolio_relational_core_v05` and `20261026171941_oaktown_portfolio_foreign_key_indexes_v05`.

## Applied

- Preserved the original `public.properties` primary-key UUIDs, 13 pilot property rows, 13 unverified notice-addressee rows, notice batches, staff memberships and existing v0.4 behavior.
- Added nullable portfolio identifiers/classification fields to `public.properties`.
- Added 16 related staff-only tables: `units`, `property_aliases`, `unit_aliases`, `people`, `tenancies`, `tenancy_people`, `leases`, `lease_signatures`, `rent_schedules`, `bookings`, `renewal_cases`, `ops_tasks`, `import_batches`, `source_links`, `verification_issues`, `ops_events`.
- Kept property/building address identity independent from unit/lot identity. The legacy unique constraint on properties' street/city/state/ZIP remains intentionally unchanged; many units can point to one property.
- Preserved separate storage for short-term bookings and residential leases, and for confirmed rent schedules versus renewal offer references.
- Enabled RLS on all 16 tables. Only active staff have read access; authenticated editor/admin membership is required to insert or update. New tables grant no anonymous access and no client DELETE access.
- Added indexes for frequent lookups and foreign keys.

## Verification performed

- Migration reported success; both versions appear in Supabase migration history.
- 16/16 new tables have RLS enabled; anonymous users have zero SELECT/INSERT grants; authenticated clients have zero DELETE grants on these tables.
- Rollback-only synthetic test validated unit uniqueness and lease/tenancy unit consistency. Test rows did not persist.
- All existing 13 property and 13 notice-addressee records remain. New portfolio tables currently have **zero imported real records**.
- Security advisor: no new database security findings. Existing warning: Auth leaked-password protection disabled (review before expanded production).
- Performance advisor: missing foreign-key-index warnings resolved; unused-index notices are expected for empty new tables.

## Required next milestone (not completed)

1. Add tested, dry-run-capable workbook import mapping. Record original sources and row provenance. Never push real tenant data to this public GitHub repository.
2. Reconcile the original 13 UUIDs before inserting new properties. Import properties, units, aliases, people, tenancies, leases/bookings, renewal cases, tasks and verification flags in dependency order.
3. Respect explicit user confirmations; retain historical leases; mark unverified rent/contract/contact fields as unverified.
4. Run repeat-import/idempotency, address-conflict, multi-unit, permissions, and rollback tests using fictional fixtures.
5. Upgrade Oaktown Ops v0.4 screens and property-saving flow to use the new unit child table. The current app has **not** been adapted to these tables yet.
6. Validate full production security, restored backups and operational workflows before rollout.

**This PR records already applied additive migrations. Merging the PR does not import tenant data or deploy the new app screens.**
