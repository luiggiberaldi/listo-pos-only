
import { db } from '../../db';
import { generarReporteZ } from '../../utils/reportUtils';
import { timeProvider } from '../../utils/TimeProvider';
import { DEFAULT_CAJA } from '../../config/cajaDefaults';

/**
 * Servicio de Turnos (Shift Service)
 * Maneja la lógica de cierre de caja (Corte Z) y arqueo.
 */
export const ShiftService = {

    /**
     * Realiza el cierre de caja (Corte Z)
     * @param {Object} usuario - Usuario que realiza el cierre
     * @param {Object} datosInyectados - Datos extra para el reporte (ej: conteo de efectivo)
     * @param {Function} playSound - Función opcional para feedback
     */
    cerrarCaja: async (usuario, datosInyectados = {}, playSound, cajaId = DEFAULT_CAJA) => {
        // Validación de Estado
        const sesion = await db.caja_sesion.get(cajaId);
        if (!sesion || !sesion.isAbierta) throw new Error("Caja ya está cerrada.");

        try {
            // Transaction Scope: Ventas, Logs, Caja, Cortes
            const nuevoCorte = await db.transaction('rw', db.ventas, db.logs, db.caja_sesion, db.cortes, async () => {
                const ventasFrescas = await db.ventas.toArray();

                // Filter pending sales for Z Cut
                const ventasParaCierre = ventasFrescas.filter(v => !v.corteId && v.status === 'COMPLETADA');

                // 0. Calcular Totales de Egresos Atómicos del Turno
                const inicioSesion = timeProvider.date(sesion.fechaApertura);
                const finSesion = timeProvider.now();

                const logsTurno = await db.logs
                    .where('fecha')
                    .between(inicioSesion.toISOString(), finSesion.toISOString())
                    .toArray();

                const egresos = {
                    gastosUSD: logsTurno
                        .filter(l => l.tipo === 'GASTO_CAJA' && (!l.meta?.moneda || l.meta?.moneda === 'USD'))
                        .reduce((acc, l) => acc + (parseFloat(l.cantidad) || 0), 0),
                    gastosBS: logsTurno
                        .filter(l => l.tipo === 'GASTO_CAJA' && l.meta?.moneda === 'VES')
                        .reduce((acc, l) => acc + (parseFloat(l.cantidad) || 0), 0),
                    totalConsumoInterno: logsTurno
                        .filter(l => l.tipo === 'CONSUMO_INTERNO')
                        .reduce((acc, l) => acc + (parseFloat(l.meta?.costoSnapshot || 0) * parseFloat(l.meta?.cantidadOriginal || 0)), 0)
                };

                // Generate Report
                const report = generarReporteZ(ventasParaCierre, sesion, usuario, {}, egresos);
                Object.assign(report, datosInyectados);

                // 1. Save Log
                await db.logs.add({
                    tipo: 'CORTE_Z',
                    fecha: timeProvider.toISOString(),
                    data: report,
                    usuarioId: usuario?.id || 'sys',
                    usuarioNombre: usuario?.nombre || 'Sistema'
                });

                // 2. Mark sales as Cut
                const idsVentas = ventasParaCierre.map(v => v.id);
                if (idsVentas.length > 0) {
                    await db.ventas.where('id').anyOf(idsVentas).modify({ corteId: report.corteRef });
                }

                // 3. Persist Z Cut in History (Logic moved from CajaEstadoProvider/useShiftManager)
                const corteFinal = {
                    id: `Z-${timeProvider.timestamp()}`,
                    fecha: timeProvider.toISOString(),
                    idApertura: sesion.idApertura,
                    cajaId, // Multi-caja: etiquetar corte
                    balancesApertura: sesion.balancesApertura,
                    usuario: sesion.usuarioApertura,
                    balancesFinales: sesion.balances,
                    ...report,
                    ...datosInyectados
                };
                await db.cortes.put(corteFinal);

                // 4. Close Session (Delete Active)
                await db.caja_sesion.delete(cajaId);

                return report;
            });

            if (playSound) playSound('CLICK');
            return nuevoCorte;

        } catch (error) {
            console.error("Error cierre:", error);
            throw error;
        }
    }
};
