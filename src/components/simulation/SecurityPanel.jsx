import React from 'react';
import { ShieldCheck } from 'lucide-react';
import RBACAuditCard from '../testing/RBACAuditCard';

export const SecurityPanel = ({ vRBAC }) => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl text-amber-600">
                    <ShieldCheck size={24} />
                </div>
                <div>
                    <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">Security & RBAC</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Auditoría de Permisos y Acceso</p>
                </div>
            </div>
            <RBACAuditCard validator={vRBAC} />
            <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 leading-relaxed">
                    Este motor valida que los roles de <strong>Vendedor</strong> y <strong>Administrador</strong> no puedan realizar acciones no autorizadas (como ver costos secretos o borrar logs del sistema) mediante inyección de comandos simulados.
                </p>
            </div>
        </div>
    );
};
