// ⚡ NON-REACTIVE DATABASE TRANSACTIONS FOR POS
// Archivo: src/services/pos/posDbTransactions.js
// Propósito: Desacoplar las escrituras pesadas de IndexedDB de los hooks reactivos de React, previniendo re-renders masivos.

import { db } from '../../db';
import { fixFloat, convertirABase } from '../../utils/mathUtils';
import { timeProvider } from '../../utils/TimeProvider';
import { ROLES, ROLE_PERMISSIONS, PERMISSIONS } from '../../config/permissions';
import { PLAN_REQUIREMENTS, hasFeature } from '../../config/planTiers';

/**
 * 🛡️ Cerebro de autorización no reactivo
 */
export const checkUserPermission = (usuarioActivo, permission) => {
    if (!usuarioActivo) return false;

    const userRole = usuarioActivo.roleId;

    // 0. Límites de Plan
    const requiredFeature = PLAN_REQUIREMENTS[permission];
    if (requiredFeature) {
        const currentPlanId = localStorage.getItem('listo_plan') || 'bodega';
        const planAllows = hasFeature(currentPlanId, requiredFeature);

        if (!planAllows) {
            if (usuarioActivo.id === 1 && localStorage.getItem('dev_mode') === 'true') {
                // Pass
            } else {
                return false;
            }
        }
    }

    // 1. Superuser override
    if (userRole === ROLES.OWNER || usuarioActivo.tipo === 'ADMIN' || usuarioActivo.id === 1) {
        return true;
    }

    // 2. Verificación base del rol
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];

    // 3. Permisos granulares
    const userCustomPermissions = usuarioActivo.customPermissions || [];
    const totalPermissions = new Set([...rolePermissions, ...userCustomPermissions]);

    return totalPermissions.has(permission);
};

const verifyPermission = (usuario, permiso, actionName) => {
    if (!checkUserPermission(usuario, permiso)) {
        console.warn(`⛔ [SECURITY-TRANSACTION] Intento bloqueado: ${actionName} por usuario ${usuario?.nombre || 'Desconocido'}`);
        throw new Error(`ACCESO DENEGADO: No tienes permiso para ${actionName}.`);
    }
};

/**
 * Registrar movimiento de Kardex (interno a la transacción)
 */
const logMovimientoInternal = async (usuarioActor, tipo, productId, productoNombre, cant, stockFinal, ref, detalle, metadata = null) => {
    const sysInfo = {
        ua: navigator.userAgent.substring(0, 100),
        page: window.location.hash || 'POS'
    };

    return await db.logs.add({
        fecha: timeProvider.toISOString(),
        tipo,
        productId: productId || null,
        producto: productoNombre,
        cantidad: cant,
        stockFinal,
        referencia: ref,
        detalle,
        usuarioId: usuarioActor?.id || 'sys',
        usuarioNombre: usuarioActor?.nombre || 'Sistema',
        meta: metadata,
        sysInfo
    });
};

/**
 * Transacción de Venta POS (No reactiva)
 */
export const transaccionVenta = async (itemsCarrito, usuarioVendedor) => {
    verifyPermission(usuarioVendedor, PERMISSIONS.POS_ACCESS, 'Realizar Venta');
    const referenciaLog = "Venta POS";

    await db.transaction('rw', db.productos, db.logs, async () => {
        for (const item of itemsCarrito) {
            const idKey = Number(item.id) || item.id;
            const prod = await db.productos.get(idKey);

            if (prod) {
                const factor = convertirABase(1, item.unidadVenta || 'unidad', prod.jerarquia);
                const descuentoTotal = fixFloat(item.cantidad * factor);
                let nuevoStock = fixFloat(prod.stock - descuentoTotal);

                // 🛡️ Stock mínimo floored a 0
                if (nuevoStock < 0) {
                    console.warn(`⚠️ [STOCK] "${prod.nombre}" iría a negativo (${nuevoStock}). Forzando a 0.`);
                    nuevoStock = 0;
                }

                await db.productos.update(idKey, { stock: nuevoStock });

                const smartMetadata = {
                    unidad: item.unidadVenta || 'unidad',
                    factor: factor,
                    cantidadOriginal: item.cantidad,
                    precioSnapshot: item.precio,
                    costoSnapshot: prod.costo || 0
                };

                await logMovimientoInternal(
                    usuarioVendedor,
                    'SALIDA_VENTA',
                    prod.id,
                    prod.nombre,
                    descuentoTotal,
                    nuevoStock,
                    referenciaLog,
                    'Venta',
                    smartMetadata
                );
            }
        }
    });
};

/**
 * Transacción de Anulación de Venta POS (No reactiva)
 */
export const transaccionAnulacion = async (itemsVenta, usuarioAnulador, motivo) => {
    verifyPermission(usuarioAnulador, PERMISSIONS.POS_VOID_TICKET, 'Anular Venta');

    await db.transaction('rw', db.productos, db.logs, async () => {
        for (const item of itemsVenta) {
            const idKey = Number(item.id) || item.id;
            const prod = await db.productos.get(idKey);

            if (prod) {
                const factor = convertirABase(1, item.unidadVenta || 'unidad', prod.jerarquia);
                const reintegroTotal = fixFloat(item.cantidad * factor);
                const nuevoStock = fixFloat(prod.stock + reintegroTotal);

                await db.productos.update(idKey, { stock: nuevoStock });

                const smartMetadata = {
                    unidad: item.unidadVenta || 'unidad',
                    factor: factor,
                    cantidadOriginal: item.cantidad,
                    isVoid: true
                };

                await logMovimientoInternal(
                    usuarioAnulador,
                    'ENTRADA_DEVOLUCION',
                    prod.id,
                    prod.nombre,
                    reintegroTotal,
                    nuevoStock,
                    'POS',
                    motivo || 'Anulación',
                    smartMetadata
                );
            }
        }
    });
};
