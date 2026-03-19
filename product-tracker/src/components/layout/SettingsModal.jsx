import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Building2, Percent, Phone, MapPin, Hash, AlertTriangle } from 'lucide-react';

const SettingsModal = ({ isOpen, onClose }) => {
    const [config, setConfig] = useState({
        businessName: 'Product Tracker',
        nit: '',
        phone: '',
        address: '',
        iva: 19
    });

    // Load initial configuration
    useEffect(() => {
        if (!isOpen) return;
        const saved = localStorage.getItem('businessConfig');
        if (saved) {
            setConfig(JSON.parse(saved));
        } else {
            const oldTax = localStorage.getItem('taxConfig');
            if (oldTax) {
                const parsedOld = JSON.parse(oldTax);
                setConfig(prev => ({ ...prev, iva: parsedOld.iva || 19 }));
            }
        }
    }, [isOpen]);

    const handleSave = (e) => {
        if (e) e.preventDefault();
        localStorage.setItem('businessConfig', JSON.stringify(config));
        localStorage.setItem('taxConfig', JSON.stringify({ iva: config.iva }));
        window.dispatchEvent(new Event('storage'));
        onClose();
    };

    const inputClass = "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400";
    const labelClass = "block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-1 flex items-center gap-2";

    // Use Portal to ensure it renders outside the Header's fixed container
    return createPortal(
        <AnimatePresence mode="wait">
            {isOpen && (
                <div
                    key="settings-modal-overlay"
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-12 overflow-hidden"
                >
                    {/* Dark Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
                        onClick={onClose}
                    />

                    {/* Modal Window */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-[2.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.7)] border border-white/20 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Premium Header - Simplified */}
                        <div className="shrink-0 p-8 sm:p-10 bg-gradient-to-br from-emerald-600 to-indigo-800 text-white relative">
                            {/* Decorative elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-[60px] translate-x-10 -translate-y-10" />

                            <div className="flex justify-between items-center relative z-10">
                                <div>
                                    <h3 className="text-3xl sm:text-4xl font-black tracking-tighter leading-none">
                                        Configuración
                                    </h3>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-3 hover:bg-white/20 rounded-2xl transition-all active:scale-90"
                                >
                                    <X className="w-6 h-6 text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Main Form Content */}
                        <div className="flex-1 overflow-y-auto p-8 sm:p-12 custom-scrollbar bg-white dark:bg-[#0f172a]">
                            <form id="settings-form" onSubmit={handleSave}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="md:col-span-2">
                                        <label className={labelClass}><Building2 className="w-4 h-4 text-emerald-500" /> Razón Social / Empresa</label>
                                        <input
                                            value={config.businessName}
                                            onChange={e => setConfig({ ...config, businessName: e.target.value })}
                                            className={inputClass}
                                            placeholder="Ej. Mi Tienda Increíble"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass}><Hash className="w-4 h-4 text-blue-500" /> NIT / Documento</label>
                                        <input
                                            value={config.nit}
                                            onChange={e => setConfig({ ...config, nit: e.target.value })}
                                            className={inputClass}
                                            placeholder="900.000.000-1"
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass}><Percent className="w-4 h-4 text-orange-500" /> IVA Base (%)</label>
                                        <input
                                            type="number"
                                            value={config.iva}
                                            onChange={e => setConfig({ ...config, iva: parseFloat(e.target.value) || 0 })}
                                            className={inputClass}
                                            placeholder="19"
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass}><Phone className="w-4 h-4 text-emerald-500" /> Línea de Contacto</label>
                                        <input
                                            value={config.phone}
                                            onChange={e => setConfig({ ...config, phone: e.target.value })}
                                            className={inputClass}
                                            placeholder="+57 321 000 0000"
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass}><MapPin className="w-4 h-4 text-red-500" /> Dirección Principal</label>
                                        <input
                                            value={config.address}
                                            onChange={e => setConfig({ ...config, address: e.target.value })}
                                            className={inputClass}
                                            placeholder="Calle, Ciudad"
                                        />
                                    </div>

                                    <div className="md:col-span-2 p-4 bg-orange-500/5 dark:bg-orange-500/10 rounded-2xl border border-orange-500/20">
                                        <label className={labelClass}><AlertTriangle className="w-4 h-4 text-orange-500" /> Umbral Global de Stock Bajo</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="number"
                                                value={config.lowStockThreshold || 5}
                                                onChange={e => setConfig({ ...config, lowStockThreshold: parseInt(e.target.value) || 0 })}
                                                className={`${inputClass} !bg-white dark:!bg-slate-900`}
                                                placeholder="5"
                                                min="0"
                                            />
                                            <p className="text-[10px] text-slate-500 font-medium leading-tight">
                                                Este valor se usará para alertar si el stock cae por debajo de esta cantidad, incluso si el producto no tiene un mínimo específico configurado.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 p-8 sm:p-10 border-t border-slate-100 dark:border-white/10 flex gap-6 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-5 px-8 bg-slate-200/50 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-3xl font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95"
                            >
                                Descartar
                            </button>
                            <button
                                type="submit"
                                form="settings-form"
                                className="flex-[2] py-5 px-8 bg-gradient-to-r from-emerald-500 to-indigo-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-4 active:scale-95 hover:brightness-110"
                            >
                                <Save className="w-6 h-6" /> Guardar Cambios
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default SettingsModal;
