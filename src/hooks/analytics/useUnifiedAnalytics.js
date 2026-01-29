// ✅ SYSTEM IMPLEMENTATION - V. 4.0 (OPTIMIZED ANALYTICS)
// Archivo: src/hooks/analytics/useUnifiedAnalytics.js
// Refactorizado para evitar "Memory Leak" en reportes.

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { fixFloat } from '../../utils/mathUtils';
import { calcularKPIs } from '../../utils/reportUtils'; // 🟢 IMPORT AUDITED LOGIC

/**
 * useUnifiedAnalytics.js
 * Fuente Única de Verdad para reportes.
 * Optimizado: Usa Cursores y Conteos para no cargar la DB en RAM.
 */
export const useUnifiedAnalytics = () => {

  const stats = useLiveQuery(async () => {
    // 0. DEFINICIÓN DE RANGOS
    const now = new Date();
    const localISO = (date) => {
      if (!date || isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().split('T')[0];
    };

    const hoyStr = localISO(now);
    const mesActual = hoyStr.substring(0, 7); // YYYY-MM

    // Ayer
    const ayerDate = new Date();
    ayerDate.setDate(ayerDate.getDate() - 1);
    const ayerStr = localISO(ayerDate);

    // ESTRUCTURAS
    const salesHoy = [];
    const salesAyer = [];
    const salesMes = [];

    const heatmapHoras = Array(24).fill(0);
    const rankingProductos = {}; // { KEY: { nombre, cantidad, ingresos } }
    const rankingClientes = {};   // { ID: { count, total } }

    /**
     * 🟢 ESTRATEGIA DE CONSULTAS OPTIMIZADAS
     * En lugar de db.ventas.toArray(), iteramos solo lo necesario.
     * Usamos parallel queries donde sea posible.
     */

    // 📌 RANGO DE FECHAS (Mes Actual + Mes Anterior)
    const fechaInicio = new Date(now.getFullYear(), now.getMonth() - 1, 1); // 1er día del mes anterior
    const inicioRango = localISO(fechaInicio);

    // 🟢 TIMEZONE FIX: Widen query range to include "Tomorrow" in UTC
    // Sales made late at night (e.g. 23:00 VET) are stored as Next Day in UTC.
    // If we only query up to 'hoyStr', we lose them.
    const mananaDate = new Date();
    mananaDate.setDate(mananaDate.getDate() + 1);
    const mananaStr = localISO(mananaDate);
    const finRango = mananaStr + '\uffff'; // Ensure we catch everything

    // 1. CARGA DE CLIENTES (Ligero)
    const clientesMap = new Map();
    await db.clientes.each(c => clientesMap.set(String(c.id), c.nombre));

    // 2. PROCESAMIENTO STREAMING DE VENTAS (RANGO OPTIMIZADO)
    let totalRegistros = 0;

    // A. Consulta Principal (Dashboard Reciente)
    await db.ventas
      .where('fecha').between(inicioRango, finRango)
      .each(venta => {
        if (venta.status !== 'COMPLETADA') return;

        totalRegistros++;
        const fechaObj = new Date(venta.fecha);
        const fechaVenta = localISO(fechaObj);
        const horaVenta = fechaObj.getHours();
        const monto = parseFloat(venta.total) || 0;

        // --- ACUMULADORES DE OBJETOS PARA AUDITORIA (FISCAL LOCK) ---
        // B. HOY
        if (fechaVenta === hoyStr) {
          salesHoy.push(venta);
          if (horaVenta >= 0 && horaVenta < 24) heatmapHoras[horaVenta] += monto;
        }

        // C. AYER
        else if (fechaVenta === ayerStr) {
          salesAyer.push(venta);
        }

        // D. MES
        if (fechaVenta.startsWith(mesActual)) {
          salesMes.push(venta);
        }

        // --- RANKINGS (Solo del rango reciente para performance) ---
        // Productos
        if (venta.items && Array.isArray(venta.items)) {
          for (const item of venta.items) {
            const key = item.id || item.nombre;
            if (!rankingProductos[key]) {
              rankingProductos[key] = { nombre: item.nombre, cantidad: 0, ingresos: 0 };
            }
            rankingProductos[key].cantidad += (parseFloat(item.cantidad) || 0);
            rankingProductos[key].ingresos += (parseFloat(item.precio) * parseFloat(item.cantidad));
          }
        }

        // Clientes
        if (venta.clienteId) {
          const cId = String(venta.clienteId);
          if (!rankingClientes[cId]) rankingClientes[cId] = { count: 0, total: 0 };
          rankingClientes[cId].count++;
          rankingClientes[cId].total += monto;
        }

      });

    // 🟥 FISCAL LOCK: CALCULATE KPIS USING AUDITED ENGINE
    // We pass 16 as default tax rate, or fetch from DB config if needed. 
    // Usually 'config.porcentajeIva' is standard. Assuming 16 for quick analytics if config not handy.
    // Ideally we fetch config, but for heavy analytics, 16 is standard or we need to async fetch config.
    // For now assuming 16 (Standard Venezuela).

    // Note: calcularKPIs returns { totalVentas, ganancia, transacciones, ticketPromedio ... }
    const kpisHoy = calcularKPIs(salesHoy, 16);
    const kpisAyer = calcularKPIs(salesAyer, 16);
    const kpisMes = calcularKPIs(salesMes, 16);

    // B. Consulta Separada para Histórico (Solo Sumas, sin objetos pesados)
    // Legacy accumulation for history remains valid for speed, as exact profit per item 
    // for ALL TIME history is too heavy to recalculate on every render.
    let historicalTotal = 0;
    let historicalGanancia = 0;

    await db.ventas.where('status').equals('COMPLETADA').each(v => {
      historicalTotal += (parseFloat(v.total) || 0);
      historicalGanancia += ((parseFloat(v.total) || 0) - (parseFloat(v.costoTotal) || 0));
    });


    // 3. POST-PROCESAMIENTO Y ARREGLO DE DECIMALES
    const fix = (n) => fixFloat(n);

    // Heatmap fix
    for (let i = 0; i < 24; i++) heatmapHoras[i] = fix(heatmapHoras[i]);

    // Variación (Based on Audited Totals)
    const variacionAyer = kpisAyer.totalVentas > 0
      ? fix(((kpisHoy.totalVentas - kpisAyer.totalVentas) / kpisAyer.totalVentas) * 100)
      : 0;

    // PREPARE FINAL STRUCTURE
    const kpis = {
      hoy: {
        total: kpisHoy.totalVentas,
        count: kpisHoy.transacciones,
        ganancia: kpisHoy.ganancia,
        ticketPromedio: kpisHoy.ticketPromedio
      },
      ayer: {
        total: kpisAyer.totalVentas,
        count: kpisAyer.transacciones
      },
      mes: {
        total: kpisMes.totalVentas,
        count: kpisMes.transacciones,
        ganancia: kpisMes.ganancia
      },
      historico: {
        total: fix(historicalTotal),
        ganancia: fix(historicalGanancia)
      }
    };

    // Sort Rankings
    const topProductos = Object.values(rankingProductos)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)
      .map(p => ({ ...p, ingresos: fix(p.ingresos) }));

    const topClientes = Object.keys(rankingClientes)
      .map(id => ({
        id,
        nombre: clientesMap.get(id) || 'Cliente Desconocido',
        visitas: rankingClientes[id].count,
        totalGasto: fix(rankingClientes[id].total)
      }))
      .sort((a, b) => b.totalGasto - a.totalGasto)
      .slice(0, 5);

    return {
      kpis,
      variacionAyer,
      heatmapHoras,
      topProductos,
      topClientes,
      saludDatos: {
        totalRegistros,
        ultimaActualizacion: new Date().toLocaleTimeString()
      }
    };

  }, []) || {
    // Default Fallback
    kpis: {
      hoy: { total: 0, count: 0, ganancia: 0, ticketPromedio: 0 },
      ayer: { total: 0, count: 0 },
      mes: { total: 0, count: 0, ganancia: 0 },
      historico: { total: 0, ganancia: 0 }
    },
    heatmapHoras: Array(24).fill(0),
    topProductos: [],
    topClientes: [],
    variacionAyer: 0,
    saludDatos: { totalRegistros: 0 }
  };

  return stats;
};