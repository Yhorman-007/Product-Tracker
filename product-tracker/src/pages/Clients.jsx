import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useSearch } from '../context/SearchContext';
import { useNotification } from '../context/NotificationContext';
import {
    Users, Plus, Search, Edit2, Trash2, Mail, Phone, MapPin,
    CreditCard, MoreVertical, X, Save, UserPlus, UserCheck,
    FileText, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../components/ui/ConfirmModal';

const Clients = () => {
    const { clients, addClient, updateClient, deleteClient, sales, loading } = useInventory();
    const { searchTerm } = useSearch();
    const { showNotification } = useNotification();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        identification: '',
        email: '',
        phone: '',
        address: ''
    });
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, client: null });

    const filteredClients = useMemo(() => {
        const term = (searchTerm || '').toLowerCase().trim();
        return clients.filter(c =>
            !term ||
            c.name.toLowerCase().includes(term) ||
            (c.identification && c.identification.toLowerCase().includes(term)) ||
            (c.email && c.email.toLowerCase().includes(term))
        );
    }, [clients, searchTerm]);

    const handleOpenModal = (client = null) => {
        if (client) {
            setEditingClient(client);
            setFormData({
                name: client.name,
                identification: client.identification || '',
                email: client.email || '',
                phone: client.phone || '',
                address: client.address || ''
            });
        } else {
            setEditingClient(null);
            setFormData({
                name: '',
                identification: '',
                email: '',
                phone: '',
                address: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingClient) {
                await updateClient(editingClient.id, formData);
            } else {
                await addClient(formData);
            }
            setIsModalOpen(false);
        } catch (error) {
            showNotification(error.response?.data?.detail || "Error al procesar cliente", "error");
        }
    };

    const handleDelete = (id, name) => {
        setConfirmDelete({ isOpen: true, client: { id, name } });
    };

    const confirmDeleteClient = async () => {
        if (!confirmDelete.client) return;
        try {
            await deleteClient(confirmDelete.client.id);
            setConfirmDelete({ isOpen: false, client: null });
        } catch (error) {
            showNotification("No se puede eliminar un cliente con historial de ventas", "error");
            setConfirmDelete({ isOpen: false, client: null });
        }
    };

    const getClientStats = (clientId) => {
        const clientSales = sales.filter(s => s.client_id === clientId);
        const totalSpent = clientSales.reduce((acc, s) => acc + s.total, 0);
        return {
            count: clientSales.length,
            total: totalSpent
        };
    };

    if (loading && clients.length === 0) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h2 className="text-4xl font-black text-slate-950 dark:text-slate-100 tracking-tight">Directorio de Clientes</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Gestión y directorio de compradores</p>
                </motion.div>

                <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOpenModal()}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/20 flex items-center gap-2 transition-all"
                >
                    <UserPlus size={20} />
                    Nuevo Cliente
                </motion.button>
            </div>

            {/* Stats Summary Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 rounded-3xl border-l-4 border-l-indigo-500 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Clientes</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{clients.length}</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-6 rounded-3xl border-l-4 border-l-emerald-500 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-emerald-600">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Ventas a Clientes</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
                                {sales.filter(s => s.client_id).length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-6 rounded-3xl border-l-4 border-l-amber-500 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-2xl text-amber-600">
                            <UserCheck size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nuevos (Mes)</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
                                {clients.filter(c => new Date(c.created_at).getMonth() === new Date().getMonth()).length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Clients List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence>
                    {filteredClients.map((client) => {
                        const stats = getClientStats(client.id);
                        return (
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                key={client.id}
                                className="glass-card group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-3xl p-6 relative overflow-hidden border border-slate-100 dark:border-white/5"
                            >
                                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleOpenModal(client)}
                                            className="p-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(client.id, client.name)}
                                            className="p-2 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-start gap-5">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/20">
                                        {client.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 pr-12">
                                        <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 truncate mb-1">{client.name}</h3>
                                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                            <CreditCard size={12} />
                                            {client.identification || 'Sin Identificación'}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 space-y-4">
                                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm font-medium">
                                        <Mail size={16} className="text-slate-400" />
                                        <span className="truncate">{client.email || 'No registrado'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm font-medium">
                                        <Phone size={16} className="text-slate-400" />
                                        <span>{client.phone || 'Sin teléfono'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm font-medium">
                                        <MapPin size={16} className="text-slate-400" />
                                        <span className="truncate">{client.address || 'Sin dirección'}</span>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex justify-between items-center text-xs">
                                    <div className="text-center">
                                        <p className="text-slate-400 font-bold uppercase tracking-tighter mb-1">Compras</p>
                                        <p className="text-lg font-black text-slate-900 dark:text-slate-100">{stats.count}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-slate-400 font-bold uppercase tracking-tighter mb-1">Total Invertido</p>
                                        <p className="text-lg font-black text-emerald-600 shadow-emerald-500/10">
                                            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(stats.total)}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Empty State */}
            {filteredClients.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Users size={64} className="opacity-10 mb-4" />
                    <p className="text-xl font-bold">No se encontraron clientes</p>
                    <p className="text-sm">Agrega tu primer cliente para comenzar a trazar sus compras.</p>
                </div>
            )}

            {/* Modal for Create/Edit */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg glass-card p-8 rounded-[2rem] shadow-2xl border border-white/20"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3">
                                    {editingClient ? <X size={24} className="text-indigo-500" /> : <UserPlus size={24} className="text-indigo-500" />}
                                    {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                                    <X size={20} className="text-slate-500" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nombre Completo *</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-800 dark:text-slate-100"
                                            placeholder="Ej. Juan Pérez"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nit / Cédula</label>
                                        <input
                                            required
                                            type="text"
                                            pattern="^[0-9]{7,12}(-[0-9])?$"
                                            title="Debe ser un NIT válido (ej. 12345678-9) o Cédula sin puntos"
                                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-800 dark:text-slate-100"
                                            placeholder="12345678-9"
                                            value={formData.identification}
                                            onChange={(e) => setFormData({ ...formData, identification: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Teléfono</label>
                                        <input
                                            required
                                            type="tel"
                                            pattern="^(\+57\s?)?3[0-9]{2}\s?[0-9]{3}\s?[0-9]{4}$"
                                            title="Número celular de Colombia válido (ej. 300 123 4567 o +57 300 123 4567)"
                                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-800 dark:text-slate-100"
                                            placeholder="+57 300..."
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Correo Electrónico</label>
                                        <input
                                            type="email"
                                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-800 dark:text-slate-100"
                                            placeholder="juan@ejemplo.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Dirección</label>
                                        <input
                                            type="text"
                                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-800 dark:text-slate-100"
                                            placeholder="Calle 123 #45-67"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2"
                                    >
                                        <Save size={20} />
                                        {editingClient ? 'Guardar Cambios' : 'Registrar Cliente'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, client: null })}
                onConfirm={confirmDeleteClient}
                title="¿Eliminar Permanente?"
                message={`¿Estás seguro de eliminar permanentemente al cliente "${confirmDelete.client?.name}"? Esta acción borrará su información de la base de datos.`}
                confirmText="Sí, eliminar"
            />
        </div>
    );
};

export default Clients;
