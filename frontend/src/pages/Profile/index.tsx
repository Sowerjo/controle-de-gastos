import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function Profile() {
  const [me, setMe] = useState<any>(null);
  useEffect(() => {
    (async () => {
      const res = await api.get('/api/v1/me');
      setMe(res.data.data);
    })();
  }, []);

  return (
    <div className="p-4 text-gray-900 dark:text-gray-100">
      <h1 className="text-xl font-semibold mb-4">Perfil</h1>
      {me ? (
        <div className="space-y-2">
          <div><span className="text-gray-600 dark:text-gray-400">Nome: </span>{me.nome}</div>
          <div><span className="text-gray-600 dark:text-gray-400">Email: </span>{me.email}</div>
        </div>
      ) : (
        <div>Carregando…</div>
      )}
    </div>
  );
}
