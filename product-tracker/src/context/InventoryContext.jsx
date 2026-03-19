import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { createAuditLog } from '../utils/auditLogger';
import { showLowStockNotification, showExpirationNotification } from '../utils/notifications';
import { productsApi, reportsApi, suppliersApi, salesApi, stockApi, purchaseOrdersApi, auditLogsApi, clientsApi, returnsApi } from '../services/api';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import { useSearch } from './SearchContext';

const InventoryContext = createContext();

export const useInventory = () => {
    const context = useContext(InventoryContext);
    if (!context) {
        throw new Error('useInventory must be used within an InventoryProvider');
    }
    return context;
};

// Proveedor massivo del inventario: Mantiene estado sincronizado global de productos, ventas y compras
export const InventoryProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const { showNotification } = useNotification();
    // useState: Define listas clave recuperadas del backend para manipulación general
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [cart, setCart] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [stockMovements, setStockMovements] = useState([]);
    const [locations, setLocations] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [clients, setClients] = useState([]);
    const [returns, setReturns] = useState([]);
    const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
    const [loading, setLoading] = useState(false);
    const [topProducts, setTopProducts] = useState([]);
    const { searchTerm } = useSearch();
    const [stats, setStats] = useState({
        totalStockValue: 0,
        totalCostValue: 0,
        totalSaleValue: 0,
        potentialProfit: 0,
        netProfit: 0,
        dailySalesTotal: 0,
        totalSales: 0,
        totalUnitsSold: 0,
        averageSale: 0
    });

    const filteredProducts = useMemo(() => {
        const term = (searchTerm || '').trim().toLowerCase();
        return products.filter(p =>
            !term ||
            (p.name || '').toLowerCase().includes(term) ||
            (p.sku || '').toLowerCase().includes(term)
        );
    }, [products, searchTerm]);

    // Fetch general: Recupera TODOS los datos paralelos desde el backend para reducir esperas
    // Fetch initial data from API
    const refreshData = async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const [prodRes, suppliersRes, valuationRes, salesRes, poRes, salesListRes, topProductsRes, auditRes, clientsRes, returnsRes] = await Promise.all([
                productsApi.getAll(),
                suppliersApi.getAll(),
                reportsApi.getValuation(),
                reportsApi.getSalesSummary(),
                purchaseOrdersApi.getAll().catch(() => ({ data: [] })),
                salesApi.getAll().catch(() => ({ data: [] })),
                reportsApi.getTopProducts().catch(() => ({ data: [] })),
                auditLogsApi.getAll().catch(() => ({ data: [] })),
                clientsApi.getAll().catch(() => ({ data: [] })),
                returnsApi.getAll().catch(() => ({ data: [] }))
            ]);

            setProducts(prodRes.data || []);
            setSuppliers(suppliersRes.data || []);
            setPurchaseOrders(poRes.data || []);
            setSales(salesListRes.data || []);
            setTopProducts(topProductsRes.data || []);
            setAuditLogs(auditRes.data || []);
            setClients(clientsRes.data || []);
            setReturns(returnsRes.data || []);
            setStats({
                totalStockValue: valuationRes.data?.total_cost_value || 0,
                totalCostValue: valuationRes.data?.total_cost_value || 0,
                totalSaleValue: valuationRes.data?.total_sale_value || 0,
                potentialProfit: valuationRes.data?.total_potential_profit || 0,
                netProfit: salesRes.data?.net_profit || 0,
                dailySalesTotal: salesRes.data?.daily_revenue || 0,
                totalSales: salesRes.data?.total_sales || 0,
                totalUnitsSold: salesRes.data?.total_units_sold || 0,
                averageSale: salesRes.data?.average_sale || 0
            });

        } catch (error) {
            console.error('Error fetching inventory data:', error);
        } finally {
            setLoading(false);
        }
    };

    // useEffect: Monitorea e invoca refreshData solo cuando el usuario se autentica
    useEffect(() => {
        refreshData();
    }, [isAuthenticated]);

    // useEffect: Escuchador nativo para actualizar si hay pérdida de internet (offline)
    // Monitor online/offline status
    useEffect(() => {
        const handleOnline = () => setOnlineStatus(true);
        const handleOffline = () => setOnlineStatus(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // useEffect: Iterador que lanza notificaciones al momento si el stock cae a alerta roja
    // Monitor low stock and send notifications
    useEffect(() => {
        products.forEach(product => {
            if (!product.archived && product.stock <= product.min_stock) {
                showLowStockNotification(product);
            }
        });
    }, [products]);

    // Lógica para estructurar alarmas de inventario usando información cacheada de productos
    // Alerts Logic (RF17/24)
    const alerts = useMemo(() => {
        const activeProducts = products.filter(p => !p.archived);
        // Use the configurable threshold from Settings (default 5)
        const businessConfig = JSON.parse(localStorage.getItem('businessConfig') || '{}');
        const globalThreshold = parseInt(businessConfig.lowStockThreshold || '5', 10);
        const lowStock = activeProducts.filter(p => p.stock <= p.min_stock || p.stock <= globalThreshold);
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        const expiringSoon = activeProducts.filter(p => {
            if (!p.expiration_date) return false;
            const expDate = new Date(p.expiration_date);
            return expDate <= thirtyDaysFromNow && expDate >= today;
        });

        return { lowStock, expiringSoon };
    }, [products]);

    // Helper to keep audit list in sync after actions without reloading everything
    const refreshAuditLogs = async () => {
        try {
            const auditRes = await auditLogsApi.getAll();
            setAuditLogs(auditRes.data || []);
        } catch (error) {
            console.error('Error refreshing audit logs:', error);
        }
    };

    // Gross Profit Calculation (RF08)
    const calculateGrossProfit = (purchasePrice, salePrice) => {
        if (!purchasePrice || !salePrice) return 0;
        return Math.round(parseFloat(salePrice) - parseFloat(purchasePrice));
    };

    // Fetch de Múltiples Operaciones relacionadas al CRUD y manipulaciones
    // Product Operations
    const addProduct = async (product) => {
        try {
            const response = await productsApi.create(product);
            setProducts(prev => [...prev, response.data]);
            showNotification(`Producto "${response.data.name}" creado con éxito`, 'success');
            refreshAuditLogs();
            return response.data;
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    };

    const updateProduct = async (id, updates) => {
        try {
            const response = await productsApi.update(id, updates);
            setProducts(prev => prev.map(p => p.id === id ? response.data : p));
            showNotification('Cambios guardados correctamente', 'success');
            refreshAuditLogs();
            return response.data;
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    };

    const deleteProduct = async (id) => {
        try {
            await productsApi.delete(id);
            setProducts(prev => prev.filter(p => p.id !== id));
            showNotification('Producto eliminado permanentemente', 'success');
            refreshAuditLogs();
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error; // Propagate error to the component
        }
    };

    const archiveProduct = async (id) => {
        try {
            const response = await productsApi.archive(id);
            setProducts(prev => prev.map(p => p.id === id ? response.data : p));
            showNotification(`Producto ${response.data.archived ? 'archivado' : 'restaurado'}`, 'info');
            refreshAuditLogs();
        } catch (error) {
            console.error('Error archiving product:', error);
            throw error;
        }
    };

    // ... (rest of functions like Stock movements, Sales etc. would follow same pattern)
    // For now keeping them as local mock to avoid breaking UI if backend routes aren't complete

    // Stock Movement Operations (RF09, RF10, RF11)
    const fetchProductMovements = async (productId) => {
        try {
            const response = await stockApi.getByProductId(productId);
            return response.data;
        } catch (error) {
            console.error('Error fetching product movements:', error);
            throw error;
        }
    };

    const fetchAllStockMovements = async () => {
        try {
            const response = await stockApi.getAll();
            return response.data;
        } catch (error) {
            console.error('Error fetching all movements:', error);
            throw error;
        }
    };

    const createStockMovement = async (movement) => {
        try {
            const response = await stockApi.createMovement(movement);
            setStockMovements(prev => [response.data, ...prev]);
            // Refresh everything (products, stats, etc.)
            await refreshData();
            return response.data;
        } catch (error) {
            console.error('Error creating stock movement:', error);
            throw error;
        }
    };

    const addSupplier = async (supplier) => {
        try {
            const response = await suppliersApi.create(supplier);
            setSuppliers(prev => [...prev, response.data]);
            showNotification(`Proveedor "${response.data.name}" registrado con éxito`, 'success');
            refreshAuditLogs();
            return response.data;
        } catch (error) {
            console.error('Error adding supplier:', error);
            throw error;
        }
    };

    const updateSupplier = async (id, updates) => {
        try {
            const response = await suppliersApi.update(id, updates);
            setSuppliers(prev => prev.map(s => s.id === id ? response.data : s));
            showNotification('Proveedor actualizado correctamente', 'success');
            refreshAuditLogs();
            return response.data;
        } catch (error) {
            console.error('Error updating supplier:', error);
            throw error;
        }
    };

    const deleteSupplier = async (id) => {
        try {
            await suppliersApi.delete(id);
            setSuppliers(prev => prev.filter(s => s.id !== id));
            showNotification('Proveedor eliminado del sistema', 'success');
            refreshAuditLogs();
        } catch (error) {
            console.error('Error deleting supplier:', error);
            throw error;
        }
    };

    // Client Operations (RF47)
    const addClient = async (client) => {
        try {
            const response = await clientsApi.create(client);
            setClients(prev => [...prev, response.data]);
            showNotification(`Cliente "${response.data.name}" registrado`, 'success');
            refreshAuditLogs();
            return response.data;
        } catch (error) {
            console.error('Error adding client:', error);
            throw error;
        }
    };

    const updateClient = async (id, updates) => {
        try {
            const response = await clientsApi.update(id, updates);
            setClients(prev => prev.map(c => c.id === id ? response.data : c));
            showNotification('Cliente actualizado correctamente', 'success');
            refreshAuditLogs();
            return response.data;
        } catch (error) {
            console.error('Error updating client:', error);
            throw error;
        }
    };

    const deleteClient = async (id) => {
        try {
            await clientsApi.delete(id);
            setClients(prev => prev.filter(c => c.id !== id));
            showNotification('Cliente eliminado', 'info');
            refreshAuditLogs();
        } catch (error) {
            console.error('Error deleting client:', error);
            throw error;
        }
    };

    // Return Operations (RF48)
    const createReturn = async (returnData) => {
        try {
            const response = await returnsApi.create(returnData);
            setReturns(prev => [response.data, ...prev]);
            showNotification('Devolución procesada correctamente', 'success');
            await refreshData();
            return response.data;
        } catch (error) {
            console.error('Error creating return:', error);
            throw error;
        }
    };

    const createPurchaseOrder = async (po) => {
        try {
            const response = await purchaseOrdersApi.create(po);
            setPurchaseOrders(prev => [response.data, ...prev]);
            showNotification('Orden de compra creada', 'success');
            await refreshData();
            return response.data;
        } catch (error) {
            console.error('Error creating purchase order:', error);
            showNotification(error.response?.data?.detail || 'Error al crear orden', 'error');
            throw error;
        }
    };

    // Catalogue operations
    const getSupplierCatalogue = async (supplierId) => {
        try {
            const response = await suppliersApi.getCatalogue(supplierId);
            return response.data;
        } catch (error) {
            console.error('Error fetching catalogue:', error);
            throw error;
        }
    };

    const addToCatalogue = async (supplierId, item) => {
        try {
            const response = await suppliersApi.addToCatalogue(supplierId, item);
            await refreshData();
            showNotification('Catálogo actualizado', 'success');
            return response.data;
        } catch (error) {
            console.error('Error adding to catalogue:', error);
            showNotification('Error al actualizar catálogo', 'error');
            throw error;
        }
    };

    const removeFromCatalogue = async (supplierId, productId) => {
        try {
            await suppliersApi.removeFromCatalogue(supplierId, productId);
            await refreshData();
            showNotification('Producto removido del catálogo', 'info');
        } catch (error) {
            console.error('Error removing from catalogue:', error);
            showNotification('Error al remover del catálogo', 'error');
            throw error;
        }
    };

    const receivePurchaseOrder = async (id, receptionData) => {
        try {
            const response = await purchaseOrdersApi.receive(id, receptionData);
            setPurchaseOrders(prev => prev.map(p => p.id === id ? response.data : p));
            showNotification('Orden marcada como recibida. Stock actualizado.', 'success');
            await refreshData();
            return response.data;
        } catch (error) {
            console.error('Error receiving purchase order:', error);
            showNotification(error.response?.data?.detail || 'Error al recibir orden', 'error');
            throw error;
        }
    };

    const deletePurchaseOrder = async (id) => {
        try {
            await purchaseOrdersApi.delete(id);
            setPurchaseOrders(prev => prev.filter(p => p.id !== id));
            showNotification('Orden de compra eliminada', 'info');
        } catch (error) {
            console.error('Error deleting purchase order:', error);
            showNotification('Error al eliminar orden de compra', 'error');
            throw error;
        }
    };
    const togglePOPayment = async (id) => {
        try {
            const response = await purchaseOrdersApi.togglePayment(id);
            setPurchaseOrders(prev => prev.map(p => p.id === id ? response.data : p));
            showNotification(`Estado de pago actualizado para OC-${id}`, 'success');
            return response.data;
        } catch (error) {
            console.error('Error toggling PO payment:', error);
            showNotification('Error al actualizar estado de pago', 'error');
            throw error;
        }
    };

    const addToCart = (product) => {
        if (product.stock <= 0) {
            showNotification(`No hay stock disponible de ${product.name}`, 'warning');
            return;
        }

        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                if (existing.qty + 1 > product.stock) {
                    showNotification(`No puedes agregar más de ${product.stock} unidades de ${product.name}`, 'warning');
                    return prev;
                }
                return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
            }
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const removeFromCart = (productId) => setCart(prev => prev.filter(item => item.id !== productId));

    const updateCartQty = (productId, qty) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        if (qty > product.stock) {
            showNotification(`Stock insuficiente: Solo quedan ${product.stock} unidades`, 'warning');
            return;
        }

        if (qty <= 0) {
            removeFromCart(productId);
            return;
        }

        setCart(prev => prev.map(item => item.id === productId ? { ...item, qty } : item));
    };
    const clearCart = () => setCart([]);

    // Fetch para concluir una venta definitiva empujando datos de checkout (carrito) hacia el backend
    const completeSale = async (total, discount, paymentMethod, taxRate = 0, taxAmount = 0, clientId = null) => {
        const saleData = {
            total,
            discount,
            payment_method: paymentMethod,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            client_id: clientId,
            items: cart.map(item => ({
                product_id: item.id,
                quantity: item.qty,
                unit_price: item.price_sale
            }))
        };

        try {
            const response = await salesApi.create(saleData);
            setSales(prev => [response.data, ...prev]);
            clearCart();
            await refreshData(); // Refresh everything to update stock and stats
            return response.data;
        } catch (error) {
            console.error('Error completing sale:', error);
            throw error;
        }
    };

    return (
        <InventoryContext.Provider value={{
            products, addProduct, updateProduct, deleteProduct, archiveProduct,
            sales, cart, addToCart, removeFromCart, updateCartQty, clearCart, completeSale,
            suppliers, addSupplier, updateSupplier, deleteSupplier,
            purchaseOrders, createPurchaseOrder, receivePurchaseOrder, deletePurchaseOrder, togglePOPayment,
            getSupplierCatalogue, addToCatalogue, removeFromCatalogue,
            stockMovements, createStockMovement, fetchProductMovements, fetchAllStockMovements,
            locations, auditLogs, alerts, calculateGrossProfit,
            clients, addClient, updateClient, deleteClient,
            returns, createReturn,
            totalStockValue: stats.totalStockValue,
            dailySalesTotal: stats.dailySalesTotal,
            totalUnitsSold: stats.totalUnitsSold,
            topProducts,
            filteredProducts,
            stats,
            isOnline: onlineStatus, loading, refreshData
        }}>
            {children}
        </InventoryContext.Provider>
    );
};
