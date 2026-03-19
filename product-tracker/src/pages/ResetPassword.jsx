import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, ArrowRight, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const { showNotification } = useNotification();

    const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [countdown, setCountdown] = useState(5);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    // Cleanup ref: prevents setState on unmounted component
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // Countdown + auto-redirect after success
    useEffect(() => {
        if (!success) return;
        if (countdown <= 0) {
            navigate('/login');
            return;
        }
        const t = setTimeout(() => {
            if (mountedRef.current) setCountdown(c => c - 1);
        }, 1000);
        return () => clearTimeout(t); // cleanup on each re-run
    }, [success, countdown, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            showNotification('Las claves no coinciden', 'error');
            return;
        }
        if (formData.password.length < 6) {
            showNotification('La clave debe tener al menos 6 caracteres', 'error');
            return;
        }
        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/reset-password`, {
                token: token,
                new_password: formData.password
            });
            // Buffer: let React settle before flipping success state
            setTimeout(() => {
                if (mountedRef.current) setSuccess(true);
            }, 150);
        } catch (error) {
            console.error("❌ [RESET ERROR]:", error);
            showNotification(error.response?.data?.detail || 'Error al restablecer clave', 'error');
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center border border-red-100">
                    <div className="inline-flex p-4 rounded-full bg-red-100 text-red-600 mb-6 mx-auto">
                        <AlertCircle className="w-12 h-12" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-4">Enlace Inválido</h1>
                    <p className="text-slate-500 mb-8 font-medium">El enlace es inválido o ha expirado.</p>
                    <Link to="/forgot-password" className="text-blue-600 font-bold hover:underline">
                        Solicitar nuevo enlace
                    </Link>
                </div>
            </div>
        );
    }

    const progressPct = (countdown / 5) * 100;

    // ─── PURE CSS OVERLAY STRATEGY ────────────────────────────────────────────
    // ZERO conditional rendering.  Both cards live in the DOM at all times.
    // Visibility is controlled only through CSS opacity / pointerEvents.
    // No framer-motion, no AnimatePresence  →  removeChild is impossible here.
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 -right-10 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />

            {/* Stable outer container – never removed from DOM */}
            <div className="w-full max-w-md relative z-10" style={{ minHeight: '520px' }}>

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
                            ¡Contraseña Actualizada!
                        </h1>
                        <p className="text-slate-600 dark:text-slate-300 mb-8 font-medium leading-relaxed">
                            Tu contraseña ha sido actualizada. Ya puedes acceder con tu nueva clave.
                        </p>

                        {/* Countdown – pure CSS progress bar, no framer-motion */}
                        <div className="mb-6">
                            <p className="text-slate-400 text-sm font-medium mb-3">
                                Redirigiendo en <span className="font-black text-indigo-600">{countdown}s</span>...
                            </p>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-indigo-600 h-2 rounded-full transition-all duration-1000 ease-linear"
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                        </div>

                        {/* Manual navigation button – no auto-route-change before click */}
                        <Link
                            to="/login"
                            className="w-full inline-flex items-center justify-center py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors gap-2"
                        >
                            <ArrowRight className="w-4 h-4" /> Ir al Login ahora
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
                    <div className="glass-card rounded-[2.5rem] shadow-2xl p-10 h-full overflow-y-auto">
                        <div className="text-center mb-10">
                            <div className="inline-flex p-5 rounded-3xl bg-indigo-600/10 text-indigo-600 mb-6">
                                <ShieldCheck className="w-10 h-10" />
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 leading-tight">Nueva Clave</h1>
                            <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed px-4">
                                Configura tu nueva contraseña para proteger tu negocio.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-900 dark:text-slate-400 uppercase tracking-widest ml-2">Nueva Clave</label>
                                <div className="relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="password"
                                        required
                                        className="w-full pl-14 pr-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-slate-900 dark:text-white"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-900 dark:text-slate-400 uppercase tracking-widest ml-2">Confirmar Clave</label>
                                <div className="relative">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="password"
                                        required
                                        className="w-full pl-14 pr-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-slate-900 dark:text-white"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* ── BUTTON: zero conditional renders ─────────────
                                Both spinner and text ALWAYS in the DOM.
                                CSS opacity switches which one is visible.       */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="relative w-full py-5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-[1.5rem] font-black transition-all flex items-center justify-center disabled:opacity-70 overflow-hidden"
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
                                    Actualizar Clave <ArrowRight className="w-5 h-5" />
                                </span>
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            <Link to="/forgot-password" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-colors text-sm">
                                <ArrowLeft className="w-4 h-4" /> Solicitar nuevo enlace
                            </Link>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ResetPassword;
