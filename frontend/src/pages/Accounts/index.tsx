import { useEffect, useState } from 'react';
import api from '../../services/api';
import { fmtCurrency } from '../../utils/format';
import { useAccounts, notifyAccountsUpdate } from '../../hooks/useAccounts';
import ModernLayout, { ModernCard, ModernButton, ModernInput } from '../../components/Layout/ModernLayout';
import { 
  CreditCardIcon, 
  BankIcon, 
  WalletIcon, 
  PiggyBankIcon,
  TrendingUpIcon,
  CashIcon,
  EditIcon,
  TrashIcon,
  ArchiveIcon,
  PlusIcon
} from '../../components/Icons';

type Account = { id: number; name: string; type: string; opening_balance: number; balance?: number };

const TYPES = [
  { value: 'cash', label: 'Dinheiro', icon: CashIcon, color: 'from-green-500 to-emerald-500' },
  { value: 'checking', label: 'Conta Corrente', icon: BankIcon, color: 'from-blue-500 to-cyan-500' },
  { value: 'savings', label: 'Poupança', icon: PiggyBankIcon, color: 'from-purple-500 to-pink-500' },
  { value: 'credit_card', label: 'Cartão de Crédito', icon: CreditCardIcon, color: 'from-orange-500 to-red-500' },
  { value: 'wallet', label: 'Carteira', icon: WalletIcon, color: 'from-yellow-500 to-orange-500' },
  { value: 'investment', label: 'Investimentos', icon: TrendingUpIcon, color: 'from-indigo-500 to-purple-500' },
];

export default function Accounts() {
  const { accounts: items, refreshAccounts } = useAccounts();
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [opening, setOpening] = useState('0');
  const [editing, setEditing] = useState<Account | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/api/v1/accounts', { name, type, opening_balance: Number(opening) });
    setName('');
    setType('checking');
    setOpening('0');
    await refreshAccounts();
    notifyAccountsUpdate();
  };

  const toggleArchive = async (id: number) => {
    await api.post('/api/v1/accounts/archive', { id });
    await refreshAccounts();
    notifyAccountsUpdate();
  };

  const remove = async (id: number) => {
    const ok = window.confirm('Deseja excluir esta conta? Se houver transações, a exclusão será bloqueada.');
    if (!ok) return;
    try {
      await api.delete('/api/v1/accounts', { params: { id } });
      await refreshAccounts();
      notifyAccountsUpdate();
    } catch (e: any) {
      alert(e?.response?.data?.error?.message || 'Não foi possível excluir');
    }
  };

  const openEdit = (account: Account) => {
    setEditing(account);
    setShowEditModal(true);
  };

  const closeEdit = () => {
    setEditing(null);
    setShowEditModal(false);
  };

  const getTypeInfo = (typeValue: string) => {
    return TYPES.find(t => t.value === typeValue) || TYPES[0];
  };

  const totalBalance = items.reduce((sum, account) => sum + (account.balance || account.opening_balance || 0), 0);

  return (
    <ModernLayout 
      title="Contas" 
      subtitle={`${items.length} contas • Saldo total: ${fmtCurrency(totalBalance)}`}
    >
      {/* Formulário de nova conta */}
      <ModernCard className="mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <PlusIcon className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Nova Conta</h2>
            <p className="text-white/70 text-sm">Adicione uma nova conta ao seu controle financeiro</p>
          </div>
        </div>

        <form onSubmit={add} className="grid md:grid-cols-3 gap-4">
          <ModernInput
            label="Nome da conta"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Conta Principal"
            icon={<BankIcon className="text-white/50" size={18} />}
            required
          />
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/90">Tipo de conta</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)} 
              className="w-full pl-4 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
              aria-label="Tipo de conta"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-gray-800 text-white">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <ModernInput
            label="Saldo inicial"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
            placeholder="Ex.: 500,00"
            icon={<CashIcon className="text-white/50" size={18} />}
            inputMode="decimal"
          />

          <div className="md:col-span-3">
            <ModernButton type="submit" className="w-full md:w-auto">
              <PlusIcon size={18} />
              Adicionar conta
            </ModernButton>
          </div>
        </form>
      </ModernCard>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {items.map((a) => {
          const typeInfo = getTypeInfo(a.type);
          const IconComponent = typeInfo.icon;
          return (
            <ModernCard key={a.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-gradient-to-r ${typeInfo.color} rounded-lg flex items-center justify-center`}>
                    <IconComponent className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{a.name}</h3>
                    <p className="text-white/70 text-sm">{typeInfo.label}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    {typeof a.balance !== 'undefined' ? fmtCurrency(Number(a.balance)) : fmtCurrency(Number(a.opening_balance||0))}
                  </div>
                  <div className="text-white/50 text-xs">
                    Inicial {fmtCurrency(Number(a.opening_balance||0))}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 pt-3 border-t border-white/10">
                <ModernButton
                  variant="secondary"
                  size="sm"
                  onClick={() => openEdit(a)}
                  className="flex-1"
                >
                  <EditIcon size={16} />
                  Editar
                </ModernButton>
                <ModernButton
                  variant="secondary"
                  size="sm"
                  onClick={() => toggleArchive(a.id)}
                  className="flex-1"
                >
                  <ArchiveIcon size={16} />
                  Arquivar
                </ModernButton>
                <ModernButton
                  variant="danger"
                  size="sm"
                  onClick={() => remove(a.id)}
                  className="flex-1"
                >
                  <TrashIcon size={16} />
                  Excluir
                </ModernButton>
              </div>
            </ModernCard>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <ModernCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-sm font-medium text-white/90">Conta</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-white/90">Tipo</th>
                  <th className="text-right py-4 px-4 text-sm font-medium text-white/90">Saldo Inicial</th>
                  <th className="text-right py-4 px-4 text-sm font-medium text-white/90">Saldo Atual</th>
                  <th className="text-center py-4 px-4 text-sm font-medium text-white/90">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => {
                  const typeInfo = getTypeInfo(a.type);
                  const IconComponent = typeInfo.icon;
                  return (
                    <tr key={a.id} className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 bg-gradient-to-r ${typeInfo.color} rounded-lg flex items-center justify-center`}>
                            <IconComponent className="text-white" size={16} />
                          </div>
                          <div>
                            <div className="font-medium text-white">{a.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-white/70">{typeInfo.label}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-white/70">{fmtCurrency(Number(a.opening_balance || 0))}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-semibold text-white">
                          {typeof a.balance !== 'undefined' ? fmtCurrency(Number(a.balance)) : fmtCurrency(Number(a.opening_balance||0))}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center gap-2">
                          <ModernButton
                            variant="secondary"
                            size="sm"
                            onClick={() => openEdit(a)}
                          >
                            <EditIcon size={14} />
                            Editar
                          </ModernButton>
                          <ModernButton
                            variant="secondary"
                            size="sm"
                            onClick={() => toggleArchive(a.id)}
                          >
                            <ArchiveIcon size={14} />
                            Arquivar
                          </ModernButton>
                          <ModernButton
                            variant="danger"
                            size="sm"
                            onClick={() => remove(a.id)}
                          >
                            <TrashIcon size={14} />
                            Excluir
                          </ModernButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ModernCard>
      </div>

      {/* Edit Modal */}
      {showEditModal && editing && (
        <EditAccountModal
          account={editing}
          onClose={closeEdit}
          onSaved={() => {
            closeEdit();
            refreshAccounts();
            notifyAccountsUpdate();
          }}
        />
      )}
    </ModernLayout>
  );
}

function EditAccountModal({ account, onClose, onSaved }: { account: Account; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(account.name);
  const [type, setType] = useState(account.type);
  const [openingBalance, setOpeningBalance] = useState(String(account.opening_balance || 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.put('/api/v1/accounts', {
        id: account.id,
        name: name.trim(),
        type,
        opening_balance: Number(openingBalance)
      });
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Erro ao salvar conta');
    } finally {
      setSaving(false);
    }
  };

  const getTypeInfo = (typeValue: string) => {
    return TYPES.find(t => t.value === typeValue) || TYPES[0];
  };

  const typeInfo = getTypeInfo(type);
  const IconComponent = typeInfo.icon;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-r ${typeInfo.color} rounded-lg flex items-center justify-center`}>
              <IconComponent className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Editar Conta</h2>
              <p className="text-white/70 text-sm">Atualize as informações da conta</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-300 p-3 rounded-lg text-sm backdrop-blur-sm">
              {error}
            </div>
          )}

          <ModernInput
            label="Nome da Conta *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Conta Principal"
            icon={<BankIcon className="text-white/50" size={18} />}
            required
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/90">Tipo de conta</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)} 
              className="w-full pl-4 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-gray-800 text-white">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <ModernInput
            label="Saldo Inicial"
            type="number"
            step="0.01"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            placeholder="0.00"
            icon={<CashIcon className="text-white/50" size={18} />}
          />

          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 p-3 rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>Alterar o saldo inicial pode afetar o histórico de transações</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <ModernButton
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </ModernButton>
            <ModernButton
              type="submit"
              disabled={saving}
              className="flex-1"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </ModernButton>
          </div>
        </form>
      </div>
    </div>
  );
}
