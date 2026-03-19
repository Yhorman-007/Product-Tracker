import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useSearch } from '../context/SearchContext';
import { Plus, Search, Edit, Trash2, X, Building2, Phone, Mail, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import ConfirmModal from '../components/ui/ConfirmModal';

const Suppliers = () => {
    const { isAdmin } = useAuth();
    const { suppliers, addSupplier, updateSupplier, deleteSupplier, products, updateProduct } = useInventory();
    const { showNotification } = useNotification();
    const { searchTerm, setSearchTerm } = useSearch();
    const [showCatalogueModal, setShowCatalogueModal] = useState(null); // supplier object
    const [catalogueItems, setCatalogueItems] = useState([]); // {product_id, cost}
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, supplier: null });
    const [prodSearch, setProdSearch] = useState('');
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const { getSupplierCatalogue, addToCatalogue, removeFromCatalogue } = useInventory();

    const openCatalogue = async (supplier) => {
        try {
            const items = await getSupplierCatalogue(supplier.id);
            setCatalogueItems(items);
            setShowCatalogueModal(supplier);
        } catch (error) {
            showNotification('Error al cargar catálogo', 'error');
        }
    };

    const handleCatalogueToggle = async (productId) => {
        const isLinked = catalogueItems.some(item => item.product_id === productId);
        if (isLinked) {
            await removeFromCatalogue(showCatalogueModal.id, productId);
            setCatalogueItems(prev => prev.filter(item => item.product_id !== productId));
        } else {
            const product = products.find(p => p.id === productId);
            const newItem = {
                product_id: productId,
                supplier_id: showCatalogueModal.id,
                cost_price_by_supplier: product.price_purchase
            };
            await addToCatalogue(showCatalogueModal.id, newItem);
            setCatalogueItems(prev => [...prev, newItem]);
        }
    };

    const updateCataloguePrice = async (productId, newPrice) => {
        const item = {
            product_id: productId,
            supplier_id: showCatalogueModal.id,
            cost_price_by_supplier: parseFloat(newPrice) || 0
        };
        await addToCatalogue(showCatalogueModal.id, item);
        setCatalogueItems(prev => prev.map(i => i.product_id === productId ? { ...i, cost_price_by_supplier: item.cost_price_by_supplier } : i));
    };

    const filteredSuppliers = (suppliers || []).filter(s => {
        const term = (searchTerm || '').trim().toLowerCase();
        const name = (s?.name || '').toLowerCase();
        const contact = (s?.contact_name || '').toLowerCase();
        const email = (s?.email || '').toLowerCase();
        const phone = (s?.phone || '').toLowerCase();
        return !term || name.includes(term) || contact.includes(term) || email.includes(term) || phone.includes(term);
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const supplierData = {
            name: formData.get('name'),
            contact_name: formData.get('contact_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            payment_terms: formData.get('payment_terms'),
            address: formData.get('address')
        };

        if (editingSupplier) {
            await updateSupplier(editingSupplier.id, supplierData);
            // Link newly selected products to catalogue
            for (const productId of selectedProductIds) {
                const product = products.find(p => p.id === productId);
                await addToCatalogue(editingSupplier.id, {
                    product_id: productId,
                    supplier_id: editingSupplier.id,
                    cost_price_by_supplier: product?.price_purchase || 0
                });
            }
            setEditingSupplier(null);
        } else {
            const newSupplier = await addSupplier(supplierData);
            // Link selected products to catalogue after creation
            if (newSupplier && selectedProductIds.length > 0) {
                for (const productId of selectedProductIds) {
                    const product = products.find(p => p.id === productId);
                    await addToCatalogue(newSupplier.id, {
                        product_id: productId,
                        supplier_id: newSupplier.id,
                        cost_price_by_supplier: product?.price_purchase || 0
                    });
                }
            }
            setShowAddModal(false);
        }
        setSelectedProductIds([]);
    };

    const toggleProductSelect = (productId) => {
        setSelectedProductIds(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const currentSupplier = editingSupplier || (showAddModal ? {} : null);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-3xl font-bold text-slate-950 dark:text-slate-100 tracking-tight"
                >
                    Proveedores
                </motion.h2>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 btn-primary-elite text-white px-5 py-2.5 rounded-xl font-medium transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Proveedor
                </motion.button>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl overflow-hidden"
            >
                <div className="p-5 flex justify-between items-center cyber-header">
                    <div className="flex items-center gap-3">
                        <Building2 className="text-primary w-6 h-6" />
                        <h3 className="font-black text-slate-900 dark:text-slate-200">Socio-Proveedores</h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                    {filteredSuppliers.map((supplier) => (
                        <motion.div
                            key={supplier.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-4 bg-white/60 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 hover:shadow-xl hover:-translate-y-1 transition-all group"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-primary" />
                                    <h3 className="font-bold text-slate-900 dark:text-slate-100">{supplier.name}</h3>
                                </div>
                                <div className="flex gap-1 opacity-100 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => openCatalogue(supplier)}
                                        className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold uppercase"
                                        title="Gestionar Catálogo"
                                    >
                                        <Package className="w-4 h-4" /> Catálogo
                                    </button>
                                    {isAdmin && (
                                        <>
                                            <button
                                                onClick={() => setEditingSupplier(supplier)}
                                                className="p-1 hover:bg-primary/10 text-primary rounded"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete({ isOpen: true, supplier })}
                                                className="p-1 hover:bg-red-50 text-red-500 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-2">
                                    <Mail className="w-3.5 h-3.5" /> <span>{supplier.email || 'Sin correo'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5" /> <span>{supplier.phone || 'Sin teléfono'}</span>
                                </div>
                                <p className="text-[10px] mt-2 text-slate-400 dark:text-slate-500">Condiciones: <span className="font-bold text-slate-600 dark:text-slate-300">{supplier.payment_terms}</span></p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Catalogue Modal */}
            <AnimatePresence>
                {showCatalogueModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-white/20"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-1">Catálogo de Productos</h3>
                                    <p className="text-slate-500 flex items-center gap-2">
                                        <Building2 className="w-4 h-4" /> {showCatalogueModal.name}
                                    </p>
                                </div>
                                <button onClick={() => setShowCatalogueModal(null)} className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Buscar productos para vincular..."
                                    className="w-full pl-12 pr-4 py-4 bg-slate-100 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none text-slate-700 dark:text-white font-medium"
                                    value={prodSearch}
                                    onChange={(e) => setProdSearch(e.target.value)}
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {products
                                        .filter(p => !p.archived && (p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.sku.toLowerCase().includes(prodSearch.toLowerCase())))
                                        .map(product => {
                                            const catalogueItem = catalogueItems.find(i => i.product_id === product.id);
                                            const isLinked = !!catalogueItem;

                                            return (
                                                <div
                                                    key={product.id}
                                                    className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${isLinked
                                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                                                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-white/5 hover:border-primary/30'
                                                        }`}
                                                >
                                                    <div className="relative">
                                                        <input
                                                            type="checkbox"
                                                            checked={isLinked}
                                                            onChange={() => handleCatalogueToggle(product.id)}
                                                            className="w-5 h-5 rounded-lg border-2 border-slate-300 text-emerald-500 focus:ring-emerald-500 transition-all cursor-pointer"
                                                        />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-slate-900 dark:text-white truncate">{product.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{product.sku}</p>
                                                    </div>

                                                    {isLinked && (
                                                        <div className="w-32">
                                                            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-1 uppercase">Costo Especial</p>
                                                            <div className="relative">
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                                                                <input
                                                                    type="number"
                                                                    className="w-full pl-5 pr-2 py-1.5 bg-white dark:bg-slate-950 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                                                                    defaultValue={catalogueItem.cost_price_by_supplier}
                                                                    onBlur={(e) => updateCataloguePrice(product.id, e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex justify-between items-center text-slate-500">
                                <p className="text-sm font-medium">
                                    <span className="text-emerald-500 font-bold">{catalogueItems.length}</span> productos en el catálogo
                                </p>
                                <button
                                    onClick={() => setShowCatalogueModal(null)}
                                    className="px-8 py-3 bg-slate-900 dark:bg-white dark:text-slate-950 text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-xl"
                                >
                                    Cerrar y Guardar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {currentSupplier && !showCatalogueModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="glass-card rounded-2xl p-6 w-full max-w-lg"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-slate-800">
                                    {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setEditingSupplier(null);
                                        setShowAddModal(false);
                                    }}
                                    className="p-2 hover:bg-slate-100 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Comercial</label>
                                        <input name="name" defaultValue={currentSupplier.name} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Contacto Directo</label>
                                        <input name="contact_name" defaultValue={currentSupplier.contact_name} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                        <input name="email" type="email" defaultValue={currentSupplier.email} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                                        <input name="phone" defaultValue={currentSupplier.phone} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary" required />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Términos Comerciales</label>
                                    <input name="payment_terms" defaultValue={currentSupplier.payment_terms} placeholder="Ej: Contado, 30 días..." className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary" required />
                                </div>

                                {/* Product Catalogue Selection - MOVED UP */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                        <Package className="w-4 h-4 text-primary" />
                                        Productos que provee
                                        {selectedProductIds.length > 0 && (
                                            <span className="ml-1 px-2 py-0.5 bg-primary text-white text-[10px] font-black rounded-full">{selectedProductIds.length}</span>
                                        )}
                                    </label>
                                    <div className="relative mb-2">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Buscar producto..."
                                            value={prodSearch}
                                            onChange={e => setProdSearch(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                    <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-white/10 rounded-xl p-2 space-y-1 custom-scrollbar">
                                        {products.filter(p => !p.archived && (p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.sku.toLowerCase().includes(prodSearch.toLowerCase()))).map(product => {
                                            const isSelected = selectedProductIds.includes(product.id);
                                            return (
                                                <label
                                                    key={product.id}
                                                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleProductSelect(product.id)}
                                                        className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{product.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-mono">{product.sku}</p>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-500">${product.price_purchase?.toLocaleString('es-CO')}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Dirección Física</label>
                                    <textarea name="address" defaultValue={currentSupplier.address} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary" rows="2" required />
                                </div>

                                <div className="flex gap-3 justify-end pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingSupplier(null);
                                            setShowAddModal(false);
                                        }}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold shadow-lg"
                                    >
                                        {editingSupplier ? 'Actualizar' : 'Registrador'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, supplier: null })}
                onConfirm={async () => {
                    try {
                        await deleteSupplier(confirmDelete.supplier.id);
                        showNotification('Proveedor eliminado', 'success');
                    } catch (error) {
                        showNotification('Error al eliminar proveedor', 'error');
                    }
                    setConfirmDelete({ isOpen: false, supplier: null });
                }}
                isDestructive={true}
                title="¿Eliminar Proveedor?"
                message={`¿Estás seguro de que deseas eliminar a "${confirmDelete.supplier?.name}"? Esta acción removerá todas sus vinculaciones de catálogo.`}
                confirmText="Sí, eliminar"
            />
        </div>
    );
};

export default Suppliers;
