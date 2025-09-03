import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { fmtCurrency } from '../../utils/format';

type Goal = {
  id: number;
  name: string;
  type: 'poupanca' | 'quitar_divida';
  target_amount: number;
  initial_amount: number | null;
  strategy: 'linear' | 'por_alocacao';
  account_id?: number | null;
  category_id?: number | null;
  target_date?: string | null;
  planned_monthly_amount?: number | null;
  recurring_day?: number | null;
  priority?: 'baixa' | 'media' | 'alta';
  archived_at?: string | null;
  accumulated?: number;
  remaining?: number;
  percent?: number;
  months_left?: number | null;
  suggested_monthly?: number | null;
  status?: string;
};

export default function Goals() {
  const [items, setItems] = useState<Goal[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [showContrib, setShowContrib] = useState<Goal | null>(null);
  const load = async () => {
    const r = await api.get('/api/v1/goals');
    setItems(r.data.data || []);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setShowNew(true); };
  const openEdit = (g: Goal) => { setEditing(g); setShowNew(true); };
  const onSaved = async () => { setShowNew(false); await load(); };

  const remove = async (g: Goal) => {
    const ok = window.confirm('Deseja excluir esta meta? Esta ação é irreversível e removerá permanentemente todos os dados relacionados.');
    if (!ok) return;
    try {
      await api.delete('/api/v1/goals', { params: { id: g.id } });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error?.message || 'Não foi possível excluir');
    }
  };

  const sorted = useMemo(() => {
    return [...items].sort((a,b) => {
      const ap = a.priority==='alta'?0: a.priority==='media'?1:2;
      const bp = b.priority==='alta'?0: b.priority==='media'?1:2;
      if (ap!==bp) return ap-bp;
      const ad = a.target_date? new Date(a.target_date).getTime(): Number.MAX_SAFE_INTEGER;
      const bd = b.target_date? new Date(b.target_date).getTime(): Number.MAX_SAFE_INTEGER;
      return ad-bd;
    });
  }, [items]);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="heading text-2xl">Metas</h1>
        <button className="btn-primary" onClick={openCreate}>+ Nova Meta</button>
      </div>
      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {sorted.map((g) => {
          const pct = Math.min(100, Math.max(0, Math.round(g.percent || 0)));
          const done = (g.accumulated || 0) >= (g.target_amount || 0);
          return (
            <div key={g.id} className="surface-2 rounded-lg p-3 border border-white/5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate flex items-center gap-2"><span className={`inline-block w-2 h-2 rounded-full ${g.type==='quitar_divida' ? 'bg-pink-400' : 'bg-cyan-400'}`} />{g.name}</div>
                  <div className="text-xs text-[color:var(--text-dim)]">Prazo: {g.target_date || '-'} • {pct}%</div>
                </div>
                <div className="text-right">
                  <div className="text-sm tnum">{fmtCurrency(g.accumulated || 0)} / {fmtCurrency(g.target_amount || 0)}</div>
                  <div className="text-[11px] text-[color:var(--text-dim)]">Faltam {fmtCurrency(g.remaining || 0)}</div>
                </div>
              </div>
              <div className="h-2 rounded mt-2 bg-white/5">
                <div className={`h-2 rounded ${g.type==='quitar_divida' ? 'bg-gradient-to-r from-pink-400 to-rose-400' : 'bg-gradient-to-r from-cyan-400 to-fuchsia-400'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-end gap-4 mt-2 text-sm">
                {!done && (
                  <button className="text-cyan-300 hover:text-cyan-200" onClick={() => setShowContrib(g)}>Aportar</button>
                )}
                <button className="text-[color:var(--text-dim)] hover:text-[color:var(--text)]" onClick={() => openEdit(g)}>Editar</button>
                <button className="text-rose-300 hover:text-rose-200" onClick={() => remove(g)}>Excluir</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-auto card">
        <table className="min-w-[900px] w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">Meta</th>
              <th className="p-2 tnum">Alvo</th>
              <th className="p-2 tnum">Acumulado</th>
              <th className="p-2 tnum">Faltam</th>
              <th className="p-2 tnum">%</th>
              <th className="p-2">Prazo</th>
              <th className="p-2 tnum">Aporte sugerido/mês</th>
              <th className="p-2">Status</th>
              <th className="p-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((g) => {
              const pct = Math.min(100, Math.max(0, Math.round(g.percent || 0)));
              const done = (g.accumulated || 0) >= (g.target_amount || 0);
              return (
                <tr key={g.id} className="border-t border-white/5 align-top">
                  <td className="p-2">
                    <div className="font-medium flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${g.type==='quitar_divida' ? 'bg-pink-400' : 'bg-cyan-400'}`} />
                      {g.name}
                    </div>
                    <div className="h-2 rounded mt-2 bg-white/5">
                      <div className={`h-2 rounded ${g.type==='quitar_divida' ? 'bg-gradient-to-r from-pink-400 to-rose-400' : 'bg-gradient-to-r from-cyan-400 to-fuchsia-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td className="p-2 tnum">{fmtCurrency(g.target_amount || 0)}</td>
                  <td className="p-2 tnum">{fmtCurrency(g.accumulated || 0)}</td>
                  <td className="p-2 tnum">{fmtCurrency(g.remaining || 0)}</td>
                  <td className="p-2 tnum">{pct}%</td>
                  <td className="p-2">{g.target_date || '-'}</td>
                  <td className="p-2 tnum">{g.suggested_monthly ? fmtCurrency(g.suggested_monthly) : '-'}</td>
                  <td className="p-2">{done ? 'Concluída' : 'Ativa'}</td>
                  <td className="p-2 text-right">
                    <div className="flex gap-2 justify-end">
                      {!done && (
                        <button className="text-cyan-300 hover:text-cyan-200" onClick={() => setShowContrib(g)}>Aportar</button>
                      )}
                      <button className="text-[color:var(--text-dim)] hover:text-[color:var(--text)]" onClick={() => openEdit(g)}>Editar</button>
                      <button className="text-rose-300 hover:text-rose-200" onClick={() => remove(g)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showNew && (
        <GoalModal
          goal={editing}
          onClose={() => setShowNew(false)}
          onSaved={onSaved}
        />
      )}
      {showContrib && (
        <ContributeModal goal={showContrib} onClose={() => setShowContrib(null)} onSaved={load} />
      )}
    </div>
  );
}

function GoalModal({ goal, onClose, onSaved }: { goal: Goal | null; onClose: () => void; onSaved: () => void }){
  const editing = !!goal;
  const [name, setName] = useState(goal?.name || '');
  const [type, setType] = useState<Goal['type']>(goal?.type || 'poupanca');
  const [target, setTarget] = useState<string>(goal ? String(goal.target_amount || '') : '');
  const [initial, setInitial] = useState<string>(goal && goal.initial_amount!=null ? String(goal.initial_amount) : '');
  const [strategy, setStrategy] = useState<Goal['strategy']>(goal?.strategy || 'linear');
  const [accountId, setAccountId] = useState<number | ''>(goal?.account_id || '');
  const [categoryId, setCategoryId] = useState<number | ''>(goal?.category_id || '');
  const [targetDate, setTargetDate] = useState<string>(goal?.target_date || '');
  const [plannedMonthly, setPlannedMonthly] = useState<string>(goal && goal.planned_monthly_amount!=null ? String(goal.planned_monthly_amount) : '');
  const [recurringDay, setRecurringDay] = useState<string>(goal && goal.recurring_day!=null ? String(goal.recurring_day) : '');
  const [priority, setPriority] = useState<Goal['priority']>(goal?.priority || 'media');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [a,c] = await Promise.all([
          api.get('/api/v1/accounts'),
          api.get('/api/v1/categories'),
        ]);
        setAccounts(a.data.data||[]);
        setCategories(c.data.data||[]);
      } catch {}
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    const payload: any = {
      name,
      type,
      target_amount: Number(target||0),
      initial_amount: initial!==''? Number(initial): 0,
      strategy,
      account_id: accountId || null,
      category_id: categoryId || null,
      target_date: targetDate || null,
      planned_monthly_amount: plannedMonthly!==''? Number(plannedMonthly): null,
      recurring_day: recurringDay!==''? Number(recurringDay): null,
      priority,
    };
    // client validations
    if (!payload.name || payload.target_amount<=0) { setError('Informe um nome e um valor de alvo válido'); setSaving(false); return; }
    if (payload.target_date && payload.target_date < new Date().toISOString().slice(0,10)) { setError('A data limite não pode estar no passado'); setSaving(false); return; }
    if (payload.strategy==='por_alocacao' && !payload.account_id && !payload.category_id) { setError('Selecione uma conta ou categoria para a estratégia por alocação'); setSaving(false); return; }
    try {
      if (editing && goal) {
        await api.put('/api/v1/goals', { id: goal.id, ...payload });
      } else {
        await api.post('/api/v1/goals', payload);
      }
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="surface-2 rounded-lg p-6 w-[min(800px,95vw)] max-h-[90vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="heading text-xl font-semibold">{editing? 'Editar Meta' : 'Nova Meta'}</h2>
          <button className="text-[color:var(--text-dim)] hover:text-[color:var(--text)] p-1" onClick={onClose}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={submit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-[color:var(--text)] border-b border-white/10 pb-2">Informações Básicas</h3>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[color:var(--text)]">
                  Nome da Meta <span className="text-red-400">*</span>
                </label>
                <input 
                  className="input px-3 py-2 w-full" 
                  placeholder="Ex: Viagem para Europa" 
                  value={name} 
                  onChange={(e)=>setName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[color:var(--text)]">
                  Tipo de Meta <span className="text-red-400">*</span>
                </label>
                <select className="input px-3 py-2 w-full" value={type} onChange={(e)=>setType(e.target.value as any)}>
                  <option value="poupanca">💰 Poupança</option>
                  <option value="quitar_divida">💳 Quitar Dívida</option>
                </select>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[color:var(--text)]">
                  Valor Alvo <span className="text-red-400">*</span>
                </label>
                <input 
                  inputMode="decimal" 
                  className="input px-3 py-2 tnum w-full" 
                  placeholder="R$ 0,00" 
                  value={target} 
                  onChange={(e)=>setTarget(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[color:var(--text)]">
                  Valor Inicial
                </label>
                <input 
                  inputMode="decimal" 
                  className="input px-3 py-2 tnum w-full" 
                  placeholder="R$ 0,00 (opcional)" 
                  value={initial} 
                  onChange={(e)=>setInitial(e.target.value)}
                />
                <p className="text-xs text-[color:var(--text-dim)]">Valor já poupado para esta meta</p>
              </div>
            </div>
          </div>
          
          {/* Estratégia e Configurações */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-[color:var(--text)] border-b border-white/10 pb-2">Estratégia e Configurações</h3>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[color:var(--text)]">
                  Estratégia
                </label>
                <select className="input px-3 py-2 w-full" value={strategy} onChange={(e)=>setStrategy(e.target.value as any)}>
                  <option value="linear">📈 Linear (valor fixo mensal)</option>
                  <option value="por_alocacao">🎯 Por Alocação (% de receitas)</option>
                </select>
                <p className="text-xs text-[color:var(--text-dim)]">
                  {strategy === 'linear' ? 'Aportes fixos mensais' : 'Aportes baseados em % das receitas'}
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[color:var(--text)]">
                  Prioridade
                </label>
                <select className="input px-3 py-2 w-full" value={priority} onChange={(e)=>setPriority(e.target.value as any)}>
                  <option value="baixa">🟢 Baixa</option>
                  <option value="media">🟡 Média</option>
                  <option value="alta">🔴 Alta</option>
                </select>
              </div>
            </div>
            
            {strategy === 'por_alocacao' && (
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-blue-400 mb-3">Para estratégia por alocação, selecione uma conta ou categoria:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-[color:var(--text)]">
                      Conta
                    </label>
                    <select className="input px-3 py-2 w-full" value={accountId} onChange={(e)=>setAccountId(e.target.value? Number(e.target.value): '')}>
                      <option value="">Selecionar conta...</option>
                      {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-[color:var(--text)]">
                      Categoria
                    </label>
                    <select className="input px-3 py-2 w-full" value={categoryId} onChange={(e)=>setCategoryId(e.target.value? Number(e.target.value): '')}>
                      <option value="">Selecionar categoria...</option>
                      {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Planejamento */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-[color:var(--text)] border-b border-white/10 pb-2">Planejamento</h3>
            
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[color:var(--text)]">
                  Data Limite
                </label>
                <input 
                  type="date" 
                  className="input px-3 py-2 w-full" 
                  value={targetDate} 
                  onChange={(e)=>setTargetDate(e.target.value)}
                  min={new Date().toISOString().slice(0,10)}
                />
                <p className="text-xs text-[color:var(--text-dim)]">Quando deseja atingir a meta</p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[color:var(--text)]">
                  Aporte Mensal Planejado
                </label>
                <input 
                  inputMode="decimal" 
                  className="input px-3 py-2 tnum w-full" 
                  placeholder="R$ 0,00" 
                  value={plannedMonthly} 
                  onChange={(e)=>setPlannedMonthly(e.target.value)}
                />
                <p className="text-xs text-[color:var(--text-dim)]">Valor que planeja aportar mensalmente</p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[color:var(--text)]">
                  Dia do Aporte
                </label>
                <input 
                  inputMode="numeric" 
                  className="input px-3 py-2 w-full" 
                  placeholder="Ex: 5" 
                  value={recurringDay} 
                  onChange={(e)=>setRecurringDay(e.target.value)}
                  min="1"
                  max="28"
                />
                <p className="text-xs text-[color:var(--text-dim)]">Dia do mês para aportes (1-28)</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button 
              type="button" 
              className="px-4 py-2 rounded-lg border border-white/20 hover:border-white/30 transition-colors" 
              onClick={onClose}
            >
              Cancelar
            </button>
            <button 
              className="btn-primary px-6 py-2" 
              disabled={saving}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Salvando...
                </span>
              ) : (
                editing ? 'Atualizar Meta' : 'Criar Meta'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ContributeModal({ goal, onClose, onSaved }: { goal: Goal; onClose: () => void; onSaved: () => void }){
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [accountId, setAccountId] = useState<number | ''>(goal.account_id || '');
  const [categoryId, setCategoryId] = useState<number | ''>(goal.category_id || '');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [a,c] = await Promise.all([
          api.get('/api/v1/accounts'),
          api.get('/api/v1/categories'),
        ]);
        setAccounts(a.data.data||[]);
        setCategories(c.data.data||[]);
        if (!goal.account_id && (a.data.data||[]).length) setAccountId(a.data.data[0].id);
      } catch {}
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    const payload: any = { id: goal.id, amount: Number(amount||0), date };
    if (accountId) payload.account_id = accountId;
    if (categoryId) payload.category_id = categoryId;
    if (!payload.amount) { setError('Informe um valor para o aporte'); setSaving(false); return; }
    if (!accountId && !goal.account_id) { setError('Selecione uma conta para o aporte'); setSaving(false); return; }
    try {
      await api.post('/api/v1/goals/contribute', payload);
      onSaved(); onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Erro ao aportar');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="surface-2 rounded-lg p-4 w-[min(520px,95vw)]" onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="heading text-lg">Aportar em: {goal.name}</h2>
          <button className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--text)]" onClick={onClose}>Fechar</button>
        </div>
        {error && <div className="mb-2 text-sm text-rose-300">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3 items-center">
            <input inputMode="decimal" className="input px-2 py-2 tnum" placeholder="Valor do aporte" value={amount} onChange={(e)=>setAmount(e.target.value)} />
            <input type="date" className="input px-2 py-2" value={date} onChange={(e)=>setDate(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <select className="input px-2 py-2" value={accountId} onChange={(e)=>setAccountId(e.target.value? Number(e.target.value): '')}>
              <option value="">Conta…</option>
              {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
            </select>
            <select className="input px-2 py-2" value={categoryId} onChange={(e)=>setCategoryId(e.target.value? Number(e.target.value): '')}>
              <option value="">Categoria…</option>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="px-3 py-2 rounded border border-white/10 hover:border-white/20" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" disabled={saving}>{saving? 'Salvando…':'Aportar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
