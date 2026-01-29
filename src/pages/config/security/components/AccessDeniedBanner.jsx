import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function AccessDeniedBanner() {
  return (
    <div className="bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-500 p-6 rounded-r-xl flex items-start gap-4">
        <ShieldAlert className="text-orange-500 shrink-0 mt-1" size={24} />
        <div>
            <h4 className="font-black text-orange-800 dark:text-orange-400 uppercase tracking-wide mb-1">Área Restringida</h4>
            <p className="text-sm text-orange-700/80 dark:text-orange-400/80 leading-relaxed">
                La gestión de personal está reservada exclusivamente para el Dueño del negocio. 
                Como empleado, solo puedes modificar tu propia credencial en la tarjeta superior.
            </p>
        </div>
    </div>
  );
}