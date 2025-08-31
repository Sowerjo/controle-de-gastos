import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function ResetPassword() {
  const [novaSenha, setNovaSenha] = useState('');
  const [msg, setMsg] = useState('');
  const [sp] = useSearchParams();
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = sp.get('token');
    if (!token) return setMsg('Token ausente');
  const res = await api.post('/api/v1/auth/reset-password', { token, novaSenha });
  if (res.status < 400) {
      setMsg('Senha alterada com sucesso');
      setTimeout(() => nav('/login'), 1200);
    } else {
      setMsg('Falha ao alterar senha');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow p-6" onSubmit={submit}>
        <h1 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Nova senha</h1>
        {msg && <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">{msg}</div>}
        <label className="block mb-3">
          <span className="block text-sm text-gray-700 dark:text-gray-300">Senha</span>
          <input aria-label="Senha" type="password" required value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
        </label>
        <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Alterar</button>
        <div className="flex justify-between mt-4 text-sm">
          <Link to="/login" className="text-blue-600 hover:underline">Voltar</Link>
        </div>
      </form>
    </div>
  );
}
