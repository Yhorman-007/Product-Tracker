# Informe de Despliegue - Product Tracker

Este documento detalla la infraestructura y configuración del despliegue del sistema de gestión de inventario.

## Resumen del Proyecto
- **Nombre:** Product Tracker
- **Frontend:** React + Vite + TailwindCSS
- **Backend:** FastAPI + SQLAlchemy
- **Base de Datos:** PostgreSQL (Neon)

---

## Infraestructura de Despliegue

### 1. Backend (API)
- **Plataforma:** [Railway](https://railway.app/)
- **URL de Producción:** `https://product-tracker-production.up.railway.app`
- **Entorno de Ejecución:** Python 3.11.9
- **Entry Point:** `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 2. Base de Datos
- **Plataforma:** [Neon](https://neon.tech/)
- **Tipo:** PostgreSQL 16+
- **Región:** AWS US-East-1
- **Características:** Serverless, con soporte para SSL.

### 3. Frontend (Web App)
- **Plataforma:** Railway (Distribuido como contenido estático o contenedor)
- **CORS Configurado para:** `https://product-tracker-production.up.railway.app`

---

## Variables de Entorno (Producción)

| Variable | Descripción | Valor / Fuente |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión a Neon | Configurada en Railway |
| `SECRET_KEY` | Clave para firma de JWT | Configurada en Railway |
| `ALGORITHM` | Algoritmo de hashing | HS256 |
| `SMTP_USER` | Correo para notificaciones | Gmail |
| `SMTP_PASSWORD` | Contraseña de aplicación | Gmail App Password |

---

## Procedimiento de Actualización

1. **Backend:**
   - Los cambios subidos a la rama principal de GitHub se despliegan automáticamente en Railway.
   - Las migraciones de base de datos (SQLAlchemy) se ejecutan al iniciar el contenedor si el código incluye `Base.metadata.create_all(bind=engine)`.

2. **Frontend:**
   - El proceso de `npm run build` genera la carpeta `dist/`, la cual es servida por el servidor de producción.

---

## Contacto y Soporte
- **Desarrollador:** Yhorman Garcés
- **Fecha del último despliegue registrado:** 25 de marzo de 2026
