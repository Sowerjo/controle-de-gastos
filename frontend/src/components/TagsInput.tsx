import React from 'react';
import api from '../services/api';

type Tag = { id: number; name: string };

export default function TagsInput({ value, onChange }: { value: Tag[]; onChange: (tags: Tag[]) => void }) {
  const [query, setQuery] = React.useState('');
  const [all, setAll] = React.useState<Tag[]>([]);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try { const r = await api.get('/api/v1/tags'); setAll(r.data.data || []); } catch {}
    })();
  }, []);

  const addByName = (name: string) => {
    const trimmed = name.trim(); if (!trimmed) return;
    const ex = all.find(t => t.name.toLowerCase() === trimmed.toLowerCase());
    const tag = ex || { id: 0, name: trimmed } as Tag;
    if (!value.some(v => v.name.toLowerCase() === tag.name.toLowerCase())) onChange([...value, tag]);
    setQuery(''); setOpen(false);
  };

  const remove = (name: string) => onChange(value.filter(v => v.name !== name));

  const filtered = query ? all.filter(t => t.name.toLowerCase().includes(query.toLowerCase()) && !value.some(v => v.name.toLowerCase() === t.name.toLowerCase())) : [];

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {value.map(t => (
        <span key={t.name} className="px-2 py-1 rounded-full bg-white/10 text-xs">
          {t.name}
          <button type="button" className="ml-1 text-[10px] text-red-300" onClick={() => remove(t.name)}>×</button>
        </span>
      ))}
      <div className="relative">
        <input
          className="input px-2 py-1 text-sm"
          placeholder="Adicionar tag"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) { e.preventDefault(); addByName(query); }
            if (e.key === 'Escape') setOpen(false);
          }}
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-20 mt-1 w-48 surface-2 border border-white/10 rounded shadow-lg">
            {filtered.map(t => (
              <div key={t.id} className="px-2 py-1 text-sm hover:bg-white/5 cursor-pointer" onClick={() => addByName(t.name)}>{t.name}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
