import { useEffect, useState } from 'react';
import api from '../../services/api';
import ModernLayout, { ModernCard, ModernButton, ModernInput } from '../../components/Layout/ModernLayout';
import { 
  TagIcon,
  PlusIcon,
  TrashIcon
} from '../../components/Icons';

type Tag = {
  id: number;
  name: string;
};

export default function Tags() {
  const [items, setItems] = useState<Tag[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/api/v1/tags');
      setItems(res.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      await api.post('/api/v1/tags', { name: name.trim() });
      setName('');
      await load();
    } catch (error) {
      console.error('Erro ao adicionar tag:', error);
      alert('Erro ao adicionar tag. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const del = async (id: number) => {
    const tag = items.find(t => t.id === id);
    const confirmMessage = `Tem certeza que deseja excluir a tag "${tag?.name}"?`;
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      await api.delete('/api/v1/tags', { params: { id } });
      await load();
    } catch (error) {
      console.error('Erro ao excluir tag:', error);
      alert('Erro ao excluir tag. Verifique se não há transações vinculadas.');
    }
  };

  return (
    <ModernLayout 
      title="Tags" 
      subtitle={`${items.length} tags para organizar suas transações`}
    >
      {/* Formulário de nova tag */}
      <ModernCard className="mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
            <PlusIcon className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Nova Tag</h2>
            <p className="text-white/70 text-sm">Crie etiquetas para organizar e filtrar suas transações</p>
          </div>
        </div>

        <form onSubmit={add} className="grid md:grid-cols-2 gap-4">
          <ModernInput
            label="Nome da Tag"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Urgente, Pessoal, Trabalho..."
            required
            minLength={2}
          />

          <div className="flex items-end">
            <ModernButton
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {loading ? 'Adicionando...' : 'Adicionar'}
            </ModernButton>
          </div>
        </form>
      </ModernCard>

      {/* Lista de tags */}
      <ModernCard>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
            <TagIcon className="text-white" size={16} />
          </div>
          <h3 className="text-lg font-semibold text-white">Suas Tags</h3>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <TagIcon className="text-white/50" size={24} />
            </div>
            <p className="text-white/70 text-lg mb-2">Nenhuma tag cadastrada</p>
            <p className="text-white/50 text-sm">Crie tags para organizar melhor suas transações</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((tag) => (
              <div 
                key={tag.id} 
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-full">
                    <span className="text-indigo-300 text-sm font-medium">#{tag.name}</span>
                  </div>
                </div>
                
                <ModernButton
                  onClick={() => del(tag.id)}
                  variant="danger"
                  size="sm"
                  className="opacity-70 hover:opacity-100"
                >
                  <TrashIcon size={14} />
                </ModernButton>
              </div>
            ))}
          </div>
        )}
      </ModernCard>
    </ModernLayout>
  );
}
