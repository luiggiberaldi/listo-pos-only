import Decimal from 'decimal.js';

// 🧮 MATH CORE: FÉINX PROTOCOL
// Centraliza todas las operaciones financieras para evitar errores de punto flotante (IEEE 754).

// Helper interno para instanciar Decimal con seguridad
const d = (val) => new Decimal(val || 0);

// Configuración Global de Decimal (Opcional, pero recomendada)
// Decimal.set({ precision: 20, rounding: 4 }); // 4 = HALF_UP (Standard Rounding)

export const math = {
    // 1. Operaciones Básicas
    add: (a, b) => d(a).plus(d(b)).toNumber(),
    sub: (a, b) => d(a).minus(d(b)).toNumber(),
    mul: (a, b) => d(a).times(d(b)).toNumber(),
    div: (a, b) => {
        const div = d(b);
        if (div.isZero()) return 0; // 🛡️ Safe Division
        return d(a).div(div).toNumber();
    },

    // 2. Operaciones con Precisión Controlada (Returman Number)
    // Útil para resultados finales de interfaz
    round: (val, decimals = 2) => {
        // Redondeo estándar aritmético (HALF_UP)
        return d(val).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber();
    },

    // 3. Operaciones de "Techo" (Para visualización POS en Bolívares)
    ceil: (val, decimals = 2) => {
        return d(val).toDecimalPlaces(decimals, Decimal.ROUND_CEIL).toNumber();
    },

    max: (...args) => Decimal.max(...args.map(d)).toNumber(),
    min: (...args) => Decimal.min(...args.map(d)).toNumber(),
    eq: (a, b) => d(a).equals(d(b)), // 🆕 Strict Equality Check for Testing

    // 4. Cadena de Operaciones (Fluent Inteface Wrapper)
    // Permite math.chain(10).add(5).mul(2).done() -> 30
    chain: (val) => {
        let current = d(val);
        const wrapper = {
            add: (v) => { current = current.plus(d(v)); return wrapper; },
            sub: (v) => { current = current.minus(d(v)); return wrapper; },
            mul: (v) => { current = current.times(d(v)); return wrapper; },
            div: (v) => { current = current.div(d(v)); return wrapper; },
            round: (decimals = 2) => { current = current.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP); return wrapper; },
            toNumber: () => current.toNumber(),
            value: () => current.toNumber() // Alias
        };
        return wrapper;
    },

    // 5. Utilidades Financieras Específicas
    // Convierte monto en moneda origen a destino dada una tasa
    convert: (amount, fromCurrency, toCurrency, rate) => {
        const amt = d(amount);
        const tasa = d(rate);

        if (fromCurrency === toCurrency) return amt.toNumber();
        if (tasa.isZero()) return 0;

        if (fromCurrency === 'USD' && (toCurrency === 'VES' || toCurrency === 'BS')) {
            return amt.times(tasa).toDecimalPlaces(2).toNumber();
        }
        if ((fromCurrency === 'VES' || fromCurrency === 'BS') && toCurrency === 'USD') {
            return amt.div(tasa).toDecimalPlaces(2).toNumber();
        }
        return amt.toNumber(); // Fallback
    },

    // Suma un array de objetos por una propiedad clave
    sumBy: (array, key) => {
        if (!Array.isArray(array)) return 0;
        return array.reduce((acc, item) => {
            const val = item[key];
            return acc.plus(d(val));
        }, d(0)).toNumber();
    },

    // Retorna instancia de Decimal para operaciones manuales si es necesario
    d: (val) => d(val)
};

export default math;
