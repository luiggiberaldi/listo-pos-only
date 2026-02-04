
// SIMULATION SCRIPT: ABONO PERFECTO
// Run this in browser console to verify

import { math } from './utils/mathCore';

const runTest = () => {
    console.group("🧪 PRUEBA DE ABONO EXACTO");

    // Estado Inicial
    let cliente = {
        deuda: 10.00,
        favor: 0.00
    };
    const ABONO = 10.00;

    console.log("1. Estado Inicial:", cliente);
    console.log(`2. Abonando: $${ABONO}`);

    // LÓGICA REFACTORIZADA (Simulada)
    const deudaInicial = cliente.deuda;
    const balanceResultante = math.sub(deudaInicial, ABONO);

    if (balanceResultante >= 0) {
        cliente.deuda = balanceResultante;
    } else {
        cliente.deuda = 0;
        const remanentePositivo = Math.abs(balanceResultante);
        cliente.favor = math.add(cliente.favor, remanentePositivo);
    }

    // Normalización
    cliente.deuda = math.round(cliente.deuda);
    cliente.favor = math.round(cliente.favor);

    console.log("3. Estado Final:", cliente);

    if (cliente.deuda === 0 && cliente.favor === 0) {
        console.log("✅ ÉXITO TOTAL: Deuda eliminada sin residuos.");
    } else {
        console.error("❌ FALLO: Quedaron residuos.", cliente);
    }
    console.groupEnd();
};

// Uncomment to run
// runTest();
