// 👻 GHOST AUDIT INTERCEPTORS — V.1.0
// Hooks into existing stores/services to emit audit events.
// This file is imported once at app startup (side-effect only).

import ghostEventBus, { GHOST_CATEGORIES as C, GHOST_SEVERITY as S } from './ghostEventBus';
import { useInventoryStore } from '../../stores/useInventoryStore';
import { usePosCalcStore } from '../../stores/usePosCalcStore';

// ─── 1. SALE EVENTS ───
// Subscribe to POS calc store for sale completions
let _prevVentasCount = 0;

export function initSaleInterceptor() {
    usePosCalcStore.subscribe((state) => {
        // Detect new sale by watching if a total was just cleared (sale completed)
        // A more reliable hook will be added directly in useSaleFinalizer
    });
}

/**
 * Call this directly from useSaleFinalizer after a sale is saved.
 * This is the most reliable way to capture sale events.
 */
export function emitSaleCompleted(saleData) {
    ghostEventBus.emit(C.SALE, 'sale_completed', {
        total: saleData.totalGeneral,
        items: saleData.items?.length || 0,
        paymentMethods: saleData.pagos?.map(p => p.tipo) || [],
        currency: saleData.moneda || 'USD',
        clienteId: saleData.clienteId || null,
        tasa: saleData.tasa,
        hasDebt: (saleData.saldoPendiente || 0) > 0.01,
        hasChange: (saleData.vuelto || 0) > 0.01
    }, S.INFO);
}

export function emitSaleCancelled(reason) {
    ghostEventBus.emit(C.SALE, 'sale_cancelled', { reason }, S.WARN);
}

// ─── 2. INVENTORY EVENTS ───
let _prevProductCount = 0;

export function initInventoryInterceptor() {
    useInventoryStore.subscribe((state) => {
        const currentCount = state.productos?.length || 0;

        if (_prevProductCount > 0 && currentCount !== _prevProductCount) {
            const diff = currentCount - _prevProductCount;
            if (diff > 0) {
                ghostEventBus.emit(C.INVENTORY, 'products_added', {
                    count: diff,
                    totalProducts: currentCount
                }, S.INFO);
            } else if (diff < 0) {
                ghostEventBus.emit(C.INVENTORY, 'products_removed', {
                    count: Math.abs(diff),
                    totalProducts: currentCount
                }, diff < -5 ? S.WARN : S.INFO);
            }
        }

        _prevProductCount = currentCount;
    });
}

export function emitStockAdjusted(productName, oldStock, newStock, reason) {
    ghostEventBus.emit(C.INVENTORY, 'stock_adjusted', {
        product: productName,
        oldStock,
        newStock,
        delta: newStock - oldStock,
        reason: reason || 'manual'
    }, Math.abs(newStock - oldStock) > 50 ? S.WARN : S.INFO);
}

export function emitBulkImport(count) {
    ghostEventBus.emit(C.INVENTORY, 'bulk_import', {
        productsImported: count
    }, S.INFO);
}

// ─── 3. FINANCE EVENTS ───
export function emitExpenseCreated(data) {
    ghostEventBus.emit(C.FINANCE, 'expense_created', {
        amount: data.monto,
        type: data.tipo,
        description: data.descripcion?.slice(0, 50)
    }, data.monto > 100 ? S.WARN : S.INFO);
}

export function emitDebtPaid(clienteName, amount) {
    ghostEventBus.emit(C.FINANCE, 'debt_paid', {
        cliente: clienteName,
        amount
    }, S.INFO);
}

export function emitTasaUpdated(oldTasa, newTasa, source) {
    ghostEventBus.emit(C.FINANCE, 'tasa_updated', {
        oldTasa,
        newTasa,
        source: source || 'manual',
        changePercent: oldTasa > 0 ? ((newTasa - oldTasa) / oldTasa * 100).toFixed(1) : 0
    }, Math.abs(newTasa - oldTasa) / Math.max(oldTasa, 1) > 0.05 ? S.WARN : S.INFO);
}

// ─── 4. CONFIG EVENTS ───
export function emitConfigChanged(field, oldValue, newValue) {
    ghostEventBus.emit(C.CONFIG, 'setting_changed', {
        field,
        from: typeof oldValue === 'object' ? '[Object]' : oldValue,
        to: typeof newValue === 'object' ? '[Object]' : newValue
    }, S.INFO);
}

// ─── 5. SESSION EVENTS ───
export function emitCajaOpened(cajaId, montoApertura) {
    ghostEventBus.emit(C.SESSION, 'caja_opened', {
        cajaId,
        montoApertura
    }, S.INFO);
}

export function emitCajaClosed(cajaId, totals) {
    ghostEventBus.emit(C.SESSION, 'caja_closed', {
        cajaId,
        totalVentas: totals?.totalVentas,
        totalIngresos: totals?.totalIngresos
    }, S.INFO);
}

export function emitCorteZ(corteData) {
    ghostEventBus.emit(C.SESSION, 'corte_z', {
        totalVentas: corteData?.totalVentas,
        totalIngresos: corteData?.totalIngresos,
        diferencia: corteData?.diferencia,
        cajaId: corteData?.cajaId
    }, S.INFO);
}

// ─── 6. ERROR EVENTS ───
export function initErrorInterceptor() {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
        ghostEventBus.emit(C.ERROR, 'runtime_error', {
            message: event.message?.slice(0, 200),
            filename: event.filename?.split('/').pop(),
            line: event.lineno,
            col: event.colno
        }, S.CRITICAL);
    });

    window.addEventListener('unhandledrejection', (event) => {
        ghostEventBus.emit(C.ERROR, 'unhandled_promise', {
            reason: String(event.reason)?.slice(0, 200)
        }, S.CRITICAL);
    });
}

// ─── 7. STATE CHANGE BRIDGE ───
// Bridge existing window.GhostBuffer to ghostEventBus
// This captures ALL Zustand state changes already logged by ghostMiddleware
let _lastBridgedIndex = 0;

export function bridgeGhostBuffer() {
    if (!window.GhostBuffer) return;

    const logs = window.GhostBuffer.getLogs();
    const newLogs = logs.slice(_lastBridgedIndex);

    for (const log of newLogs) {
        // Only bridge meaningful changes (skip noise)
        const diffKeys = Object.keys(log.diff || {});
        if (diffKeys.length === 0) continue;

        // Skip high-frequency noise (selectedIndex, busqueda typing, etc.)
        const noiseKeys = ['selectedIndex', 'busqueda', 'debouncedBusqueda'];
        if (diffKeys.every(k => noiseKeys.includes(k))) continue;

        ghostEventBus.emit(C.STATE, 'state_change', {
            store: log.store,
            changedKeys: diffKeys.join(', ')
        }, S.INFO);
    }

    _lastBridgedIndex = logs.length;
}

// ─── INIT ALL INTERCEPTORS ───
export function initAllInterceptors() {
    initInventoryInterceptor();
    initErrorInterceptor();

    // Bridge GhostBuffer every 60s
    setInterval(bridgeGhostBuffer, 60_000);

    // Auto-purge old events (keep 30 days)
    ghostEventBus.purgeOld(30);

    console.log('👻 [Ghost Auditor] All interceptors active');
}
