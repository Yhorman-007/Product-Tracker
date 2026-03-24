import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, User, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';

// Vista Signup: Formulario público para registro inmediato de nuevos usuarios
const Signup = () => {
    // useState: Guarda un modelo de datos agrupado con nombre, email, y contraseñas
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        full_name: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const API_URL = rawApiUrl.replace(/\/+$/, '');

    // Fetch: Valida formulario y ejecuta llamado POST directo contra la capa de autenticación del backend
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            showNotification('Las contraseñas no coinciden', 'error');
            return;
        }

        // Basic strict email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            showNotification('Ingresa un correo válido (ej: usuario@gmail.com)', 'error');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/signup`, {
                username: formData.username,
                email: formData.email,
                full_name: formData.full_name,
                password: formData.password
            });
            showNotification('Registro exitoso. Ahora puedes iniciar sesión.', 'success');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (error) {
            showNotification(error.response?.data?.detail || 'Error al registrarse', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden login-bg">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="login-card rounded-3xl p-8 border border-white/10 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="inline-flex p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-4">
                            <UserPlus className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Crear Cuenta</h1>
                        <p className="text-slate-500 dark:text-emerald-200/70 mt-2">Únete a Product Tracker</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 ml-1">Nombre Completo</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    type="text"
                                    required
                                    className="login-input w-full pl-12 pr-4 py-3 rounded-2xl outline-none transition-all"
                                    placeholder="Tu nombre"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 ml-1">Usuario</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    type="text"
                                    required
                                    className="login-input w-full pl-12 pr-4 py-3 rounded-2xl outline-none transition-all"
                                    placeholder="nombre_usuario"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 ml-1">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    className="login-input w-full pl-12 pr-4 py-3 rounded-2xl outline-none transition-all"
                                    placeholder="ejemplo@correo.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 ml-1">Contraseña</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    className="login-input w-full pl-12 pr-4 py-3 rounded-2xl outline-none transition-all"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 ml-1">Confirmar Contraseña</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    className="login-input w-full pl-12 pr-4 py-3 rounded-2xl outline-none transition-all"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                />
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
                        >
                            {loading ? 'Procesando...' : 'Registrarse'}
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </motion.button>
                    </form>

                    <div className="mt-8 text-center text-slate-500 dark:text-emerald-200/50">
                        ¿Ya tienes cuenta?{' '}
                        <Link to="/login" className="text-emerald-500 font-bold hover:underline">
                            Inicia Sesión
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Signup;
