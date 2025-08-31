import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function Payees() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');
  const load = async () => { const r = await api.get('/api/v1/payees'); setItems(r.data.data || []); };
  useEffect(() => { load(); }, []);
  const add = async (e: React.FormEvent) => { e.preventDefault(); await api.post('/api/v1/payees', { name }); setName(''); await load(); };
  const del = async (id: number) => { await api.delete('/api/v1/payees', { params: { id } }); await load(); };
  return (
    <div className="p-4 text-gray-900 dark:text-gray-100">
      <h1 className="text-xl font-semibold mb-4">Favorecidos</h1>
      <form onSubmit={add} className="flex gap-2 mb-4">
        <input value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-2 py-1" placeholder="Nome do favorecido" />
        <button className="px-3 py-1 bg-blue-600 text-white rounded">Adicionar</button>
      </form>
      <ul className="space-y-2">
        {items.map((t) => (
          <li key={t.id} className="flex items-center justify-between border-b pb-2">
            <span>{t.name}</span>
            <button onClick={() => del(t.id)} className="text-red-600 hover:underline">Excluir</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
