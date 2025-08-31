import { useEffect, useState } from 'react';
import api from '../../services/api';
import { fmtCurrency } from '../../utils/format';

type Account = { id: number; name: string; type: string; opening_balance: number; balance?: number };

const TYPES = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'checking', label: 'Conta Corrente' },
  { value: 'savings', label: 'Poupança' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'wallet', label: 'Carteira' },
  { value: 'investment', label: 'Investimentos' },
];

export default function Accounts() {
  const [items, setItems] = useState<Account[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [opening, setOpening] = useState('0');
  const load = async () => {
    const res = await api.get('/api/v1/accounts');
    setItems(res.data.data || []);
  };
  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/api/v1/accounts', { name, type, opening_balance: Number(opening) });
    setName('');
    setType('checking');
    setOpening('0');
    await load();
  };

  const toggleArchive = async (id: number) => {
    await api.post('/api/v1/accounts/archive', { id });
    await load();
  };

  const remove = async (id: number) => {
    const ok = window.confirm('Deseja excluir esta conta? Se houver transações, a exclusão será bloqueada.');
    if (!ok) return;
    try {
      await api.delete('/api/v1/accounts', { params: { id } });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error?.message || 'Não foi possível excluir');
    }
  };

  return (
    <div className="p-4 text-[color:var(--text)]">
      <h1 className="heading text-2xl mb-4">Contas</h1>
      <form onSubmit={add} className="flex flex-wrap gap-2 mb-4 items-center">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da conta" className="input px-2 py-1 text-sm" required />
        <select value={type} onChange={(e) => setType(e.target.value)} className="input px-2 py-1 text-sm">
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} className="input px-2 py-1 text-sm" placeholder="Saldo inicial" />
        <button className="btn-primary text-sm">Adicionar</button>
      </form>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {items.map((a) => (
          <div key={a.id} className="surface-2 rounded-lg p-3 border border-white/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="text-xs text-[color:var(--text-dim)]">{TYPES.find((t)=>t.value===a.type)?.label ?? a.type}</div>
              </div>
              <div className="text-right">
                <div className="text-sm tnum">{typeof a.balance !== 'undefined' ? fmtCurrency(Number(a.balance)) : '-'}</div>
                <div className="text-[11px] text-[color:var(--text-dim)]">Inicial {fmtCurrency(Number(a.opening_balance||0))}</div>
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-2">
              <button onClick={() => toggleArchive(a.id)} className="text-[color:var(--text-dim)] hover:text-[color:var(--text)] text-sm">Arquivar</button>
              <button onClick={() => remove(a.id)} className="text-rose-400 hover:text-rose-300 text-sm">Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-auto">
        <table className="min-w-[720px] w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">Nome</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Saldo</th>
              <th className="p-2">Saldo Inicial</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-2">{a.name}</td>
                <td className="p-2">{TYPES.find((t) => t.value === a.type)?.label ?? a.type}</td>
                <td className="p-2">{typeof a.balance !== 'undefined' ? fmtCurrency(Number(a.balance)) : '-'}</td>
                <td className="p-2">{fmtCurrency(Number(a.opening_balance || 0))}</td>
                <td className="p-2 text-right flex gap-3 justify-end">
                  <button onClick={() => toggleArchive(a.id)} className="text-[color:var(--text-dim)] hover:text-[color:var(--text)]">Arquivar</button>
                  <button onClick={() => remove(a.id)} className="text-rose-400 hover:text-rose-300">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
