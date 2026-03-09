import React, { useEffect, useState } from 'react';
import { Crown, Lock, KeyRound, Trash2, Pencil, Shield, Wallet, Banknote } from 'lucide-react';
import { useEmployeeFinance } from '../../../../hooks/store/useEmployeeFinance';

// 📝 TITLE CASE UTILITY
const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function EmployeeCard({ user, onReset, onDelete, onEdit, onUpdatePermissions, onViewFinance, readOnly }) {
  const isUserOwner = user.roleId === 'ROL_DUENO';
  const isManager = user.roleId === 'ROL_ENCARGADO';
  const isCustom = user.roleId === 'ROL_CUSTOM';

  const { obtenerFinanzas } = useEmployeeFinance();
  const [finanzas, setFinanzas] = useState(null);

  useEffect(() => {
    let mounted = true;
    obtenerFinanzas(user.id).then(data => {
      if (mounted) setFinanzas(data);
    });
    return () => { mounted = false; };
  }, [user.id]);

  const deuda = finanzas?.deudaAcumulada || 0;

  return (
    <div className={`p-6 rounded-[2rem] transition-all duration-300 relative group overflow-hidden border ${isUserOwner
      ? 'bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10 border-amber-200/60 dark:border-amber-700/30'
      : isManager
        ? 'bg-gradient-to-br from-violet-50 to-purple-50/50 dark:from-violet-900/10 dark:to-purple-900/10 border-violet-200/60 dark:border-violet-700/30'
        : isCustom
          ? 'bg-gradient-to-br from-app-light to-gray-50/50 dark:from-slate-800/50 dark:to-gray-800/10 border-border-subtle dark:border-slate-700'
          : 'bg-surface-light dark:bg-surface-dark border-border-subtle dark:border-slate-800 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1'
      }`}>

      {/* Owner Badge Background */}
      {isUserOwner && <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-[3rem] -mr-4 -mt-4 z-0 pointer-events-none"></div>}

      <div className="relative z-10 flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shadow-md ${isUserOwner
              ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30 text-white'
              : isManager
                ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/30 text-white'
                : isCustom
                  ? 'bg-gradient-to-br from-slate-500 to-slate-600 shadow-slate-500/30 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700'
              }`}>
              {user.nombre.charAt(0).toUpperCase()}
            </div>
            {/* 🔴 Financial Status Indicator */}
            {deuda > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-status-danger rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white shadow-sm animate-pulse" title={`Deuda: $${deuda.toFixed(2)}`}>
                !
              </div>
            )}
          </div>

          <div>
            <h4 className="font-bold text-content-main dark:text-white text-lg leading-tight mb-1">{toTitleCase(user.nombre)}</h4>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isUserOwner
                ? 'bg-amber-100 text-amber-700'
                : isManager
                  ? 'bg-violet-100 text-violet-700'
                  : isCustom
                    ? 'bg-slate-100 text-content-secondary dark:bg-slate-700 dark:text-slate-300'
                    : 'bg-primary-light text-primary'
                }`}>
                {isUserOwner ? 'CONTROL TOTAL' : (user.customLabel || user.rol)}
              </span>

              {/* 🔴 Deuda Activa */}
              {deuda > 0 && (
                <span className="text-[10px] font-mono text-status-danger font-bold bg-status-dangerBg px-1.5 py-0.5 rounded border border-red-100" title="Deuda Acumulada">
                  -${deuda.toFixed(2)}
                </span>
              )}

              {/* 🟢 Neto Restante */}
              {(finanzas?.sueldoBase || 0) > 0 ? (
                <span className="text-[10px] font-mono text-status-success font-bold bg-status-successBg px-1.5 py-0.5 rounded border border-emerald-100" title="Restante a Pagar">
                  ${Math.max(0, (finanzas?.sueldoBase || 0) - deuda).toFixed(2)}
                </span>
              ) : (
                // Si no hay deuda ni sueldo, mostrar ID discreto
                !deuda && <span className="text-[10px] font-mono text-content-secondary/50">#{String(user.id).slice(-4)}</span>
              )}
            </div>
          </div>
        </div>
        {isUserOwner && <Crown size={22} className="text-amber-500 drop-shadow-sm" />}
      </div>

      {!isUserOwner ? (
        <div className="flex gap-2 pt-2 border-t border-border-subtle/50 dark:border-slate-800/50 mt-2 overflow-x-auto no-scrollbar">
          {/* 🆕 Ficha Financiera Button — Only for plans with full ROLES */}
          {onViewFinance && (
            <button
              onClick={() => onViewFinance(user)}
              disabled={readOnly}
              className="flex-1 min-w-[100px] py-2 bg-status-successBg dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 text-status-success dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all flex items-center justify-center gap-2 border border-emerald-100 dark:border-emerald-800/30"
              title="Ver Nómina y Deudas"
            >
              <Banknote size={14} strokeWidth={2.5} /> FICHA
            </button>
          )}

          <button
            onClick={() => onReset(user)}
            disabled={readOnly}
            className="w-10 h-10 bg-app-light dark:bg-slate-800 hover:bg-primary-light dark:hover:bg-primary/20 text-content-secondary dark:text-slate-400 hover:text-primary dark:hover:text-primary-light rounded-xl transition-all border border-transparent hover:border-primary/20 flex items-center justify-center shrink-0"
            title="Resetear PIN"
          >
            <KeyRound size={16} />
          </button>

          <button
            onClick={() => onEdit && onEdit(user)}
            disabled={readOnly}
            className="w-10 h-10 bg-surface-light dark:bg-slate-800 hover:bg-primary-light dark:hover:bg-blue-900/20 text-content-secondary hover:text-primary rounded-xl transition-all border border-border-subtle dark:border-slate-700 hover:border-primary/20 dark:hover:border-blue-800 flex items-center justify-center shrink-0"
            title="Editar Nombre"
          >
            <Pencil size={16} />
          </button>

          {/* Gestionar Permisos — Only for plans with full ROLES */}
          {onUpdatePermissions && (
            <button
              onClick={() => onUpdatePermissions(user)}
              disabled={readOnly}
              className="w-10 h-10 bg-surface-light dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-content-secondary hover:text-violet-500 rounded-xl transition-all border border-border-subtle dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-800 flex items-center justify-center shrink-0"
              title="Gestionar Permisos"
            >
              <Shield size={16} />
            </button>
          )}

          <button
            onClick={() => onDelete(user)}
            disabled={readOnly}
            className="w-10 h-10 bg-surface-light dark:bg-slate-800 hover:bg-status-dangerBg dark:hover:bg-red-900/20 text-content-secondary hover:text-status-danger rounded-xl transition-all border border-border-subtle dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 flex items-center justify-center shrink-0"
            title="Dar de baja"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <div className="pt-4 text-center border-t border-amber-200/30 dark:border-amber-800/30 mt-2">
          <span className="text-[10px] font-bold text-amber-600/60 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
            <Lock size={12} /> Acceso Maestro
          </span>
        </div>
      )}
    </div>
  );
}