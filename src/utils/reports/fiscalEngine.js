import Decimal from 'decimal.js';

const d = (val) => new Decimal(val || 0);

// Ventas Reales (Impactan Inventario y Ganancia) - Excluye Cobros de Deuda
export const isValidSale = (v) => v.status === 'COMPLETADA' && v.tipo !== 'ANULADO' && v.tipo !== 'COBRO_DEUDA';

export const calcularKPIs = (ventas = [], taxRate = 16) => {
    // KPI = Performance de VENTA (Inventario/Ganancia)
    const ventasValidas = ventas.filter(isValidSale);
    const taxFactor = d(1).plus(d(taxRate).div(100)); // 1.16

    let totalVentas = d(0);
    let totalVentasBS = d(0);
    let totalCostos = d(0);
    let totalBaseImponible = d(0); // Gravable
    let totalExento = d(0);        // Exento
    let totalTax = d(0);
    let totalIGTF = d(0);

    ventasValidas.forEach(v => {
        totalVentas = totalVentas.plus(d(v.total));

        // 🟢 REGRA GLOBAL: Tasa Histórica
        const tasaVenta = parseFloat(v.tasa || 1);
        const tBS = v.totalBS !== undefined ? d(v.totalBS) : d(v.total).times(tasaVenta);
        totalVentasBS = totalVentasBS.plus(tBS);

        // 4. CÁLCULO NETO (Robust Tax Substraction)
        let baseImponibleVenta = d(0);
        let exentoVenta = d(0);
        let processedGranularly = false;

        // 🟢 GRANULARITY CHECK: If items exist, use them for precision
        if (v.items && Array.isArray(v.items) && v.items.length > 0) {
            v.items.forEach(item => {
                const totalLinea = d(item.precio || 0).times(item.cantidad || 0);

                // Cost Accumulation (Granular with Hierarchy Support)
                let costFactor = 1;
                const u = (item.unidadVenta || 'unidad').toLowerCase();

                if (u === 'bulto' && item.jerarquia?.bulto?.contenido) {
                    costFactor = parseFloat(item.jerarquia.bulto.contenido) || 1;
                } else if (u === 'paquete' && item.jerarquia?.paquete?.contenido) {
                    costFactor = parseFloat(item.jerarquia.paquete.contenido) || 1;
                }

                const unitCost = d(item.costo || item.costoUnitario || 0);
                const totalCostLine = unitCost.times(costFactor).times(item.cantidad || 0);

                totalCostos = totalCostos.plus(totalCostLine);

                if (item.exento || item.aplicaIva === false || v.esExento) {
                    exentoVenta = exentoVenta.plus(totalLinea);
                } else {
                    baseImponibleVenta = baseImponibleVenta.plus(totalLinea);
                }
            });
            processedGranularly = true;
        }

        // 🛡️ FALLBACK / STANDARD LOGIC (If no items or simple sale)
        if (!processedGranularly) {
            // Fallback Cost (Top level) if granular failed
            totalCostos = totalCostos.plus(d(v.costoTotal));

            if (v.totalNeto !== undefined) {
                baseImponibleVenta = d(v.totalNeto);
            } else {
                // Si no hay neto explícito, deducimos el impuesto
                if (v.esExento) {
                    exentoVenta = d(v.total);
                } else {
                    // Intentamos usar el impuesto guardado, si no, lo derivamos (1 + taxRate/100)
                    const totalV = d(v.total);
                    const impuesto = v.totalImpuesto !== undefined ? d(v.totalImpuesto) : totalV.minus(totalV.div(taxFactor));
                    baseImponibleVenta = totalV.minus(impuesto);
                }
            }
        }

        // Accumulate
        totalBaseImponible = totalBaseImponible.plus(baseImponibleVenta);
        totalExento = totalExento.plus(exentoVenta);

        // Accumulate IVA (Total - Base - Exento) -> Or just trust v.totalImpuestoAccumulated
        // Using explicit totalImpuesto is safer if available
        if (v.totalImpuesto !== undefined) {
            totalTax = totalTax.plus(d(v.totalImpuesto));
        } else {
            // Fallback derivation
            totalTax = totalTax.plus(d(v.total).minus(baseImponibleVenta).minus(exentoVenta));
        }

        // Accumulate IGTF
        if (v.igtfTotal) {
            totalIGTF = totalIGTF.plus(d(v.igtfTotal));
        }
    });

    const ganancia = totalBaseImponible.plus(totalExento).minus(totalCostos); // Revenue - Cost
    const transacciones = ventasValidas.length;

    // Margen % = (Ganancia / Costo) * 100 (Markup)
    const margen = totalCostos.gt(0)
        ? ganancia.div(totalCostos).times(100)
        : d(100);

    const ticketPromedio = transacciones > 0
        ? totalVentas.div(transacciones)
        : d(0);

    return {
        totalVentas: totalVentas.toNumber(),
        totalVentasBS: totalVentasBS.toNumber(),
        totalCostos: totalCostos.toNumber(),
        ganancia: ganancia.toNumber(),
        margen: margen.toDecimalPlaces(1).toNumber(),
        transacciones,
        ticketPromedio: ticketPromedio.toDecimalPlaces(2).toNumber(),

        // FISCAL KEYS
        ventaNeta: totalBaseImponible.plus(totalExento).toNumber(), // Total Revenue (Base + Exento)
        ventaExenta: totalExento.toNumber(),                        // Pure Exento
        baseImponible: totalBaseImponible.toNumber(),               // Pure Taxable Base
        totalImpuesto: totalTax.toNumber(),
        totalIGTF: totalIGTF.toNumber(),

        // 💳 CREDIT METRICS (NET CHANGE IN DEBT TODAY)
        ventasCredito: ventasValidas.reduce((acc, v) => {
            // 1. ADD: New Debt Created
            let newDebt = 0;
            if (v.esCredito && v.deudaPendiente !== undefined) {
                newDebt = parseFloat(v.deudaPendiente);
            } else if (v.esCredito) {
                // Legacy Fallback
                const creditPay = (v.pagos || v.payments || []).filter(p => p.medium === 'CREDIT' || p.tipo === 'CREDITO');
                newDebt = creditPay.reduce((sum, p) => sum + (parseFloat(p.monto || p.amount || 0)), 0);
            }

            // 2. SUBTRACT: Debt Paid via Change (Implicit)
            const debtPaidStart = parseFloat(v.appliedToDebt || 0);

            // 3. SUBTRACT: Debt Paid via 'COBRO_DEUDA' Transaction (Explicit)
            // Note: COBRO_DEUDA transactions are excluded from 'ventasValidas' (isValidSale=false)
            // We need to handle this differently if we want to include them here. 
            // BUT, 'ventasCredito' usually means "How much credit did we GIVE". 
            // If the user wants "Accounts Receivable Balance Change", we subtract.
            // Given the label "Pendientes de Cobro", we should subtract payments made *in the same period*.

            return acc + newDebt - debtPaidStart;
        }, 0) - ventas.filter(v => v.tipo === 'COBRO_DEUDA').reduce((acc, v) => acc + parseFloat(v.total || 0), 0)
    };
};
