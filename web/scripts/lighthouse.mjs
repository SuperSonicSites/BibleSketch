// Phase 0 check 1: Lighthouse mobile performance, median of N runs per URL.
// Usage: node scripts/lighthouse.mjs <origin> [runs=3] [--cold] [--paths=/a,/b]
// Default = warm edge cache (what visitors and PageSpeed Insights mostly get): each URL is fetched twice first.
// --cold adds ?cb=<random> so every run misses the cache and renders from Firestore.
//   node scripts/lighthouse.mjs https://biblesketch-web.<account>.workers.dev
//   node scripts/lighthouse.mjs https://biblesketch.app      (production baseline)
// Uses the Lighthouse 13.4.1 / chrome-launcher copy in the npx cache (see CLAUDE.md) instead of a dependency.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const M = `${process.env.LOCALAPPDATA}/npm-cache/_npx/0f94ee7615faf582/node_modules/`;
const require = createRequire(M);
const { launch } = require('chrome-launcher');
const lighthouse = (await import(pathToFileURL(require.resolve('lighthouse')).href)).default;

const args = process.argv.slice(2);
const cold = args.includes('--cold');
const pathsArg = args.find((a) => a.startsWith('--paths='));
const [origin, runsArg] = args.filter((a) => !a.startsWith('--'));
const runs = Number(runsArg ?? 3);
if (!origin) throw new Error('usage: node scripts/lighthouse.mjs <origin> [runs]');
const paths = pathsArg ? pathsArg.slice(8).split(',') : [
  '/coloring-page/genesis-1-3-5/DbZ9PRyfCbwlWoeFMPqe', // scene, Toddler
  '/coloring-page/joshua-1-9/WrFh8ilVdsYQzrxmChsO', // verse art
  '/coloring-page/isaiah-7-14/RZa9lDfB24WNwJBoTLwF', // scene, Toddler
];
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

process.on('uncaughtException', (e) => { if (e.code !== 'EPERM') throw e; });
const chrome = await launch({ chromeFlags: ['--headless=new'] });
try {
  for (const path of paths) {
    const rows = [];
    if (!cold) for (let i = 0; i < 2; i++) await fetch(origin + path).then((r) => r.arrayBuffer());
    for (let i = 0; i < runs; i++) {
      const { lhr } = await lighthouse(origin + path + (cold ? `?cb=${Date.now()}` : ''), {
        port: chrome.port, onlyCategories: ['performance'], output: 'json', logLevel: 'error',
      });
      const a = lhr.audits;
      rows.push({
        score: Math.round(lhr.categories.performance.score * 100),
        lcp: a['largest-contentful-paint'].numericValue, tbt: a['total-blocking-time'].numericValue,
        cls: a['cumulative-layout-shift'].numericValue, fcp: a['first-contentful-paint'].numericValue,
      });
    }
    const m = (k) => median(rows.map((r) => r[k]));
    console.log(
      `${m('score')}\t${path}\tLCP ${Math.round(m('lcp'))}ms  FCP ${Math.round(m('fcp'))}ms  TBT ${Math.round(m('tbt'))}ms  CLS ${m('cls').toFixed(3)}  runs=${rows.map((r) => r.score).join(',')}`,
    );
  }
} finally {
  // On Windows the profile dir is often still locked when chrome-launcher deletes it (EPERM); harmless.
  await Promise.resolve(chrome.kill()).catch(() => {});
}
