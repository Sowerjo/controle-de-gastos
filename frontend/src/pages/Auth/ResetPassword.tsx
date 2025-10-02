import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  LoadingIcon,
  CheckIcon
} from '../../components/Icons';

export default function ResetPassword() {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sp] = useSearchParams();
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    
    // Validações
    if (novaSenha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    if (novaSenha !== confirmSenha) {
      setError('As senhas não coincidem');
      return;
    }
    
    const token = sp.get('token');
    if (!token) {
      setError('Token ausente ou inválido');
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await api.post('/api/v1/auth/reset-password', { token, novaSenha });
      if (res.status < 400) {
        setSuccess(true);
        setMsg('Senha alterada com sucesso');
        setTimeout(() => nav('/login'), 2000);
      } else {
        setError('Falha ao alterar senha');
      }
    } catch (error) {
      setError('Erro ao alterar senha. Tente novamente.');
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
            <h1 className="text-3xl font-bold text-white mb-2">Nova senha</h1>
            <p className="text-white/70 text-sm">
              {success ? 'Senha alterada com sucesso!' : 'Digite sua nova senha'}
            </p>
          </div>

          {success ? (
            /* Tela de sucesso */
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center animate-bounce">
                  <CheckIcon size={32} className="text-green-400" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Senha alterada!</h3>
                <p className="text-white/70 text-sm leading-relaxed">
                  Sua senha foi alterada com sucesso. Você será redirecionado para o login.
                </p>
              </div>

              <div className="pt-4">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                >
                  Ir para o login
                </Link>
              </div>
            </div>
          ) : (
            /* Formulário */
            <form onSubmit={submit} className="space-y-6">
              {/* Feedback de erro */}
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm animate-shake">
                  {error}
                </div>
              )}

              {/* Campo Nova Senha */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/90">Nova senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockIcon className="text-white/50" size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Digite sua nova senha"
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                    aria-label="Nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/50 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
                <p className="text-white/60 text-xs">
                  Mínimo de 6 caracteres
                </p>
              </div>

              {/* Campo Confirmar Senha */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/90">Confirmar senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockIcon className="text-white/50" size={18} />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmSenha}
                    onChange={(e) => setConfirmSenha(e.target.value)}
                    placeholder="Confirme sua nova senha"
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
                    aria-label="Confirmar senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/50 hover:text-white/70 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
              </div>

              {/* Botão de Alterar */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-1 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <LoadingIcon size={18} />
                    Alterando...
                  </>
                ) : (
                  'Alterar senha'
                )}
              </button>
            </form>
          )}

          {/* Link para voltar */}
          {!success && (
            <div className="text-center mt-6">
              <Link
                to="/login"
                className="text-blue-400 hover:text-blue-300 font-semibold text-sm transition-colors duration-200 flex items-center justify-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar ao login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
