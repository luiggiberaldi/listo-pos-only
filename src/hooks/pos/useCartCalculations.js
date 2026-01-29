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
    // 1. Calcular Subtotal Base
    // Suma exacta de (precio * cantidad)
    const subtotalBase = carrito.reduce((sum, item) => {
      const precio = d(item.precio);
      const cantidad = d(item.cantidad);
      return sum.plus(precio.times(cantidad));
    }, d(0));

    // 2. Calcular Impuestos
    const totalImpuesto = carrito.reduce((sum, item) => {
      if (item.exento || item.aplicaIva === false) return sum;
      
      const precio = d(item.precio);
      const cantidad = d(item.cantidad);
      const subItem = precio.times(cantidad);
      
      // Impuesto = Subtotal * (IVA / 100)
      return sum.plus(subItem.times(ivaGlobal.div(100)));
    }, d(0));

    // 3. Totales Finales
    const totalRaw = subtotalBase.plus(totalImpuesto);
    
    // Total USD: Redondeado a 2 decimales para cobro
    const totalUSD = totalRaw.toDecimalPlaces(2).toNumber();

    // Total BS: Multiplicación directa del total exacto por la tasa
    // (Sin redondear el intermedio en USD para máxima precisión en moneda débil)
    const totalBS = totalRaw.times(tasa).toDecimalPlaces(2).toNumber();

    return {
      subtotalBase: subtotalBase.toNumber(),
      totalImpuesto: totalImpuesto.toNumber(),
      totalUSD,
      totalBS,
      tasa: tasa.toNumber(),
      ivaGlobal: ivaGlobal.toNumber()
    };
  }, [carrito, configuracion.tasa, configuracion.porcentajeIva]);

  return calculos;
};