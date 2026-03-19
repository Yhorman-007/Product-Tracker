import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};

// Proveedor del tema visual de la UI que alterna e inyecta la clase correspondiente en Tailwind
export const ThemeProvider = ({ children }) => {
    // useState: Lee la preferencia (light o dark) guardada desde LocalStorage antes de cargar
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

    // useEffect: Sincroniza la etiqueta <html> del DOM inyectando o depurando la clase .dark
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Función sencilla que intercambia el tema para generar el renderizado
    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
