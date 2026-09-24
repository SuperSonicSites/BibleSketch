# Contact sheets for reviewing generated pages before they enter the Pinterest calendar, and for the learning loop's
# visual profiles and winners-vs-losers study (docs/pinterest-runbook.md).
#   python scripts/pins-review.py <pages.json> <out-prefix> [per-sheet]
# pages.json: [[label, look, story, sketchId, imageUrl], ...]; writes <out-prefix>00.png, 01.png, ... (3 pages per
# sheet by default, 6 = two rows; transparency flattened to white). Open each sheet at full size; crop a detail with
# PIL when text or faces are small.
import json, os, sys, urllib.request
from PIL import Image, ImageDraw

items = json.load(open(sys.argv[1]))
prefix = sys.argv[2]
per = int(sys.argv[3]) if len(sys.argv) > 3 else 3
rows = (per + 2) // 3
os.makedirs('pins-review-cache', exist_ok=True)
tiles = []
for label, look, story, sid, url in items:
    path = f'pins-review-cache/{sid}.png'
    if not os.path.exists(path):
        urllib.request.urlretrieve(url, path)
    im = Image.open(path).convert('RGBA')
    bg = Image.new('RGBA', im.size, 'white')
    bg.alpha_composite(im)
    im = bg.convert('RGB')
    im.thumbnail((620, 830))
    tiles.append((f'{label} [{look}] {story} {sid[:6]}', im))
for n in range(0, len(tiles), per):
    sheet = Image.new('RGB', (3 * 630, rows * 860), 'white')
    draw = ImageDraw.Draw(sheet)
    for i, (text, im) in enumerate(tiles[n:n + per]):
        x, y = (i % 3) * 630, (i // 3) * 860
        sheet.paste(im, (x, y + 26))
        draw.text((x + 4, y + 4), text, fill='black')
    sheet.save(f'{prefix}{n // per:02d}.png')
print(len(tiles), 'pages,', (len(tiles) + per - 1) // per, 'sheets')
