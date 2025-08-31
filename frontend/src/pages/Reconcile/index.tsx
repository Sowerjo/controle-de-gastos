import React from 'react';
import api from '../../services/api';
import { fmtCurrency } from '../../utils/format';

export default function Reconcile(){
  const [accountId, setAccountId] = React.useState<number | ''>('');
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [items, setItems] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState<Record<number, boolean>>({});

  React.useEffect(() => { (async () => { const a = await api.get('/api/v1/accounts'); setAccounts(a.data.data || []); if((a.data.data||[]).length) setAccountId(a.data.data[0].id); })(); }, []);
  React.useEffect(() => { load(); }, [accountId]);

  const load = async () => {
    if (!accountId) return;
    const r = await api.get('/api/v1/transactions', { params: { accountId } });
    setItems((r.data.data.items || []).slice(-200)); // latest 200
    setSelected({});
  };

  const toggle = (id: number) => setSelected(s => ({ ...s, [id]: !s[id] }));
  const finalize = async () => {
    const ids = Object.keys(selected).filter(k => selected[+k]).map(Number);
    if (!ids.length) return;
    await api.post('/api/v1/reconcile', { ids });
    await load();
  };

  const selectedTotal = items.filter(i => selected[i.id]).reduce((a, b) => a + (b.tipo==='receita' ? Number(b.valor) : -Number(b.valor)), 0);

  return (
    <div className="p-4">
      <h1 className="heading text-2xl mb-4">Conciliação</h1>
      <div className="flex items-center gap-2 mb-3">
        <select className="input px-2 py-1" value={accountId} onChange={(e)=> setAccountId(Number(e.target.value))}>
          {accounts.map((a)=> (<option key={a.id} value={a.id}>{a.name}</option>))}
        </select>
        <button className="px-3 py-1 rounded border border-white/10" onClick={load}>Atualizar</button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-3">
          <div className="text-sm text-[color:var(--text-dim)] mb-2">Lançamentos</div>
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left"><th className="p-2">Sel</th><th className="p-2">Data</th><th className="p-2">Descrição</th><th className="p-2 text-right">Valor</th></tr></thead>
              <tbody>
                {items.map((t)=> (
                  <tr key={t.id} className="border-t border-white/5">
                    <td className="p-2"><input type="checkbox" checked={!!selected[t.id]} onChange={()=> toggle(t.id)} /></td>
                    <td className="p-2">{new Date(t.data).toISOString().slice(0,10)}</td>
                    <td className="p-2">{t.descricao || '-'}</td>
                    <td className="p-2 tnum text-right" style={{color: t.tipo==='receita' ? 'var(--pos)' : 'var(--neg)'}}>{fmtCurrency(Number(t.valor))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card p-3">
          <div className="text-sm text-[color:var(--text-dim)] mb-2">Resumo</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Itens marcados</span><span>{Object.values(selected).filter(Boolean).length}</span></div>
            <div className="flex justify-between"><span>Total selecionado</span><span className="tnum">{fmtCurrency(selectedTotal)}</span></div>
            <div className="pt-2"><button className="btn-primary" onClick={finalize}>Finalizar conciliação</button></div>
          </div>
        </div>
      </div>
    </div>
  );
}
