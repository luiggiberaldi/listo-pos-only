/**
 * 🧠 GHOST CONTEXT INJECTOR
 * Captura el estado "vivo" de la aplicación para dárselo al LLM.
 */

// Como estamos fuera de componentes React, necesitamos acceder a los stores directamente.
// Asumimos que los stores exportan 'useStore.getState()' si son vanilla zustand,
// o necesitamos importar la instancia vanilla.
// En este proyecto, los stores son hooks (useCartStore), pero Zustand tiene la API .getState() en el hook.

import { useCartStore } from '../../stores/useCartStore';
import { useUIStore } from '../../stores/useUIStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { db } from '../../db'; // 🔌 Phase 3: DB Access

export const getChatContext = () => {
    // 1. Detectar Ruta Actual
    const location = window.location.hash;

    // 2. Extraer Estados
    const cartState = useCartStore.getState();
    const uiState = useUIStore.getState();
    const authState = useAuthStore.getState();

    return {
        screen: location || 'unknown',
        user: authState.usuario?.nombre || 'Anónimo',
        active_modal: uiState.activeModal || 'NINGUNO',
        cart: {
            items_count: cartState.carrito.length,
            total: cartState.total || 0,
            has_items: cartState.carrito.length > 0
        },
        // Capturamos el último error si existiera en algún store de diagnóstico
        system_time: new Date().toISOString()
    };
};

/**
 * ⚡ ASYNC DEEP CONTEXT (For AI Brain)
 * Recupera datos pesados de la BD (Ventas, Inventario crítico).
 */
export const getFullContext = async () => {
    // 1. Sync State (Fast)
    const syncCtx = getChatContext();

    // 2. Async State (DB)
    try {
        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0)).getTime();

        // Parallel Queries for Speed
        const [sales, lowStock] = await Promise.all([
            db.ventas.where('fecha').aboveOrEqual(startOfDay).toArray(),
            db.productos.where('stock').below(5).count()
        ]);

        const totalSales = sales.reduce((acc, s) => acc + (s.totalVenta || 0), 0);

        return {
            ...syncCtx,
            financial: {
                today_sales: totalSales,
                sales_count: sales.length,
                low_stock_items: lowStock
            },
            timestamp: new Date().toISOString()
        };
    } catch (e) {
        console.warn("Error retrieving deep context:", e);
        return syncCtx; // Fallback to synced only
    }
};
