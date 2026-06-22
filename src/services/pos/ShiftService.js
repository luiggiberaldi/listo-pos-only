
import { db } from '../../db';
import { generarReporteZ } from '../../utils/reportUtils';
import { timeProvider } from '../../utils/TimeProvider';
import { DEFAULT_CAJA } from '../../config/cajaDefaults';
import { appendAuditEntry } from '../../utils/auditChain';
import math from '../../utils/mathCore';
import { dispatchCorteCompleted } from '../lanSyncDispatcher';

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
            // Transaction Scope: Ventas, Logs, Caja, Cortes, Audit Chain
            const nuevoCorte = await db.transaction('rw', db.ventas, db.logs, db.caja_sesion, db.cortes, db.audit_chain, async () => {
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

                // 💰 CASH COUNT RECONCILIATION
                // If physical cash count is provided, compute variance against system balance
                const conteoFisico = datosInyectados.conteoFisico;
                let reconciliacion = null;
                if (conteoFisico) {
                    const balanceSistemaUSD = math.round(sesion.balances?.efectivoUSD || 0);
                    const balanceSistemaBS = math.round(sesion.balances?.efectivoBS || 0);
                    const conteoUSD = math.round(parseFloat(conteoFisico.usd) || 0);
                    const conteoBS = math.round(parseFloat(conteoFisico.bs) || 0);

                    const varianzaUSD = math.round(math.sub(conteoUSD, balanceSistemaUSD));
                    const varianzaBS = math.round(math.sub(conteoBS, balanceSistemaBS));

                    // Threshold: flag if variance exceeds $1 USD or Bs equivalent
                    const VARIANCE_THRESHOLD_USD = 1.00;
                    const isDiscrepancy = Math.abs(varianzaUSD) > VARIANCE_THRESHOLD_USD ||
                        Math.abs(varianzaBS) > (VARIANCE_THRESHOLD_USD * (sesion.tasa || 1));

                    reconciliacion = {
                        conteoFisico: { usd: conteoUSD, bs: conteoBS },
                        balanceSistema: { usd: balanceSistemaUSD, bs: balanceSistemaBS },
                        varianza: { usd: varianzaUSD, bs: varianzaBS },
                        isDiscrepancy,
                        severity: isDiscrepancy
                            ? (Math.abs(varianzaUSD) > 5 ? 'HIGH' : 'MEDIUM')
                            : 'OK'
                    };

                    report.reconciliacion = reconciliacion;

                    if (isDiscrepancy) {
                        console.warn(`⚠️ [RECONCILIACIÓN] Discrepancia detectada: USD ${varianzaUSD.toFixed(2)}, BS ${varianzaBS.toFixed(2)}`);
                    }
                }

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
                    reconciliacion: reconciliacion || null,
                    _lww_updated_at: Date.now(),
                    ...report,
                    ...datosInyectados
                };

                // Guard: Prevent duplicate Z-cuts for same session
                const existingCorte = await db.cortes.where('idApertura').equals(sesion.idApertura).first();
                if (existingCorte) {
                    throw new Error("Ya existe un corte Z para esta sesión. No se permite duplicar.");
                }

                await db.cortes.put(corteFinal);

                // 🔐 AUDIT CHAIN: Log Z-cut to tamper-proof trail
                appendAuditEntry('Z_CUT_COMPLETED', {
                    corteId: corteFinal.id,
                    cajaId,
                    ventasCount: ventasParaCierre.length,
                    usuario: usuario?.nombre,
                    reconciliacion: reconciliacion ? {
                        varianzaUSD: reconciliacion.varianza.usd,
                        severity: reconciliacion.severity
                    } : null
                }).catch(err => console.warn('Audit chain write failed (non-blocking):', err));

                // 4. Close Session (Delete Active)
                await db.caja_sesion.delete(cajaId);

                // [V4] LAN SYNC: Dispatch corte to principal
                dispatchCorteCompleted(corteFinal);

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
