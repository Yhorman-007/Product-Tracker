import React from 'react';
import { Link } from 'react-router-dom';

const LegalPage = ({ title, children }) => (
  <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] py-16 px-6">
    <article className="max-w-3xl mx-auto prose dark:prose-invert">
      <Link to="/" className="text-emerald-600 font-bold no-underline">← Inicio</Link>
      <h1>{title}</h1>
      {children}
    </article>
  </div>
);

export const Terms = () => (
  <LegalPage title="Términos de Servicio">
    <p>Al usar Product Tracker aceptas que el servicio se provee &quot;tal cual&quot; para gestión de inventario y ventas.</p>
    <p>Eres responsable de la exactitud de los datos que ingresas y del cumplimiento fiscal de tu negocio.</p>
    <p>Podemos suspender cuentas que abusen del servicio o violen estos términos.</p>
  </LegalPage>
);

export const Privacy = () => (
  <LegalPage title="Política de Privacidad">
    <p>Recopilamos datos de cuenta (email, nombre de empresa) y datos operativos (productos, ventas) para prestar el servicio.</p>
    <p>No vendemos tus datos. Los almacenamos de forma aislada por organización.</p>
    <p>Puedes solicitar exportación o eliminación contactando a soporte.</p>
  </LegalPage>
);

export default Terms;
