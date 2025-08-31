import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

type Row = { name: string; type: 'RECEITA'|'DESPESA'; total: number };

export default function Reports() {
  const [tab, setTab] = useState<'category'|'payee'|'tag'>('category');
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10));
  const [to, setTo] = useState(new Date().toISOString().slice(0,10));
  const [rows, setRows] = useState<Row[]>([]);
  const load = async () => {
    const url = tab==='category' ? '/api/v1/reports/by-category' : tab==='payee' ? '/api/v1/reports/by-payee' : '/api/v1/reports/by-tag';
    const r = await api.get(url, { params: { from, to } });
    const data = (r.data.data || []).map((x: any) => ({ name: x.name, type: x.type, total: Number(x.total||0) }));
    setRows(data);
  };
  useEffect(() => { load(); }, [tab, from, to]);

  const names = useMemo(() => Array.from(new Set(rows.map(r => r.name||'(Sem)'))), [rows]);
  const sum = (name: string, type: 'RECEITA'|'DESPESA') => rows.filter(r => (r.name||'(Sem)')===name && r.type===type).reduce((a,b)=>a+b.total,0);
  const max = useMemo(() => Math.max(1, ...names.map(n => sum(n,'RECEITA')+sum(n,'DESPESA'))), [names, rows]);

  return (
    <div className="p-4 text-[color:var(--text)]">
      <h1 className="heading text-2xl mb-4">Relatórios</h1>
      <div className="flex flex-wrap gap-2 mb-4 items-center text-sm">
        <button
          onClick={() => setTab('category')}
          className={`px-3 py-1 rounded-[12px] ${tab==='category' ? 'bg-gradient-to-tr from-cyan-400 to-fuchsia-400 text-[#0b0f1a] shadow-glow' : 'border border-white/5 bg-[color:var(--surf-1)] text-white hover:border-white/10'}`}
        >
          Categorias
        </button>
        <button
          onClick={() => setTab('payee')}
          className={`px-3 py-1 rounded-[12px] ${tab==='payee' ? 'bg-gradient-to-tr from-cyan-400 to-fuchsia-400 text-[#0b0f1a] shadow-glow' : 'border border-white/5 bg-[color:var(--surf-1)] text-white hover:border-white/10'}`}
        >
          Favorecidos
        </button>
        <button
          onClick={() => setTab('tag')}
          className={`px-3 py-1 rounded-[12px] ${tab==='tag' ? 'bg-gradient-to-tr from-cyan-400 to-fuchsia-400 text-[#0b0f1a] shadow-glow' : 'border border-white/5 bg-[color:var(--surf-1)] text-white hover:border-white/10'}`}
        >
          Tags
        </button>
        <div className="ml-auto flex gap-2">
          <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="input px-2 py-1 text-sm" />
          <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="input px-2 py-1 text-sm" />
        </div>
      </div>

      {/* Mobile list */}
      <div className="md:hidden space-y-2">
        {names.map((n) => {
          const rec = sum(n,'RECEITA'); const des = sum(n,'DESPESA'); const tot = rec+des;
          const recPct = tot>0 ? Math.round((rec/tot)*100) : 0; const desPct = 100 - recPct;
          return (
            <div key={n} className="surface-2 rounded-lg p-3 border border-white/5">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium truncate">{n}</div>
                <div className="text-sm tnum">{tot.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div>
              </div>
              <div className="h-2 rounded mt-2 bg-white/5 flex overflow-hidden">
                <div className="h-2 bg-green-600" style={{width: `${recPct}%`}} />
                <div className="h-2 bg-rose-600" style={{width: `${desPct}%`}} />
              </div>
              <div className="text-[11px] text-[color:var(--text-dim)] mt-1">Receitas {recPct}% • Despesas {desPct}%</div>
            </div>
          );
        })}
      </div>

      {/* Desktop chart */}
      <div className="hidden md:block overflow-auto">
        <svg
          width="100%"
          height={Math.max(120, names.length*28)}
          viewBox={`0 0 800 ${Math.max(120, names.length*28)}`}
          className="border border-white/5 rounded bg-[color:var(--surf-1)]"
        >
          {names.map((n, i) => {
            const y = 24 + i*24;
            const rec = sum(n,'RECEITA');
            const des = sum(n,'DESPESA');
            const tot = rec + des;
            const barW = (tot/max) * 760;
            const recW = tot > 0 ? (rec/tot) * barW : 0;
            const desW = Math.max(0, barW - recW);
            return (
              <g key={n} transform={`translate(20, ${y})`}>
                <text x={0} y={0} dy={8} fontSize={12} fill="currentColor">{n}</text>
                <rect x={200} y={-8} width={barW} height={16} fill="currentColor" fillOpacity={0.12} />
                <rect x={200} y={-8} width={recW} height={16} fill="#16a34a" />
                <rect x={200+recW} y={-8} width={desW} height={16} fill="#dc2626" />
                <text x={200+barW+6} y={0} dy={4} fontSize={12} fill="currentColor">{(tot).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
