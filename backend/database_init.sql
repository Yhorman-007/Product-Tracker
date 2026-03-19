-- 1. Limpieza de tablas existentes (en orden inverso de dependencia)
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Tabla de Usuarios: Crea la tabla para almacenar los datos de acceso y roles de los usuarios del sistema.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    role VARCHAR(50) DEFAULT 'CAJERO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Proveedores: Crea la tabla que guarda la información de contacto y términos de pago de los proveedores.
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    payment_terms VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Productos: Crea la tabla principal del inventario con detalles de stock, precios y fechas de expiración.
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_stock INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
    price_purchase DECIMAL(12, 2) NOT NULL DEFAULT 0.0 CHECK (price_purchase >= 0),
    price_sale DECIMAL(12, 2) NOT NULL DEFAULT 0.0 CHECK (price_sale >= 0),
    unit VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    expiration_date DATE,
    supplier_id INTEGER REFERENCES suppliers(id),
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Ventas: Crea el registro cabecera de las ventas realizadas, incluyendo totales y métodos de pago.
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0.0 CHECK (total >= 0),
    discount DECIMAL(12, 2) NOT NULL DEFAULT 0.0 CHECK (discount >= 0),
    payment_method VARCHAR(50) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla de Items de Venta: Crea el detalle de cada venta, relacionando productos, cantidades y subtotales por transacción.
CREATE TABLE sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(12, 2) NOT NULL CHECK (subtotal >= 0)
);

-- 7. Tabla de Movimientos de Stock: Crea el historial de auditoría para entradas, salidas y ajustes de inventario.
CREATE TABLE stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    type VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reason VARCHAR(255),
    reference_type VARCHAR(50),
    reference_id INTEGER,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Índices
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);

-- 9. Datos Iniciales: Inserta un usuario maestro con rol ADMIN para asegurar el acceso inicial a la plataforma.
-- Contraseña por defecto: Admin2026! (hash Bcrypt generado)
INSERT INTO users (username, email, hashed_password, full_name, role)
VALUES ('Yhorman_Gar23', 'yhorman@producttracker.com', '$2b$12$R.S.eP9H.hVq9x3fGvPjZe5v5r.UqG.S.eP9H.hVq9x3fGvPjZe', 'Yhorman Garcia', 'ADMIN')
ON CONFLICT (username) DO NOTHING;

-- 3. Tabla de Proveedores: Crea la tabla que guarda la información de contacto y términos de pago de los proveedores.
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    payment_terms VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Productos
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_stock INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
    price_purchase DECIMAL(12, 2) NOT NULL DEFAULT 0.0 CHECK (price_purchase >= 0),
    price_sale DECIMAL(12, 2) NOT NULL DEFAULT 0.0 CHECK (price_sale >= 0),
    unit VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    expiration_date DATE,
    supplier_id INTEGER REFERENCES suppliers(id),
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Ventas: Crea el registro cabecera de las ventas realizadas, incluyendo totales y métodos de pago.
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0.0 CHECK (total >= 0),
    discount DECIMAL(12, 2) NOT NULL DEFAULT 0.0 CHECK (discount >= 0),
    payment_method VARCHAR(50) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla de Items de Venta
CREATE TABLE sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(12, 2) NOT NULL CHECK (subtotal >= 0)
);

-- 7. Tabla de Movimientos de Stock: Crea el historial de auditoría para entradas, salidas y ajustes de inventario.
CREATE TABLE stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    type VARCHAR(20) NOT NULL, -- entry, exit
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reason VARCHAR(255),
    reference_type VARCHAR(50), -- sale, purchase, manual
    reference_id INTEGER,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Índices para optimización
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);

-- 9. Datos Iniciales: Inserta un usuario maestro por defecto para desarrollo con privilegios de administrador.
-- La contraseña por defecto es 'admin123' (hash de ejemplo)
INSERT INTO users (username, email, hashed_password, full_name, is_admin)
VALUES ('admin', 'admin@producttracker.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGGa31lW', 'Administrator', TRUE)
ON CONFLICT (username) DO NOTHING;
