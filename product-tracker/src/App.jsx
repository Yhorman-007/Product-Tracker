import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InventoryProvider } from './context/InventoryContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { SearchProvider } from './context/SearchContext';
import MainLayout from './components/layout/MainLayout';
import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import { Terms, Privacy } from './pages/Legal';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import Reports from './pages/Reports';
import Movements from './pages/Movements';
import Clients from './pages/Clients';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f8fafc] dark:bg-[#0f172a]">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !hasRole(allowedRoles)) return <Navigate to="/app" replace />;
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <NotificationProvider>
            <SearchProvider>
              <InventoryProvider>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  <Route path="/app" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                    <Route index element={<Dashboard />} />
                    <Route path="pos" element={<ProtectedRoute allowedRoles={['CAJERO']}><POS /></ProtectedRoute>} />
                    <Route path="inventory" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR', 'CAJERO']}><Inventory /></ProtectedRoute>} />
                    <Route path="suppliers" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR']}><Suppliers /></ProtectedRoute>} />
                    <Route path="purchase-orders" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR']}><PurchaseOrders /></ProtectedRoute>} />
                    <Route path="movements" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR']}><Movements /></ProtectedRoute>} />
                    <Route path="clients" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR', 'CAJERO']}><Clients /></ProtectedRoute>} />
                    <Route path="reports" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR']}><Reports /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/app" replace />} />
                  </Route>
                </Routes>
              </InventoryProvider>
            </SearchProvider>
          </NotificationProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
