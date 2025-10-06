import React from 'react';
import api from '../../services/api';
import { notifyAccountsUpdate } from '../../hooks/useAccounts';
import ModernLayout, { ModernCard, ModernButton, ModernInput } from '../../components/Layout/ModernLayout';
import { ChartBarIcon, CalendarIcon, PlusIcon } from '../../components/Icons';
import { fmtCurrency } from '../../utils/format';
import { parseBRNumber } from '../../components/CurrencyInput';
// Removido PayeeAutocomplete para usar seleção por dropdown com ID

type Rule = {
  id: number;
  account_id: number;
  type: 'RECEITA' | 'DESPESA';
  amount: number;
  description?: string;
  category_id?: number | null;
  payee_id?: number | null;
  interval_unit: 'day' | 'week' | 'month';
  interval_count: number;
  next_run: string; // YYYY-MM-DD
  end_date?: string | null;
  mode?: 'manual' | 'automatic';
  notify_days?: number;
  last_run?: string | null;
};

export default function FixedExpenses() {
  const [items, setItems] = React.useState<Rule[]>([]);
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [payees, setPayees] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>('');
  const [form, setForm] = React.useState<any>({ 
    account_id: '', 
    amount: '', 
    description: '', 
    category_id: '', 
    payee_id: '', 
    due_day: new Date().getDate(), 
    mode: 'manual', 
    notify_days: 3 
  });
  // Controle de favorecido: existente (autocomplete) ou novo (texto)
  const [useExistingPayee, setUseExistingPayee] = React.useState<boolean>(false);
  const [newPayeeName, setNewPayeeName] = React.useState<string>('');
  const [editId, setEditId] = React.useState<number | null>(null);
  const [editDraft, setEditDraft] = React.useState<any>({ mode: 'manual', next_run: '', notify_days: 3 });
  const [toast, setToast] = React.useState<{ type: 'info' | 'error' | 'success'; message: string } | null>(null);
  const showToast = (type: 'info' | 'error' | 'success', message: string) => { setToast({ type, message }); setTimeout(()=>setToast(null), 3500); };
  const [statusFilter, setStatusFilter] = React.useState<'all'|'pendente'|'pago'|'atrasado'>('all');
  const [accountFilter, setAccountFilter] = React.useState<number | ''>('');

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const fmtCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  // Parse YYYY-MM-DD as a local Date (avoid timezone offset)
  const parseYMDToLocalDate = (s: string) => {
    const parts = String(s).split('-');
    const y = Number(parts[0] || 0);
    const m = Number(parts[1] || 1);
    const d = Number(parts[2] || 1);
    return new Date(y, m - 1, d);
  };
  const formatYMDToBR = (s: string) => {
    const parts = String(s).split('-');
    const y = parts[0] || '';
    const m = parts[1] || '';
    const d = parts[2] || '';
    if (!y || !m || !d) return s;
    return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
  };

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [r, a, c, p] = await Promise.all([
        api.get('/api/v1/recurring'),
        api.get('/api/v1/accounts'),
        api.get('/api/v1/categories'),
        api.get('/api/v1/payees'),
      ]);
      setItems((r.data.data || []) as Rule[]);
      setAccounts(a.data.data || []);
      setCategories(c.data.data || []);
      setPayees(p.data.data || []);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar');
    } finally { setLoading(false); }
  };

  React.useEffect(() => { load(); }, []);

  // Quando alternar para novo favorecido, limpamos o payee_id
  React.useEffect(() => {
    if (!useExistingPayee) {
      setForm((prev:any) => ({ ...prev, payee_id: '' }));
    }
  }, [useExistingPayee]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      const dueDay = Number(form.due_day || 1);
      // Calcular next_run com base no mês atual e dia de vencimento informado
      const selYear = today.getFullYear();
      const selMonthIndex = today.getMonth(); // mês atual (0-based)
      // Garantir que o dia não ultrapasse o último dia do mês atual
      const daysInSelectedMonth = new Date(selYear, selMonthIndex + 1, 0).getDate();
      const dueDayClamped = Math.max(1, Math.min(dueDay, daysInSelectedMonth));
      // Construir string de data sem conversão de timezone para evitar offset de 1 dia
      const nextRunStr = `${selYear}-${String(selMonthIndex + 1).padStart(2,'0')}-${String(dueDayClamped).padStart(2,'0')}`;
      // Resolver favorecido conforme a escolha
      let payeeId: number | null = form.payee_id ? Number(form.payee_id) : null;
      if (useExistingPayee) {
        if (!payeeId) {
          setError('Selecione um favorecido existente válido.');
          return;
        }
      } else {
        const name = (newPayeeName || '').trim();
        if (name.length > 0) {
          // 1) Primeiro, tente localizar um favorecido existente por nome (evita erro 500 por duplicidade)
          const existing = payees.find((p:any) => (p.name||'').trim().toLowerCase() === name.toLowerCase());
          if (existing) {
            payeeId = Number(existing.id);
          } else {
            // 2) Criar novo favorecido; backend retorna apenas {ok:true}, então recarregamos e buscamos novamente
            try {
              await api.post('/api/v1/payees', { name });
            } catch (pe: any) {
              // Se ocorreu erro (ex.: duplicidade), ainda tentamos localizar por nome para seguir
              try { 
                const p = await api.get('/api/v1/payees'); 
                const list = p.data.data || []; 
                setPayees(list);
                const match = list.find((x:any) => (x.name||'').trim().toLowerCase() === name.toLowerCase());
                if (match) {
                  payeeId = Number(match.id);
                } else {
                  const msg = pe?.response?.data?.error?.message || pe?.message || 'Falha ao criar favorecido';
                  setError(msg);
                  return;
                }
              } catch {
                const msg = pe?.response?.data?.error?.message || pe?.message || 'Falha ao criar favorecido';
                setError(msg);
                return;
              }
            }
            // Após criar sem erro, recarregamos e pegamos o ID pelo nome
            if (!payeeId) {
              try { 
                const p = await api.get('/api/v1/payees'); 
                const list = p.data.data || []; 
                setPayees(list);
                const match = list.find((x:any) => (x.name||'').trim().toLowerCase() === name.toLowerCase());
                payeeId = match ? Number(match.id) : null; 
              } catch {}
            }
          }
        }
      }
      const payload: any = {
        account_id: Number(form.account_id),
        type: 'DESPESA',
        amount: parseBRNumber(form.amount),
        description: form.description || 'Gasto Fixo',
        category_id: form.category_id ? Number(form.category_id) : null,
        payee_id: payeeId ?? null,
        interval_unit: 'month',
        interval_count: 1,
        next_run: nextRunStr,
        mode: form.mode,
        notify_days: Number(form.notify_days || 3),
      };
      await api.post('/api/v1/recurring', payload);
      setForm({ 
        account_id: '', 
        amount: '', 
        description: '', 
        category_id: '', 
        payee_id: '', 
        due_day: new Date().getDate(), 
        mode: form.mode, 
        notify_days: form.notify_days 
      });
      setUseExistingPayee(false);
      setNewPayeeName('');
      await load();
    } catch (e: any) { setError(e?.response?.data?.error?.message || e?.message || 'Erro ao salvar'); }
  };

  const del = async (id: number) => { await api.delete('/api/v1/recurring', { params: { id } }); await load(); };
  const runAuto = async () => { await api.post('/api/v1/recurring/run'); notifyAccountsUpdate(); await load(); };
  const [confirmingId, setConfirmingId] = React.useState<number | null>(null);
  const confirmPay = async (id: number) => {
    if (confirmingId) return;
    setConfirmingId(id);
    try {
      await api.post('/api/v1/fixed-expenses/confirm', { id });
      notifyAccountsUpdate();
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || 'Falha ao confirmar pagamento');
    } finally {
      setConfirmingId(null);
    }
  };

  const statusOf = (r: Rule) => {
    const nr = parseYMDToLocalDate(r.next_run);
    const lr = r.last_run ? parseYMDToLocalDate(r.last_run) : null;
    const paidThisMonth = lr && lr >= monthStart && lr <= monthEnd;
    if (paidThisMonth) return 'pago';
    if (nr < today) return 'atrasado';
    return 'pendente';
  };

  const monthForecast = items.filter(r => {
    const nr = parseYMDToLocalDate(r.next_run);
    return nr >= monthStart && nr <= monthEnd && r.type === 'DESPESA';
  }).reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const filteredItems = items.filter(r => {
    const st = statusOf(r);
    const matchStatus = statusFilter === 'all' ? true : (st === statusFilter);
    const matchAccount = accountFilter ? r.account_id === accountFilter : true;
    return matchStatus && matchAccount;
  });

  return (
    <ModernLayout title="Gastos Fixos" subtitle="Gerencie seus gastos recorrentes mensais">

      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm ${
          toast.type === 'success' 
            ? 'bg-green-500/20 border-green-500/40 text-green-200' 
            : toast.type === 'info'
            ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
            : 'bg-rose-500/20 border-rose-500/40 text-rose-200'
        }`}>
          {toast.message}
        </div>
      )}

      {error && (
        <div className="card mb-6 p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <span className="text-red-600">⚠️</span>
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ModernCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/30">
              <span className="text-purple-300">💰</span>
            </div>
            <div>
              <p className="text-white/80 text-sm">Previsto (mês)</p>
              <p className="text-2xl font-bold text-purple-300">{fmtCurrency(monthForecast)}</p>
            </div>
          </div>
        </ModernCard>

        <ModernCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-yellow-500/20 border border-yellow-500/30">
              <span className="text-yellow-300">📅</span>
            </div>
            <div>
              <p className="text-white/80 text-sm">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-300">{items.filter(r=>statusOf(r)==='pendente').length}</p>
            </div>
          </div>
        </ModernCard>

        <ModernCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30">
              <span className="text-red-300">⚠️</span>
            </div>
            <div>
              <p className="text-white/80 text-sm">Atrasados</p>
              <p className="text-2xl font-bold text-red-300">{items.filter(r=>statusOf(r)==='atrasado').length}</p>
            </div>
          </div>
        </ModernCard>
      </div>

      {/* Grid: Gastos por Categoria & Próximos Vencimentos */}
      {(() => {
        // Resumo por categoria (top 5)
        const byCat: Record<string, { name: string; total: number; count: number }> = {};
        items.filter(r => r.type === 'DESPESA').forEach(r => {
          const key = String(r.category_id || 'none');
          const name = r.category_id ? (categories.find((c:any)=>c.id===r.category_id)?.name || 'Sem categoria') : 'Sem categoria';
          byCat[key] = byCat[key] || { name, total: 0, count: 0 };
          byCat[key].total += Number(r.amount||0);
          byCat[key].count += 1;
        });
        const categorySummary = Object.values(byCat).sort((a,b)=>b.total-a.total).slice(0,5);
        const maxTotal = Math.max(1, ...categorySummary.map(c=>c.total));

        // Próximos vencimentos (top 3)
        const upcomingExpenses = items
          .filter(r => statusOf(r) !== 'pago')
          .sort((a,b)=> new Date(a.next_run).getTime() - new Date(b.next_run).getTime())
          .slice(0,3);

        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Resumo por Categoria */}
            <ModernCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                  <ChartBarIcon className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Gastos por Categoria</h3>
                  <p className="text-white/70 text-sm">Distribuição dos gastos fixos</p>
                </div>
              </div>
              <div className="space-y-4">
                {categorySummary.map((c, index) => (
                  <div key={index} className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-white font-medium">{c.name}</div>
                      <div className="text-white/80 font-semibold">{fmtCurrency(c.total)}</div>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500" style={{ width: `${Math.round((c.total/maxTotal)*100)}%` }}></div>
                    </div>
                    <div className="text-xs text-white/50 mt-1">{c.count} item{c.count>1?'s':''}</div>
                  </div>
                ))}
                {categorySummary.length === 0 && (
                  <div className="text-white/70 text-sm">Sem dados de categorias</div>
                )}
              </div>
            </ModernCard>

            {/* Próximos Vencimentos */}
            <ModernCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-orange-500/20 border border-orange-500/30">
                  <CalendarIcon className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Próximos Vencimentos</h3>
                  <p className="text-white/70 text-sm">Gastos que vencem em breve</p>
                </div>
              </div>
              <div className="space-y-3">
                {upcomingExpenses.length > 0 ? (
                  upcomingExpenses.map((r, i) => (
                    <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">{r.description || 'Gasto Fixo'}</div>
                        <div className="text-white/60 text-xs">{formatYMDToBR(r.next_run)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/80 font-semibold">{fmtCurrency(Number(r.amount||0))}</span>
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-300">pendente</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-white/70 text-sm">Sem vencimentos próximos</div>
                )}
              </div>
            </ModernCard>
          </div>
        );
      })()}

      {/* Formulário de Cadastro */}
      <ModernCard className="p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
            <PlusIcon className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Novo Gasto Fixo</h3>
            <p className="text-white/80 text-sm">Cadastre um novo gasto recorrente</p>
          </div>
        </div>

        <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Conta vinculada</label>
            <select 
              value={form.account_id} 
              onChange={(e)=>setForm({...form, account_id: Number(e.target.value)})} 
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
              required
            >
              <option value="" className="bg-gray-800 text-white">Selecione uma conta…</option>
              {accounts.map((a:any)=>(<option key={a.id} value={a.id} className="bg-gray-800 text-white">{a.name}</option>))}
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Valor do gasto fixo</label>
            <input
              type="text"
              value={form.amount}
              onChange={(e)=>setForm({...form, amount: e.target.value})}
              placeholder="Ex.: 1.200,00"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Nome do gasto</label>
            <input
              type="text"
              value={form.description}
              onChange={(e)=>setForm({...form, description: e.target.value})}
              placeholder="Ex.: Aluguel"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Categoria da despesa</label>
            <select 
              value={form.category_id} 
              onChange={(e)=>setForm({...form, category_id: e.target.value})} 
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
            >
              <option value="" className="bg-gray-800 text-white">Selecione uma categoria…</option>
              {categories.filter((c:any)=>c.type==='DESPESA').map((c:any)=>(<option key={c.id} value={c.id} className="bg-gray-800 text-white">{c.name}</option>))}
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Favorecido (quem recebe)</label>
            <div className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={useExistingPayee} onChange={(e)=> setUseExistingPayee(e.target.checked)} />
              <span className="text-sm text-white/80">Usar favorecido existente</span>
            </div>
            {useExistingPayee ? (
              <select 
                value={form.payee_id}
                onChange={(e)=>setForm({...form, payee_id: Number(e.target.value)})}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
              >
                <option value="" className="bg-gray-800 text-white">Selecione um favorecido…</option>
                {payees.map((p:any)=>(
                  <option key={p.id} value={p.id} className="bg-gray-800 text-white">{p.name}</option>
                ))}
              </select>
            ) : (
              <input 
                type="text" 
                value={newPayeeName}
                onChange={(e)=> setNewPayeeName(e.target.value)}
                placeholder="Digite o novo favorecido"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
              />
            )}
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Dia do vencimento</label>
            <input
              type="number"
              min={1}
              max={31}
              value={form.due_day}
              onChange={(e)=>setForm({...form, due_day: Number(e.target.value)})}
              placeholder="Ex.: 5"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium mb-1">Forma de pagamento</label>
            <select 
              value={form.mode} 
              onChange={(e)=>setForm({...form, mode: e.target.value})} 
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
            >
              <option value="manual" className="bg-gray-800 text-white">Manual (você confirma o pagamento)</option>
              <option value="automatic" className="bg-gray-800 text-white">Automático (gera na data de vencimento)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Aviso de vencimento (dias antes)</label>
            <input
              type="number"
              min={0}
              value={form.notify_days}
              onChange={(e)=>setForm({...form, notify_days: Number(e.target.value)})}
              placeholder="Ex.: 3"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
            />
          </div>

          <div className="md:col-span-2">
            <ModernButton type="submit" variant="primary" className="w-full md:w-auto">
              <PlusIcon className="w-4 h-4" />
              Salvar gasto fixo
            </ModernButton>
          </div>
        </form>
      </ModernCard>

      {/* Filtros / Lista header */}
      <ModernCard className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
              <ChartBarIcon className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Todos os Gastos Fixos</h3>
              <p className="text-white/70 text-sm">Lista completa com filtros</p>
            </div>
          </div>
          <div className="hidden md:block w-64">
            <ModernInput placeholder="Buscar por descrição..." />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Filtrar por status</label>
            <select 
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm" 
              value={statusFilter} 
              onChange={(e)=>setStatusFilter(e.target.value as any)}
            >
              <option value="all" className="bg-gray-800 text-white">Todos</option>
              <option value="pendente" className="bg-gray-800 text-white">Pendentes</option>
              <option value="atrasado" className="bg-gray-800 text-white">Atrasados</option>
              <option value="pago" className="bg-gray-800 text-white">Pagos</option>
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Filtrar por conta</label>
            <select 
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm" 
              value={accountFilter} 
              onChange={(e)=>setAccountFilter(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="" className="bg-gray-800 text-white">Todas</option>
              {accounts.map((a:any)=>(<option key={a.id} value={a.id} className="bg-gray-800 text-white">{a.name}</option>))}
            </select>
          </div>
          <div className="md:hidden">
            <ModernInput placeholder="Buscar por descrição..." />
          </div>
        </div>
      </ModernCard>

      {/* Tabela de Gastos */}
      <ModernCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
            <span className="text-green-300">💳</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Lista de Gastos Fixos</h3>
            <p className="text-white/80 text-sm">{filteredItems.length} gastos encontrados</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-white/10">
                <th className="p-3 text-white/70 font-medium">Descrição</th>
                <th className="p-3 text-white/70 font-medium">Conta</th>
                <th className="p-3 text-white/70 font-medium">Valor</th>
                <th className="p-3 text-white/70 font-medium">Modo</th>
                <th className="p-3 text-white/70 font-medium">Aviso</th>
                <th className="p-3 text-white/70 font-medium">Vencimento</th>
                <th className="p-3 text-white/70 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((r) => {
                const accName = accounts.find((a:any)=>a.id===r.account_id)?.name || r.account_id;
                const st = statusOf(r);
                const statusColor = st === 'pago' ? 'text-green-600' : st === 'atrasado' ? 'text-red-600' : 'text-yellow-600';
                
                return (
                  <tr key={r.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${st === 'pago' ? 'bg-green-400' : st === 'atrasado' ? 'bg-red-400' : 'bg-yellow-400'}`}></span>
                        <span className="font-medium">{r.description||'Gasto Fixo'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-white/70">{accName}</td>
                    <td className="py-3 px-2 font-mono font-semibold">{fmtCurrency(Number(r.amount||0))}</td>
                    <td className="py-3 px-2 text-white/70">
                      {editId===r.id ? (
                        <select 
                          className="p-1 bg-white/10 border border-white/20 rounded text-sm text-white" 
                          value={editDraft.mode} 
                          onChange={(e)=>setEditDraft({...editDraft, mode: e.target.value})}
                        >
                          <option value="manual" className="bg-gray-800 text-white">Manual</option>
                          <option value="automatic" className="bg-gray-800 text-white">Automático</option>
                        </select>
                      ) : (
                        (r.mode||'manual')==='automatic'?'Automático':'Manual'
                      )}
                    </td>
                    <td className="py-3 px-2 text-white/70">
                      {editId===r.id ? (
                        <input 
                          type="number" 
                          min={0} 
                          className="p-1 bg-white/10 border border-white/20 rounded text-sm w-20 text-white" 
                          value={editDraft.notify_days} 
                          onChange={(e)=>setEditDraft({...editDraft, notify_days: Number(e.target.value)})} 
                        />
                      ) : (
                        `${Number(r.notify_days ?? 3)} dias`
                      )}
                    </td>
                    <td className="py-3 px-2 text-white/70">
                      {editId===r.id ? (
                        <input 
                          type="date" 
                          className="p-1 bg-white/10 border border-white/20 rounded text-sm text-white" 
                          value={editDraft.next_run} 
                          onChange={(e)=>setEditDraft({...editDraft, next_run: e.target.value})} 
                        />
                      ) : formatYMDToBR(r.next_run)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(r.mode||'manual')==='manual' && st!=='pago' && (
                          <ModernButton
                            variant="success"
                            size="sm"
                            disabled={confirmingId===r.id}
                            onClick={()=>confirmPay(r.id)}
                          >
                            {confirmingId===r.id ? 'Confirmando…' : 'Pagar'}
                          </ModernButton>
                        )}
                        
                        {editId===r.id ? (
                          <>
                            <ModernButton
                              variant="primary"
                              size="sm"
                              onClick={async()=>{
                                try {
                                  await api.put('/api/v1/recurring', { 
                                    id: r.id, 
                                    mode: editDraft.mode, 
                                    next_run: editDraft.next_run, 
                                    notify_days: editDraft.notify_days 
                                  });
                                  setEditId(null);
                                  await load();
                                  showToast('success', 'Gasto fixo atualizado');
                                } catch (e:any) {
                                  const msg = e?.response?.data?.error?.message || e?.message || 'Falha ao salvar';
                                  setError(msg);
                                  showToast('error', msg);
                                }
                              }}
                            >
                              Salvar
                            </ModernButton>
                            <ModernButton
                              variant="secondary"
                              size="sm"
                              onClick={()=>setEditId(null)}
                            >
                              Cancelar
                            </ModernButton>
                          </>
                        ) : (
                          <ModernButton
                            variant="secondary"
                            size="sm"
                            onClick={()=>{ 
                              setEditId(r.id); 
                              setEditDraft({ 
                                mode: (r.mode||'manual'), 
                                next_run: r.next_run, 
                                notify_days: Number(r.notify_days ?? 3) 
                              }); 
                            }}
                          >
                            Editar
                          </ModernButton>
                        )}
                        
                        <ModernButton
                          variant="danger"
                          size="sm"
                          onClick={()=>del(r.id)}
                        >
                          Excluir
                        </ModernButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💳</div>
              <div className="text-lg text-white/80 mb-2">Nenhum gasto encontrado</div>
              <div className="text-sm text-white/60">Ajuste os filtros ou cadastre um novo gasto fixo</div>
            </div>
          )}
        </div>
      </ModernCard>

      {/* Botão de executar automático */}
      <div className="mt-6">
        <ModernButton onClick={runAuto} variant="primary" className="flex items-center gap-2">
          Processar automáticos
        </ModernButton>
        </div>
    </ModernLayout>
  );
}