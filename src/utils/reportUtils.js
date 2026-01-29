/**
 * reportUtils.js - FÉNIX MATH ENGINE (AGGREGATOR)
 * Motor de reportes con precisión decimal.
 * 
 * v2.0 Refactor: Proxies to specialized engines.
 */

import { calcularKPIs, isValidSale } from './reports/fiscalEngine';
import { agruparPorMetodo, agruparMetodosNativos, analizarFlujoVueltos, calcularTesoreia, isValidCashFlow } from './reports/treasuryEngine';
import { generarReporteZ } from './reports/zReportBuilder';

// Export everything for backward compatibility
export {
  isValidSale,
  isValidCashFlow,
  calcularKPIs,
  agruparPorMetodo,
  agruparMetodosNativos,
  analizarFlujoVueltos,
  calcularTesoreia,
  generarReporteZ
};

// Also export agruparPorHora (kept here or move? It was simple enough to keep or move. Let's keep a copy or move it.)
// "agruparPorHora" was in the original file. I missed extracting it. 
// I'll add it here directly or valid to put in treasury? It's stats.
// Let's implement it here directly to avoid another file for 5 lines.

export const agruparPorHora = (ventas = []) => {
  const horas = Array(24).fill(0).map((_, i) => ({ name: `${i}:00`, total: 0 }));
  ventas.filter(isValidSale).forEach(v => {
    const h = new Date(v.fecha).getHours();
    if (horas[h]) horas[h].total += parseFloat(v.total);
  });
  return horas;
};