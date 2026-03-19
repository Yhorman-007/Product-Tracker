import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ShieldQuestion, Send, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { showNotification } = useNotification();

    const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const API_URL = RAW_API_URL.endsWith('/') ? RAW_API_URL.slice(0, -1) : RAW_API_URL;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            showNotification('Por favor ingrese su email', 'error');
            return;
        }
        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/password-recovery`, {
                email: email.trim()
            });
            // Buffer: let React finish current render cycle before flipping success state
            setTimeout(() => setSuccess(true), 150);
        } catch (error) {
            console.error('❌ [RECOVERY ERROR]:', error.response?.status, error.response?.data || error.message);
            showNotification(error.response?.data?.detail || 'Error al enviar correo', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ─── PURE CSS OVERLAY STRATEGY ────────────────────────────────────────────
    // ZERO conditional rendering.  Both cards live in the DOM at all times.
    // Visibility is controlled only through CSS opacity / pointerEvents.
    // No framer-motion, no AnimatePresence  →  removeChild is impossible here.
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 -right-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

            {/* Stable outer container – never removed from DOM */}
            <div className="w-full max-w-md relative z-10" style={{ minHeight: '480px' }}>

                {/* ══ SUCCESS OVERLAY ══════════════════════════════════════════ */}
                {/* Always in DOM. Shown by CSS when success=true.               */}
                <div
                    aria-hidden={!success}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        transition: 'opacity 0.35s ease, transform 0.35s ease',
                        opacity: success ? 1 : 0,
                        transform: success ? 'scale(1)' : 'scale(0.96)',
                        pointerEvents: success ? 'auto' : 'none',
                        zIndex: success ? 10 : -1,
                    }}
                >
                    <div className="glass-card rounded-[2.5rem] shadow-2xl p-10 text-center h-full flex flex-col justify-center">
                        {/* Check icon */}
                        <div className="inline-flex p-6 rounded-full bg-emerald-100 text-emerald-600 mb-8 border-8 border-emerald-50 mx-auto">
                            <CheckCircle2 className="w-14 h-14" />
                        </div>
                        <h1 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-3 tracking-tight">
                            ¡Correo Enviado!
                        </h1>
                        <p className="text-slate-600 dark:text-slate-300 mb-2 font-medium leading-relaxed">
                            Hemos enviado un enlace seguro a:
                        </p>
                        <p className="text-slate-900 dark:text-white font-black text-base mb-8 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-xl break-all mx-auto max-w-xs">
                            {email || '—'}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 font-medium">
                            Revisa tu bandeja de entrada y sigue las instrucciones para recuperar tu acceso.
                        </p>
                        {/* Manual navigation – no auto-redirect to avoid any unmounting glitch */}
                        <Link
                            to="/login"
                            className="w-full inline-flex items-center justify-center py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" /> Volver al Inicio de Sesión
                        </Link>
                    </div>
                </div>

                {/* ══ FORM CARD ════════════════════════════════════════════════ */}
                {/* Always in DOM. Hidden by CSS when success=true.              */}
                <div
                    aria-hidden={success}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        transition: 'opacity 0.35s ease, transform 0.35s ease',
                        opacity: success ? 0 : 1,
                        transform: success ? 'scale(0.96)' : 'scale(1)',
                        pointerEvents: success ? 'none' : 'auto',
                        zIndex: success ? -1 : 10,
                    }}
                >
                    <div className="glass-card rounded-[2.5rem] shadow-2xl p-10 h-full">
                        <div className="text-center mb-10">
                            <div className="inline-flex p-5 rounded-3xl bg-blue-600/10 text-blue-600 mb-6">
                                <ShieldQuestion className="w-10 h-10" />
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 leading-tight">Recuperar Acceso</h1>
                            <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed px-4">
                                Ingresa tu email para recibir un enlace de recuperación seguro.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">
                                    Email del Usuario
                                </label>
                                <div className="relative group">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                    <input
                                        type="email"
                                        required
                                        className="w-full pl-14 pr-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[1.5rem] focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all placeholder:text-slate-400 text-slate-900 dark:text-white"
                                        placeholder="tu@negocio.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* ── BUTTON: zero conditional renders ─────────────
                                Both spinner and text ALWAYS in the DOM.
                                CSS opacity switches which one is visible.       */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="relative w-full py-5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-[1.5rem] font-black shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center disabled:opacity-70 overflow-hidden"
                            >
                                {/* Spinner – always present, CSS toggled */}
                                <span
                                    style={{
                                        position: 'absolute',
                                        opacity: loading ? 1 : 0,
                                        transition: 'opacity 0.2s',
                                        pointerEvents: 'none',
                                    }}
                                >
                                    <span className="block w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                                </span>
                                {/* Label – always present, CSS toggled */}
                                <span
                                    className="flex items-center gap-3"
                                    style={{
                                        opacity: loading ? 0 : 1,
                                        transition: 'opacity 0.2s',
                                    }}
                                >
                                    Enviar Enlace Seguro <Send className="w-5 h-5" />
                                </span>
                            </button>
                        </form>

                        <div className="mt-10 text-center">
                            <Link to="/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-colors">
                                <ArrowLeft className="w-4 h-4" /> Volver al Login
                            </Link>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ForgotPassword;
