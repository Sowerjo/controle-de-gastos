import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { resolvedBase, setAccessToken } from '../../services/api';
import axios from 'axios';
import bg from '../../../background.jpg';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // health status
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [dbOk, setDbOk] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const h = await fetch(new URL('/api/v1/health', resolvedBase).href);
        const data = await h.json();
        setApiOk(data?.data?.status === 'ok');
        setDbOk(data?.data?.db === 'ok' || false);
      } catch {
        setApiOk(false);
        setDbOk(false);
      }
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/v1/auth/login', { email, password: senha, remember: lembrar });
      const token = res.data?.data?.accessToken as string | undefined;
      if (!token) throw new Error('Falha no login');
  setAccessToken(token); // persiste em sessionStorage via api.ts
      sessionStorage.setItem('hasAuth', '1');
      navigate('/');
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data?.error?.message as string) || err.message || 'Erro inesperado';
        const reason = err.response?.data?.error?.reason ? ` (${err.response.data.error.reason})` : '';
        setError(msg + reason);
      } else {
        setError(err?.message || 'Erro inesperado');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center" style={{ backgroundImage: `url(${bg})` }}>
      <form className="w-full max-w-sm rounded-lg shadow-lg p-6 border border-white/20 bg-white/10 dark:bg-gray-900/30 backdrop-blur-md" onSubmit={submit}>
        <h1 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Entrar</h1>
        <div className="flex items-center justify-between text-xs mb-3">
          <span>API: <b className={apiOk ? 'text-green-600' : 'text-red-600'}>{apiOk === null ? '...' : apiOk ? 'OK' : 'OFF'}</b></span>
          <span>DB: <b className={dbOk ? 'text-green-600' : 'text-red-600'}>{dbOk === null ? '...' : dbOk ? 'OK' : 'OFF'}</b></span>
        </div>
        {error && <div className="text-red-600 text-sm mb-2" role="alert">{error}</div>}
        <label className="block mb-3">
          <span className="block text-sm text-gray-700 dark:text-gray-300">Email</span>
          <input aria-label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
        </label>
        <label className="block mb-3">
          <span className="block text-sm text-gray-700 dark:text-gray-300">Senha</span>
          <input aria-label="Senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
        </label>
        <label className="flex items-center gap-2 mb-4">
          <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
          <span className="text-sm text-gray-700 dark:text-gray-300">Manter-me conectado</span>
        </label>
        <button type="submit" disabled={loading} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
        <div className="flex justify-between mt-4 text-sm">
          <Link to="/forgot-password" className="text-blue-600 hover:underline">Esqueci minha senha</Link>
          <Link to="/register" className="text-blue-600 hover:underline">Criar conta</Link>
        </div>
      </form>
    </div>
  );
}
