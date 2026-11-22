# New-lease rehearsal UX — draft PR #94

This is a **staff-only, fictional one-bedroom walkthrough** of the existing new-lease preparation UI. It tests form/navigation ergonomics, not executed leases or live PDF approval. It intentionally contains **no real tenant, Cherokee address, application, inspection, completed PDF or bank details**.

## Staff rehearsal

1. Sign in with an authorized staff account in the Oaktown Ops workspace.
2. Open **Leases & renewals → Prepare new lease**.
3. Select **Try a fictional one-bedroom rehearsal**. Read the clearly displayed **FICTIONAL REHEARSAL ACTIVE** notice. No protected unit is linked.
4. In **Page 1 · Terms**, confirm the sample monthly rent **$1,025** and a **$1,000 printed security deposit**, plus a separate **$150 pet deposit** (**$1,150 total**). The generator does not automatically combine or credit these amounts.
5. Use **People & services** to review fictional occupant/pet and explicit utility/appliance choices.
6. Use **Page 8 · Conditions** to confirm one bedroom, one bathroom, absent bedroom rows N/A, and example notes. **Overall satisfactory, handoff confirmation, inspection review and signatures remain unchecked.** The advanced PDF room-placement controls are closed until deliberately opened.
7. Use **Late charges & review** to check 5% and 10% amounts (**$51.25** and **$102.50**) and click **Review draft inputs**. Missing-item links jump back to the relevant step.
8. To prepare a real case, select the exact protected unit. Accept the clearing confirmation. Verify the fictional tenant, fees, and conditions are **not carried into the real draft**. Continue from actual evidence rather than assuming listing descriptions are inspected conditions.

## Safety and known blockers

- Demo fields exist **only in current browser form state** and have no protected unit ID; the existing save action rejects saving without a valid unit UUID.
- Demo does **not** mark application approval, deposit receipt, page-8 satisfactory, acceptance, review, signature or payment status.
- This PR does not create new application parsing, saved case tables, migrations or a ten-page clean master.
- Original PDF pages, their clauses, field maps and signatures remain unchanged. Full ten-page unsigned export is still gated on the clean reviewed master, correctly mapped original, installed authorized backend, saved Ready preparation and review approval. It cannot be tested as live without those independent prerequisites.
- A fictional rehearsal is not a real move-in inspection, tenant approval, deposit receipt, lease execution or legal review.
- Existing browser tests should verify that demo values load, conditions and fees display correctly, review-to-edit navigation works, and selecting a real unit clears all demo data without an API write.

## PR acceptance checks

- [ ] Browser regression and hosted CI pass for the exact final head
- [ ] Verify desktop layout and keyboard navigation in supported themes
- [ ] Verify fictional Page 8 preview has no layout clipping
- [ ] Staff review accepts the proposed shortcuts and deposit display
- [ ] Separate backend and clean-master prerequisites addressed before any actual lease export

Scope: **UI rehearsal only**, on `chatgpt/lease-rehearsal-ux`. No merge or deployment is authorized by creating this draft PR.
