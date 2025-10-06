import React from 'react';
import api from '../services/api';
import TagsInput from './TagsInput';
import { notifyAccountsUpdate } from '../hooks/useAccounts';
import CurrencyInput, { parseBRNumber } from './CurrencyInput';

type Payee = { id: number; name: string };
type Split = { amount: string; description: string; categoryId?: number | ''; payeeId?: number | '' };

export default function NewTransactionModal({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [payees, setPayees] = React.useState<Payee[]>([]);
  const [accountId, setAccountId] = React.useState<number | ''>('');
  const [type, setType] = React.useState<'receita' | 'despesa' | 'transfer'>('despesa');
  const [date, setDate] = React.useState<string>(new Date().toISOString().slice(0,10));
  const [amount, setAmount] = React.useState<string>('');
  const [description, setDescription] = React.useState<string>('');
  const [categoryId, setCategoryId] = React.useState<number | ''>('');
  const [payeeName, setPayeeName] = React.useState<string>('');
  const [tagChips, setTagChips] = React.useState<{ id: number; name: string }[]>([]);
  const [splits, setSplits] = React.useState<Split[]>([]);
  const [useSplit, setUseSplit] = React.useState(false);
  const [toAccountId, setToAccountId] = React.useState<number | ''>('');
  const [errors, setErrors] = React.useState<{ amount?: string; accountId?: string; toAccountId?: string } >({});
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string>('');

  React.useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-new-transaction' as any, handler as any);
    return () => window.removeEventListener('open-new-transaction' as any, handler as any);
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        const [a, c, p] = await Promise.all([
          api.get('/api/v1/accounts'),
          api.get('/api/v1/categories'),
          api.get('/api/v1/payees'),
        ]);
        setAccounts(a.data.data || []);
        setCategories(c.data.data || []);
        setPayees(p.data.data || []);
        if ((a.data.data || []).length) setAccountId(a.data.data[0].id);
      } catch {}
    })();
  }, [open]);

  const close = () => setOpen(false);
  const reset = () => {
    setType('despesa'); setDate(new Date().toISOString().slice(0,10)); setAmount(''); setDescription(''); setCategoryId(''); setPayeeName(''); setTagChips([]); setSplits([]); setUseSplit(false); setToAccountId(''); setErrors({}); setSubmitting(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: any = {};
    if (!accountId) newErrors.accountId = 'Selecione uma conta';
    if (!amount) newErrors.amount = 'Informe um valor';
    const numericAmount = parseBRNumber(String(amount ?? ''));
    if (type === 'transfer') {
      if (!toAccountId) newErrors.toAccountId = 'Selecione a conta de destino';
    }
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }
    setErrors({});
    setSubmitting(true);
    try {
      if (type === 'transfer') {
        if (!toAccountId || !numericAmount) return;
        // Create paired transactions: saída from origin and entrada to destination
        const base = { description: description || 'Transferência', date: date } as any;
        await api.post('/api/v1/transactions', { ...base, amount: numericAmount, type: 'DESPESA', accountId: accountId });
        await api.post('/api/v1/transactions', { ...base, amount: numericAmount, type: 'RECEITA', accountId: toAccountId });
      } else {
        const payload: any = { 
          amount: numericAmount, 
          description: description, 
          date: date, 
          type: type.toUpperCase(), 
          accountId: accountId 
        };
        if (payeeName) payload.payeeName = payeeName;
        if (categoryId) payload.categoryId = categoryId;
        if (tagChips.length) payload.tagNames = tagChips.map(t => t.name);
        if (useSplit && splits.length) payload.splits = splits.filter(s => s.amount).map(s => ({ amount: parseBRNumber(String(s.amount)), description: s.description, categoryId: s.categoryId || null, payeeId: s.payeeId || null }));
        await api.post('/api/v1/transactions', payload);
      }
    } catch (err) {
      setSubmitError('Falha ao salvar. Verifique os dados e tente novamente.');
      setSubmitting(false);
      return;
    }
    window.dispatchEvent(new Event('tx-created'));
    notifyAccountsUpdate();
    reset(); setOpen(false); onCreated && onCreated();
    setSubmitting(false);
  };

  const suggestions = (q: string) => payees.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 bg-black/60" onClick={close}>
      <div className="absolute inset-x-0 bottom-0 top-0 md:top-auto md:inset-x-1/2 md:-translate-x-1/2 md:w-[720px] surface-2 rounded-t-2xl p-4 overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 pb-2 z-10">
          <div className="flex items-center justify-between">
            <h2 className="heading text-lg">Nova transação</h2>
            <button className="text-sm text-[color:var(--text-dim)] hover:text-[color:var(--text)]" onClick={close}>Fechar</button>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4 pb-24">
          {/* Seção: Valor e Tipo */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-[color:var(--text-dim)]">Valor e Tipo</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[color:var(--text-dim)] mb-1 block">Valor da transação</label>
                <CurrencyInput aria-label="Valor da transação" autoFocus inputMode="decimal" className="input px-3 py-3 text-xl tnum w-full" placeholder="Ex.: 250,00" value={amount} onChange={setAmount} />
                <div className="text-[11px] text-[color:var(--text-dim)] mt-1">Informe o valor em BRL (use vírgula para centavos).</div>
                {errors.amount && (<div className="text-xs text-red-400 mt-1">{errors.amount}</div>)}
              </div>
              <div>
                <label className="text-xs text-[color:var(--text-dim)] mb-1 block">Tipo de transação</label>
                <select aria-label="Tipo de transação" className="input px-2 py-2 w-full" value={type} onChange={(e) => setType(e.target.value as any)}>
                  <option value="receita">Receita (entrada)</option>
                  <option value="despesa">Despesa (saída)</option>
                  <option value="transfer">Transferência entre contas</option>
                </select>
                <div className="text-[11px] text-[color:var(--text-dim)] mt-1">Escolha entre entrada, saída ou transferência.</div>
              </div>
            </div>
          </div>

          {/* Seção: Data */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-[color:var(--text-dim)]">Data</div>
            <label className="text-xs text-[color:var(--text-dim)] mb-1 block">Data da transação</label>
            <input aria-label="Data da transação" type="date" className="input px-2 py-2 w-full" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {/* Seção: Contas */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-[color:var(--text-dim)]">
              {type === 'transfer' ? 'Contas da Transferência' : 'Conta'}
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[color:var(--text-dim)] mb-1 block">
                  {type === 'transfer' ? 'De:' : 'Conta:'}
                </label>
                <select aria-label="Conta de origem" className="input px-2 py-2 w-full" value={accountId} onChange={(e) => setAccountId(Number(e.target.value))} required>
                  <option value="" disabled>Selecione uma conta…</option>
                  {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                </select>
                <div className="text-[11px] text-[color:var(--text-dim)] mt-1">Conta onde a transação será lançada.</div>
                {errors.accountId && (<div className="text-xs text-red-400 mt-1">{errors.accountId}</div>)}
              </div>
              {type==='transfer' && (
                <div>
                  <label className="text-xs text-[color:var(--text-dim)] mb-1 block">Para:</label>
                  <select aria-label="Conta de destino" className="input px-2 py-2 w-full" value={toAccountId} onChange={(e) => setToAccountId(Number(e.target.value))} required>
                    <option value="" disabled>Selecione a conta de destino…</option>
                    {accounts.filter(x=>x.id!==accountId).map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                  </select>
                  <div className="text-[11px] text-[color:var(--text-dim)] mt-1">Conta para onde o valor será transferido.</div>
                  {errors.toAccountId && (<div className="text-xs text-red-400 mt-1">{errors.toAccountId}</div>)}
                </div>
              )}
            </div>
          </div>
          {type!=='transfer' && (
            <>
              {/* Seção: Categoria e Favorecido */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-[color:var(--text-dim)]">Categoria e Favorecido</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[color:var(--text-dim)] mb-1 block">Categoria:</label>
                    <select aria-label="Categoria" className="input px-2 py-2 w-full" value={categoryId} onChange={(e) => setCategoryId(e.target.value? Number(e.target.value): '')}>
                      <option value="">Selecione uma categoria…</option>
                      {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                    <div className="text-[11px] text-[color:var(--text-dim)] mt-1">Usada para relatórios e análise de despesas/receitas.</div>
                  </div>
                  <div className="relative">
                    <label className="text-xs text-[color:var(--text-dim)] mb-1 block">Favorecido:</label>
                    <input aria-label="Favorecido" className="input px-2 py-2 w-full" placeholder="Nome do favorecido" value={payeeName} onChange={(e) => setPayeeName(e.target.value)} />
                    {payeeName && (
                      <div className="absolute z-20 mt-1 w-full surface-2 border border-white/10 rounded shadow-lg max-h-48 overflow-auto">
                        {suggestions(payeeName).slice(0,8).map(p => (
                          <div key={p.id} className="px-2 py-1 text-sm hover:bg-white/5 cursor-pointer" onClick={() => setPayeeName(p.name)}>{p.name}</div>
                        ))}
                      </div>
                    )}
                    <div className="text-[11px] text-[color:var(--text-dim)] mt-1">Quem recebe o pagamento (pessoa/empresa).</div>
                  </div>
                </div>
              </div>

              {/* Seção: Observações */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-[color:var(--text-dim)]">Observações</div>
                <label className="text-xs text-[color:var(--text-dim)] mb-1 block">Descrição</label>
                <input aria-label="Descrição" className="input px-2 py-2 w-full" placeholder="Ex.: Mensalidade academia" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              {/* Seção: Tags */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-[color:var(--text-dim)]">Tags</div>
                <TagsInput value={tagChips} onChange={setTagChips} />
                <div className="text-[11px] text-[color:var(--text-dim)] mt-1">Opcional: adicione etiquetas para facilitar buscas e agrupamentos.</div>
              </div>
              <div className="mt-2">
                <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={useSplit} onChange={(e) => setUseSplit(e.target.checked)} /> Usar Split</label>
                {useSplit && (
                  <div className="mt-2">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left"><th className="p-2">Valor</th><th className="p-2">Descrição</th><th className="p-2">Categoria</th><th className="p-2">Favorecido</th><th></th></tr></thead>
                      <tbody>
                        {splits.map((s, idx) => (
                          <tr key={idx} className="border-t border-white/5">
                            <td className="p-1"><CurrencyInput inputMode="decimal" className="input px-2 py-1 w-28 tnum" value={s.amount} onChange={(v) => updateSplit(idx, { amount: v })} /></td>
                            <td className="p-1"><input className="input px-2 py-1 w-full" value={s.description} onChange={(e) => updateSplit(idx, { description: e.target.value })} /></td>
                            <td className="p-1">
                              <select className="input px-2 py-1" value={s.categoryId || ''} onChange={(e) => updateSplit(idx, { categoryId: e.target.value? Number(e.target.value): '' })}>
                                <option value="">-</option>
                                {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                              </select>
                            </td>
                            <td className="p-1">
                              <select className="input px-2 py-1" value={s.payeeId || ''} onChange={(e) => updateSplit(idx, { payeeId: e.target.value? Number(e.target.value): '' })}>
                                <option value="">-</option>
                                {payees.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                              </select>
                            </td>
                            <td className="p-1 text-right"><button type="button" className="text-red-400 hover:text-red-300" onClick={() => removeSplit(idx)}>Remover</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-2"><button type="button" className="text-cyan-300 hover:text-cyan-200" onClick={addSplit}>+ Adicionar linha</button></div>
                  </div>
                )}
              </div>
            </>
          )}
          {submitError && (
            <div className="mx-4 mb-4 p-3 text-sm text-red-400 bg-red-50/10 border border-red-500/20 rounded-md">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{submitError}</span>
              </div>
            </div>
          )}
          <div className="sticky bottom-0 surface-2 border-t p-4 flex gap-3">
            <button 
              type="button" 
              className="flex-1 px-4 py-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors font-medium" 
              onClick={close} 
              disabled={submitting}
            >
              Cancelar
            </button>
            <button 
              className="flex-[2] btn-primary py-3 rounded-lg font-medium disabled:opacity-50 transition-all" 
              disabled={submitting}
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Salvando…
                </div>
              ) : 'Salvar Transação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  function addSplit(){ setSplits([...splits, { amount: '', description: '' }]); }
  function removeSplit(idx: number){ setSplits(splits.filter((_,i)=>i!==idx)); }
  function updateSplit(idx: number, patch: Partial<Split>){ setSplits(splits.map((s,i)=> i===idx? {...s, ...patch}: s)); }
}
