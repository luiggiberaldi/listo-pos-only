// 🏪 MULTI-CAJA: Selector de Caja Activa
// Archivo: src/components/pos/CajaSelector.jsx

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { CAJA_IDS, getCajaNombre } from '../../config/cajaDefaults';
import { Monitor, Plus, CheckCircle2 } from 'lucide-react';

/**
 * CajaSelector — Muestra las cajas disponibles y permite cambiar entre ellas.
 * @param {string} cajaActiva - ID de la caja seleccionada actualmente
 * @param {Function} onCambiarCaja - Callback al cambiar de caja
 * @param {number} maxCajas - Máximo de cajas permitidas por el plan (1 = Bodega, 2 = Abasto, 99 = Minimarket)
 */
export default function CajaSelector({ cajaActiva, onCambiarCaja, maxCajas = 1 }) {
    // Si el plan solo permite 1 caja, no mostrar selector
    if (maxCajas <= 1) return null;

    // Leer TODAS las sesiones de caja de la DB
    const sesiones = useLiveQuery(
        () => db.caja_sesion.toArray(),
        []
    ) || [];

    // Generar lista de cajas disponibles según el plan
    const cajasDisponibles = Object.values(CAJA_IDS).slice(0, maxCajas);

    // Map de sesiones activas para lookup rápido
    const sesionMap = {};
    sesiones.forEach(s => { sesionMap[s.key] = s; });

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <Monitor size={16} className="text-slate-400 shrink-0" />

            <div className="flex items-center gap-1">
                {cajasDisponibles.map(cajaId => {
                    const sesion = sesionMap[cajaId];
                    const isAbierta = sesion?.isAbierta === true;
                    const isActiva = cajaId === cajaActiva;

                    return (
                        <button
                            key={cajaId}
                            onClick={() => onCambiarCaja(cajaId)}
                            className={`
                relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold
                transition-all duration-200 active:scale-95
                ${isActiva
                                    ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300 shadow-sm ring-2 ring-emerald-200/50'
                                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                                }
              `}
                            title={`${getCajaNombre(cajaId)} — ${isAbierta ? 'Abierta' : 'Cerrada'}`}
                        >
                            {/* Indicador de Estado */}
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isAbierta ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />

                            {/* Nombre */}
                            <span className="whitespace-nowrap">{getCajaNombre(cajaId)}</span>

                            {/* Check si activa */}
                            {isActiva && (
                                <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
