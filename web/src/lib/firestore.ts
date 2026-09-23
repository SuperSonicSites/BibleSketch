// Firestore REST, unauthenticated: Security Rules apply exactly as for a signed-out browser.
// firebase-admin doesn't run on Workers, and the web SDK would pull ~300 KB into the Worker for three reads.
// No Worker-only imports, so scripts/check-sketch.mjs can run it under Node.
import { FIREBASE } from './config.ts';

const base = `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents`;
const key = FIREBASE.apiKey;

export type Doc = Record<string, any> & { id: string };

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

const toDoc = (d: { name: string; fields?: Record<string, Value> }): Doc => ({
  id: decodeURIComponent(d.name.slice(d.name.lastIndexOf('/') + 1)),
  ...decodeFields(d.fields ?? {}),
});

// null when missing OR denied: the rules answer 403 for both, so a private sketch looks like a missing one.
export async function getDoc(collection: string, id: string): Promise<Doc | null> {
  const res = await fetch(`${base}/${collection}/${encodeURIComponent(id)}?key=${key}`);
  if (res.status === 403 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore get ${collection}/${id}: ${res.status}`);
  return toDoc(await res.json());
}

type Filter = [field: string, value: string | boolean];

// Equality filters AND-ed, newest first. The rules require isPublic == true among the filters.
export async function query(collection: string, filters: Filter[], limit: number): Promise<Doc[]> {
  const fieldFilter = ([field, value]: Filter) => ({
    fieldFilter: {
      field: { fieldPath: field },
      op: 'EQUAL',
      value: typeof value === 'boolean' ? { booleanValue: value } : { stringValue: value },
    },
  });
  const res = await fetch(`${base}:runQuery?key=${key}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: { compositeFilter: { op: 'AND', filters: filters.map(fieldFilter) } },
        orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
        limit,
      },
    }),
  });
  if (!res.ok) throw new Error(`Firestore runQuery ${collection}: ${res.status} ${await res.text()}`);
  const rows: { document?: any }[] = await res.json();
  return rows.filter((r) => r.document).map((r) => toDoc(r.document));
}
