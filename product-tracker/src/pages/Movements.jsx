import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useSearch } from '../context/SearchContext';
import { History, Search, ArrowUpRight, ArrowDownLeft, ShoppingCart, RefreshCcw, Filter, Calendar, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCOP } from '../utils/formatters';

const Movements = () => {
    const { fetchAllStockMovements, products } = useInventory();
    const { searchTerm } = useSearch();
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('all');

    useEffect(() => {
        const loadMovements = async () => {
            try {
                const data = await fetchAllStockMovements();
                setMovements(data);
            } catch (error) {
                console.error('Error loading movements:', error);
            } finally {
                setLoading(false);
            }
        };
        loadMovements();
    }, []);

    const getProductName = (productId) => {
        const product = products.find(p => p.id === productId);
        return product ? product.name : 'Producto Desconocido';
    };

    const getMovementIcon = (type, referenceType) => {
        if (referenceType === 'return') return <RotateCcw className="w-4 h-4 text-rose-500" />;
        switch (type) {
            case 'SALE': return <ShoppingCart className="w-4 h-4 text-blue-500" />;
            case 'IN': return <ArrowDownLeft className="w-4 h-4 text-emerald-500" />;
            case 'OUT': return <ArrowUpRight className="w-4 h-4 text-red-500" />;
            case 'ADJUSTMENT': return <RefreshCcw className="w-4 h-4 text-amber-500" />;
            default: return <History className="w-4 h-4 text-slate-400" />;
        }
    };

    const getMovementLabel = (type, referenceType) => {
        if (referenceType === 'return') return 'Devolución';
        switch (type) {
            case 'SALE': return 'Venta';
            case 'IN': return 'Entrada';
            case 'OUT': return 'Salida';
            case 'ADJUSTMENT': return 'Ajuste';
            default: return type;
        }
    };

    const filteredMovements = movements.filter(m => {
        const term = (searchTerm || '').toLowerCase();
        const pName = getProductName(m.product_id).toLowerCase();
        const matchesSearch = pName.includes(term) || m.reference?.toLowerCase().includes(term);
        const matchesType = typeFilter === 'all' || m.type === typeFilter;
        return matchesSearch && matchesType;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-3xl font-bold text-slate-950 dark:text-slate-100 tracking-tight"
                    >
                        Historial de Movimientos
                    </motion.h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">Cronología completa de entradas y salidas de inventario</p>
                </div>

                <div className="flex gap-2">
                    <div className="flex bg-white/40 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/5 backdrop-blur-md">
                        {['all', 'IN', 'SALE', 'OUT', 'ADJUSTMENT'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTypeFilter(t)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${typeFilter === t ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {t === 'all' ? 'Todos' : getMovementLabel(t)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em]">
                                <th className="p-5">Fecha y Hora</th>
                                <th className="p-5">Producto</th>
                                <th className="p-5">Tipo</th>
                                <th className="p-5">Cantidad</th>
                                <th className="p-5">Referencia</th>
                                <th className="p-5">Motivo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {filteredMovements.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <History className="w-12 h-12 text-slate-200 dark:text-slate-800" />
                                            <p className="text-slate-400 font-medium">No se encontraron movimientos registrados</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredMovements.map((m) => (
                                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="p-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                                    {new Date(m.created_at).toLocaleDateString()}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold">
                                                    {new Date(m.created_at).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className="font-black text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                                                {getProductName(m.product_id)}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                                    {getMovementIcon(m.type, m.reference_type)}
                                                </div>
                                                <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                                    {getMovementLabel(m.type, m.reference_type)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className={`text-sm font-black ${m.quantity > 0 && m.type !== 'OUT' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {m.quantity > 0 && m.type !== 'OUT' ? '+' : ''}{m.quantity}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <span className="text-[11px] font-bold bg-slate-100 dark:bg-white/5 px-2 py-1 rounded text-slate-500 tracking-tighter">
                                                {m.reference || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate" title={m.reason}>
                                                {m.reason || 'S/M'}
                                            </p>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default Movements;
