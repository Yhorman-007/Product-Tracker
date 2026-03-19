import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bell, Search, User, Menu, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSearch } from '../../context/SearchContext';
import { useInventory } from '../../context/InventoryContext';
import { Package, Users, ShoppingBag, ArrowRight, ChevronRight, X, Settings } from 'lucide-react';
import SettingsModal from './SettingsModal';

const Header = () => {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { searchTerm, setSearchTerm } = useSearch();
    const { products, suppliers, purchaseOrders, alerts } = useInventory();
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const dropdownRef = useRef(null);
    const searchRef = useRef(null);
    const navigate = useNavigate();

    const lowStockCount = alerts?.lowStock?.length || 0;

    // Display the real full_name, falling back to capitalised username
    const displayName = user?.full_name
        || (user?.username
            ? user.username.charAt(0).toUpperCase() + user.username.slice(1)
            : 'Usuario');
    const displayRole = user?.role || 'Administrador';

    // Search Categorization Logic
    const searchResults = useMemo(() => {
        const term = (searchTerm || '').trim().toLowerCase();
        if (!term) return { products: [], suppliers: [], orders: [], total: 0 };

        const matchedProducts = (products || []).filter(p =>
            (p?.name || '').toLowerCase().includes(term) ||
            (p?.sku || '').toLowerCase().includes(term)
        ).slice(0, 5);

        const matchedSuppliers = (suppliers || []).filter(s =>
            (s?.name || '').toLowerCase().includes(term) ||
            (s?.email || '').toLowerCase().includes(term)
        ).slice(0, 3);

        const matchedOrders = (purchaseOrders || []).filter(o => {
            const sName = (suppliers || []).find(s => s.id === o.supplier_id)?.name || '';
            const fId = `oc-${o.id}`.toLowerCase();
            return (o?.id || '').toString().includes(term) ||
                sName.toLowerCase().includes(term) ||
                fId.includes(term) ||
                `oc${o.id}`.toLowerCase().includes(term);
        }).slice(0, 3);

        return {
            products: matchedProducts,
            suppliers: matchedSuppliers,
            orders: matchedOrders,
            total: matchedProducts.length + matchedSuppliers.length + matchedOrders.length
        };
    }, [searchTerm, products, suppliers, purchaseOrders]);

    // Handle Search Navigation
    const handleNavigate = (path) => {
        setSearchTerm('');
        setShowSearchDropdown(false);
        navigate(path);
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowNotifDropdown(false);
            }
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowSearchDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="h-16 fixed top-0 right-0 left-0 md:left-20 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b border-emerald-100 dark:border-emerald-800/20 z-40 px-6 flex items-center justify-between transition-all duration-300 shadow-lg dark:shadow-xl">
            <div className="flex items-center gap-4">
                <button className="md:hidden p-2 hover:bg-white/10 rounded-lg text-slate-300">
                    <Menu className="w-5 h-5" />
                </button>
                <div className="relative" ref={searchRef}>
                    <div className={`hidden md:flex items-center gap-2 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-full border transition-all duration-300 ${showSearchDropdown ? 'border-emerald-500 ring-4 ring-emerald-500/10 w-[400px]' : 'border-slate-100 dark:border-emerald-800/20 w-64'}`}>
                        <Search className={`w-4 h-4 transition-colors ${showSearchDropdown ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <input
                            type="text"
                            placeholder="Buscar productos, proveedores, órdenes..."
                            value={searchTerm}
                            onFocus={() => setShowSearchDropdown(true)}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm flex-1 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full">
                                <X size={14} className="text-slate-400" />
                            </button>
                        )}
                    </div>

                    {/* Global Command Center Dropdown */}
                    <AnimatePresence>
                        {showSearchDropdown && searchTerm.trim().length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                className="absolute left-0 top-12 w-[450px] glass-card rounded-2xl shadow-2xl border border-emerald-100 dark:border-emerald-800/20 overflow-hidden z-50 p-2"
                            >
                                {searchResults.total === 0 ? (
                                    <div className="p-8 text-center">
                                        <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Search className="w-6 h-6 text-slate-300" />
                                        </div>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium">No se encontraron resultados para "{searchTerm}"</p>
                                        <p className="text-xs text-slate-400 mt-1">Intenta con nombres de productos o SKUs</p>
                                    </div>
                                ) : (
                                    <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                                        {/* Products Section */}
                                        {searchResults.products.length > 0 && (
                                            <div className="mb-4">
                                                <div className="flex items-center gap-2 px-3 py-1 mb-1">
                                                    <Package className="w-3 h-3 text-emerald-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Productos</span>
                                                </div>
                                                {searchResults.products.map(p => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => handleNavigate('/inventory')}
                                                        className="w-full flex items-center gap-3 p-3 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-all group text-left"
                                                    >
                                                        <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center border border-emerald-100 dark:border-emerald-800/20">
                                                            <Package className="w-5 h-5 text-emerald-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{p.name}</p>
                                                            <p className="text-xs text-slate-500">SKU: {p.sku} • Stock: <span className={p.stock <= p.min_stock ? 'text-red-500 font-bold' : 'text-emerald-600'}>{p.stock}</span></p>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Suppliers Section */}
                                        {searchResults.suppliers.length > 0 && (
                                            <div className="mb-4">
                                                <div className="flex items-center gap-2 px-3 py-1 mb-1">
                                                    <Users className="w-3 h-3 text-blue-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Proveedores</span>
                                                </div>
                                                {searchResults.suppliers.map(s => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => handleNavigate('/suppliers')}
                                                        className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all group text-left"
                                                    >
                                                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center border border-blue-100 dark:border-blue-800/20">
                                                            <Users className="w-5 h-5 text-blue-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{s.name}</p>
                                                            <p className="text-xs text-slate-500">{s.email || 'Sin email'}</p>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Orders Section */}
                                        {searchResults.orders.length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-2 px-3 py-1 mb-1">
                                                    <ShoppingBag className="w-3 h-3 text-orange-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Órdenes de Compra</span>
                                                </div>
                                                {searchResults.orders.map(o => (
                                                    <button
                                                        key={o.id}
                                                        onClick={() => handleNavigate('/purchase-orders')}
                                                        className="w-full flex items-center gap-3 p-3 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-xl transition-all group text-left"
                                                    >
                                                        <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center border border-orange-100 dark:border-orange-800/20">
                                                            <ShoppingBag className="w-5 h-5 text-orange-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">OC-{o.id} • {(suppliers || []).find(s => s.id === o.supplier_id)?.name || 'Proveedor'}</p>
                                                            <p className="text-xs text-slate-500 capitalize">{o.status === 'completado' ? 'Completado' : o.status === 'pending' ? 'Pendiente' : o.status}</p>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-colors" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Dark / Light mode toggle */}
                <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={toggleTheme}
                    title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                    className="p-2 rounded-full hover:bg-white/50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
                >
                    {theme === 'dark'
                        ? <Sun className="w-5 h-5 text-amber-400" />
                        : <Moon className="w-5 h-5 text-slate-500" />
                    }
                </motion.button>

                {/* Settings */}
                <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setIsSettingsModalOpen(true)}
                    title="Configuración"
                    className="p-2 rounded-full hover:bg-white/50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
                >
                    <Settings className="w-5 h-5" />
                </motion.button>

                {/* Notifications */}
                <div className="relative" ref={dropdownRef}>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowNotifDropdown(prev => !prev)}
                        className="p-2 relative hover:bg-white/50 dark:hover:bg-white/10 rounded-full text-slate-600 dark:text-slate-300 transition-colors"
                    >
                        <Bell className="w-5 h-5" />
                        {lowStockCount > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
                        )}
                    </motion.button>

                    {/* Notifications Dropdown */}
                    <AnimatePresence>
                        {showNotifDropdown && (
                            <motion.div
                                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-12 w-80 glass-card rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden z-50"
                            >
                                <div className="p-4 border-b border-slate-200/50 dark:border-white/10">
                                    <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">
                                        Notificaciones
                                    </h4>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {lowStockCount === 0 ? (
                                        <div className="p-6 text-center text-slate-400 text-sm">
                                            No hay alertas pendientes ✅
                                        </div>
                                    ) : (
                                        alerts.lowStock.map(product => (
                                            <div
                                                key={product.id}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-white/50 dark:hover:bg-white/10 transition-colors border-b border-slate-100/50 dark:border-white/5 last:border-b-0"
                                            >
                                                <div className="w-2 h-2 bg-orange-400 rounded-full shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                                        {product.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        Stock: <span className="text-orange-500 font-bold">{product.stock}</span> / Mín: {product.min_stock}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* User info */}
                <div className="flex items-center gap-3 pl-3 border-l border-slate-200/50 dark:border-white/10">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{displayName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{displayRole}</p>
                    </div>
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#10b981] to-[#22c55e] p-0.5 cursor-pointer shadow-md shadow-emerald-500/20 border border-white/20"
                    >
                        <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center">
                            <User className="w-5 h-5 text-emerald-500" />
                        </div>
                    </motion.div>
                </div>
            </div>

            <SettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
            />
        </header>
    );
};

export default Header;
