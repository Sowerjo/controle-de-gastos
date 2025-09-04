import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

type Goal = {
  id: number;
  name: string;
  type: 'poupanca' | 'quitar_divida';
  target_amount: number;
  initial_amount: number | null;
  strategy: 'linear' | 'por_alocacao';
  account_id?: number | null;
  category_id?: number | null;
  target_date?: string | null;
  planned_monthly_amount?: number | null;
  recurring_day?: number | null;
  priority?: 'baixa' | 'media' | 'alta';
  archived_at?: string | null;
  accumulated?: number;
  current_amount?: number;
  remaining?: number;
  percent?: number;
  months_left?: number | null;
  suggested_monthly?: number | null;
  status?: string;
};

// Event emitter para sincronizar atualizações entre componentes
class GoalsEventEmitter {
  private listeners: (() => void)[] = [];

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  emit() {
    this.listeners.forEach(listener => listener());
  }
}

const goalsEmitter = new GoalsEventEmitter();

export const useGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/v1/goals');
      setGoals(response.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Erro ao carregar metas');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshGoals = useCallback(async () => {
    await loadGoals();
    // Notificar outros componentes sobre a atualização
    goalsEmitter.emit();
  }, [loadGoals]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // Escutar atualizações de outros componentes
  useEffect(() => {
    const unsubscribe = goalsEmitter.subscribe(() => {
      loadGoals();
    });
    return unsubscribe;
  }, [loadGoals]);

  return {
    goals,
    loading,
    error,
    refreshGoals,
    loadGoals
  };
};

// Função para notificar atualização das metas de qualquer lugar
export const notifyGoalsUpdate = () => {
  goalsEmitter.emit();
};