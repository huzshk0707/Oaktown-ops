# Original checklist asset

`page8-original-blank.pdf` is the blank-only checklist retained by the authorized
source-review checkpoint 233877e, SHA-256
`e85a2b639c78f80811e529ac67a77d2b9b563663c8395156e187829220011cf3`.
That checkpoint corrected displaced Bedroom 3/4 Ceiling/Floor text and cleared
the preselected satisfactory X in the old blank source. It retained the printed
sections and acceptance/signature areas. Carlito's embedded-font license is
retained in Carlito-OFL.txt. No completed tenant reference packet is included.
The original extraction/repair builder has now been recovered from the source-review workspace and retained as `scripts/rebuild-original-checklist.py`. Its output reproduces this asset byte for byte; no new PDF replaces the reviewed asset.

`lease-template-profile.js` holds the measured field positions, explicit fixed
sizes/baselines, editable room-placement suggestions and grouped bathroom text.
The routine page-8 preview uses this original blank checklist, with no full
master required. It is a DRAFT and does not approve a lease. The measured map
can be applied to a matching clean master's page 8 after explicit comparison;
it leaves other pages' maps intact. It does not automatically replace a user's
master or certify that the remainder is unsigned. Full-master replacement helper
is used by fictional tests only.

Known supplied full-master hashes are denied final export because the earlier
review found existing disclosure/signature marks. A new clean unsigned full
master still needs review. Fixed-size overflow requires staff adjustment;
unsupported filled slots are reported instead of silently omitted. Synthetic
fixtures exercise 3/4/5-bedroom and den/master-bathroom layouts. Render regression
compares all unchanged pixels outside measured boxes on the retained original;
this validates preservation of this asset, not legal approval of a whole lease.


## Reproduce and verify the original repairs

Use an authorized local copy of **Blank Lease and All Docs (1).pdf**, SHA-256
`9e8d2538c2501c002a509fb1446db49a93fc2436ec63fa73f17ea2e790473a59`.
Only actual PDF page 8 is extracted. No private full lease is committed or fetched
by the script. Use Python with **PyMuPDF 1.26.6** and the exact Carlito Regular/Bold
fonts from `google/fonts` (`ofl/carlito/Carlito-Regular.ttf` and
`ofl/carlito/Carlito-Bold.ttf`); the builder verifies their recorded SHA-256 values.
The embedded-font OFL is retained here.

```sh
python3 scripts/rebuild-original-checklist.py \
  --source '/private/reference/Blank Lease and All Docs (1).pdf' \
  --fonts '/private/fonts/carlito' \
  --output '/tmp/checklist-rebuilt.pdf'
```

Choose an output that does not exist. A wrong source/font fingerprint or renderer
version is rejected before writing. The script never changes the input, replaces
the tracked asset, touches a full master, or marks a preparation approved.

Recorded result: [reproduction-check.json](reproduction-check.json).
The rebuilt SHA matches the retained asset. Pixel comparisons at 72, 108 and
144 DPI have zero differences. A separate 144-DPI comparison against the original
blank page has zero changed pixels outside the measured repair bounds: the
preselected X and adjoining underscore glyph, displaced Bedroom 3 label,
Bedroom 4 Ceiling/Floor labels, and the corrected condition rule. The spare
original line and all signature areas remain. Bounds include complete glyphs
removed by PDF text redaction, not only the small rectangles used to select them.

This proves the provenance and limited changes of the blank checklist. It does
not certify a whole clean unsigned lease or a property's current conditions.
