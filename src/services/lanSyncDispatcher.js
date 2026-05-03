// ✅ SYSTEM IMPLEMENTATION - V. 4.0
// Archivo: src/services/lanSyncDispatcher.js
// Thin dispatcher: checks LAN role and forwards data to lanSyncService
// Called from SalesService, FinanceService, ShiftService, useCustomers after mutations

import { sendStockUpdate, sendSale, sendCorte, sendExpense, sendClientUpdate } from './lanSyncService';

/** Check if this register is a secondary (needs to sync to principal) */
function isSecundaria() {
    try {
        const config = localStorage.getItem('listo-lan-config');
        if (config) {
            const parsed = JSON.parse(config);
            return parsed.role === 'secundaria';
        }
    } catch { /* ignore */ }
    return false;
}

/** After a sale completes on secondary, sync sale + stock deltas to principal */
export function dispatchSaleCompleted(ventaData, items) {
    if (!isSecundaria()) return;

    try {
        // Send sale record
        sendSale(ventaData);

        // Send stock deltas for each item sold
        if (items && Array.isArray(items)) {
            for (const item of items) {
                let factor = 1;
                if (item.unidadVenta === 'bulto') {
                    factor = parseFloat(item.jerarquia?.bulto?.contenido || 1);
                    if (item.jerarquia?.paquete?.activo) factor *= parseFloat(item.jerarquia?.paquete?.contenido || 1);
                } else if (item.unidadVenta === 'paquete') {
                    factor = parseFloat(item.jerarquia?.paquete?.contenido || 1);
                }
                const delta = -(item.cantidad * factor);
                sendStockUpdate(item.id, item.nombre, delta);
            }
        }
    } catch (e) {
        console.warn('[LAN DISPATCH] Error despachando venta:', e.message);
    }
}

/** After stock is reverted (sale void), sync positive deltas */
export function dispatchStockReverted(items) {
    if (!isSecundaria()) return;

    try {
        if (items && Array.isArray(items)) {
            for (const item of items) {
                let factor = 1;
                if (item.unidadVenta === 'bulto') {
                    factor = parseFloat(item.jerarquia?.bulto?.contenido || 1);
                    if (item.jerarquia?.paquete?.activo) factor *= parseFloat(item.jerarquia?.paquete?.contenido || 1);
                } else if (item.unidadVenta === 'paquete') {
                    factor = parseFloat(item.jerarquia?.paquete?.contenido || 1);
                }
                const delta = item.cantidad * factor;
                sendStockUpdate(item.id, item.nombre, delta);
            }
        }
    } catch (e) {
        console.warn('[LAN DISPATCH] Error despachando reversión de stock:', e.message);
    }
}

/** After client created/edited on secondary */
export function dispatchClientChanged(cliente) {
    if (!isSecundaria()) return;
    try {
        sendClientUpdate(cliente);
    } catch (e) {
        console.warn('[LAN DISPATCH] Error despachando cliente:', e.message);
    }
}

/** After Z-cut on secondary */
export function dispatchCorteCompleted(corteData) {
    if (!isSecundaria()) return;
    try {
        sendCorte(corteData);
    } catch (e) {
        console.warn('[LAN DISPATCH] Error despachando corte:', e.message);
    }
}

/** After expense registered on secondary */
export function dispatchExpenseRegistered(gastoData) {
    if (!isSecundaria()) return;
    try {
        sendExpense(gastoData);
    } catch (e) {
        console.warn('[LAN DISPATCH] Error despachando gasto:', e.message);
    }
}
