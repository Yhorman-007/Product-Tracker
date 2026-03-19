import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useSearch } from '../context/SearchContext';
import { Plus, CheckCircle, Package, X, Calendar, Trash2, Search, ChevronDown, ChevronUp, Copy, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCOP } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import ConfirmModal from '../components/ui/ConfirmModal';

const PurchaseOrders = () => {
    const { isAdmin } = useAuth();
    const { purchaseOrders, createPurchaseOrder, receivePurchaseOrder, deletePurchaseOrder, togglePOPayment, suppliers, products, stats, getSupplierCatalogue } = useInventory();
    const { searchTerm } = useSearch();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [orderItems, setOrderItems] = useState([]);
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, orderId: null });
    const [confirmReceive, setConfirmReceive] = useState({ isOpen: false, order: null });
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [supplierCatalogue, setSupplierCatalogue] = useState([]);
    const [loadingReceive, setLoadingReceive] = useState(false);
    const [receptionQuantities, setReceptionQuantities] = useState({});
    const [paymentMethod, setPaymentMethod] = useState('contado');
    const [dueDate, setDueDate] = useState('');
    const { showNotification } = useNotification();

    const getSupplierName = (supplierId) => {
        const supplier = suppliers.find(s => s.id === supplierId);
        return supplier ? supplier.name : 'Desconocido';
    };

    const getProductName = (productId) => {
        const product = (products || []).find(p => p.id === productId);
        return product ? product.name : 'Desconocido';
    };

    const handleSupplierChange = async (sId) => {
        setSelectedSupplierId(sId);
        if (sId) {
            try {
                const catalogue = await getSupplierCatalogue(sId);
                setSupplierCatalogue(catalogue);

                // Pre-populate order items with products from the supplier's catalogue
                if (catalogue && catalogue.length > 0) {
                    const initialItems = catalogue.map(item => ({
                        product_id: item.product_id,
                        quantity: 1,
                        unit_cost: item.cost_price_by_supplier
                    }));
                    setOrderItems(initialItems);
                } else {
                    setOrderItems([]);
                }
            } catch (error) {
                showNotification('Error al cargar catálogo del proveedor', 'error');
                setSupplierCatalogue([]);
            }
        } else {
            setSupplierCatalogue([]);
            setOrderItems([]);
        }
    };

    const term = (searchTerm || '').toLowerCase().trim();
    const filteredOrders = (purchaseOrders || []).filter(order => {
        const supplierName = getSupplierName(order?.supplier_id).toLowerCase();
        const orderId = (order?.id || '').toString();
        const formattedId = `oc-${orderId}`;

        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'pending' && (order.status === 'pending' || order.status === 'parcial')) ||
            (statusFilter === 'completado' && (order.status === 'received' || order.status === 'completado'));

        if (!matchesStatus) return false;

        const matchesSupplier = supplierName.includes(term);
        const matchesId = orderId.includes(term) || formattedId.includes(term) || `oc${orderId}`.includes(term);

        const matchesProducts = (order.items || []).some(item => {
            const prodName = getProductName(item.product_id).toLowerCase();
            return prodName.includes(term);
        });

        return !term || matchesSupplier || matchesId || matchesProducts;
    });

    const handleDuplicate = async (order) => {
        const po = {
            supplier_id: order.supplier_id,
            items: (order.items || []).map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_cost: item.unit_cost
            })),
            notes: `Copia de Orden #${order.id}`
        };

        try {
            await createPurchaseOrder(po);
            showNotification(`¡Orden #${order.id} duplicada con éxito!`, 'success');
        } catch (error) {
            showNotification('Error de conexión, intenta de nuevo', 'error');
        }
    };

    const toggleExpand = (id) => {
        setExpandedOrderId(expandedOrderId === id ? null : id);
    };

    const handleAddItem = () => {
        setOrderItems([...orderItems, { product_id: '', quantity: 1, unit_cost: 0 }]);
    };

    const handleRemoveItem = (index) => {
        setOrderItems(orderItems.filter((_, i) => i !== index));
    };

    const handleItemChange = (index, field, value) => {
        const updated = [...orderItems];
        updated[index][field] = value;

        if (field === 'product_id') {
            const catalogueItem = supplierCatalogue.find(i => i.product_id === parseInt(value));
            if (catalogueItem) {
                updated[index].unit_cost = catalogueItem.cost_price_by_supplier;
            } else {
                const product = products.find(p => p.id === parseInt(value));
                if (product) {
                    updated[index].unit_cost = product.price_purchase;
                }
            }
        }

        setOrderItems(updated);
    };

    const handleCreateOrder = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const items = orderItems.map(item => ({
            product_id: parseInt(item.product_id),
            quantity: Math.max(1, parseInt(item.quantity) || 1),
            unit_cost: parseFloat(item.unit_cost) || 0
        })).filter(item => item.product_id && item.quantity > 0);

        if (items.length === 0) {
            showNotification('Agregue al menos un producto al pedido', 'warning');
            return;
        }

        const po = {
            supplier_id: parseInt(selectedSupplierId),
            items,
            notes: formData.get('notes') || null,
            payment_method: paymentMethod,
            due_date: paymentMethod === 'credito' && dueDate ? dueDate : null
        };

        try {
            await createPurchaseOrder(po);
            setShowCreateModal(false);
            setSupplierCatalogue([]);
            setPaymentMethod('contado');
            setDueDate('');
        } catch (_) { /* Error handled in context */ }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-4xl font-black text-slate-900 dark:text-white tracking-tight"
                >
                    Órdenes de Compra
                </motion.h2>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 btn-primary-elite text-white px-5 py-2.5 rounded-xl font-medium transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Orden
                </motion.button>
            </div>

            {/* Status Filters */}
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 w-fit rounded-xl border border-slate-200 dark:border-slate-700">
                {['all', 'pending', 'completado'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${statusFilter === status
                            ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        {status === 'all' ? 'Ver Todas' : status === 'pending' ? 'Pendientes' : 'Completadas'}
                    </button>
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl overflow-hidden shadow-md"
            >
                <div className="p-5 flex justify-between items-center cyber-header">
                    <div className="flex items-center gap-2">
                        <Search className="text-primary w-5 h-5" />
                        <h3 className="font-bold text-slate-900 dark:text-slate-300">Registro de Órdenes</h3>
                        {searchTerm && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg animate-pulse">
                                Filtrando por: "{searchTerm}"
                            </span>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">
                            <tr>
                                <th className="p-4 border-b border-purple-100 dark:border-slate-700 w-10"></th>
                                <th className="p-4 border-b border-purple-100 dark:border-slate-700">ID</th>
                                <th className="p-4 border-b border-purple-100 dark:border-slate-700">Proveedor</th>
                                <th className="p-4 border-b border-purple-100 dark:border-slate-700">Total</th>
                                <th className="p-4 border-b border-purple-100 dark:border-slate-700">Pago</th>
                                <th className="p-4 border-b border-purple-100 dark:border-slate-700">Fecha</th>
                                <th className="p-4 border-b border-purple-100 dark:border-slate-700 text-center">Estado</th>
                                <th className="p-4 border-b border-purple-100 dark:border-slate-700 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100/50 dark:divide-slate-800/50">
                            {filteredOrders.length === 0 && !searchTerm && (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-slate-400 font-medium">
                                        No hay órdenes de compra registradas
                                    </td>
                                </tr>
                            )}
                            {filteredOrders.length === 0 && searchTerm && (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-slate-400 font-medium">
                                        No se encontraron órdenes para tu búsqueda
                                    </td>
                                </tr>
                            )}
                            <AnimatePresence>
                                {filteredOrders.flatMap((order) => [
                                    <motion.tr
                                        key={order.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className={`hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors group cursor-pointer ${expandedOrderId === order.id ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                                        onClick={() => toggleExpand(order.id)}
                                    >
                                        <td className="p-4 border-l-4 border-transparent group-hover:border-primary transition-all">
                                            {expandedOrderId === order.id ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                        </td>
                                        <td className="p-4 font-bold text-slate-800 dark:text-slate-200">OC-{order.id}</td>
                                        <td className="p-4 font-medium text-slate-700 dark:text-slate-300">
                                            <div className="flex flex-col">
                                                <span className="font-bold">{getSupplierName(order.supplier_id)}</span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {(order.items || []).slice(0, 2).map((item, idx) => (
                                                        <span key={idx} className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                            {item.quantity}x {getProductName(item.product_id).split(' ')[0]}
                                                        </span>
                                                    ))}
                                                    {(order.items || []).length > 2 && (
                                                        <span className="text-[9px] text-slate-400">+{order.items.length - 2} más</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 font-black text-primary">{formatCOP(order.total)}</td>
                                        <td className="p-4">
                                            {order.payment_method === 'credito' ? (
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded w-fit ${order.is_paid ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                        {order.is_paid ? 'Pagado' : 'Crédito'}
                                                    </span>
                                                    {order.due_date && !order.is_paid && (
                                                        <span className={`text-[10px] mt-1 font-bold ${new Date(order.due_date) < new Date() ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                                                            Vence: {new Date(order.due_date).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] bg-slate-100 text-slate-500 font-black uppercase px-1.5 py-0.5 rounded">Efectivo</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-slate-500">{new Date(order.created_at).toLocaleDateString('es-ES')}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'received' || order.status === 'completado' ? 'bg-green-100 text-green-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                                                order.status === 'pending' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' :
                                                    order.status === 'parcial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                                                        'bg-slate-100 text-slate-700'
                                                }`}>
                                                {order.status === 'received' || order.status === 'completado' ? 'Completado' :
                                                    order.status === 'parcial' ? 'Parcial' :
                                                        order.status === 'pending' ? 'Pendiente' : order.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleDuplicate(order)}
                                                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title="Duplicar Orden"
                                                >
                                                    <Copy className="w-5 h-5" />
                                                </button>
                                                {order.status !== 'completado' && order.status !== 'received' && (
                                                    <button
                                                        onClick={() => {
                                                            const initialQtys = {};
                                                            order.items.forEach(item => {
                                                                initialQtys[item.id] = item.quantity - (item.received_quantity || 0);
                                                            });
                                                            setReceptionQuantities(initialQtys);
                                                            setConfirmReceive({ isOpen: true, order });
                                                        }}
                                                        className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                                        title="Recibir Mercancía"
                                                    >
                                                        <CheckCircle className="w-5 h-5" />
                                                    </button>
                                                )}
                                                {order.payment_method === 'credito' && (
                                                    <button
                                                        onClick={() => togglePOPayment(order.id)}
                                                        className={`p-2 rounded-lg transition-colors ${order.is_paid ? 'text-slate-400 hover:text-emerald-500' : 'text-amber-500 hover:bg-amber-50'}`}
                                                        title={order.is_paid ? "Marcar como Pendiente" : "Marcar como Pagado"}
                                                    >
                                                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setConfirmDelete({ isOpen: true, orderId: order.id })}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>,
                                    expandedOrderId === order.id && (
                                        <motion.tr
                                            key={`expanded-${order.id}`}
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden"
                                        >
                                            <td colSpan="7" className="p-6 border-b border-slate-100 dark:border-slate-800">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div>
                                                        <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest mb-4">
                                                            <Package className="w-4 h-4 text-primary" /> Productos en la Orden
                                                        </h4>
                                                        <div className="space-y-3">
                                                            {(order.items || []).map((item, idx) => (
                                                                <div key={idx} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex flex-col items-center">
                                                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                                                                                {item.quantity}
                                                                            </div>
                                                                            <span className="text-[9px] text-slate-400 font-bold mt-1">PEDIDO</span>
                                                                        </div>
                                                                        <div className="flex flex-col items-center">
                                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${(item.received_quantity || 0) >= item.quantity ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                                                {item.received_quantity || 0}
                                                                            </div>
                                                                            <span className="text-[9px] text-slate-400 font-bold mt-1">RECIBIDO</span>
                                                                        </div>
                                                                        <div className="ml-2">
                                                                            <span className="font-bold text-slate-700 dark:text-slate-300 block">{getProductName(item.product_id)}</span>
                                                                            <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                                                                                <div
                                                                                    className="h-full bg-emerald-500 transition-all duration-500"
                                                                                    style={{ width: `${Math.min(100, ((item.received_quantity || 0) / item.quantity) * 100)}%` }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-xs text-slate-400 font-bold uppercase">Costo Total</p>
                                                                        <p className="text-sm font-black text-primary">{formatCOP(item.quantity * item.unit_cost)}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-6">
                                                        <div>
                                                            <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest mb-4">
                                                                <Calendar className="w-4 h-4 text-primary" /> Detalles Adicionales
                                                            </h4>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                                    <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Creada</p>
                                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{new Date(order.created_at).toLocaleTimeString()}</p>
                                                                </div>
                                                                {order.received_at && (
                                                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                                        <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Recibida</p>
                                                                        <p className="text-sm font-bold text-emerald-500">{new Date(order.received_at).toLocaleDateString()}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {order.notes && (
                                                            <div>
                                                                <p className="text-[10px] text-slate-400 font-black uppercase mb-2">Notas</p>
                                                                <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl text-sm italic text-slate-600 dark:text-slate-400 border border-primary/10">
                                                                    "{order.notes}"
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    )
                                ]).filter(Boolean)}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Create Order Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="glass-card rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Nueva Orden de Compra</h3>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 dark:text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateOrder} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Proveedor</label>
                                    <select
                                        name="supplier_id"
                                        value={selectedSupplierId}
                                        onChange={(e) => handleSupplierChange(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                                        required
                                    >
                                        <option value="">Seleccionar proveedor</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Productos</label>
                                        <button
                                            type="button"
                                            onClick={handleAddItem}
                                            className="text-sm text-primary hover:text-primary-hover font-bold"
                                        >
                                            + Agregar Producto
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {orderItems.map((item, index) => (
                                            <div key={index} className="flex gap-3 items-end p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                <div className="flex-1">
                                                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Producto</label>
                                                    <select
                                                        value={item.product_id}
                                                        onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                                                        className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded"
                                                        required
                                                    >
                                                        <option value="">Seleccionar</option>
                                                        {products.filter(p => !p.archived).map(product => {
                                                            const catalogueItem = supplierCatalogue.find(ci => ci.product_id === product.id);
                                                            return (
                                                                <option key={product.id} value={product.id}>
                                                                    {product.name} {catalogueItem ? '(Catálogo)' : ''}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>
                                                <div className="w-24">
                                                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Cantidad</label>
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            handleItemChange(index, 'quantity', isNaN(val) || val < 1 ? 1 : val);
                                                        }}
                                                        className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded"
                                                        min="1"
                                                        required
                                                    />
                                                </div>
                                                <div className="w-28">
                                                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Costo Unit.</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.unit_cost}
                                                        onChange={(e) => handleItemChange(index, 'unit_cost', parseFloat(e.target.value))}
                                                        className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded"
                                                        required
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {orderItems.length === 0 && (
                                            <p className="text-sm text-slate-400 text-center py-4">No hay productos agregados</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Método de Pago</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('contado')}
                                                className={`flex-1 py-2 px-3 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-wider ${paymentMethod === 'contado' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                                            >
                                                Efectivo
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('credito')}
                                                className={`flex-1 py-2 px-3 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-wider ${paymentMethod === 'credito' ? 'border-amber-500 bg-amber-500/10 text-amber-600' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                                            >
                                                Crédito
                                            </button>
                                        </div>
                                    </div>
                                    {paymentMethod === 'credito' && (
                                        <motion.div
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                        >
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Fecha de Vencimiento</label>
                                            <input
                                                type="date"
                                                value={dueDate}
                                                onChange={(e) => setDueDate(e.target.value)}
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/50"
                                                required={paymentMethod === 'credito'}
                                            />
                                        </motion.div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas (opcional)</label>
                                    <textarea
                                        name="notes"
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                                        rows="2"
                                    />
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t dark:border-slate-700">
                                    <div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">Total Estimado</p>
                                        <p className="text-2xl font-black text-primary">
                                            {formatCOP(orderItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0))}
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateModal(false)}
                                            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={orderItems.length === 0}
                                            className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            Crear Orden
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence >

            {/* Confirmation Modals */}
            < ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, orderId: null })}
                onConfirm={() => {
                    deletePurchaseOrder(confirmDelete.orderId);
                    setConfirmDelete({ isOpen: false, orderId: null });
                }}
                title="¿Eliminar Orden?"
                message={`¿Estás seguro de que deseas eliminar la orden OC-${confirmDelete.orderId}? Esta acción quitará la orden del historial permanentemente.`}
                confirmText="Eliminar permanentemente"
                isDestructive={true}
            />

            {/* Partial Receive Modal */}
            <AnimatePresence>
                {confirmReceive.isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setConfirmReceive({ isOpen: false, order: null })}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="glass-card rounded-3xl p-8 w-full max-w-2xl shadow-2xl overflow-hidden relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>

                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        <CheckCircle className="text-emerald-500 w-7 h-7" />
                                        Recepción de Mercancía
                                    </h3>
                                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                        Orden OC-{confirmReceive.order?.id} • {getSupplierName(confirmReceive.order?.supplier_id)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setConfirmReceive({ isOpen: false, order: null })}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                >
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                {(confirmReceive.order?.items || []).map((item) => {
                                    const pending = item.quantity - (item.received_quantity || 0);
                                    if (pending <= 0) return null;

                                    return (
                                        <div key={item.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50 flex items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                                    {getProductName(item.product_id)}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded font-black">
                                                        PEDIDO: {item.quantity}
                                                    </span>
                                                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 px-1.5 py-0.5 rounded font-black">
                                                        RECIBIDO: {item.received_quantity || 0}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Recibir ahora</p>
                                                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={pending}
                                                            value={receptionQuantities[item.id] || 0}
                                                            onChange={(e) => {
                                                                const val = Math.min(pending, Math.max(0, parseInt(e.target.value) || 0));
                                                                setReceptionQuantities({ ...receptionQuantities, [item.id]: val });
                                                            }}
                                                            className="w-16 bg-transparent text-center font-black text-primary outline-none"
                                                        />
                                                        <span className="text-xs text-slate-400 pr-2 border-l pl-2 dark:border-slate-700 font-bold">
                                                            / {pending}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={() => setConfirmReceive({ isOpen: false, orderId: null })}
                                    className="flex-1 py-3.5 px-6 rounded-2xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={async () => {
                                        setLoadingReceive(true);
                                        try {
                                            const items = Object.entries(receptionQuantities)
                                                .filter(([_, qty]) => qty > 0)
                                                .map(([id, qty]) => ({
                                                    item_id: parseInt(id),
                                                    received_quantity: qty
                                                }));

                                            if (items.length === 0) {
                                                showNotification('Ingrese al menos una cantidad para recibir', 'warning');
                                                setLoadingReceive(false);
                                                return;
                                            }

                                            await receivePurchaseOrder(confirmReceive.order.id, { items });
                                            setConfirmReceive({ isOpen: false, order: null });
                                        } catch (error) {
                                            // Error handled in refresh
                                        } finally {
                                            setLoadingReceive(false);
                                        }
                                    }}
                                    disabled={loadingReceive}
                                    className="flex-[2] py-3.5 px-6 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loadingReceive ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Procesando...
                                        </>
                                    ) : (
                                        <>Confirmar Recepción</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div >
    );
};

export default PurchaseOrders;
