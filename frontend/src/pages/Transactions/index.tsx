import React from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { fmtCurrency, fmtDate } from '../../utils/format';
import { notifyAccountsUpdate } from '../../hooks/useAccounts';
import { useMonth } from '../../contexts/MonthContext';
import MonthSelector from '../../components/MonthSelector';
import ModernLayout, { ModernCard, ModernButton, ModernInput } from '../../components/Layout/ModernLayout';
import { 
  SearchIcon,
  FilterIcon,
  EditIcon,
  TrashIcon,
  ClearIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarIcon,
  TagIcon,
  CreditCardIcon,
  UserIcon
} from '../../components/Icons';

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
  const { monthRange: period } = useMonth();
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<Tx[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);

  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [accountId, setAccountId] = React.useState<number | ''>(() => {
    const aid = search.get('accountId');
    return aid ? Number(aid) : '';
  });
  const [tipo, setTipo] = React.useState<'all' | 'receita' | 'despesa'>('all');
  const [categoriaId, setCategoriaId] = React.useState<number | ''>('');
  const [q, setQ] = React.useState('');
  const [editing, setEditing] = React.useState<Tx | null>(null);
  const [form, setForm] = React.useState<any>({});
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [editError, setEditError] = React.useState<string>('');

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

  // Listen for new transaction events to refresh the list
  React.useEffect(() => {
    const handleTxCreated = () => {
      // Reset pagination state and fetch fresh data
      setItems([]);
      setPage(1);
      setHasMore(true);
      // Force a complete refresh by calling fetchPage with page 1 and replace=true
      setTimeout(() => fetchPage(1, true), 100);
    };

    const handleTxUpdated = () => {
      // For updates, just refresh the current page to maintain position
      fetchPage(1, true);
    };

    window.addEventListener('tx-created', handleTxCreated);
    window.addEventListener('tx-updated', handleTxUpdated);
    return () => {
      window.removeEventListener('tx-created', handleTxCreated);
      window.removeEventListener('tx-updated', handleTxUpdated);
    };
  }, [period.from, period.to, accountId, tipo, categoriaId, q]);

  // When URL query changes, sync filters (from/to/accountId/categoryId)
  React.useEffect(() => {
    const from = search.get('from');
    const to = search.get('to');
    const aid = search.get('accountId');
    const cid = search.get('categoryId');
    
    // Período agora é gerenciado pelo contexto global
    if (aid) {
      setAccountId(Number(aid));
    }
    if (cid) {
      setCategoriaId(Number(cid));
    }
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
  const accName = (id?: number) => {
    if (!id && id !== 0) return '';
    const a = accounts.find((x:any) => Number(x.id) === Number(id));
    return a?.name ?? '';
  };
  const catName = (id?: number) => {
    if (!id && id !== 0) return '';
    const c = categories.find((x:any) => Number(x.id) === Number(id));
    return c?.name ?? '';
  };
  const list: Tx[] = raw.map((r:any) => ({
    id: r.id,
    descricao: r.descricao ?? r.description ?? '',
    data: r.data ?? r.date ?? '',
    valor: r.valor ?? r.amount ?? 0,
    tipo: (r.tipo ?? r.type ?? '').toLowerCase() === 'despesa' || (r.tipo ?? r.type) === 'DESPESA' ? 'despesa' : 'receita',
    categoria: r.categoriaId ? { 
      id: r.categoriaId, 
      name: r.categoria_name || catName(r.categoriaId) || 'Categoria não encontrada' 
    } : null,
    payee: (r.payeeId || r.payee_name) ? { 
      id: r.payeeId || 0, 
      name: r.payee_name || 'Favorecido não encontrado' 
    } : null,
    conta: r.contaId ? { 
      id: r.contaId, 
      name: r.conta_name || accName(r.contaId) || 'Conta não encontrada' 
    } : null,
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
    if (!confirm('Confirmar alterações?')) return;
    setSavingEdit(true);
    setEditError('');
    const amountNum = (() => {
      const s = String(form.valor ?? '').trim();
      if (!s) return 0;
      // Corrigido: preserva o formato correto para valores como 30,00 ou 1.234,56
      // Verifica se o valor tem vírgula (formato brasileiro)
      let n;
      if (s.includes(',')) {
        // Formato brasileiro: 1.234,56 -> 1234.56
        const cleaned = s.replace(/\./g, '').replace(',', '.');
        n = Number(cleaned);
      } else {
        // Formato sem vírgula ou formato americano: 1234.56
        n = Number(s);
      }
      return isNaN(n) ? 0 : n;
    })();

    // Se o valor for negativo, ajusta automaticamente para despesa
    let adjustedType = form.tipo;
    let adjustedAmount = amountNum;
    
    if (amountNum < 0) {
      adjustedType = 'despesa';
      adjustedAmount = Math.abs(amountNum);
    }
    
    const payload: any = {
      id: form.id,
      date: form.data,
      description: form.descricao,
      type: adjustedType === 'receita' ? 'RECEITA' : 'DESPESA',
      amount: adjustedAmount,
      accountId: form.accountId || undefined,
      categoryId: form.categoryId || undefined,
      payeeName: form.payeeName || undefined,
      status: form.status || undefined,
    };
    try {
      await api.put('/api/v1/transactions', payload);
      // Remove a atualização local do estado para evitar duplicação
      // O evento tx-updated irá fazer o refresh da página
      window.dispatchEvent(new Event('tx-updated'));
      notifyAccountsUpdate();
      setEditing(null);
    } catch (e) {
      setEditError('Falha ao salvar. Verifique os dados e tente novamente.');
    } finally {
      setSavingEdit(false);
    }
  }



  // Converte valores para número de forma segura (suporta "1.234,56" e números)
  const toNumberBR = (v: any) => {
    if (typeof v === 'number') return isNaN(v) ? 0 : v;
    if (typeof v === 'string') {
      const s = v.trim().replace(/\./g, '').replace(',', '.');
      const n = Number(s);
      return isNaN(n) ? 0 : n;
    }
    const n = Number(v ?? 0);
    return isNaN(n) ? 0 : n;
  };

  const totalReceitas = items
    .filter(t => t.tipo === 'receita')
    .reduce((sum, t) => sum + toNumberBR((t as any).valor ?? (t as any).amount ?? 0), 0);
  const totalDespesas = items
    .filter(t => t.tipo === 'despesa')
    .reduce((sum, t) => sum + toNumberBR((t as any).valor ?? (t as any).amount ?? 0), 0);
  // Alguns backends/importações podem fornecer valores em centavos (ex.: 114550 para 1.145,50)
  // Detecta esse caso e ajusta a escala para exibição correta.
  const needsCentScale = (() => {
    const values = items
      .filter(t => t.tipo === 'receita' || t.tipo === 'despesa')
      .map(t => (t as any).valor ?? (t as any).amount)
      .filter(v => v !== undefined && v !== null)
      .map(v => (typeof v === 'number' ? v : toNumberBR(v)));
    // Heurística: muitos valores inteiros altos cuja última parte não é múltipla de 100
    return values.some(v => Number.isInteger(v) && Math.abs(v) >= 1000 && Math.abs(v) % 100 !== 0);
  })();

  const totalReceitasDisplay = needsCentScale ? totalReceitas / 100 : totalReceitas;
  const totalDespesasDisplay = needsCentScale ? totalDespesas / 100 : totalDespesas;
  const saldo = toNumberBR(totalReceitasDisplay) - toNumberBR(totalDespesasDisplay);

  return (
    <ModernLayout 
      title="Transações" 
      subtitle={`${items.length} transações • Saldo: ${fmtCurrency(saldo)}`}
      headerActions={<MonthSelector />}
    >
      {/* Resumo financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <ModernCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <TrendingUpIcon className="text-white" size={20} />
            </div>
            <div>
              <p className="text-white/70 text-sm">Receitas</p>
              <p className="text-lg font-bold text-green-400">{fmtCurrency(totalReceitasDisplay)}</p>
            </div>
          </div>
        </ModernCard>

        <ModernCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
              <TrendingDownIcon className="text-white" size={20} />
            </div>
            <div>
              <p className="text-white/70 text-sm">Despesas</p>
              <p className="text-lg font-bold text-red-400">{fmtCurrency(totalDespesasDisplay)}</p>
            </div>
          </div>
        </ModernCard>

        <ModernCard className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-r ${saldo >= 0 ? 'from-blue-500 to-cyan-500' : 'from-orange-500 to-red-500'} rounded-lg flex items-center justify-center`}>
              <CreditCardIcon className="text-white" size={20} />
            </div>
            <div>
              <p className="text-white/70 text-sm">Saldo</p>
              <p className={`text-lg font-bold ${saldo >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {fmtCurrency(saldo)}
              </p>
            </div>
          </div>
        </ModernCard>
      </div>

      {/* Filtros */}
      <ModernCard className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <FilterIcon className="text-white" size={16} />
          </div>
          <h3 className="text-lg font-semibold text-white">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/90">Conta</label>
            <select 
              className="w-full pl-4 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
              value={accountId} 
              onChange={(e)=>setAccountId(e.target.value? Number(e.target.value): '')}
            >
              <option value="" className="bg-gray-800 text-white">Todas contas</option>
              {accounts.map((a:any)=> (
                <option key={a.id} value={a.id} className="bg-gray-800 text-white">{a.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/90">Tipo</label>
            <select 
              className="w-full pl-4 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
              value={tipo} 
              onChange={(e)=>setTipo(e.target.value as any)}
            >
              <option value="all" className="bg-gray-800 text-white">Todos tipos</option>
              <option value="receita" className="bg-gray-800 text-white">Receitas</option>
              <option value="despesa" className="bg-gray-800 text-white">Despesas</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/90">Categoria</label>
            <select 
              className="w-full pl-4 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
              value={categoriaId} 
              onChange={(e)=>setCategoriaId(e.target.value? Number(e.target.value): '')}
            >
              <option value="" className="bg-gray-800 text-white">Todas categorias</option>
              {categories.map((c:any)=> (
                <option key={c.id} value={c.id} className="bg-gray-800 text-white">{c.name}</option>
              ))}
            </select>
          </div>

          <ModernInput
            label="Buscar"
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            placeholder="Buscar transações..."
            icon={<SearchIcon className="text-white/50" size={18} />}
          />
        </div>

        {(accountId || tipo !== 'all' || categoriaId || q) && (
          <ModernButton
            variant="secondary"
            onClick={() => {
              setAccountId('');
              setTipo('all');
              setCategoriaId('');
              setQ('');
            }}
            className="w-full md:w-auto"
          >
            <ClearIcon size={16} />
            Limpar filtros
          </ModernButton>
        )}
      </ModernCard>

      {/* Lista de transações */}
      <div className="space-y-3">
        {items.map((t) => (
          <ModernCard key={t.id} className="p-4 hover:bg-white/5 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  t.tipo === 'receita' 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                    : 'bg-gradient-to-r from-red-500 to-pink-500'
                }`}>
                  {t.tipo === 'receita' ? (
                    <TrendingUpIcon className="text-white" size={18} />
                  ) : (
                    <TrendingDownIcon className="text-white" size={18} />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">
                    {t.descricao || t.payee?.name || '—'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <CalendarIcon size={14} />
                    <span>{fmtDate(t.data)}</span>
                    {t.categoria?.name && (
                      <>
                        <span>•</span>
                        <TagIcon size={14} />
                        <span>{t.categoria.name}</span>
                      </>
                    )}
                    {t.conta?.name && (
                      <>
                        <span>•</span>
                        <CreditCardIcon size={14} />
                        <span className="truncate">{t.conta.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`text-lg font-bold tnum ${
                  t.tipo === 'despesa' ? 'text-red-400' : 'text-green-400'
                }`}>
                  {t.tipo === 'despesa' ? '-' : '+'}{fmtCurrency(Number(t.valor||0))}
                </div>
                
                <div className="flex gap-2">
                  <ModernButton
                    variant="secondary"
                    size="sm"
                    onClick={() => openEdit(t)}
                    className="!p-2"
                  >
                    <EditIcon size={16} />
                  </ModernButton>
                  <ModernButton
                    variant="danger"
                    size="sm"
                    onClick={() => removeTx(t.id)}
                    className="!p-2"
                  >
                    <TrashIcon size={16} />
                  </ModernButton>
                </div>
              </div>
            </div>
          </ModernCard>
        ))}
        
        {!items.length && !loading && (
          <ModernCard className="p-8 text-center">
            <div className="text-white/70">
              <UserIcon className="mx-auto mb-3 text-white/50" size={48} />
              <p className="text-lg font-medium mb-2">Nenhuma transação encontrada</p>
              <p className="text-sm">Não há transações para o período selecionado.</p>
            </div>
          </ModernCard>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={()=>setEditing(null)}>
          <div className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-white/20 w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-auto" onClick={(e)=>e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <EditIcon className="text-white" size={18} />
                  </div>
                  <h2 className="text-xl font-bold text-white">Editar Transação</h2>
                </div>
                <ModernButton
                  variant="secondary"
                  onClick={() => setEditing(null)}
                  className="!p-2"
                >
                  ×
                </ModernButton>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Seção: Valor e Tipo */}
              <ModernCard className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <CreditCardIcon className="text-white" size={16} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Valor e Tipo</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ModernInput
                    label="Valor"
                    value={form.valor||''}
                    onChange={(e)=>setForm({...form, valor:e.target.value})}
                    placeholder="0,00"
                    className="text-lg tnum"
                    autoFocus
                    helperText="Use vírgula para decimais (ex: 30,50)"
                  />
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/90">Tipo</label>
                    <div className="flex rounded-lg overflow-hidden border border-white/20">
                      <button 
                        type="button"
                        className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
                          form.tipo === 'receita' 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg' 
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                        onClick={() => setForm({...form, tipo: 'receita'})}
                      >
                        <TrendingUpIcon size={16} className="inline mr-2" />
                        Receita
                      </button>
                      <button 
                        type="button"
                        className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
                          form.tipo === 'despesa' 
                            ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg' 
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                        onClick={() => setForm({...form, tipo: 'despesa'})}
                      >
                        <TrendingDownIcon size={16} className="inline mr-2" />
                        Despesa
                      </button>
                    </div>
                  </div>
                </div>
              </ModernCard>
              
              {/* Seção: Data e Status */}
              <ModernCard className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="text-white" size={16} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Data e Status</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/90">Data</label>
                    <input 
                      type="date" 
                      className="w-full pl-4 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                      value={form.data||''} 
                      onChange={(e)=>setForm({...form, data:e.target.value})} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/90">Status</label>
                    <select 
                      className="w-full pl-4 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                      value={form.status} 
                      onChange={(e)=>setForm({...form, status:e.target.value})}
                    >
                      <option value="CLEARED" className="bg-gray-800 text-white">Compensada</option>
                      <option value="PENDING" className="bg-gray-800 text-white">Pendente</option>
                      <option value="RECONCILED" className="bg-gray-800 text-white">Conferida</option>
                    </select>
                  </div>
                </div>
              </ModernCard>
              
              {/* Seção: Descrição */}
              <ModernCard className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                    <EditIcon className="text-white" size={16} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Descrição</h3>
                </div>
                
                <ModernInput
                  label="Descrição da transação"
                  value={form.descricao||''}
                  onChange={(e)=>setForm({...form, descricao:e.target.value})}
                  placeholder="Digite uma descrição..."
                />
              </ModernCard>
              
              {/* Seção: Conta e Categoria */}
              <ModernCard className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                    <TagIcon className="text-white" size={16} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Conta e Categoria</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/90">Conta</label>
                    <select 
                      className="w-full pl-4 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                      value={form.accountId||''} 
                      onChange={(e)=>setForm({...form, accountId:e.target.value?Number(e.target.value):''})}
                    >
                      <option value="" className="bg-gray-800 text-white">Selecione uma conta…</option>
                      {accounts.map((a:any)=> (
                        <option key={a.id} value={a.id} className="bg-gray-800 text-white">{a.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/90">Categoria</label>
                    <select 
                      className="w-full pl-4 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                      value={form.categoryId||''} 
                      onChange={(e)=>setForm({...form, categoryId:e.target.value?Number(e.target.value):''})}
                    >
                      <option value="" className="bg-gray-800 text-white">Selecione uma categoria…</option>
                      {categories.map((c:any)=> (
                        <option key={c.id} value={c.id} className="bg-gray-800 text-white">{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </ModernCard>
              
              {/* Seção: Favorecido */}
              <ModernCard className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <UserIcon className="text-white" size={16} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Favorecido</h3>
                </div>
                
                <ModernInput
                  label="Nome do favorecido"
                  value={form.payeeName||''}
                  onChange={(e)=>setForm({...form, payeeName:e.target.value})}
                  placeholder="Digite o nome do favorecido..."
                />
              </ModernCard>
            </div>
            
            {editError && (
              <div className="mx-6 mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{editError}</p>
              </div>
            )}
            
            <div className="sticky bottom-0 bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-xl p-6 border-t border-white/10 flex justify-end gap-3">
              <ModernButton
                variant="secondary"
                onClick={() => setEditing(null)}
                disabled={savingEdit}
              >
                Cancelar
              </ModernButton>
              <ModernButton
                 variant="primary"
                 onClick={saveEdit}
                 disabled={savingEdit}
                 loading={savingEdit}
               >
                 Salvar alterações
               </ModernButton>
             </div>
           </div>
         </div>
       )}
      {/* Paginação */}
      <div className="py-4 flex justify-center">
        {hasMore ? (
          <ModernButton
            variant="secondary"
            onClick={() => fetchPage(page)}
            disabled={loading}
            loading={loading}
          >
            Carregar mais
          </ModernButton>
        ) : (
          <div className="text-white/70 text-sm">Fim da lista</div>
        )}
      </div>
    </ModernLayout>
  );
}
