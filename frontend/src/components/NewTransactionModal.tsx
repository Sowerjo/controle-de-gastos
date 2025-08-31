import React from 'react';
import api from '../services/api';
import TagsInput from './TagsInput';

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
    setType('despesa'); setDate(new Date().toISOString().slice(0,10)); setAmount(''); setDescription(''); setCategoryId(''); setPayeeName(''); setTagChips([]); setSplits([]); setUseSplit(false); setToAccountId('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !amount) return;
    const numericAmount = Number(amount);
    if (type === 'transfer') {
      if (!toAccountId || !numericAmount) return;
      // Create paired transactions: saída from origin and entrada to destination
      const base = { descricao: description || 'Transferência', data: date } as any;
      await api.post('/api/v1/transactions', { ...base, valor: numericAmount, tipo: 'despesa', contaId: accountId });
      await api.post('/api/v1/transactions', { ...base, valor: numericAmount, tipo: 'receita', contaId: toAccountId });
    } else {
      const payload: any = { valor: numericAmount, descricao: description, data: date, tipo: type, contaId: accountId };
      if (payeeName) payload.payeeName = payeeName;
      if (categoryId) payload.categoriaId = categoryId;
      if (tagChips.length) payload.tagNames = tagChips.map(t => t.name);
      if (useSplit && splits.length) payload.splits = splits.filter(s => s.amount).map(s => ({ amount: Number(s.amount), description: s.description, categoryId: s.categoryId || null, payeeId: s.payeeId || null }));
      await api.post('/api/v1/transactions', payload);
    }
    reset(); setOpen(false); onCreated && onCreated();
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
        <form onSubmit={submit} className="space-y-3 pb-24">
          <input autoFocus inputMode="decimal" className="input px-3 py-3 text-xl tnum w-full" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <select className="input px-2 py-2" value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
              <option value="transfer">Transferência</option>
            </select>
            <input type="date" className="input px-2 py-2" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <select className="input px-2 py-2" value={accountId} onChange={(e) => setAccountId(Number(e.target.value))} required>
              <option value="" disabled>Conta…</option>
              {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
            </select>
            {type==='transfer' && (
              <select className="input px-2 py-2" value={toAccountId} onChange={(e) => setToAccountId(Number(e.target.value))} required>
                <option value="" disabled>Para conta…</option>
                {accounts.filter(x=>x.id!==accountId).map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
              </select>
            )}
          </div>
          {type!=='transfer' && (
            <>
              <select className="input px-2 py-2" value={categoryId} onChange={(e) => setCategoryId(e.target.value? Number(e.target.value): '')}>
                <option value="">Categoria…</option>
                {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
              <div className="relative">
                <input className="input px-2 py-2 w-full" placeholder="Favorecido" value={payeeName} onChange={(e) => setPayeeName(e.target.value)} />
                {payeeName && (
                  <div className="absolute z-20 mt-1 w-full surface-2 border border-white/10 rounded shadow-lg max-h-48 overflow-auto">
                    {suggestions(payeeName).slice(0,8).map(p => (
                      <div key={p.id} className="px-2 py-1 text-sm hover:bg-white/5 cursor-pointer" onClick={() => setPayeeName(p.name)}>{p.name}</div>
                    ))}
                  </div>
                )}
              </div>
              <input className="input px-2 py-2" placeholder="Observações" value={description} onChange={(e) => setDescription(e.target.value)} />
              <div>
                <div className="text-sm text-[color:var(--text-dim)] mb-1">Tags</div>
                <TagsInput value={tagChips} onChange={setTagChips} />
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
                            <td className="p-1"><input className="input px-2 py-1 w-28 tnum" value={s.amount} onChange={(e) => updateSplit(idx, { amount: e.target.value })} /></td>
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
          <div className="fixed bottom-0 inset-x-0 surface-2 border-t p-3 flex gap-2">
            <button type="button" className="flex-1 px-3 py-3 rounded border border-white/10" onClick={close}>Cancelar</button>
            <button className="flex-[2] btn-primary py-3">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );

  function addSplit(){ setSplits([...splits, { amount: '', description: '' }]); }
  function removeSplit(idx: number){ setSplits(splits.filter((_,i)=>i!==idx)); }
  function updateSplit(idx: number, patch: Partial<Split>){ setSplits(splits.map((s,i)=> i===idx? {...s, ...patch}: s)); }
}
