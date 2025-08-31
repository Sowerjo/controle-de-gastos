import React from 'react';
import api from '../services/api';

export default function PayeeAutocomplete({ value, onChange }: { value: string; onChange: (v: string) => void }){
  const [all, setAll] = React.useState<any[]>([]);
  React.useEffect(() => { (async () => { try { const r = await api.get('/api/v1/payees'); setAll(r.data.data || []); } catch {} })(); }, []);
  const filtered = value ? all.filter((p:any) => p.name.toLowerCase().includes(value.toLowerCase())).slice(0,8) : [];
  return (
    <div className="relative">
      <input className="input px-2 py-2" value={value} onChange={(e)=> onChange(e.target.value)} placeholder="Favorecido" />
      {value && filtered.length>0 && (
        <div className="absolute z-20 mt-1 w-full surface-2 border border-white/10 rounded shadow-lg max-h-48 overflow-auto">
          {filtered.map((p:any)=> (
            <div key={p.id} className="px-2 py-1 text-sm hover:bg-white/5 cursor-pointer" onClick={()=> onChange(p.name)}>{p.name}</div>
          ))}
        </div>
      )}
    </div>
  );
}
