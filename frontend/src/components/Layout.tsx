import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import NewTransactionModal from './NewTransactionModal';
import { setAccessToken } from '../services/api';

// Ícones para navegação
const Icons = {
  dashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 4a.5.5 0 0 1 .5.5V6a.5.5 0 0 1-1 0V4.5A.5.5 0 0 1 8 4zM3.732 5.732a.5.5 0 0 1 .707 0l.915.914a.5.5 0 1 1-.708.708l-.914-.915a.5.5 0 0 1 0-.707zM2 10a.5.5 0 0 1 .5-.5h1.586a.5.5 0 0 1 0 1H2.5A.5.5 0 0 1 2 10zm9.5 0a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H12a.5.5 0 0 1-.5-.5zm.754-4.246a.389.389 0 0 0-.527-.02L7.547 9.31a.91.91 0 1 0 1.302 1.258l3.434-4.297a.389.389 0 0 0-.029-.518z"/>
      <path fillRule="evenodd" d="M0 10a8 8 0 1 1 15.547 2.661c-.442 1.253-1.845 1.602-2.932 1.25C11.309 13.488 9.475 13 8 13c-1.474 0-3.31.488-4.615.911-1.087.352-2.49.003-2.932-1.25A7.988 7.988 0 0 1 0 10zm8-7a7 7 0 0 0-6.603 9.329c.203.575.923.876 1.68.63C4.397 12.533 6.358 12 8 12s3.604.532 4.923.96c.757.245 1.477-.056 1.68-.631A7 7 0 0 0 8 3z"/>
    </svg>
  ),
  transactions: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"/>
    </svg>
  ),
  accounts: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M12.136.326A1.5 1.5 0 0 1 14 1.78V3h.5A1.5 1.5 0 0 1 16 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 13.5v-9a1.5 1.5 0 0 1 1.432-1.499L12.136.326zM5.562 3H13V1.78a.5.5 0 0 0-.621-.484L5.562 3zM1.5 4a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-13z"/>
    </svg>
  ),
  categories: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M3 2v4.586l7 7L14.586 9l-7-7H3zM2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586V2z"/>
      <path d="M5.5 5a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm0 1a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM1 7.086a1 1 0 0 0 .293.707L8.75 15.25l-.043.043a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 0 7.586V3a1 1 0 0 1 1-1v5.086z"/>
    </svg>
  ),
  budgets: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/>
    </svg>
  ),
  goals: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
      <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
    </svg>
  ),
  reports: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M0 0h1v15h15v1H0V0Zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07Z"/>
    </svg>
  ),
  import: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
      <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
    </svg>
  ),
  reconcile: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
    </svg>
  ),
  recurring: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
      <path fillRule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
    </svg>
  ),
  profile: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
      <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
    </svg>
  ),
};

function AppBar({ onLogout }: { onLogout: () => void }) {
  const [currentDate, setCurrentDate] = React.useState<string>('');
  
  React.useEffect(() => {
    // Formatar a data atual no formato "Mês Ano"
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    const formattedDate = now.toLocaleDateString('pt-BR', options);
    setCurrentDate(formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1));
  }, []);
  
  return (
    <header className="sticky top-0 z-30 surface-2 backdrop-blur-lg border-b border-white/5 h-14 flex items-center justify-between px-4 shadow-md">
      <div className="flex items-center gap-3">
        <div className="hidden md:block text-sm text-[color:var(--text-dim)]">Período</div>
        <button className="text-sm rounded-full border border-white/10 px-3 py-1 bg-[color:var(--surf-1)] hover:border-white/20 hover:bg-[color:var(--surf-2)] transition-colors">
          {currentDate}
        </button>
      </div>
      <div className="hidden md:block flex-1 max-w-xl mx-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[color:var(--text-dim)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
          </div>
          <input
            placeholder="Pesquisar (/ para focar)"
            className="w-full input pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-all"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="btn-primary text-sm flex items-center gap-1 hover:scale-105 transition-transform"
          onClick={() => window.dispatchEvent(new CustomEvent('open-new-transaction'))}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
          </svg>
          Nova transação
        </button>
        <button
          className="text-sm rounded-full border border-white/10 px-3 py-1 bg-[color:var(--surf-1)] hover:border-white/20 hover:bg-[color:var(--surf-2)] transition-colors flex items-center gap-1"
          onClick={onLogout}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
            <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
          </svg>
          Sair
        </button>
      </div>
    </header>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const doLogout = React.useCallback(() => {
    try {
      setAccessToken(null);
      sessionStorage.removeItem('hasAuth');
      document.cookie = 'refreshToken=; Max-Age=0; path=/';
    } catch {}
    navigate('/login');
  }, [navigate]);
  // Global shortcuts: G (dashboard), T (transactions)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'g' || e.key === 'G') { e.preventDefault(); navigate('/'); }
      if (e.key === 't' || e.key === 'T') { e.preventDefault(); navigate('/transactions'); }
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);
  return (
    <div className="min-h-screen grid md:grid-cols-[240px_1fr] bg-[color:var(--bg)] text-[color:var(--text)]">
      <aside className="hidden md:flex flex-col gap-2 p-4 surface-2 backdrop-blur-lg border-r border-white/5 shadow-lg">
        <div className="px-2 py-3 heading text-lg flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path d="M12.136.326A1.5 1.5 0 0 1 14 1.78V3h.5A1.5 1.5 0 0 1 16 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 13.5v-9a1.5 1.5 0 0 1 1.432-1.499L12.136.326zM5.562 3H13V1.78a.5.5 0 0 0-.621-.484L5.562 3zM1.5 4a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-13z"/>
          </svg>
          <span>Finanças</span>
        </div>
        <NavLink to="/" active={pathname === '/'}>
          <span className="flex items-center gap-2">
            {Icons.dashboard}
            <span>Dashboard</span>
          </span>
        </NavLink>
        <NavLink to="/transactions" active={pathname.startsWith('/transactions')}>
          <span className="flex items-center gap-2">
            {Icons.transactions}
            <span>Transações</span>
          </span>
        </NavLink>
        <NavLink to="/accounts" active={pathname.startsWith('/accounts')}>
          <span className="flex items-center gap-2">
            {Icons.accounts}
            <span>Contas</span>
          </span>
        </NavLink>
        <NavLink to="/categories" active={pathname.startsWith('/categories')}>
          <span className="flex items-center gap-2">
            {Icons.categories}
            <span>Categorias</span>
          </span>
        </NavLink>
        <NavLink to="/budgets" active={pathname.startsWith('/budgets')}>
          <span className="flex items-center gap-2">
            {Icons.budgets}
            <span>Orçamentos</span>
          </span>
        </NavLink>
        <NavLink to="/goals" active={pathname.startsWith('/goals')}>
          <span className="flex items-center gap-2">
            {Icons.goals}
            <span>Metas</span>
          </span>
        </NavLink>
        <NavLink to="/reports" active={pathname.startsWith('/reports')}>
          <span className="flex items-center gap-2">
            {Icons.reports}
            <span>Relatórios</span>
          </span>
        </NavLink>
        <NavLink to="/import" active={pathname.startsWith('/import')}>
          <span className="flex items-center gap-2">
            {Icons.import}
            <span>Importação</span>
          </span>
        </NavLink>
        <NavLink to="/reconcile" active={pathname.startsWith('/reconcile')}>
          <span className="flex items-center gap-2">
            {Icons.reconcile}
            <span>Conciliação</span>
          </span>
        </NavLink>
        <NavLink to="/recurring" active={pathname.startsWith('/recurring')}>
          <span className="flex items-center gap-2">
            {Icons.recurring}
            <span>Recorrências</span>
          </span>
        </NavLink>
        <NavLink to="/profile" active={pathname.startsWith('/profile')}>
          <span className="flex items-center gap-2">
            {Icons.profile}
            <span>Perfil</span>
          </span>
        </NavLink>
      </aside>
      <div className="flex flex-col min-h-screen">
        <AppBar onLogout={doLogout} />
        <main className="p-4">
          <Outlet />
        </main>
        <NewTransactionModal onCreated={() => {
          // notify current page to refresh if it listens
          window.dispatchEvent(new CustomEvent('tx-created'));
        }} />
      </div>
      <nav className="md:hidden fixed bottom-0 inset-x-0 surface-2 border-t flex justify-around p-2 pb-[calc(8px+env(safe-area-inset-bottom))] shadow-lg">
        <A href="/" active={pathname === '/'}>
          <div className="flex flex-col items-center gap-1">
            {Icons.dashboard}
            <span className="text-xs">Início</span>
          </div>
        </A>
        <button
          aria-label="Nova"
          className={`px-3 py-2 rounded-[12px] btn-primary flex flex-col items-center gap-1 hover:scale-105 transition-transform`}
          onClick={() => window.dispatchEvent(new CustomEvent('open-new-transaction') as any)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
          </svg>
          <span className="text-xs">Nova</span>
        </button>
        <A href="/transactions" active={pathname.startsWith('/transactions')}>
          <div className="flex flex-col items-center gap-1">
            {Icons.transactions}
            <span className="text-xs">Transações</span>
          </div>
        </A>
        <button
          aria-label="Mais"
          className={`px-3 py-2 rounded-[12px] text-[color:var(--text)] border border-white/5 bg-[color:var(--surf-1)] flex flex-col items-center gap-1 hover:border-white/20 transition-colors`}
          onClick={() => setMobileMenuOpen(v => !v)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
          </svg>
          <span className="text-xs">Mais</span>
        </button>
      </nav>

      {/* Mobile options drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="absolute bottom-0 inset-x-0 surface-2 rounded-t-2xl border-t p-4 max-h-[80vh] overflow-auto shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="heading text-base flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M12.136.326A1.5 1.5 0 0 1 14 1.78V3h.5A1.5 1.5 0 0 1 16 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 13.5v-9a1.5 1.5 0 0 1 1.432-1.499L12.136.326zM5.562 3H13V1.78a.5.5 0 0 0-.621-.484L5.562 3zM1.5 4a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-13z"/>
                </svg>
                <span>Menu</span>
              </div>
              <button className="text-sm text-[color:var(--text-dim)] flex items-center gap-1 px-2 py-1 rounded-full hover:bg-white/5 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                </svg>
                <span>Fechar</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SheetLink to="/" active={pathname === '/'} onClick={() => setMobileMenuOpen(false)}>
                <span className="flex flex-col items-center gap-2">
                  {Icons.dashboard}
                  <span>Início</span>
                </span>
              </SheetLink>
              <SheetLink to="/transactions" active={pathname.startsWith('/transactions')} onClick={() => setMobileMenuOpen(false)}>
                <span className="flex flex-col items-center gap-2">
                  {Icons.transactions}
                  <span>Transações</span>
                </span>
              </SheetLink>
              <SheetLink to="/accounts" active={pathname.startsWith('/accounts')} onClick={() => setMobileMenuOpen(false)}>
                <span className="flex flex-col items-center gap-2">
                  {Icons.accounts}
                  <span>Contas</span>
                </span>
              </SheetLink>
              <SheetLink to="/categories" active={pathname.startsWith('/categories')} onClick={() => setMobileMenuOpen(false)}>
                <span className="flex flex-col items-center gap-2">
                  {Icons.categories}
                  <span>Categorias</span>
                </span>
              </SheetLink>
              <SheetLink to="/budgets" active={pathname.startsWith('/budgets')} onClick={() => setMobileMenuOpen(false)}>
                <span className="flex flex-col items-center gap-2">
                  {Icons.budgets}
                  <span>Orçamentos</span>
                </span>
              </SheetLink>
              <SheetLink to="/goals" active={pathname.startsWith('/goals')} onClick={() => setMobileMenuOpen(false)}>
                <span className="flex flex-col items-center gap-2">
                  {Icons.goals}
                  <span>Metas</span>
                </span>
              </SheetLink>
              <SheetLink to="/reports" active={pathname.startsWith('/reports')} onClick={() => setMobileMenuOpen(false)}>
                <span className="flex flex-col items-center gap-2">
                  {Icons.reports}
                  <span>Relatórios</span>
                </span>
              </SheetLink>
              <SheetLink to="/import" active={pathname.startsWith('/import')} onClick={() => setMobileMenuOpen(false)}>
                <span className="flex flex-col items-center gap-2">
                  {Icons.import}
                  <span>Importação</span>
                </span>
              </SheetLink>
              <SheetLink to="/reconcile" active={pathname.startsWith('/reconcile')} onClick={() => setMobileMenuOpen(false)}>
                <span className="flex flex-col items-center gap-2">
                  {Icons.reconcile}
                  <span>Conciliação</span>
                </span>
              </SheetLink>
              <SheetLink to="/recurring" active={pathname.startsWith('/recurring')} onClick={() => setMobileMenuOpen(false)}>
                <span className="flex flex-col items-center gap-2">
                  {Icons.recurring}
                  <span>Recorrências</span>
                </span>
              </SheetLink>
              <SheetLink to="/profile" active={pathname.startsWith('/profile')} onClick={() => setMobileMenuOpen(false)}>
                <span className="flex flex-col items-center gap-2">
                  {Icons.profile}
                  <span>Perfil</span>
                </span>
              </SheetLink>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                className="flex-1 btn-primary py-2 flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                onClick={() => { setMobileMenuOpen(false); window.dispatchEvent(new CustomEvent('open-new-transaction')); }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
                <span>Nova transação</span>
              </button>
              <button
                className="px-3 py-2 rounded-[12px] border border-white/10 hover:border-white/20 hover:bg-[color:var(--surf-2)] transition-colors flex items-center gap-2"
                onClick={() => { setMobileMenuOpen(false); doLogout(); }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
                  <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
                </svg>
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavLink({ to, children, active }: { to: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      to={to}
  className={`px-3 py-2 rounded-[12px] border ${active ? 'border-cyan-300/20 bg-gradient-to-tr from-cyan-400 to-fuchsia-400 text-[#0b0f1a] shadow-glow' : 'border-white/5 bg-[color:var(--surf-1)] text-[color:var(--text)] hover:border-white/10'}`}
    >
      {children}
    </Link>
  );
}

function A({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={href}
      className={`px-3 py-2 rounded-[12px] ${active ? 'bg-gradient-to-tr from-cyan-400 to-fuchsia-400 text-[#0b0f1a]' : 'text-[color:var(--text)] border border-white/5 bg-[color:var(--surf-1)] hover:border-white/20 transition-colors'}`}
    >
      {children}
    </Link>
  );
}

function SheetLink({ to, active, children, onClick }: { to: string; active?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`px-3 py-3 rounded-[12px] text-center border ${active ? 'border-cyan-300/20 bg-gradient-to-tr from-cyan-400/10 to-fuchsia-400/10 shadow-inner' : 'border-white/5 bg-[color:var(--surf-1)] hover:border-white/10 hover:bg-[color:var(--surf-2)] transition-colors'}`}
    >
      {children}
    </Link>
  );
}
