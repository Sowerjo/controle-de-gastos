import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { fmtCurrency } from '../../utils/format';

export default function Budgets() {
  const [items, setItems] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [cats, setCats] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [rollover, setRollover] = useState<boolean>(() => sessionStorage.getItem('budgetRollover') === '1');
  const load = async () => { 
    try {
      const r = await api.get('/api/v1/budgets', { params: { month: month+'-01' } }); 
      setItems(r.data.data || []); 
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
    }
  };
  useEffect(() => { 
    (async () => { 
      try {
        const c = await api.get('/api/v1/categories'); 
        setCats(c.data.data || []); 
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
      }
    })(); 
  }, []);
  useEffect(() => { load(); }, [month]);
  const save = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if(!categoryId) return; 
    try {
      await api.post('/api/v1/budgets', { categoryId, month: month+'-01', amount: Number(amount||0) }); 
      setCategoryId(''); 
      setAmount(''); 
      await load(); 
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
      alert('Erro ao salvar orçamento. Tente novamente.');
    }
  };
  const del = async (id: number) => { 
    try {
      await api.delete('/api/v1/budgets', { params: { id } }); 
      await load(); 
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      alert('Erro ao excluir orçamento. Tente novamente.');
    }
  };
  useEffect(() => { sessionStorage.setItem('budgetRollover', rollover ? '1' : '0'); }, [rollover]);

  const spentByCat = useSpentByCategory(month);
  const heatClass = (catId: number) => {
    const spent = spentByCat[catId] || 0;
    const budget = Number(items.find(i => i.category_id === catId)?.amount || 0);
    const base = budget > 0 ? (spent / budget) : 0;
    if (base < 0.8) return 'bg-emerald-500/10';
    if (base <= 1) return 'bg-amber-500/10';
    return 'bg-red-500/10';
  };

  const updateInline = async (id: number, amt: number) => {
    const it = items.find(i => i.id === id); 
    if (!it) return;
    try {
      await api.post('/api/v1/budgets', { categoryId: it.category_id, month: it.month, amount: amt });
      await load();
    } catch (error) {
      console.error('Erro ao atualizar orçamento:', error);
      alert('Erro ao atualizar orçamento. Tente novamente.');
      await load(); // Recarrega para restaurar o valor original
    }
  };
  return (
    <div className="p-4">
      <h1 className="heading text-2xl mb-4">Orçamentos</h1>
      <div className="flex items-center gap-2 mb-4">
        <label>Mês: <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input px-2 py-1 ml-1" /></label>
      </div>
      <form onSubmit={save} className="flex gap-2 mb-4 items-center">
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value? Number(e.target.value): '')} className="input px-2 py-1">
          <option value="">Categoria…</option>
          {cats.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor" className="input px-2 py-1 tnum" />
        <button className="btn-primary">Salvar</button>
      </form>
      <div className="overflow-auto card">
        <table className="min-w-[480px] w-full text-sm">
          <thead><tr className="text-left"><th className="p-2">Categoria</th><th className="p-2">Orçado</th><th className="p-2">Gasto</th><th className="p-2">% do orçamento</th><th className="p-2">Rollover</th><th></th></tr></thead>
          <tbody>
            {items.map((b) => {
              const spent = spentByCat[b.category_id] || 0;
              const ratio = Number(b.amount||0) > 0 ? (spent / Number(b.amount)) : 0;
              return (
                <tr key={b.id} className={`border-t border-white/5 ${heatClass(b.category_id)}`}>
                  <td className="p-2">{b.category}</td>
                  <td className="p-2 tnum">
                    <InlineMoney value={Number(b.amount||0)} onChange={(v) => updateInline(b.id, v)} />
                  </td>
                  <td className="p-2 tnum">{fmtCurrency(spent)}</td>
                  <td className="p-2">{(ratio*100).toFixed(0)}%</td>
                  <td className="p-2"><input type="checkbox" checked={rollover} onChange={(e) => setRollover(e.target.checked)} /></td>
                  <td className="p-2 text-right"><button onClick={() => del(b.id)} className="text-red-400 hover:text-red-300">Excluir</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InlineMoney({ value, onChange }: { value: number; onChange: (v: number) => void }){
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));
  useEffect(() => setVal(String(value)), [value]);
  return editing ? (
    <span>
      <input className="input px-1 py-0.5 tnum w-24" value={val} onChange={(e)=>setVal(e.target.value)} onBlur={()=>{ setEditing(false); onChange(Number(val||0)); }} onKeyDown={(e)=>{ if(e.key==='Enter'){ setEditing(false); onChange(Number(val||0)); } if(e.key==='Escape'){ setEditing(false); setVal(String(value)); } }} autoFocus />
    </span>
  ) : (
    <span className="cursor-text" onClick={()=>setEditing(true)}>{fmtCurrency(value)}</span>
  );
}

function useSpentByCategory(month: string){
  const [map, setMap] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => { 
    (async () => {
      // approximate: use report by category for month
      setIsLoading(true);
      try {
        const from = month+'-01'; 
        const to = new Date(new Date(from).getFullYear(), new Date(from).getMonth()+1, 0).toISOString().slice(0,10);
        
        // Obter relatórios por categoria
        const r = await api.get('/api/v1/reports/by-category', { params: { from, to } });
        const rows: any[] = r.data.data || [];
        
        // Obter categorias para mapear IDs
        const cats = await api.get('/api/v1/categories');
        const catIdx: Record<string, number> = {};
        (cats.data.data||[]).forEach((c: any) => { catIdx[c.name] = c.id; });
        
        // Calcular gastos por categoria
        const m: Record<number, number> = {};
        for (const row of rows) {
          const isExpense = (row.type || row.tipo) === 'DESPESA';
          if (!isExpense) continue;
          const id = catIdx[row.name || ''] || 0; 
          if (!id) continue;
          m[id] = (m[id] || 0) + Number(row.total||0);
        }
        setMap(m);
      } catch (error) { 
        console.error('Erro ao carregar gastos por categoria:', error);
        setMap({}); 
      } finally {
        setIsLoading(false);
      }
    })(); 
  }, [month]);
  
  return map;
}
