import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InventoryProvider } from './context/InventoryContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { SearchProvider } from './context/SearchContext';
import MainLayout from './components/layout/MainLayout';
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

// Componente enrutador que protege rutas de React verificando si el usuario tiene sesión activa y el rol adecuado
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-500">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-2xl shadow-primary/20"></div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest animate-pulse text-xs">Cargando Elite System...</p>
          <p className="text-[10px] text-slate-300 dark:text-slate-600 font-bold uppercase tracking-tighter">Verificando Credenciales</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Componente principal que define la envoltura de los contextos globales y las rutas (Routes) de la app
function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <NotificationProvider>
            <SearchProvider>
              <InventoryProvider>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                    <Route index element={<Dashboard />} />
                    <Route path="pos" element={<ProtectedRoute allowedRoles={['CAJERO']}><POS /></ProtectedRoute>} />
                    <Route path="inventory" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR', 'CAJERO']}><Inventory /></ProtectedRoute>} />
                    <Route path="suppliers" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR']}><Suppliers /></ProtectedRoute>} />
                    <Route path="purchase-orders" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR']}><PurchaseOrders /></ProtectedRoute>} />
                    <Route path="movements" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR']}><Movements /></ProtectedRoute>} />
                    <Route path="clients" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR', 'CAJERO']}><Clients /></ProtectedRoute>} />
                    <Route path="reports" element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR']}><Reports /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
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
