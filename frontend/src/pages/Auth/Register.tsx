import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function Register() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (senha !== confirmar) return setError('Senhas não coincidem');
    setLoading(true);
    try {
      const res = await api.post('/api/v1/auth/register', { name: nome, email, password: senha });
      if (!res.status || res.status >= 400) throw new Error('Falha no cadastro');
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow p-6" onSubmit={submit}>
        <h1 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Criar conta</h1>
        {error && <div className="text-red-600 text-sm mb-2" role="alert">{error}</div>}
        <label className="block mb-3">
          <span className="block text-sm text-gray-700 dark:text-gray-300">Nome</span>
          <input aria-label="Nome" required value={nome} onChange={(e) => setNome(e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
        </label>
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
        <label className="block mb-3">
          <span className="block text-sm text-gray-700 dark:text-gray-300">Confirmar senha</span>
          <input aria-label="Confirmar senha" type="password" required value={confirmar} onChange={(e) => setConfirmar(e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
        </label>
        <button type="submit" disabled={loading} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">
          {loading ? 'Enviando…' : 'Criar conta'}
        </button>
        <div className="flex justify-between mt-4 text-sm">
          <Link to="/login" className="text-blue-600 hover:underline">Já tenho conta</Link>
        </div>
      </form>
    </div>
  );
}
