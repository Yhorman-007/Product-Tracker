import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
};

const styles = {
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-emerald-500/10',
    error: 'bg-red-500/10 border-red-500/20 text-red-500 shadow-red-500/10',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-amber-500/10',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-500 shadow-blue-500/10'
};

const Toast = ({ message, type = 'info', onClose }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20, y: 0, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`flex items-center gap-4 p-5 rounded-2xl border backdrop-blur-xl shadow-2xl min-w-[320px] max-w-md ${styles[type]} relative overflow-hidden`}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />
            <div className="flex-shrink-0 relative z-10">
                {icons[type]}
            </div>
            <p className="flex-1 text-sm font-bold relative z-10">{message}</p>
            <button
                onClick={onClose}
                className="p-1 hover:bg-black/5 rounded-lg transition-colors relative z-10"
            >
                <X className="w-4 h-4 opacity-50" />
            </button>

            {/* Progress Bar */}
            <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 5, ease: "linear" }}
                className={`absolute bottom-0 left-0 right-0 h-1 origin-left ${type === 'success' ? 'bg-emerald-500' :
                        type === 'error' ? 'bg-red-500' :
                            type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
            />
        </motion.div>
    );
};

export default Toast;
