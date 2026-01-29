import { useMemo } from 'react';
import Decimal from 'decimal.js';

/**
 * useCartCalculations.js - FÉNIX MATH ENGINE
 * Cálculo de totales usando aritmética de precisión arbitraria.
 */
export const useCartCalculations = (carrito, configuracion) => {
  const tasa = new Decimal(configuracion.tasa || 1);
  const ivaGlobal = new Decimal(configuracion.porcentajeIva || 0);

  // Helper local para decimales
  const d = (val) => new Decimal(val || 0);

  const calculos = useMemo(() => {
    let totalBS_Sum = d(0);
    const carritoBS = [];

    // 1. Calcular Subtotal Base e Impuestos por línea
    const subtotalUSD = carrito.reduce((sum, item, index) => {
      const precioUnitario = d(item.precio);
      const cantidad = d(item.cantidad);
      const subtotalItemUSD = precioUnitario.times(cantidad);

      // Cálculo de Impuesto por ítem (si aplica)
      let impuestoItemUSD = d(0);
      if (!item.exento && item.aplicaIva !== false) {
        impuestoItemUSD = subtotalItemUSD.times(ivaGlobal.div(100));
      }

      // 🛡️ REDONDEO PREVENTIVO: Forzamos que el total en USD sea de 2 decimales 
      // antes de convertir a Bolívares. Esto asegura que si ves $5.95, los Bs
      // se calculen exactamente sobre esos 5.95 y no sobre 5.952.
      const totalItemUSD = subtotalItemUSD.plus(impuestoItemUSD).toDecimalPlaces(2);

      // 🧮 CONVERSIÓN GRANULAR A BS: Se basa en el USD ya redondeado
      const totalItemBS = totalItemUSD.times(tasa).toDecimalPlaces(2);
      carritoBS[index] = totalItemBS.toNumber();
      totalBS_Sum = totalBS_Sum.plus(totalItemBS);

      return sum.plus(subtotalItemUSD);
    }, d(0));

    // 2. Calcular Impuestos Totales USD
    const totalImpuestoUSD = carrito.reduce((sum, item) => {
      if (item.exento || item.aplicaIva === false) return sum;
      return sum.plus(d(item.precio).times(d(item.cantidad)).times(ivaGlobal.div(100)));
    }, d(0));

    // 3. Totales Finales
    const totalRawUSD = subtotalUSD.plus(totalImpuestoUSD);

    // Total USD: Redondeado a 2 decimales para cobro
    const totalUSD = totalRawUSD.toDecimalPlaces(2).toNumber();

    // El Total BS es la suma de las conversiones individuales realizadas en el primer reduce
    const totalBS = totalBS_Sum.toNumber();

    return {
      subtotalBase: subtotalUSD.toNumber(),
      totalImpuesto: totalImpuestoUSD.toNumber(),
      totalUSD,
      totalBS,
      carritoBS, // 🆕 Lista de montos en Bs exactos por ítem
      tasa: tasa.toNumber(),
      ivaGlobal: ivaGlobal.toNumber()
    };
  }, [carrito, configuracion.tasa, configuracion.porcentajeIva]);

  return calculos;
};