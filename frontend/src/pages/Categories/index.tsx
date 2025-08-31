import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function Categories() {
  const [items, setItems] = useState<any[]>([]);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');

  const load = async () => {
    const res = await api.get('/api/v1/categories');
    setItems(res.data.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/api/v1/categories', { nome, tipo });
    setNome('');
    await load();
  };

  const del = async (id: number) => {
  await api.delete('/api/v1/categories', { params: { id } });
    await load();
  };

  return (
    <div className="p-4">
      <h1 className="heading text-2xl mb-4">Categorias</h1>
      <form onSubmit={add} className="flex gap-2 mb-4">
        <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className="input px-2 py-2">
          <option value="receita">Receita</option>
          <option value="despesa">Despesa</option>
        </select>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" className="input px-3 py-2" required minLength={2} />
        <button className="btn-primary">Adicionar</button>
      </form>
      <ul className="space-y-2">
    {items.map((c) => (
          <li key={c.id} className="flex justify-between items-center card p-3">
            <div>
      <span className="text-xs mr-2 px-2 py-1 rounded bg-white/5">{c.type}</span>
      {c.name}
            </div>
            <button onClick={() => del(c.id)} className="text-red-400 hover:text-red-300" aria-label={`Excluir ${c.nome}`}>
              Excluir
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
