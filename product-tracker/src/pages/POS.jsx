import React, { useState, useMemo, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useSearch } from '../context/SearchContext';
import { useNotification } from '../context/NotificationContext';
import { Search, Plus, Minus, Trash2, ShoppingCart, Save, Calculator, X, Package, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCOP } from '../utils/formatters';
import { generateReceiptPDF } from '../utils/pdfGenerator';
import { useAuth } from '../context/AuthContext';
import EmergencyAuthModal from '../components/common/EmergencyAuthModal';
import ConfirmModal from '../components/ui/ConfirmModal';

// Vista POS (Point of sale): Pantalla de facturación interactiva manejando carrito y cobros de mostrador
const POS = () => {
    // Hooks: Obtiene acceso al estado de carrito e inventario administrado por InventoryContext
    const { products, cart, addToCart, removeFromCart, updateCartQty, clearCart, completeSale, clients } = useInventory();
    const { isAdmin } = useAuth();
    const { showNotification } = useNotification();
    const { searchTerm, setSearchTerm } = useSearch();
    // useState: Manejo de montos locales correspondientes al proceso de pago en caja
    const [discount, setDiscount] = useState(0); // Percentage
    const [amountTendered, setAmountTendered] = useState('');
    const [selectedClientId, setSelectedClientId] = useState(null);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [emergencyAuthItem, setEmergencyAuthItem] = useState(null);
    const [isClearCartConfirmOpen, setIsClearCartConfirmOpen] = useState(false);
    const [applyIVA, setApplyIVA] = useState(true);

    const [taxConfig, setTaxConfig] = useState({ iva: 19 });

    useEffect(() => {
        const loadConfig = () => {
            const saved = localStorage.getItem('businessConfig');
            if (saved) {
                const parsed = JSON.parse(saved);
                setTaxConfig({ iva: parseFloat(parsed.iva) || 19 });
            } else {
                // Compatibility for old systems
                const oldTax = localStorage.getItem('taxConfig');
                if (oldTax) {
                    const parsedOld = JSON.parse(oldTax);
                    setTaxConfig({ iva: parseFloat(parsedOld.iva) || 19 });
                }
            }
        };

        loadConfig();
        window.addEventListener('storage', loadConfig);
        return () => window.removeEventListener('storage', loadConfig);
    }, []);

    const filteredProducts = useMemo(() => {
        const term = (searchTerm || '').trim().toLowerCase();
        return products.filter(p =>
            !p.archived && (
                !term ||
                (p.name || '').toLowerCase().includes(term) ||
                (p.sku || '').toLowerCase().includes(term)
            )
        );
    }, [products, searchTerm]);

    const subtotal = useMemo(() => {
        return Math.round(cart.reduce((acc, item) => acc + ((item.price_sale || 0) * item.qty), 0));
    }, [cart]);

    // IVA is now INCLUDED in the price (Colombia standard)
    // Formula: Total - (Total / (1 + IVA%))
    const taxAmount = useMemo(() => {
        if (!applyIVA) return 0;
        const ivaRate = (taxConfig.iva || 0) / 100;
        return Math.round(subtotal - (subtotal / (1 + ivaRate)));
    }, [subtotal, taxConfig.iva, applyIVA]);

    const total = useMemo(() => {
        const discountFactor = 1 - (discount / 100);
        const baseTotal = subtotal * discountFactor;

        // If IVA is included but toggled OFF, we deduct the tax from the price
        if (!applyIVA && taxConfig.iva > 0) {
            const ivaRate = taxConfig.iva / 100;
            return Math.round(baseTotal / (1 + ivaRate));
        }

        return Math.round(baseTotal);
    }, [subtotal, discount, applyIVA, taxConfig.iva]);

    const change = useMemo(() => {
        const tendered = parseFloat(amountTendered) || 0;
        const diff = tendered - total;
        return Math.max(0, Math.round(diff));
    }, [amountTendered, total]);

    // Fetch Final: Genera venta definitiva mediante contexto (completeSale) tras validar saldo recibido vs total
    const handleCheckout = async () => {
        if (!amountTendered || parseFloat(amountTendered) < total) {
            showNotification("¡Monto insuficiente!", "warning");
            return;
        }

        const proceedWithSale = async () => {
            try {
                const discountAmount = Math.round(subtotal * (discount / 100));
                const currentTaxRate = applyIVA ? (taxConfig.iva || 0) : 0;
                const saleResult = await completeSale(total, discountAmount, 'Efectivo', currentTaxRate, taxAmount, selectedClientId);
                setIsCheckoutModalOpen(false);
                setAmountTendered('');
                setDiscount(0);
                setSelectedClientId(null);
                showNotification("¡Venta completada exitosamente!", "success");

                // Ask if user wants PDF or generate it automatically
                generateReceiptPDF(saleResult);
            } catch (error) {
                console.error('Error in handleCheckout:', error);
                showNotification("Error al procesar la venta: " + (error.response?.data?.detail || error.message), "error");
            }
        };

        // If discount is high (>15%), require admin auth if not admin
        if (discount > 15 && !isAdmin) {
            setEmergencyAuthItem({
                title: 'Descuento de Alto Nivel',
                description: `Autorizando descuento del ${discount}% en venta por ${formatCOP(total)}`,
                callback: proceedWithSale
            });
            return;
        }

        proceedWithSale();
    };

    return (
        <div className="flex h-[calc(100vh-140px)] gap-6 overflow-hidden">
            {/* Product List Section */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 flex flex-col glass-card rounded-2xl overflow-hidden"
            >
                <div className="p-6 flex justify-between items-center z-10 cyber-header">
                    <div className="flex items-center gap-3">
                        <Package className="text-emerald-500 w-6 h-6" />
                        <h3 className="font-black text-xl text-slate-800 dark:text-slate-200 tracking-tight">Seleccionar Productos</h3>
                    </div>
                    {searchTerm && (
                        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/50 font-black uppercase tracking-widest animate-pulse">
                            Filtrando: {searchTerm}
                        </span>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start scrollbar-hide">
                    <AnimatePresence>
                        {filteredProducts.map((product) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className={`group relative p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-50 dark:border-white/5 cursor-pointer hover:shadow-elite hover:-translate-y-1.5 transition-all duration-500 shadow-xl shadow-slate-200/50 dark:shadow-none ${product.stock <= 0 ? 'opacity-60 grayscale' : ''}`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                                <div className="relative z-10 flex flex-col h-full justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                                                <Package className="w-5 h-5" />
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${product.stock > product.min_stock ? 'bg-emerald-100 text-emerald-700' : product.stock > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                {product.stock <= 0 ? 'Sin Stock' : `${product.stock} disp.`}
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 mb-1">{product.name}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{product.sku}</p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex items-end justify-between">
                                        <span className="text-xl font-black text-emerald-600 dark:text-[#10b981] drop-shadow-sm">{formatCOP(product.price_sale)}</span>
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            disabled={product.stock <= 0}
                                            className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all disabled:bg-slate-300 disabled:shadow-none"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {filteredProducts.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                            <Search className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg">No se encontraron productos.</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Cart Section */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-96 glass-card rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-slate-100 dark:border-white/10"
            >
                <div className="p-5 flex justify-between items-center z-10 cyber-header">
                    <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-lg">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <ShoppingCart className="w-5 h-5" />
                        </div>
                        Venta Actual
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsClearCartConfirmOpen(true)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Limpiar Carrito"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Client Selection (RF47) */}
                <div className="px-5 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                    <div className="flex items-center gap-3">
                        <UserCheck className="w-4 h-4 text-indigo-500" />
                        <select
                            value={selectedClientId || ''}
                            onChange={(e) => setSelectedClientId(e.target.value ? parseInt(e.target.value) : null)}
                            className="flex-1 bg-transparent text-sm font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                        >
                            <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Consumidor final</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{client.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                    <AnimatePresence>
                        {cart.map(item => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                                key={item.id}
                                className="flex justify-between items-center p-3 bg-white/60 dark:bg-[#0f172a]/80 rounded-xl border border-emerald-100 dark:border-emerald-900 shadow-sm group hover:border-emerald-500/20 transition-colors"
                            >
                                <div className="flex-1 min-w-0 pr-4">
                                    <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{item.name}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{formatCOP(item.price_sale)} x {item.qty}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center bg-emerald-50/50 dark:bg-[#0f172a] rounded-lg shadow-inner border border-emerald-100 dark:border-emerald-900">
                                        <button onClick={() => updateCartQty(item.id, item.qty - 1)} className="w-7 h-7 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-slate-800 text-emerald-700 dark:text-slate-300 rounded-l-lg transition-colors">
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className={`w-6 text-center text-sm font-bold ${item.qty >= item.stock ? 'text-amber-600' : 'text-slate-700 dark:text-slate-200'}`}>{item.qty}</span>
                                        <button
                                            onClick={() => updateCartQty(item.id, item.qty + 1)}
                                            disabled={item.qty >= item.stock}
                                            className="w-7 h-7 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-slate-800 text-emerald-700 dark:text-slate-300 rounded-r-lg transition-colors disabled:opacity-30"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <p className="font-black text-slate-900 dark:text-white w-24 text-right">
                                        {formatCOP((item.price_sale || 0) * item.qty)}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {cart.length === 0 && (
                        <div className="text-center py-20 text-slate-400 flex flex-col items-center">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 opacity-50">
                                <ShoppingCart className="w-10 h-10" />
                            </div>
                            <p>El carrito está vacío</p>
                            <p className="text-sm text-slate-400/80 mt-1">Agrega productos para comenzar</p>
                        </div>
                    )}
                </div>

                <div className="p-6 glass-vibrant border-t border-white/20 space-y-5 z-20">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Descuento (%)</span>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={discount}
                                onChange={(e) => setDiscount(Number(e.target.value))}
                                className="w-16 p-2 text-right bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary outline-none font-black text-sm text-slate-800 dark:text-slate-100 shadow-sm"
                            />
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                                <label className="relative inline-flex items-center cursor-pointer scale-75 -ml-1">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={applyIVA}
                                        onChange={() => setApplyIVA(!applyIVA)}
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                                </label>
                                <span className="text-slate-500 font-medium">IVA ({applyIVA ? taxConfig.iva : 0}% {taxConfig.iva > 0 ? 'Incluido' : ''})</span>
                            </div>
                            <span className="text-slate-700 dark:text-slate-300 font-bold">{formatCOP(taxAmount)}</span>
                        </div>
                        <div className="flex justify-between text-2xl font-black text-slate-900 dark:text-slate-100 pt-4 border-t border-slate-100 dark:border-white/5">
                            <span>Total</span>
                            <span className="text-emerald-600 font-black drop-shadow-sm">{formatCOP(total)}</span>
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsCheckoutModalOpen(true)}
                        disabled={cart.length === 0}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-2"
                    >
                        <Save className="w-5 h-5" />
                        Cobrar
                    </motion.button>
                </div>
            </motion.div>

            {/* Checkout Modal */}
            <AnimatePresence>
                {isCheckoutModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
                            onClick={() => setIsCheckoutModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 relative z-10 overflow-hidden border border-slate-200 dark:border-white/10"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-secondary" />
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                                    <Calculator className="w-6 h-6 text-primary" />
                                    Pago y Cambio
                                </h3>
                                <button onClick={() => setIsCheckoutModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-xl text-center border border-slate-100 dark:border-white/5">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Monto Total a Pagar</p>
                                    <p className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight font-mono">{formatCOP(total)}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Monto Recibido</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold">$</span>
                                        <input
                                            type="number"
                                            autoFocus
                                            className="w-full pl-8 pr-4 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-xl font-mono shadow-sm text-slate-900 dark:text-white"
                                            placeholder="0.00"
                                            value={amountTendered}
                                            onChange={(e) => setAmountTendered(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <motion.div
                                    animate={{
                                        backgroundColor: parseFloat(change) >= 0 ? '#f0fdf4' : '#fef2f2',
                                        borderColor: parseFloat(change) >= 0 ? '#bbf7d0' : '#fecaca'
                                    }}
                                    className="p-4 rounded-xl flex justify-between items-center border"
                                >
                                    <span className={`font-bold ${parseFloat(change) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Cambio:</span>
                                    <span className={`text-2xl font-bold font-mono ${parseFloat(change) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                        {parseFloat(change) >= 0 ? formatCOP(parseFloat(change)) : '---'}
                                    </span>
                                </motion.div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleCheckout}
                                    disabled={parseFloat(amountTendered) < total}
                                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all mt-2"
                                >
                                    Completar Venta
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Emergency Authorization Modal */}
            <EmergencyAuthModal
                isOpen={!!emergencyAuthItem}
                onClose={() => setEmergencyAuthItem(null)}
                onAuthorized={() => emergencyAuthItem?.callback()}
                actionTitle={emergencyAuthItem?.title}
                actionDescription={emergencyAuthItem?.description}
            />

            <ConfirmModal
                isOpen={isClearCartConfirmOpen}
                onClose={() => setIsClearCartConfirmOpen(false)}
                onConfirm={() => {
                    clearCart();
                    showNotification('Carrito vaciado', 'info');
                    setIsClearCartConfirmOpen(false);
                }}
                isDestructive={true}
                title="¿Vaciar Carrito?"
                message="¿Estás seguro de que deseas eliminar todos los productos del carrito actual?"
                confirmText="Sí, vaciar"
            />
        </div>
    );
};

export default POS;
