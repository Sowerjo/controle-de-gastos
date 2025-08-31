import React from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { fmtCurrency, fmtDate, monthRange } from '../../utils/format';

type Tx = {
  id: number;
  descricao: string;
  data: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  categoria?: { id: number; name: string } | null;
  payee?: { id: number; name: string } | null;
  conta?: { id: number; name: string } | null;
};

export default function Transactions() {
  const [search] = useSearchParams();
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<Tx[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);

  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [categories, setCategories] = React.useState<any[]>([]);

  const [period, setPeriod] = React.useState(() => {
    const from = search.get('from');
    const to = search.get('to');
    if (from && to) return { from, to };
    return monthRange();
  });
  const [accountId, setAccountId] = React.useState<number | ''>(() => {
    const aid = search.get('accountId');
    return aid ? Number(aid) : '';
  });
  const [tipo, setTipo] = React.useState<'all' | 'receita' | 'despesa'>('all');
  const [categoriaId, setCategoriaId] = React.useState<number | ''>('');
  const [q, setQ] = React.useState('');
  const [editing, setEditing] = React.useState<Tx | null>(null);
  const [form, setForm] = React.useState<any>({});

  React.useEffect(() => {
    (async () => {
      try {
        const [a, c] = await Promise.all([
          api.get('/api/v1/accounts'),
          api.get('/api/v1/categories'),
        ]);
        setAccounts(a.data.data || []);
        setCategories(c.data.data || []);
      } catch {}
    })();
  }, []);

  // When URL query changes, sync filters (from/to/accountId)
  React.useEffect(() => {
    const from = search.get('from');
    const to = search.get('to');
    const aid = search.get('accountId');
    if (from && to) setPeriod({ from, to });
    if (aid) setAccountId(Number(aid));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.toString()]);

  React.useEffect(() => {
    setItems([]); setPage(1); setHasMore(true);
    fetchPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.from, period.to, accountId, tipo, categoriaId, q]);

  async function fetchPage(nextPage = page, replace = false) {
    if (loading || (!hasMore && !replace)) return;
    setLoading(true);
    try {
  const limit = 30;
  const params: any = { from: period.from, to: period.to, page: nextPage, limit };
      if (accountId) params.accountId = accountId;
  if (tipo !== 'all') params.type = (tipo === 'receita' ? 'RECEITA' : 'DESPESA');
  if (categoriaId) params.categoryId = categoriaId;
      if (q) params.q = q;
  const res = await api.get('/api/v1/transactions', { params });
  const payload = res.data?.data ?? res.data ?? {};
  const raw: any[] = (payload.items ?? payload) as any[];
  const list: Tx[] = raw.map((r:any) => ({
    id: r.id,
    descricao: r.descricao ?? r.description ?? '',
    data: r.data ?? r.date ?? '',
    valor: r.valor ?? r.amount ?? 0,
    tipo: (r.tipo ?? r.type ?? '').toLowerCase() === 'despesa' || (r.tipo ?? r.type) === 'DESPESA' ? 'despesa' : 'receita',
    categoria: r.categoria ?? (r.category ? { id: r.category.id, name: r.category.name } : r.category_id ? { id: r.category_id, name: r.category_name ?? '' } : undefined) ?? null,
    payee: r.payee ?? (r.payee_id ? { id: r.payee_id, name: r.payee_name ?? '' } : undefined) ?? null,
    conta: r.conta ?? (r.account ? { id: r.account.id, name: r.account.name } : r.account_id ? { id: r.account_id, name: r.account_name ?? '' } : undefined) ?? null,
  }));
  const next = replace ? list : [...items, ...list];
  setItems(next);
  setPage(nextPage + 1);
  setHasMore(list.length === limit);
    } catch {
      // ignore for now
    } finally {
      setLoading(false);
    }
  }

  async function removeTx(id: number) {
    if (!confirm('Excluir esta transação?')) return;
    try {
      await api.delete('/api/v1/transactions', { params: { id } });
      setItems(items.filter(i => i.id !== id));
    } catch {}
  }

  function openEdit(tx: Tx) {
    setEditing(tx);
    setForm({
      id: tx.id,
      data: tx.data,
      descricao: tx.descricao,
      tipo: tx.tipo,
      valor: String(tx.valor),
      accountId: tx.conta?.id || accountId || '',
      categoryId: tx.categoria?.id || '',
      payeeName: tx.payee?.name || '',
      status: 'CLEARED',
    });
  }

  async function saveEdit() {
    const amountNum = (() => {
      const s = String(form.valor ?? '').trim();
      if (!s) return 0;
      // support 1.234,56 and 1234.56
      const cleaned = s.replace(/\./g, '').replace(',', '.');
      const n = Number(cleaned);
      return isNaN(n) ? 0 : n;
    })();

    const payload: any = {
      id: form.id,
      date: form.data,
      description: form.descricao,
      type: form.tipo === 'receita' ? 'RECEITA' : 'DESPESA',
      amount: amountNum,
      accountId: form.accountId || undefined,
      categoryId: form.categoryId || undefined,
      payeeName: form.payeeName || undefined,
      status: form.status || undefined,
    };
    try {
      await api.put('/api/v1/transactions', payload);
      setItems(prev => prev.map(t => t.id === form.id ? {
        ...t,
        descricao: form.descricao,
        data: form.data,
        valor: amountNum,
        tipo: form.tipo,
        conta: form.accountId ? { id: Number(form.accountId), name: accounts.find(a => a.id === Number(form.accountId))?.name || t.conta?.name || '' } : (form.accountId === '' ? null : t.conta ?? null),
        categoria: form.categoryId ? { id: Number(form.categoryId), name: categories.find(c => c.id === Number(form.categoryId))?.name || t.categoria?.name || '' } : (form.categoryId === '' ? null : t.categoria ?? null),
        payee: form.payeeName ? { id: t.payee?.id || 0, name: form.payeeName } : (form.payeeName === '' ? null : t.payee ?? null),
      } : t));
      setEditing(null);
    } catch (e) {
      alert('Falha ao salvar');
    }
  }

  function changeMonth(offset: number) {
    const d = new Date(period.from);
    d.setMonth(d.getMonth() + offset);
    setPeriod(monthRange(d));
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold">Transações</h1>
        <div className="flex gap-2">
          <button className="px-2 py-1 rounded border border-white/10" onClick={() => changeMonth(-1)}>◀</button>
          <div className="px-2 py-1 text-sm text-[color:var(--text-dim)]">
            {new Date(period.from).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
          </div>
          <button className="px-2 py-1 rounded border border-white/10" onClick={() => changeMonth(1)}>▶</button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
        <select className="input px-2 py-2 min-w-[140px]" value={accountId} onChange={(e)=>setAccountId(e.target.value? Number(e.target.value): '')}>
          <option value="">Todas contas</option>
          {accounts.map((a:any)=> (<option key={a.id} value={a.id}>{a.name}</option>))}
        </select>
        <select className="input px-2 py-2 min-w-[140px]" value={tipo} onChange={(e)=>setTipo(e.target.value as any)}>
          <option value="all">Todos tipos</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </select>
        <select className="input px-2 py-2 min-w-[160px]" value={categoriaId} onChange={(e)=>setCategoriaId(e.target.value? Number(e.target.value): '')}>
          <option value="">Todas categorias</option>
          {categories.map((c:any)=> (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
        <input className="input px-3 py-2 min-w-[180px]" placeholder="Buscar" value={q} onChange={(e)=>setQ(e.target.value)} />
      </div>

      <div className="divide-y divide-white/5">
        {items.map((t) => (
          <div key={t.id} className="py-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">
                {t.descricao || t.payee?.name || '—'}
              </div>
              <div className="text-xs text-[color:var(--text-dim)]">
                {fmtDate(t.data)} · {t.categoria?.name || 'Sem categoria'} {t.conta?.name ? `· ${t.conta.name}` : ''}
              </div>
            </div>
            <div className={`tnum text-sm ${t.tipo==='despesa' ? 'text-red-400' : 'text-emerald-400'}`}>{fmtCurrency(t.valor)}</div>
            <div className="ml-3 flex gap-2">
              <button className="text-xs text-[color:var(--text-dim)] hover:text-sky-300" onClick={()=>openEdit(t)}>Editar</button>
              <button className="text-xs text-[color:var(--text-dim)] hover:text-red-300" onClick={()=>removeTx(t.id)}>Excluir</button>
            </div>
          </div>
        ))}
        {!items.length && !loading && (
          <div className="py-8 text-center text-[color:var(--text-dim)]">Sem transações neste período.</div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={()=>setEditing(null)}>
          <div className="bg-[color:var(--card)] w-full sm:max-w-lg sm:rounded shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="p-4 border-b border-white/10 font-semibold">Editar transação</div>
            <div className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <label className="block">Data
                  <input type="date" className="input w-full" value={form.data||''} onChange={(e)=>setForm({...form, data:e.target.value})} />
                </label>
                <label className="block">Tipo
                  <select className="input w-full" value={form.tipo} onChange={(e)=>setForm({...form, tipo:e.target.value})}>
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </label>
              </div>
              <label className="block">Descrição
                <input className="input w-full" value={form.descricao||''} onChange={(e)=>setForm({...form, descricao:e.target.value})} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">Valor
                  <input className="input w-full" value={form.valor||''} onChange={(e)=>setForm({...form, valor:e.target.value})} />
                </label>
                <label className="block">Status
                  <select className="input w-full" value={form.status} onChange={(e)=>setForm({...form, status:e.target.value})}>
                    <option value="CLEARED">Compensada</option>
                    <option value="PENDING">Pendente</option>
                    <option value="RECONCILED">Conferida</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">Conta
                  <select className="input w-full" value={form.accountId||''} onChange={(e)=>setForm({...form, accountId:e.target.value?Number(e.target.value):''})}>
                    <option value="">—</option>
                    {accounts.map((a:any)=> (<option key={a.id} value={a.id}>{a.name}</option>))}
                  </select>
                </label>
                <label className="block">Categoria
                  <select className="input w-full" value={form.categoryId||''} onChange={(e)=>setForm({...form, categoryId:e.target.value?Number(e.target.value):''})}>
                    <option value="">—</option>
                    {categories.map((c:any)=> (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </label>
              </div>
              <label className="block">Favorecido
                <input className="input w-full" value={form.payeeName||''} onChange={(e)=>setForm({...form, payeeName:e.target.value})} />
              </label>
            </div>
            <div className="p-4 border-t border-white/10 flex justify-end gap-2">
              <button className="px-3 py-2 rounded border border-white/10" onClick={()=>setEditing(null)}>Cancelar</button>
              <button className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white" onClick={saveEdit}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      <div className="py-4 flex justify-center">
        {hasMore ? (
          <button disabled={loading} className="px-4 py-2 rounded border border-white/10" onClick={()=>fetchPage(page)}>
            {loading ? 'Carregando…' : 'Carregar mais'}
          </button>
        ) : (
          <div className="text-sm text-[color:var(--text-dim)]">Fim da lista</div>
        )}
      </div>
    </div>
  );
}
