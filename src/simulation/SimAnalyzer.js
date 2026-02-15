// ============================================================
// 📈 SIM ANALYZER — Análisis y Métricas de Simulación
// ============================================================
// Lee datos generados por SimEngine y produce estadísticas
// que se muestran en la UI de SimulationPage.

import { db } from '../db';

/**
 * Calcula métricas del día actual para la UI.
 * @param {string} fechaISO - Fecha del día a analizar (ISO string)
 * @returns {Object} Métricas del día
 */
export async function obtenerMetricasDia(fechaISO) {
    const fecha = new Date(fechaISO);
    const inicio = new Date(fecha);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(fecha);
    fin.setHours(23, 59, 59, 999);

    const inicioISO = inicio.toISOString();
    const finISO = fin.toISOString();

    // Ventas del día
    const ventas = await db.ventas
        .where('fecha')
        .between(inicioISO, finISO, true, true)
        .and(v => v.status === 'COMPLETADA')
        .toArray();

    const totalVentas = ventas.reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0);
    const totalCosto = ventas.reduce((sum, v) => sum + (parseFloat(v.totalCosto) || 0), 0);

    // Gastos del día
    const logs = await db.logs
        .where('fecha')
        .between(inicioISO, finISO, true, true)
        .toArray();

    const gastos = logs.filter(l => l.tipo === 'GASTO_CAJA');
    const totalGastos = gastos.reduce((sum, g) => sum + (parseFloat(g.cantidad) || 0), 0);

    // Consumos del día
    const consumos = logs.filter(l => l.tipo === 'CONSUMO_INTERNO');
    const totalConsumos = consumos.reduce((sum, c) => {
        const qty = parseFloat(c.cantidad) || 0;
        const costo = parseFloat(c.meta?.costoSnapshot) || 0;
        return sum + (qty * costo);
    }, 0);

    // Categorías más vendidas
    const categoriaMap = {};
    for (const venta of ventas) {
        for (const item of (venta.items || [])) {
            const prod = await db.productos.get(item.id);
            const cat = prod?.categoria || 'Sin categoría';
            categoriaMap[cat] = (categoriaMap[cat] || 0) + (item.subtotal || 0);
        }
    }
    const categoriasTop = Object.entries(categoriaMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, monto]) => ({ categoria: cat, monto: +monto.toFixed(2) }));

    // Métodos de pago
    const metodoMap = {};
    for (const venta of ventas) {
        for (const pago of (venta.metodosPago || [])) {
            const key = `${pago.moneda}_${pago.medio}`;
            metodoMap[key] = (metodoMap[key] || 0) + (parseFloat(pago.monto) || 0);
        }
    }

    return {
        fecha: fechaISO,
        totalVentas: +totalVentas.toFixed(2),
        totalCosto: +totalCosto.toFixed(2),
        totalGastos: +totalGastos.toFixed(2),
        totalConsumos: +totalConsumos.toFixed(2),
        utilidadBruta: +(totalVentas - totalCosto).toFixed(2),
        utilidadNeta: +(totalVentas - totalCosto - totalGastos - totalConsumos).toFixed(2),
        transacciones: ventas.length,
        ticketPromedio: ventas.length > 0 ? +(totalVentas / ventas.length).toFixed(2) : 0,
        categoriasTop,
        metodosPago: Object.entries(metodoMap).map(([key, monto]) => ({
            metodo: key,
            monto: +monto.toFixed(2)
        })),
        totalGastosEntries: gastos.length,
        totalConsumosEntries: consumos.length
    };
}

/**
 * Obtiene resumen de toda la simulación (multi-día).
 */
export async function obtenerResumenSimulacion() {
    const ventas = await db.ventas
        .filter(v => v.status === 'COMPLETADA' && v.meta?.simulation)
        .toArray();

    const totalVentas = ventas.reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0);
    const totalCosto = ventas.reduce((sum, v) => sum + (parseFloat(v.totalCosto) || 0), 0);

    const logs = await db.logs
        .filter(l => l.meta?.simulation)
        .toArray();

    const gastos = logs.filter(l => l.tipo === 'GASTO_CAJA');
    const totalGastos = gastos.reduce((sum, g) => sum + (parseFloat(g.cantidad) || 0), 0);

    // Ventas por día
    const ventasPorDia = {};
    for (const v of ventas) {
        const dia = v.fecha.split('T')[0];
        if (!ventasPorDia[dia]) ventasPorDia[dia] = { ventas: 0, monto: 0, transacciones: 0 };
        ventasPorDia[dia].monto += parseFloat(v.total) || 0;
        ventasPorDia[dia].transacciones++;
    }

    const diasConVentas = Object.keys(ventasPorDia).length;

    return {
        totalVentas: +totalVentas.toFixed(2),
        totalCosto: +totalCosto.toFixed(2),
        totalGastos: +totalGastos.toFixed(2),
        utilidadBruta: +(totalVentas - totalCosto).toFixed(2),
        utilidadNeta: +(totalVentas - totalCosto - totalGastos).toFixed(2),
        transaccionesTotales: ventas.length,
        diasSimulados: diasConVentas,
        promedioVentasDia: diasConVentas > 0 ? +(totalVentas / diasConVentas).toFixed(2) : 0,
        promedioTransaccionesDia: diasConVentas > 0 ? Math.round(ventas.length / diasConVentas) : 0,
        ticketPromedio: ventas.length > 0 ? +(totalVentas / ventas.length).toFixed(2) : 0,
        ventasPorDia: Object.entries(ventasPorDia)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([dia, data]) => ({
                dia,
                monto: +data.monto.toFixed(2),
                transacciones: data.transacciones
            }))
    };
}

/**
 * Limpia todos los datos de simulación.
 */
export async function limpiarDatosSimulacion() {
    // Eliminar ventas simuladas
    const ventasSim = await db.ventas.filter(v => v.meta?.simulation).toArray();
    await db.ventas.bulkDelete(ventasSim.map(v => v.id));

    // Eliminar logs simulados
    const logsSim = await db.logs.filter(l => l.meta?.simulation).toArray();
    await db.logs.bulkDelete(logsSim.map(l => l.id));

    // Eliminar productos simulados (código empieza con SIM-)
    const prodsSim = await db.productos.filter(p => p.codigo?.startsWith('SIM-')).toArray();
    await db.productos.bulkDelete(prodsSim.map(p => p.id));

    return {
        ventasEliminadas: ventasSim.length,
        logsEliminados: logsSim.length,
        productosEliminados: prodsSim.length
    };
}
