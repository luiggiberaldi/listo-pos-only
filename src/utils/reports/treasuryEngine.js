import Decimal from 'decimal.js';
import { CURRENCY, MEDIUM } from '../../types/financial';

const d = (val) => new Decimal(val || 0);

// Flujo de Caja (Impacta Dinero en Mano) - Incluye Ventas y Cobros de Deuda
export const isValidCashFlow = (v) => v.status === 'COMPLETADA' && v.tipo !== 'ANULADO';

const getCurrencyType = (methodObj) => {
    if (methodObj.tipo === 'BS' || methodObj.tipo === 'DIVISA') return methodObj.tipo;
    const m = (methodObj.metodo || methodObj.nombre || '').toLowerCase();
    if (m.includes('bs') || m.includes('pago móvil') || m.includes('punto') || m.includes('biopago') || m.includes('transferencia')) {
        return 'BS';
    }
    return 'USD';
};

export const agruparPorMetodo = (ventas = []) => {
    // Cash Flow uses isValidCashFlow
    const ventasValidas = ventas.filter(isValidCashFlow);
    const map = {};

    ventasValidas.forEach(venta => {
        // 🔴 CRITICAL FIX: Ignore "Ghost Payments" in Full Credit Sales
        const deuda = parseFloat(venta.deudaPendiente || 0);
        const total = parseFloat(venta.total || 0);

        // 🧠 LOGIC UPDATE 20/01/26: Removed "|| deuda === 0" to prioritize "Paid" over "User Error".
        // If deuda is 0 on a credit sale, we assume it was fully paid.
        const esCreditoTotal = venta.esCredito && (deuda >= total * 0.99);

        if (esCreditoTotal) {
            // Force mapping to Credit, ignore payments
            if (!map['Crédito']) map['Crédito'] = d(0);
            map['Crédito'] = map['Crédito'].plus(d(venta.total));
            return;
        }
        const listaPagos = venta.pagos || venta.metodos || [];
        const tasaVenta = d(venta.tasa || 1);

        if (Array.isArray(listaPagos) && listaPagos.length > 0) {
            listaPagos.forEach(pago => {
                // 🟢 CHANGE: Allow CREDIT and WALLET for Sales Breakdown (Pie Chart)
                // We only skip INTERNAL system transfers that aren't sales
                if (pago.medium === 'INTERNAL' && pago.tipo !== 'WALLET') return;

                // Normalize Method Name
                let metodo = pago.metodo || pago.nombre || 'Otros';
                // Force "Crédito" label for consistency if type is credit
                if (pago.medium === 'CREDIT' || pago.tipo === 'CREDITO') {
                    metodo = 'Crédito';
                }

                let valor = d(pago.monto || pago.montoUSD || pago.amount || 0);

                const tipo = getCurrencyType(pago);
                // Convert BS to USD for the Chart
                if (tipo === 'BS') {
                    valor = valor.div(tasaVenta);
                }

                if (!map[metodo]) map[metodo] = d(0);
                map[metodo] = map[metodo].plus(valor);
            });

            // 🔥 FIX: Deduct "Abonos" from "Crédito" bucket to avoid Double Counting in Chart
            // If this is a debt collection, it essentially converts Credit -> Cash/POS.
            if (venta.tipo === 'COBRO_DEUDA') {
                if (!map['Crédito']) map['Crédito'] = d(0);
                // We subtract the TOTAL of the Abono from Credit
                map['Crédito'] = map['Crédito'].minus(d(venta.total));
            }

            // RESTA DE VUELTOS (Precisión Decimal)
            if (venta.cambio > 0 && !venta.vueltoCredito) { // 🛑 Only deduct physical change
                const dist = venta.distribucionVuelto || {};
                const cambioTotal = d(venta.cambio);

                if (dist.usd > 0) {
                    let k = Object.keys(map).find(x => !x.toLowerCase().includes('bs') && x.toLowerCase().includes('efectivo')) || 'Efectivo Divisa';
                    if (!map[k]) map[k] = d(0);
                    map[k] = map[k].minus(d(dist.usd));
                }

                if (dist.bs > 0) {
                    // 🔥 FIX: Prioritize 'Efectivo (Bs)' for change deduction. Do NOT deduct from Pago Móvil.
                    let k = Object.keys(map).find(x =>
                        (x.toLowerCase().includes('efectivo') || x.toLowerCase().includes('cash')) &&
                        (x.toLowerCase().includes('bs') || x.toLowerCase().includes('bolívar'))
                    ) || 'Efectivo (Bs)';

                    if (!map[k]) map[k] = d(0);

                    const descuentoBS_USD = d(dist.bs).div(tasaVenta);
                    map[k] = map[k].minus(descuentoBS_USD);
                }

                if (!dist.usd && !dist.bs) {
                    let k = 'Efectivo Divisa';
                    if (map[k]) map[k] = map[k].minus(cambioTotal);
                }
            }

            // 🚀 FIX: Handle Partial Credit remainder even if there are other payments
            const dPending = parseFloat(venta.deudaPendiente || 0);
            if (venta.esCredito && dPending > 0.01 && !esCreditoTotal) {
                if (!map['Crédito']) map['Crédito'] = d(0);
                map['Crédito'] = map['Crédito'].plus(d(dPending));
            }
        } else {
            // FALLBACK LOGIC (No payments array)
            // 🟢 Fix 20/01/26: Handle Partial Credit / Full Payment inference

            if (venta.esCredito) {
                // If Credit, split based on Deuda
                const deuda = parseFloat(venta.deudaPendiente || 0);
                const total = parseFloat(venta.total || 0);
                const pagado = total - deuda;

                if (pagado > 0.01) {
                    // Assume Cash for implicit payments
                    const metodoPago = 'Efectivo (Implícito)';
                    if (!map[metodoPago]) map[metodoPago] = d(0);
                    map[metodoPago] = map[metodoPago].plus(d(pagado));
                }

                if (deuda > 0) {
                    if (!map['Crédito']) map['Crédito'] = d(0);
                    map['Crédito'] = map['Crédito'].plus(d(deuda));
                }

            } else {
                // Standard Cash Sale
                let metodo = 'Efectivo (Legacy)';
                if (!map[metodo]) map[metodo] = d(0);
                map[metodo] = map[metodo].plus(d(venta.total));
            }
        }
    });

    return Object.entries(map)
        .map(([name, valDecimal]) => ({ name, value: valDecimal.toDecimalPlaces(2).toNumber() }))
        .sort((a, b) => b.value - a.value);
};

export const agruparMetodosNativos = (ventas = []) => {
    const ventasValidas = ventas.filter(isValidCashFlow);
    const map = { usd: {}, bs: {} };

    ventasValidas.forEach(venta => {
        // 🔴 CRITICAL FIX: Ignore "Ghost Payments" in Full Credit Sales
        const deuda = parseFloat(venta.deudaPendiente || 0);
        const total = parseFloat(venta.total || 0);
        const esCreditoTotal = venta.esCredito && (deuda >= total * 0.99 || deuda === 0);

        if (esCreditoTotal) {
            // Force mapping to Credit, ignore payments
            if (!map.usd['Crédito']) map.usd['Crédito'] = d(0);
            map.usd['Crédito'] = map.usd['Crédito'].plus(d(venta.total));
            return;
        }
        const listaPagos = venta.pagos || venta.metodos || [];

        if (Array.isArray(listaPagos) && listaPagos.length > 0) {
            listaPagos.forEach(pago => {
                // 🟢 CHANGE: Allow CREDIT and WALLET for detailed native breakdown
                // Only skip INTERNAL system transfers
                if (pago.medium === 'INTERNAL' && pago.tipo !== 'WALLET') return;

                let metodo = pago.metodo || pago.nombre || 'Otros';
                // Force "Crédito" label
                if (pago.medium === 'CREDIT' || pago.tipo === 'CREDITO') {
                    metodo = 'Crédito';
                }

                const valor = d(pago.monto || pago.montoUSD || pago.amount || 0);

                const tipo = getCurrencyType(pago);
                const k = tipo === 'BS' ? 'bs' : 'usd';

                if (!map[k][metodo]) map[k][metodo] = d(0);
                map[k][metodo] = map[k][metodo].plus(valor);
            });

            // RESTA DE VUELTOS (Precisión Decimal)
            if (venta.change && Array.isArray(venta.change)) {
                venta.change.forEach(c => {
                    const k = c.currency === 'VES' ? 'bs' : 'usd';
                    // Asignamos el vuelto al método 'Efectivo' correspondiente
                    // Buscamos un nombre apropiado si ya existe, o default
                    let targetName = Object.keys(map[k]).find(n => n.toLowerCase().includes('efectivo')) || (k === 'bs' ? 'Efectivo (Bs)' : 'Efectivo');

                    if (!map[k][targetName]) map[k][targetName] = d(0);
                    map[k][targetName] = map[k][targetName].minus(d(c.amount));
                });
            }
            else if (venta.cambio > 0) { // Legacy Fallback
                const dist = venta.distribucionVuelto || {};
                if (dist.usd > 0) {
                    let t = 'Efectivo Divisa';
                    if (!map.usd[t] && map.usd['Efectivo']) t = 'Efectivo';
                    if (!map.usd[t]) map.usd[t] = d(0);
                    map.usd[t] = map.usd[t].minus(d(dist.usd));
                }
                if (dist.bs > 0) {
                    let t = 'Efectivo (Bs)';
                    if (!map.bs[t] && map.bs['Efectivo']) t = 'Efectivo'; // Rare for Bs but possible
                    if (!map.bs[t]) map.bs[t] = d(0);
                    map.bs[t] = map.bs[t].minus(d(dist.bs));
                }
            }

            // 🚀 FIX: Handle Partial Credit remainder even if there are other payments
            const dPending = parseFloat(venta.deudaPendiente || 0);
            if (venta.esCredito && dPending > 0.01 && !esCreditoTotal) {
                if (!map.usd['Crédito']) map.usd['Crédito'] = d(0);
                map.usd['Crédito'] = map.usd['Crédito'].plus(d(dPending));
            }

        } else {
            // FALLBACK LEGACY
            let metodo = 'Efectivo (Legacy)';
            if (venta.esCredito) metodo = 'Crédito';

            // Assume USD for legacy unless proven otherwise
            map.usd[metodo] = (map.usd[metodo] || d(0)).plus(d(venta.total));
        }
    });

    const formatGroup = (group) => Object.entries(group)
        .map(([name, valDecimal]) => ({ name, value: valDecimal.toDecimalPlaces(2).toNumber() }))
        .sort((a, b) => b.value - a.value);

    return {
        usd: formatGroup(map.usd),
        bs: formatGroup(map.bs)
    };
};


export const analizarFlujoVueltos = (ventas = []) => {
    // Cash Flow uses isValidCashFlow
    const ventasValidas = ventas.filter(isValidCashFlow);

    const acc = {
        usdCash: { in: d(0), out: d(0) },
        usdDigital: { in: d(0), out: d(0) },
        vesCash: { in: d(0), out: d(0) },
        vesDigital: { in: d(0), out: d(0) },
        appliedToWallet: d(0) // 🆕 Track virtual credits created
    };

    ventasValidas.forEach(venta => {
        // 🔴 CRITICAL FIX: Ignore "Ghost Payments" in Full Credit Sales
        const deuda = parseFloat(venta.deudaPendiente || 0);
        const total = parseFloat(venta.total || 0);
        const esCreditoTotal = venta.esCredito && (deuda >= total * 0.99 || deuda === 0);

        if (esCreditoTotal) return;

        // ----------------------------------------------------
        // 1️⃣ PROCESAR INGRESOS (PAYMENTS)
        // ----------------------------------------------------
        // 🟢 REPAIR ON READ STRATEGY: 
        // Prioritize raw 'metodos' (UI Source of Truth) over 'payments' which might be corrupted or missing.

        const rawMethods = venta.metodos || venta.pagos || [];
        const hasRawMethods = Array.isArray(rawMethods) && rawMethods.length > 0;

        if (hasRawMethods) {
            // Trust the UI Input (ModalPago) which we know is correct (Total $29)
            rawMethods.forEach(pago => {
                const metodoName = (pago.metodo || pago.nombre || pago.method || '').toLowerCase();

                // 🛑 SKIP INTERNAL & CREDIT
                if (pago.medium === 'INTERNAL' || pago.tipo === 'WALLET' || pago.medium === 'CREDIT' || pago.tipo === 'CREDITO') return;

                // 1. Determine Amount (Try all possible fields)
                const amount = d(pago.monto || pago.amount || pago.amountNominal || pago.montoBS || pago.montoUSD || 0);
                if (amount.equals(0)) return;

                // 2. Classify (Robust Heuristic)
                let currency = CURRENCY.USD;
                let medium = MEDIUM.CASH;

                // 🔥 SCHEMA V4 PRIORITY: Campos explícitos
                if (pago.medium && pago.currency) {
                    currency = pago.currency;
                    medium = pago.medium;
                }
                // ⚠️ FALLBACK HEURÍSTICO (Solo para datos heredados sin Schema V4)
                else {
                    const isBs = pago.tipo === 'BS' || pago.tipo === 'VES' || pago.currency === 'VES' ||
                        metodoName.includes('pago') || metodoName.includes('punto') || metodoName.includes('bs');

                    if (isBs) {
                        currency = CURRENCY.VES;
                        medium = (metodoName.includes('efectivo') || metodoName.includes('cash'))
                            ? MEDIUM.CASH
                            : MEDIUM.DIGITAL;
                    } else {
                        currency = CURRENCY.USD;
                        // Asumimos Digital si menciona métodos digitales, sino efectivo por defecto
                        medium = (metodoName.includes('zelle') || metodoName.includes('binance') || metodoName.includes('tarjeta') || metodoName.includes('digital') || metodoName.includes('wallet'))
                            ? MEDIUM.DIGITAL
                            : MEDIUM.CASH;
                    }
                }

                // 3. Accumulate
                if (currency === CURRENCY.USD) {
                    if (medium === MEDIUM.CASH) acc.usdCash.in = acc.usdCash.in.plus(amount);
                    else acc.usdDigital.in = acc.usdDigital.in.plus(amount);
                } else {
                    if (medium === MEDIUM.CASH) acc.vesCash.in = acc.vesCash.in.plus(amount);
                    else acc.vesDigital.in = acc.vesDigital.in.plus(amount);
                }
            });

        } else if (venta.payments && Array.isArray(venta.payments)) {
            // Fallback only if no raw methods available
            venta.payments.forEach(p => {
                // 🛑 SKIP INTERNAL & CREDIT
                if (p.medium === 'INTERNAL' || p.tipo === 'WALLET' || p.medium === 'CREDIT' || p.tipo === 'CREDITO') return;

                const amount = d(p.amountNominal || p.amount || 0);
                const mName = (p.method || '').toLowerCase();
                let cur = p.currency;
                let med = p.medium;

                // Auto-fix Zelle if marked as Cash
                if (mName.includes('zelle')) { cur = CURRENCY.USD; med = MEDIUM.DIGITAL; }

                if (cur === CURRENCY.USD) {
                    if (med === MEDIUM.CASH) acc.usdCash.in = acc.usdCash.in.plus(amount);
                    else acc.usdDigital.in = acc.usdDigital.in.plus(amount);
                } else {
                    if (med === MEDIUM.CASH) acc.vesCash.in = acc.vesCash.in.plus(amount);
                    else acc.vesDigital.in = acc.vesDigital.in.plus(amount);
                }
            });
        }

        // ----------------------------------------------------
        // 2️⃣ PROCESAR EGRESOS (CHANGE/VUELTOS)
        // ----------------------------------------------------
        if (venta.change && Array.isArray(venta.change)) {
            // ✅ NEW SCHEMA
            venta.change.forEach(c => {
                const amount = d(c.amount || 0);
                if (c.currency === CURRENCY.USD) {
                    if (c.medium === MEDIUM.CASH) acc.usdCash.out = acc.usdCash.out.plus(amount);
                    else acc.usdDigital.out = acc.usdDigital.out.plus(amount);
                } else {
                    if (c.medium === MEDIUM.CASH) acc.vesCash.out = acc.vesCash.out.plus(amount);
                    else acc.vesDigital.out = acc.vesDigital.out.plus(amount);
                }
            });
        } else if (venta.cambio > 0) {
            // ⚠️ LEGACY SCHEMA INTEROP
            const dist = venta.distribucionVuelto || {};

            if (dist.usd > 0) acc.usdCash.out = acc.usdCash.out.plus(d(dist.usd));
            if (dist.bs > 0) acc.vesCash.out = acc.vesCash.out.plus(d(dist.bs));

            if (!dist.usd && !dist.bs) {
                acc.usdCash.out = acc.usdCash.out.plus(d(venta.cambio));
            }
        }

        // 3️⃣ PROCESAR SALDOS A FAVOR (VIRTUAL MONEY CREATED)
        // ----------------------------------------------------
        if (venta.appliedToWallet > 0) {
            acc.appliedToWallet = acc.appliedToWallet.plus(d(venta.appliedToWallet));
        }
    });

    // Helper to extract values
    const getQ = (q) => ({
        in: q.in.toNumber(),
        out: q.out.toNumber(),
        total: q.in.minus(q.out).toNumber()
    });

    return {
        usdCash: getQ(acc.usdCash),
        usdDigital: getQ(acc.usdDigital),
        vesCash: getQ(acc.vesCash),
        vesDigital: getQ(acc.vesDigital),
        appliedToWallet: acc.appliedToWallet.toNumber(), // 🆕 Expose virtual debt
        // Totals for Cross-Check
        totalInUSD: acc.usdCash.in.plus(acc.usdDigital.in).toNumber(),
        totalInVES: acc.vesCash.in.plus(acc.vesDigital.in).toNumber()
    };
};

export const calcularTesoreia = (ventas, balancesApertura = {}) => {
    const flujo = analizarFlujoVueltos(ventas);

    // 1. Normalizar Aperturas
    const open = {
        usdCash: parseFloat(balancesApertura.usdCash || balancesApertura.montoInicial || 0),
        vesCash: parseFloat(balancesApertura.vesCash || 0),
        usdDigital: parseFloat(balancesApertura.usdDigital || 0),
        vesDigital: parseFloat(balancesApertura.vesDigital || 0)
    };

    // 2. Calcular Finales (Apertura + Flujo)
    return {
        usdCash: flujo.usdCash.total + open.usdCash,
        vesCash: flujo.vesCash.total + open.vesCash,
        usdDigital: flujo.usdDigital.total + open.usdDigital,
        vesDigital: flujo.vesDigital.total + open.vesDigital,
        appliedToWallet: flujo.appliedToWallet, // 🆕 Expose to Monitor

        // Legacy Compat (para no romper otros componentes si los hubiera)
        cajaUSD: flujo.usdCash.total + open.usdCash,
        cajaBS: flujo.vesCash.total + open.vesCash
    };
};
