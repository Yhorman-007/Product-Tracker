import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useNotification } from '../context/NotificationContext';
import { useSearch } from '../context/SearchContext';
import { Plus, Search, Edit, Trash2, Archive, History, X, Box, FileSpreadsheet, MapPin, Package, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCOP } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import EmergencyAuthModal from '../components/common/EmergencyAuthModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import AuditTimeline from '../components/ui/AuditTimeline';
import { auditLogsApi } from '../services/api';

const Inventory = () => {
    const { products, addProduct, deleteProduct, archiveProduct, updateProduct, stockMovements, createStockMovement, fetchProductMovements, suppliers, loading } = useInventory();
    const { isAdmin, isCajero } = useAuth();
    const { showNotification } = useNotification();
    const { searchTerm, setSearchTerm } = useSearch();
    const [showArchived, setShowArchived] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [viewingMovements, setViewingMovements] = useState(null);
    const [adjustingStock, setAdjustingStock] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [activeTab, setActiveTab] = useState('movements'); // 'movements' or 'audit'
    const [confirmArchive, setConfirmArchive] = useState({ isOpen: false, product: null });
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, product: null });

    // --- Emergency Authorization State ---
    const [emergencyAuthItem, setEmergencyAuthItem] = useState(null);

    const filteredProducts = (products || []).filter(p => {
        const term = (searchTerm || '').trim().toLowerCase();
        const nameMatches = (p?.name || '').toLowerCase().includes(term);
        const skuMatches = (p?.sku || '').toLowerCase().includes(term);
        const archivedMatches = showArchived ? p?.archived : !p?.archived;
        return (nameMatches || skuMatches) && archivedMatches;
    });

    const exportToExcel = () => {
        const sep = ';';
        const headers = ['Nombre', 'SKU', 'Categoría', 'Stock', 'Unidad', 'Precio Compra', 'Precio Venta', 'Ubicación', 'Estado'];
        const rows = filteredProducts.map(p => [
            String(p.name ?? ''),
            String(p.sku ?? ''),
            String(p.category ?? ''),
            String(p.stock ?? 0),
            String(p.unit ?? ''),
            String(p.price_purchase ?? 0),
            String(p.price_sale ?? 0),
            String(p.location ?? ''),
            p.archived ? 'Archivado' : 'Activo'
        ]);
        const csvContent = [headers.join(sep), ...rows.map(r => r.join(sep))].join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Inventario_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        showNotification('Inventario exportado (CSV con ;)', 'success');
    };

    const inputClass = "w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none text-slate-900 dark:text-white transition-all";

    const handleAddProduct = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newProduct = {
            name: formData.get('name'),
            sku: formData.get('sku'),
            category: formData.get('category'),
            price_purchase: parseFloat(formData.get('price_purchase')),
            price_sale: parseFloat(formData.get('price_sale')),
            unit: formData.get('unit'),
            stock: parseInt(formData.get('stock')),
            min_stock: parseInt(formData.get('min_stock')),
            location: formData.get('location'),
            supplier_id: formData.get('supplier_id') ? parseInt(formData.get('supplier_id')) : null,
            expiration_date: formData.get('expiration_date') || null
        };
        try {
            await addProduct(newProduct);
            setIsAddingProduct(false);
        } catch (error) {
            console.error('Error in handleAddProduct:', error);
            showNotification('Error al crear producto: ' + (error.response?.data?.detail || error.message), 'error');
        }
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const updates = {
            name: formData.get('name'),
            sku: formData.get('sku'),
            category: formData.get('category'),
            price_purchase: parseFloat(formData.get('price_purchase')),
            price_sale: parseFloat(formData.get('price_sale')),
            unit: formData.get('unit'),
            min_stock: parseInt(formData.get('min_stock')),
            location: formData.get('location'),
            supplier_id: formData.get('supplier_id') ? parseInt(formData.get('supplier_id')) : null,
            expiration_date: formData.get('expiration_date') || null
        };
        try {
            await updateProduct(editingProduct.id, updates);
            setEditingProduct(null);
        } catch (error) {
            console.error('Error in handleSaveEdit:', error);
            showNotification('Error al actualizar: ' + (error.response?.data?.detail || error.message), 'error');
        }
    };

    const handleAdjustStock = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const quantity = parseInt(formData.get('quantity'));
        const type = formData.get('type'); // 'entry' or 'exit'

        const movement = {
            product_id: adjustingStock.id,
            type: type.toUpperCase(),
            quantity: quantity,
            reason: formData.get('reason'),
            date: new Date().toISOString()
        };

        try {
            await createStockMovement(movement);
            setAdjustingStock(null);
            showNotification('Ajuste de stock realizado con éxito', 'success');
        } catch (error) {
            console.error('Error in handleAdjustStock:', error);
            showNotification('Error al ajustar stock: ' + (error.response?.data?.detail || error.message), 'error');
        }
    };

    const fetchAuditLogs = async (productId) => {
        try {
            const response = await auditLogsApi.getByEntity('producto', productId);
            setAuditLogs(response.data);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        }
    };

    const handleOpenHistory = (product) => {
        setViewingMovements(product);
        fetchProductMovements(product.id);
        fetchAuditLogs(product.id);
        setActiveTab('movements');
    };

    const productMovements = viewingMovements
        ? stockMovements.filter(m => m.product_id === viewingMovements.id)
        : [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-4xl font-black text-slate-800 dark:text-white tracking-tight"
                >
                    Inventario
                </motion.h2>
                {!isCajero && (
                    <div className="flex gap-2">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={exportToExcel}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-500/30 transition-all"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            Exportar Excel
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsAddingProduct(true)}
                            className="flex items-center gap-2 btn-success text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-emerald-500/20 transition-all font-sans"
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo Producto
                        </motion.button>
                    </div>
                )}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card rounded-2xl overflow-hidden flex flex-col"
            >
                <div className="p-5 flex flex-col sm:flex-row gap-4 justify-between items-center cyber-header">
                    <div className="flex items-center gap-2">
                        <Package className="text-primary w-5 h-5" />
                        <h3 className="font-bold text-slate-900 dark:text-slate-200">Inventario de Productos</h3>
                        {searchTerm && (
                            <span className="text-[10px] bg-primary/20 text-primary-hover px-2 py-1 rounded-lg border border-primary/30 animate-pulse font-black uppercase tracking-widest">
                                Filtrando: "{searchTerm}"
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${showArchived
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-[#7c3aed]/20'
                            }`}
                    >
                        <Archive className="w-4 h-4" />
                        {showArchived ? 'Ver Activos' : 'Ver Archivados'}
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-emerald-50/30 dark:bg-emerald-900/10 text-emerald-600/70 dark:text-emerald-400/50 font-black text-[10px] uppercase tracking-[0.2em]">
                            <tr>
                                <th className="p-5 border-b border-emerald-100/50 dark:border-emerald-800/20">Producto</th>
                                <th className="p-5 border-b border-emerald-100/50 dark:border-emerald-800/20 text-center">Categoría</th>
                                <th className="p-5 border-b border-emerald-100/50 dark:border-emerald-800/20 text-center">SKU</th>
                                <th className="p-5 border-b border-emerald-100/50 dark:border-emerald-800/20 text-center">Proveedor</th>
                                <th className="p-5 border-b border-emerald-100/50 dark:border-emerald-800/20 text-center">Stock</th>
                                <th className="p-5 border-b border-emerald-100/50 dark:border-emerald-800/20 text-center">P. Venta</th>
                                {!isCajero && <th className="p-5 border-b border-emerald-100/50 dark:border-emerald-800/20 text-center">P. Compra</th>}
                                <th className="p-5 text-right border-b border-emerald-100/50 dark:border-emerald-800/20">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100/50 dark:divide-slate-800/50">
                            <AnimatePresence mode='popLayout'>
                                {filteredProducts.map((product, index) => (
                                    <motion.tr
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        layout
                                        transition={{ duration: 0.2 }}
                                        key={product.id}
                                        className={`group hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors ${product.archived ? 'opacity-60 grayscale' : ''}`}
                                    >
                                        <td className="p-4">
                                            <p className="font-black text-slate-800 dark:text-slate-200">{product.name}</p>
                                            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                                                <MapPin size={10} className="text-[#06b6d4]" />
                                                {product.location}
                                            </p>
                                        </td>
                                        <td className="p-5 text-center text-sm font-bold text-slate-500 dark:text-slate-400">{product.category}</td>
                                        <td className="p-5 text-center text-slate-500 dark:text-slate-500 font-mono text-xs">{product.sku}</td>
                                        <td className="p-5 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
                                            <div className="flex flex-col gap-1 items-center">
                                                {(product.supplier_associations || []).length > 0 ? (
                                                    product.supplier_associations.map(assoc => (
                                                        <span key={assoc.supplier_id} className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-white/5">
                                                            {suppliers.find(s => s.id === assoc.supplier_id)?.name || 'Desconocido'}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-slate-400 italic text-[10px]">Sin Proveedores</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-5 text-center">
                                            {(() => {
                                                const businessConfig = JSON.parse(localStorage.getItem('businessConfig') || '{}');
                                                const globalThreshold = parseInt(businessConfig.lowStockThreshold || '5', 10);
                                                const isLow = product.stock <= product.min_stock || product.stock <= globalThreshold;
                                                const isCritical = product.stock === 0;

                                                return (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border flex items-center gap-2 ${isLow
                                                            ? (isCritical ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50' : 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50')
                                                            : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50'
                                                            }`}
                                                            title={isLow ? (product.stock <= product.min_stock ? `Stock bajo (Mínimo: ${product.min_stock})` : `Umbral global excedido (${globalThreshold})`) : ''}
                                                        >
                                                            {isLow && <AlertTriangle className={`w-3 h-3 ${isCritical ? 'animate-pulse' : ''}`} />}
                                                            {product.stock} {product.unit}
                                                        </span>
                                                        {isLow && (
                                                            <span className={`text-[8px] font-black uppercase tracking-tighter ${isCritical ? 'text-red-500' : 'text-orange-500'}`}>
                                                                {isCritical ? 'Agotado' : 'Stock Crítico'}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="p-5 text-center font-black text-slate-900 dark:text-slate-100">{formatCOP(product.price_sale)}</td>
                                        {!isCajero && <td className="p-5 text-center font-bold text-slate-500 dark:text-slate-400 italic">{formatCOP(product.price_purchase)}</td>}
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenHistory(product)}
                                                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Historial Completo"
                                                >
                                                    <History className="w-4 h-4" />
                                                </button>
                                                {!isCajero && (
                                                    <>
                                                        <button
                                                            onClick={() => setAdjustingStock(product)}
                                                            className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                                            title="Ajustar Stock"
                                                        >
                                                            <Box className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingProduct(product)}
                                                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmArchive({ isOpen: true, product })}
                                                            className={`p-2 rounded-lg transition-colors ${product.archived ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:text-orange-500 hover:bg-orange-50'}`}
                                                            title={product.archived ? "Restaurar" : "Archivar"}
                                                        >
                                                            <Archive className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            disabled={loading}
                                                            onClick={() => {
                                                                if (isAdmin) {
                                                                    setConfirmDelete({ isOpen: true, product });
                                                                } else {
                                                                    setEmergencyAuthItem({
                                                                        title: 'Eliminación Permanente',
                                                                        description: `Borrando: ${product.name}`,
                                                                        callback: performDelete
                                                                    });
                                                                }
                                                            }}
                                                            className={`p-2 rounded-lg transition-colors ${loading ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                                                            title="Eliminar permanentemente"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                    {filteredProducts.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                            {searchTerm ? 'No se encontraron productos que coincidan con tu búsqueda' : 'No hay productos registrados'}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Emergency Authorization Modal */}
            <EmergencyAuthModal
                isOpen={!!emergencyAuthItem}
                onClose={() => setEmergencyAuthItem(null)}
                onAuthorized={() => emergencyAuthItem?.callback()}
                actionTitle={emergencyAuthItem?.title}
                actionDescription={emergencyAuthItem?.description}
            />

            {/* Add Modal */}
            <AnimatePresence>
                {isAddingProduct && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setIsAddingProduct(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-slate-800">Nuevo Producto</h3>
                                <button
                                    onClick={() => setIsAddingProduct(false)}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleAddProduct} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
                                        <input name="name" className={inputClass} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SKU</label>
                                        <input name="sku" className={inputClass} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                                        <input name="category" className={inputClass} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unidad (kg, unidades, etc)</label>
                                        <input name="unit" className={inputClass} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Stock Inicial</label>
                                        <input name="stock" type="number" className={inputClass} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Stock Mínimo</label>
                                        <input name="min_stock" type="number" className={inputClass} required />
                                    </div>
                                    {isAdmin && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio Compra</label>
                                            <input name="price_purchase" type="number" step="100" className={inputClass} placeholder="e.g. 5000" required />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio Venta</label>
                                        <input name="price_sale" type="number" step="100" className={inputClass} placeholder="e.g. 15000" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ubicación</label>
                                        <input name="location" className={inputClass} placeholder="Pasillo 1, Estante A" required />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Proveedor</label>
                                        <select name="supplier_id" className={inputClass}>
                                            <option value="">Seleccionar Proveedor</option>
                                            {suppliers.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vencimiento (Opcional)</label>
                                        <input name="expiration_date" type="date" className={inputClass} />
                                    </div>
                                </div>
                                <div className="flex gap-3 justify-end pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingProduct(false)}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium shadow-lg shadow-primary/30 transition-all"
                                    >
                                        Crear Producto
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingProduct && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setEditingProduct(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-slate-800">Editar Producto</h3>
                                <button
                                    onClick={() => setEditingProduct(null)}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSaveEdit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
                                        <input
                                            name="name"
                                            defaultValue={editingProduct.name}
                                            className={inputClass}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SKU</label>
                                        <input
                                            name="sku"
                                            defaultValue={editingProduct.sku}
                                            className={inputClass}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
                                        <input
                                            name="category"
                                            defaultValue={editingProduct.category}
                                            className={inputClass}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unidad</label>
                                        <input
                                            name="unit"
                                            defaultValue={editingProduct.unit}
                                            className={inputClass}
                                            required
                                        />
                                    </div>
                                    {isAdmin && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio Compra</label>
                                            <input
                                                name="price_purchase"
                                                type="number"
                                                step="100"
                                                defaultValue={editingProduct.price_purchase}
                                                className={inputClass}
                                                required
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio Venta</label>
                                        <input
                                            name="price_sale"
                                            type="number"
                                            step="100"
                                            defaultValue={editingProduct.price_sale}
                                            className={inputClass}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Stock Mínimo</label>
                                        <input
                                            name="min_stock"
                                            type="number"
                                            defaultValue={editingProduct.min_stock}
                                            className={inputClass}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ubicación</label>
                                        <input
                                            name="location"
                                            defaultValue={editingProduct.location}
                                            className={inputClass}
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Proveedor</label>
                                        <select
                                            name="supplier_id"
                                            defaultValue={editingProduct.supplier_id || ''}
                                            className={inputClass}
                                        >
                                            <option value="">Seleccionar Proveedor</option>
                                            {suppliers.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Vencimiento (Opcional)</label>
                                        <input
                                            name="expiration_date"
                                            type="date"
                                            defaultValue={editingProduct.expiration_date ? editingProduct.expiration_date.split('T')[0] : ''}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 justify-end pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setEditingProduct(null)}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium shadow-lg shadow-primary/30 transition-all"
                                    >
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Movement History Modal */}
            <AnimatePresence>
                {viewingMovements && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setViewingMovements(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{viewingMovements.name}</h3>
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mt-1">
                                        <History className="w-4 h-4" />
                                        <span className="text-sm font-bold uppercase tracking-widest">Línea de Tiempo</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setViewingMovements(null)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5 dark:text-slate-400" />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                                <button
                                    onClick={() => setActiveTab('movements')}
                                    className={`pb-3 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'movements' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Stock Move
                                    {activeTab === 'movements' && <motion.div layoutId="activeTab" className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary" />}
                                </button>
                                <button
                                    onClick={() => setActiveTab('audit')}
                                    className={`pb-3 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'audit' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Audit Log
                                    {activeTab === 'audit' && <motion.div layoutId="activeTab" className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary" />}
                                </button>
                            </div>

                            <div className="space-y-3 min-h-[300px]">
                                {activeTab === 'movements' ? (
                                    productMovements.length === 0 ? (
                                        <p className="text-center text-slate-400 py-12 italic">No hay movimientos de stock registrados</p>
                                    ) : (
                                        productMovements.map(movement => (
                                            <div key={movement.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group hover:border-primary/30 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${['entry', 'in', 'return'].includes(movement.type.toLowerCase()) ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' :
                                                        ['exit', 'out', 'sale'].includes(movement.type.toLowerCase()) ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' :
                                                            'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                                                        }`}>
                                                        {['entry', 'in', 'return'].includes(movement.type.toLowerCase()) ? '+' : '-'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{movement.reason}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-2">
                                                            <Clock className="w-3 h-3" /> {new Date(movement.created_at).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`text-lg font-black ${['entry', 'in', 'return'].includes(movement.type.toLowerCase()) ? 'text-emerald-500' : 'text-red-500'
                                                    }`}>
                                                    {movement.quantity}
                                                </span>
                                            </div>
                                        ))
                                    )
                                ) : (
                                    <div className="pt-2">
                                        <AuditTimeline logs={auditLogs} />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stock Adjustment Modal */}
            <AnimatePresence>
                {adjustingStock && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setAdjustingStock(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card rounded-2xl p-6 w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-800">Ajustar Stock</h3>
                                    <p className="text-slate-500">{adjustingStock.name}</p>
                                </div>
                                <button
                                    onClick={() => setAdjustingStock(null)}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleAdjustStock} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Movimiento</label>
                                    <select
                                        name="type"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                                        required
                                    >
                                        <option value="entry">Entrada (+)</option>
                                        <option value="exit">Salida (-)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label>
                                    <input
                                        name="quantity"
                                        type="number"
                                        min="1"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
                                    <textarea
                                        name="reason"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                                        placeholder="Ej: Ajuste de inventario, Producto dañado..."
                                        rows="3"
                                        required
                                    />
                                </div>
                                <div className="flex gap-3 justify-end pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setAdjustingStock(null)}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium shadow-lg shadow-primary/30 transition-all"
                                    >
                                        Guardar Ajuste
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Confirm Modals */}
            <ConfirmModal
                isOpen={confirmArchive.isOpen}
                onClose={() => setConfirmArchive({ isOpen: false, product: null })}
                onConfirm={async () => {
                    const p = confirmArchive.product;
                    try {
                        await archiveProduct(p.id);
                        showNotification(p.archived ? 'Producto restaurado' : 'Producto archivado', 'success');
                    } catch (error) {
                        showNotification('Error: ' + (error.response?.data?.detail || error.message), 'error');
                    }
                    setConfirmArchive({ isOpen: false, product: null });
                }}
                title={confirmArchive.product?.archived ? "¿Restaurar Producto?" : "¿Archivar Producto?"}
                message={confirmArchive.product?.archived
                    ? `¿Deseas devolver "${confirmArchive.product?.name}" al catálogo activo?`
                    : `¿Estás seguro de archivar "${confirmArchive.product?.name}"? No aparecerá en el POS pero se conservará en el historial.`}
                confirmText={confirmArchive.product?.archived ? "Restaurar" : "Archivar"}
            />

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, product: null })}
                onConfirm={async () => {
                    const p = confirmDelete.product;
                    try {
                        await deleteProduct(p.id);
                        showNotification('Producto eliminado permanentemente', 'success');
                    } catch (error) {
                        showNotification('Error: ' + (error.response?.data?.detail || error.message), 'error');
                    }
                    setConfirmDelete({ isOpen: false, product: null });
                }}
                isDestructive={true}
                title="¿Eliminar Permanentemente?"
                message={`Esta acción no se puede deshacer. Se borrarán todos los registros de "${confirmDelete.product?.name}".`}
                confirmText="Sí, eliminar"
            />
        </div>
    );
};

export default Inventory;
