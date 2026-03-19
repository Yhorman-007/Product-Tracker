import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isDestructive = false
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="glass-card rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Decorative Background */}
                        <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 ${isDestructive ? 'bg-red-500' : 'bg-primary'}`} />

                        <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                            <div className={`p-4 rounded-2xl ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                                <AlertTriangle className="w-10 h-10" />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {title}
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">
                                    {message}
                                </p>
                            </div>

                            <div className="flex flex-col w-full gap-3 pt-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onConfirm}
                                    className={`w-full py-4 rounded-2xl font-bold transition-all shadow-lg ${isDestructive
                                            ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30'
                                            : 'bg-primary hover:bg-primary-hover text-white shadow-primary/30'
                                        }`}
                                >
                                    {confirmText}
                                </motion.button>
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                                >
                                    {cancelText}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmModal;
