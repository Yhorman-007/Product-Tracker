import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useSearch } from '../context/SearchContext';
import { DollarSign, Download, FileText, TrendingUp, Calculator, X, Search, RotateCcw, User, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCOP } from '../utils/formatters';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../context/AuthContext';

const Reports = () => {
    const { isAdmin } = useAuth();
    const { products, sales, stockMovements, clients, createReturn, stats } = useInventory();
    const { searchTerm } = useSearch();
    const { showNotification } = useNotification();
    const [closureData, setClosureData] = useState(null);
    const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
    const [loadingClosure, setLoadingClosure] = useState(false);
    const [activeView, setActiveView] = useState('valuation'); // 'valuation' or 'sales'
    const [returnSale, setReturnSale] = useState(null); // Sale to return
    const [returnReason, setReturnReason] = useState('');
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [processingReturn, setProcessingReturn] = useState(false);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const fetchDailyClosure = async () => {
        setLoadingClosure(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/reports/daily-closure`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClosureData(res.data);
            setIsClosureModalOpen(true);
        } catch (error) {
            showNotification('Error al obtener cierre de caja: ' + (error.response?.data?.detail || error.message), 'error');
        } finally {
            setLoadingClosure(false);
        }
    };

    // Stock Valuation Calculations
    const term = (searchTerm || '').trim().toLowerCase();
    const stockValuation = products
        .filter(p => !p.archived && (!term || (p.name || '').toLowerCase().includes(term) || (p.sku || '').toLowerCase().includes(term)))
        .map(p => ({
            ...p,
            inventoryValue: (p.stock || 0) * (p.price_purchase || 0),
            potentialSaleValue: (p.stock || 0) * (p.price_sale || 0),
            potentialProfit: (p.stock || 0) * ((p.price_sale || 0) - (p.price_purchase || 0))
        }));

    const totalInventoryValue = stockValuation.reduce((sum, p) => sum + p.inventoryValue, 0);
    const totalPotentialProfit = stockValuation.reduce((sum, p) => sum + p.potentialProfit, 0);

    // Sales Analysis
    const totalSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);

    // Export to PDF
    const exportToPDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for more columns
        doc.setFontSize(18);
        doc.text('Reporte Financiero de Inventario', 14, 22);
        doc.setFontSize(11);
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')} | Generado por: Administrador`, 14, 32);

        const tableData = stockValuation.map(p => [
            p.name,
            p.sku,
            p.stock,
            formatCOP(p.price_purchase || 0),
            formatCOP(p.price_sale || 0),
            formatCOP(p.inventoryValue || 0),
            formatCOP(p.potentialProfit || 0)
        ]);

        autoTable(doc, {
            startY: 40,
            head: [['Producto', 'SKU', 'Stock', 'Costo Unit.', 'P. Venta', 'Valor Costo', 'Utilidad Pot.']],
            body: tableData,
            foot: [['', '', '', '', 'TOTALES:', formatCOP(totalInventoryValue), formatCOP(totalPotentialProfit)]],
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
            footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' }
        });

        doc.save(`reporte-financiero-${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // Export to Excel (Professional Enhancement RF11)
    const exportToExcel = () => {
        const data = stockValuation.map(p => ({
            'Producto': p.name,
            'SKU': p.sku,
            'Stock': p.stock,
            'Unidad': p.unit,
            'Costo Unitario': p.price_purchase,
            'Precio Venta': p.price_sale,
            'Valor Inventario (Costo)': p.inventoryValue,
            'Venta Proyectada': p.potentialSaleValue,
            'Utilidad Potencial': p.potentialProfit
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventario");
        XLSX.writeFile(wb, `reporte-inventario-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Export Sales to CSV
    const exportSalesCSV = () => {
        const sep = ';';
        const headers = ['ID', 'Fecha', 'Cliente', 'Método Pago', 'Costo Total', 'Total Venta', 'Utilidad'];
        const rows = sales.map(s => {
            const cost = s.items.reduce((sum, item) => sum + (item.quantity * (products.find(p => p.id === item.product_id)?.price_purchase || 0)), 0);
            return [
                s.id,
                new Date(s.created_at).toLocaleString(),
                getClientName(s.client_id),
                s.payment_method,
                cost,
                s.total,
                s.total - cost
            ];
        });

        const csvContent = [headers.join(sep), ...rows.map(row => row.join(sep))].join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `historial-ventas-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const handleProcessReturn = async (e) => {
        e.preventDefault();
        if (!returnReason.trim()) {
            showNotification('Por favor ingresa un motivo', 'warning');
            return;
        }

        setProcessingReturn(true);
        try {
            const returnData = {
                sale_id: returnSale.id,
                reason: returnReason,
                items: returnSale.items.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity
                }))
            };

            await createReturn(returnData);
            setIsReturnModalOpen(false);
            setReturnReason('');
            setReturnSale(null);
        } catch (error) {
            console.error('Error info:', error);
            showNotification('Error al procesar devolución', 'error');
        } finally {
            setProcessingReturn(false);
        }
    };

    const getClientName = (clientId) => {
        const client = clients.find(c => c.id === clientId);
        return client ? client.name : 'Consumidor Final';
    };

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center p-20 glass-card rounded-3xl text-center">
                <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                    <X className="w-12 h-12 text-red-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Acceso Denegado</h3>
                <p className="text-slate-500 font-medium">No tienes permisos para ver reportes financieros.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-4xl font-black text-slate-900 dark:text-white tracking-tight"
                >
                    Reportes
                </motion.h2>
                <div className="flex gap-2 bg-white/40 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/5 backdrop-blur-md">
                    <button
                        onClick={() => setActiveView('valuation')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'valuation' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Valoración
                    </button>
                    <button
                        onClick={() => setActiveView('sales')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'sales' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Historial Ventas
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={fetchDailyClosure}
                        disabled={loadingClosure}
                        className="flex items-center gap-2 btn-primary-elite text-white px-5 py-2.5 rounded-xl font-bold transition-all"
                    >
                        <Calculator className="w-4 h-4" />
                        {loadingClosure ? 'Cargando...' : 'Cierre de Caja'}
                    </button>
                    <button
                        onClick={exportToPDF}
                        className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-red-500/30"
                    >
                        <Download className="w-4 h-4" />
                        PDF
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl"><DollarSign className="w-6 h-6 text-blue-600" /></div>
                        <div>
                            <p className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">Valor Inventario (Costo)</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white">{formatCOP(totalInventoryValue)}</p>
                        </div>
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6 border-l-4 border-l-emerald-500">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 dark:bg-emerald-900/30 rounded-xl"><TrendingUp className="w-6 h-6 text-green-600" /></div>
                        <div>
                            <p className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">Ventas Totales</p>
                            <p className="text-xl font-black text-slate-900 dark:text-white">{formatCOP(totalSales)}</p>
                        </div>
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-6 border-l-4 border-l-indigo-500">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl"><Calculator className="w-6 h-6 text-indigo-600" /></div>
                        <div>
                            <p className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">Utilidad Neta (Real)</p>
                            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{formatCOP(stats.netProfit || 0)}</p>
                        </div>
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl p-6 border-l-4 border-l-orange-500">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl"><TrendingUp className="w-6 h-6 text-orange-600" /></div>
                        <div>
                            <p className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">Utilidad Potencial</p>
                            <p className="text-xl font-black text-orange-600 dark:text-orange-400">{formatCOP(totalPotentialProfit)}</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Views */}
            {activeView === 'valuation' ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl overflow-hidden shadow-md">
                    <div className="p-5 flex justify-between items-center cyber-header">
                        <div className="flex items-center gap-2">
                            <Search className="text-primary w-5 h-5" />
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200">Valoración de Inventario</h3>
                            {searchTerm && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg animate-pulse">
                                    Filtrando por: "{searchTerm}"
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={exportToExcel}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md"
                            >
                                <FileSpreadsheet className="w-4 h-4" /> Excel
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-emerald-50/30 dark:bg-emerald-900/10 text-emerald-600/70 dark:text-emerald-400/50 font-black text-[10px] uppercase tracking-[0.2em]">
                                <tr>
                                    <th className="p-4 border-b border-emerald-100/50 dark:border-emerald-800/20">Producto</th>
                                    <th className="p-4 border-b border-emerald-100/50 dark:border-emerald-800/20">Categoría</th>
                                    <th className="p-4 border-b border-emerald-100/50 dark:border-emerald-800/20 text-right">Stock</th>
                                    <th className="p-4 border-b border-emerald-100/50 dark:border-emerald-800/20 text-right">Costo Unit.</th>
                                    <th className="p-4 border-b border-emerald-100/50 dark:border-emerald-800/20 text-right">P. Venta</th>
                                    <th className="p-4 border-b border-emerald-100/50 dark:border-emerald-800/20 text-right">Utilidad Pot.</th>
                                    <th className="p-4 border-b border-emerald-100/50 dark:border-emerald-800/20 text-right">Valor Costo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-emerald-100/30 dark:divide-emerald-900/20">
                                {stockValuation.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center text-slate-400 font-medium">
                                            No se encontraron resultados para tu búsqueda
                                        </td>
                                    </tr>
                                )}
                                <AnimatePresence mode='popLayout'>
                                    {stockValuation.map((product) => (
                                        <motion.tr
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            key={product.id}
                                            className="hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
                                        >
                                            <td className="p-4">
                                                <p className="font-bold text-slate-800 dark:text-slate-200">{product.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{product.sku}</p>
                                            </td>
                                            <td className="p-4 text-sm font-medium text-slate-600 dark:text-slate-400">{product.category}</td>
                                            <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-300">{product.stock} {product.unit}</td>
                                            <td className="p-4 text-right text-slate-700 dark:text-slate-300">{formatCOP(product.price_purchase)}</td>
                                            <td className="p-4 text-right text-slate-700 dark:text-slate-300">{formatCOP(product.price_sale)}</td>
                                            <td className="p-4 text-right font-bold text-orange-600 dark:text-orange-400">{formatCOP(product.potentialProfit)}</td>
                                            <td className="p-4 text-right font-black text-slate-800 dark:text-white">{formatCOP(product.inventoryValue)}</td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                            <tfoot className="bg-slate-50/80 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-700">
                                <tr>
                                    <td colSpan="5" className="p-4 text-right font-black text-slate-800 dark:text-white uppercase tracking-wider">TOTAL UTILIDAD:</td>
                                    <td className="p-4 text-right text-xl font-black text-orange-600">{formatCOP(totalPotentialProfit)}</td>
                                    <td className="p-4 text-right text-xl font-black text-primary">{formatCOP(totalInventoryValue)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </motion.div>
            ) : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl overflow-hidden shadow-md">
                    <div className="p-5 flex justify-between items-center cyber-header">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="text-primary w-5 h-5" />
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200">Historial de Ventas</h3>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/30 dark:bg-white/5 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">
                                <tr>
                                    <th className="p-4 border-b dark:border-white/5">Fecha/Cajero</th>
                                    <th className="p-4 border-b dark:border-white/5">Cliente</th>
                                    <th className="p-4 border-b dark:border-white/5 text-center">Método</th>
                                    <th className="p-4 border-b dark:border-white/5 text-right">Total</th>
                                    <th className="p-4 border-b dark:border-white/5 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-white/5">
                                {sales.slice().reverse().map((sale) => (
                                    <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 dark:text-slate-200">{new Date(sale.created_at).toLocaleString()}</span>
                                                <span className="text-[10px] text-slate-400 font-black">ID: #{sale.id}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <User className="w-3 h-3 text-slate-400" />
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    {getClientName(sale.client_id)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded font-black uppercase tracking-tighter">
                                                {sale.payment_method}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-black text-emerald-600 dark:text-[#10b981]">
                                            {formatCOP(sale.total)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => {
                                                    setReturnSale(sale);
                                                    setIsReturnModalOpen(true);
                                                }}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                                                title="Iniciar Devolución"
                                            >
                                                <RotateCcw className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* Cierre de Caja Modal */}
            <AnimatePresence>
                {isClosureModalOpen && closureData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setIsClosureModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">Cierre de Caja</h3>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">Fecha: {new Date(closureData.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                                <button
                                    onClick={() => setIsClosureModalOpen(false)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                >
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ventas Hoy</p>
                                        <p className="text-2xl font-black text-slate-800 dark:text-white">{closureData.total_sales_count}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unidades</p>
                                        <p className="text-2xl font-black text-slate-800 dark:text-white">{closureData.total_items_sold}</p>
                                    </div>
                                </div>

                                <div className="p-6 bg-primary/5 rounded-2xl border border-primary/20">
                                    <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Total Recaudado</p>
                                    <p className="text-4xl font-black text-primary-hover">{formatCOP(closureData.total_revenue)}</p>
                                    {closureData.total_discount > 0 && (
                                        <p className="text-xs text-slate-500 mt-2">Dctos: {formatCOP(closureData.total_discount)}</p>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b dark:border-slate-700 pb-2">Métodos de Pago</h4>
                                    <div className="space-y-2">
                                        {Object.entries(closureData.by_payment_method).map(([method, amount]) => (
                                            <div key={method} className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
                                                <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[11px]">{method}</span>
                                                <span className="font-black text-slate-800 dark:text-white">{formatCOP(amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        showNotification('Cierre de caja guardado exitosamente', 'success');
                                        setIsClosureModalOpen(false);
                                    }}
                                    className="w-full py-4 bg-slate-900 dark:bg-primary text-white rounded-2xl font-black shadow-xl hover:scale-[1.02] transition-all active:scale-[0.98]"
                                >
                                    Finalizar Jornada
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Devolución Modal */}
            <AnimatePresence>
                {isReturnModalOpen && returnSale && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setIsReturnModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Procesar Devolución</h3>
                            <p className="text-slate-500 mb-6 font-medium">Venta #{returnSale.id} - Total: {formatCOP(returnSale.total)}</p>

                            <form onSubmit={handleProcessReturn} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Items a devolver</label>
                                    <div className="max-h-40 overflow-y-auto space-y-2 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                        {returnSale.items.map(item => (
                                            <div key={item.id} className="flex justify-between text-sm">
                                                <span className="text-slate-600 dark:text-slate-300 font-bold">Prod ID: {item.product_id}</span>
                                                <span className="font-black text-slate-800 dark:text-white">x{item.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Motivo de la Devolución</label>
                                    <textarea
                                        value={returnReason}
                                        onChange={(e) => setReturnReason(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-red-500/50 outline-none text-slate-900 dark:text-white transition-all min-h-[100px]"
                                        placeholder="Ej: Producto defectuoso, Error en la compra..."
                                        required
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsReturnModalOpen(false)}
                                        className="flex-1 py-4 text-slate-400 font-black hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processingReturn}
                                        className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-500/20 transition-all disabled:opacity-50"
                                    >
                                        {processingReturn ? 'Procesando...' : 'Confirmar Devolución'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Reports;
