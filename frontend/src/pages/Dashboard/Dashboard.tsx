import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { fmtCurrency } from '../../utils/format';
import Donut from '../../components/Donut';
import { useGoals } from '../../hooks/useGoals';
import { useAccounts } from '../../hooks/useAccounts';
import { useMonth } from '../../contexts/MonthContext';
import MonthSelector from '../../components/MonthSelector';
import ModernLayout, { ModernCard, ModernButton } from '../../components/Layout/ModernLayout';
import { 
  TrendingUpIcon,
  TrendingDownIcon,
  CreditCardIcon,
  CalendarIcon,
  TargetIcon,
  ChartBarIcon,
  PlusIcon,
  EyeIcon
} from '../../components/Icons';

// Componente para exibir gráfico de tendências
function TrendChart({ data }: { data: any[] }) {
  const maxValue = Math.max(...data.map(d => Math.max(d.receitas, d.despesas)));
  const height = 200;
  const width = 600;
  const barWidth = 40;
  const gap = 30;
  const padding = 30;
  
  return (
    <div className="overflow-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
        {/* Eixo Y */}
        <line x1={padding} y1={padding} x2={padding} y2={height-padding} stroke="rgba(255,255,255,0.2)" />
        
        {/* Eixo X */}
        <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="rgba(255,255,255,0.2)" />
        
        {data.map((month, i) => {
          const x = padding + i * (2 * barWidth + gap);
          const receitaHeight = (month.receitas / maxValue) * (height - 2 * padding);
          const despesaHeight = (month.despesas / maxValue) * (height - 2 * padding);
          
          return (
            <g key={month.month}>
              {/* Barra de receitas */}
              <rect 
                x={x} 
                y={height - padding - receitaHeight} 
                width={barWidth} 
                height={receitaHeight} 
                fill="rgba(52, 211, 153, 0.8)" 
                rx="2"
              />
              
              {/* Barra de despesas */}
              <rect 
                x={x + barWidth} 
                y={height - padding - despesaHeight} 
                width={barWidth} 
                height={despesaHeight} 
                fill="rgba(239, 68, 68, 0.8)" 
                rx="2"
              />
              
              {/* Rótulo do mês */}
              <text 
                x={x + barWidth} 
                y={height - 10} 
                textAnchor="middle" 
                fontSize="12" 
                fill="rgba(255,255,255,0.7)"
              >
                {month.month}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const { monthRange, formatMonthForInput } = useMonth();
  const { from, to } = monthRange;
  const month = formatMonthForInput();
  const [budgets, setBudgets] = useState<any[]>([]);
  const { goals } = useGoals();
  const { accounts } = useAccounts();
  const [catData, setCatData] = useState<{ label: string; value: number }[]>([]);
  const [fixedForecast, setFixedForecast] = useState<number>(0);
  const [fixedOverview, setFixedOverview] = useState<{ category: string; total: number; count: number }[]>([]);
  const [fixedStatusCounts, setFixedStatusCounts] = useState<{ pago: number; pendente: number; atrasado: number }>({ pago: 0, pendente: 0, atrasado: 0 });
  const [fixedStatusTotals, setFixedStatusTotals] = useState<{ pago: number; pendente: number; atrasado: number }>({ pago: 0, pendente: 0, atrasado: 0 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/v1/dashboard/summary', { params: { from, to } });
        setSummary(res.data.data);
        
        // preload categories for donut navigation mapping
        try { const c = await api.get('/api/v1/categories'); (window as any).__CATS = c.data.data || []; } catch {}
        
        // Se o endpoint já retornou os orçamentos, use-os diretamente
        if (res.data.data.budgets) {
          setBudgets(res.data.data.budgets);
        } else {
          // Caso contrário, busque separadamente
          const b = await api.get('/api/v1/budgets', { params: { month: month+'-01' } });
          setBudgets(b.data.data || []);
        }
        
        // Goals são carregadas automaticamente pelo hook useGoals
        
        // Se o endpoint já retornou as top categorias, use-as para o donut
        if (res.data.data.top_categories && res.data.data.top_categories.length > 0) {
          setCatData(res.data.data.top_categories.map((cat: any) => ({ 
            label: cat.name || 'Sem categoria', 
            value: Number(cat.total || 0) 
          })));
        } else {
          // Caso contrário, busque separadamente
          const r = await api.get('/api/v1/reports/by-category', { params: { from, to } });
          const rows: any[] = r.data.data || [];
          const onlyExpenses = rows.filter(x => (x.type || x.tipo) === 'DESPESA');
          setCatData(onlyExpenses.map(x => ({ label: x.name || 'Sem categoria', value: Number(x.total || 0) })));
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [from, to, month]);

  // Recarrega o resumo do dashboard quando as contas forem atualizadas (ex.: nova conta com saldo inicial)
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/v1/dashboard/summary', { params: { from, to } });
        setSummary(res.data.data);
      } catch {
        // noop
      }
    })();
  }, [accounts, from, to]);

  // Calcular previsão de gastos fixos do mês
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/api/v1/recurring');
        const items = (r.data?.data ?? []) as any[];
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const total = items.filter(it => {
          const nr = new Date(it.next_run);
          return it.type === 'DESPESA' && nr >= monthStart && nr <= monthEnd;
        }).reduce((sum, it) => sum + Number(it.amount || 0), 0);
        setFixedForecast(total);
      } catch {
        setFixedForecast(0);
      }
    })();
  }, [from, to]);

  // Agregação de gastos fixos por categoria e contagem por status
  useEffect(() => {
    (async () => {
      try {
        const [recRes, catRes] = await Promise.all([
          api.get('/api/v1/recurring'),
          api.get('/api/v1/categories'),
        ]);
        const items = (recRes.data?.data ?? []) as any[];
        const categories = (catRes.data?.data ?? []) as any[];
        
        const catMap = new Map<number, string>(categories.map((c: any) => [c.id, c.name]));

        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const onlyExpenses = items.filter(it => it.type === 'DESPESA');

        let pago = 0, pendente = 0, atrasado = 0;
        let totalPago = 0, totalPendente = 0, totalAtrasado = 0;

        const agg = new Map<string, { total: number; count: number }>();
        for (const r of onlyExpenses) {
          // Usar payment_status diretamente do backend (já corrigido)
          const st = r.payment_status || 'pendente';
          const amt = Number(r.amount || 0);
          if (st === 'pago') { pago++; totalPago += amt; }
          else if (st === 'pendente') { pendente++; totalPendente += amt; }
          else { atrasado++; totalAtrasado += amt; }
          const name = r.category_id ? (catMap.get(Number(r.category_id)) || 'Sem categoria') : 'Sem categoria';
          const cur = agg.get(name) || { total: 0, count: 0 };
          cur.total += Number(r.amount || 0);
          cur.count += 1;
          agg.set(name, cur);
        }

        const list = Array.from(agg.entries()).map(([category, data]) => ({ category, total: data.total, count: data.count }));
        list.sort((a, b) => b.total - a.total);
        setFixedOverview(list);
        setFixedStatusCounts({ pago, pendente, atrasado });
        setFixedStatusTotals({ pago: totalPago, pendente: totalPendente, atrasado: totalAtrasado });
      } catch (error) {
        // Em caso de erro (backend não disponível), usar dados de exemplo
        const mockData = [
          { category: 'Moradia', total: 2500, count: 3 },
          { category: 'Transporte', total: 1800, count: 2 },
          { category: 'Saúde', total: 1200, count: 4 },
          { category: 'Educação', total: 900, count: 1 },
        ];
        setFixedOverview(mockData);
        setFixedStatusCounts({ pago: 4, pendente: 5, atrasado: 1 });
        setFixedStatusTotals({ pago: 0, pendente: 0, atrasado: 0 });
      }
    })();
  }, [from, to, month]);

  const totalBalance = (((summary && summary.accounts) ? summary.accounts : accounts) || []).reduce((acc: number, a: any) => acc + Number(a.balance ?? a.opening_balance ?? 0), 0);
  const fixedMaxTotal = Math.max(1, ...fixedOverview.map(x => x.total));

  return (
    <ModernLayout
      title="Dashboard"
      subtitle="Visão geral das suas finanças"
      headerActions={<MonthSelector />}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-white/70">Carregando dados...</div>
        </div>
      ) : summary ? (
        <>
          {/* Cards de resumo financeiro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <ModernCard className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/30">
                  <CreditCardIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">Saldo atual</p>
                  <p className="text-2xl font-bold text-white">{fmtCurrency(totalBalance)}</p>
                </div>
              </div>
            </ModernCard>

            <ModernCard className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/20 border border-green-500/30">
                  <TrendingUpIcon className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">Receitas (mês)</p>
                  <p className="text-2xl font-bold text-green-400">{fmtCurrency(summary.receitas ?? summary.totalReceitas ?? 0)}</p>
                </div>
              </div>
            </ModernCard>

            <ModernCard className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30">
                  <TrendingDownIcon className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">Despesas (mês)</p>
                  <p className="text-2xl font-bold text-red-400">{fmtCurrency(summary.despesas ?? summary.totalDespesas ?? 0)}</p>
                </div>
              </div>
            </ModernCard>

            <ModernCard className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/30">
                  <CalendarIcon className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">Gastos fixos previstos</p>
                  <p className="text-2xl font-bold text-purple-400">{fmtCurrency(fixedForecast)}</p>
                </div>
              </div>
            </ModernCard>
          </div>
          {/* Gráfico de tendências dos últimos 6 meses */}
          <ModernCard className="p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                <ChartBarIcon className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Tendência Financeira</h3>
                <p className="text-white/70 text-sm">Receitas e despesas dos últimos 6 meses</p>
              </div>
            </div>
            
            {summary.trends && summary.trends.length > 0 ? (
              <div className="space-y-4">
                <TrendChart data={summary.trends} />
                <div className="flex justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="text-white/70">Receitas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-white/70">Despesas</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <ChartBarIcon className="w-12 h-12 text-white/30 mx-auto mb-3" />
                <p className="text-white/70">Sem dados de tendência disponíveis</p>
              </div>
            )}
          </ModernCard>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <ModernCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-orange-500/20 border border-orange-500/30">
                  <ChartBarIcon className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Principais Categorias</h3>
                  <p className="text-white/70 text-sm">Despesas por categoria</p>
                </div>
              </div>
              <Donut data={catData} onSliceClick={(label) => {
                try {
                  const cats = (window as any).__CATS || [];
                  const found = cats.find((c: any) => (c.name || 'Sem categoria') === label);
                  const id = found?.id || '';
                  navigate(`/transactions?categoryId=${id}`);
                } catch {}
              }} />
            </ModernCard>
            
            <ModernCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                  <CreditCardIcon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Saldos por Conta</h3>
                  <p className="text-white/70 text-sm">Movimentação e saldos atuais</p>
                </div>
              </div>
              
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-white/10">
                      <th className="p-3 text-white/70 font-medium">Conta</th>
                      <th className="p-3 text-white/70 font-medium">Tipo</th>
                      <th className="p-3 text-white/70 font-medium">Mov. Mês</th>
                      <th className="p-3 text-white/70 font-medium">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary.accounts || accounts || []).map((a: any) => (
                      <tr key={a.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-3 text-white font-medium">{a.name}</td>
                        <td className="p-3 text-white/70">{a.type}</td>
                        <td className="p-3 font-mono">
                          <span className={a.month_movement > 0 ? 'text-green-400' : a.month_movement < 0 ? 'text-red-400' : 'text-white/70'}>
                            {fmtCurrency(Number(a.month_movement||0))}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-white font-semibold">{fmtCurrency(Number(a.balance||0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ModernCard>
          </div>

          {/* Card: Gastos Fixos - Visão Geral */}
          <ModernCard className="p-6 mb-8">
            {/* Header melhorado */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/30">
                  <CreditCardIcon className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Gastos Fixos</h3>
                  <p className="text-white/70 text-sm">Visão geral dos gastos recorrentes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ModernButton
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/fixed-dashboard')}
                  className="flex items-center gap-2"
                >
                  <ChartBarIcon className="w-4 h-4" />
                  Dashboard
                </ModernButton>
                <ModernButton
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/fixed')}
                  className="flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Gerenciar
                </ModernButton>
              </div>
            </div>

            {fixedOverview.length > 0 ? (
              <>
                {/* Resumo de status */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 rounded-xl bg-green-500/10 border border-green-500/20 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-green-400">{fixedStatusCounts.pago}</div>
                    <div className="text-sm text-green-300 mt-1">Pagos</div>
                    <div className="text-xs text-green-300 mt-1">{fmtCurrency(fixedStatusTotals.pago)}</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-yellow-400">{fixedStatusCounts.pendente}</div>
                    <div className="text-sm text-yellow-300 mt-1">Pendentes</div>
                    <div className="text-xs text-yellow-300 mt-1">{fmtCurrency(fixedStatusTotals.pendente)}</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-red-400">{fixedStatusCounts.atrasado}</div>
                    <div className="text-sm text-red-300 mt-1">Vencidos</div>
                    <div className="text-xs text-red-300 mt-1">{fmtCurrency(fixedStatusTotals.atrasado)}</div>
                  </div>
                </div>

                {/* Lista de categorias melhorada */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-white/70 border-b border-white/10 pb-2">
                    <span>Categoria</span>
                    <span>Valor Total</span>
                  </div>
                  {fixedOverview.slice(0, 5).map((row, index) => {
                    const pct = Math.round((row.total / fixedMaxTotal) * 100);
                    const totalFixedAmount = fixedOverview.reduce((sum, item) => sum + item.total, 0);
                    const categoryPct = Math.round((row.total / totalFixedAmount) * 100);
                    
                    return (
                      <div key={row.category} className="group hover:bg-white/5 rounded-xl p-4 transition-all duration-200 border border-white/10 hover:border-white/20 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-sm text-purple-400">#{index + 1}</span>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm truncate text-white">{row.category}</div>
                              <div className="text-xs text-white/70">
                                {row.count} {row.count > 1 ? 'gastos' : 'gasto'} • {categoryPct}% do total
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-sm tnum text-purple-400">{fmtCurrency(row.total)}</div>
                            <div className="w-20 h-2 bg-white/10 rounded-full mt-2">
                              <div 
                                className="h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-500" 
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {fixedOverview.length > 5 && (
                    <div className="text-center pt-2">
                      <button 
                        onClick={() => navigate('/fixed-dashboard')}
                        className="text-xs text-[color:var(--text-dim)] hover:text-[color:var(--text-bright)] transition-colors"
                      >
                        Ver mais {fixedOverview.length - 5} categorias...
                      </button>
                    </div>
                  )}
                </div>

                {/* Total geral */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Mensal</span>
                    <span className="text-lg font-bold tnum">{fmtCurrency(fixedOverview.reduce((sum, item) => sum + item.total, 0))}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">💳</div>
                <div className="text-sm text-[color:var(--text-dim)] mb-3">Nenhum gasto fixo cadastrado</div>
                <button 
                  onClick={() => navigate('/fixed')}
                  className="text-xs px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg border border-purple-500/30 hover:border-purple-500/40 transition-all duration-200"
                >
                  Cadastrar primeiro gasto
                </button>
              </div>
            )}
          </ModernCard>
          {/* Card: Orçamentos */}
          <ModernCard className="p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/30">
                  <TargetIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Orçamentos ({month})</h3>
                  <p className="text-white/70 text-sm">Controle de gastos por categoria</p>
                </div>
              </div>
              <ModernButton
                variant="primary"
                size="sm"
                onClick={() => navigate('/budgets')}
                className="flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Gerenciar
              </ModernButton>
            </div>
            
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-white/10">
                    <th className="p-3 text-white/70 font-medium">Categoria</th>
                    <th className="p-3 text-white/70 font-medium">Orçado</th>
                    <th className="p-3 text-white/70 font-medium">Gasto</th>
                    <th className="p-3 text-white/70 font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.budgets && summary.budgets.length > 0 ? (
                    summary.budgets.map((b: any) => {
                      const spent = Number(b.spent || 0);
                      const budget = Number(b.budget || 0);
                      const percentage = budget > 0 ? Math.round((spent / budget) * 100) : 0;
                      const isOverBudget = percentage > 100;
                      
                      return (
                        <tr key={b.category_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-3 text-white font-medium">{b.category}</td>
                          <td className="p-3 font-mono text-white">{fmtCurrency(budget)}</td>
                          <td className="p-3 font-mono text-white">{fmtCurrency(spent)}</td>
                          <td className={`p-3 font-mono font-semibold ${isOverBudget ? 'text-red-400' : 'text-green-400'}`}>
                            {percentage}%
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    budgets.map((b) => (
                      <tr key={b.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-3 text-white font-medium">{b.category}</td>
                        <td className="p-3 font-mono text-white">{fmtCurrency(Number(b.amount||0))}</td>
                        <td className="p-3 font-mono text-white/70">-</td>
                        <td className="p-3 font-mono text-white/70">-</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </ModernCard>
          
          {/* Card: Metas Financeiras */}
          <ModernCard className="p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-green-500/20 border border-green-500/30">
                  <TargetIcon className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Metas Financeiras</h3>
                  <p className="text-white/70 text-sm">Acompanhe seus objetivos</p>
                </div>
              </div>
              <ModernButton
                variant="primary"
                size="sm"
                onClick={() => navigate('/goals')}
                className="flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Gerenciar
              </ModernButton>
            </div>
            
            <div className="space-y-4">
              {goals.length === 0 ? (
                <div className="text-center py-8">
                  <TargetIcon className="w-12 h-12 text-white/30 mx-auto mb-3" />
                  <p className="text-white/70 mb-4">Nenhuma meta cadastrada</p>
                  <ModernButton
                    variant="primary"
                    size="sm"
                    onClick={() => navigate('/goals')}
                    className="flex items-center gap-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Criar primeira meta
                  </ModernButton>
                </div>
              ) : (
                goals.slice(0, 3).map((goal) => {
                  const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
                  const isCompleted = progress >= 100;
                  
                  return (
                    <div key={goal.id} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-200 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-white">{goal.name}</span>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                          isCompleted 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {isCompleted ? '✅ Concluída' : '🎯 Em andamento'}
                        </span>
                      </div>
                      <div className="text-sm text-white/70 mb-3">
                        {fmtCurrency(goal.current_amount)} de {fmtCurrency(goal.target_amount)}
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            isCompleted 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                              : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                          }`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-sm font-semibold text-white text-right">
                        {Math.round(progress)}%
                      </div>
                    </div>
                  );
                })
              )}
              {goals.length > 3 && (
                <ModernButton
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/goals')}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <EyeIcon className="w-4 h-4" />
                  Ver mais {goals.length - 3} metas
                </ModernButton>
              )}
            </div>
          </ModernCard>
        </>
      ) : (
        <ModernCard className="p-8 text-center">
          <div className="text-white/70">Sem dados disponíveis.</div>
        </ModernCard>
      )}
    </ModernLayout>
  );
}
