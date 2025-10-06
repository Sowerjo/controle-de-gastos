import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { fmtCurrency } from '../../utils/format';
import CurrencyInput, { parseBRNumber, fmtNumberBR, formatBRInput } from '../../components/CurrencyInput';
import { useMonth } from '../../contexts/MonthContext';
import MonthSelector from '../../components/MonthSelector';
import ModernLayout, { ModernCard, ModernButton } from '../../components/Layout/ModernLayout';
import { 
  ChartBarIcon, 
  PlusIcon, 
  TrashIcon, 
  EditIcon, 
  CashIcon, 
  CheckIcon, 
  ClearIcon 
} from '../../components/Icons';

export default function Budgets() {
  const { formatMonthForInput } = useMonth();
  const [items, setItems] = useState<any[]>([]);
  const month = formatMonthForInput();
  const [cats, setCats] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [rollover, setRollover] = useState<boolean>(() => sessionStorage.getItem('budgetRollover') === '1');
  const load = async () => { 
    try {
      const r = await api.get('/api/v1/budgets', { params: { month: month+'-01' } }); 
      setItems(r.data.data || []); 
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
    }
  };
  useEffect(() => { 
    (async () => { 
      try {
        const c = await api.get('/api/v1/categories'); 
        setCats(c.data.data || []); 
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
      }
    })(); 
  }, []);
  useEffect(() => { 
    load(); 
  }, [month]);
  const save = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if(!categoryId) return; 
    try {
      await api.post('/api/v1/budgets', { categoryId, month: month+'-01', amount: parseBRNumber(String(amount||'')) }); 
      setCategoryId(''); 
      setAmount(''); 
      await load(); 
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
      alert('Erro ao salvar orçamento. Tente novamente.');
    }
  };
  const del = async (id: number) => { 
    try {
      await api.delete('/api/v1/budgets', { params: { id } }); 
      await load(); 
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      alert('Erro ao excluir orçamento. Tente novamente.');
    }
  };
  useEffect(() => { sessionStorage.setItem('budgetRollover', rollover ? '1' : '0'); }, [rollover]);

  const spentByCat = useSpentByCategory(month);
  const heatClass = (catId: number) => {
    const spent = spentByCat[catId] || 0;
    const budget = Number(items.find(i => i.category_id === catId)?.amount || 0);
    const base = budget > 0 ? (spent / budget) : 0;
    if (base < 0.8) return 'bg-emerald-500/10';
    if (base <= 1) return 'bg-amber-500/10';
    return 'bg-red-500/10';
  };

  const updateInline = async (id: number, amt: number) => {
    const it = items.find(i => i.id === id); 
    if (!it) return;
    try {
      await api.post('/api/v1/budgets', { categoryId: it.category_id, month: it.month, amount: amt });
      await load();
    } catch (error) {
      console.error('Erro ao atualizar orçamento:', error);
      alert('Erro ao atualizar orçamento. Tente novamente.');
      await load(); // Recarrega para restaurar o valor original
    }
  };
  const totalBudget = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalSpent = items.reduce((sum, item) => sum + (spentByCat[item.category_id] || 0), 0);
  const budgetUsage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <ModernLayout 
      title="Orçamentos" 
      subtitle={`${totalBudget > 0 ? `Orçamento total: ${fmtCurrency(totalBudget)} • ` : ''}${totalSpent > 0 ? `Gasto: ${fmtCurrency(totalSpent)} • ` : ''}${budgetUsage.toFixed(1)}% utilizado`}
      headerActions={<MonthSelector />}
    >
      <ModernCard className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
            <PlusIcon className="text-white" size={16} />
          </div>
          <h3 className="text-lg font-semibold text-white">Novo Orçamento</h3>
        </div>
        
        <form onSubmit={save} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-white/70 mb-2">Categoria</label>
            <select 
              value={categoryId} 
              onChange={(e) => setCategoryId(e.target.value? Number(e.target.value): '')} 
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione uma categoria...</option>
              {cats.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-white/70 mb-2">Valor Orçado</label>
            <CurrencyInput 
              inputMode="decimal" 
              value={amount} 
              onChange={setAmount} 
              placeholder="R$ 0,00" 
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tnum" 
            />
          </div>
          
          <div className="flex items-end">
            <ModernButton type="submit" disabled={!categoryId || !amount}>
              <PlusIcon size={16} />
              Adicionar
            </ModernButton>
          </div>
        </form>
      </ModernCard>
      <ModernCard>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="text-white" size={16} />
          </div>
          <h3 className="text-lg font-semibold text-white">Orçamentos por Categoria</h3>
        </div>
        
        <div className="overflow-auto">
          <table className="min-w-[480px] w-full text-sm">
            <thead>
              <tr className="text-left border-b border-white/10">
                <th className="p-3 text-white/70 font-medium">Categoria</th>
                <th className="p-3 text-white/70 font-medium">Orçado</th>
                <th className="p-3 text-white/70 font-medium">Gasto</th>
                <th className="p-3 text-white/70 font-medium">% Utilizado</th>
                <th className="p-3 text-white/70 font-medium">Rollover</th>
                <th className="p-3 text-white/70 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
            {items.map((b) => {
              const spent = spentByCat[b.category_id] || 0;
              const ratio = Number(b.amount||0) > 0 ? (spent / Number(b.amount)) : 0;
              const getStatusIcon = () => {
                 if (ratio < 0.8) return <CheckIcon className="text-green-400" size={16} />;
                 if (ratio <= 1) return <EditIcon className="text-yellow-400" size={16} />;
                 return <ClearIcon className="text-red-400" size={16} />;
                };
              const getStatusColor = () => {
                if (ratio < 0.8) return 'text-green-400';
                if (ratio <= 1) return 'text-yellow-400';
                return 'text-red-400';
              };
              return (
                <tr key={b.id} className={`border-t border-white/5 hover:bg-white/5 transition-colors ${heatClass(b.category_id)}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon()}
                      <span className="text-white font-medium">{b.category}</span>
                    </div>
                  </td>
                  <td className="p-3 tnum">
                    <InlineMoney value={Number(b.amount||0)} onChange={(v) => updateInline(b.id, v)} />
                  </td>
                  <td className="p-3 tnum text-white">{fmtCurrency(spent)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${getStatusColor()}`}>
                        {(ratio*100).toFixed(0)}%
                      </span>
                      <div className="flex-1 bg-white/10 rounded-full h-2 max-w-[60px]">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            ratio < 0.8 ? 'bg-green-400' : 
                            ratio <= 1 ? 'bg-yellow-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <input 
                      type="checkbox" 
                      checked={rollover} 
                      onChange={(e) => setRollover(e.target.checked)} 
                      className="w-4 h-4 text-blue-500 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </td>
                  <td className="p-3 text-right">
                    <ModernButton 
                      variant="danger" 
                      size="sm" 
                      onClick={() => del(b.id)}
                    >
                      <TrashIcon size={14} />
                    </ModernButton>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
        
        {items.length === 0 && (
          <div className="text-center py-8">
            <CashIcon className="mx-auto text-white/30 mb-4" size={48} />
            <p className="text-white/70 mb-2">Nenhum orçamento cadastrado</p>
            <p className="text-white/50 text-sm">Adicione categorias ao seu orçamento para começar a controlar seus gastos</p>
          </div>
        )}
      </ModernCard>
    </ModernLayout>
  );
}

function InlineMoney({ value, onChange }: { value: number; onChange: (v: number) => void }){
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(fmtNumberBR(Number(value||0)));
  useEffect(() => setVal(fmtNumberBR(Number(value||0))), [value]);
  return editing ? (
    <span className="flex items-center gap-1">
      <input 
        className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white tnum w-24 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
        value={val} 
        onChange={(e)=>setVal(formatBRInput(e.target.value))} 
        onBlur={()=>{ setEditing(false); onChange(parseBRNumber(val)); }} 
        onKeyDown={(e)=>{ 
          if(e.key==='Enter'){ setEditing(false); onChange(parseBRNumber(val)); } 
          if(e.key==='Escape'){ setEditing(false); setVal(fmtNumberBR(Number(value||0))); } 
        }} 
        autoFocus 
      />
      <EditIcon className="text-white/50" size={12} />
    </span>
  ) : (
    <span 
      className="cursor-pointer text-white hover:text-blue-400 transition-colors flex items-center gap-1 group" 
      onClick={()=>setEditing(true)}
    >
      {fmtCurrency(Number(value||0))}
      <EditIcon className="text-white/30 group-hover:text-blue-400 transition-colors" size={12} />
    </span>
  );
}

function useSpentByCategory(month: string){
  const [map, setMap] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => { 
    (async () => {
      // approximate: use report by category for month
      setIsLoading(true);
      try {
        const from = month+'-01'; 
        const to = new Date(new Date(from).getFullYear(), new Date(from).getMonth()+1, 0).toISOString().slice(0,10);
        
        // Obter relatórios por categoria
        const r = await api.get('/api/v1/reports/by-category', { params: { from, to } });
        const rows: any[] = r.data.data || [];
        
        // Obter categorias para mapear IDs
        const cats = await api.get('/api/v1/categories');
        const catIdx: Record<string, number> = {};
        (cats.data.data||[]).forEach((c: any) => { catIdx[c.name] = c.id; });
        
        // Calcular gastos por categoria
        const m: Record<number, number> = {};
        for (const row of rows) {
          const isExpense = (row.type || row.tipo) === 'DESPESA';
          if (!isExpense) continue;
          const id = catIdx[row.name || ''] || 0; 
          if (!id) continue;
          m[id] = (m[id] || 0) + Number(row.total||0);
        }
        setMap(m);
      } catch (error) { 
        console.error('Erro ao carregar gastos por categoria:', error);
        setMap({}); 
      } finally {
        setIsLoading(false);
      }
    })(); 
  }, [month]);
  
  return map;
}
