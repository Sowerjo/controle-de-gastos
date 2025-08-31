import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import NewTransactionModal from './NewTransactionModal';
import { setAccessToken } from '../services/api';

function AppBar({ onLogout }: { onLogout: () => void }) {
  return (
    <header className="sticky top-0 z-30 surface-2 backdrop-blur-lg border-b border-white/5 h-14 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="hidden md:block text-sm text-[color:var(--text-dim)]">Período</div>
        <button className="text-sm rounded-full border border-white/10 px-3 py-1 bg-[color:var(--surf-1)] hover:border-white/20">Setembro 2025</button>
      </div>
      <div className="hidden md:block flex-1 max-w-xl mx-4">
        <input
          placeholder="Pesquisar (/ para focar)"
          className="w-full input px-3 py-2 text-sm focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          className="btn-primary text-sm"
          onClick={() => window.dispatchEvent(new CustomEvent('open-new-transaction'))}
        >
          + Nova transação
        </button>
        <button
          className="text-sm rounded-full border border-white/10 px-3 py-1 bg-[color:var(--surf-1)] hover:border-white/20"
          onClick={onLogout}
        >
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
      <aside className="hidden md:flex flex-col gap-2 p-4 surface-2 backdrop-blur-lg border-r border-white/5">
        <div className="px-2 py-3 heading text-lg">Finanças</div>
        <NavLink to="/" active={pathname === '/'}>Dashboard</NavLink>
        <NavLink to="/transactions" active={pathname.startsWith('/transactions')}>Transações</NavLink>
        <NavLink to="/accounts" active={pathname.startsWith('/accounts')}>Contas</NavLink>
        <NavLink to="/categories" active={pathname.startsWith('/categories')}>Categorias</NavLink>
        <NavLink to="/budgets" active={pathname.startsWith('/budgets')}>Orçamentos</NavLink>
        <NavLink to="/goals" active={pathname.startsWith('/goals')}>Metas</NavLink>
  <NavLink to="/reports" active={pathname.startsWith('/reports')}>Relatórios</NavLink>
  <NavLink to="/import" active={pathname.startsWith('/import')}>Importação</NavLink>
  <NavLink to="/reconcile" active={pathname.startsWith('/reconcile')}>Conciliação</NavLink>
        <NavLink to="/recurring" active={pathname.startsWith('/recurring')}>Recorrências</NavLink>
        <NavLink to="/profile" active={pathname.startsWith('/profile')}>Perfil</NavLink>
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
      <nav className="md:hidden fixed bottom-0 inset-x-0 surface-2 border-t flex justify-around p-2 pb-[calc(8px+env(safe-area-inset-bottom))]">
        <A href="/" label="Início" active={pathname === '/'} />
        <button
          aria-label="Nova"
          className={`px-3 py-2 rounded-[12px] btn-primary`}
          onClick={() => window.dispatchEvent(new CustomEvent('open-new-transaction') as any)}
        >
          + Nova
        </button>
        <A href="/transactions" label="Transações" active={pathname.startsWith('/transactions')} />
        <button
          aria-label="Mais"
          className={`px-3 py-2 rounded-[12px] text-[color:var(--text)] border border-white/5 bg-[color:var(--surf-1)]`}
          onClick={() => setMobileMenuOpen(v => !v)}
        >
          Mais
        </button>
      </nav>

      {/* Mobile options drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute bottom-0 inset-x-0 surface-2 rounded-t-2xl border-t p-4 max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="heading text-base">Menu</div>
              <button className="text-sm text-[color:var(--text-dim)]" onClick={() => setMobileMenuOpen(false)}>Fechar</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SheetLink to="/" active={pathname === '/'} onClick={() => setMobileMenuOpen(false)}>Início</SheetLink>
              <SheetLink to="/transactions" active={pathname.startsWith('/transactions')} onClick={() => setMobileMenuOpen(false)}>Transações</SheetLink>
              <SheetLink to="/accounts" active={pathname.startsWith('/accounts')} onClick={() => setMobileMenuOpen(false)}>Contas</SheetLink>
              <SheetLink to="/categories" active={pathname.startsWith('/categories')} onClick={() => setMobileMenuOpen(false)}>Categorias</SheetLink>
              <SheetLink to="/budgets" active={pathname.startsWith('/budgets')} onClick={() => setMobileMenuOpen(false)}>Orçamentos</SheetLink>
              <SheetLink to="/goals" active={pathname.startsWith('/goals')} onClick={() => setMobileMenuOpen(false)}>Metas</SheetLink>
              <SheetLink to="/reports" active={pathname.startsWith('/reports')} onClick={() => setMobileMenuOpen(false)}>Relatórios</SheetLink>
              <SheetLink to="/import" active={pathname.startsWith('/import')} onClick={() => setMobileMenuOpen(false)}>Importação</SheetLink>
              <SheetLink to="/reconcile" active={pathname.startsWith('/reconcile')} onClick={() => setMobileMenuOpen(false)}>Conciliação</SheetLink>
              <SheetLink to="/recurring" active={pathname.startsWith('/recurring')} onClick={() => setMobileMenuOpen(false)}>Recorrências</SheetLink>
              <SheetLink to="/profile" active={pathname.startsWith('/profile')} onClick={() => setMobileMenuOpen(false)}>Perfil</SheetLink>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 btn-primary py-2"
                onClick={() => { setMobileMenuOpen(false); window.dispatchEvent(new CustomEvent('open-new-transaction')); }}
              >
                + Nova transação
              </button>
              <button
                className="px-3 py-2 rounded-[12px] border border-white/10"
                onClick={() => { setMobileMenuOpen(false); doLogout(); }}
              >
                Sair
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

function A({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <a
      href={href}
      aria-label={label}
  className={`px-3 py-2 rounded-[12px] ${active ? 'bg-gradient-to-tr from-cyan-400 to-fuchsia-400 text-[#0b0f1a]' : 'text-[color:var(--text)] border border-white/5 bg-[color:var(--surf-1)]'}`}
    >
      {label}
    </a>
  );
}

function SheetLink({ to, active, children, onClick }: { to: string; active?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`px-3 py-3 rounded-[12px] text-center border ${active ? 'border-cyan-300/20 bg-white/10' : 'border-white/5 bg-[color:var(--surf-1)] hover:border-white/10'}`}
    >
      {children}
    </Link>
  );
}
