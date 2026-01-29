/**
 * 🧮 MOTOR MATEMÁTICO - FÉNIX CORE (DECIMAL.JS EDITION)
 * Precisión financiera absoluta. Cero errores de punto flotante.
 */

import Decimal from 'decimal.js';

// Configuración Global: Redondeo Bancario (Half Up)
Decimal.set({ precision: 20, rounding: 4 }); 

// 1. CONSTRUCTOR SEGURO
export const d = (val) => {
  if (val === null || val === undefined || val === '') return new Decimal(0);
  return new Decimal(val);
};

// 2. CORRECCIÓN DE PUNTO FLOTANTE (OUTPUT)
// Devuelve un número normal de JS, pero calculado perfectamente antes
export const fixFloat = (num, precision = 2) => {
  return d(num).toDecimalPlaces(precision).toNumber();
};

// 3. FORMATEO DE MONEDA (VISUAL)
export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(fixFloat(amount));
};

// 4. PARSEO DE DINERO (INPUT)
export const parseMoney = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const clean = val.toString().replace(/[^0-9.-]/g, '');
  return d(clean).toNumber();
};

// 5. REDONDEO CONFIGURABLE
export const aplicarRedondeo = (valor, modo = 'default') => {
  const num = d(valor);
  switch (modo) {
    case 'up':    return num.ceil().toNumber();
    case 'down':  return num.floor().toNumber();
    default:      return num.round().toNumber();
  }
};

/**
 * 6. DESGLOSE INTELIGENTE DE STOCK (MATEMÁTICA SEGURA)
 */
export const desglosarStock = (stockTotal, jerarquia) => {
  const total = d(stockTotal);
  if (total.equals(0)) return "0 Unds";

  const esNegativo = total.isNegative();
  let resto = total.abs();
  const signo = esNegativo ? "-" : "";
  const partes = [];

  // A. BULTOS
  if (jerarquia?.bulto?.activo) {
    const contBulto = d(jerarquia.bulto.contenido || 1);
    const contPaq = d(jerarquia.paquete?.contenido || 1);
    
    // Factor Bulto = Contenido Bulto * (Si hay paquete ? Contenido Paquete : 1)
    const factorBulto = jerarquia.paquete?.activo 
        ? contBulto.times(contPaq)
        : contBulto;

    if (factorBulto.greaterThan(1) && resto.greaterThanOrEqualTo(factorBulto)) {
      const cantBultos = resto.div(factorBulto).floor();
      partes.push(`${signo}${cantBultos} ${cantBultos.equals(1) ? 'Bulto' : 'Bultos'}`);
      resto = resto.mod(factorBulto);
    }
  }

  // B. PAQUETES
  if (jerarquia?.paquete?.activo) {
    const factorPaquete = d(jerarquia.paquete.contenido || 1);
    if (factorPaquete.greaterThan(1) && resto.greaterThanOrEqualTo(factorPaquete)) {
      const cantPaquetes = resto.div(factorPaquete).floor();
      partes.push(`${signo}${cantPaquetes} ${cantPaquetes.equals(1) ? 'Paq' : 'Paqs'}`);
      resto = resto.mod(factorPaquete);
    }
  }

  // C. UNIDADES SUELTAS
  if (resto.greaterThan(0.0001)) { 
    const esDecimal = !resto.isInteger();
    partes.push(`${signo}${esDecimal ? resto.toFixed(3) : resto} Unds`);
  }

  if (partes.length === 0) return "0 Unds";
  return partes.join(", ");
};

/**
 * 7. CONVERSOR DE INPUTS A BASE
 */
export const convertirABase = (cantidad, unidad, jerarquia) => {
  const cant = d(cantidad);
  if (cant.equals(0)) return 0;

  const j = jerarquia || {};
  let factor = d(1);
  
  if (unidad === 'bulto') {
    const contBulto = d(j.bulto?.contenido || 1);
    const contPaq = d(j.paquete?.contenido || 1);
    factor = j.paquete?.activo ? contBulto.times(contPaq) : contBulto;
  } else if (unidad === 'paquete') {
    factor = d(j.paquete?.contenido || 1);
  }

  return cant.times(factor).toNumber();
};