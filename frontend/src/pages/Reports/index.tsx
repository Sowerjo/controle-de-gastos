import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

type Row = { name: string; type: 'RECEITA'|'DESPESA'; total: number };
type TrendData = { month: string; receitas: number; despesas: number; saldo: number };
type TopItem = { name: string; total: number; percentage: number };

export default function Reports() {
  const [tab, setTab] = useState<'category'|'payee'|'tag'|'trends'|'insights'>('category');
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10));
  const [to, setTo] = useState(new Date().toISOString().slice(0,10));
  const [rows, setRows] = useState<Row[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [topExpenses, setTopExpenses] = useState<TopItem[]>([]);
  const [topIncomes, setTopIncomes] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Carregar dados básicos por categoria/favorecido/tag
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = tab==='category' ? '/api/v1/reports/by-category' : tab==='payee' ? '/api/v1/reports/by-payee' : '/api/v1/reports/by-tag';
      const r = await api.get(url, { params: { from, to } });
      const data = (r.data.data || []).map((x: any) => ({ name: x.name, type: x.type, total: Number(x.total||0) }));
      setRows(data);
    } catch (err) {
      console.error('Erro ao carregar relatório:', err);
      setError('Falha ao carregar dados do relatório');
    } finally {
      setLoading(false);
    }
  };
  
  // Carregar dados de tendências (últimos 6 meses)
  const loadTrends = async () => {
    setLoading(true);
    setError(null);
    try {
      // Calcular os últimos 6 meses
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 5); // 6 meses incluindo o atual
      
      const r = await api.get('/api/v1/reports/monthly', { 
        params: { 
          from: startDate.toISOString().slice(0,10),
          to: endDate.toISOString().slice(0,10) 
        } 
      });
      
      const data = (r.data.data || []).map((x: any) => ({
        month: x.month,
        receitas: Number(x.receitas || 0),
        despesas: Number(x.despesas || 0),
        saldo: Number(x.receitas || 0) - Number(x.despesas || 0)
      }));
      
      setTrendData(data);
    } catch (err) {
      console.error('Erro ao carregar tendências:', err);
      setError('Falha ao carregar dados de tendências');
    } finally {
      setLoading(false);
    }
  };
  
  // Carregar top despesas e receitas
  const loadTopItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const [expensesRes, incomesRes] = await Promise.all([
        api.get('/api/v1/reports/top-expenses', { params: { from, to, limit: 5 } }),
        api.get('/api/v1/reports/top-incomes', { params: { from, to, limit: 5 } })
      ]);
      
      const totalExpenses = expensesRes.data.total || 0;
      const totalIncomes = incomesRes.data.total || 0;
      
      const expenses = (expensesRes.data.data || []).map((x: any) => ({
        name: x.name,
        total: Number(x.total || 0),
        percentage: totalExpenses > 0 ? (Number(x.total || 0) / totalExpenses) * 100 : 0
      }));
      
      const incomes = (incomesRes.data.data || []).map((x: any) => ({
        name: x.name,
        total: Number(x.total || 0),
        percentage: totalIncomes > 0 ? (Number(x.total || 0) / totalIncomes) * 100 : 0
      }));
      
      setTopExpenses(expenses);
      setTopIncomes(incomes);
    } catch (err) {
      console.error('Erro ao carregar top itens:', err);
      setError('Falha ao carregar dados de top itens');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { 
    if (tab === 'trends') {
      loadTrends();
    } else if (tab === 'insights') {
      loadTopItems();
    } else {
      load();
    }
  }, [tab, from, to]);

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
        <button
          onClick={() => setTab('trends')}
          className={`px-3 py-1 rounded-[12px] ${tab==='trends' ? 'bg-gradient-to-tr from-cyan-400 to-fuchsia-400 text-[#0b0f1a] shadow-glow' : 'border border-white/5 bg-[color:var(--surf-1)] text-white hover:border-white/10'}`}
        >
          Tendências
        </button>
        <button
          onClick={() => setTab('insights')}
          className={`px-3 py-1 rounded-[12px] ${tab==='insights' ? 'bg-gradient-to-tr from-cyan-400 to-fuchsia-400 text-[#0b0f1a] shadow-glow' : 'border border-white/5 bg-[color:var(--surf-1)] text-white hover:border-white/10'}`}
        >
          Insights
        </button>
        <div className="ml-auto flex gap-2">
        <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="input px-2 py-1 text-sm" />
        <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="input px-2 py-1 text-sm" />
      </div>
      
      {/* Indicadores de carregamento e erro */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-rose-500/20 border border-rose-500/50 text-rose-200 p-4 rounded-lg mb-4">
          <p>Erro ao carregar dados: {error}</p>
        </div>
      )}
      </div>
      
      {error && (
        <div className="bg-rose-500/20 border border-rose-500/50 text-rose-200 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
        </div>
      )}

      {/* Visualizações por categoria/favorecido/tag */}
      {(tab === 'category' || tab === 'payee' || tab === 'tag') && !loading && !error && (
        <>
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
          
          {/* Resumo financeiro */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="surface-2 rounded-lg p-4 border border-white/5">
              <h3 className="text-sm text-[color:var(--text-dim)] mb-1">Total de Receitas</h3>
              <div className="text-xl font-semibold text-emerald-400">
                {rows.filter(r => r.type === 'RECEITA').reduce((a, b) => a + b.total, 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
              </div>
            </div>
            <div className="surface-2 rounded-lg p-4 border border-white/5">
              <h3 className="text-sm text-[color:var(--text-dim)] mb-1">Total de Despesas</h3>
              <div className="text-xl font-semibold text-rose-400">
                {rows.filter(r => r.type === 'DESPESA').reduce((a, b) => a + b.total, 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
              </div>
            </div>
            <div className="surface-2 rounded-lg p-4 border border-white/5">
              <h3 className="text-sm text-[color:var(--text-dim)] mb-1">Saldo</h3>
              <div className="text-xl font-semibold">
                {(rows.filter(r => r.type === 'RECEITA').reduce((a, b) => a + b.total, 0) - rows.filter(r => r.type === 'DESPESA').reduce((a, b) => a + b.total, 0)).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Visualização de tendências */}
      {tab === 'trends' && !loading && !error && (
        <div className="space-y-6">
          <div className="surface-2 rounded-lg p-4 border border-white/5">
            <h3 className="font-semibold mb-4">Evolução Financeira (Últimos 6 meses)</h3>
            
            {/* Gráfico de tendências */}
            <div className="overflow-auto">
              <svg
                width="100%"
                height="300"
                viewBox="0 0 800 300"
                className="border border-white/5 rounded bg-[color:var(--surf-1)]"
              >
                {/* Eixos */}
                <line x1="50" y1="250" x2="750" y2="250" stroke="currentColor" strokeOpacity="0.2" />
                
                {/* Dados */}
                {trendData.length > 0 && (
                  <>
                    {/* Linhas de receitas */}
                    <path 
                      d={`M ${50 + (700 / (trendData.length - 1)) * 0} ${250 - (trendData[0].receitas / Math.max(...trendData.map(d => Math.max(d.receitas, d.despesas))) * 200)} ${trendData.slice(1).map((d, i) => `L ${50 + (700 / (trendData.length - 1)) * (i + 1)} ${250 - (d.receitas / Math.max(...trendData.map(d => Math.max(d.receitas, d.despesas))) * 200)}`)}`}
                      stroke="#16a34a"
                      strokeWidth="2"
                      fill="none"
                    />
                    
                    {/* Linhas de despesas */}
                    <path 
                      d={`M ${50 + (700 / (trendData.length - 1)) * 0} ${250 - (trendData[0].despesas / Math.max(...trendData.map(d => Math.max(d.receitas, d.despesas))) * 200)} ${trendData.slice(1).map((d, i) => `L ${50 + (700 / (trendData.length - 1)) * (i + 1)} ${250 - (d.despesas / Math.max(...trendData.map(d => Math.max(d.receitas, d.despesas))) * 200)}`)}`}
                      stroke="#dc2626"
                      strokeWidth="2"
                      fill="none"
                    />
                    
                    {/* Pontos de receitas */}
                    {trendData.map((d, i) => (
                      <circle 
                        key={`rec-${i}`}
                        cx={50 + (700 / (trendData.length - 1)) * i}
                        cy={250 - (d.receitas / Math.max(...trendData.map(d => Math.max(d.receitas, d.despesas))) * 200)}
                        r="4"
                        fill="#16a34a"
                      />
                    ))}
                    
                    {/* Pontos de despesas */}
                    {trendData.map((d, i) => (
                      <circle 
                        key={`desp-${i}`}
                        cx={50 + (700 / (trendData.length - 1)) * i}
                        cy={250 - (d.despesas / Math.max(...trendData.map(d => Math.max(d.receitas, d.despesas))) * 200)}
                        r="4"
                        fill="#dc2626"
                      />
                    ))}
                    
                    {/* Meses no eixo X */}
                    {trendData.map((d, i) => (
                      <text 
                        key={`month-${i}`}
                        x={50 + (700 / (trendData.length - 1)) * i}
                        y="270"
                        textAnchor="middle"
                        fontSize="12"
                        fill="currentColor"
                      >
                        {d.month}
                      </text>
                    ))}
                  </>
                )}
                
                {/* Legenda */}
                <circle cx="650" cy="30" r="4" fill="#16a34a" />
                <text x="660" y="34" fontSize="12" fill="currentColor">Receitas</text>
                <circle cx="650" cy="50" r="4" fill="#dc2626" />
                <text x="660" y="54" fontSize="12" fill="currentColor">Despesas</text>
              </svg>
            </div>
          </div>
          
          {/* Tabela de dados */}
          <div className="surface-2 rounded-lg p-4 border border-white/5">
            <h3 className="font-semibold mb-4">Dados Mensais</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-2">Mês</th>
                    <th className="text-right p-2">Receitas</th>
                    <th className="text-right p-2">Despesas</th>
                    <th className="text-right p-2">Saldo</th>
                    <th className="text-right p-2">Economia</th>
                  </tr>
                </thead>
                <tbody>
                  {trendData.map((d, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="p-2">{d.month}</td>
                      <td className="p-2 text-right text-emerald-400">{d.receitas.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                      <td className="p-2 text-right text-rose-400">{d.despesas.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                      <td className="p-2 text-right">{d.saldo.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                      <td className="p-2 text-right">
                        {d.receitas > 0 ? `${Math.round((1 - d.despesas / d.receitas) * 100)}%` : '0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Visualização de insights */}
      {tab === 'insights' && !loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top despesas */}
          <div className="surface-2 rounded-lg p-4 border border-white/5">
            <h3 className="font-semibold mb-4">Maiores Despesas</h3>
            <div className="space-y-3">
              {topExpenses.map((item, i) => (
                <div key={i} className="">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm">{item.name || '(Sem nome)'}</div>
                    <div className="text-sm text-rose-400">{item.total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
                  </div>
                  <div className="h-2 rounded bg-white/5 w-full">
                    <div 
                      className="h-2 rounded bg-rose-600" 
                      style={{width: `${item.percentage}%`}}
                    ></div>
                  </div>
                  <div className="text-xs text-[color:var(--text-dim)] mt-1">{item.percentage.toFixed(1)}% do total</div>
                </div>
              ))}
              
              {topExpenses.length === 0 && (
                <div className="text-center py-4 text-[color:var(--text-dim)]">Sem dados disponíveis</div>
              )}
            </div>
          </div>
          
          {/* Top receitas */}
          <div className="surface-2 rounded-lg p-4 border border-white/5">
            <h3 className="font-semibold mb-4">Maiores Receitas</h3>
            <div className="space-y-3">
              {topIncomes.map((item, i) => (
                <div key={i} className="">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm">{item.name || '(Sem nome)'}</div>
                    <div className="text-sm text-emerald-400">{item.total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
                  </div>
                  <div className="h-2 rounded bg-white/5 w-full">
                    <div 
                      className="h-2 rounded bg-emerald-600" 
                      style={{width: `${item.percentage}%`}}
                    ></div>
                  </div>
                  <div className="text-xs text-[color:var(--text-dim)] mt-1">{item.percentage.toFixed(1)}% do total</div>
                </div>
              ))}
              
              {topIncomes.length === 0 && (
                <div className="text-center py-4 text-[color:var(--text-dim)]">Sem dados disponíveis</div>
              )}
            </div>
          </div>
          
          {/* Resumo financeiro */}
          <div className="surface-2 rounded-lg p-4 border border-white/5 md:col-span-2">
            <h3 className="font-semibold mb-4">Resumo Financeiro</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-white/5 rounded">
                <div className="text-sm text-[color:var(--text-dim)] mb-1">Total de Receitas</div>
                <div className="text-xl font-semibold text-emerald-400">
                  {topIncomes.reduce((a, b) => a + b.total, 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded">
                <div className="text-sm text-[color:var(--text-dim)] mb-1">Total de Despesas</div>
                <div className="text-xl font-semibold text-rose-400">
                  {topExpenses.reduce((a, b) => a + b.total, 0).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded">
                <div className="text-sm text-[color:var(--text-dim)] mb-1">Saldo</div>
                <div className="text-xl font-semibold">
                  {(topIncomes.reduce((a, b) => a + b.total, 0) - topExpenses.reduce((a, b) => a + b.total, 0)).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
