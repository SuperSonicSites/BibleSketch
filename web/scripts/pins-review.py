# Contact sheets for reviewing generated pages before they enter the Pinterest calendar (docs/pinterest-runbook.md).
#   python scripts/pins-review.py <pages.json> <out-prefix>
# pages.json: [[label, look, story, sketchId, imageUrl], ...]; writes <out-prefix>00.png, 01.png, ... (3 pages each,
# transparency flattened to white). Open each sheet at full size; crop a detail with PIL when text or faces are small.
import json, os, sys, urllib.request
from PIL import Image, ImageDraw

items = json.load(open(sys.argv[1]))
prefix = sys.argv[2]
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
for n in range(0, len(tiles), 3):
    sheet = Image.new('RGB', (3 * 630, 860), 'white')
    draw = ImageDraw.Draw(sheet)
    for i, (text, im) in enumerate(tiles[n:n + 3]):
        sheet.paste(im, (i * 630, 26))
        draw.text((i * 630 + 4, 4), text, fill='black')
    sheet.save(f'{prefix}{n // 3:02d}.png')
print(len(tiles), 'pages,', (len(tiles) + 2) // 3, 'sheets')
