# Integration contract: Portfolio Master ⇄ Lead Copilot

**For the separately prepared portfolio workbook and Supabase migration chat.**

Work on a **different GitHub branch** from `feature/v0.5-lead-copilot`. Do not modify that lead feature branch simultaneously. Preserve the existing 13 pilot `public.properties.id` UUIDs wherever possible and retain the v0.4 notices and addressees integrations. Build and verify a normalized property/unit inventory with unique `(property_id, unit identifier)` relationships rather than assuming an address identifies only one rentable unit.

## Shared identifiers and single source of truth

- `properties`: stable physical address/building or legacy property records. Preserve legacy identifiers and document any merged/split records.
- `units` (name TBD in Portfolio Master chat): a durable unique identifier per rentable apartment/house; unit examples: Cherokee #1, #4 and #6.
- `leases` / `tenancies`: existing contractual rents, periods, landlord/tenant relationships.
- `listings` / `availability`: advertised asking rent, readiness and market status, separately from contracted rent.
- `leads`: one prospect record independent of any one property; potentially many property interests.
- `lead_property_interests`: many-to-many links to an address and eventually its rentable unit.

The staged v0.5 lead schema uses `leads.primary_property_id` and `lead_property_interests.property_id` referencing existing `public.properties(id)` because **the Portfolio Master schema has not been finalized**. Before applying this schema, map those references to confirmed `unit_id` and create proper foreign keys. Do not guess the final unit table name, rent type, or validation status.

## Authoritative data rules

- Leave unverified current asking rent NULL; do not fill from historical Zillow messages as current price.
- Lease rent, advertised asking rent and deposit should be distinct date-aware fields.
- Keep availability at unit/listing level, not address-only. Inquiries cannot receive live viewing instructions while occupied, pending or rented.
- Property pet terms and all exception policies must be verified, reviewed and versioned before generating dollar amounts.
- Store viewing codes outside lead messages, protected by role and current status. Never commit such values to public GitHub.
- Do not ingest 101 old conversation transcripts as active tenant applications.

## Master migration verification checklist

1. Snapshot/backup data; verify rollback/restore.
2. Upsert portfolio records idempotently and produce a before/after reconciliation.
3. Ensure multiple distinct units under Cherokee Rd and other multiunit addresses work.
4. Check no duplicate properties/units, no overwritten pilot property IDs or lost notice references.
5. Validate auth/RLS as anonymous, staff viewer, editor, admin and inactive member.
6. Confirm Property Master read/write UI still works after migration.
7. Document final property/unit/listing identifiers and expected REST API read contract for Lead Copilot.
8. Then adjust the v0.5 lead migration/frontend and run GitHub CI + database advisors before deployment.

Do **not** use default `public` table permissions without explicit RLS and `GRANT` verification. All application examples and fixtures must use fictional data.
