import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';
import { useSearch } from '../context/SearchContext';
import { DollarSign, Package, AlertTriangle, TrendingUp, Calendar, ShoppingBag, MapPin, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCOP } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ icon: Icon, label, value, accentClass, glowClass, delay }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="w-full glass-vibrant p-8 rounded-3xl relative overflow-hidden group shadow-2xl min-w-0"
        >
            {/* Background icon watermark - Layered behind text */}
            <div className={`absolute -top-4 -right-4 p-4 opacity-[0.05] group-hover:opacity-[0.10] transition-opacity rounded-2xl ${accentClass} z-0 pointer-events-none`}>
                <Icon className="w-32 h-32 rotate-12" />
            </div>
            <div className="relative z-10 flex flex-col w-full h-full justify-between pointer-events-none">
                <div className="flex items-start gap-4 flex-wrap z-10">
                    <div className={`p-5 rounded-2xl ${accentClass} bg-opacity-20 shadow-xl ${glowClass} border border-white/20`}>
                        <Icon className="w-8 h-8 text-white" />
                    </div>
                </div>
                <div className="mt-8 w-full z-20">
                    <p className={`font-black text-slate-900 dark:text-slate-100 leading-tight text-3xl tracking-[-0.05em] mb-1 whitespace-nowrap`}>
                        {value}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                        {label}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

// Vista Dashboard: Pantalla principal pos-login que condensa la información gráfica, reportes rápidos y alertas urgentes
const Dashboard = () => {
    // Hooks: Obtención de inventario, sumatorias y control de búsqueda / rol
    const { totalStockValue, dailySalesTotal, totalUnitsSold, alerts, products, topProducts, auditLogs, loading } = useInventory();
    const { searchTerm } = useSearch();
    const { isCajero } = useAuth();
    const navigate = useNavigate();

    const term = (searchTerm || '').trim().toLowerCase();

    const filteredLowStock = alerts.lowStock.filter(p =>
        !term || (p.name || '').toLowerCase().includes(term) || (p.sku || '').toLowerCase().includes(term)
    );

    const filteredExpiringSoon = alerts.expiringSoon.filter(p =>
        !term || (p.name || '').toLowerCase().includes(term) || (p.sku || '').toLowerCase().includes(term)
    );

    const filteredTopProducts = topProducts.filter(p =>
        !term || (p.name || '').toLowerCase().includes(term)
    );

    if (loading) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-[#7c3aed] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-bold">Analizando inventario...</p>
            </div>
        );
    }

    // Lógica para determinar a qué sección redirigir cuando se requiere comprar stock inmediato
    const handleReponer = (productName) => {
        navigate('/purchase-orders', { state: { productName } });
    };

    // Interprete legible de los logs (Auditoría) para mostrar descripción amigable en español
    const getLogDescription = (log) => {
        const { action, entity, changes, action_description } = log;
        if (action_description) return action_description;

        const entityMap = {
            'producto': 'producto',
            'venta': 'venta',
            'proveedor': 'proveedor',
            'orden_compra': 'orden de compra'
        };

        const e = entityMap[entity] || entity;

        if (action === 'crear') {
            if (entity === 'producto' && changes?.name) return `creó el producto "${changes.name}"`;
            if (entity === 'proveedor' && changes?.name) return `registró al proveedor "${changes.name}"`;
            if (entity === 'venta' && changes?.total) return `generó una venta por ${formatCOP(changes.total)}`;
            if (entity === 'orden_compra' && changes?.total) return `creó orden de compra por ${formatCOP(changes.total)}`;
            return `creó un nuevo ${e}`;
        }

        if (action === 'actualizar') {
            const fields = changes ? Object.keys(changes).filter(k => k !== 'nombre_actual') : [];
            const productPart = (changes?.nombre_actual || changes?.name) ? ` en "${changes.nombre_actual || changes.name}"` : '';
            if (fields.length === 1) {
                return `actualizó ${fields[0]} de un ${e}${productPart}`;
            }
            return `editó información de un ${e}${productPart}`;
        }

        if (action === 'recibir' && entity === 'orden_compra') return `recibió y cargó al stock la orden #${log.entity_id}`;
        if (action === 'eliminar') return `eliminó el ${e} "${changes?.nombre || changes?.name || log.entity_id}"`;
        if (action === 'archivar') return `archivó el producto "${changes?.nombre || changes?.name || log.entity_id}"`;
        if (action === 'desarchivar') return `restauró el producto "${changes?.nombre || changes?.name || log.entity_id}"`;

        return `${action} ${e}`;
    };

    return (
        <div className="space-y-8 pb-12">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h2 className="text-4xl font-black text-slate-950 dark:text-slate-100 tracking-tight">Dashboard</h2>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mt-1">
                        <MapPin size={14} className="text-[#10b981]" />
                        <span className="text-xs font-bold uppercase tracking-widest">Sede Medellín, Colombia</span>
                    </div>
                </div>
                <div className="text-sm font-black text-[#10b981] dark:text-emerald-400 glass px-5 py-2.5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-lg">
                    {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {!isCajero && (
                    <StatCard
                        icon={Package}
                        label="Valor en Stock"
                        value={formatCOP(totalStockValue)}
                        accentClass="bg-[#10b981]"
                        glowClass="shadow-[#10b981]/30"
                        delay={0.1}
                    />
                )}
                <StatCard
                    icon={DollarSign}
                    label="Ventas Hoy"
                    value={formatCOP(dailySalesTotal)}
                    accentClass="bg-[#22c55e]"
                    glowClass="shadow-[#22c55e]/30"
                    delay={0.2}
                />
                <StatCard
                    icon={ShoppingBag}
                    label="Total Ventas (Unidades)"
                    value={totalUnitsSold ?? 0}
                    accentClass="bg-[#06b6d4]"
                    glowClass="shadow-[#06b6d4]/30"
                    delay={0.25}
                />
                <StatCard
                    icon={AlertTriangle}
                    label="Alertas de Stock"
                    value={alerts.lowStock.length}
                    accentClass="bg-orange-500"
                    glowClass="shadow-orange-500/30"
                    delay={0.3}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Alerts Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass-card rounded-3xl overflow-hidden flex flex-col border border-[#7c3aed]/20"
                >
                    <div className="p-6 flex justify-between items-center cyber-header">
                        <h3 className="font-black text-xl text-slate-800 dark:text-slate-100 flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 text-orange-500" />
                            Atención Urgente
                        </h3>
                    </div>
                    <div className="p-6 space-y-4 flex-1 overflow-auto max-h-[450px] scrollbar-hide">
                        {filteredLowStock.length === 0 && filteredExpiringSoon.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-full mb-4">
                                    <Package className="w-12 h-12 text-emerald-500 opacity-60" />
                                </div>
                                <p className="font-black text-lg">
                                    {searchTerm ? 'Sin coincidencias' : 'Inventario Optimizado'}
                                </p>
                                <p className="text-sm font-medium">
                                    {searchTerm ? `No se encontró "${searchTerm}"` : 'No se detectaron anomalías'}
                                </p>
                            </div>
                        )}

                        {filteredLowStock.map((p, i) => (
                            <motion.div
                                key={`low-${p.id}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * i }}
                                className="flex items-center justify-between p-5 glass-card !bg-white/40 dark:!bg-white/5 hover:!bg-orange-500/10 transition-all rounded-3xl border-none shadow-sm group relative overflow-hidden"
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]"></div>
                                <div className="flex items-center gap-4 pl-2">
                                    <div className="min-w-0">
                                        <p className="font-black text-slate-800 dark:text-slate-200 text-lg group-hover:text-orange-600 transition-colors">{p.name}</p>
                                        <p className="text-sm font-bold text-slate-500">Stock: <span className="text-orange-600 font-black">{p.stock}</span> / Mín: {p.min_stock}</p>
                                    </div>
                                </div>
                                {!isCajero && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleReponer(p.name)}
                                        className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black rounded-xl shadow-lg shadow-orange-500/30 uppercase tracking-widest transition-all"
                                    >
                                        Reponer
                                    </motion.button>
                                )}
                            </motion.div>
                        ))}

                        {filteredExpiringSoon.map((p, i) => (
                            <motion.div
                                key={`exp-${p.id}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * i }}
                                className="flex items-center justify-between p-5 glass-card !bg-white/40 dark:!bg-white/5 hover:!bg-red-500/10 transition-all rounded-3xl border-none shadow-sm group relative overflow-hidden"
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
                                <div className="flex items-center gap-4 pl-2">
                                    <div className="min-w-0">
                                        <p className="font-black text-slate-800 dark:text-slate-200 text-lg group-hover:text-red-600 transition-colors">{p.name}</p>
                                        <p className="text-sm font-bold text-slate-500">Vence: <span className="text-red-600 font-black">{p.expiration_date}</span></p>
                                    </div>
                                </div>
                                <span className="px-4 py-2 bg-red-100 text-red-600 text-[10px] font-black rounded-lg uppercase tracking-wider">
                                    Caduca
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Movement Analysis */}
                {filteredTopProducts.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="glass-card rounded-3xl overflow-hidden"
                    >
                        <div className="p-6 flex justify-between items-center cyber-header border-b border-indigo-500/10">
                            <h3 className="font-black text-xl text-slate-800 dark:text-slate-100 flex items-center gap-3">
                                <TrendingUp className="w-6 h-6 text-[#7c3aed]" />
                                Ranking de Movimientos (Unidades)
                            </h3>
                        </div>
                        <div className="p-8 space-y-8">
                            {filteredTopProducts.map((p, index) => {
                                // Find max sold to scale progress bars relative to top seller
                                const maxSold = Math.max(...filteredTopProducts.map(tp => tp.total_sold), 1);
                                const progress = (p.total_sold / maxSold) * 100;

                                return (
                                    <div key={p.id} className="relative group">
                                        <div className="flex justify-between mb-3 items-end">
                                            <span className="font-black text-slate-700 dark:text-slate-200 text-lg">{p.name}</span>
                                            <span className="text-xs font-black text-[#7c3aed] bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300 px-3 py-1.5 rounded-xl border border-purple-200/50 shadow-sm italic">
                                                {p.total_sold} vendidos
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 overflow-hidden shadow-inner p-0.5 border border-white dark:border-slate-700">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 + (index * 0.1) }}
                                                className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] shadow-lg shadow-indigo-500/20"
                                            ></motion.div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Global Audit Log / Recent History Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="glass-card rounded-3xl overflow-hidden border border-emerald-500/10"
            >
                <div className="p-6 flex justify-between items-center cyber-header border-b border-emerald-500/10">
                    <h3 className="font-black text-xl text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-[#10b981]" />
                        Historial Reciente de Acciones
                    </h3>
                </div>
                <div className="p-6">
                    {(auditLogs || []).length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            No hay acciones registradas recientemente
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {auditLogs.slice(0, 10).map((log, i) => (
                                <motion.div
                                    key={log.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 * i }}
                                    className="flex items-center justify-between p-4 bg-white/40 dark:bg-white/5 rounded-2xl border border-slate-50 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-all border-l-4 border-l-emerald-500 shadow-sm"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                            <TrendingUp className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                <span className="text-emerald-600">@{log.user_name || 'Sistema'}</span> {getLogDescription(log)}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                                {new Date(log.created_at).toLocaleString('es-CO')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded text-xs font-black uppercase tracking-tighter">
                                            {log.entity}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default Dashboard;

