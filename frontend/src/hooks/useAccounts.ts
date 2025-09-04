import { useEffect, useState } from 'react';
import api from '../services/api';

type Account = {
  id: number;
  name: string;
  type: string;
  opening_balance: number;
  balance?: number;
};

// Sistema de eventos globais para sincronização
const accountsUpdateListeners: (() => void)[] = [];

export const notifyAccountsUpdate = () => {
  accountsUpdateListeners.forEach(listener => listener());
};

const addAccountsUpdateListener = (listener: () => void) => {
  accountsUpdateListeners.push(listener);
  return () => {
    const index = accountsUpdateListeners.indexOf(listener);
    if (index > -1) {
      accountsUpdateListeners.splice(index, 1);
    }
  };
};

export const useAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/api/v1/accounts');
      setAccounts(res.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Erro ao carregar contas');
      console.error('Erro ao carregar contas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAccounts();

    // Adicionar listener para atualizações globais
    const removeListener = addAccountsUpdateListener(() => {
      refreshAccounts();
    });

    return removeListener;
  }, []);

  return {
    accounts,
    loading,
    error,
    refreshAccounts
  };
};