import React from 'react';
import { motion } from 'framer-motion';
import { Clock, User, Package, ShoppingCart, RefreshCcw, Archive, Trash2, PlusCircle } from 'lucide-react';

const actionIcons = {
    'crear': <PlusCircle className="w-4 h-4 text-emerald-500" />,
    'actualizar': <RefreshCcw className="w-4 h-4 text-blue-500" />,
    'eliminar': <Trash2 className="w-4 h-4 text-red-500" />,
    'archivar': <Archive className="w-4 h-4 text-amber-500" />,
    'desarchivar': <Package className="w-4 h-4 text-emerald-500" />,
    'recibir': <Package className="w-4 h-4 text-primary" />,
    'venta': <ShoppingCart className="w-4 h-4 text-purple-500" />
};

const AuditTimeline = ({ logs }) => {
    if (!logs || logs.length === 0) {
        return (
            <div className="text-center py-8 text-slate-400 italic">
                No hay movimientos registrados
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {logs.map((log, index) => (
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={log.id}
                    className="flex gap-4 relative"
                >
                    {/* Line Connector */}
                    {index !== logs.length - 1 && (
                        <div className="absolute left-[17px] top-9 bottom-[-24px] w-0.5 bg-slate-100 dark:bg-slate-800" />
                    )}

                    {/* Icon Circle */}
                    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center relative z-10">
                        {actionIcons[log.action] || <Clock className="w-4 h-4 text-slate-400" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                                {log.action === 'crear' ? 'Creación' :
                                    log.action === 'actualizar' ? 'Actualización' :
                                        log.action === 'eliminar' ? 'Eliminación' : log.action}
                            </h4>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded">
                                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2">
                            <User className="w-3 h-3" />
                            <span>Usuario ID: {log.user_id || 'Sistema'}</span>
                            <span className="mx-1">•</span>
                            <span>{new Date(log.created_at).toLocaleDateString()}</span>
                        </div>

                        {log.changes && (
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800/50">
                                {Object.entries(log.changes).map(([field, values]) => (
                                    <div key={field} className="text-xs mb-1 last:mb-0">
                                        <span className="font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter mr-2">{field}:</span>
                                        {typeof values === 'object' && values.old !== undefined ? (
                                            <span className="text-slate-500">
                                                <span className="line-through opacity-50 mr-1">{values.old}</span>
                                                <span className="text-primary font-bold">→ {values.new}</span>
                                            </span>
                                        ) : (
                                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                {JSON.stringify(values)}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default AuditTimeline;
