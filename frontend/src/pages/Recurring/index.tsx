import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function Recurring() {
  const [items, setItems] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ account_id: '', type: 'DESPESA', amount: '', description: '', category_id: '', payee_id: '', interval_unit: 'month', interval_count: 1, next_run: new Date().toISOString().slice(0,10) });
  const load = async () => { const r = await api.get('/api/v1/recurring'); setItems(r.data.data || []); };
  useEffect(() => { load(); (async()=>{ const a=await api.get('/api/v1/accounts'); setAccounts(a.data.data||[]); })(); }, []);
  const save = async (e: React.FormEvent) => { e.preventDefault(); const body={...form, amount: Number(form.amount||0)}; await api.post('/api/v1/recurring', body); setForm({...form, amount:'', description:''}); await load(); };
  const del = async (id: number) => { await api.delete('/api/v1/recurring', { params: { id } }); await load(); };
  const run = async () => { await api.post('/api/v1/recurring/run'); await load(); };
  return (
    <div className="p-4 text-[color:var(--text)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="heading text-2xl">Recorrências</h1>
        <button onClick={run} type="button" className="btn-primary text-sm">Executar agora</button>
      </div>
      <form onSubmit={save} className="grid md:grid-cols-2 gap-2 mb-4 items-center">
        <select value={form.account_id} onChange={(e)=>setForm({...form, account_id: Number(e.target.value)})} className="input px-2 py-1 text-sm" required>
          <option value="">Conta…</option>{accounts.map((a:any)=>(<option key={a.id} value={a.id}>{a.name}</option>))}
        </select>
        <select value={form.type} onChange={(e)=>setForm({...form, type: e.target.value})} className="input px-2 py-1 text-sm">
          <option value="DESPESA">Despesa</option>
          <option value="RECEITA">Receita</option>
        </select>
        <input inputMode="decimal" value={form.amount} onChange={(e)=>setForm({...form, amount: e.target.value})} placeholder="Valor" className="input px-2 py-1 text-sm" />
        <input value={form.description} onChange={(e)=>setForm({...form, description: e.target.value})} placeholder="Descrição" className="input px-2 py-1 text-sm" />
        <select value={form.interval_unit} onChange={(e)=>setForm({...form, interval_unit: e.target.value})} className="input px-2 py-1 text-sm">
          <option value="day">Diário</option>
          <option value="week">Semanal</option>
          <option value="month">Mensal</option>
        </select>
        <input type="number" min={1} value={form.interval_count} onChange={(e)=>setForm({...form, interval_count: Number(e.target.value)})} className="input px-2 py-1 text-sm" />
        <input type="date" value={form.next_run} onChange={(e)=>setForm({...form, next_run: e.target.value})} className="input px-2 py-1 text-sm" />
        <button className="btn-primary text-sm">Salvar</button>
      </form>
      <div className="overflow-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead><tr className="text-left"><th className="p-2">Conta</th><th className="p-2">Tipo</th><th className="p-2">Valor</th><th className="p-2">Próx. Execução</th><th className="p-2">Intervalo</th><th></th></tr></thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.account_id}</td>
                <td className="p-2">{r.type}</td>
                <td className="p-2">{Number(r.amount).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                <td className="p-2">{r.next_run}</td>
                <td className="p-2">{r.interval_count} {r.interval_unit}</td>
                <td className="p-2 text-right"><button onClick={()=>del(r.id)} className="text-red-600 hover:underline">Excluir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
