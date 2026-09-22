// Minimal Firestore REST access for one-off admin scripts (bypasses security rules).
// Production: uses your Firebase CLI login (`firebase login`), so no service-account key is needed.
// Emulator: set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080.
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

export const PROJECT = 'biblesketch-5104c';
const emulator = process.env.FIRESTORE_EMULATOR_HOST;
const base = emulator ? `http://${emulator}/v1` : 'https://firestore.googleapis.com/v1';
export const DOCS = `projects/${PROJECT}/databases/(default)/documents`;

let token;
const getToken = async () => {
  if (emulator) return 'owner';
  if (!token) {
    const cli = createRequire(`${execSync('npm root -g').toString().trim()}/firebase-tools/lib/`);
    const auth = cli('./auth');
    const account = auth.getGlobalDefaultAccount();
    if (!account) throw new Error('Not logged in: run `firebase login` first.');
    ({ access_token: token } = await auth.getAccessToken(account.tokens.refresh_token,
      ['https://www.googleapis.com/auth/cloud-platform']));
  }
  return token;
};

export const firestore = async (method, path, { query = {}, body } = {}) => {
  const url = new URL(`${base}/${path}`);
  for (const [k, v] of Object.entries(query)) [].concat(v).forEach((x) => url.searchParams.append(k, x));
  const res = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${await getToken()}`, 'content-type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
};

// Every document in a collection, with only the requested fields.
export async function* listDocs(collection, fields) {
  let pageToken;
  do {
    const page = await firestore('GET', `${DOCS}/${collection}`, {
      query: { pageSize: '300', 'mask.fieldPaths': fields, ...(pageToken && { pageToken }) },
    });
    yield* page.documents || [];
    pageToken = page.nextPageToken;
  } while (pageToken);
}

// Plain JS value from a Firestore REST value.
export const plain = (v) => {
  if (!v) return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  return JSON.stringify(v);
};
