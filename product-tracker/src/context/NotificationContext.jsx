import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Toast from '../components/ui/Toast';

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

// Proveedor global para gestionar el lanzamiento de notificaciones dinámicas emergentes (Toasts)
export const NotificationProvider = ({ children }) => {
    // useState: Arreglo de notificaciones actualmente activas en pantalla
    const [notifications, setNotifications] = useState([]);

    // useCallback: Función memorizada para agregar alertas, que cuenta con auto-eliminación temporal (5s)
    const showNotification = useCallback((message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    }, []);

    // useCallback: Permite quitar un toast manualmente antes del timeout
    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3">
                {/* AnimatePresence REQUIRED: coordinates framer-motion exit animations */}
                {/* Without it, React removes the DOM node before the animation finishes = removeChild error */}
                <AnimatePresence mode="popLayout">
                    {notifications.map(n => (
                        <Toast
                            key={n.id}
                            message={n.message}
                            type={n.type}
                            onClose={() => removeNotification(n.id)}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </NotificationContext.Provider>
    );
};
