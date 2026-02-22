import { useCartStore } from '../stores/useCartStore';
import { useUIStore } from '../stores/useUIStore';
import { useInventoryStore } from '../stores/useInventoryStore';
import { useConfigStore } from '../stores/useConfigStore';
import { useAuthStore } from '../stores/useAuthStore';
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from '../config/permissions';

/**
 * 🔐 Permission check helper (outside React hooks)
 */
function _hasPermission(permission) {
    const usuario = useAuthStore.getState().usuario;
    if (!usuario) return false;
    const role = usuario.roleId;
    // Owner/Admin always passes
    if (role === ROLES.OWNER || usuario.tipo === 'ADMIN' || usuario.id === 1) return true;
    const rolePerms = ROLE_PERMISSIONS[role] || [];
    const customPerms = usuario.customPermissions || [];
    return [...rolePerms, ...customPerms].includes(permission);
}

/**
 * 🛠️ GHOST TOOLS DISPATCHER
 * Permite a la IA ejecutar acciones reales en el sistema.
 */
export const GhostTools = {
    // 🛒 CART ACTIONS
    add_to_cart: async (identifier, quantity = 1) => {
        try {
            const inventory = useInventoryStore.getState();
            const cart = useCartStore.getState();

            // 🔄 SUPPORT FOR MULTIPLE PRODUCTS (Array)
            const identifiers = Array.isArray(identifier) ? identifier : [identifier];
            const results = [];

            for (const id of identifiers) {
                const searchResults = inventory.searchProductos(id.toString(), 'Todo');

                if (searchResults.length > 0) {
                    const product = searchResults[0];
                    const qty = parseFloat(quantity) || 1;

                    // 🛡️ STATE DETECTION: Check if already in cart
                    const existingItem = cart.items.find(item => item.id === product.id);
                    if (existingItem) {
                        results.push({
                            success: false,
                            product: product.nombre,
                            reason: 'already_in_cart'
                        });
                        continue;
                    }

                    cart.agregarAlCarrito(product, qty);
                    results.push({
                        success: true,
                        product: product.nombre,
                        qty
                    });
                } else {
                    results.push({
                        success: false,
                        product: id,
                        reason: 'not_found'
                    });
                }
            }

            // Build response message
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);

            if (successful.length === 0) {
                return {
                    success: false,
                    message: `❌ No pude agregar ningún producto. ${failed.map(f => f.product).join(', ')} no encontrados.`
                };
            }

            const successMsg = successful.map(s => `${s.qty}x ${s.product}`).join(', ');
            const failMsg = failed.length > 0 ? ` (No encontrados: ${failed.map(f => f.product).join(', ')})` : '';

            return {
                success: true,
                message: `✅ Agregado: ${successMsg}${failMsg}`,
                data: { added: successful, failed }
            };
        } catch (e) {
            return { success: false, message: "Error al agregar al carrito." };
        }
    },

    clear_cart: async () => {
        useCartStore.getState().limpiarCarrito();
        return { success: true, message: "🧹 Carrito vaciado." };
    },

    // ⚙️ CONFIG ACTIONS — EXCHANGE RATE
    /**
     * set_exchange_rate — Enhanced with BCV, Euro, and rounding support
     * @param {Object} params
     * @param {number}  [params.rate]      — Manual rate value (e.g., 450)
     * @param {string}  [params.source]    — 'manual' | 'bcv' (default: 'manual' if rate given, 'bcv' if not)
     * @param {string}  [params.currency]  — 'USD' | 'EUR' (default: 'USD')
     * @param {string}  [params.rounding]  — 'exacto' | 'multiplo5' | 'multiplo10' (default: 'exacto')
     */
    set_exchange_rate: async (params = {}) => {
        try {
            // 🔐 PERMISSION CHECK
            if (!_hasPermission(PERMISSIONS.CONF_FINANZAS_EDITAR)) {
                return {
                    success: false,
                    message: "🔒 No tienes permiso para cambiar la tasa. Necesitas el permiso de Finanzas."
                };
            }

            const { rate, source = 'manual', currency = 'USD', rounding = 'exacto' } = params;

            // === MODE 1: MANUAL RATE ===
            if (source === 'manual') {
                const numericRate = parseFloat(rate);
                if (isNaN(numericRate) || numericRate <= 0) {
                    return { success: false, message: "❌ Tasa inválida. Debe ser un número positivo." };
                }

                const configStore = useConfigStore.getState();
                configStore.setConfiguracion({
                    ...configStore.configuracion,
                    tasa: numericRate,
                    fechaTasa: new Date().toISOString(),
                    fuenteTasa: 'Manual (Ghost)'
                });

                return {
                    success: true,
                    message: `✅ Tasa actualizada manualmente a ${numericRate} Bs.`,
                    data: { rate: numericRate, source: 'manual' }
                };
            }

            // === MODE 2: BCV AUTO-FETCH ===
            if (source === 'bcv') {
                const curr = currency.toUpperCase() === 'EUR' ? 'EUR' : 'USD';
                const roundMode = rounding || 'exacto';

                // Call the store's BCV fetcher (will show Swal loading)
                const configStore = useConfigStore.getState();
                const result = await configStore.obtenerTasaBCV(true, curr, roundMode);

                if (result) {
                    const currLabel = curr === 'EUR' ? 'Euro' : 'Dólar';
                    const roundLabel = roundMode === 'multiplo5' ? ' (redondeado a múltiplos de 5)'
                        : roundMode === 'multiplo10' ? ' (redondeado a múltiplos de 10)'
                            : roundMode === 'entero' ? ' (redondeado al entero)' : ' (exacto)';

                    return {
                        success: true,
                        message: `✅ Tasa ${currLabel} BCV actualizada a ${result} Bs${roundLabel}.`,
                        data: { rate: result, source: 'bcv', currency: curr, rounding: roundMode }
                    };
                } else {
                    return {
                        success: false,
                        message: "❌ No se pudo obtener la tasa BCV. Verifica tu conexión a internet e inténtalo nuevamente."
                    };
                }
            }

            return { success: false, message: "❌ Fuente no reconocida. Usa 'manual' o 'bcv'." };
        } catch (e) {
            return { success: false, message: "❌ Error al cambiar la tasa: " + e.message };
        }
    },

    // 🔍 INVENTORY ACTIONS
    search_inventory: async (term) => {
        const results = useInventoryStore.getState().searchProductos(term, 'Todo');
        const count = results.length;
        const top5 = results.slice(0, 5).map(p => `${p.nombre} ($${p.precio})`).join(', ');

        return {
            success: true,
            message: `🔍 Encontré ${count} productos: ${top5}${count > 5 ? '...' : ''}`,
            data: { count, results: results.slice(0, 5) }
        };
    },

    // 🖥️ UI ACTIONS
    open_modal: async (modalName) => {
        // Mapeo de nombres amigables a claves de modal internas
        const map = {
            'pagar': 'PAYMENT_MODAL',
            'checkout': 'PAYMENT_MODAL',
            'cobrar': 'PAYMENT_MODAL',
            'clientes': 'CLIENTS_MODAL',
            'corte': 'Z_REPORT_MODAL',
            'config': 'CONFIG_MODAL'
        };

        const internalKey = map[modalName.toLowerCase()] || modalName;
        useUIStore.getState().openModal(internalKey);
        return { success: true, message: `🔳 Abriendo modal: ${internalKey}` };
    },

    close_modal: async () => {
        useUIStore.getState().closeModal();
        return { success: true, message: "Modal cerrado." };
    },

    navigate_to: async (path) => {
        window.location.hash = path.startsWith('/') ? '#' + path : '#' + path;
        return { success: true, message: `🚀 Navegando a ${path}` };
    },

    // 🧠 DISPATCHER
    dispatch: async (actionName, params) => {
        console.log(`⚡ GhostTools Dispatch: ${actionName}`, params);
        if (!GhostTools[actionName]) return { success: false, message: `❌ Herramienta ${actionName} no existe.` };

        try {
            // Mapping dynamic params to function signature
            switch (actionName) {
                case 'add_to_cart': return await GhostTools.add_to_cart(params.identifier, params.quantity);
                case 'search_inventory': return await GhostTools.search_inventory(params.term);
                case 'open_modal': return await GhostTools.open_modal(params.modalName);
                case 'navigate_to': return await GhostTools.navigate_to(params.path);
                case 'clear_cart': return await GhostTools.clear_cart();
                case 'set_exchange_rate': return await GhostTools.set_exchange_rate(params);
                default: return { success: false, message: "Acción no soportada por Dispatcher." };
            }
        } catch (e) {
            console.error(e);
            return { success: false, message: `Error ejecutando ${actionName}` };
        }
    }
};
