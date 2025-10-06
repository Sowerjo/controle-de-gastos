import { useEffect, useState } from 'react';
import api from '../../services/api';
import ModernLayout, { ModernCard, ModernButton, ModernInput } from '../../components/Layout/ModernLayout';
import { 
  TagIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  PlusIcon,
  TrashIcon
} from '../../components/Icons';

type Category = {
  id: number;
  name: string;
  type: 'receita' | 'despesa';
};

export default function Categories() {
  const [items, setItems] = useState<Category[]>([]);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/api/v1/categories');
      // Suporta ambos backends (PHP retorna { data: [...] }, Node retorna [...])
      const payload: any[] = (res?.data?.data ?? res?.data ?? []) as any[];
      // Normaliza o campo "type" para 'receita' | 'despesa'
      const normalized = payload.map((c: any) => {
        const t = String(c.type || '').toLowerCase();
        let type: 'receita' | 'despesa' = 'despesa';
        if (t === 'receita' || t === 'income') type = 'receita';
        else if (t === 'despesa' || t === 'expense') type = 'despesa';
        else if (t === 'rece' || t.includes('rece')) type = 'receita'; // fallback defensivo
        return { ...c, type } as Category;
      });
      setItems(normalized);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/v1/categories', { nome, tipo });
      setNome('');
      await load();
    } catch (error) {
      console.error('Erro ao adicionar categoria:', error);
    } finally {
      setLoading(false);
    }
  };

  const del = async (id: number) => {
    const categoria = items.find(c => c.id === id);
    const confirmMessage = `Tem certeza que deseja excluir a categoria "${categoria?.name}"?`;
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      await api.delete('/api/v1/categories', { params: { id } });
      await load();
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      alert('Erro ao excluir categoria. Verifique se não há transações vinculadas.');
    }
  };

  const receitasCount = items.filter(c => c.type === 'receita').length;
  const despesasCount = items.filter(c => c.type === 'despesa').length;

  return (
    <ModernLayout 
      title="Categorias" 
      subtitle={`${items.length} categorias • ${receitasCount} receitas • ${despesasCount} despesas`}
    >
      {/* Formulário de nova categoria */}
      <ModernCard className="mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <PlusIcon className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Nova Categoria</h2>
            <p className="text-white/70 text-sm">Organize suas transações por categoria</p>
          </div>
        </div>

        <form onSubmit={add} className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/90">Tipo</label>
            <select 
              value={tipo} 
              onChange={(e) => setTipo(e.target.value as 'receita' | 'despesa')}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
            >
              <option value="receita" className="bg-gray-800 text-white">Receita</option>
              <option value="despesa" className="bg-gray-800 text-white">Despesa</option>
            </select>
          </div>

          <ModernInput
            label="Nome da Categoria"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Alimentação, Salário..."
            required
            minLength={2}
          />

          <div className="flex items-end">
            <ModernButton
              type="submit"
              disabled={loading || !nome.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {loading ? 'Adicionando...' : 'Adicionar'}
            </ModernButton>
          </div>
        </form>
      </ModernCard>

      {/* Lista de categorias */}
      <div className="grid gap-4">
        {/* Categorias de Receita */}
        <ModernCard>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <TrendingUpIcon className="text-white" size={16} />
            </div>
            <h3 className="text-lg font-semibold text-white">Receitas ({receitasCount})</h3>
          </div>
          
          <div className="grid gap-2">
            {items.filter(c => c.type === 'receita').map((categoria) => (
              <div key={categoria.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200">
                <div className="flex items-center gap-3">
                  <TagIcon className="text-green-400" size={16} />
                  <span className="text-white font-medium">{categoria.name}</span>
                </div>
                <ModernButton
                  onClick={() => del(categoria.id)}
                  variant="danger"
                  size="sm"
                  className="opacity-70 hover:opacity-100"
                >
                  <TrashIcon size={14} />
                </ModernButton>
              </div>
            ))}
            {receitasCount === 0 && (
              <p className="text-white/50 text-sm italic py-4 text-center">Nenhuma categoria de receita cadastrada</p>
            )}
          </div>
        </ModernCard>

        {/* Categorias de Despesa */}
        <ModernCard>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
              <TrendingDownIcon className="text-white" size={16} />
            </div>
            <h3 className="text-lg font-semibold text-white">Despesas ({despesasCount})</h3>
          </div>
          
          <div className="grid gap-2">
            {items.filter(c => c.type === 'despesa').map((categoria) => (
              <div key={categoria.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200">
                <div className="flex items-center gap-3">
                  <TagIcon className="text-red-400" size={16} />
                  <span className="text-white font-medium">{categoria.name}</span>
                </div>
                <ModernButton
                  onClick={() => del(categoria.id)}
                  variant="danger"
                  size="sm"
                  className="opacity-70 hover:opacity-100"
                >
                  <TrashIcon size={14} />
                </ModernButton>
              </div>
            ))}
            {despesasCount === 0 && (
              <p className="text-white/50 text-sm italic py-4 text-center">Nenhuma categoria de despesa cadastrada</p>
            )}
          </div>
        </ModernCard>
      </div>
    </ModernLayout>
  );
}
