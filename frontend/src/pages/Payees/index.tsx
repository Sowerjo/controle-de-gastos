import { useEffect, useState } from 'react';
import api from '../../services/api';
import ModernLayout, { ModernCard, ModernButton, ModernInput } from '../../components/Layout/ModernLayout';
import { 
  UserIcon,
  PlusIcon,
  TrashIcon
} from '../../components/Icons';

type Payee = {
  id: number;
  name: string;
};

export default function Payees() {
  const [items, setItems] = useState<Payee[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/api/v1/payees');
      setItems(res.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar favorecidos:', error);
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
      await api.post('/api/v1/payees', { name: name.trim() });
      setName('');
      await load();
    } catch (error) {
      console.error('Erro ao adicionar favorecido:', error);
      alert('Erro ao adicionar favorecido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const del = async (id: number) => {
    const payee = items.find(p => p.id === id);
    const confirmMessage = `Tem certeza que deseja excluir o favorecido "${payee?.name}"?`;
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      await api.delete('/api/v1/payees', { params: { id } });
      await load();
    } catch (error) {
      console.error('Erro ao excluir favorecido:', error);
      alert('Erro ao excluir favorecido. Verifique se não há transações vinculadas.');
    }
  };

  return (
    <ModernLayout 
      title="Favorecidos" 
      subtitle={`${items.length} favorecidos cadastrados`}
    >
      {/* Formulário de novo favorecido */}
      <ModernCard className="mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <PlusIcon className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Novo Favorecido</h2>
            <p className="text-white/70 text-sm">Adicione pessoas ou empresas que recebem seus pagamentos</p>
          </div>
        </div>

        <form onSubmit={add} className="grid md:grid-cols-2 gap-4">
          <ModernInput
            label="Nome do Favorecido"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: João Silva, Supermercado ABC..."
            required
            minLength={2}
          />

          <div className="flex items-end">
            <ModernButton
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              {loading ? 'Adicionando...' : 'Adicionar'}
            </ModernButton>
          </div>
        </form>
      </ModernCard>

      {/* Lista de favorecidos */}
      <ModernCard>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
            <UserIcon className="text-white" size={16} />
          </div>
          <h3 className="text-lg font-semibold text-white">Lista de Favorecidos</h3>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserIcon className="text-white/50" size={24} />
            </div>
            <p className="text-white/70 text-lg mb-2">Nenhum favorecido cadastrado</p>
            <p className="text-white/50 text-sm">Adicione favorecidos para facilitar o cadastro de transações</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((payee) => (
              <div 
                key={payee.id} 
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center">
                    <UserIcon className="text-white" size={14} />
                  </div>
                  <span className="text-white font-medium">{payee.name}</span>
                </div>
                
                <ModernButton
                  onClick={() => del(payee.id)}
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
