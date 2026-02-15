
import { db } from '../../db';
import math from '../../utils/mathCore';
import { timeProvider } from '../../utils/TimeProvider';
import { DEFAULT_CAJA } from '../../config/cajaDefaults';

/**
 * Servicio de Finanzas (Finance Service)
 * Maneja la lógica de registro de gastos y salidas de caja.
 * Reemplaza la lógica interna compleja de useFinance y useCajaEstado.
 */
export const FinanceService = {

    /**
     * Registra un gasto monetario (Salida de Caja).
     * @param {Object} datos - { monto, moneda, medio, motivo, usuario }
     */
    registrarGasto: async ({ monto, moneda, medio, motivo, usuario, cajaId = DEFAULT_CAJA }) => {
        // Validaciones Bese
        if (!monto || monto <= 0) throw new Error("Monto inválido");
        if (!usuario || !usuario.id) throw new Error("Usuario requerido");

        // Transaction Scope: Caja (Sesión), Logs
        return await db.transaction('rw', db.caja_sesion, db.logs, db.config, async () => {

            // 1. Validar Estado de Caja
            const currentSession = await db.caja_sesion.get(cajaId);
            if (!currentSession || !currentSession.isAbierta) {
                // TODO: Permitir configuración para gastos con caja cerrada? Por ahora STRICT.
                throw new Error("La caja está cerrada. Abre un turno desde Ventas para registrar movimientos.");
            }

            // 1.1 Obtener Tasa Actual (Snapshot)
            const configGeneral = await db.config.get('general');
            const tasaActual = parseFloat(configGeneral?.tasa) || 1;

            // 2. Actualizar Balances (Salida)
            const newBalances = { ...currentSession.balances };
            const amount = math.round(parseFloat(monto));

            if (moneda === 'USD') {
                if (medio === 'CASH') newBalances.usdCash = math.round(Math.max(0, newBalances.usdCash - amount));
                else newBalances.usdDigital = math.round(newBalances.usdDigital - amount);
            } else if (moneda === 'VES') {
                if (medio === 'CASH') newBalances.vesCash = math.round(Math.max(0, newBalances.vesCash - amount));
                else newBalances.vesDigital = math.round(newBalances.vesDigital - amount);
            }

            await db.caja_sesion.update(cajaId, { balances: newBalances });

            // 3. Registrar Log de Auditoría
            const logId = await db.logs.add({
                fecha: timeProvider.toISOString(),
                tipo: 'GASTO_CAJA',
                producto: 'GASTO OPERATIVO',
                cantidad: amount,
                stockFinal: 0,
                referencia: moneda,
                detalle: motivo,
                usuarioId: usuario.id,
                usuarioNombre: usuario.nombre || 'Sistema',
                meta: {
                    moneda,
                    medio,
                    tasaSnapshot: tasaActual, // 📸 SNAPSHOT HISTÓRICO
                    balanceSnapshot: newBalances // Snapshot útil para auditoría
                }
            });

            return { success: true, logId };
        });
    },

    /**
     * 🛡️ BLINDAJE: Revertir Gasto (Devolver dinero a Caja)
     * Usado cuando se anula un adelanto o se corrige un error.
     */
    revertirGasto: async (logIdOriginal, motivoReversion, cajaId = DEFAULT_CAJA) => {
        return await db.transaction('rw', db.caja_sesion, db.logs, async () => {
            // 1. Obtener Log Original
            const log = await db.logs.get(logIdOriginal);
            if (!log) throw new Error("Registro de gasto no encontrado.");

            // 2. Validar Estado Caja
            const currentSession = await db.caja_sesion.get(cajaId);
            if (!currentSession || !currentSession.isAbierta) {
                // TODO: Manejar reversion con caja cerrada (Quizás "Ingreso Diferido"?)
                // Por ahora, asumimos que solo se puede revertir con caja abierta para cuadrar.
                throw new Error("Caja cerrada. No se puede revertir el dinero a la gaveta.");
            }

            // 3. Restaurar Dinero (Inverse of registrarGasto)
            const meta = log.meta || {};
            const monto = parseFloat(log.cantidad || 0);
            const moneda = meta.moneda || 'USD'; // Fallback
            const medio = meta.medio || 'CASH';

            const newBalances = { ...currentSession.balances };

            if (moneda === 'USD') {
                if (medio === 'CASH') newBalances.usdCash = math.round(newBalances.usdCash + monto);
                else newBalances.usdDigital = math.round(newBalances.usdDigital + monto);
            } else if (moneda === 'VES') {
                if (medio === 'CASH') newBalances.vesCash = math.round(newBalances.vesCash + monto);
                else newBalances.vesDigital = math.round(newBalances.vesDigital + monto);
            }

            await db.caja_sesion.update(cajaId, { balances: newBalances });

            // 4. Update Log Original (Marcar como Revertido)
            await db.logs.update(logIdOriginal, {
                tipo: 'GASTO_REVERTIDO',
                detalle: `(REVERTIDO) ${log.detalle}`
            });

            // 5. Nuevo Log de Auditoría (Entrada por Reversión)
            await db.logs.add({
                fecha: timeProvider.toISOString(),
                tipo: 'INGRESO_REVERSION',
                producto: 'REVERSION GASTO',
                cantidad: monto,
                referencia: `REF-${logIdOriginal}`,
                detalle: `Dinero devuelto a caja: ${motivoReversion}`,
                usuarioId: log.usuarioId,
                usuarioNombre: log.usuarioNombre,
                meta: {
                    reversionDe: logIdOriginal,
                    balanceSnapshot: newBalances
                }
            });

            return { success: true, message: "Dinero devuelto a caja correctamente." };
        });
    },

    /**
     * Actualiza los balances de caja de forma atómica (Para usos externos si es necesario).
     * Nota: registrarGasto ya hace esto internamente para atomicidad.
     */
    actualizarBalances: async (transactionType, payments = [], change = [], cajaId = DEFAULT_CAJA) => {
        return await db.transaction('rw', db.caja_sesion, async () => {
            const currentSession = await db.caja_sesion.get(cajaId);
            if (!currentSession || !currentSession.isAbierta) throw new Error("Caja cerrada");

            // ⚠️ STUB INTENCIONAL: FinanceService solo maneja Gastos (salidas de caja).
            // Los ingresos por ventas se procesan en SalesService.actualizarBalances.
            // NO implementar lógica de ingresos aquí para evitar doble conteo.
            console.warn('FinanceService.actualizarBalances: NO-OP by design. Use SalesService for sales.');
            return true;
        });
    },

    /**
     * Obtiene los gastos registrados en un rango de fechas.
     */
    getReporteGastos: async (fechaInicio, fechaFin) => {
        // Convertir a Date objects para comparación
        const start = new Date(fechaInicio);
        const end = new Date(fechaFin);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // Query Logs: 'GASTO_CAJA', 'GASTO_REVERTIDO' y 'CONSUMO_INTERNO'
        const logs = await db.logs
            .where('fecha')
            .between(start.toISOString(), end.toISOString(), true, true)
            .and(log => log.tipo === 'GASTO_CAJA' || log.tipo === 'GASTO_REVERTIDO' || log.tipo === 'CONSUMO_INTERNO')
            .toArray();

        return logs;
    }
};
