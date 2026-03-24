import axios from 'axios';

// Configuración inicial de Axios con la URL base del backend
// Usamos VITE_API_URL si existe, si no usamos localhost.
const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_URL = `${rawApiUrl.replace(/\/+$/, '')}/api/`;

const api = axios.create({
    baseURL: API_URL,
});

// Este interceptor añade el token JWT a las cabeceras de cada petición saliente
// Add a request interceptor to include the JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Este interceptor captura errores 401 y 403 para redirigir al login si el token expira
// Add a response interceptor to handle errors (like 401 Unauthorized or 403 Forbidden)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            localStorage.removeItem('token');
            // Only redirect if NOT on the login page to avoid infinite loops or hangs during login attempts
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Fetchs relacionados con la autenticación y obtención del perfil de usuario
export const authApi = {
    login: async (username, password) => {
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);

        const response = await api.post('auth/login/access-token', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        return response.data;
    },
    getMe: async () => {
        const response = await api.get('users/me');
        return response.data;
    }
};

// Fetchs para el CRUD completo y alertas de los productos
export const productsApi = {
    getAll: (params) => api.get('products/', { params }),
    getById: (id) => api.get(`products/${id}`),
    create: (data) => api.post('products/', data),
    update: (id, data) => api.put(`products/${id}`, data),
    delete: (id) => api.delete(`products/${id}`),
    archive: (id) => api.patch(`products/${id}/archive`),
    getLowStock: () => api.get('products/alerts/low-stock'),
    getExpiring: () => api.get('products/alerts/expiring'),
};

// Fetchs para obtener los reportes y métricas del sistema
export const reportsApi = {
    getValuation: () => api.get('reports/valuation'),
    getSalesSummary: () => api.get('reports/sales-summary'),
    getTopProducts: () => api.get('reports/top-products'),
    getAlerts: () => api.get('reports/alerts'),
};

// Fetchs para gestionar los proveedores del sistema
export const suppliersApi = {
    getAll: () => api.get('suppliers/'),
    create: (data) => api.post('suppliers/', data),
    update: (id, data) => api.put(`suppliers/${id}`, data),
    delete: (id) => api.delete(`suppliers/${id}`),

    // Catalogue Management
    getCatalogue: (id) => api.get(`suppliers/${id}/catalogue`),
    addToCatalogue: (id, item) => api.post(`suppliers/${id}/catalogue`, item),
    removeFromCatalogue: (id, productId) => api.delete(`suppliers/${id}/catalogue/${productId}`),
};

// Fetchs para gestionar el registro de ventas
export const salesApi = {
    getAll: () => api.get('sales/'),
    create: (data) => api.post('sales/', data),
};

// Fetchs para obtener y crear movimientos de inventario (Stock)
export const stockApi = {
    getAll: (params) => api.get('stock-movements/', { params }),
    getByProductId: (productId) => api.get(`stock-movements/${productId}`),
    createMovement: (data) => api.post('stock-movements/', data),
};

// Fetchs para el manejo de las órdenes de compra a proveedores
export const purchaseOrdersApi = {
    getAll: (params) => api.get('purchase-orders/', { params }),
    create: (data) => api.post('purchase-orders/', data),
    receive: (id, data) => api.patch(`purchase-orders/${id}/receive`, data),
    togglePayment: (id) => api.patch(`purchase-orders/${id}/toggle-payment`),
    delete: (id) => api.delete(`purchase-orders/${id}`),
};

// Fetchs para visualizar el registro de actividad (Auditoría)
export const auditLogsApi = {
    getAll: () => api.get('audit-logs/'),
    getByEntity: (entity, entityId) => api.get('audit-logs/', { params: { entity, entity_id: entityId } }),
};

// Fetchs para el CRUD de clientes
export const clientsApi = {
    getAll: () => api.get('clients/'),
    getById: (id) => api.get(`clients/${id}`),
    create: (data) => api.post('clients/', data),
    update: (id, data) => api.put(`clients/${id}`, data),
    delete: (id) => api.delete(`clients/${id}`),
};

// Fetchs para registrar devoluciones de productos
export const returnsApi = {
    getAll: () => api.get('returns/'),
    create: (data) => api.post('returns/', data),
};

export default api;
