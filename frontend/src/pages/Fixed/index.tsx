import React from 'react';
import api from '../../services/api';
import { notifyAccountsUpdate } from '../../hooks/useAccounts';

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
  const [form, setForm] = React.useState<any>({ account_id: '', amount: '', description: '', category_id: '', payee_id: '', due_day: new Date().getDate(), mode: 'manual', notify_days: 3 });
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

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      const dueDay = Number(form.due_day || 1);
      const nextRun = new Date(today.getFullYear(), today.getMonth(), dueDay);
      const payload: any = {
        account_id: Number(form.account_id),
        type: 'DESPESA',
        amount: Number(String(form.amount).replace(/\./g,'').replace(',','.')),
        description: form.description || 'Gasto Fixo',
        category_id: form.category_id ? Number(form.category_id) : null,
        payee_id: form.payee_id ? Number(form.payee_id) : null,
        interval_unit: 'month',
        interval_count: 1,
        next_run: nextRun.toISOString().slice(0,10),
        mode: form.mode,
        notify_days: Number(form.notify_days || 3),
      };
      await api.post('/api/v1/recurring', payload);
      setForm({ account_id: '', amount: '', description: '', category_id: '', payee_id: '', due_day: new Date().getDate(), mode: form.mode, notify_days: form.notify_days });
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
    const nr = new Date(r.next_run);
    const lr = r.last_run ? new Date(r.last_run) : null;
    const paidThisMonth = lr && lr >= monthStart && lr <= monthEnd;
    if (paidThisMonth) return 'pago';
    if (nr < today) return 'atrasado';
    return 'pendente';
  };

  const monthForecast = items.filter(r => {
    const nr = new Date(r.next_run);
    return nr >= monthStart && nr <= monthEnd && r.type === 'DESPESA';
  }).reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const filteredItems = items.filter(r => {
    const st = statusOf(r);
    const matchStatus = statusFilter === 'all' ? true : (st === statusFilter);
    const matchAccount = accountFilter ? r.account_id === accountFilter : true;
    return matchStatus && matchAccount;
  });

  return (
    <div className="p-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-3 py-2 rounded shadow-lg border ${toast.type==='success'?'bg-green-500/20 border-green-500/40 text-green-200': toast.type==='info'?'bg-amber-500/20 border-amber-500/40 text-amber-200':'bg-rose-500/20 border-rose-500/40 text-rose-200'}`}>{toast.message}</div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h1 className="heading text-2xl">Gastos Fixos</h1>
        <div className="flex items-center gap-2">
          <button onClick={runAuto} type="button" className="btn-primary text-sm">Processar automáticos</button>
        </div>
      </div>

      {error && (<div className="bg-rose-500/20 border border-rose-500/50 text-rose-200 p-3 rounded mb-4">{error}</div>)}

      <div className="card p-4 mb-6">
        <div className="text-sm text-[color:var(--text-dim)] mb-2">Resumo mensal</div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="surface-2 p-3 rounded border border-white/5">
            <div className="text-xs text-[color:var(--text-dim)]">Previsto (mês)</div>
            <div className="text-lg font-semibold">{fmtCurrency(monthForecast)}</div>
          </div>
          <div className="surface-2 p-3 rounded border border-white/5">
            <div className="text-xs text-[color:var(--text-dim)]">Pendentes</div>
            <div className="text-lg font-semibold">{items.filter(r=>statusOf(r)==='pendente').length}</div>
          </div>
          <div className="surface-2 p-3 rounded border border-white/5">
            <div className="text-xs text-[color:var(--text-dim)]">Atrasados</div>
            <div className="text-lg font-semibold">{items.filter(r=>statusOf(r)==='atrasado').length}</div>
          </div>
        </div>
      </div>

      <form onSubmit={save} className="grid md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs text-[color:var(--text-dim)] mb-1 block">Conta vinculada</label>
          <select aria-label="Conta vinculada" value={form.account_id} onChange={(e)=>setForm({...form, account_id: Number(e.target.value)})} className="input px-2 py-2 text-sm w-full" required>
            <option value="">Selecione uma conta…</option>{accounts.map((a:any)=>(<option key={a.id} value={a.id}>{a.name}</option>))}
          </select>
          <div className="text-[12px] text-[color:var(--text-dim)] mt-1">Conta onde o pagamento será registrado.</div>
        </div>
        <div>
          <label className="text-xs text-[color:var(--text-dim)] mb-1 block">Valor do gasto fixo</label>
          <input aria-label="Valor do gasto fixo" inputMode="decimal" value={form.amount} onChange={(e)=>setForm({...form, amount: e.target.value})} placeholder="Ex.: 1.200,00" className="input px-2 py-2 text-sm w-full" />
          <div className="text-[12px] text-[color:var(--text-dim)] mt-1">Informe o valor mensal em BRL.</div>
        </div>
        <div>
          <label className="text-xs text-[color:var(--text-dim)] mb-1 block">Nome do gasto</label>
          <input aria-label="Nome do gasto" value={form.description} onChange={(e)=>setForm({...form, description: e.target.value})} placeholder="Ex.: Aluguel" className="input px-2 py-2 text-sm w-full" />
          <div className="text-[12px] text-[color:var(--text-dim)] mt-1">Como o gasto será identificado em relatórios.</div>
        </div>
        <div>
          <label className="text-xs text-[color:var(--text-dim)] mb-1 block">Categoria da despesa</label>
          <select aria-label="Categoria da despesa" value={form.category_id} onChange={(e)=>setForm({...form, category_id: e.target.value})} className="input px-2 py-2 text-sm w-full">
            <option value="">Selecione uma categoria…</option>{categories.filter((c:any)=>c.type==='DESPESA').map((c:any)=>(<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <div className="text-[12px] text-[color:var(--text-dim)] mt-1">Usado para agrupar e analisar gastos nos relatórios.</div>
        </div>
        <div>
          <label className="text-xs text-[color:var(--text-dim)] mb-1 block">Favorecido (quem recebe)</label>
          <select aria-label="Favorecido" value={form.payee_id} onChange={(e)=>setForm({...form, payee_id: e.target.value})} className="input px-2 py-2 text-sm w-full">
            <option value="">Selecione um favorecido…</option>{payees.map((p:any)=>(<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
          <div className="text-[12px] text-[color:var(--text-dim)] mt-1">Pessoa ou empresa que recebe o pagamento.</div>
        </div>
        <div>
          <label className="text-xs text-[color:var(--text-dim)] mb-1 block">Dia do vencimento</label>
          <input aria-label="Dia do vencimento" type="number" min={1} max={31} value={form.due_day} onChange={(e)=>setForm({...form, due_day: Number(e.target.value)})} className="input px-2 py-2 text-sm w-full" placeholder="Ex.: 5" />
          <div className="text-[12px] text-[color:var(--text-dim)] mt-1">Dia do mês (1–31) em que o gasto vence.</div>
        </div>
        <div>
          <label className="text-xs text-[color:var(--text-dim)] mb-1 block">Forma de pagamento</label>
          <select aria-label="Forma de pagamento" value={form.mode} onChange={(e)=>setForm({...form, mode: e.target.value})} className="input px-2 py-2 text-sm w-full">
            <option value="manual">Manual (você confirma o pagamento)</option>
            <option value="automatic">Automático (gera na data de vencimento)</option>
          </select>
          <div className="text-[12px] text-[color:var(--text-dim)] mt-1">Escolha se o pagamento será confirmado manualmente ou gerado automaticamente.</div>
        </div>
        <div>
          <label className="text-xs text-[color:var(--text-dim)] mb-1 block">Aviso de vencimento (dias antes)</label>
          <input aria-label="Aviso de vencimento" type="number" min={0} value={form.notify_days} onChange={(e)=>setForm({...form, notify_days: Number(e.target.value)})} className="input px-2 py-2 text-sm w-full" placeholder="Ex.: 3" />
          <div className="text-[12px] text-[color:var(--text-dim)] mt-1">Quantos dias antes do vencimento exibir o alerta.</div>
        </div>
        <div className="md:col-span-2">
          <button className="btn-primary text-sm">Salvar gasto fixo</button>
        </div>
      </form>

      <div className="card p-3 mb-3">
        <div className="grid md:grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-[color:var(--text-dim)] mb-1 block">Filtrar por status</label>
            <select className="input px-2 py-2 text-sm w-full" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value as any)}>
              <option value="all">Todos</option>
              <option value="pendente">Pendentes</option>
              <option value="atrasado">Atrasados</option>
              <option value="pago">Pagos</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[color:var(--text-dim)] mb-1 block">Filtrar por conta</label>
            <select className="input px-2 py-2 text-sm w-full" value={accountFilter} onChange={(e)=>setAccountFilter(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Todas</option>
              {accounts.map((a:any)=>(<option key={a.id} value={a.id}>{a.name}</option>))}
            </select>
          </div>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">Descrição</th>
              <th className="p-2">Conta</th>
              <th className="p-2 tnum">Valor</th>
              <th className="p-2">Modo</th>
              <th className="p-2">Aviso (dias)</th>
              <th className="p-2">Vencimento</th>
              <th className="p-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((r) => {
              const accName = accounts.find((a:any)=>a.id===r.account_id)?.name || r.account_id;
              const st = statusOf(r);
              return (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.description||'Gasto Fixo'}</td>
                  <td className="p-2">{accName}</td>
                  <td className="p-2 tnum">{fmtCurrency(Number(r.amount||0))}</td>
                  <td className="p-2">
                    {editId===r.id ? (
                      <select className="input px-2 py-1 text-sm" value={editDraft.mode} onChange={(e)=>setEditDraft({...editDraft, mode: e.target.value})}>
                        <option value="manual">Manual</option>
                        <option value="automatic">Automático</option>
                      </select>
                    ) : (
                      (r.mode||'manual')==='automatic'?'Automático':'Manual'
                    )}
                  </td>
                  <td className="p-2">
                    {editId===r.id ? (
                      <input type="number" min={0} className="input px-2 py-1 text-sm w-24" value={editDraft.notify_days} onChange={(e)=>setEditDraft({...editDraft, notify_days: Number(e.target.value)})} />
                    ) : (
                      Number(r.notify_days ?? 3)
                    )}
                  </td>
                  <td className="p-2">
                    {editId===r.id ? (
                      <input type="date" className="input px-2 py-1 text-sm" value={editDraft.next_run} onChange={(e)=>setEditDraft({...editDraft, next_run: e.target.value})} />
                    ) : r.next_run}
                  </td>
                  <td className="p-2 text-right">
                    {(r.mode||'manual')==='manual' && st!=='pago' && (
                      <button disabled={confirmingId===r.id} onClick={()=>confirmPay(r.id)} className="px-3 py-1 rounded border border-white/10 hover:border-white/20 disabled:opacity-50" title={st==='atrasado'?'Vencido: confirmar cria a transação hoje':''}>{confirmingId===r.id?'Confirmando…':'Confirmar pagamento'}</button>
                    )}
                    {editId===r.id ? (
                      <>
                        <button
                          className="ml-2 px-3 py-1 rounded border border-white/10 hover:border-white/20"
                          onClick={async()=>{
                            try {
                              await api.put('/api/v1/recurring', { id: r.id, mode: editDraft.mode, next_run: editDraft.next_run, notify_days: editDraft.notify_days });
                              setEditId(null);
                              await load();
                              showToast('success', 'Gasto fixo atualizado');
                            } catch (e:any) {
                              const msg = e?.response?.data?.error?.message || e?.message || 'Falha ao salvar';
                              setError(msg);
                              showToast('error', msg);
                            }
                          }}
                        >Salvar</button>
                        <button className="ml-2 text-[color:var(--text-dim)] hover:underline" onClick={()=>setEditId(null)}>Cancelar</button>
                      </>
                    ) : (
                      <button className="ml-2 text-[color:var(--text-dim)] hover:underline" onClick={()=>{ setEditId(r.id); setEditDraft({ mode: (r.mode||'manual'), next_run: r.next_run, notify_days: Number(r.notify_days ?? 3) }); }}>Editar</button>
                    )}
                    <button onClick={()=>del(r.id)} className="ml-2 text-red-500 hover:underline">Excluir</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}