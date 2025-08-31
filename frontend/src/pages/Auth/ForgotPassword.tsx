import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
  const { data } = await api.post('/api/v1/auth/forgot-password', { email });
    setDone(true);
  setMsg(data?.data?.debugLink || 'Se existir, enviaremos instruções.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow p-6" onSubmit={submit}>
        <h1 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Recuperar senha</h1>
        {done ? (
          <div className="text-green-700 dark:text-green-300">{msg}</div>
        ) : (
          <>
            <label className="block mb-3">
              <span className="block text-sm text-gray-700 dark:text-gray-300">Email</span>
              <input aria-label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
            </label>
            <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Enviar</button>
          </>
        )}
        <div className="flex justify-between mt-4 text-sm">
          <Link to="/login" className="text-blue-600 hover:underline">Voltar</Link>
        </div>
      </form>
    </div>
  );
}
