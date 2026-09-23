// The bundle's compact tag picker (`fS` with compact): one toggle chip per liturgical tag.
import { TAG_LABELS } from '../lib/sketch.ts';

export default function TagPicker({ selected, onChange }: { selected: string[]; onChange: (tags: string[]) => void }) {
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((t) => t !== id) : [...selected, id]);
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(TAG_LABELS).map(([id, label]) => (
        <button key={id} type="button" onClick={() => toggle(id)} aria-pressed={selected.includes(id)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selected.includes(id) ? 'bg-[#7C3AED] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-purple-50 hover:text-[#7C3AED]'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}
