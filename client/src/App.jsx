import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import PortalLayout from './layouts/PortalLayout';

import LandingPage from './pages/landing/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

import ProductsPage from './pages/catalog/ProductsPage';
import PlansPage from './pages/catalog/PlansPage';
import TaxesPage from './pages/catalog/TaxesPage';
import DiscountsPage from './pages/catalog/DiscountsPage';
import TemplatesPage from './pages/catalog/TemplatesPage';

import DashboardPage from './pages/dashboard/DashboardPage';
import SubscriptionsPage from './pages/subscriptions/SubscriptionsPage';
import InvoicesPage from './pages/invoices/InvoicesPage';
import PaymentsPage from './pages/payments/PaymentsPage';
import UsersPage from './pages/users/UsersPage';

import PortalSubscriptions from './pages/portal/PortalSubscriptions';
import PortalInvoices from './pages/portal/PortalInvoices';
import PortalInvoiceDetail from './pages/portal/PortalInvoiceDetail';

function ProtectedAppRoute({ children, adminOnly = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'customer') return <Navigate to="/portal" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/app/products" replace />;
  return children;
}

function ProtectedPortalRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '0px',
            border: '1px solid #1A1614',
            background: '#ECE9DC',
            color: '#1A1614',
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 600,
          },
        }}
      />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Customer Portal */}
        <Route
          path="/portal"
          element={
            <ProtectedPortalRoute>
              <PortalLayout />
            </ProtectedPortalRoute>
          }
        >
          <Route index element={<Navigate to="/portal/subscriptions" replace />} />
          <Route path="subscriptions" element={<PortalSubscriptions />} />
          <Route path="invoices" element={<PortalInvoices />} />
          <Route path="invoices/:id" element={<PortalInvoiceDetail />} />
        </Route>

        {/* Admin/Staff App */}
        <Route
          path="/app"
          element={
            <ProtectedAppRoute>
              <AppLayout />
            </ProtectedAppRoute>
          }
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="taxes" element={<TaxesPage />} />
          <Route path="discounts" element={<DiscountsPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="subscriptions/:id" element={<SubscriptionsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/:id" element={<InvoicesPage />} />
          <Route path="invoices/:id/print" element={<InvoicesPage isPrintView />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="customers" element={<UsersPage />} />
          <Route
            path="users"
            element={
              <ProtectedAppRoute adminOnly>
                <UsersPage />
              </ProtectedAppRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
