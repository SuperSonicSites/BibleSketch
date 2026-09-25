// The create tool on / (Scene Art, bundle `iq`) and /bible-verse-coloring (Verse Art, `Lq`): verse picker `L2`,
// options `p5` / font chooser `Dq`, loader `YP`, then the saved result (SketchOwnerView). Generation runs on the
// server (createSketch), which charges one credit, refunds failures and saves the page as a private sketch, so
// the result has a URL (?sketch=<id>) that survives a refresh, and a lost connection resumes (lib/generate.ts).
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { BookOpen, Check, ChevronDown, PencilLine, Search, Sparkles, ArrowLeft } from 'lucide-react';
import Button from './shell/Button.tsx';
import SketchOwnerView from './SketchOwnerView.tsx';
import { $authReady, $profile, $user, requireAuth } from '../lib/store.ts';
import { BIBLE_BOOKS } from '../lib/listing.ts';
import type { Sketch } from '../lib/sketch.ts';

type Kind = 'scene' | 'verse';
type Ref = { book: string; chapter: number; startVerse: number; endVerse?: number };

const AGES = ['Toddler', 'Young Child', 'Teen', 'Adult'] as const;
const STYLES_BY_AGE: Record<string, string[]> = {
  Toddler: ['Sunday School'],
  'Young Child': ['Sunday School', 'Comic Book', 'Stained Glass', 'Iconography'],
  Teen: ['Classic', 'Stained Glass', 'Iconography', 'Comic Book'],
  Adult: ['Classic', 'Stained Glass', 'Iconography', 'Doodles'],
};
const FONTS: [string, string][] = [
  ['Elegant Script', 'Flowing calligraphy with flourishes'],
  ['Modern Brush', 'Trendy hand-lettered style'],
  ['Playful', 'Whimsical bubble letters'],
  ['Classic Serif', 'Traditional book typography'],
];
const TRY: Record<Kind, [string, Ref][]> = {
  scene: [
    ['Psalm 23', { book: 'Psalms', chapter: 23, startVerse: 1, endVerse: 6 }],
    ['John 3:16', { book: 'John', chapter: 3, startVerse: 16 }],
    ['Genesis 1:1-5', { book: 'Genesis', chapter: 1, startVerse: 1, endVerse: 5 }],
    ['Daniel 6:16-22', { book: 'Daniel', chapter: 6, startVerse: 16, endVerse: 22 }],
  ],
  verse: [
    ['Jeremiah 29:11', { book: 'Jeremiah', chapter: 29, startVerse: 11 }],
    ['Philippians 4:13', { book: 'Philippians', chapter: 4, startVerse: 13 }],
    ['Proverbs 3:5', { book: 'Proverbs', chapter: 3, startVerse: 5 }],
    ['Joshua 1:9', { book: 'Joshua', chapter: 1, startVerse: 9 }],
  ],
};
// Loader quotes (bundle `EO`).
const QUOTES: [string, string][] = [
  ['But they that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles.', 'Isaiah 40:31'],
  ['For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you.', 'Jeremiah 29:11'],
  ['Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you.', 'Joshua 1:9'],
  ['He makes everything beautiful in its time.', 'Ecclesiastes 3:11'],
  ['I can do all things through Christ who strengthens me.', 'Philippians 4:13'],
  ['The Lord is my shepherd; I shall not want.', 'Psalm 23:1'],
  ['Be still, and know that I am God.', 'Psalm 46:10'],
  ['Trust in the Lord with all your heart and lean not on your own understanding.', 'Proverbs 3:5'],
  ['Let your light shine before others, that they may see your good deeds and glorify your Father in heaven.', 'Matthew 5:16'],
];
const gen = () => import('../lib/generate.ts');
const digits = (v: string) => v.replace(/\D/g, '').slice(0, 3);

function NumberField({ label, value, onChange, allowEmpty }: { label: string; value?: number; onChange: (n?: number) => void; allowEmpty?: boolean }) {
  const [text, setText] = useState(value ? String(value) : '');
  useEffect(() => setText(value ? String(value) : ''), [value]);
  return (
    <label className="block">
      <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</span>
      <input inputMode="numeric" pattern="[0-9]*" value={text} placeholder={allowEmpty ? '—' : '1'}
        onChange={(e) => setText(digits(e.target.value))}
        onBlur={() => { const n = Number(text); onChange(n > 0 ? n : allowEmpty ? undefined : 1); }}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white font-bold text-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400" />
    </label>
  );
}

function BookPicker({ value, onChange }: { value: string; onChange: (b: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const books = BIBLE_BOOKS.filter((b) => b.toLowerCase().includes(q.toLowerCase()));
  const pick = (b: string) => { onChange(b); setQ(''); setOpen(false); };
  return (
    <div className="relative" ref={box}>
      <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Book</span>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="listbox"
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-white font-bold text-lg text-gray-800 hover:border-purple-300">
        {value}<ChevronDown className="w-5 h-5 text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-100 max-h-[400px] flex flex-col">
          <div className="p-2 border-b border-gray-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400 ml-2" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search book..." aria-label="Search book"
              onKeyDown={(e) => { if (e.key === 'Enter' && books[0]) { e.preventDefault(); pick(books[0]); } if (e.key === 'Escape') setOpen(false); }}
              className="flex-1 px-2 py-2 text-sm focus:outline-none" />
          </div>
          <ul role="listbox" className="overflow-y-auto p-1">
            {books.length === 0 && <li className="px-4 py-3 text-sm text-gray-400">No books found</li>}
            {books.map((b) => (
              <li key={b} role="option" aria-selected={b === value}>
                <button type="button" onClick={() => pick(b)}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-50 ${b === value ? 'text-[#7C3AED] font-bold' : 'text-gray-700'}`}>
                  {b}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Loader({ status }: { status: string }) {
  const [quote, setQuote] = useState(0);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const q = setInterval(() => setQuote((n) => (n + 1) % QUOTES.length), 8000);
    const p = setInterval(() => setProgress((n) => (n >= 95 ? 95 : n + Math.random() * 1.5)), 500);
    return () => { clearInterval(q); clearInterval(p); };
  }, []);
  const Icon = /reading/i.test(status) ? BookOpen : /sketching/i.test(status) ? PencilLine : Sparkles;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#FFF7ED]/95 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="max-w-2xl w-full flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center mb-8"><Icon className="w-12 h-12 text-[#7C3AED] animate-pulse" /></div>
        <h2 className="font-display text-3xl font-bold text-gray-800 mb-6">{status}</h2>
        <div className="w-full max-w-md h-3 bg-purple-100 rounded-full overflow-hidden mb-10">
          <div className="h-full bg-[#7C3AED] transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <blockquote className="bg-white rounded-2xl shadow-sm border border-purple-50 p-6 max-w-lg">
          <p className="text-lg text-gray-700 italic">“{QUOTES[quote][0]}”</p>
          <footer className="mt-3 text-sm font-bold text-[#7C3AED]">{QUOTES[quote][1]}</footer>
        </blockquote>
        <p className="mt-6 text-sm text-gray-500">This takes about a minute. If you close this page, it still finishes and waits for you in My Gallery.</p>
      </div>
    </div>
  );
}

export default function Generator({ kind }: { kind: Kind }) {
  const user = useStore($user);
  const ready = useStore($authReady);
  const profile = useStore($profile);
  // A ?sketch=<id> link: show a placeholder, not the form, until the saved page is loaded (or can't be).
  const [opening, setOpening] = useState(false);
  const [ref, setRef] = useState<Ref>(kind === 'scene' ? { book: 'Daniel', chapter: 6, startVerse: 16 } : { book: 'Psalms', chapter: 23, startVerse: 1 });
  const [age, setAge] = useState<string>('Young Child');
  const [style, setStyle] = useState('Sunday School');
  const [font, setFont] = useState('Elegant Script');
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<Sketch | null>(null);
  const [tooLong, setTooLong] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  // Email links open the form filled in (docs/email-marketing-plan.md §6.6): ?book=&chapter=&verse=&to=&age=&style=
  // (or &font= for verse art). Filling in never generates: a click must never spend a credit.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const book = q.get('book');
    if (!book || !BIBLE_BOOKS.includes(book)) return;
    const n = (k: string) => { const v = Number(q.get(k)); return Number.isInteger(v) && v > 0 && v < 200 ? v : undefined; };
    const startVerse = n('verse') ?? 1;
    const endVerse = n('to');
    setRef({ book, chapter: n('chapter') ?? 1, startVerse, ...(kind === 'scene' && endVerse && endVerse > startVerse ? { endVerse } : {}) });
    const a = q.get('age') ?? '';
    if (STYLES_BY_AGE[a]) {
      setAge(a);
      setStyle(STYLES_BY_AGE[a].includes(q.get('style') ?? '') ? q.get('style')! : STYLES_BY_AGE[a][0]);
    }
    const f = q.get('font');
    if (f && FONTS.some(([name]) => name === f)) setFont(f);
  }, []);

  const show = (s: Sketch, fresh: boolean) => {
    setResult(s);
    history.replaceState(null, '', `${location.pathname}?sketch=${encodeURIComponent(s.id)}`);
    scrollTo({ top: 0, behavior: 'smooth' });
    if (fresh) { setCelebrate(true); setTimeout(() => setCelebrate(false), 4000); }
  };
  // The page's hero, example and community grid hide while a result is shown (global.css).
  useEffect(() => { document.body.toggleAttribute('data-result', Boolean(result || opening)); }, [result, opening]);
  useEffect(() => { if (new URLSearchParams(location.search).has('sketch')) setOpening(true); }, []);
  // The page's early "opening" mark (inline script) goes once the island shows its placeholder or the result.
  const settle = () => document.documentElement.removeAttribute('data-opening');
  useEffect(() => { if (opening || result) settle(); }, [opening, result]);
  useEffect(() => { if (ready && !user) { setOpening(false); settle(); } }, [ready, user]);
  const back = () => {
    setResult(null);
    history.replaceState(null, '', location.pathname);
  };

  const finish = async (p: Promise<import('../lib/generate.ts').GenResult>) => {
    const m = await gen();
    try {
      const r = await p;
      if (r.status === 'done') {
        const s = await m.loadSketch(r.sketchId);
        if (s) show(s, true);
      } else if (r.status === 'refunded') {
        if (r.error === 'VERSE_TOO_LONG') setTooLong(true);
        else m.showRefund(r.error);
      }
    } catch (e) {
      m.showGenerationError(e, kind === 'verse' ? 'generate verse art' : 'generate a coloring page');
    } finally {
      setStatus(null);
      settle();
    }
  };

  // Once signed in: reopen ?sketch=<id>, or pick up a generation this browser started and never heard back from.
  useEffect(() => {
    if (!user) return;
    const id = new URLSearchParams(location.search).get('sketch');
    gen().then((m) => {
      const pending = m.pendingGeneration();
      if (pending && (pending.data.kind === kind || pending.fn === 'editSketch')) {
        setOpening(false);
        setStatus('Finishing your coloring page...');
        const p = m.resumeGeneration();
        if (p) finish(p);
      } else if (id) {
        m.loadSketch(id).then((s) => s && s.userId === user.uid && show(s, false)).catch(() => {}).finally(() => { setOpening(false); settle(); });
      }
    });
  }, [user?.uid]);

  const create = () => requireAuth(async () => {
    const m = await gen();
    if (($profile.get()?.credits ?? 0) < 1) return m.showOutOfCredits(kind === 'verse' ? 'generate verse art' : 'generate a coloring page');
    setTooLong(false);
    setStatus(kind === 'verse' ? 'Creating verse art...' : 'Reading the Bible...');
    if (kind === 'scene') setTimeout(() => setStatus((s) => (s ? 'Sketching the scene...' : s)), 15000);
    const base = { book: ref.book, chapter: ref.chapter, startVerse: ref.startVerse };
    finish(m.createSketch(kind === 'scene'
      ? { kind, ...base, ...(ref.endVerse && ref.endVerse > ref.startVerse ? { endVerse: ref.endVerse } : {}), age, style }
      : { kind, ...base, font }));
  }, 'signup');

  if (opening && !result) {
    return (
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 flex flex-col items-center gap-4" role="status">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-[#7C3AED] rounded-full animate-spin" />
        <p className="font-bold text-gray-600">Opening your coloring page...</p>
      </div>
    );
  }
  if (result) {
    return (
      <div className="relative">
        {celebrate && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-white rounded-full shadow-xl border border-purple-100 px-6 py-3 font-bold text-[#7C3AED] pointer-events-none" role="status">
            ✨ Your creation is ready! ✨
          </div>
        )}
        <button type="button" onClick={back} className="inline-flex items-center gap-2 text-gray-500 hover:text-[#7C3AED] font-bold mb-6">
          <span className="p-2 bg-white rounded-full shadow-sm border border-gray-100"><ArrowLeft className="w-5 h-5" /></span>Try another scripture
        </button>
        <SketchOwnerView sketch={result} onSwitch={(s) => show(s, true)}
          onChange={(patch) => setResult((r) => (r ? { ...r, ...patch } : r))} onDelete={back} />
      </div>
    );
  }

  const styles = STYLES_BY_AGE[age];
  return (
    <>
      {status && <Loader status={status} />}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-8 space-y-6">
        <div>
          <p className="font-bold text-gray-800 mb-3">{kind === 'verse' ? 'Select a Verse' : 'Choose a Bible Passage'}</p>
          <div className={`grid gap-3 ${kind === 'verse' ? 'grid-cols-[2fr_1fr_1fr]' : 'grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr]'}`}>
            <div className={kind === 'verse' ? '' : 'col-span-2 md:col-span-1'}><BookPicker value={ref.book} onChange={(book) => setRef({ ...ref, book })} /></div>
            <NumberField label="Chapter" value={ref.chapter} onChange={(n) => setRef({ ...ref, chapter: n ?? 1 })} />
            <NumberField label={kind === 'verse' ? 'Verse' : 'From Verse'} value={ref.startVerse} onChange={(n) => setRef({ ...ref, startVerse: n ?? 1 })} />
            {kind === 'scene' && <NumberField label="To Verse" value={ref.endVerse} allowEmpty onChange={(n) => setRef({ ...ref, endVerse: n })} />}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-sm font-bold text-gray-400">{kind === 'verse' ? 'Popular:' : 'Try:'}</span>
            {TRY[kind].map(([label, r]) => (
              <button key={label} type="button" onClick={() => setRef(r)} className="text-sm font-medium px-3 py-1 rounded-full bg-purple-50 text-[#7C3AED] hover:bg-purple-100">{label}</button>
            ))}
          </div>
        </div>

        {tooLong && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4" role="alert">
            <p className="font-bold text-amber-800">Verse Too Long</p>
            <p className="text-sm text-amber-700">This verse is too long. Please choose a shorter verse (under 30 words) for best results. Your credit was refunded.</p>
          </div>
        )}

        {kind === 'scene' ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="complexity" className="font-bold text-gray-800">Complexity Level: <span className="text-[#7C3AED]">{age}</span></label>
              <input id="complexity" type="range" min={0} max={3} step={1} value={AGES.indexOf(age as typeof AGES[number])} aria-valuetext={age}
                onChange={(e) => {
                  const next = AGES[Number(e.target.value)];
                  setAge(next);
                  if (!STYLES_BY_AGE[next].includes(style)) setStyle(STYLES_BY_AGE[next][0]);
                }}
                className="w-full mt-2 accent-[#7C3AED]" />
              <div className="flex justify-between text-xs font-bold text-gray-400">{AGES.map((a) => <span key={a}>{a}</span>)}</div>
            </div>
            <div>
              <p className="font-bold text-gray-800 mb-2">Art Style</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Art style">
                {styles.map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={style === s} onClick={() => setStyle(s)}
                    className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${style === s ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="font-bold text-gray-800 mb-2">Choose Font Style</p>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Font style">
              {FONTS.map(([name, hint]) => (
                <button key={name} type="button" role="radio" aria-checked={font === name} aria-label={`${name}: ${hint}`} onClick={() => setFont(name)}
                  className={`relative text-left p-4 rounded-2xl border-2 transition-all ${font === name ? 'border-[#7C3AED] bg-purple-50' : 'border-gray-100 bg-white hover:border-purple-200'}`}>
                  {font === name && <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#FCD34D] flex items-center justify-center"><Check className="w-4 h-4 text-purple-900" /></span>}
                  <span className="block font-bold text-gray-800">{name}</span>
                  <span className="block text-xs text-gray-500">{hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!user && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
            <p className="font-bold text-amber-800">🎁 Get 5 free credits when you sign up</p>
            <p className="text-sm text-amber-700">No credit card required</p>
          </div>
        )}
        <div>
          <Button size="lg" className="w-full gap-2" onClick={create} isLoading={Boolean(status)}>
            <Sparkles className="w-5 h-5" />{status ? (kind === 'verse' ? 'Creating...' : 'Generating...') : kind === 'verse' ? 'Create Verse Art' : 'Create Coloring Page'}
          </Button>
          <p className="text-center text-sm text-gray-400 mt-3">
            Uses 1 credit • Takes ~60 seconds
            {user && profile && <> • <a href="/pricing" className="underline hover:text-[#7C3AED]">You have {profile.credits ?? 0} credit{profile.credits === 1 ? '' : 's'}</a></>}
          </p>
        </div>
      </div>
    </>
  );
}
