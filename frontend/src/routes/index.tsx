import { Suspense, lazy } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Login from '../pages/Auth/Login';
import Register from '../pages/Auth/Register';
import ForgotPassword from '../pages/Auth/ForgotPassword';
import ResetPassword from '../pages/Auth/ResetPassword';
import Dashboard from '../pages/Dashboard/Dashboard';
import Transactions from '../pages/Transactions';
import Categories from '../pages/Categories';
import Accounts from '../pages/Accounts';
import Tags from '../pages/Tags';
import Payees from '../pages/Payees';
import Budgets from '../pages/Budgets';
import Goals from '../pages/Goals';
import Reports from '../pages/Reports';
import ImportWizard from '../pages/Import';
import Profile from '../pages/Profile';
import Debug from '../pages/Debug';
import FixedExpenses from '../pages/Fixed';
import FixedDashboard from '../pages/FixedDashboard';
import Layout from '../components/Layout';

function PrivateRoute({ children }: { children: JSX.Element }) {
  const isAuth = document.cookie.includes('refreshToken=') || sessionStorage.getItem('hasAuth') === '1';
  return isAuth ? children : <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="p-4 text-gray-700 dark:text-gray-200">Carregando…</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="categories" element={<Categories />} />
          <Route path="tags" element={<Tags />} />
          <Route path="payees" element={<Payees />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="goals" element={<Goals />} />
          <Route path="reports" element={<Reports />} />
          <Route path="import" element={<ImportWizard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="gastos-fixos" element={<FixedExpenses />} />
          <Route path="dashboard-gastos-fixos" element={<FixedDashboard />} />
          <Route path="debug" element={<Debug />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
