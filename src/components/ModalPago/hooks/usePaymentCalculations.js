import { useState, useEffect } from 'react';

export const usePaymentCalculations = ({
    totalUSD,
    pagos,
    tasa,
    configuracion,
    metodosActivos,
    val, // Helper function passed from parent state or defined here? Better defined here if possible, but depends on 'pagos' structure.
    pagoSaldoFavor
}) => {
    const [montoIGTF, setMontoIGTF] = useState(0);

    // 🛡️ FIX SEGURIDAD: Evitar división por cero
    const tasaSegura = tasa > 0 ? tasa : 1;

    // 🔢 CÁLCULO DINÁMICO IGTF
    useEffect(() => {
        if (!configuracion?.igtfActivo) {
            setMontoIGTF(0);
            return;
        }

        let montoPagadoNoIGTF = 0;
        let montoPagadoConIGTF = 0;

        metodosActivos.forEach(m => {
            const aplica = m.aplicaIGTF !== undefined ? m.aplicaIGTF : (m.tipo === 'DIVISA');
            const monto = val(m.id);

            if (monto > 0) {
                if (aplica) {
                    montoPagadoConIGTF += monto;
                } else {
                    if (m.tipo === 'BS') {
                        montoPagadoNoIGTF += (monto / tasaSegura);
                    } else {
                        montoPagadoNoIGTF += monto;
                    }
                }
            }
        });

        const deudaSusceptible = Math.max(0, totalUSD - montoPagadoNoIGTF);
        const baseImponible = Math.min(deudaSusceptible, montoPagadoConIGTF);

        if (baseImponible > 0) {
            const tasaIGTF = (configuracion.igtfTasa || 3) / 100;
            const impuestoCalculado = baseImponible * tasaIGTF;
            setMontoIGTF(Math.round((impuestoCalculado + Number.EPSILON) * 100) / 100);
        } else {
            setMontoIGTF(0);
        }

    }, [pagos, configuracion, metodosActivos, totalUSD, tasaSegura, val]);

    const metodosDivisa = metodosActivos.filter(m => m.tipo === 'DIVISA');
    const metodosBs = metodosActivos.filter(m => m.tipo === 'BS');

    const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

    const totalPagadoUSD = round2(metodosDivisa.reduce((acc, m) => acc + val(m.id), 0));
    const totalPagadoBS = round2(metodosBs.reduce((acc, m) => acc + val(m.id), 0));
    const valSaldoFavor = parseFloat(pagoSaldoFavor) || 0;

    const round4 = (num) => Math.round((num + Number.EPSILON) * 10000) / 10000;

    const totalPagadoGlobalUSD = totalPagadoUSD + (totalPagadoBS / tasaSegura) + valSaldoFavor;
    const totalConIGTF = round2(totalUSD + montoIGTF);

    // 🛡️ FÉNIX PRECISION: We use 4 decimals for guard logic to catch 1 BS (0.0025 USD)
    const restanteCalculo = round4(totalConIGTF - totalPagadoGlobalUSD);

    const faltaPorPagar = restanteCalculo > 0.0001 ? round2(restanteCalculo) : 0;
    const cambioUSD = restanteCalculo < -0.0001 ? Math.abs(restanteCalculo) : 0;

    return {
        montoIGTF,
        totalPagadoUSD,
        totalPagadoBS,
        totalPagadoGlobalUSD,
        totalConIGTF,
        faltaPorPagar,
        cambioUSD,
        tasaSegura,
        round2,
        round4
    };
};
