import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { fmtCurrency, monthRange } from '../../utils/format';
import Donut from '../../components/Donut';

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
        
        // Se o endpoint já retornou os orçamentos, use-os diretamente
        if (res.data.data.budgets) {
          setBudgets(res.data.data.budgets);
        } else {
          // Caso contrário, busque separadamente
          const b = await api.get('/api/v1/budgets', { params: { month: month+'-01' } });
          setBudgets(b.data.data || []);
        }
        
        const g = await api.get('/api/v1/goals');
        setGoals(g.data.data || []);
        
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
          {/* Gráfico de tendências dos últimos 6 meses */}
          <div className="card p-4 mb-6">
            <div className="text-sm text-[color:var(--text-dim)] mb-2">Tendência de receitas e despesas (últimos 6 meses)</div>
            {summary.trends && summary.trends.length > 0 ? (
              <TrendChart data={summary.trends} />
            ) : (
              <div className="text-sm text-[color:var(--text-dim)]">Sem dados de tendência disponíveis</div>
            )}
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
                <span>Receitas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
                <span>Despesas</span>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="card p-4">
              <div className="text-sm text-[color:var(--text-dim)] mb-2">Principais categorias de despesas</div>
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
                  <thead>
                    <tr className="text-left">
                      <th className="p-2">Conta</th>
                      <th className="p-2">Tipo</th>
                      <th className="p-2">Mov. Mês</th>
                      <th className="p-2">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summary.accounts || []).map((a: any) => (
                      <tr key={a.id} className="border-t border-white/5">
                        <td className="p-2">{a.name}</td>
                        <td className="p-2">{a.type}</td>
                        <td className="p-2 tnum">
                          <span className={a.month_movement > 0 ? 'text-[color:var(--pos)]' : a.month_movement < 0 ? 'text-[color:var(--neg)]' : ''}>
                            {fmtCurrency(Number(a.month_movement||0))}
                          </span>
                        </td>
                        <td className="p-2 tnum">{fmtCurrency(Number(a.balance||0))}</td>
                      </tr>
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
                  <thead>
                    <tr className="text-left">
                      <th className="p-2">Categoria</th>
                      <th className="p-2">Orçado</th>
                      <th className="p-2">Gasto</th>
                      <th className="p-2">%</th>
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
                          <tr key={b.category_id} className="border-t border-white/5">
                            <td className="p-2">{b.category}</td>
                            <td className="p-2 tnum">{fmtCurrency(budget)}</td>
                            <td className="p-2 tnum">{fmtCurrency(spent)}</td>
                            <td className={`p-2 tnum ${isOverBudget ? 'text-[color:var(--neg)]' : ''}`}>
                              {percentage}%
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      budgets.map((b) => (
                        <tr key={b.id} className="border-t border-white/5">
                          <td className="p-2">{b.category}</td>
                          <td className="p-2 tnum">{fmtCurrency(Number(b.amount||0))}</td>
                          <td className="p-2 tnum">-</td>
                          <td className="p-2 tnum">-</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold heading flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  Metas
                </h2>
                <div className="flex items-center gap-2">
                  {goals.length > 0 && (
                    <span className="text-xs text-[color:var(--text-dim)] bg-white/5 px-2 py-1 rounded">
                      {goals.filter(g => {
                        const prog = Math.min(100, Math.round(100*(Number(g.current_amount||0)/Number(g.target_amount||1))));
                        return prog >= 100;
                      }).length} de {goals.length} concluídas
                    </span>
                  )}
                  <button 
                    onClick={() => navigate('/goals')} 
                    className="text-xs text-[color:var(--text-dim)] hover:text-[color:var(--text)] transition-colors flex items-center gap-1"
                  >
                    Ver todas
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {goals.length === 0 ? (
                  <div className="card p-6 text-center text-[color:var(--text-dim)] border-2 border-dashed border-white/10">
                    <div className="mb-3">
                      <svg className="w-12 h-12 mx-auto text-[color:var(--text-dim)] opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <div className="text-sm mb-2">Nenhuma meta cadastrada</div>
                    <p className="text-xs text-[color:var(--text-dim)] mb-4">Defina objetivos financeiros e acompanhe seu progresso</p>
                    <button 
                      onClick={() => navigate('/goals')} 
                      className="text-sm bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 px-4 py-2 rounded-lg transition-colors"
                    >
                      Criar primeira meta
                    </button>
                  </div>
                ) : (
                  goals.slice(0, 3).map((g) => {
                    const prog = Math.min(100, Math.round(100*(Number(g.current_amount||0)/Number(g.target_amount||1))));
                    const isDebtGoal = g.type === 'quitar_divida';
                    const remaining = Number(g.target_amount||0) - Number(g.current_amount||0);
                    const isCompleted = prog >= 100;
                    
                    // Calcular status baseado no prazo
                    let statusColor = 'text-[color:var(--text-dim)]';
                    let statusText = 'No prazo';
                    let statusIcon = '⏱️';
                    
                    if (g.target_date) {
                      const today = new Date();
                      const targetDate = new Date(g.target_date);
                      const daysLeft = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      
                      if (isCompleted) {
                        statusColor = 'text-green-400';
                        statusText = 'Concluída';
                        statusIcon = '✅';
                      } else if (daysLeft < 0) {
                        statusColor = 'text-red-400';
                        statusText = 'Atrasada';
                        statusIcon = '⚠️';
                      } else if (daysLeft <= 30) {
                        statusColor = 'text-yellow-400';
                        statusText = `${daysLeft}d restantes`;
                        statusIcon = '⏰';
                      } else {
                        statusText = `${Math.ceil(daysLeft/30)}m restantes`;
                        statusIcon = '📅';
                      }
                    }
                    
                    // Formatação da data limite
                    const targetDateFormatted = g.target_date ? new Date(g.target_date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    }) : null;
                    
                    return (
                      <div key={g.id} className="card p-4 hover:bg-white/[0.02] transition-all duration-200 cursor-pointer border border-white/5 hover:border-white/10" onClick={() => navigate('/goals')}>
                        {/* Header com nome, tipo e prioridade */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`inline-block w-3 h-3 rounded-full flex-shrink-0 ${
                              isDebtGoal ? 'bg-pink-400' : 'bg-cyan-400'
                            }`} />
                            <div className="min-w-0">
                              <span className="font-medium text-sm truncate block">{g.name}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-[color:var(--text-dim)] bg-white/5 px-1.5 py-0.5 rounded">
                                  {isDebtGoal ? '💳 Dívida' : '💰 Poupança'}
                                </span>
                                {g.strategy && (
                                  <span className="text-[10px] text-[color:var(--text-dim)] bg-white/5 px-1.5 py-0.5 rounded">
                                    {g.strategy === 'linear' ? '📈 Linear' : '🎯 Alocação'}
                                  </span>
                                )}
                                {g.priority === 'alta' && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 flex-shrink-0">🔴 Alta</span>
                                )}
                                {g.priority === 'media' && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 flex-shrink-0">🟡 Média</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-lg font-bold">{prog}%</div>
                            <div className={`text-[10px] ${statusColor} flex items-center gap-1`}>
                              <span>{statusIcon}</span>
                              <span>{statusText}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Valores e progresso */}
                        <div className="space-y-2 mb-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-[color:var(--text-dim)]">Atual:</span>
                            <span className="font-medium">{fmtCurrency(g.current_amount)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-[color:var(--text-dim)]">Meta:</span>
                            <span className="font-medium">{fmtCurrency(g.target_amount)}</span>
                          </div>
                          {!isCompleted && remaining > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-[color:var(--text-dim)]">Restante:</span>
                              <span className="font-medium text-orange-400">{fmtCurrency(remaining)}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Barra de progresso */}
                        <div className="h-2.5 rounded-full bg-white/5 overflow-hidden mb-3">
                          <div 
                            className={`h-2.5 rounded-full transition-all duration-500 ${
                              isCompleted 
                                ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                                : isDebtGoal 
                                  ? 'bg-gradient-to-r from-pink-400 to-rose-400' 
                                  : 'bg-gradient-to-r from-cyan-400 to-blue-500'
                            }`} 
                            style={{ width: prog+'%' }} 
                          />
                        </div>
                        
                        {/* Informações adicionais */}
                        <div className="flex justify-between items-center text-[10px] text-[color:var(--text-dim)]">
                          <div className="flex items-center gap-3">
                            {g.planned_monthly_amount && (
                              <span className="flex items-center gap-1">
                                <span>💰</span>
                                <span>{fmtCurrency(g.planned_monthly_amount)}/mês</span>
                              </span>
                            )}
                            {targetDateFormatted && (
                              <span className="flex items-center gap-1">
                                <span>📅</span>
                                <span>{targetDateFormatted}</span>
                              </span>
                            )}
                          </div>
                          {g.recurring_day && (
                            <span className="flex items-center gap-1">
                              <span>🔄</span>
                              <span>Dia {g.recurring_day}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                
                {goals.length > 3 && (
                  <div className="text-center pt-2">
                    <button 
                      onClick={() => navigate('/goals')} 
                      className="text-xs text-[color:var(--text-dim)] hover:text-[color:var(--text)] transition-colors bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg flex items-center gap-2 mx-auto"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Ver mais {goals.length - 3} metas
                    </button>
                  </div>
                )}
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
