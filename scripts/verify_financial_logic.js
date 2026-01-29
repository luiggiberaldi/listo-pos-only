
// Script: verify_financial_logic.js
// Objetivo: Validar la lógica de los 4 cuadrantes (Deuda/Favor) aislada de la UI.
// Uso: node verify_financial_logic.js

const chalk = { // Mock chalk simple
    green: (msg) => `\x1b[32m${msg}\x1b[0m`,
    red: (msg) => `\x1b[31m${msg}\x1b[0m`,
    yellow: (msg) => `\x1b[33m${msg}\x1b[0m`,
    blue: (msg) => `\x1b[34m${msg}\x1b[0m`
};

console.log(chalk.blue("=== 🛡️ INICIANDO VALIDACIÓN DE LÓGICA FINANCIERA (V7 QUADRANTS) ==="));

// --- 1. MOCK LOGIC (La lógica que queremos blindar) ---
function procesarImpactoCliente(clienteInicial, transaccion) {
    // CLONAR PARA INMUTABILIDAD
    let cliente = { ...clienteInicial };

    // INPUTS INTERMEDIOS
    const { costoTotal, pagoReal, esCredito, usaSaldoFavor } = transaccion;

    // 0. Q0: CONSUMO DE SALDO A FAVOR
    if (usaSaldoFavor > 0) {
        cliente.favor = Math.max(0, (cliente.favor || 0) - usaSaldoFavor);
    }

    // 1. Q1: GENERACIÓN DE DEUDA
    let deudaPendiente = 0;
    if (esCredito) {
        // En lógica simple: Deuda = Total - Pago
        // Pero aquí simulamos que el input ya nos dice cuánto queda pendiente
        deudaPendiente = transaccion.deudaGenerada || 0;
        cliente.deuda = (cliente.deuda || 0) + deudaPendiente;
    }

    // 2. Q2 & Q3: VUELTO (ABONO A DEUDA O MONEDERO)
    // Calculamos el vuelto teórico
    const saldoFavorConsumido = usaSaldoFavor || 0;
    const totalPagado = pagoReal + saldoFavorConsumido; // Lo que entregó + lo que usó de su wallet

    // El "vuelto" digital es lo que sobra que NO se entregó en efectivo.
    // En este mock, asumimos que 'transaccion.vueltoParaMonedero' es lo que el usuario decidió guardar.
    let vueltoParaMonedero = transaccion.vueltoParaMonedero || 0;

    if (vueltoParaMonedero > 0) {
        const deudaActual = cliente.deuda || 0;

        if (deudaActual > 0.001) {
            // PRIORITY: DEBT FIRST
            if (deudaActual >= vueltoParaMonedero) {
                // Paga parte de la deuda
                cliente.deuda = parseFloat((deudaActual - vueltoParaMonedero).toFixed(2));
                // Nada al favor real, todo se consumió en deuda
            } else {
                // Paga toda la deuda y sobra
                const sobra = vueltoParaMonedero - deudaActual;
                cliente.deuda = 0;
                cliente.favor = (cliente.favor || 0) + sobra; // Q3
            }
        } else {
            // No deuda, todo a favor
            cliente.favor = (cliente.favor || 0) + vueltoParaMonedero;
        }
    }

    // 3. NORMALIZACIÓN ESTRICTA (The Golden Rule)
    const saldoNeto = (cliente.favor || 0) - (cliente.deuda || 0);

    if (saldoNeto >= 0) {
        cliente.favor = parseFloat(saldoNeto.toFixed(2));
        cliente.deuda = 0;
    } else {
        cliente.favor = 0;
        cliente.deuda = parseFloat(Math.abs(saldoNeto).toFixed(2));
    }

    return cliente;
}

// --- 2. TEST CASES ---

const runTest = (name, initial, txn, expected) => {
    console.log(`\n🧪 TEST: ${name}`);
    const resultado = procesarImpactoCliente(initial, txn);

    const deudaOk = resultado.deuda === expected.deuda;
    const favorOk = resultado.favor === expected.favor;

    if (deudaOk && favorOk) {
        console.log(chalk.green("✅ PASS"));
    } else {
        console.log(chalk.red("❌ FAIL"));
        console.log("   Esperado:", expected);
        console.log("   Obtenido:", resultado);
    }
};

// CASO 1: Venta a Crédito Simple (Nuevo cliente)
runTest(
    "Venta Crédito Simple",
    { deuda: 0, favor: 0 },
    { costoTotal: 50, pagoReal: 0, esCredito: true, deudaGenerada: 50 },
    { deuda: 50, favor: 0 }
);

// CASO 2: Vuelto a Monedero (Sin Deuda Previa)
runTest(
    "Vuelto a Monedero Simple",
    { deuda: 0, favor: 0 },
    { costoTotal: 10, pagoReal: 20, esCredito: false, vueltoParaMonedero: 10 },
    { deuda: 0, favor: 10 }
);

// CASO 3: El "Vuelto mata Deuda" (Cliente debe $50, paga con $100 algo de $20, sobran $80)
// Compra: $20. Paga: $100. Vuelto Potencial: $80. Decide: "Abonar todo el vuelto".
// Deuda Vieja: $50.
// Lógica: $80 vuelto -> Paga los $50 de deuda -> Sobran $30 para Wallet.
runTest(
    "Vuelto mata Deuda (Con Sobrante)",
    { deuda: 50, favor: 0 },
    { costoTotal: 20, pagoReal: 100, esCredito: false, vueltoParaMonedero: 80 },
    { deuda: 0, favor: 30 }
);

// CASO 4: El "Vuelto mata Deuda" (Parcial)
// Debe $50. Compra $10. Paga $30. Vuelto $20. "Ponlo a mi cuenta".
// Deuda final: 50 - 20 = 30. Favor: 0.
runTest(
    "Vuelto reduce Deuda (Parcial)",
    { deuda: 50, favor: 0 },
    { costoTotal: 10, pagoReal: 30, esCredito: false, vueltoParaMonedero: 20 },
    { deuda: 30, favor: 0 }
);

// CASO 5: Paradoja del Crédito (Normalización)
// Cliente tiene $10 a favor. Compra fiado $50.
// Deuda Bruta: $50. Favor Bruto: $10.
// Neto: 10 - 50 = -40.
// Resultado Final: Deuda $40, Favor $0. (El sistema se cobra el favor automáticamente, no permite guardar favor si debes).
runTest(
    "Normalización (Crédito consume Favor)",
    { deuda: 0, favor: 10 },
    { costoTotal: 50, pagoReal: 0, esCredito: true, deudaGenerada: 50 },
    { deuda: 40, favor: 0 }
);

console.log(chalk.blue("\n=== ✅ VALIDACIÓN COMPLETADA ==="));
