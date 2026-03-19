import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Users, ShoppingBag, FileText, Settings, LogOut, History, UserCheck, Truck } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';

// ─── NOTE ─────────────────────────────────────────────────────────────────────
// framer-motion REMOVED from Sidebar entirely.
// The previous implementation used `motion.span` / `motion.h1` with `exit`
// animations but WITHOUT an `<AnimatePresence>` parent. Every sidebar
// collapse triggered React's removeChild crash on the internal <Text> node.
//
// Replacement: pure CSS transitions (max-width, opacity) on stable DOM nodes.
// The `layoutId` active pill is replaced with a simple CSS transition.
// ─────────────────────────────────────────────────────────────────────────────

const Sidebar = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { logout, hasRole } = useAuth();
    const [appName, setAppName] = useState(localStorage.getItem('appName') || 'Product Tracker');

    useEffect(() => {
        const handleUpdate = () => {
            setAppName(localStorage.getItem('appName') || 'Product Tracker');
        };
        window.addEventListener('businessProfileUpdated', handleUpdate);
        return () => window.removeEventListener('businessProfileUpdated', handleUpdate);
    }, []);

    const allNavItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['ADMIN', 'SUPERVISOR', 'CAJERO'] },
        { icon: ShoppingCart, label: 'Punto de Venta', path: '/pos', roles: ['ADMIN', 'CAJERO'] },
        { icon: Package, label: 'Inventario', path: '/inventory', roles: ['ADMIN', 'SUPERVISOR', 'CAJERO'] },
        { icon: Truck, label: 'Proveedores', path: '/suppliers', roles: ['ADMIN', 'SUPERVISOR'] },
        { icon: UserCheck, label: 'Clientes', path: '/clients', roles: ['ADMIN', 'SUPERVISOR', 'CAJERO'] },
        { icon: ShoppingBag, label: 'Órdenes de Compra', path: '/purchase-orders', roles: ['ADMIN', 'SUPERVISOR'] },
        { icon: History, label: 'Movimientos', path: '/movements', roles: ['ADMIN', 'SUPERVISOR'] },
        { icon: FileText, label: 'Reportes', path: '/reports', roles: ['ADMIN', 'SUPERVISOR'] },
    ];

    const navItems = allNavItems.filter(item => hasRole(item.roles));

    return (
        <aside
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
            style={{
                width: isExpanded ? '16rem' : '5rem',
                transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
            }}
            className="fixed left-0 top-0 h-screen glass-vibrant dark:bg-[#0f172a]/80 border-r border-white/20 z-50 flex flex-col shadow-2xl overflow-hidden transition-all duration-300"
        >
            {/* ── Logo header ─────────────────────────────────────────────── */}
            <div className="h-24 flex items-center justify-center border-b border-slate-100 dark:border-white/5 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 opacity-50" />
                <div
                    className="relative z-10 flex items-center gap-2"
                    style={{
                        transform: isExpanded ? 'scale(1)' : 'scale(0.85)',
                        transition: 'transform 0.25s ease',
                    }}
                >
                    <div className="w-8 h-8 min-w-[2rem] rounded-lg bg-gradient-to-tr from-[#10b981] to-[#22c55e] flex items-center justify-center text-white font-bold shadow-lg border border-white/20">
                        PT
                    </div>
                    {/* Label – always in DOM, width animated */}
                    <span
                        className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-green-500 whitespace-nowrap overflow-hidden"
                        style={{
                            maxWidth: isExpanded ? '120px' : '0px',
                            opacity: isExpanded ? 1 : 0,
                            transition: 'max-width 0.25s ease, opacity 0.2s ease',
                        }}
                    >
                        {appName}
                    </span>
                </div>
            </div>

            {/* ── Nav items ───────────────────────────────────────────────── */}
            <nav className="flex-1 py-6 overflow-y-auto overflow-x-hidden scrollbar-hide">
                <ul className="space-y-2 px-3">
                    {navItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                end={item.path === '/'}
                                className={({ isActive }) =>
                                    clsx(
                                        'relative flex items-center px-4 py-4 rounded-xl transition-all duration-300 group overflow-hidden',
                                        isActive
                                            ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/30'
                                            : 'text-slate-400 hover:text-emerald-700 dark:hover:text-white hover:bg-emerald-50 dark:hover:bg-white/5'
                                    )
                                }
                            >
                                {({ isActive }) => (
                                    <div className="flex items-center gap-4">
                                        <item.icon
                                            className={clsx(
                                                'w-6 h-6 min-w-[24px]',
                                                isActive ? 'text-white' : 'group-hover:text-[#10b981] transition-colors'
                                            )}
                                        />
                                        {/* Label – always in DOM, CSS max-width toggle */}
                                        <span
                                            className="font-medium whitespace-nowrap overflow-hidden"
                                            style={{
                                                maxWidth: isExpanded ? '180px' : '0px',
                                                opacity: isExpanded ? 1 : 0,
                                                transition: 'max-width 0.25s ease, opacity 0.2s ease',
                                            }}
                                        >
                                            {item.label}
                                        </span>
                                    </div>
                                )}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* ── Logout ──────────────────────────────────────────────────── */}
            <div className="p-6 border-t border-slate-100 dark:border-white/5">
                <button
                    onClick={logout}
                    className="flex items-center gap-4 w-full px-3 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all group overflow-hidden"
                >
                    <LogOut className="w-6 h-6 min-w-[24px] group-hover:scale-110 transition-transform" />
                    {/* Label – always in DOM, CSS max-width toggle */}
                    <span
                        className="font-medium whitespace-nowrap overflow-hidden"
                        style={{
                            maxWidth: isExpanded ? '180px' : '0px',
                            opacity: isExpanded ? 1 : 0,
                            transition: 'max-width 0.25s ease, opacity 0.2s ease',
                        }}
                    >
                        Cerrar Sesión
                    </span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
