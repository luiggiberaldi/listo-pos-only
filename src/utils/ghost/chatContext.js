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
import { useConfigStore } from '../../stores/useConfigStore'; // 🟢 Added Config Store
import { db } from '../../db'; // 🔌 Phase 3: DB Access
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from '../../config/permissions';

/**
 * 🔐 Permission check helper
 */
function _hasPermission(permission) {
    const usuario = useAuthStore.getState().usuario;
    if (!usuario) return false;
    const role = usuario.roleId;
    if (role === ROLES.OWNER || usuario.tipo === 'ADMIN' || usuario.id === 1) return true;
    const rolePerms = ROLE_PERMISSIONS[role] || [];
    const customPerms = usuario.customPermissions || [];
    return [...rolePerms, ...customPerms].includes(permission);
}

export const getChatContext = () => {
    // 1. Detectar Ruta Actual
    const location = window.location.hash;

    // 2. Extraer Estados
    const cartState = useCartStore.getState();
    const uiState = useUIStore.getState();
    const authState = useAuthStore.getState();

    return {
        screen: location || 'unknown',
        user: authState.usuario?.nombre || 'Amigo',
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

        // 💰 Get Config (Exchange Rate)
        const configState = useConfigStore.getState().configuracion;

        // 🏪 Get Plan / License Info
        const license = useConfigStore.getState().license || {};
        const authState = useAuthStore.getState();

        // 🔐 DATA SECURITY: Check if user is allowed to see sales
        const canSeeSales = _hasPermission(PERMISSIONS.REP_VER_DASHBOARD);

        return {
            ...syncCtx,
            user_role: authState.usuario?.rol || 'desconocido',
            plan: {
                name: license.plan || 'bodega',
                is_demo: license.isDemo || false,
                quota_limit: license.isDemo ? (license.quotaLimit || 0) : null,
                usage_count: license.isDemo ? (license.usageCount || 0) : null,
                remaining: license.isDemo ? Math.max(0, (license.quotaLimit || 0) - (license.usageCount || 0)) : null,
            },
            financial: {
                today_sales: canSeeSales ? totalSales : 'ACCESO_DENEGADO (Solo Administrador)',
                sales_count: canSeeSales ? sales.length : 'ACCESO_DENEGADO',
                low_stock_items: lowStock,
                exchange_rate: configState?.tasa || 0,
                currency_type: configState?.tipoTasa || 'USD'
            },
            timestamp: new Date().toISOString()
        };
    } catch (e) {
        console.warn("Error retrieving deep context:", e);
        return syncCtx; // Fallback to synced only
    }
};
