// /gallery tabs (bundle `QP`): Community is the server-rendered listing (#community); My Gallery and Saved are
// the signed-in visitor's own sketches, read here with their session. The tab lives in the hash (#my, #saved)
// so the cached server page stays one URL. My Gallery items open SketchOwnerView in a dialog; Saved items are
// bookmarks and link to the original coloring page (which has the Save toggle).
import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { Bookmark, Globe, LoaderCircle, Lock, User } from 'lucide-react';
import Dialog from './shell/Dialog.tsx';
import Button from './shell/Button.tsx';
import SketchOwnerView from './SketchOwnerView.tsx';
import { $authReady, $user, requireAuth } from '../lib/store.ts';
import { canonicalPath, reference, thumbUrl, type Sketch } from '../lib/sketch.ts';
import { cardSubtitle } from '../lib/listing.ts';

type Tab = 'community' | 'my' | 'saved';
const BATCH = 48;
const tabFromHash = (): Tab => (location.hash === '#my' ? 'my' : location.hash === '#saved' ? 'saved' : 'community');

// The user's own docs, newest first, one batch at a time (index userId + createdAt).
async function loadBatch(uid: string, after: unknown) {
  const { db, fs } = await import('../lib/firebase-client.ts').then((m) => m.getDbClient());
  const parts = [fs.where('userId', '==', uid), fs.orderBy('createdAt', 'desc'), ...(after ? [fs.startAfter(after)] : []), fs.limit(BATCH)];
  const snap = await fs.getDocs(fs.query(fs.collection(db, 'sketches'), ...parts));
  const items = snap.docs.map((d) => ({ ...d.data(), id: d.id, createdAt: d.data().createdAt?.toDate?.().toISOString() }) as Sketch & { originalSketchId?: string });
  return { items, last: snap.docs.at(-1), more: snap.size === BATCH };
}

export default function GalleryTabs() {
  const user = useStore($user);
  const ready = useStore($authReady);
  const [tab, setTab] = useState<Tab>('community');
  const [items, setItems] = useState<(Sketch & { originalSketchId?: string })[]>([]);
  const [cursor, setCursor] = useState<unknown>(null);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<Sketch | null>(null);

  useEffect(() => {
    const sync = () => setTab(tabFromHash());
    sync();
    addEventListener('hashchange', sync);
    return () => removeEventListener('hashchange', sync);
  }, []);
  // The server listing is the Community tab.
  useEffect(() => {
    const community = document.getElementById('community');
    if (community) community.hidden = tab !== 'community';
  }, [tab]);
  useEffect(() => {
    if (tab === 'community' || !user) return;
    let live = true;
    setItems([]);
    setError(false);
    setLoading(true);
    loadBatch(user.uid, null)
      .then((r) => { if (live) { setItems(r.items); setCursor(r.last); setMore(r.more); } })
      .catch((e) => { console.error('[gallery]', e); if (live) setError(true); })
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [tab, user?.uid]);

  const go = (t: Tab) => {
    if (t === 'community') history.replaceState(null, '', location.pathname + location.search);
    else location.hash = t;
    setTab(t);
  };
  const loadMore = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const r = await loadBatch(user.uid, cursor);
      setItems((xs) => [...xs, ...r.items]);
      setCursor(r.last);
      setMore(r.more);
    } finally {
      setLoading(false);
    }
  };

  const shown = items.filter((s) => (tab === 'saved' ? s.isBookmark : !s.isBookmark));
  const tabs: [Tab, string, typeof User][] = [['my', 'My Gallery', User], ['saved', 'Saved', Bookmark], ['community', 'Community', Globe]];

  return (
    <>
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-white rounded-full p-1 shadow-sm border border-gray-100" role="tablist" aria-label="Gallery">
          {tabs.map(([t, label, Icon]) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t}
              onClick={() => (t === 'community' || user ? go(t) : requireAuth(() => go(t), 'login'))}
              className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-full text-sm font-bold transition-all ${tab === t ? 'bg-[#7C3AED] text-white shadow-md' : 'text-gray-500 hover:text-[#7C3AED]'}`}>
              <Icon className="w-4 h-4" aria-hidden="true" />{label}
            </button>
          ))}
        </div>
      </div>

      {tab !== 'community' && (
        !user ? (
          <div className="text-center py-16">
            {ready ? (
              <>
                <h2 className="font-display text-2xl font-bold text-gray-800 mb-2">Login Required</h2>
                <p className="text-gray-500 mb-6">Please log in to view your personal collection.</p>
                <Button onClick={() => requireAuth(() => {}, 'login')}>Log In</Button>
              </>
            ) : <LoaderCircle className="w-8 h-8 animate-spin text-[#7C3AED] mx-auto" aria-label="Loading" />}
          </div>
        ) : error ? (
          <p className="text-center py-16 text-red-600">Could not load your gallery. Please refresh the page.</p>
        ) : !loading && shown.length === 0 && !more ? (
          <div className="text-center py-16">
            <h2 className="font-display text-2xl font-bold text-gray-800 mb-2">No images found</h2>
            <p className="text-gray-500">{tab === 'my' ? 'Create your first coloring page to see it here!' : 'Bookmark sketches from the community to see them here!'}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {shown.map((s) => {
                const inner = (
                  <>
                    <div className="relative aspect-[3/4] bg-gray-50">
                      <img src={thumbUrl(s) ?? s.imageUrl} alt={s.promptData ? `${reference(s.promptData)} coloring page` : 'Bible coloring page'} loading="lazy"
                        onError={(e) => { if (s.imageUrl && e.currentTarget.src !== s.imageUrl) e.currentTarget.src = s.imageUrl; }}
                        className="w-full h-full object-cover" />
                      {tab === 'my' && (
                        <span className={`absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${s.isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-800/70 text-white'}`}>
                          {s.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}{s.isPublic ? 'Public' : 'Private'}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-gray-800 text-sm truncate">{s.promptData ? reference(s.promptData) : 'Bible Scene'}</p>
                      <p className="text-xs text-gray-500 truncate">{cardSubtitle(s)}</p>
                    </div>
                  </>
                );
                const card = 'block text-left bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow';
                return tab === 'saved'
                  ? <a key={s.id} href={canonicalPath({ ...s, id: s.originalSketchId || s.id })} className={card}>{inner}</a>
                  : <button key={s.id} type="button" onClick={() => setOpen(s)} className={card}>{inner}</button>;
              })}
            </div>
            <div className="text-center mt-8">
              {loading ? <LoaderCircle className="w-8 h-8 animate-spin text-[#7C3AED] mx-auto" aria-label="Loading" />
                : more && <Button variant="outline" onClick={loadMore}>Load More</Button>}
            </div>
          </>
        )
      )}

      {open && (
        <Dialog label="Your coloring page" onClose={() => setOpen(null)} cardClass="max-w-6xl max-h-[92vh] overflow-y-auto p-6 md:p-8">
          <SketchOwnerView
            sketch={open}
            onSwitch={(next) => { setItems((xs) => [next, ...xs]); setOpen(next); }}
            onChange={(patch) => {
              setOpen((o) => (o ? { ...o, ...patch } : o));
              setItems((xs) => xs.map((x) => (x.id === open.id ? { ...x, ...patch } : x)));
            }}
            onDelete={() => { setItems((xs) => xs.filter((x) => x.id !== open.id)); setOpen(null); }}
          />
        </Dialog>
      )}
    </>
  );
}
