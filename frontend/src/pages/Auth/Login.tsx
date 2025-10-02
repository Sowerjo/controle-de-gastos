import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { resolvedBase, setAccessToken } from '../../services/api';
import axios from 'axios';
import {
  EmailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  LoadingIcon,
  CheckIcon
} from '../../components/Icons';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
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
    setSuccess(false);
    
    try {
      const res = await api.post('/api/v1/auth/login', { email, password: senha, remember: lembrar });
      const token = res.data?.data?.accessToken as string | undefined;
      if (!token) throw new Error('Falha no login');
      
      setAccessToken(token); // persiste em sessionStorage via api.ts
      sessionStorage.setItem('hasAuth', '1');
      setSuccess(true);
      
      // Pequeno delay para mostrar o feedback de sucesso
      setTimeout(() => {
        navigate('/');
      }, 800);
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background com gradiente moderno */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 via-transparent to-emerald-600/20"></div>
      
      {/* Elementos decorativos */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      {/* Container principal */}
      <div className="relative w-full max-w-md">
        {/* Card principal com glassmorphism */}
        <div className="backdrop-blur-xl bg-white/10 dark:bg-gray-900/20 border border-white/20 rounded-2xl shadow-2xl p-8 transition-all duration-300 hover:shadow-3xl">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Bem-vindo de volta!</h1>
            <p className="text-white/70 text-sm">Faça login para continuar</p>
          </div>

          {/* Status da API/DB */}
          <div className="flex items-center justify-center gap-4 text-xs mb-6 p-3 rounded-lg bg-black/20 backdrop-blur-sm">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${apiOk ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
              <span className="text-white/80">API: {apiOk === null ? '...' : apiOk ? 'OK' : 'OFF'}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${dbOk ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
              <span className="text-white/80">DB: {dbOk === null ? '...' : dbOk ? 'OK' : 'OFF'}</span>
            </div>
          </div>

          {/* Feedback de erro */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm animate-in slide-in-from-top duration-300" role="alert">
              {error}
            </div>
          )}

          {/* Feedback de sucesso */}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-200 text-sm flex items-center gap-2 animate-in slide-in-from-top duration-300">
              <CheckIcon size={16} className="text-green-400" />
              Login realizado com sucesso!
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={submit} className="space-y-6">
            {/* Campo Email */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/90">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EmailIcon className="text-white/50" size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                  aria-label="Email"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/90">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockIcon className="text-white/50" size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                  aria-label="Senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/50 hover:text-white/80 transition-colors duration-200"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            </div>

            {/* Checkbox Lembrar-me */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lembrar}
                  onChange={(e) => setLembrar(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-white/80">Lembrar-me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
              >
                Esqueci minha senha
              </Link>
            </div>

            {/* Botão de Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingIcon size={18} />
                  Entrando...
                </>
              ) : success ? (
                <>
                  <CheckIcon size={18} />
                  Sucesso!
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

           {/* Link para Registro */}
          <div className="text-center">
            <span className="text-white/70 text-sm">Não tem uma conta? </span>
            <Link
              to="/register"
              className="text-blue-400 hover:text-blue-300 font-semibold text-sm transition-colors duration-200"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
