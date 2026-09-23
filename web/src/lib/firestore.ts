// Firestore REST. Without a token, Security Rules apply exactly as for a signed-out browser; with a visitor's
// Firebase ID token they apply as that visitor (so the Worker can act for them without a service account).
// firebase-admin doesn't run on Workers, and the web SDK would pull ~300 KB into the Worker for a few reads.
// No Worker-only imports, so scripts/check-sketch.mjs can run it under Node.
import { FIREBASE } from './config.ts';

const PROD = `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents`;
let base = PROD;
// Local end-to-end tests: the middleware points server-side reads at the Firestore emulator.
export const useEmulator = (host: string) => {
  base = `http://${host}/v1/projects/${FIREBASE.projectId}/databases/(default)/documents`;
};
const url = (path: string) => `${base}${path}${path.includes('?') ? '&' : '?'}key=${FIREBASE.apiKey}`;
const headers = (token?: string): Record<string, string> => ({
  'content-type': 'application/json',
  ...(token ? { authorization: `Bearer ${token}` } : {}),
});

// `_updateTime` is the server's version stamp, for conditional writes (commit's currentDocument precondition).
export type Doc = Record<string, any> & { id: string; _updateTime?: string };

type Value = Record<string, any>;

// REST typed value -> plain JS (timestamps stay ISO strings).
export function decode(v: Value): any {
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('referenceValue' in v) return v.referenceValue;
  if ('mapValue' in v) return decodeFields(v.mapValue.fields ?? {});
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(decode);
  return undefined;
}

const decodeFields = (fields: Record<string, Value>) =>
  Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decode(v)]));

const toDoc = (d: { name: string; fields?: Record<string, Value>; updateTime?: string }): Doc => ({
  id: decodeURIComponent(d.name.slice(d.name.lastIndexOf('/') + 1)),
  _updateTime: d.updateTime,
  ...decodeFields(d.fields ?? {}),
});

// null when missing OR denied: the rules answer 403 for both, so a private sketch looks like a missing one.
export async function getDoc(collection: string, id: string, token?: string): Promise<Doc | null> {
  const res = await fetch(url(`/${collection}/${encodeURIComponent(id)}`), { headers: headers(token) });
  if (res.status === 403 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore get ${collection}/${id}: ${res.status}`);
  return toDoc(await res.json());
}

// [field, value] is equality; [field, value, 'array-contains'] matches one element of an array field.
export type Filter = [field: string, value: string | boolean] | [field: string, value: string, op: 'array-contains'];

// Filters AND-ed; newest first unless `ordered: false` (a query with no matching composite index, sorted by the
// caller). The rules require isPublic == true among the filters for signed-out reads.
export async function query(
  collection: string,
  filters: Filter[],
  limit: number,
  opts: { ordered?: boolean; token?: string } = {},
): Promise<Doc[]> {
  const fieldFilter = ([field, value, op]: Filter) => ({
    fieldFilter: {
      field: { fieldPath: field },
      op: op === 'array-contains' ? 'ARRAY_CONTAINS' : 'EQUAL',
      value: typeof value === 'boolean' ? { booleanValue: value } : { stringValue: value },
    },
  });
  const res = await fetch(url(':runQuery'), {
    method: 'POST',
    headers: headers(opts.token),
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: { compositeFilter: { op: 'AND', filters: filters.map(fieldFilter) } },
        ...(opts.ordered === false ? {} : { orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }] }),
        limit,
      },
    }),
  });
  if (!res.ok) throw new Error(`Firestore runQuery ${collection}: ${res.status} ${await res.text()}`);
  const rows: { document?: any }[] = await res.json();
  return rows.filter((r) => r.document).map((r) => toDoc(r.document));
}

// Set one integer field only if the document hasn't changed since it was read (optimistic concurrency).
// Returns false when someone else wrote first (the caller re-reads and retries).
export async function setIntIfUnchanged(doc: Doc, collection: string, field: string, value: number, token: string) {
  const name = `projects/${FIREBASE.projectId}/databases/(default)/documents/${collection}/${doc.id}`;
  const res = await fetch(url(':commit'), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      writes: [{
        update: { name, fields: { [field]: { integerValue: String(value) } } },
        updateMask: { fieldPaths: [field] },
        currentDocument: { updateTime: doc._updateTime },
      }],
    }),
  });
  if (res.ok) return true;
  if (res.status === 400 || res.status === 409) {
    const body = await res.text();
    if (/FAILED_PRECONDITION|ABORTED/.test(body)) return false;
    throw new Error(`Firestore commit: ${res.status} ${body}`);
  }
  throw new Error(`Firestore commit: ${res.status} ${await res.text()}`);
}
