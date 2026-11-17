"""Reproduce the reviewed blank Page 8 from authorized local sources only.

Requires PyMuPDF 1.26.6. Does not access Drive, mutate a full lease, or approve it.
"""
import argparse
import fitz, hashlib, json, pathlib

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=pathlib.Path, required=True)
parser.add_argument('--fonts', type=pathlib.Path, required=True)
parser.add_argument('--output', type=pathlib.Path, required=True)
parser.add_argument('--compare', type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1] / 'lease-assets/page8-original-blank.pdf')
args = parser.parse_args()
if args.output.exists():
    parser.error('Output already exists; choose a new path.')
if fitz.VersionBind != '1.26.6':
    parser.error('Use PyMuPDF 1.26.6 for this recorded reproduction.')
src = args.source
if hashlib.sha256((args.fonts / 'Carlito-Regular.ttf').read_bytes()).hexdigest() != 'f6418f708baede9789daef5d458c0f53d2a888af9820e8062934e504fedc6595':
    parser.error('Carlito-Regular font fingerprint differs from the recorded source.')
if hashlib.sha256((args.fonts / 'Carlito-Bold.ttf').read_bytes()).hexdigest() != 'bb5d20f79b82599ec72983597437373a80f2d2085fa91fc144fd74e876a594db':
    parser.error('Carlito-Bold font fingerprint differs from the recorded source.')
if hashlib.sha256(src.read_bytes()).hexdigest() != '9e8d2538c2501c002a509fb1446db49a93fc2436ec63fa73f17ea2e790473a59':
    parser.error('Source fingerprint does not match the reviewed old blank.')
d=fitz.open(src);o=fitz.open();o.insert_pdf(d,from_page=7,to_page=7);p=o[0]
# Preserve the original vector page. Correct only the displaced Bedroom 3,
# Bedroom 4 Ceiling/Floor labels/rules and clear the preselected overall X.
# Rectangles measured from source glyphs; no section/acceptance area is moved.
repairs=[(350,37,361,42),(72,447,127,451),(324,528,362,532),(553,537,576,541),(71,537,228,541)]
for r in repairs:p.add_redact_annot(fitz.Rect(r),fill=(1,1,1))
p.apply_redactions(images=0,graphics=0,text=0)
for resource,fontname in [('R25','SourceRegular'),('R9','SourceBold')]:
 p.insert_font(fontname=fontname,fontfile=str(args.fonts / ('Carlito-'+('Regular' if resource=='R25' else 'Bold')+'.ttf')))
# Origins are the original adjacent row baselines, not a new layout.
p.insert_text((36.1,452.4),'BEDROOM 3',fontname='SourceBold',fontsize=10)
p.insert_text((36.1,533.4),'Ceiling',fontname='SourceRegular',fontsize=10)
p.insert_text((36.1,551.4),'Floor',fontname='SourceRegular',fontsize=10)
p.insert_text((108.1,533.4),'_______________________________',fontname='SourceRegular',fontsize=10)
# Source's blank bedroom 4 has a spare line; keep it and all remaining geometry.
o.set_metadata({});o.save(str(args.output),garbage=4,deflate=True,no_new_id=True)

# Reopen after save: the saved file is what staff and PDF renderers receive.
rebuilt = fitz.open(args.output)
retained = fitz.open(args.compare)
if len(rebuilt) != 1 or len(retained) != 1 or rebuilt[0].rect != retained[0].rect:
    raise SystemExit('Checklist page count or dimensions differ.')
results = []
for scale in (1, 1.5, 2):
    a = rebuilt[0].get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    b = retained[0].get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    if a.samples != b.samples:
        raise SystemExit(f'Rebuilt checklist differs visually at {scale}x.')
    results.append({'scale': scale, 'width': a.width, 'height': a.height, 'different_pixels': 0})
# Check the source itself, not just a second rendering of the generated file.
# These bounds include the complete source glyphs removed by redaction and the
# three corrected labels plus their restored rule. All other pixels must match.
regions = [(345,32,362,49),(71,443,128,456),(323,524,363,537),
           (552,533,577,546),(70,533,229,546),(35,443,92,456),
           (35,524,65,537),(35,542,59,555),(107,524,264,537)]
a = d[7].get_pixmap(matrix=fitz.Matrix(2,2), alpha=False)
b = rebuilt[0].get_pixmap(matrix=fitz.Matrix(2,2), alpha=False)
original_bytes, rebuilt_bytes = a.samples, b.samples
outside = inside = 0
for i in range(0,len(original_bytes),3):
    if original_bytes[i:i+3] == rebuilt_bytes[i:i+3]:
        continue
    x, y = ((i//3)%a.width)/2, ((i//3)//a.width)/2
    if any(l <= x <= r and t <= y <= bottom for l,t,r,bottom in regions):
        inside += 1
    else:
        outside += 1
if outside:
    raise SystemExit(f'{outside} pixels changed outside the documented repairs.')
print(json.dumps({'source_sha256': hashlib.sha256(src.read_bytes()).hexdigest(),
    'retained_sha256': hashlib.sha256(args.compare.read_bytes()).hexdigest(),
    'rebuilt_sha256': hashlib.sha256(args.output.read_bytes()).hexdigest(),
    'renderer': fitz.VersionBind, 'comparisons': results,
    'source_comparison': {'scale': 2, 'changed_inside_repairs': inside, 'changed_outside_repairs': outside, 'repair_regions': regions}}, indent=2))
