import { useMemo } from 'react';
import { FinancialController } from '../../../controllers/FinancialController';
import math from '../../../utils/mathCore';

export const usePaymentCalculations = ({
    totalUSD,
    totalBS,
    pagos,
    tasa,
    configuracion,
    metodosActivos,
    val,
    pagoSaldoFavor
}) => {
    // 🛡️ Tasa Segura
    const tasaSegura = tasa > 0 ? tasa : 1;

    // 1. Prepare Payments for Controller
    const allPayments = useMemo(() => {
        const list = metodosActivos.map(m => {
            const rawVal = val(m.id);
            return {
                amount: rawVal,
                currency: m.tipo === 'BS' ? 'VES' : 'USD',
                type: m.tipo,
                aplicaIGTF: m.aplicaIGTF,
                // Heuristic: If method name implies digital/transfer, it might not trigger IGTF by default logic
                // But the controller handles the "undefined" logic based on currency/type.
                medium: m.nombre.toUpperCase().includes('DIGITAL') ? 'DIGITAL' : 'CASH',
                id: m.id
            };
        });

        // Add Wallet Payment (Saldo a Favor)
        if (parseFloat(pagoSaldoFavor) > 0) {
            list.push({
                amount: parseFloat(pagoSaldoFavor),
                currency: 'USD',
                type: 'DIVISA',
                medium: 'DIGITAL', // Wallet is Digital
                aplicaIGTF: false // Wallet never tax
            });
        }
        return list;
    }, [pagos, metodosActivos, val, pagoSaldoFavor]);

    // 2. Call Controller
    const result = useMemo(() => {
        return FinancialController.calculatePaymentStatus(totalUSD, allPayments, configuracion, tasaSegura);
    }, [totalUSD, allPayments, configuracion, tasaSegura]);

    // 3. UI-Specific BS Calculations (Visual Consistency)
    // Controller gives us pure math. UI needs explicit BS values based on the "Visual Total BS".
    const factorIGTF = result.montoIGTF > 0 ? (1 + (configuracion.igtfTasa || 3) / 100) : 1;

    // If we have IGTF, the Visual Total BS increases
    const totalConIGTFBS = math.round(totalBS * factorIGTF);

    // Falta por Pagar BS: derived from USD remaining
    const faltaPorPagarBS = math.round(result.faltaPorPagar * tasaSegura);

    return {
        ...result,
        totalConIGTFBS,
        faltaPorPagarBS,
        tasaSegura,
        // Wrappers for compatibility
        round2: (n) => math.round(n),
        round4: (n) => math.round(n, 4)
    };
};
