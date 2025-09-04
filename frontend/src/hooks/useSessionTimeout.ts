import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAccessToken } from '../services/api';

interface UseSessionTimeoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  onWarning?: () => void;
  onTimeout?: () => void;
}

export function useSessionTimeout({
  timeoutMinutes = 30,
  warningMinutes = 5,
  onWarning,
  onTimeout
}: UseSessionTimeoutOptions = {}) {
  const navigate = useNavigate();
  const timeoutRef = useRef<number | null>(null);
  const warningRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // TIMEOUT DESABILITADO - Hook não executa nenhuma funcionalidade de timeout
  // Retorna apenas as funções necessárias sem implementação ativa

  const logout = useCallback(() => {
    try {
      setAccessToken(null);
      sessionStorage.removeItem('hasAuth');
      document.cookie = 'refreshToken=; Max-Age=0; path=/';
    } catch {}
    navigate('/login');
  }, [navigate]);

  // TODAS AS FUNCIONALIDADES DE TIMEOUT FORAM DESABILITADAS
  // O hook agora apenas retorna funções vazias para manter compatibilidade
  
  const resetTimers = useCallback(() => {
    // Função desabilitada - não faz nada
  }, []);

  const extendSession = useCallback(() => {
    // Função desabilitada - não faz nada
  }, []);

  // useEffect removido - não monitora mais atividade do usuário

  return {
    extendSession,
    resetTimers
  };
}