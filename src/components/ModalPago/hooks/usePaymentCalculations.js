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
    pagoSaldoFavor,
    casheaActive = false,
    casheaPercent = 60
}) => {
    // 🛡️ Tasa Segura
    const tasaSegura = tasa > 0 ? tasa : 1;

    // Calculamos el monto financiado por Cashea
    const casheaAmountUsd = useMemo(() => {
        if (!casheaActive) return 0;
        return math.round(totalUSD * (100 - casheaPercent) / 100);
    }, [casheaActive, totalUSD, casheaPercent]);

    // 1. Prepare Payments for Controller
    const allPayments = useMemo(() => {
        const list = metodosActivos.map(m => {
            const rawVal = val(m.id);
            // 🛡️ FIX #3: Robust medium detection — not just name heuristic
            const nameUpper = (m.nombre || '').toUpperCase();
            const DIGITAL_KEYWORDS = ['DIGITAL', 'ZELLE', 'PAYPAL', 'TRANSFERENCIA', 'PAGO MOVIL', 'PAGO MÓVIL', 'BINANCE', 'ZINLI', 'VENMO', 'RESERVE'];
            const isDigital = m.esCash === false || m.medio === 'DIGITAL' || DIGITAL_KEYWORDS.some(kw => nameUpper.includes(kw));
            return {
                amount: rawVal,
                currency: m.tipo === 'BS' ? 'VES' : 'USD',
                type: m.tipo,
                aplicaIGTF: m.aplicaIGTF,
                medium: isDigital ? 'DIGITAL' : 'CASH',
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

        // Add Cashea Financed Payment (Virtual/Internal)
        if (casheaActive && casheaAmountUsd > 0) {
            list.push({
                amount: casheaAmountUsd,
                currency: 'USD',
                type: 'DIVISA',
                medium: 'INTERNAL',
                aplicaIGTF: false,
                id: 'cashea'
            });
        }

        return list;
    }, [pagos, metodosActivos, val, pagoSaldoFavor, casheaActive, casheaAmountUsd]);

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
        casheaAmountUsd,
        // Wrappers for compatibility
        round2: (n) => math.round(n),
        round4: (n) => math.round(n, 4)
    };
};
