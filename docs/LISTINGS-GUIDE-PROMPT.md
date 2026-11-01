# Listings guide & copyable AI prompt (pilot)

**Scope:** New `Listings` workspace tab for a manual, human-approved property-listing workflow. No Gemini/OpenAI API key, no LLM call, no database write, no automatic publishing, no tenant information, and no scheduled reminders. All input is temporary and exists only in the browser page until reset/reload.

## Workflow
1. Collect exact property/unit, Leslie’s newest verified rent/terms, other facts, photos from Leslie or a previous Zillow listing, and any older marketing description.
2. Enter minimal facts as supplied. Old listing copy is historical reference only; missing details must be flagged, not guessed.
3. Copy the **Two description versions** prompt to ChatGPT/Gemini. It generates exactly two Leslie-style full-description alternatives plus a separate private verification note. No feature bullets yet.
4. Send both to Leslie; get her approval of one version and incorporate her specific corrections.
5. Switch to **Website features** and paste the **approved** description. Copy that prompt; AI generates ALL-CAPS one-feature-per-line lines, normally without bullet characters. Website features do not replace the approved prose.
6. Manually update Zillow, the relevant apartment-listing platform, and the Oaktown website with the SAME approved full description; website additionally gets feature lines. Verify missing TurboTenant structured amenities with Leslie, then QA the published content.

## Example
The prompt carries a **fictional** example to establish tone and feature-line formatting. It must never be used as property evidence.

## Data, controls and limitations
- Prompt template is code in `listing-guide-model.js`, portable across AI tools and available for staff to copy. This version intentionally does not save listing facts, prompt inputs or AI output to localStorage/Supabase, to avoid unattended persistence or data leaks.
- The current public Oaktown Ops repository must not include tenant names, phone numbers, personal documents, passwords, codes, screening results or other private data.
- Human approval before website-feature conversion and all publication actions.
- If the user omits the approved description during the website-features stage, the AI prompt explicitly instructs the model not to output features.
- Website promotion of the **same** full copy with a **separate** feature section is a verified operating requirement. Exact apartment-listing vendor and posting permissions remain to be confirmed.
- Companion document: Oaktown Rentals — Operations Playbook & AI Brain Roadmap, in Google Drive.

## Tests
`node --test tests/listing-guide-model.test.cjs` verifies prompt stage separation, absent values, older-listing precedence, fictional example labelling and blank approved description warning.
