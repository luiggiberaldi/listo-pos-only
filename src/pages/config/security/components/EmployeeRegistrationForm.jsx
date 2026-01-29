import React, { useState } from 'react';
import { UserPlus, Briefcase, Eye, EyeOff } from 'lucide-react';

export default function EmployeeRegistrationForm({ formState, setFormState, onSubmit, readOnly }) {
    const [showPin, setShowPin] = useState(false);
    return (
        <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-border-subtle dark:border-slate-800 h-fit sticky top-8 relative overflow-hidden group transition-all duration-300">
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 dark:bg-primary/10 rounded-full blur-[60px] pointer-events-none -mr-10 -mt-10" />

            <div className="flex items-center gap-5 mb-8 pb-6 border-b border-border-subtle dark:border-slate-800/50 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-primary-light dark:bg-primary/20 text-primary flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-500">
                    <UserPlus size={28} strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="font-bold text-content-main dark:text-white text-xl tracking-tight leading-tight">Nuevo Ingreso</h3>
                    <p className="text-sm text-content-secondary font-medium mt-0.5">Añadir personal al equipo</p>
                </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-6 relative z-10">
                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-content-secondary uppercase tracking-widest ml-1">Nombre Completo</label>
                    <input
                        type="text"
                        placeholder="Ej: Carlos Ruiz"
                        className="w-full p-4 bg-app-light dark:bg-slate-900/50 rounded-xl font-bold text-content-main dark:text-white outline-none focus:ring-2 focus:ring-primary-focus/50 focus:border-primary transition-all border border-border-subtle/50 hover:border-border-subtle placeholder:text-slate-300 dark:placeholder:text-slate-600"
                        value={formState.nombre}
                        onChange={e => setFormState({ ...formState, nombre: e.target.value })}
                        disabled={readOnly}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-content-secondary uppercase tracking-widest ml-1">Función / Cargo</label>
                    <div className="relative group/select">
                        <select
                            disabled={readOnly}
                            className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl font-bold text-content-secondary dark:text-slate-400 outline-none border border-transparent focus:border-primary/50 appearance-none cursor-pointer hover:bg-white dark:hover:bg-slate-900 transition-colors"
                            value={formState.rol === 'Cajero' || formState.rol === 'Encargado' ? formState.rol : 'Personalizado'}
                            onChange={e => {
                                const val = e.target.value;
                                if (val === 'Personalizado') setFormState({ ...formState, rol: '' });
                                else setFormState({ ...formState, rol: val });
                            }}
                        >
                            <option value="Cajero">Cajero (Ventas Básicas)</option>
                            <option value="Encargado">Encargado (Supervisión)</option>
                            <option value="Personalizado">Personalizado / Otro...</option>
                        </select>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-hover/select:text-slate-400 transition-colors">
                            <Briefcase size={20} />
                        </div>
                    </div>
                </div>

                {/* INPUT CONDICIONAL: NOMBRE DEL CARGO PERSONALIZADO */}
                {formState.rol !== 'Cajero' && formState.rol !== 'Encargado' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest ml-1">Nombre del Cargo</label>
                        <input
                            type="text"
                            placeholder="Ej: Supervisor Nocturno"
                            className="w-full p-4 bg-app-light dark:bg-slate-900/50 rounded-xl font-bold text-violet-700 dark:text-violet-300 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all border border-violet-200/50 dark:border-violet-900/30 placeholder:text-violet-300 dark:placeholder:text-violet-700"
                            value={formState.rol}
                            onChange={e => setFormState({ ...formState, rol: e.target.value })}
                            autoFocus
                        />
                    </div>
                )}

                <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-end">
                        <label className="text-[11px] font-bold text-content-secondary uppercase tracking-widest ml-1">Asignar PIN</label>
                        <span className="text-[10px] font-black text-primary bg-primary-light px-2.5 py-1 rounded-md tracking-wide">6 DÍGITOS</span>
                    </div>
                    <div className="relative group/pin">
                        <input
                            type={showPin ? "text" : "password"}
                            inputMode="numeric"
                            placeholder="000000"
                            maxLength={6}
                            className="w-full py-4 pl-8 pr-12 bg-app-light dark:bg-slate-900/50 rounded-xl font-mono font-bold text-center text-content-main dark:text-white text-2xl tracking-[0.3em] indent-[0.3em] outline-none focus:ring-2 focus:ring-primary-focus/50 focus:border-primary transition-all border border-border-subtle/50 hover:border-border-subtle focus:bg-white dark:focus:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-inner caret-primary flex items-center"
                            value={formState.pin}
                            onChange={e => setFormState({ ...formState, pin: e.target.value.replace(/\D/g, '') })}
                            disabled={readOnly}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPin(!showPin)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors flex items-center justify-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            title={showPin ? "Ocultar PIN" : "Mostrar PIN"}
                        >
                            {showPin ? <EyeOff size={20} strokeWidth={2} /> : <Eye size={20} strokeWidth={2} />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={readOnly || !formState.nombre || formState.pin.length < 6}
                    className="w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-2xl font-bold text-sm tracking-wide shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2 group/btn mt-6"
                >
                    <UserPlus size={20} strokeWidth={2.5} className="group-hover/btn:scale-110 transition-transform flex-shrink-0" />
                    <span>REGISTRAR EMPLEADO</span>
                </button>
            </form>
        </div>
    );
}