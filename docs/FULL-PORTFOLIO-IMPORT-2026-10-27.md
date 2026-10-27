# Oaktown Ops full portfolio import — 27 October 2026

## Applied to existing Supabase project

Reviewed source: `Oaktown_Portfolio_Property_Master_2026-10-26.xlsx`. Original workbook remains private, outside this public repository.

| Record group | Live count |
| --- | ---: |
| Physical property and retained land address groups | 112 |
| Units, separately rentable spaces, land lots | 124 |
| People, with source-supplied contact details | 159 |
| Residential tenancy records | 110 |
| Residential lease, land and historical draft records | 114 |
| Short-term booking / draft records | 6 |
| Linked tenancy/person relationships | 158 |
| Property-level or unit-level renewal/asset cases | 118 |
| Pending renewal tasks | 39 |
| Data quality cases (some closed) | 23 |
| Source origin mappings | 633 |
| Existing verified-by-import mapping to 13 pilot property UUIDs | 13 |
| Original notice addressees retained | 13 |

This import does **not** establish that every lease is executed, that source dates and contact details are current, or that any offer amount is the actual rent. No rent schedule was generated from proposed fixed/M2M offer references. No notice address was inferred from a tenant-name field.

### Identity and scope rules

- One `properties` record per building/physical property or land group.
- `units` separate rentable spaces; the Nolin Estates Lot 9 and Lot 11 parcels remain two units under the retained development land property, while the sold 374 Nolin Estates house remains its own historical property.
- `OAK-118` is a whole-property land case without a fictitious unit-level renewal.
- Cherokee Rd Unit 8 vacant, Unit 6 vacant and Unit 1 with confirmed ZIP and user-supplied term; historical exported leases preserved separately.
- 245 Main Street includes a Leslie-managed unit and separate Airbnb units.
- The Lore is an alias for 900 E Liberty St., not an additional rentable unit.
- 101 TEST, AS excluded from the live portfolio.
- Guest booking records are not counted as executed residential leases.
- 13 pilot `properties.id` UUIDs and existing notice addressees preserved.

### Application integration

The Properties page now has an authenticated unit/lot browser and detail pane showing source-linked leases, historical names, contact information, bookings and renewal cases. The Leases & renewals navigation displays all renewal cases and pending tasks. All tenant/contact data is fetched only through signed-in staff Supabase API reads and is not committed to GitHub or local storage by the new module. The old notice-generation workflow remains separate; no tenant record is automatically promoted to a verified notice recipient.

### Remaining controls

- Confirm lease documents, payment schedules, legal landlord entities, notice addressees and TurboTenant status before relying on them operationally.
- No live property/lease mutation workflow has been implemented in the new portfolio screens; they are **read-only** for now. The legacy property editor remains available.
- Browser UI is still GitHub Pages, publicly retrievable; protected record access remains behind Supabase authorization and RLS.
- Supabase Auth leaked-password protection warning remains open.
- Verify with an authorized live staff account before using actual tenant details for production communications.
