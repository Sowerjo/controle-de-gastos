import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { fmtCurrency, monthRange } from '../../utils/format';
import Donut from '../../components/Donut';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const { from, to } = monthRange();
  const [month, setMonth] = useState(from.slice(0,7));
  const [budgets, setBudgets] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [catData, setCatData] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
  const res = await api.get('/api/v1/dashboard/summary', { params: { from, to } });
        setSummary(res.data.data);
  // preload categories for donut navigation mapping
  try { const c = await api.get('/api/v1/categories'); (window as any).__CATS = c.data.data || []; } catch {}
  const b = await api.get('/api/v1/budgets', { params: { month: month+'-01' } });
  setBudgets(b.data.data || []);
  const g = await api.get('/api/v1/goals');
  setGoals(g.data.data || []);
  // reports by category (despesas) for donut
  const r = await api.get('/api/v1/reports/by-category', { params: { from, to } });
  const rows: any[] = r.data.data || [];
  const onlyExpenses = rows.filter(x => (x.type || x.tipo) === 'DESPESA');
  setCatData(onlyExpenses.map(x => ({ label: x.name || 'Sem categoria', value: Number(x.total || 0) })));
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [from, to, month]);

  return (
    <div className="p-4">
      <h1 className="heading text-2xl mb-4">Dashboard</h1>
      {loading ? (
        <div>Carregando…</div>
      ) : summary ? (
        <>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <Card title="Saldo atual" value={fmtCurrency(summary.saldo)} />
            <Card title="Receitas (mês)" value={fmtCurrency(summary.receitas ?? summary.totalReceitas ?? 0)} pos />
            <Card title="Despesas (mês)" value={fmtCurrency(summary.despesas ?? summary.totalDespesas ?? 0)} neg />
          </div>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="card p-4">
              <div className="text-sm text-[color:var(--text-dim)] mb-2">Gastos por categoria</div>
              <Donut data={catData} onSliceClick={(label) => {
                try {
                  const cats = (window as any).__CATS || [];
                  const found = cats.find((c: any) => (c.name || 'Sem categoria') === label);
                  const id = found?.id || '';
                  navigate(`/transactions?categoryId=${id}`);
                } catch {}
              }} />
            </div>
            <div className="card p-4">
              <div className="text-sm text-[color:var(--text-dim)] mb-2">Saldos por conta</div>
              <div className="overflow-auto">
                <table className="min-w-[480px] w-full text-sm">
                  <thead><tr className="text-left"><th className="p-2">Conta</th><th className="p-2">Saldo</th></tr></thead>
                  <tbody>
                    {(summary.accounts || []).map((a: any) => (
                      <tr key={a.id} className="border-t border-white/5"><td className="p-2">{a.name}</td><td className="p-2 tnum">{fmtCurrency(Number(a.balance||0))}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="mb-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold heading">Orçamentos ({month})</h2>
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input px-2 py-1 text-sm" />
              </div>
              <div className="overflow-auto card">
                <table className="min-w-[520px] w-full text-sm">
                  <thead><tr className="text-left"><th className="p-2">Categoria</th><th className="p-2">Orçado</th></tr></thead>
                  <tbody>
                    {budgets.map((b) => (
                      <tr key={b.id} className="border-t border-white/5"><td className="p-2">{b.category}</td><td className="p-2 tnum">{fmtCurrency(Number(b.amount||0))}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h2 className="font-semibold mb-2 heading">Metas</h2>
              <div className="space-y-2">
                {goals.map((g) => {
                  const prog=Math.min(100, Math.round(100*(Number(g.current_amount||0)/Number(g.target_amount||1))));
                  return (
                    <div key={g.id} className="card p-3">
                      <div className="flex justify-between text-sm"><span>{g.name}</span><span className="tnum">{fmtCurrency(g.current_amount)} / {fmtCurrency(g.target_amount)}</span></div>
                      <div className="h-2 rounded mt-2 bg-white/5">
                        <div className="h-2 rounded bg-gradient-to-r from-cyan-400 to-fuchsia-400" style={{ width: prog+'%' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          </div>
        </>
      ) : (
        <div>Sem dados.</div>
      )}
    </div>
  );
}

function Card({ title, value, pos, neg }: { title: string; value: string; pos?: boolean; neg?: boolean }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-[color:var(--text-dim)]">{title}</div>
      <div className="text-2xl font-semibold tnum mt-1" style={{ textShadow: '0 0 16px rgba(34,211,238,.08)' }}>
        <span className={pos ? 'text-[color:var(--pos)]' : neg ? 'text-[color:var(--neg)]' : ''}>{value}</span>
      </div>
    </div>
  );
}
