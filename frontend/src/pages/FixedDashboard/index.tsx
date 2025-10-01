import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { fmtCurrency } from '../../utils/format';
import { useMonth } from '../../contexts/MonthContext';
import MonthSelector from '../../components/MonthSelector';

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
      summary.total += expense.amount;
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

    setStatusCounts(counts);

    // Total mensal
    const total = expensesData.reduce((sum, expense) => sum + expense.amount, 0);
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
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading text-3xl font-bold">Dashboard de Gastos Fixos</h1>
          <p className="text-[color:var(--text-dim)] mt-1">
            Visão completa dos seus gastos recorrentes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MonthSelector />
          <Link
            to="/fixed"
            className="btn-primary text-sm flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
            </svg>
            Gerenciar Gastos
          </Link>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-[color:var(--text-dim)]">Total Mensal</p>
              <p className="text-2xl font-bold text-[color:var(--text)]">
                {fmtCurrency(monthlyTotal)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16" className="text-blue-400">
                <path d="M4 10.781c.148 1.667 1.513 2.85 3.591 3.003V15h1.043v-1.216c2.27-.179 3.678-1.438 3.678-3.3 0-1.59-.947-2.51-2.956-3.028l-.722-.187V3.467c1.122.11 1.879.714 2.07 1.616h1.47c-.166-1.6-1.54-2.748-3.54-2.875V1H7.591v1.233c-1.939.23-3.27 1.472-3.27 3.156 0 1.454.966 2.483 2.661 2.917l.61.162v4.031c-1.149-.17-1.94-.8-2.131-1.718H4zm3.391-3.836c-1.043-.263-1.6-.825-1.6-1.616 0-.944.704-1.641 1.8-1.828v3.495l-.2-.05zm1.591 1.872c1.287.323 1.852.859 1.852 1.769 0 1.097-.826 1.828-2.2 1.939V8.73l.348.086z"/>
              </svg>
            </div>
          </div>
          <div className="space-y-1">
            {expenses.slice(0, 3).map((expense) => (
              <div key={expense.id} className="text-xs text-[color:var(--text-dim)] flex justify-between">
                <span className="truncate">{expense.description}</span>
                <span className="ml-2 font-medium">{fmtCurrency(expense.amount)}</span>
              </div>
            ))}
            {expenses.length > 3 && (
              <div className="text-xs text-[color:var(--text-dim)] italic">
                +{expenses.length - 3} outros gastos
              </div>
            )}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-[color:var(--text-dim)]">Pagos</p>
              <p className="text-2xl font-bold text-green-400">{statusCounts.pago}</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
          <div className="space-y-1">
            {expenses.filter(e => e.payment_status === 'pago').slice(0, 3).map((expense) => (
              <div key={expense.id} className="text-xs text-green-300/80 flex justify-between">
                <span className="truncate">{expense.description}</span>
                <span className="ml-2 font-medium">{fmtCurrency(expense.amount)}</span>
              </div>
            ))}
            {expenses.filter(e => e.payment_status === 'pago').length === 0 && (
              <div className="text-xs text-[color:var(--text-dim)] italic">
                Nenhum gasto pago
              </div>
            )}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-[color:var(--text-dim)]">Pendentes</p>
              <p className="text-2xl font-bold text-amber-400">{statusCounts.pendente}</p>
            </div>
            <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
          <div className="space-y-1">
            {expenses.filter(e => e.payment_status === 'pendente').slice(0, 3).map((expense) => (
              <div key={expense.id} className="text-xs text-amber-300/80 flex justify-between">
                <span className="truncate">{expense.description}</span>
                <span className="ml-2 font-medium">{fmtCurrency(expense.amount)}</span>
              </div>
            ))}
            {expenses.filter(e => e.payment_status === 'pendente').length === 0 && (
              <div className="text-xs text-[color:var(--text-dim)] italic">
                Nenhum gasto pendente
              </div>
            )}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-[color:var(--text-dim)]">Atrasados</p>
              <p className="text-2xl font-bold text-red-400">{statusCounts.atrasado}</p>
            </div>
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔴</span>
            </div>
          </div>
          <div className="space-y-1">
            {expenses.filter(e => e.payment_status === 'atrasado').slice(0, 3).map((expense) => (
              <div key={expense.id} className="text-xs text-red-300/80 flex justify-between">
                <span className="truncate">{expense.description}</span>
                <span className="ml-2 font-medium">{fmtCurrency(expense.amount)}</span>
              </div>
            ))}
            {expenses.filter(e => e.payment_status === 'atrasado').length === 0 && (
              <div className="text-xs text-[color:var(--text-dim)] italic">
                Nenhum gasto atrasado
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico de Categorias e Próximos Vencimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumo por Categoria */}
        <div className="card p-6">
          <h3 className="heading text-lg font-semibold mb-4">Gastos por Categoria</h3>
          <div className="space-y-3">
            {categorySummary.slice(0, 5).map((category, index) => {
              const maxTotal = categorySummary[0]?.total || 1;
              const percentage = (category.total / maxTotal) * 100;
              
              return (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{category.category}</span>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{fmtCurrency(category.total)}</div>
                      <div className="text-xs text-[color:var(--text-dim)]">
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
        </div>

        {/* Próximos Vencimentos */}
        <div className="card p-6">
          <h3 className="heading text-lg font-semibold mb-4">Próximos Vencimentos</h3>
          <div className="space-y-3">
            {upcomingExpenses.length > 0 ? (
              upcomingExpenses.slice(0, 5).map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getStatusIcon(expense.payment_status)}</span>
                    <div>
                      <div className="font-medium">{expense.description}</div>
                      <div className="text-xs text-[color:var(--text-dim)]">
                        {expense.category_name} • {new Date(expense.next_run).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{fmtCurrency(expense.amount)}</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(expense.payment_status)}`}>
                      {expense.payment_status}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-[color:var(--text-dim)]">
                <span className="text-4xl mb-2 block">🎉</span>
                <p>Nenhum vencimento próximo!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filtros e Tabela */}
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <h3 className="heading text-lg font-semibold">Todos os Gastos Fixos</h3>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Buscar por descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input px-3 py-2 text-sm min-w-[200px]"
            />
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input px-3 py-2 text-sm"
            >
              <option value="all">Todas as categorias</option>
              {categorySummary.map((cat) => (
                <option key={cat.category} value={cat.category}>
                  {cat.category}
                </option>
              ))}
            </select>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input px-3 py-2 text-sm"
            >
              <option value="all">Todos os status</option>
              <option value="pago">Pagos</option>
              <option value="pendente">Pendentes</option>
              <option value="atrasado">Atrasados</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-2 text-sm font-medium text-[color:var(--text-dim)]">Descrição</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-[color:var(--text-dim)]">Categoria</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-[color:var(--text-dim)]">Valor</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-[color:var(--text-dim)]">Vencimento</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-[color:var(--text-dim)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-2">
                    <div className="font-medium">{expense.description}</div>
                    <div className="text-xs text-[color:var(--text-dim)]">{expense.account_name}</div>
                  </td>
                  <td className="py-3 px-2 text-sm">{expense.category_name}</td>
                  <td className="py-3 px-2 font-semibold">{fmtCurrency(expense.amount)}</td>
                  <td className="py-3 px-2 text-sm">
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
            <div className="text-center py-8 text-[color:var(--text-dim)]">
              <span className="text-4xl mb-2 block">🔍</span>
              <p>Nenhum gasto encontrado com os filtros aplicados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FixedExpensesDashboard;