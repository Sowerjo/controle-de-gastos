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
  const [includeArchived, setIncludeArchived] = useState(false);

  const load = async () => {
    const r = await api.get('/api/v1/goals', { params: { includeArchived: includeArchived ? '1' : '0' } });
    setItems(r.data.data || []);
  };
  useEffect(() => { load(); }, [includeArchived]);

  const openCreate = () => { setEditing(null); setShowNew(true); };
  const openEdit = (g: Goal) => { setEditing(g); setShowNew(true); };
  const onSaved = async () => { setShowNew(false); await load(); };

  const archive = async (g: Goal) => {
    await api.post('/api/v1/goals/archive', { id: g.id });
    await load();
  };

  const remove = async (g: Goal) => {
    const ok = window.confirm('Deseja excluir esta meta? Esta ação é irreversível.');
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
        <div className="flex items-center gap-3">
          <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={includeArchived} onChange={(e)=>setIncludeArchived(e.target.checked)} /> Mostrar arquivadas</label>
          <button className="btn-primary" onClick={openCreate}>+ Nova Meta</button>
        </div>
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
                {!g.archived_at && !done && (
                  <button className="text-cyan-300 hover:text-cyan-200" onClick={() => setShowContrib(g)}>Aportar</button>
                )}
                {!g.archived_at && (
                  <button className="text-[color:var(--text-dim)] hover:text-[color:var(--text)]" onClick={() => openEdit(g)}>Editar</button>
                )}
                {!g.archived_at && (
                  <button className="text-pink-300 hover:text-pink-200" onClick={() => archive(g)}>{done ? 'Concluir' : 'Arquivar'}</button>
                )}
                {g.archived_at && (
                  <button className="text-rose-300 hover:text-rose-200" onClick={() => remove(g)}>Excluir</button>
                )}
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
                  <td className="p-2">{g.archived_at ? 'Arquivada' : (done ? 'Concluída' : 'Ativa')}</td>
                  <td className="p-2 text-right">
                    <div className="flex gap-2 justify-end">
                      {!g.archived_at && !done && (
                        <button className="text-cyan-300 hover:text-cyan-200" onClick={() => setShowContrib(g)}>Aportar</button>
                      )}
                      {!g.archived_at && (
                        <button className="text-[color:var(--text-dim)] hover:text-[color:var(--text)]" onClick={() => openEdit(g)}>Editar</button>
                      )}
                      {!g.archived_at && (
                        <button className="text-pink-300 hover:text-pink-200" onClick={() => archive(g)}>{done ? 'Concluir' : 'Arquivar'}</button>
                      )}
                      {g.archived_at && (
                        <button className="text-rose-300 hover:text-rose-200" onClick={() => remove(g)}>Excluir</button>
                      )}
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
      if (editing) {
        await api.put('/api/v1/goals', { id: goal!.id, ...payload });
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
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="surface-2 rounded-lg p-4 w-[min(720px,95vw)]" onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="heading text-lg">{editing? 'Editar meta' : 'Nova meta'}</h2>
          <button className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--text)]" onClick={onClose}>Fechar</button>
        </div>
        {error && <div className="mb-2 text-sm text-rose-300">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="input px-2 py-2" placeholder="Nome da meta" value={name} onChange={(e)=>setName(e.target.value)} />
            <select className="input px-2 py-2" value={type} onChange={(e)=>setType(e.target.value as any)}>
              <option value="poupanca">Poupança</option>
              <option value="quitar_divida">Quitar dívida</option>
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 items-center">
            <input inputMode="decimal" className="input px-2 py-2 tnum" placeholder="Valor alvo" value={target} onChange={(e)=>setTarget(e.target.value)} />
            <input inputMode="decimal" className="input px-2 py-2 tnum" placeholder="Valor inicial (opcional)" value={initial} onChange={(e)=>setInitial(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <select className="input px-2 py-2" value={strategy} onChange={(e)=>setStrategy(e.target.value as any)}>
              <option value="linear">Linear</option>
              <option value="por_alocacao">Por alocação</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <select className="input px-2 py-2" value={accountId} onChange={(e)=>setAccountId(e.target.value? Number(e.target.value): '')}>
                <option value="">Conta…</option>
                {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
              </select>
              <select className="input px-2 py-2" value={categoryId} onChange={(e)=>setCategoryId(e.target.value? Number(e.target.value): '')}>
                <option value="">Categoria…</option>
                {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 items-center">
            <input type="date" className="input px-2 py-2" value={targetDate} onChange={(e)=>setTargetDate(e.target.value)} />
            <input inputMode="decimal" className="input px-2 py-2 tnum" placeholder="Aporte planejado / mês (opcional)" value={plannedMonthly} onChange={(e)=>setPlannedMonthly(e.target.value)} />
            <input inputMode="numeric" className="input px-2 py-2" placeholder="Dia do mês (1-28) opcional" value={recurringDay} onChange={(e)=>setRecurringDay(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3 items-center">
            <select className="input px-2 py-2" value={priority} onChange={(e)=>setPriority(e.target.value as any)}>
              <option value="baixa">Prioridade baixa</option>
              <option value="media">Prioridade média</option>
              <option value="alta">Prioridade alta</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="px-3 py-2 rounded border border-white/10 hover:border-white/20" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" disabled={saving}>{saving? 'Salvando…':'Salvar'}</button>
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
    if (!payload.amount || (!goal.account_id && !payload.account_id)) { setError('Informe um valor e selecione a conta'); setSaving(false); return; }
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
