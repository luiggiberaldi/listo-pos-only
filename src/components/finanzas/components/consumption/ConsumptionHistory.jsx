import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Trash2, Sparkles, ChevronDown } from 'lucide-react';

/**
 * Consumos Recientes — collapsible panel showing today's consumption logs.
 * Collapsed by default to give cart items priority space.
 */
export default function ConsumptionHistory({
    consumosRecientes,
    usuarios,
    canDoEmpleadoConsumo,
    onDeleteConsumo,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const count = consumosRecientes.length;

    return (
        <div className="shrink-0 mb-3">
            {/* Toggle Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition-all group"
            >
                <div className="flex items-center gap-2">
                    <Clock size={12} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Recientes
                    </span>
                    {count > 0 && (
                        <span className="text-[9px] font-bold bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">
                            {count}
                        </span>
                    )}
                </div>
                <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Collapsible Content */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-2 bg-white rounded-xl border border-slate-100 max-h-36 overflow-y-auto custom-scrollbar">
                            {count === 0 ? (
                                <div className="flex items-center justify-center gap-2 py-4">
                                    <Sparkles size={14} className="text-emerald-400" />
                                    <p className="text-[10px] font-bold text-slate-400">Sin movimientos hoy</p>
                                </div>
                            ) : (
                                <div className="p-2 space-y-0.5">
                                    {consumosRecientes.map((log, idx) => {
                                        const detalle = (log.detalle || '').toLowerCase();
                                        const isVaca = detalle.includes('vaca');
                                        const isNomina = detalle.includes('nomina') || detalle.includes('nómina');
                                        const typeIcon = isVaca ? '🐄' : isNomina ? '👤' : '🏪';
                                        const hora = log.fecha
                                            ? new Date(log.fecha).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })
                                            : '';

                                        return (
                                            <motion.div
                                                key={log.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 group"
                                            >
                                                <span className="text-xs flex-shrink-0" title={isVaca ? 'Vaca' : isNomina ? 'Nómina' : 'Uso Local'}>
                                                    {typeIcon}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-[10px] font-bold text-slate-700 truncate">{log.producto}</p>
                                                        {hora && <span className="text-[8px] text-slate-300 flex-shrink-0">{hora}</span>}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-emerald-600 font-bold text-[10px]">
                                                            -{parseFloat(log.cantidad).toFixed(0)}
                                                        </span>
                                                        {log.registradoPor && (
                                                            <span className="text-[8px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full font-bold truncate max-w-[80px]">
                                                                {typeof log.registradoPor === 'string' && log.registradoPor.length > 10
                                                                    ? log.registradoPor.substring(0, 8) + '…'
                                                                    : (usuarios?.find(u => u.id === log.registradoPor)?.nombre || log.registradoPor)
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {canDoEmpleadoConsumo && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onDeleteConsumo(log); }}
                                                        className="ml-1 p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                                        title="Devolver al Inventario"
                                                    >
                                                        <Trash2 size={11} />
                                                    </button>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
