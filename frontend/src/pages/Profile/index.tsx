import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { setAccessToken } from '../../services/api';
import ModernLayout, { ModernCard, ModernButton } from '../../components/Layout/ModernLayout';
import { 
  UserIcon,
  EmailIcon,
  LoadingIcon,
  LockIcon
} from '../../components/Icons';

type User = {
  id: number;
  nome: string;
  email: string;
  created_at: string;
};

export default function Profile() {
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get('/api/v1/me');
        setMe(res.data.data);
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleLogout = () => {
    if (window.confirm('Tem certeza que deseja sair?')) {
      setAccessToken('');
      sessionStorage.removeItem('hasAuth');
      navigate('/login');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <ModernLayout 
      title="Perfil" 
      subtitle="Gerencie suas informações pessoais"
    >
      {loading ? (
        <ModernCard>
          <div className="flex items-center justify-center py-12">
            <LoadingIcon className="text-white/50" size={32} />
            <span className="ml-3 text-white/70">Carregando perfil...</span>
          </div>
        </ModernCard>
      ) : me ? (
        <div className="grid gap-6">
          {/* Informações do usuário */}
          <ModernCard>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <UserIcon className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{me.nome}</h2>
                <p className="text-white/70">Usuário desde {formatDate(me.created_at)}</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <UserIcon className="text-white/70" size={18} />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Nome completo</p>
                  <p className="text-white font-medium">{me.nome}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <EmailIcon className="text-white/70" size={18} />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Email</p>
                  <p className="text-white font-medium">{me.email}</p>
                </div>
              </div>
            </div>
          </ModernCard>

          {/* Ações do perfil */}
          <ModernCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <LockIcon className="text-white" size={16} />
              </div>
              <h3 className="text-lg font-semibold text-white">Configurações de Conta</h3>
            </div>

            <div className="grid gap-4">
              <ModernButton
                onClick={() => navigate('/change-password')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 justify-start"
              >
                <LockIcon size={18} />
                Alterar Senha
              </ModernButton>

              <ModernButton
                onClick={handleLogout}
                variant="danger"
                className="w-full justify-start"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sair da Conta
              </ModernButton>
            </div>
          </ModernCard>

          {/* Estatísticas da conta */}
          <ModernCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Resumo da Conta</h3>
            </div>

            <div className="text-center py-8">
              <p className="text-white/70">Membro desde</p>
              <p className="text-2xl font-bold text-white mt-2">{formatDate(me.created_at)}</p>
              <p className="text-white/50 text-sm mt-2">Obrigado por usar nosso sistema!</p>
            </div>
          </ModernCard>
        </div>
      ) : (
        <ModernCard>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserIcon className="text-red-400" size={24} />
            </div>
            <p className="text-white/70 text-lg mb-2">Erro ao carregar perfil</p>
            <p className="text-white/50 text-sm">Tente recarregar a página</p>
          </div>
        </ModernCard>
      )}
    </ModernLayout>
  );
}
