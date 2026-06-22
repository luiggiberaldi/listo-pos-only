// ✅ usePosCalcStore.js — Cerebro de Matemáticas
// Reemplaza el hook useCartCalculations.js con un store Zustand reactivo.
// Se suscribe a useCartStore y useConfigStore para recalcular automáticamente.

import { create } from 'zustand';
import { ghostMiddleware } from '../utils/ghost/ghostMiddleware';
import Decimal from 'decimal.js';
import { useCartStore } from './useCartStore';
import { useConfigStore } from './useConfigStore';

// --- HELPER ---
const d = (val) => new Decimal(val || 0);

/** Recalculates all cart totals with arbitrary-precision arithmetic */
function computeCalcState(carrito, configuracion) {
    const tasa = new Decimal(configuracion.tasa || 1);
    const ivaGlobal = configuracion.ivaActivo
        ? new Decimal(configuracion.porcentajeIva || 0)
        : new Decimal(0);
    const ivaDivisor = ivaGlobal.div(100);

    const { subtotalUSD, totalImpuestoUSD, totalUSD, carritoBS, totalBS_Sum } = carrito.reduce((acc, item, index) => {
        const precioUnitario = d(item.precio);
        const cantidad = d(item.cantidad);
        
        // 1. Redondear el subtotal de la línea en USD a 2 decimales inmediatamente
        const subtotalItemUSD = precioUnitario.times(cantidad).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

        // 2. Calcular el impuesto sobre la base ya redondeada del ítem y redondearlo a 2 decimales
        let impuestoItemUSD = d(0);
        if (!item.exento && item.aplicaIva !== false) {
            impuestoItemUSD = subtotalItemUSD.times(ivaDivisor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        }

        // 3. El total de la línea es la suma exacta de sus partes redondeadas a 2 decimales
        const totalItemUSD = subtotalItemUSD.plus(impuestoItemUSD);
        
        // 4. Convertir el total exacto de la línea a BS y redondear a 2 decimales
        const totalItemBS = totalItemUSD.times(tasa).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        acc.carritoBS[index] = totalItemBS.toNumber();

        // 5. Acumular los totales usando las bases e impuestos ya redondeados individualmente
        acc.subtotalUSD = acc.subtotalUSD.plus(subtotalItemUSD);
        acc.totalImpuestoUSD = acc.totalImpuestoUSD.plus(impuestoItemUSD);
        acc.totalUSD = acc.totalUSD.plus(totalItemUSD);
        acc.totalBS_Sum = acc.totalBS_Sum.plus(totalItemBS);
        
        return acc;
    }, { subtotalUSD: d(0), totalImpuestoUSD: d(0), totalUSD: d(0), carritoBS: [], totalBS_Sum: d(0) });

    return {
        subtotalBase: subtotalUSD.toNumber(),
        totalImpuesto: totalImpuestoUSD.toNumber(),
        totalUSD: totalUSD.toNumber(), // Libre de drift fila-vs-total
        totalBS: totalBS_Sum.toNumber(),
        carritoBS,
        tasa: tasa.toNumber(),
        ivaGlobal: ivaGlobal.toNumber(),
        tasaCaida: tasa.toNumber() === 1,
        tasaInvalida: configuracion?.tasa === 0,
    };
}

function computeTasaStale(fechaTasa) {
    if (!fechaTasa) return false;
    return (Date.now() - new Date(fechaTasa).getTime()) > 24 * 60 * 60 * 1000;
}

export const usePosCalcStore = create(ghostMiddleware((set, get) => ({
    // --- CALC STATE ---
    subtotalBase: 0,
    totalImpuesto: 0,
    totalUSD: 0,
    totalBS: 0,
    carritoBS: [],
    tasa: 1,
    ivaGlobal: 0,
    tasaCaida: true,
    tasaInvalida: false,
    tasaStale: false,

    // --- RECALC (called reactively) ---
    _recalc: () => {
        const carrito = useCartStore.getState().carrito;
        const configuracion = useConfigStore.getState().configuracion;

        const calcs = computeCalcState(carrito, configuracion);
        const tasaStale = computeTasaStale(configuracion?.fechaTasa);

        set({ ...calcs, tasaStale });
    },

    // --- Convenience getter (matches old `calculos` object shape) ---
    getCalculos: () => {
        const s = get();
        return {
            subtotalBase: s.subtotalBase,
            totalImpuesto: s.totalImpuesto,
            totalUSD: s.totalUSD,
            totalBS: s.totalBS,
            carritoBS: s.carritoBS,
            tasa: s.tasa,
            ivaGlobal: s.ivaGlobal,
        };
    }
}), 'PosCalcStore'));

// --- REACTIVE SUBSCRIPTIONS ---
let _prevCarritoRef = null;
useCartStore.subscribe((state) => {
    if (state.carrito !== _prevCarritoRef) {
        _prevCarritoRef = state.carrito;
        usePosCalcStore.getState()._recalc();
    }
});

let _prevConfigRef = null;
useConfigStore.subscribe((state) => {
    if (state.configuracion !== _prevConfigRef) {
        _prevConfigRef = state.configuracion;
        usePosCalcStore.getState()._recalc();
    }
});
