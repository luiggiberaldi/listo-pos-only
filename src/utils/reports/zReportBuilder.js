import Decimal from 'decimal.js';
import { calcularKPIs } from './fiscalEngine';
import { agruparPorMetodo, analizarFlujoVueltos } from './treasuryEngine';

const d = (val) => new Decimal(val || 0);

export const generarReporteZ = (ventas = [], cajaState = {}, usuario = {}, config = {}) => {
    const fechaCierre = new Date();
    const taxRate = config.porcentajeIva !== undefined ? parseFloat(config.porcentajeIva) : 16;

    const kpis = calcularKPIs(ventas, taxRate);
    const metodos = agruparPorMetodo(ventas);
    const flujoCaja = analizarFlujoVueltos(ventas);

    // 1. Obtener Balances Iniciales (Backward Compat)
    let opening = { usdCash: 0, vesCash: 0, usdDigital: 0, vesDigital: 0 };

    if (cajaState.balancesApertura) {
        // ✅ Versión 2.0: Usamos Snapshot Estático (Correcto)
        opening.usdCash = parseFloat(cajaState.balancesApertura.usdCash) || 0;
        opening.vesCash = parseFloat(cajaState.balancesApertura.vesCash) || 0;
        // Fallback: Si no existen en apertura, asumir 0
        opening.usdDigital = parseFloat(cajaState.balancesApertura.usdDigital) || 0;
        opening.vesDigital = parseFloat(cajaState.balancesApertura.vesDigital) || 0;
    } else if (cajaState.balances) {
        // ⚠️ Versión 1.0: Fallback a Live State
        opening.usdCash = parseFloat(cajaState.balances?.usdCash || cajaState.usdCash || 0);
        opening.vesCash = parseFloat(cajaState.balances?.vesCash || cajaState.vesCash || 0);
        opening.usdDigital = parseFloat(cajaState.balances.usdDigital) || 0;
        opening.vesDigital = parseFloat(cajaState.balances.vesDigital) || 0;
    } else {
        // Legacy Schema
        opening.usdCash = parseFloat(cajaState.montoInicial) || 0;
    }

    // 2. Calcular Totales Finales (Apertura + Flujo)
    const calcTotal = (start, flow) => d(start).plus(d(flow.total)).toNumber();

    const finalBalances = {
        usdCash: {
            inicial: opening.usdCash,
            entradas: flujoCaja.usdCash.in,
            salidas: flujoCaja.usdCash.out,
            final: calcTotal(opening.usdCash, flujoCaja.usdCash)
        },
        vesCash: {
            inicial: opening.vesCash,
            entradas: flujoCaja.vesCash.in,
            salidas: flujoCaja.vesCash.out,
            final: calcTotal(opening.vesCash, flujoCaja.vesCash)
        },
        usdDigital: {
            inicial: opening.usdDigital,
            entradas: flujoCaja.usdDigital.in,
            salidas: flujoCaja.usdDigital.out,
            final: calcTotal(opening.usdDigital, flujoCaja.usdDigital)
        },
        vesDigital: {
            inicial: opening.vesDigital,
            entradas: flujoCaja.vesDigital.in,
            salidas: flujoCaja.vesDigital.out,
            final: calcTotal(opening.vesDigital, flujoCaja.vesDigital)
        }
    };

    // Total General Estimado (Todo a USD) - Referencial
    const lastRate = ventas.find(v => v.tasa)?.tasa || 1;
    const totalEstimadoUSD = d(finalBalances.usdCash.final)
        .plus(d(finalBalances.usdDigital.final))
        .plus(d(finalBalances.vesCash.final).div(lastRate))
        .plus(d(finalBalances.vesDigital.final).div(lastRate))
        .toNumber();

    // 3. CALCULO FISCAL
    let igtfAccumulated = d(0);

    // 🔍 DEBUG: IGTF TRACKING
    ventas.forEach(v => {
        // Use filtered list inside or check validity? 
        // calcularKPIs handles validity. Here we iterate all ventas for IGTF? 
        // Actually `calcularKPIs` does the IGTF calculation now.
        // But `reportUtils.js` had this logic separately for IGTF debug purposes.
        // I will trust `kpis.totalIGTF` but let's see if we need the fallback logic.
        // The original code had the fallback logic inside `generarReporteZ`.
        // I should duplicate it here or move it to `fiscalEngine`?
        // `fiscalEngine` has `totalIGTF` accumulation but maybe not the fallback logic?
        // Let's check `fiscalEngine`... it just adds `v.igtfTotal`.
        // The original `generarReporteZ` had a fallback block. I should preserve it here.
    });

    // Wait, I missed copying the fallback IGTF logic to `fiscalEngine`.
    // Original `generarReporteZ` had it.
    // I will add it here for now or update `fiscalEngine`?
    // Updating `fiscalEngine` is cleaner. But let's stick to the original structure where `generarReporteZ` did some extra logic.
    // Actually, I put `kpis.totalIGTF` in `fiscalEngine` based on `v.igtfTotal`.
    // The fallback logic was: "if igtfVal === 0 and config?.igtfActivo... recalculate".
    // I should put that in `fiscal Engine` ideally, but `generarReporteZ` has access to `config`.
    // `calcularKPIs` only takes `taxRate`.
    // I will put the fallback logic HERE in `zReportBuilder` and perform a second pass if needed, OR modify `fiscalEngine` to accept config.

    // Let's modify `fiscalEngine` in a subsequent step if needed. For now, I'll recalculate here if I have to.
    // Actually, `calcularKPIs` returns `totalIGTF` based on `v.igtfTotal`.
    // If I want the fallback, I should do it before causing `calcularKPIs`? No, `calcularKPIs` iterates.

    // Re-reading original `generarReporteZ`:
    // It iterates `ventas` again to calculate `igtfAccumulated` with fallback.
    // So I should preserve this loop here.

    ventas.filter(v => v.status === 'COMPLETADA' && v.tipo !== 'ANULADO' && v.tipo !== 'COBRO_DEUDA').forEach(v => {
        let igtfVal = parseFloat(v.igtfTotal || 0);

        // 🛡️ FALLBACK
        if (config?.igtfActivo && igtfVal === 0 && Array.isArray(v.pagos)) {
            const pagosDivisa = v.pagos.filter(p => {
                const m = (p.metodo || p.nombre || '').toLowerCase();
                const isCash = m.includes('efectivo') || m.includes('cash');
                const isUSD = p.tipo === 'DIVISA' || p.currency === 'USD' || m.includes('divisa') || m.includes('dolar');
                return isCash && isUSD;
            });

            if (pagosDivisa.length > 0) {
                const tasaIGTF = 0.03;
                const baseImponibleIGTF = pagosDivisa.reduce((acc, p) => acc + (parseFloat(p.monto || p.amount || 0)), 0);
                igtfVal = baseImponibleIGTF * tasaIGTF;
            }
        }

        if (igtfVal > 0) {
            igtfAccumulated = igtfAccumulated.plus(d(igtfVal));
        }
    });

    const fiscalCalculado = {
        ventasExentas: kpis.ventaExenta,
        baseImponible: kpis.baseImponible,
        iva: kpis.totalImpuesto,
        igtf: igtfAccumulated.toNumber() // Use the locally calculated compatible one
    };

    return {
        id: Date.now(),
        corteRef: `Z-${Date.now().toString().slice(-6)}`,
        fecha: fechaCierre.toISOString(),
        usuarioCierre: { id: usuario?.id || 'sys', nombre: usuario?.nombre || 'Sistema' },
        sesionCaja: {
            idApertura: cajaState.idApertura || null,
            balancesApertura: opening
        },
        // 🔥 INFO FISCAL
        fiscal: fiscalCalculado,

        totalVentas: kpis.totalVentas,
        ventasCredito: kpis.ventasCredito, // 🟢 New Field
        transacciones: kpis.transacciones,
        // KPIs Generales
        totalCostos: kpis.totalCostos,
        gananciaEstimada: kpis.ganancia,
        ticketPromedio: kpis.ticketPromedio,

        metodosPago: metodos,

        // 🔥 EL NUEVO NÚCLEO: 4 CUADRANTES
        tesoreriaDetallada: finalBalances,
        totalEstimadoUSD: parseFloat(totalEstimadoUSD.toFixed(2)),
        tasaReferencia: lastRate,

        auditoria: {
            ventasAnuladas: ventas.filter(v => v.status === 'ANULADA').length,
            primeraVenta: ventas[ventas.length - 1]?.fecha || null,
            ultimaVenta: ventas[0]?.fecha || null
        },
        schemaVersion: '4.0-BIMODULAR'
    };
};
