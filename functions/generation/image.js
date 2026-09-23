// Server-side versions of the bundle's canvas steps (hosting-public/assets/index-DHKtGwi1.js):
// $P (859053) = shrink to 85% on white + threshold, V8 (858454) = threshold only, J8 (885042) = "Add Ref" caption.
// Pure-JS jimp: no native platform packages in functions/package-lock.json (Cloud Build npm ci).
const { Jimp, loadFont, HorizontalAlign, measureText, measureTextHeight } = require('jimp');
const { SANS_64_BLACK } = require('jimp/fonts');

const threshold = (img) => {
  const d = img.bitmap.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] < 160 ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  return img;
};

// New artwork: 7.5% white margin on every side, then 1-bit. Returns the Jimp image.
const postProcess = async (buffer) => {
  const art = await Jimp.read(buffer);
  const { width: w, height: h } = art.bitmap;
  const page = new Jimp({ width: w, height: h, color: 0xffffffff });
  art.resize({ w: Math.round(w * 0.85), h: Math.round(h * 0.85) });
  page.composite(art, Math.round((w - art.bitmap.width) / 2), Math.round((h - art.bitmap.height) / 2));
  return threshold(page);
};

// Edits: threshold only, so repeated edits don't keep shrinking the art.
const thresholdOnly = async (buffer) => threshold(await Jimp.read(buffer));

let font;
// "Book ch:v" centred at the bottom on a white strip (the bundle stroked the text in white for the same reason).
const addCaption = async (buffer, text) => {
  font ??= await loadFont(SANS_64_BLACK);
  const img = await Jimp.read(buffer);
  const { width: w, height: h } = img.bitmap;
  const tw = measureText(font, text), th = measureTextHeight(font, text, w);
  const pad = Math.floor(w * 0.02);
  const strip = new Jimp({ width: Math.min(w, tw + 2 * pad), height: th + pad, color: 0xffffffff });
  const y = h - pad - th;
  img.composite(strip, Math.round((w - strip.bitmap.width) / 2), y - Math.round(pad / 2));
  img.print({ font, x: 0, y, text: { text, alignmentX: HorizontalAlign.CENTER }, maxWidth: w });
  return img;
};

const toPng = (img) => img.getBuffer('image/png');

module.exports = { postProcess, thresholdOnly, addCaption, toPng };
