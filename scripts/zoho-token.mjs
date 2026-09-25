// Connects the on-site checkout to Zoho Billing (docs/email-marketing-plan.md §12.20 item 4): gets a refresh token for
// the "Bible Sketch checkout" API client, tests it exactly the way createCheckout uses it, and saves the client ID,
// secret and refresh token as Firebase secrets in one go, so the three always belong together. Nothing secret is
// printed. Run it in your own terminal (it asks questions): node scripts/zoho-token.mjs
// Afterwards, createCheckout must be redeployed to pick up the new secret versions.
import readline from 'node:readline';
import { spawn, spawnSync } from 'node:child_process';

const PROJECT = 'biblesketch-5104c';
const ACCOUNTS = 'https://accounts.zohocloud.ca'; // Zoho's Canada data center
const REDIRECT = 'http://localhost/';
const SCOPES = 'ZohoSubscriptions.customers.CREATE,ZohoSubscriptions.hostedpages.CREATE';

// One question; with `hidden`, what's typed isn't echoed.
function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => { if (s.includes(question)) process.stdout.write(question); };
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

const token = async (accounts, params) => {
  const res = await fetch(`${accounts}/oauth/v2/token`, { method: 'POST', body: new URLSearchParams(params) });
  return res.json().catch(() => ({ error: `HTTP ${res.status}` }));
};
const fail = (message) => { console.error(`\n✗ ${message}`); process.exit(1); };

console.log('Zoho API console: https://api-console.zohocloud.ca > the "Bible Sketch checkout" client (Server-based).\n');
const id = await ask('Client ID: ');
if (!/^1000\.\w{20,}$/.test(id)) fail('That doesn\'t look like a Zoho client ID (it starts with "1000.").');
const secret = await ask('Client secret (hidden): ', true);
if (secret.length < 20) fail('That client secret looks too short.');

const consent = `${ACCOUNTS}/oauth/v2/auth?${new URLSearchParams({
  scope: SCOPES, client_id: id, response_type: 'code', access_type: 'offline', prompt: 'consent', redirect_uri: REDIRECT,
})}`;
console.log('\nOpening Zoho\'s consent page in your browser. Click Accept.');
console.log('You\'ll land on a page that can\'t load, at http://localhost/?code=... : copy that whole address.');
console.log(`(If no browser opens, visit: ${consent})\n`);
const opener = process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', consent]]
  : process.platform === 'darwin' ? ['open', [consent]] : ['xdg-open', [consent]];
spawn(opener[0], opener[1], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();

const landed = await ask('Paste the localhost address (or just the code): ');
let code = landed;
let accounts = ACCOUNTS;
try {
  const u = new URL(landed);
  code = u.searchParams.get('code') ?? '';
  accounts = u.searchParams.get('accounts-server') || ACCOUNTS; // Zoho says which server issued the code
} catch { /* just the code */ }
if (!code) fail('No code found in what you pasted.');

const grant = await token(accounts, { grant_type: 'authorization_code', client_id: id, client_secret: secret, redirect_uri: REDIRECT, code });
if (!grant.refresh_token) {
  fail(`Zoho gave no refresh token: ${grant.error || JSON.stringify(grant)}. If it says invalid_code, the code expired (it only lasts a couple of minutes): run this again and paste faster.`);
}
const refresh = grant.refresh_token;
console.log(`\n✓ Got a refresh token (${refresh.length} characters).`);

// The same call createCheckout makes.
const test = await token(accounts, { grant_type: 'refresh_token', client_id: id, client_secret: secret, refresh_token: refresh });
if (!test.access_token) fail(`The refresh test failed: ${test.error || JSON.stringify(test)}. Nothing was saved.`);
console.log(`✓ Refresh test OK (API server ${test.api_domain}).`);

// Saved together, from this run, so the three always match.
for (const [name, value] of [['ZOHO_CLIENT_ID', id], ['ZOHO_CLIENT_SECRET', secret], ['ZOHO_REFRESH_TOKEN', refresh]]) {
  const r = spawnSync('firebase', ['--non-interactive', 'functions:secrets:set', name, '--data-file', '-', '--project', PROJECT],
    { input: value, stdio: ['pipe', 'ignore', 'pipe'], shell: true, encoding: 'utf8' });
  if (r.status !== 0) fail(`Saving ${name} failed:\n${r.stderr}`);
  console.log(`✓ Saved ${name}.`);
}
console.log('\nDone. Tell Claude: it redeploys createCheckout to pick up the new secrets and runs the checkout tests.');
