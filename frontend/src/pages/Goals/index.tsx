import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { fmtCurrency } from '../../utils/format';
import { useGoals, notifyGoalsUpdate } from '../../hooks/useGoals';
import ModernLayout, { ModernCard, ModernButton } from '../../components/Layout/ModernLayout';
import { 
  TargetIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  ArchiveIcon,
  LoadingIcon
} from '../../components/Icons';

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
  current_amount?: number;
  remaining?: number;
  percent?: number;
  months_left?: number | null;
  suggested_monthly?: number | null;
  status?: string;
};

export default function Goals() {
  const location = useLocation();
  const navigate = useNavigate();
  const { goals: items, refreshGoals } = useGoals();
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [showContrib, setShowContrib] = useState<Goal | null>(null);
  
  // Detectar parâmetro contribute na URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const contributeId = params.get('contribute');
    if (contributeId && items.length > 0) {
      const goal = items.find(g => g.id === parseInt(contributeId));
      if (goal) {
        setShowContrib(goal);
        // Limpar o parâmetro da URL
        navigate('/goals', { replace: true });
      }
    }
  }, [location.search, items, navigate]);

  const openCreate = () => { setEditing(null); setShowNew(true); };
  const openEdit = (g: Goal) => { setEditing(g); setShowNew(true); };
  const onSaved = async () => { setShowNew(false); await refreshGoals(); };

  const remove = async (g: Goal) => {
    const ok = window.confirm('Deseja excluir esta meta? Esta ação é irreversível e removerá permanentemente todos os dados relacionados.');
    if (!ok) return;
    try {
      await api.delete('/api/v1/goals', { params: { id: g.id } });
      await refreshGoals();
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

  const activeGoals = sorted.filter(g => !g.archived_at);
  const completedGoals = sorted.filter(g => (g.current_amount || g.accumulated || 0) >= (g.target_amount || 0));

  return (
    <ModernLayout 
      title="Metas" 
      subtitle={`${activeGoals.length} metas ativas • ${completedGoals.length} concluídas`}
      headerActions={
        <ModernButton onClick={openCreate} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          <PlusIcon size={18} />
          Nova Meta
        </ModernButton>
      }
    >
      {/* Cards para mobile e desktop */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sorted.map((g) => {
          const pct = Math.min(100, Math.max(0, Math.round(g.percent || 0)));
          const done = (g.current_amount || g.accumulated || 0) >= (g.target_amount || 0);
          const isDebt = g.type === 'quitar_divida';
          
          return (
            <ModernCard key={g.id} className={`${done ? 'border-green-500/30 bg-green-500/5' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isDebt 
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500' 
                      : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                  }`}>
                    <TargetIcon className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white truncate">{g.name}</h3>
                    <p className="text-xs text-white/60">
                      {isDebt ? 'Quitar Dívida' : 'Poupança'} • {g.target_date || 'Sem prazo'}
                    </p>
                  </div>
                </div>
                
                {done && (
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">Progresso</span>
                    <span className="text-white font-medium">{pct}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        done 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                          : isDebt 
                            ? 'bg-gradient-to-r from-pink-500 to-rose-500'
                            : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                      }`}
                      style={{width: `${pct}%`}}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-white/60">Atual</p>
                    <p className="text-sm font-semibold text-white">
                      {fmtCurrency(g.current_amount || g.accumulated || 0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/60">Meta</p>
                    <p className="text-sm font-semibold text-white">
                      {fmtCurrency(g.target_amount || 0)}
                    </p>
                  </div>
                </div>

                {!done && (g.remaining || 0) > 0 && (
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <p className="text-xs text-white/60">Faltam</p>
                    <p className="text-sm font-semibold text-white">
                      {fmtCurrency(g.remaining || 0)}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                <ModernButton
                  onClick={() => openEdit(g)}
                  size="sm"
                  className="flex-1 bg-white/10 hover:bg-white/20"
                >
                  <EditIcon size={14} />
                  Editar
                </ModernButton>
                <ModernButton
                  onClick={() => remove(g)}
                  size="sm"
                  variant="danger"
                  className="opacity-70 hover:opacity-100"
                >
                  <TrashIcon size={14} />
                </ModernButton>
              </div>
            </ModernCard>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <ModernCard>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <TargetIcon className="text-white/50" size={24} />
            </div>
            <p className="text-white/70 text-lg mb-2">Nenhuma meta cadastrada</p>
            <p className="text-white/50 text-sm mb-6">Crie suas primeiras metas financeiras para começar a poupar</p>
            <ModernButton 
              onClick={openCreate}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <PlusIcon size={18} />
              Criar Primeira Meta
            </ModernButton>
          </div>
        </ModernCard>
      )}



      {showNew && (
        <GoalModal
          goal={editing}
          onClose={() => setShowNew(false)}
          onSaved={onSaved}
        />
      )}
      {showContrib && (
        <ContributeModal goal={showContrib} onClose={() => setShowContrib(null)} onSaved={refreshGoals} />
      )}
    </ModernLayout>
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
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[color:var(--text)]">
                  Tipo de Meta <span className="text-red-400">*</span>
                </label>
                <select className="input px-3 py-2 w-full" value={type} onChange={(e)=>setType(e.target.value as any)}>
                  <option value="poupanca">💰 Poupança</option>
                  <option value="quitar_divida">💳 Quitar Dívida</option>
                </select>
              </div>
              
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
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
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
                <p className="text-xs text-[color:var(--text-dim)]">Quando deseja atingir a meta (opcional)</p>
              </div>
            </div>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[color:var(--text)]">
                Estratégia
              </label>
              <select className="input px-3 py-2 w-full" value={strategy} onChange={(e)=>setStrategy(e.target.value as any)}>
                <option value="linear">📈 Linear (valor fixo mensal)</option>
                <option value="por_alocacao">🎯 Por Alocação (% da receita)</option>
              </select>
              <p className="text-xs text-[color:var(--text-dim)]">Como deseja aportar para esta meta</p>
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
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[color:var(--text)]">
                Conta Associada
              </label>
              <select className="input px-3 py-2 w-full" value={accountId} onChange={(e)=>setAccountId(e.target.value? Number(e.target.value): '')}>
                <option value="">Selecione uma conta (opcional)</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <p className="text-xs text-[color:var(--text-dim)]">Conta onde os aportes serão registrados</p>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[color:var(--text)]">
                Categoria Associada
              </label>
              <select className="input px-3 py-2 w-full" value={categoryId} onChange={(e)=>setCategoryId(e.target.value? Number(e.target.value): '')}>
                <option value="">Selecione uma categoria (opcional)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-[color:var(--text-dim)]">Categoria para classificar os aportes</p>
            </div>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[color:var(--text)]">
                Aporte Mensal Planejado
              </label>
              <input 
                inputMode="decimal" 
                className="input px-3 py-2 tnum w-full" 
                placeholder="R$ 0,00 (opcional)" 
                value={plannedMonthly} 
                onChange={(e)=>setPlannedMonthly(e.target.value)}
              />
              <p className="text-xs text-[color:var(--text-dim)]">Valor que planeja aportar mensalmente</p>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[color:var(--text)]">
                Dia de Recorrência
              </label>
              <input 
                type="number" 
                min="1" 
                max="31" 
                className="input px-3 py-2 w-full" 
                placeholder="Dia do mês (1-31)" 
                value={recurringDay} 
                onChange={(e)=>setRecurringDay(e.target.value)}
              />
              <p className="text-xs text-[color:var(--text-dim)]">Dia do mês para aportes automáticos (opcional)</p>
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
  const [sourceAccountId, setSourceAccountId] = useState<number | ''>('');
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
        if ((a.data.data||[]).length) setSourceAccountId(a.data.data[0].id);
      } catch {}
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    const payload: any = { id: goal.id, amount: Number(amount||0), date };
    if (accountId) payload.account_id = accountId;
    if (categoryId) payload.category_id = categoryId;
    if (sourceAccountId) payload.source_account_id = sourceAccountId;
    if (!payload.amount) { setError('Informe um valor para o aporte'); setSaving(false); return; }
    if (!accountId && !goal.account_id) { setError('Selecione uma conta destino para o aporte'); setSaving(false); return; }
    if (!sourceAccountId) { setError('Selecione uma conta origem para o aporte'); setSaving(false); return; }
    if (sourceAccountId === accountId) { setError('A conta origem deve ser diferente da conta destino'); setSaving(false); return; }
    try {
      await api.post('/api/v1/goals/contribute', payload);
      // Aguardar um pouco para garantir que as transações foram processadas
      await new Promise(resolve => setTimeout(resolve, 500));
      // Recarregar os dados das metas e notificar outros componentes
      await onSaved();
      notifyGoalsUpdate();
      onClose();
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
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <select className="input px-2 py-2" value={sourceAccountId} onChange={(e)=>setSourceAccountId(e.target.value? Number(e.target.value): '')}>
                <option value="">Conta origem…</option>
                {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
              </select>
              <select className="input px-2 py-2" value={accountId} onChange={(e)=>setAccountId(e.target.value? Number(e.target.value): '')}>
                <option value="">Conta destino…</option>
                {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
              </select>
            </div>
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
