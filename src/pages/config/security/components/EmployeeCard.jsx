import React from 'react';
import { Crown, Lock, KeyRound, Trash2, Pencil, Shield } from 'lucide-react';

export default function EmployeeCard({ user, onReset, onDelete, onEdit, onUpdatePermissions, readOnly }) {
  const isUserOwner = user.roleId === 'ROL_DUENO';
  const isManager = user.roleId === 'ROL_ENCARGADO';
  const isCustom = user.roleId === 'ROL_CUSTOM';

  return (
    <div className={`p-6 rounded-[2rem] transition-all duration-300 relative group overflow-hidden border ${isUserOwner
      ? 'bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10 border-amber-200/60 dark:border-amber-700/30'
      : isManager
        ? 'bg-gradient-to-br from-violet-50 to-purple-50/50 dark:from-violet-900/10 dark:to-purple-900/10 border-violet-200/60 dark:border-violet-700/30'
        : isCustom
          ? 'bg-gradient-to-br from-slate-50 to-gray-50/50 dark:from-slate-800/50 dark:to-gray-800/10 border-slate-200 dark:border-slate-700'
          : 'bg-surface-light dark:bg-surface-dark border-border-subtle dark:border-slate-800 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1'
      }`}>

      {/* Owner Badge Background */}
      {isUserOwner && <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-[3rem] -mr-4 -mt-4 z-0 pointer-events-none"></div>}

      <div className="relative z-10 flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
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
          <div>
            <h4 className="font-bold text-content-main dark:text-white text-lg leading-tight mb-1">{user.nombre}</h4>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${isUserOwner
                ? 'bg-amber-100 text-amber-700'
                : isManager
                  ? 'bg-violet-100 text-violet-700'
                  : isCustom
                    ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    : 'bg-primary-light text-primary'
                }`}>
                {isUserOwner ? 'CONTROL TOTAL' : (user.customLabel || user.rol)}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                ID: {String(user.id).slice(-4)}
              </span>
            </div>
          </div>
        </div>
        {isUserOwner && <Crown size={22} className="text-amber-500 drop-shadow-sm" />}
      </div>

      {!isUserOwner ? (
        <div className="flex gap-3 pt-2 border-t border-border-subtle/50 dark:border-slate-800/50 mt-2">
          <button
            onClick={() => onReset(user)}
            disabled={readOnly}
            className="flex-1 py-2.5 bg-app-light dark:bg-slate-800 hover:bg-primary-light dark:hover:bg-primary/20 text-content-secondary dark:text-slate-400 hover:text-primary dark:hover:text-primary-light rounded-xl text-[10px] font-black uppercase tracking-wide transition-all flex items-center justify-center gap-2 border border-transparent hover:border-primary/20 group/btn"
          >
            <KeyRound size={14} className="group-hover/btn:rotate-45 transition-transform" /> REINICIAR PIN
          </button>

          <button
            onClick={() => onEdit && onEdit(user)}
            disabled={readOnly}
            className="w-10 h-10 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-500 rounded-xl transition-all border border-border-subtle dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 flex items-center justify-center shrink-0"
            title="Editar Nombre"
          >
            <Pencil size={16} />
          </button>

          <button
            onClick={() => onUpdatePermissions && onUpdatePermissions(user)}
            disabled={readOnly}
            className="w-10 h-10 bg-white dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-slate-400 hover:text-violet-500 rounded-xl transition-all border border-border-subtle dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-800 flex items-center justify-center shrink-0"
            title="Gestionar Permisos"
          >
            <Shield size={16} />
          </button>

          <button
            onClick={() => onDelete(user)}
            disabled={readOnly}
            className="w-10 h-10 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-xl transition-all border border-border-subtle dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 flex items-center justify-center shrink-0"
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