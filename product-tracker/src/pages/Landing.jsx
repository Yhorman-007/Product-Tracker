import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Shield, BarChart3, ArrowRight } from 'lucide-react';

const Landing = () => (
  <div className="min-h-screen bg-[#0f172a] text-white">
    <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
      <div className="flex items-center gap-3 font-black text-xl">
        <Package className="w-8 h-8 text-emerald-400" />
        Product Tracker
      </div>
      <nav className="flex items-center gap-4 text-sm">
        <Link to="/pricing" className="text-slate-300 hover:text-white">Precios</Link>
        <Link to="/login" className="text-slate-300 hover:text-white">Iniciar sesión</Link>
        <Link to="/signup" className="px-4 py-2 bg-emerald-500 rounded-xl font-bold">Prueba gratis</Link>
      </nav>
    </header>

    <main className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-4">SaaS para PYMEs</p>
        <h1 className="text-5xl font-black leading-tight mb-6">
          Inventario, POS y reportes en una sola plataforma
        </h1>
        <p className="text-slate-400 text-lg mb-8">
          Multi-tenant, seguro y listo para crecer. Empieza con 14 días de prueba sin tarjeta.
        </p>
        <div className="flex gap-4">
          <Link to="/signup" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 rounded-2xl font-bold">
            Crear mi tienda <ArrowRight className="w-5 h-5" />
          </Link>
          <Link to="/pricing" className="inline-flex items-center px-6 py-3 border border-white/20 rounded-2xl">
            Ver planes
          </Link>
        </div>
      </motion.div>

      <div className="grid gap-4">
        {[
          { icon: Shield, title: 'Datos aislados', desc: 'Cada empresa ve solo su inventario y ventas.' },
          { icon: BarChart3, title: 'Reportes en tiempo real', desc: 'Valoración, ganancias y alertas de stock.' },
          { icon: Package, title: 'POS integrado', desc: 'Ventas con descuento de stock automático.' },
        ].map((item) => (
          <div key={item.title} className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <item.icon className="w-8 h-8 text-emerald-400 mb-3" />
            <h3 className="font-bold text-lg">{item.title}</h3>
            <p className="text-slate-400 text-sm">{item.desc}</p>
          </div>
        ))}
      </div>
    </main>

    <footer className="max-w-6xl mx-auto px-6 py-8 border-t border-white/10 text-sm text-slate-500 flex gap-6">
      <Link to="/terms">Términos</Link>
      <Link to="/privacy">Privacidad</Link>
    </footer>
  </div>
);

export default Landing;
