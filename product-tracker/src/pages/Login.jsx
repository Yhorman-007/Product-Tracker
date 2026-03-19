import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { User, Lock, Eye, EyeOff, AlertCircle, MapPin } from 'lucide-react';

// Vista Login: Interfaz pública encargada de autenticar usuarios en el sistema a través del AuthContext
const Login = () => {
    // useState: Define las credenciales manejadas en el formulario
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    // Fetch Intermediario: Evita la recarga al enviar form e invoca "login" del AuthContext
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(username.trim(), password);
            setTimeout(() => {
                navigate('/');
            }, 100);
        } catch (err) {
            console.error('❌ [LOGIN ERROR]:', err);
            setError(err.response?.data?.detail || 'Usuario o contraseña incorrectos');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden login-bg">
            {/* Decorative blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 rounded-full bg-emerald-600/20 blur-3xl pointer-events-none" />
            <div className="absolute top-[40%] right-[20%] w-56 h-56 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="login-card max-w-md w-full p-8 rounded-2xl mx-auto"
            >
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#10b981] to-[#22c55e] shadow-lg shadow-emerald-500/40 mb-4">
                        <span className="text-white font-black text-xl">PT</span>
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Product Tracker</h2>
                    <p className="text-slate-500 dark:text-emerald-200/70 mt-2 font-medium">Bienvenido de nuevo</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Error message */}
                    <div
                        className={`overflow-hidden transition-all duration-300 ${error ? 'max-h-24 opacity-100 mb-2' : 'max-h-0 opacity-0'}`}
                    >
                        <div className="flex items-center gap-3 p-4 bg-red-500/20 text-red-200 rounded-2xl border border-red-400/30">
                            <div className="bg-red-500/30 p-2 rounded-lg">
                                <AlertCircle size={18} className="text-red-300" />
                            </div>
                            <span className="text-sm font-bold">{error}</span>
                        </div>
                    </div>

                    {/* Username */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-emerald-600 dark:text-emerald-400 ml-1">Usuario</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                                <User size={20} />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="login-input w-full pl-12 pr-4 py-4 rounded-2xl outline-none transition-all"
                                placeholder="Ingresa tu usuario"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-emerald-600 dark:text-emerald-400 ml-1">Contraseña</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                                <Lock size={20} />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="login-input w-full pl-12 pr-12 py-4 rounded-2xl outline-none transition-all"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-xl shadow-emerald-500/40 transition-all flex items-center justify-center gap-3 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Iniciar Sesión'
                        )}
                    </motion.button>

                    <div className="text-center">
                        <Link to="/forgot-password" className="text-indigo-300/60 font-bold hover:text-[#06b6d4] transition-colors text-sm">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>

                    <div className="mt-8 text-center text-indigo-300/60">
                        ¿No tienes cuenta?{' '}
                        <Link to="/signup" className="text-[#06b6d4] font-bold hover:text-emerald-400 transition-colors">
                            Regístrate
                        </Link>
                    </div>
                </form>

                {/* Footer Localization */}
                <div className="mt-10 flex flex-col items-center gap-1 opacity-40">
                    <div className="flex items-center gap-1 text-slate-400 dark:text-white font-black text-[10px] uppercase tracking-[0.2em]">
                        <MapPin size={10} className="text-emerald-500" />
                        Medellín, Colombia
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
