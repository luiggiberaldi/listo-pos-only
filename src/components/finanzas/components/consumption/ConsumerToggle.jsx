import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, User, Users, Check, AlertTriangle } from 'lucide-react';

/**
 * 3-tab consumer toggle (Local / Empleado / 🐄 Vaca)
 * + Employee card grid (single-select or multi-select)
 */
export default function ConsumerToggle({
    consumidorType, setConsumidorType,
    targetEmployeeId, setTargetEmployeeId,
    vacaSelectedIds, setVacaSelectedIds,
    activeEmployees, employeeFinanzas,
    cartTotal,
    hasEmployeeFeatures, canDoEmpleadoConsumo,
}) {
    if (!hasEmployeeFeatures || !canDoEmpleadoConsumo) return null;

    return (
        <>
            {/* 3-position toggle */}
            <div className="bg-slate-50 p-1 rounded-xl flex border border-slate-200 relative">
                <motion.div
                    className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm border border-slate-100"
                    layout
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    style={{
                        width: 'calc(33.333% - 3px)',
                        left: consumidorType === 'SYSTEM' ? '4px'
                            : consumidorType === 'EMPLOYEE' ? 'calc(33.333% + 0px)'
                                : 'calc(66.666% - 2px)'
                    }}
                />
                <button
                    onClick={() => { setConsumidorType('SYSTEM'); setTargetEmployeeId(''); setVacaSelectedIds([]); }}
                    className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 relative z-10 ${consumidorType === 'SYSTEM' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                >
                    <Store size={13} /> Local
                </button>
                <button
                    onClick={() => { setConsumidorType('EMPLOYEE'); setVacaSelectedIds([]); }}
                    className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 relative z-10 ${consumidorType === 'EMPLOYEE' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                >
                    <User size={13} /> Empleado
                </button>
                <button
                    onClick={() => { setConsumidorType('VACA'); setTargetEmployeeId(''); }}
                    className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 relative z-10 ${consumidorType === 'VACA' ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                >
                    <Users size={13} /> 🐄 Vaca
                </button>
            </div>

            {/* Employee card grid */}
            <AnimatePresence>
                {(consumidorType === 'EMPLOYEE' || consumidorType === 'VACA') && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        {/* Vaca split summary */}
                        {consumidorType === 'VACA' && vacaSelectedIds.length >= 2 && cartTotal > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2 text-center"
                            >
                                <p className="text-[10px] font-bold text-amber-700">
                                    🐄 ${cartTotal.toFixed(2)} ÷ {vacaSelectedIds.length} = <span className="text-amber-900 text-xs">${(cartTotal / vacaSelectedIds.length).toFixed(2)} c/u</span>
                                </p>
                            </motion.div>
                        )}
                        {consumidorType === 'VACA' && vacaSelectedIds.length < 2 && (
                            <p className="text-[10px] text-amber-500 font-bold text-center py-1 mb-1">Selecciona al menos 2 empleados</p>
                        )}

                        <div className="grid grid-cols-2 gap-1.5 pt-1 max-h-36 overflow-y-auto custom-scrollbar">
                            {activeEmployees.map(u => {
                                const isSelected = consumidorType === 'VACA'
                                    ? vacaSelectedIds.includes(u.id)
                                    : targetEmployeeId === u.id;
                                const finData = employeeFinanzas[u.id];
                                const sueldo = parseFloat(finData?.sueldoBase) || 0;
                                const deuda = parseFloat(finData?.deudaAcumulada) || 0;
                                const disponible = Math.max(0, sueldo - deuda);
                                const hasCredit = sueldo > 0;

                                return (
                                    <motion.button
                                        key={u.id}
                                        onClick={() => {
                                            if (consumidorType === 'VACA') {
                                                setVacaSelectedIds(prev =>
                                                    prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                                                );
                                            } else {
                                                setTargetEmployeeId(u.id);
                                            }
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        className={`p-2 rounded-xl flex items-center gap-2 transition-all text-left relative ${isSelected ? 'shadow-sm' : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                            }`}
                                        style={isSelected ? {
                                            backgroundColor: consumidorType === 'VACA' ? '#fffbeb' : '#eef2ff',
                                            border: `2px solid ${consumidorType === 'VACA' ? '#fcd34d' : '#a5b4fc'}`,
                                            boxShadow: `0 0 0 2px ${consumidorType === 'VACA' ? 'rgba(245,158,11,0.2)' : 'rgba(99,102,241,0.2)'}`
                                        } : {}}
                                    >
                                        <div
                                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 transition-colors"
                                            style={{
                                                backgroundColor: isSelected ? (consumidorType === 'VACA' ? '#f59e0b' : '#6366f1') : '#f1f5f9',
                                                color: isSelected ? '#fff' : '#64748b'
                                            }}
                                        >
                                            {u.nombre.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className={`text-[10px] font-bold truncate ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>{u.nombre}</p>
                                            {hasCredit ? (
                                                <p className={`text-[8px] font-bold ${disponible <= 0 ? 'text-rose-500' : disponible < sueldo * 0.3 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                    ${disponible.toFixed(0)} disp.
                                                </p>
                                            ) : (
                                                <p className="text-[8px] text-slate-400">{u.rol}</p>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: consumidorType === 'VACA' ? '#f59e0b' : '#6366f1' }}
                                            >
                                                <Check size={10} className="text-white" strokeWidth={3} />
                                            </motion.div>
                                        )}
                                        {hasCredit && disponible <= 0 && (
                                            <AlertTriangle size={10} className="text-rose-400 absolute top-1 right-1" />
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                        {activeEmployees.length === 0 && (
                            <p className="text-[10px] text-slate-400 text-center py-3">No hay empleados activos registrados.</p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
