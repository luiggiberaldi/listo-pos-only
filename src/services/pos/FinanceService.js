
import { db } from '../../db';
import math from '../../utils/mathCore';
import { timeProvider } from '../../utils/TimeProvider';

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
    registrarGasto: async ({ monto, moneda, medio, motivo, usuario }) => {
        // Validaciones Bese
        if (!monto || monto <= 0) throw new Error("Monto inválido");
        if (!usuario || !usuario.id) throw new Error("Usuario requerido");

        // Transaction Scope: Caja (Sesión), Logs
        return await db.transaction('rw', db.caja_sesion, db.logs, async () => {

            // 1. Validar Estado de Caja
            const currentSession = await db.caja_sesion.get('actual');
            if (!currentSession || !currentSession.isAbierta) {
                // TODO: Permitir configuración para gastos con caja cerrada? Por ahora STRICT.
                throw new Error("Caja cerrada. No se pueden registrar salidas.");
            }

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

            await db.caja_sesion.update('actual', { balances: newBalances });

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
                    balanceSnapshot: newBalances // Snapshot útil para auditoría
                }
            });

            return { success: true, logId };
        });
    },

    /**
     * Actualiza los balances de caja de forma atómica (Para usos externos si es necesario).
     * Nota: registrarGasto ya hace esto internamente para atomicidad.
     */
    actualizarBalances: async (transactionType, payments = [], change = []) => {
        return await db.transaction('rw', db.caja_sesion, async () => {
            const currentSession = await db.caja_sesion.get('actual');
            if (!currentSession || !currentSession.isAbierta) throw new Error("Caja cerrada");

            // ... Lógica espejo de SalesService ...
            // Por ahora FinanceService se enfoca en Gastos.
            // SalesService maneja Ingresos por Ventas.
            return true;
        });
    }
};
