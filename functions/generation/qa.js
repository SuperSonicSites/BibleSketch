// Coloring-page QA, ported from the prompt lab (C:\Users\renau\Coding\BibleSketch\lab\qa.ts, not in git).
// Objective measurements of a delivered black/white page in print units (page printed at US Letter width).
// Stored on each new sketch (`qa`) for analysis; not a gate yet (thresholds need validating first, ROADMAP 1.0).

const PAGE_MM = 215.9;   // US Letter width
const TINY_MM2 = 16;     // a closed area under ~4 x 4 mm is too small to color comfortably
const SPECK_MM2 = 0.25;  // anti-aliasing pinholes inside lines: invisible, ignored
const FILL_DEPTH_MM = 0.8; // ink this far from any white is a solid fill, not a line (lines are 0.4-0.6 mm wide)

// Adult values from r07 votes: 👍 500-900 areas at 0.39-0.48 mm, 👎 960-1400 areas at 0.32-0.40 mm.
const MIN_LINE_MM = { Toddler: 1.5, 'Young Child': 0.9, Teen: 0.5, Adult: 0.4 };

const BAD = {
  inkPct: (v) => v > 25,
  fillMm2: (v) => v > 10,
  lineMm: (v, age) => v < (MIN_LINE_MM[age] ?? 0.5),
  regions: (v, age) => age === 'Adult' && v > 1000,
  tinyPct: (v) => v > 75,
  frame: (v) => !v,
};

// { width, height, data: RGBA } (a jimp bitmap or canvas ImageData).
const measure = ({ width: w, height: h, data }) => {
  // Bounding box of the ink (skips the white page margin post-processing adds).
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4] < 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return { inkPct: 0, lineMm: 0, tinyPct: 0, regions: 0, frame: false, fillMm2: 0 };

  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, n = bw * bh;
  const ink = new Uint8Array(n);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) ink[y * bw + x] = data[((y0 + y) * w + x0 + x) * 4] < 128 ? 1 : 0;
  const mmPerPx = PAGE_MM / w;

  // Stroke width ~ 2 * ink area / edge pixels (a stroke of width W, length L has area WL, ~2L edge pixels).
  let inkCount = 0, edge = 0;
  for (let i = 0; i < n; i++) {
    if (!ink[i]) continue;
    inkCount++;
    const x = i % bw;
    if (x === 0 || !ink[i - 1] || x === bw - 1 || !ink[i + 1] || i < bw || !ink[i - bw] || i >= n - bw || !ink[i + bw]) edge++;
  }

  // Solid fills: chamfer distance (3/4 weights) from each ink pixel to the nearest white; outside the box is white.
  const dist = new Uint16Array(n);
  for (let i = 0; i < n; i++) dist[i] = ink[i] ? 65535 : 0;
  const relax = (i, j, wt) => { if (dist[j] + wt < dist[i]) dist[i] = dist[j] + wt; };
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const i = y * bw + x;
    if (!dist[i]) continue;
    if (x === 0 || y === 0 || x === bw - 1 || y === bh - 1) { dist[i] = 3; continue; }
    relax(i, i - 1, 3); relax(i, i - bw, 3); relax(i, i - bw - 1, 4); relax(i, i - bw + 1, 4);
  }
  for (let y = bh - 1; y >= 0; y--) for (let x = bw - 1; x >= 0; x--) {
    const i = y * bw + x;
    if (!dist[i] || x === 0 || y === 0 || x === bw - 1 || y === bh - 1) continue;
    relax(i, i + 1, 3); relax(i, i + bw, 3); relax(i, i + bw + 1, 4); relax(i, i + bw - 1, 4);
  }
  const depth = (FILL_DEPTH_MM / mmPerPx) * 3;
  let core = 0;
  for (let i = 0; i < n; i++) if (dist[i] > depth) core++;
  const fillMm2 = Math.round(core * mmPerPx ** 2);

  // Closed white areas (4-connected). Areas touching the ink box edge are outside the artwork.
  const seen = new Uint8Array(n), stack = new Int32Array(n);
  const tinyPx = TINY_MM2 / mmPerPx ** 2, speckPx = SPECK_MM2 / mmPerPx ** 2;
  let regions = 0, tiny = 0;
  for (let s = 0; s < n; s++) {
    if (seen[s] || ink[s]) continue;
    let top = 0, area = 0, outside = false;
    stack[top++] = s; seen[s] = 1;
    while (top) {
      const p = stack[--top], x = p % bw, y = (p / bw) | 0;
      area++;
      if (x === 0 || y === 0 || x === bw - 1 || y === bh - 1) outside = true;
      for (const q of [x > 0 ? p - 1 : -1, x < bw - 1 ? p + 1 : -1, y > 0 ? p - bw : -1, y < bh - 1 ? p + bw : -1]) {
        if (q >= 0 && !seen[q] && !ink[q]) { seen[q] = 1; stack[top++] = q; }
      }
    }
    if (outside || area < speckPx) continue;
    regions++;
    if (area < tinyPx) tiny++;
  }

  // Frame: a near-solid ink row/column within the outer 6% of each side.
  const band = (len) => Math.max(1, Math.round(len * 0.06));
  const row = (y) => { let c = 0; for (let x = 0; x < bw; x++) c += ink[y * bw + x]; return c >= bw * 0.85; };
  const col = (x) => { let c = 0; for (let y = 0; y < bh; y++) c += ink[y * bw + x]; return c >= bh * 0.85; };
  const any = (from, to, f) => { for (let i = from; i < to; i++) if (f(i)) return true; return false; };
  const frame = any(0, band(bh), row) && any(bh - band(bh), bh, row) && any(0, band(bw), col) && any(bw - band(bw), bw, col);

  return {
    inkPct: Math.round((inkCount / n) * 1000) / 10,
    lineMm: Math.round((edge ? (2 * inkCount) / edge : 0) * mmPerPx * 100) / 100,
    tinyPct: regions ? Math.round((tiny / regions) * 100) : 0,
    regions,
    frame,
    fillMm2,
  };
};

// Names of the checks a page fails for this audience (empty = all pass).
const failures = (qa, age) => Object.keys(BAD).filter((k) => BAD[k](qa[k], age));

module.exports = { measure, failures };
