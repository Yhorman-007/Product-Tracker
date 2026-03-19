import React, { createContext, useContext, useState } from 'react';

const SearchContext = createContext();

export const useSearch = () => {
    const context = useContext(SearchContext);
    if (!context) {
        throw new Error('useSearch must be used within a SearchProvider');
    }
    return context;
};

// Proveedor general de búsqueda, utilizado por Sidebar para filtrar globalmente sin pasar prop-drilling
export const SearchProvider = ({ children }) => {
    // useState: Contiene el String tecleado por el usuario en el NavBar superior
    const [searchTerm, setSearchTerm] = useState('');

    return (
        <SearchContext.Provider value={{ searchTerm, setSearchTerm }}>
            {children}
        </SearchContext.Provider>
    );
};
