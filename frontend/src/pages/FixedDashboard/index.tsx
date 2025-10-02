import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { fmtCurrency } from '../../utils/format';
import { useMonth } from '../../contexts/MonthContext';
import MonthSelector from '../../components/MonthSelector';
import ModernLayout, { ModernCard, ModernButton } from '../../components/Layout/ModernLayout';
import { 
  CashIcon, 
  CheckIcon, 
  EditIcon, 
  ClearIcon, 
  PlusIcon, 
  SearchIcon, 
  FilterIcon,
  ChartBarIcon,
  CalendarIcon,
  CreditCardIcon,
  LoadingIcon
} from '../../components/Icons';

interface FixedExpense {
  id: number;
  description: string;
  amount: number;
  category_id: number;
  category_name?: string;
  account_id: number;
  account_name?: string;
  next_run: string;
  last_run?: string;
  type: string;
  payment_status: 'pago' | 'pendente' | 'atrasado';
}

interface CategorySummary {
  category: string;
  total: number;
  count: number;
  items: FixedExpense[];
}

interface StatusCounts {
  pago: number;
  pendente: number;
  atrasado: number;
  total: number;
}

const FixedExpensesDashboard: React.FC = () => {
  const { monthRange } = useMonth();
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  // Estados para dados processados
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    pago: 0,
    pendente: 0,
    atrasado: 0,
    total: 0
  });
  const [statusTotals, setStatusTotals] = useState<{ pago: number; pendente: number; atrasado: number }>({ pago: 0, pendente: 0, atrasado: 0 });
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [upcomingExpenses, setUpcomingExpenses] = useState<FixedExpense[]>([]);

  // Carregar dados
  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Tentando carregar dados da API...');
      
      const [expensesRes, categoriesRes, accountsRes] = await Promise.all([
        api.get('/api/v1/recurring'),
        api.get('/api/v1/categories'),
        api.get('/api/v1/accounts')
      ]);

      console.log('Dados carregados da API:', { 
        expenses: expensesRes.data?.data?.length || 0,
        categories: categoriesRes.data?.data?.length || 0,
        accounts: accountsRes.data?.data?.length || 0
      });

      const allExpenses = (expensesRes.data?.data || [])
        .filter((item: any) => item.type === 'DESPESA')
        .map((item: any) => ({
          ...item,
          // Usar payment_status diretamente do banco de dados
          payment_status: item.payment_status || 'pendente'
        }));

      const categoriesData = categoriesRes.data?.data || [];
      const accountsData = accountsRes.data?.data || [];

      // Mapear nomes de categorias e contas
      const categoryMap = new Map(categoriesData.map((c: any) => [c.id, c.name]));
      const accountMap = new Map(accountsData.map((a: any) => [a.id, a.name]));

      const enrichedExpenses = allExpenses.map((expense: any) => ({
        ...expense,
        category_name: categoryMap.get(expense.category_id) || 'Sem categoria',
        account_name: accountMap.get(expense.account_id) || 'Sem conta'
      }));

      setExpenses(enrichedExpenses);
      setCategories(categoriesData);
      setAccounts(accountsData);

      // Processar dados para resumos
      processData(enrichedExpenses);
      
      console.log('Dados processados com sucesso!');
    } catch (error) {
      console.error('Erro ao carregar dados da API, usando dados de exemplo:', error);
      // Dados de exemplo em caso de erro
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  // Processar dados para gerar resumos
  const processData = (expensesData: FixedExpense[]) => {
    // Resumo por categoria
    const categoryMap = new Map<string, CategorySummary>();
    
    expensesData.forEach(expense => {
      const categoryName = expense.category_name || 'Sem categoria';
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          category: categoryName,
          total: 0,
          count: 0,
          items: []
        });
      }
      
      const summary = categoryMap.get(categoryName)!;
      // Ensure amount is numeric to avoid NaN and string concatenation
      summary.total += Number((expense as any).amount || 0);
      summary.count += 1;
      summary.items.push(expense);
    });

    setCategorySummary(Array.from(categoryMap.values()).sort((a, b) => b.total - a.total));

    // Contagem por status
    const counts = expensesData.reduce((acc, expense) => {
      acc[expense.payment_status]++;
      acc.total++;
      return acc;
    }, { pago: 0, pendente: 0, atrasado: 0, total: 0 });

    // Totais por status
    const totals = { pago: 0, pendente: 0, atrasado: 0 };
    for (const e of expensesData) {
      const amt = Number((e as any).amount || 0);
      if (e.payment_status === 'pago') totals.pago += amt;
      else if (e.payment_status === 'pendente') totals.pendente += amt;
      else totals.atrasado += amt;
    }

    setStatusCounts(counts);
    setStatusTotals(totals);

    // Total mensal
    const total = expensesData.reduce((sum, expense) => sum + Number((expense as any).amount || 0), 0);
    setMonthlyTotal(total);

    // Próximos vencimentos (próximos 7 dias)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const upcoming = expensesData
      .filter(expense => {
        const nextRun = new Date(expense.next_run);
        return nextRun >= today && nextRun <= nextWeek && expense.payment_status !== 'pago';
      })
      .sort((a, b) => new Date(a.next_run).getTime() - new Date(b.next_run).getTime());

    setUpcomingExpenses(upcoming);
  };

  // Dados de exemplo para quando a API não está disponível
  const setMockData = () => {
    const mockExpenses: FixedExpense[] = [
      {
        id: 1,
        description: 'Aluguel',
        amount: 2500,
        category_id: 1,
        category_name: 'Moradia',
        account_id: 1,
        account_name: 'Conta Corrente',
        next_run: '2024-01-05',
        type: 'DESPESA',
        payment_status: 'pendente'
      },
      {
        id: 2,
        description: 'Financiamento do Carro',
        amount: 800,
        category_id: 2,
        category_name: 'Transporte',
        account_id: 1,
        account_name: 'Conta Corrente',
        next_run: '2024-01-10',
        type: 'DESPESA',
        payment_status: 'pendente'
      },
      {
        id: 3,
        description: 'Plano de Saúde',
        amount: 450,
        category_id: 3,
        category_name: 'Saúde',
        account_id: 1,
        account_name: 'Conta Corrente',
        next_run: '2024-01-15',
        last_run: '2024-01-15',
        type: 'DESPESA',
        payment_status: 'pago'
      },
      {
        id: 4,
        description: 'Internet',
        amount: 120,
        category_id: 4,
        category_name: 'Utilidades',
        account_id: 1,
        account_name: 'Conta Corrente',
        next_run: '2023-12-28',
        type: 'DESPESA',
        payment_status: 'atrasado'
      }
    ];

    setExpenses(mockExpenses);
    processData(mockExpenses);
  };

  useEffect(() => {
    loadData();
  }, [monthRange]);

  // Filtrar gastos baseado nos filtros selecionados
  const filteredExpenses = expenses.filter(expense => {
    const matchesCategory = selectedCategory === 'all' || expense.category_name === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || expense.payment_status === selectedStatus;
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago': return 'text-green-400 bg-green-400/10';
      case 'pendente': return 'text-amber-400 bg-amber-400/10';
      case 'atrasado': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pago': return '✅';
      case 'pendente': return '⏳';
      case 'atrasado': return '🔴';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <ModernLayout
        title="Dashboard de Gastos Fixos"
        subtitle="Carregando dados..."
        headerActions={<MonthSelector />}
      >
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-white/70">
            <LoadingIcon className="w-6 h-6 animate-spin" />
            <span>Carregando dados...</span>
          </div>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout
      title="Dashboard de Gastos Fixos"
      subtitle="Visão completa dos seus gastos recorrentes"
      headerActions={
        <div className="flex items-center gap-3">
          <MonthSelector />
          <ModernButton
            variant="primary"
            size="sm"
            onClick={() => window.location.href = '/fixed'}
            className="flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Gerenciar Gastos
          </ModernButton>
        </div>
      }
    >
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <ModernCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/30">
              <CashIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Total Mensal</p>
              <p className="text-2xl font-bold text-white">{fmtCurrency(monthlyTotal)}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {expenses.slice(0, 3).map((expense) => (
              <div key={expense.id} className="flex justify-between items-center text-xs text-white/60">
                <span className="truncate">{expense.description}</span>
                <span className="ml-2 font-medium text-white/80">{fmtCurrency(expense.amount)}</span>
              </div>
            ))}
            {expenses.length > 3 && (
              <div className="text-xs text-white/50 italic">
                +{expenses.length - 3} outros gastos
              </div>
            )}
          </div>
        </ModernCard>

        <ModernCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/20 border border-green-500/30">
              <CheckIcon className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Pagos</p>
                    <p className="text-2xl font-bold text-green-400">{statusCounts.pago}</p>
                    <p className="text-xs text-green-300 mt-1">{fmtCurrency(statusTotals.pago)}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {expenses.filter(e => e.payment_status === 'pago').slice(0, 3).map((expense) => (
              <div key={expense.id} className="flex justify-between items-center text-xs text-green-300/80">
                <span className="truncate">{expense.description}</span>
                <span className="ml-2 font-medium">{fmtCurrency(expense.amount)}</span>
              </div>
            ))}
            {expenses.filter(e => e.payment_status === 'pago').length === 0 && (
              <div className="text-xs text-white/50 italic">
                Nenhum gasto pago
              </div>
            )}
          </div>
        </ModernCard>

        <ModernCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-yellow-500/20 border border-yellow-500/30">
              <CalendarIcon className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Pendentes</p>
                    <p className="text-2xl font-bold text-yellow-400">{statusCounts.pendente}</p>
                    <p className="text-xs text-yellow-300 mt-1">{fmtCurrency(statusTotals.pendente)}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {expenses.filter(e => e.payment_status === 'pendente').slice(0, 3).map((expense) => (
              <div key={expense.id} className="flex justify-between items-center text-xs text-yellow-300/80">
                <span className="truncate">{expense.description}</span>
                <span className="ml-2 font-medium">{fmtCurrency(expense.amount)}</span>
              </div>
            ))}
            {expenses.filter(e => e.payment_status === 'pendente').length === 0 && (
              <div className="text-xs text-white/50 italic">
                Nenhum gasto pendente
              </div>
            )}
          </div>
        </ModernCard>

        <ModernCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30">
              <ClearIcon className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Atrasados</p>
                    <p className="text-2xl font-bold text-red-400">{statusCounts.atrasado}</p>
                    <p className="text-xs text-red-300 mt-1">{fmtCurrency(statusTotals.atrasado)}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {expenses.filter(e => e.payment_status === 'atrasado').slice(0, 3).map((expense) => (
              <div key={expense.id} className="flex justify-between items-center text-xs text-red-300/80">
                <span className="truncate">{expense.description}</span>
                <span className="ml-2 font-medium">{fmtCurrency(expense.amount)}</span>
              </div>
            ))}
            {expenses.filter(e => e.payment_status === 'atrasado').length === 0 && (
              <div className="text-xs text-white/50 italic">
                Nenhum gasto atrasado
              </div>
            )}
          </div>
        </ModernCard>
      </div>

      {/* Gráfico de Categorias e Próximos Vencimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Resumo por Categoria */}
        <ModernCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
              <ChartBarIcon className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Gastos por Categoria</h3>
              <p className="text-white/70 text-sm">Distribuição dos gastos fixos</p>
            </div>
          </div>
          <div className="space-y-4">
            {categorySummary.slice(0, 5).map((category, index) => {
              const maxTotal = categorySummary[0]?.total || 1;
              const percentage = (category.total / maxTotal) * 100;
              
              return (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{category.category}</span>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white">{fmtCurrency(category.total)}</div>
                      <div className="text-xs text-white/60">
                        {category.count} {category.count === 1 ? 'item' : 'itens'}
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-cyan-400 to-purple-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ModernCard>

        {/* Próximos Vencimentos */}
        <ModernCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-orange-500/20 border border-orange-500/30">
              <CalendarIcon className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Próximos Vencimentos</h3>
              <p className="text-white/70 text-sm">Gastos que vencem em breve</p>
            </div>
          </div>
          <div className="space-y-3">
            {upcomingExpenses.length > 0 ? (
              upcomingExpenses.slice(0, 5).map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getStatusIcon(expense.payment_status)}</span>
                    <div>
                      <div className="font-medium text-white">{expense.description}</div>
                      <div className="text-xs text-white/60">
                        {expense.category_name} • {new Date(expense.next_run).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-white">{fmtCurrency(expense.amount)}</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(expense.payment_status)}`}>
                      {expense.payment_status}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🎉</div>
                <div className="text-sm text-white/70">Nenhum vencimento próximo!</div>
              </div>
            )}
          </div>
        </ModernCard>
      </div>

      {/* Filtros e Tabela */}
      <ModernCard className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
              <FilterIcon className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Todos os Gastos Fixos</h3>
              <p className="text-white/70 text-sm">Lista completa com filtros</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="text"
                placeholder="Buscar por descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent min-w-[200px]"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="all" className="bg-gray-800">Todas as categorias</option>
              {categorySummary.map((cat) => (
                <option key={cat.category} value={cat.category} className="bg-gray-800">
                  {cat.category}
                </option>
              ))}
            </select>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="all" className="bg-gray-800">Todos os status</option>
              <option value="pago" className="bg-gray-800">Pagos</option>
              <option value="pendente" className="bg-gray-800">Pendentes</option>
              <option value="atrasado" className="bg-gray-800">Atrasados</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-2 text-sm font-medium text-white/70">Descrição</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-white/70">Categoria</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-white/70">Valor</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-white/70">Vencimento</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-white/70">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-2">
                    <div className="font-medium text-white">{expense.description}</div>
                    <div className="text-xs text-white/60">{expense.account_name}</div>
                  </td>
                  <td className="py-3 px-2 text-sm">{expense.category_name}</td>
                  <td className="py-3 px-2 font-semibold text-white font-mono">{fmtCurrency(expense.amount)}</td>
                  <td className="py-3 px-2 text-sm text-white/80">
                    {new Date(expense.next_run).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(expense.payment_status)}`}>
                      {getStatusIcon(expense.payment_status)}
                      {expense.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredExpenses.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🔍</div>
              <div className="text-sm text-white/70">Nenhum gasto encontrado com os filtros aplicados.</div>
            </div>
          )}
        </div>
      </ModernCard>
    </ModernLayout>
  );
};

export default FixedExpensesDashboard;