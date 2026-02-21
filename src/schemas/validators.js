/**
 * 🛡️ SCHEMA VALIDATORS — Lightweight data integrity guards
 * Validates critical objects before DB writes.
 * No external dependencies — pure JS.
 */

/**
 * Validates a product object before db.productos.put()
 * @param {Object} prod - Product data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateProducto(prod) {
    const errors = [];

    if (!prod) return { valid: false, errors: ['Producto es null/undefined'] };
    if (!prod.nombre || typeof prod.nombre !== 'string') errors.push('nombre requerido (string)');
    if (typeof prod.precioVenta !== 'number' || prod.precioVenta < 0) errors.push(`precioVenta inválido: ${prod.precioVenta}`);
    if (typeof prod.stock !== 'number' || isNaN(prod.stock)) errors.push(`stock inválido: ${prod.stock}`);
    if (prod.costo !== undefined && (typeof prod.costo !== 'number' || prod.costo < 0)) errors.push(`costo inválido: ${prod.costo}`);

    return { valid: errors.length === 0, errors };
}

/**
 * Validates a sale object before db.ventas.add()
 * @param {Object} venta - Sale data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateVenta(venta) {
    const errors = [];

    if (!venta) return { valid: false, errors: ['Venta es null/undefined'] };
    if (!venta.fecha) errors.push('fecha requerida');
    if (!Array.isArray(venta.items) || venta.items.length === 0) errors.push('items requeridos (array no vacío)');
    if (typeof venta.total !== 'number' || venta.total < 0) errors.push(`total inválido: ${venta.total}`);
    if (!Array.isArray(venta.metodosPago) || venta.metodosPago.length === 0) errors.push('metodosPago requeridos');
    if (!venta.correlativo) errors.push('correlativo requerido');

    // Validate each item
    if (Array.isArray(venta.items)) {
        venta.items.forEach((item, i) => {
            if (!item.id) errors.push(`items[${i}].id requerido`);
            if (typeof item.precio !== 'number' || item.precio < 0) errors.push(`items[${i}].precio inválido`);
            if (typeof item.cantidad !== 'number' || item.cantidad <= 0) errors.push(`items[${i}].cantidad inválida`);
        });
    }

    // Validate payment methods
    if (Array.isArray(venta.metodosPago)) {
        venta.metodosPago.forEach((p, i) => {
            if (!['USD', 'VES', 'BS'].includes(p.moneda)) errors.push(`metodosPago[${i}].moneda inválida: ${p.moneda}`);
            if (typeof p.monto !== 'number' || p.monto < 0) errors.push(`metodosPago[${i}].monto inválido`);
        });
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validates caja session balance structure
 * @param {Object} balances - Balance object
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBalances(balances) {
    const errors = [];

    if (!balances) return { valid: false, errors: ['Balances es null/undefined'] };

    const requiredKeys = ['usdCash', 'usdDigital', 'vesCash', 'vesDigital'];
    requiredKeys.forEach(key => {
        if (typeof balances[key] !== 'number') {
            errors.push(`balances.${key} debe ser number, got ${typeof balances[key]}`);
        } else if (isNaN(balances[key])) {
            errors.push(`balances.${key} es NaN`);
        }
    });

    // Warn about legacy structure
    if ('USD' in balances || 'VES' in balances) {
        errors.push('⚠️ Balance usa estructura legacy { USD, VES } — debe ser { usdCash, usdDigital, vesCash, vesDigital }');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validates a gasto (expense) object
 * @param {Object} gasto - Expense data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateGasto(gasto) {
    const errors = [];

    if (!gasto) return { valid: false, errors: ['Gasto es null/undefined'] };
    if (typeof gasto.monto !== 'number' || gasto.monto <= 0) errors.push(`monto inválido: ${gasto.monto}`);
    if (!['USD', 'VES'].includes(gasto.moneda)) errors.push(`moneda inválida: ${gasto.moneda}`);
    if (!['CASH', 'DIGITAL'].includes(gasto.medio)) errors.push(`medio inválido: ${gasto.medio}`);
    if (!gasto.motivo || typeof gasto.motivo !== 'string') errors.push('motivo requerido (string)');

    return { valid: errors.length === 0, errors };
}
