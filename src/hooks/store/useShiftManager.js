import { useState } from 'react';
import { db } from '../../db';
import { generarReporteZ } from '../../utils/reportUtils';

/**
 * useShiftManager
 * 
 * Hook responsible for "Shift" Lifecycle:
 * - Opening the Box (Apertura)
 * - Closing the Box (Cierre Z)
 */
export const useShiftManager = (
    usuario,
    { abrirCaja, cerrarSesionCaja, playSound } // Actions from useCajaEstado
) => {
    const [isShiftProcessing, setIsShiftProcessing] = useState(false);

    // A. APERTURA (Delegates to CajaEstadoProvider)
    const abrirCajaPOS = async (monto) => {
        if (abrirCaja) {
            const exito = await abrirCaja(monto, usuario);
            if (exito && playSound) playSound('CLICK');
        }
    };

    // B. CIERRE (Logic extracted from useSalesProcessor)
    const cerrarCaja = async (datosInyectados = {}) => {
        if (isShiftProcessing) throw new Error("Operación de cierre en progreso...");
        try {
            setIsShiftProcessing(true);

            // Verificación atómica en DB
            const sesion = await db.caja_sesion.get('actual');
            if (!sesion || !sesion.isAbierta) throw new Error("Caja ya está cerrada.");

            // Transaction Scope: Ventas, Logs, Caja, Cortes
            return await db.transaction('rw', db.ventas, db.logs, db.caja_sesion, db.cortes, async () => {
                const ventasFrescas = await db.ventas.toArray();
                // Filter pending sales for Z Cut
                const ventasParaCierre = ventasFrescas.filter(v => !v.corteId && v.status === 'COMPLETADA');

                // Generate Report
                const nuevoCorte = generarReporteZ(ventasParaCierre, sesion, usuario);
                Object.assign(nuevoCorte, datosInyectados);

                // 1. Save Log
                await db.logs.add({
                    tipo: 'CORTE_Z',
                    fecha: new Date().toISOString(),
                    data: nuevoCorte,
                    usuarioId: usuario?.id || 'sys',
                    usuarioNombre: usuario?.nombre || 'Sistema'
                });

                // 2. Mark sales as Cut
                const idsVentas = ventasParaCierre.map(v => v.id);
                if (idsVentas.length > 0) {
                    await db.ventas.where('id').anyOf(idsVentas).modify({ corteId: nuevoCorte.corteRef });
                }

                // 3. Execute Close in CajaEstado (Clears session, saves history)
                await cerrarSesionCaja(nuevoCorte);

                if (playSound) playSound('CLICK');
                return nuevoCorte;
            });
        } catch (error) {
            console.error("Error cierre:", error);
            throw error;
        } finally {
            setIsShiftProcessing(false);
        }
    };

    return {
        isShiftProcessing,
        abrirCajaPOS,
        cerrarCaja
    };
};
