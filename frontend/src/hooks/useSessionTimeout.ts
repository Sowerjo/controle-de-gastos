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
  timeoutMinutes = 5,
  warningMinutes = 1,
  onWarning,
  onTimeout
}: UseSessionTimeoutOptions = {}) {
  const navigate = useNavigate();
  const timeoutRef = useRef<number | null>(null);
  const warningRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const logout = useCallback(() => {
    try {
      setAccessToken(null);
      sessionStorage.removeItem('hasAuth');
      document.cookie = 'refreshToken=; Max-Age=0; path=/';
    } catch {}
    navigate('/login');
  }, [navigate]);

  const resetTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
    }

    // Set warning timer
    const warningTime = (timeoutMinutes - warningMinutes) * 60 * 1000;
    warningRef.current = setTimeout(() => {
      onWarning?.();
    }, warningTime);

    // Set timeout timer
    const timeoutTime = timeoutMinutes * 60 * 1000;
    timeoutRef.current = setTimeout(() => {
      onTimeout?.();
      logout();
    }, timeoutTime);
  }, [timeoutMinutes, warningMinutes, onWarning, onTimeout, logout]);

  const extendSession = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    // Check if user is authenticated
    const hasAuth = sessionStorage.getItem('hasAuth');
    if (!hasAuth) return;

    // Activity events to track
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      const now = Date.now();
      // Only reset if more than 30 seconds have passed since last activity
      if (now - lastActivityRef.current > 30000) {
        resetTimers();
      }
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initialize timers
    resetTimers();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
      }
    };
  }, [resetTimers]);

  return {
    extendSession,
    resetTimers
  };
}