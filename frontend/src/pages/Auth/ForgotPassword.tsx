import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  EmailIcon,
  LoadingIcon,
  CheckIcon
} from '../../components/Icons';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data } = await api.post('/api/v1/auth/forgot-password', { email });
      setDone(true);
      setMsg(data?.data?.debugLink || 'Se existir, enviaremos instruções.');
    } catch (error) {
      setMsg('Erro ao enviar instruções. Tente novamente.');
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
            <h1 className="text-3xl font-bold text-white mb-2">Recuperar senha</h1>
            <p className="text-white/70 text-sm">
              {done ? 'Instruções enviadas!' : 'Digite seu email para receber instruções'}
            </p>
          </div>

          {done ? (
            /* Tela de sucesso */
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckIcon size={32} className="text-green-400" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Email enviado!</h3>
                <p className="text-white/70 text-sm leading-relaxed">
                  {msg}
                </p>
              </div>

              <div className="pt-4">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                >
                  Voltar ao login
                </Link>
              </div>
            </div>
          ) : (
            /* Formulário */
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
                <p className="text-white/60 text-xs">
                  Enviaremos um link para redefinir sua senha
                </p>
              </div>

              {/* Botão de Envio */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-1 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <LoadingIcon size={18} />
                    Enviando...
                  </>
                ) : (
                  'Enviar instruções'
                )}
              </button>
            </form>
          )}

          {/* Link para voltar */}
          {!done && (
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
