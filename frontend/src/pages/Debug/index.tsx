import { useState } from 'react';
import api from '../../services/api';

export default function Debug() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkSchema = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/v1/debug/schema');
      setResult(response.data.data);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Erro ao verificar schema');
    } finally {
      setLoading(false);
    }
  };

  const checkGoalTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/v1/debug/goal-transactions');
      setResult(response.data.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erro ao verificar transações de metas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">Debug - Correção de Schema</h1>
      </div>

      <div className="space-y-4">
        <div className="card p-4">
          <h2 className="text-md font-medium mb-3">Verificar e Corrigir Schema do Banco</h2>
          <p className="text-sm text-[color:var(--text-dim)] mb-4">
            Este endpoint verifica se a coluna goal_id existe na tabela transactions e a cria automaticamente se necessário.
            Isso é necessário para que os aportes sejam vinculados corretamente às metas.
          </p>
          <button
            onClick={checkSchema}
            disabled={loading}
            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Verificar/Corrigir Schema'}
          </button>
        </div>

        <div className="card p-4">
          <h2 className="text-md font-medium mb-3">Verificar Transações de Metas</h2>
          <p className="text-sm text-[color:var(--text-dim)] mb-4">
            Lista todas as transações que estão vinculadas a metas (com goal_id preenchido).
          </p>
          <button
            onClick={checkGoalTransactions}
            disabled={loading}
            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Carregando...' : 'Listar Transações de Metas'}
          </button>
        </div>

        {error && (
          <div className="card p-4 border-red-500/20 bg-red-500/5">
            <h3 className="text-red-400 font-medium mb-2">Erro</h3>
            <pre className="text-sm text-red-300 whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        {result && (
          <div className="card p-4">
            <h3 className="font-medium mb-3">Resultado</h3>
            <pre className="text-sm bg-black/20 p-3 rounded overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}