import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, User, ArrowRight, Building2 } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';

const Signup = () => {
    const [formData, setFormData] = useState({
        organization_name: '',
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            showNotification('Las contraseñas no coinciden', 'error');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            showNotification('Ingresa un correo válido', 'error');
            return;
        }
        if (!formData.organization_name.trim()) {
            showNotification('Ingresa el nombre de tu empresa', 'error');
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.post(`${API_URL}/api/auth/signup`, {
                organization_name: formData.organization_name,
                username: formData.username,
                email: formData.email,
                full_name: formData.full_name,
                password: formData.password
            });
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            showNotification(`¡Bienvenido a ${data.organization_name}!`, 'success');
            navigate('/app');
        } catch (error) {
            showNotification(error.response?.data?.detail || 'Error al registrarse', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden login-bg">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
                <div className="login-card rounded-3xl p-8 border border-white/10 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="inline-flex p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-4">
                            <UserPlus className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Crear tu tienda</h1>
                        <p className="text-slate-500 dark:text-emerald-200/70 mt-2">14 días de prueba gratis</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 ml-1">Nombre de la empresa</label>
                            <div className="relative group">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="text" required className="login-input w-full pl-12 pr-4 py-3 rounded-2xl outline-none"
                                    placeholder="Mi Tienda SAS" value={formData.organization_name}
                                    onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 ml-1">Nombre completo</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="text" required className="login-input w-full pl-12 pr-4 py-3 rounded-2xl outline-none"
                                    value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 ml-1">Usuario</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="text" required className="login-input w-full pl-12 pr-4 py-3 rounded-2xl outline-none"
                                    value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 ml-1">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="email" required className="login-input w-full pl-12 pr-4 py-3 rounded-2xl outline-none"
                                    value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 ml-1">Contraseña</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="password" required className="login-input w-full pl-12 pr-4 py-3 rounded-2xl outline-none"
                                    value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 ml-1">Confirmar contraseña</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="password" required className="login-input w-full pl-12 pr-4 py-3 rounded-2xl outline-none"
                                    value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} />
                            </div>
                        </div>
                        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} type="submit" disabled={loading}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-70">
                            {loading ? 'Procesando...' : 'Crear cuenta'} <ArrowRight className="w-5 h-5" />
                        </motion.button>
                    </form>
                    <div className="mt-8 text-center text-slate-500">
                        ¿Ya tienes cuenta? <Link to="/login" className="text-emerald-500 font-bold hover:underline">Inicia sesión</Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Signup;
