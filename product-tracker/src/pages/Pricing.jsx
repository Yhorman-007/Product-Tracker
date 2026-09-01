import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const plans = [
  { id: 'trial', name: 'Trial', price: 'Gratis', period: '14 días', features: ['5 usuarios', '200 productos', 'Exportaciones'] },
  { id: 'starter', name: 'Starter', price: '$29', period: '/mes', features: ['3 usuarios', '500 productos', 'Soporte email'] },
  { id: 'pro', name: 'Pro', price: '$79', period: '/mes', features: ['10 usuarios', '5.000 productos', 'Exportaciones'] },
  { id: 'business', name: 'Business', price: '$199', period: '/mes', features: ['50 usuarios', 'Multi-sucursal', 'Exportaciones'] },
];

const Pricing = () => {
  const [loading, setLoading] = useState(null);

  const startCheckout = async (plan) => {
    if (plan === 'trial') {
      window.location.href = '/signup';
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/signup';
      return;
    }
    setLoading(plan);
    try {
      const { data } = await api.post('billing/checkout', { plan });
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch {
      alert('Billing no configurado aún. Contacta soporte.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] py-16 px-6">
      <div className="max-w-5xl mx-auto text-center mb-12">
        <Link to="/" className="text-emerald-600 font-bold">← Volver</Link>
        <h1 className="text-4xl font-black mt-6 text-slate-900 dark:text-white">Planes simples para tu negocio</h1>
        <p className="text-slate-500 mt-3">Empieza gratis. Escala cuando lo necesites.</p>
      </div>
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-lg">
            <h2 className="font-black text-xl text-slate-900 dark:text-white">{plan.name}</h2>
            <p className="text-3xl font-black text-emerald-600 my-4">
              {plan.price}<span className="text-sm text-slate-400">{plan.period}</span>
            </p>
            <ul className="text-sm text-slate-500 space-y-2 mb-6">
              {plan.features.map((f) => <li key={f}>• {f}</li>)}
            </ul>
            <button
              onClick={() => startCheckout(plan.id)}
              disabled={loading === plan.id}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-60"
            >
              {loading === plan.id ? 'Redirigiendo...' : plan.id === 'trial' ? 'Empezar trial' : 'Suscribirse'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Pricing;
