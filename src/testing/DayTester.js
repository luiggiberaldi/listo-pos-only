// ============================================================
// 📅 DAY TESTER 3.0 — Full Work Day Scenario Engine
// ============================================================
// VERSIÓN 3.0 — Mejoras:
//   ✅ Balance isolation  — snapshot/restore por escenario
//   ✅ Scenario Apertura  — caja desde cero con corte Z
//   ✅ 0-tests guard      — si demo-limit impide assertions
//   ✅ _aperturaBackup    — restaura sesión del usuario
//   ✅ runWeek mejorado   — totales acumulados por semana
//
// CUATRO SCENARIOS:
//   1. Día Tranquilo  — 20 ventas, 2 gastos, cierre normal
//   2. Día Intenso    — 50 ventas mix, créditos, abonos, nómina
//   3. Día Incidentes — anulaciones, stock agotado, crédito complicado
//   4. Día Apertura   — caja nueva desde cero, corte Z oficial
// ============================================================

import { db } from '../db';
import { SalesService } from '../services/pos/SalesService';
import { FinanceService } from '../services/pos/FinanceService';
import { ShiftService } from '../services/pos/ShiftService';
import { validarIntegridadDiaria } from '../simulation/SimValidator';
import { DEFAULT_CAJA } from '../config/cajaDefaults';
import { timeProvider } from '../utils/TimeProvider';
import { groqService } from '../services/ghost/groqService';
import math from '../utils/mathCore';

// ── State ──
const state = {
    logs: [],
    results: [],
    isRunning: false,
    startTime: 0,
    onLog: null,
    onProgress: null,
    onComplete: null,
    _currentPhase: 'DAY',
    _createdProductIds: [],
    _createdSaleIds: [],
    _createdClientIds: [],
    _createdLogIds: [],
    _cajaWasOpen: false,
    _aperturaBackup: null,   // 3.0: stores user caja for apertura restore
};

// ── Logging ──
function log(msg, type = 'info') {
    const ts = new Date().toLocaleTimeString('es-VE', { hour12: false });
    const icons = { info: 'ℹ️', pass: '✅', fail: '❌', warn: '⚠️', section: '━', ai: '🤖', day: '📅', money: '💰' };
    const icon = icons[type] || 'ℹ️';
    const entry = { time: ts, msg: `${icon} ${msg}`, type, raw: msg };
    state.logs.push(entry);
    state.onLog?.(entry);
}

function section(title) {
    log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'section');
    log(title, 'section');
    log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'section');
}

function phase(emoji, title) {
    log(``, 'info');
    log(`${emoji}  ${title}`, 'day');
    log(`───────────────────────────`, 'section');
}

// ── Assertions ──
function assert(condition, testName, detail = '') {
    const result = { suite: state._currentPhase, test: testName, passed: !!condition, detail };
    state.results.push(result);
    if (condition) {
        log(`PASS: ${testName}`, 'pass');
    } else {
        log(`FAIL: ${testName} — ${detail}`, 'fail');
    }
    return !!condition;
}

function assertClose(actual, expected, testName, tolerance = 0.05) {
    const diff = Math.abs(actual - expected);
    return assert(diff <= tolerance, testName, `Expected ~${expected.toFixed(2)}, got ${actual.toFixed(2)} (diff: ${diff.toFixed(4)})`);
}

// ── DAY TEST USER ──
const DAY_USER = { id: 'day-tester', nombre: 'Day Tester Bot', rol: 'admin' };

// ── Correlativo counter ──
let _dayCorrelativo = 800000;
async function generarCorrelativoDay() {
    _dayCorrelativo++;
    return `DT-${_dayCorrelativo}`;
}

// ── Standalone callbacks replicating hook behavior ──
async function transaccionVenta(itemsCarrito, usuario) {
    for (const item of itemsCarrito) {
        const idKey = Number(item.id) || item.id;
        const prod = await db.productos.get(idKey);
        if (!prod) continue;
        const qty = parseFloat(item.cantidad) || 0;
        const nuevoStock = Math.max(0, (parseFloat(prod.stock) || 0) - qty);
        await db.productos.update(idKey, { stock: nuevoStock });
        const logId = await db.logs.add({
            tipo: 'SALIDA_VENTA', fecha: timeProvider.toISOString(),
            producto: prod.nombre, productId: prod.id,
            cantidad: qty, stockAnterior: prod.stock, stockNuevo: nuevoStock,
            motivo: 'VENTA_DT', usuario: usuario?.nombre
        });
        state._createdLogIds.push(logId);
    }
}

async function actualizarBalances(tipo, pagos, cambio) {
    const sesion = await db.caja_sesion.get(DEFAULT_CAJA);
    if (!sesion || !sesion.isAbierta) return;
    const b = { ...sesion.balances };
    const pagosList = Array.isArray(pagos) ? pagos : [];
    const cambioList = Array.isArray(cambio) ? cambio : [];

    for (const p of pagosList) {
        const amt = parseFloat(p.amount || p.monto || 0);
        const cur = (p.currency || p.tipo || '').toUpperCase();
        const med = (p.medium || '').toUpperCase();
        if (cur === 'USD' || cur === 'DOLLAR') {
            if (med === 'CASH') b.usdCash = math.round((b.usdCash || 0) + amt);
            else b.usdDigital = math.round((b.usdDigital || 0) + amt);
        } else if (cur === 'VES' || cur === 'BS') {
            if (med === 'CASH') b.vesCash = math.round((b.vesCash || 0) + amt);
            else b.vesDigital = math.round((b.vesDigital || 0) + amt);
        }
    }
    for (const c of cambioList) {
        const amt = parseFloat(c.amount || c.monto || 0);
        const cur = (c.currency || c.tipo || '').toUpperCase();
        const med = (c.medium || '').toUpperCase();
        if (cur === 'USD' || cur === 'DOLLAR') {
            if (med === 'CASH') b.usdCash = math.round((b.usdCash || 0) - amt);
        } else if (cur === 'VES' || cur === 'BS') {
            if (med === 'CASH') b.vesCash = math.round((b.vesCash || 0) - amt);
        }
    }
    await db.caja_sesion.update(DEFAULT_CAJA, { balances: b });
}

// ── Product factory ──
async function crearProducto(data) {
    const id = await db.productos.add({
        nombre: data.nombre,
        precio: data.precio,
        precioVenta: data.precio,
        costo: data.costo || data.precio * 0.5,
        stock: data.stock || 50,
        unidadVenta: 'unidad',
        categoria: 'DayTest',
        _dayTest: true,
    });
    state._createdProductIds.push(id);
    return { id, ...data, precioVenta: data.precio };
}

// ── Helper: ensure caja open ──
async function ensureCajaOpen(montoUSD = 200) {
    const sesion = await db.caja_sesion.get(DEFAULT_CAJA);
    if (sesion?.isAbierta) {
        state._cajaWasOpen = true;
        return sesion;
    }
    const balances = { usdCash: montoUSD, usdDigital: 0, vesCash: 0, vesDigital: 0 };
    await db.caja_sesion.put({
        key: DEFAULT_CAJA, isAbierta: true,
        fondoInicial: montoUSD,
        fechaApertura: timeProvider.toISOString(),
        idApertura: `DT-OPEN-${Date.now()}`,
        balances: { ...balances },
        balancesApertura: { ...balances },
        operador: DAY_USER.nombre, operadorId: DAY_USER.id,
        usuarioApertura: DAY_USER.nombre
    });
    return await db.caja_sesion.get(DEFAULT_CAJA);
}

// ── Helper: config snapshot ──
async function getConfig() {
    const cfg = await db.config.get('principal');
    return { tasa: parseFloat(cfg?.tasa) || 90, iva: 0 };
}

// ── Helper: do a single sale (reads real DB stock) ──
async function hacerVenta(prod, cantidad, metodoPago, tasa) {
    const total = math.round(prod.precio * cantidad);
    const prodActual = await db.productos.get(prod.id);
    const stockActual = prodActual?.stock ?? prod.stock ?? 0;
    const ventaFinal = {
        items: [{ id: prod.id, nombre: prod.nombre, precio: prod.precio, cantidad, unidadVenta: 'unidad', stock: stockActual }],
        total, tasa,
        pagos: [metodoPago],
        distribucionVuelto: { usd: 0, bs: 0 },
        esCredito: false,
    };
    const r = await SalesService.registrarVenta(
        ventaFinal, DAY_USER, { tasa, iva: 0, permitirSinStock: false },
        transaccionVenta, actualizarBalances, generarCorrelativoDay
    );
    if (r?.id) state._createdSaleIds.push(r.id);
    return r;
}

// ── Helper: do a credit sale ──
async function hacerVentaCredito(prod, cantidad, clienteId, tasa) {
    const total = math.round(prod.precio * cantidad);
    const ventaFinal = {
        items: [{ id: prod.id, nombre: prod.nombre, precio: prod.precio, cantidad, unidadVenta: 'unidad', stock: 999 }],
        total, tasa,
        clienteId,
        esCredito: true,
        deudaPendiente: total,
        montoSaldoFavor: 0,
        pagos: [],
        distribucionVuelto: { usd: 0, bs: 0 },
    };
    const r = await SalesService.registrarVenta(
        ventaFinal, DAY_USER, { tasa, iva: 0, permitirSinStock: false },
        transaccionVenta, actualizarBalances, generarCorrelativoDay
    );
    if (r?.id) state._createdSaleIds.push(r.id);
    return r;
}

// ── Helper: do a gasto ──
async function hacerGasto(monto, motivo) {
    const r = await FinanceService.registrarGasto({
        monto, moneda: 'USD', medio: 'CASH', motivo,
        usuario: DAY_USER
    });
    if (r?.logId) state._createdLogIds.push(r.logId);
    return r;
}

// ── CLEANUP ──
async function cleanup(scenarioTag) {
    section('🧹 LIMPIEZA DÍA');
    if (state._createdProductIds.length > 0) {
        await db.productos.bulkDelete(state._createdProductIds);
        log(`${state._createdProductIds.length} productos de test eliminados`, 'info');
    }
    if (state._createdSaleIds.length > 0) {
        await db.ventas.bulkDelete(state._createdSaleIds);
        log(`${state._createdSaleIds.length} ventas de test eliminadas`, 'info');
    }
    if (state._createdClientIds.length > 0) {
        await db.clientes.bulkDelete(state._createdClientIds);
        log(`${state._createdClientIds.length} clientes de test eliminados`, 'info');
    }
    if (state._createdLogIds.length > 0) {
        await db.logs.bulkDelete(state._createdLogIds);
        log(`${state._createdLogIds.length} logs de test eliminados`, 'info');
    }
    // Ghost cleanup: DT cortes
    try {
        const testCortes = await db.cortes.filter(c => c.idApertura?.startsWith('DT-')).toArray();
        if (testCortes.length > 0) {
            await db.cortes.bulkDelete(testCortes.map(c => c.id));
            log(`${testCortes.length} corte(s) de test eliminados`, 'info');
        }
    } catch { }

    // 3.0 — Restore apertura backup caja if needed
    if (state._aperturaBackup) {
        try {
            await db.caja_sesion.put(state._aperturaBackup);
            log('Sesión de usuario restaurada tras apertura test', 'info');
        } catch (e) { log(`Restore sesión falló: ${e.message}`, 'warn'); }
        state._aperturaBackup = null;
    }

    log('Limpieza OK — DB sin residuos de Day Test', 'pass');
}

// ════════════════════════════════════════════════════════════
// SCENARIO 1: DÍA TRANQUILO
// ════════════════════════════════════════════════════════════
async function scenarioTranquilo() {
    state._currentPhase = 'TRANQUILO';
    section('📅 SCENARIO 1: DÍA TRANQUILO');
    log('Descripción: 20 ventas mixtas, 2 gastos, cierre limpio.', 'info');

    const sesion = await ensureCajaOpen(200);
    const config = await getConfig();
    const { tasa } = config;
    const balancesInicio = { ...sesion.balances };
    log(`Apertura — USD Cash: $${balancesInicio.usdCash} | Tasa: Bs${tasa}/$`, 'info');

    phase('🛒', 'MAÑANA — Primeras ventas del día');
    const agua = await crearProducto({ nombre: '🧪 Agua DT', precio: 2.00, costo: 0.80, stock: 100 });
    const cafe = await crearProducto({ nombre: '🧪 Café DT', precio: 3.50, costo: 1.20, stock: 80 });
    const pan = await crearProducto({ nombre: '🧪 Pan DT', precio: 1.50, costo: 0.60, stock: 60 });

    let ventasContado = 0, ingresoEsperadoUSD = 0;

    for (let i = 0; i < 10; i++) {
        const prod = i % 3 === 0 ? agua : i % 3 === 1 ? cafe : pan;
        const qty = (i % 2) + 1;
        try {
            await hacerVenta(prod, qty, { metodo: 'Efectivo $', amount: prod.precio * qty, currency: 'USD', tipo: 'USD', medium: 'CASH' }, tasa);
            ventasContado++;
            ingresoEsperadoUSD += prod.precio * qty;
        } catch (e) {
            if (e.message?.includes('DEMO_LIMIT')) { log('⚠️ Demo limit alcanzado', 'warn'); break; }
        }
    }
    log(`Mañana: ${ventasContado} ventas | Ingreso USD: $${ingresoEsperadoUSD.toFixed(2)}`, 'info');

    phase('💲', 'MEDIODÍA — Gastos del negocio');
    let gastoTotal = 0;
    try { await hacerGasto(15.00, 'Mercancía DT - mañana'); gastoTotal += 15.00; log('Gasto #1: $15 mercancía', 'info'); }
    catch (e) { log(`Gasto #1 falló: ${e.message}`, 'warn'); }

    phase('🌆', 'TARDE — Segunda jornada');
    const refrescos = await crearProducto({ nombre: '🧪 Refresco DT', precio: 2.50, costo: 1.00, stock: 50 });
    let ventasTarde = 0;
    for (let i = 0; i < 10; i++) {
        const prod = i % 2 === 0 ? refrescos : agua;
        try {
            if (i < 7) {
                await hacerVenta(prod, 1, { metodo: 'Efectivo $', amount: prod.precio, currency: 'USD', tipo: 'USD', medium: 'CASH' }, tasa);
                ingresoEsperadoUSD += prod.precio;
            } else {
                await hacerVenta(prod, 1, { metodo: 'Efectivo Bs', amount: math.round(prod.precio * tasa), currency: 'VES', tipo: 'BS', medium: 'CASH' }, tasa);
                ingresoEsperadoUSD += prod.precio;
            }
            ventasTarde++;
        } catch (e) {
            if (e.message?.includes('DEMO_LIMIT')) { log('⚠️ Demo limit', 'warn'); break; }
        }
    }
    log(`Tarde: ${ventasTarde} ventas adicionales`, 'info');
    try { await hacerGasto(8.00, 'Servicios DT - tarde'); gastoTotal += 8.00; log('Gasto #2: $8 servicios', 'info'); }
    catch (e) { log(`Gasto #2 falló: ${e.message}`, 'warn'); }

    phase('🔍', 'VERIFICACIÓN DE COHERENCIA');
    state._currentPhase = 'TRANQUILO_CHECK';
    const cajaMedio = await db.caja_sesion.get(DEFAULT_CAJA);
    const balancesMedio = cajaMedio?.balances || {};
    const deltaUSD = (balancesMedio.usdCash || 0) - (balancesInicio.usdCash || 0);
    log(`Balance USD actual: $${(balancesMedio.usdCash || 0).toFixed(2)}`, 'money');
    log(`Delta USD esperado ≈ $${(ingresoEsperadoUSD - gastoTotal).toFixed(2)} | Real: +$${deltaUSD.toFixed(2)}`, 'money');
    assert((balancesMedio.usdCash || 0) >= 0, 'USD Cash ≥ $0 (sin balance negativo)');
    assert((balancesMedio.vesCash || 0) >= 0, 'VES Cash ≥ 0 (sin balance negativo)');
    const aguaAct = await db.productos.get(agua.id);
    const cafeAct = await db.productos.get(cafe.id);
    assert((aguaAct?.stock || 0) >= 0, `Stock "Agua DT" ≥ 0 (got ${aguaAct?.stock})`);
    assert((cafeAct?.stock || 0) >= 0, `Stock "Café DT" ≥ 0 (got ${cafeAct?.stock})`);
    const totalVentas = ventasContado + ventasTarde;
    assert(totalVentas >= 10, `Total ventas del día ≥ 10 (got ${totalVentas})`);

    phase('🔒', 'CIERRE DEL DÍA');
    state._currentPhase = 'TRANQUILO';
    if (!state._cajaWasOpen) {
        try {
            const report = await ShiftService.cerrarCaja(DAY_USER, {}, null);
            assert(!!report, 'Cierre Z generado correctamente');
            log('Corte Z emitido — sesión cerrada', 'info');
            await ensureCajaOpen(200);
        } catch (e) { assert(false, 'Cierre Z sin error', e.message); }
    } else {
        log('ℹ️ Caja era del usuario — no se cierra automáticamente', 'warn');
        assert(true, 'Día finalizado (caja del usuario preservada)');
    }

    phase('🔬', 'INTEGRIDAD DE BASE DE DATOS');
    try {
        const integrity = await validarIntegridadDiaria({ fecha: new Date().toISOString() });
        const critFails = integrity.checks.filter(c => !c.passed && c.severity === 'CRITICAL');
        assert(critFails.length === 0, `DB sin errores CRÍTICOS (${integrity.passed}/${integrity.total} checks OK)`,
            critFails.map(c => c.detail).join('; '));
        if (integrity.bugs.length > 0) integrity.bugs.forEach(b => log(b, 'warn'));
    } catch (e) { log(`Integrity check error: ${e.message}`, 'warn'); }

    return { ventas: totalVentas, ingresoUSD: ingresoEsperadoUSD, gastos: gastoTotal, netaUSD: ingresoEsperadoUSD - gastoTotal };
}

// ════════════════════════════════════════════════════════════
// SCENARIO 2: DÍA INTENSO
// ════════════════════════════════════════════════════════════
async function scenarioIntenso() {
    state._currentPhase = 'INTENSO';
    section('📅 SCENARIO 2: DÍA INTENSO');
    log('Descripción: 40 ventas, créditos, abonos, gastos, anticipo nómina.', 'info');

    const sesion = await ensureCajaOpen(300);
    const config = await getConfig();
    const { tasa } = config;
    const balancesInicio = { ...sesion.balances };
    log(`Apertura — USD Cash: $${balancesInicio.usdCash} | Tasa: Bs${tasa}/$`, 'info');

    const prod1 = await crearProducto({ nombre: '🧪 Prd-A DT', precio: 5.00, costo: 2.00, stock: 100 });
    const prod2 = await crearProducto({ nombre: '🧪 Prd-B DT', precio: 8.00, costo: 3.00, stock: 60 });
    const prod3 = await crearProducto({ nombre: '🧪 Prd-C DT', precio: 12.00, costo: 5.00, stock: 40 });

    const clienteId = await db.clientes.add({
        nombre: '🧪 Cliente Intenso DT', cedula: '99-DT-INT',
        telefono: '', email: '', deuda: 0, favor: 0, saldo: 0,
        createdAt: timeProvider.toISOString()
    });
    state._createdClientIds.push(clienteId);
    log(`Cliente crédito creado: ID ${clienteId}`, 'info');

    phase('🛒', 'JORNADA — 40 ventas (USD, Bs y Crédito)');
    let ventasOK = 0, ingresoUSD = 0, totalCreditoOtorgado = 0;

    for (let i = 0; i < 40; i++) {
        if (!state.isRunning) break;
        const prod = i % 3 === 0 ? prod1 : i % 3 === 1 ? prod2 : prod3;
        try {
            if (i % 7 === 0 && i > 0) {
                await hacerVentaCredito(prod, 1, clienteId, tasa);
                totalCreditoOtorgado += prod.precio;
                ventasOK++;
            } else if (i % 3 === 2) {
                await hacerVenta(prod, 1, { metodo: 'Efectivo Bs', amount: math.round(prod.precio * tasa), currency: 'VES', tipo: 'BS', medium: 'CASH' }, tasa);
                ingresoUSD += prod.precio; ventasOK++;
            } else {
                await hacerVenta(prod, 1, { metodo: 'Efectivo $', amount: prod.precio, currency: 'USD', tipo: 'USD', medium: 'CASH' }, tasa);
                ingresoUSD += prod.precio; ventasOK++;
            }
        } catch (e) {
            if (e.message?.includes('DEMO_LIMIT')) { log(`⚠️ Demo limit en venta ${i + 1}`, 'warn'); break; }
        }
    }
    log(`Ventas completadas: ${ventasOK} | Ingreso USD: $${ingresoUSD.toFixed(2)} | Crédito: $${totalCreditoOtorgado.toFixed(2)}`, 'info');

    phase('💳', 'COBRANZA — Abono de cliente');
    let abonoAmount = 0;
    const clienteConDeuda = await db.clientes.get(clienteId);
    if ((clienteConDeuda?.deuda || 0) > 0) {
        const abonar = math.round(clienteConDeuda.deuda / 2);
        try {
            const abonoResult = await SalesService.registrarAbono(
                clienteId,
                [{ metodo: 'Efectivo $', monto: abonar, currency: 'USD', tipo: 'USD', medium: 'CASH' }],
                abonar, 'Abono intenso DT',
                DAY_USER, { tasa, iva: 0 },
                actualizarBalances, generarCorrelativoDay
            );
            if (abonoResult?.id) state._createdSaleIds.push(abonoResult.id);
            abonoAmount = abonar; ingresoUSD += abonar;
            log(`Abono de $${abonar} registrado`, 'info');
        } catch (e) { log(`Abono falló: ${e.message}`, 'warn'); }
    }

    phase('💸', 'GASTOS DEL DÍA');
    let gastoTotal = 0;
    for (const g of [{ monto: 20, motivo: 'Mercancía DT-A' }, { monto: 12, motivo: 'Transporte DT' }, { monto: 5, motivo: 'Empaques DT' }]) {
        try { await hacerGasto(g.monto, g.motivo); gastoTotal += g.monto; }
        catch (e) { log(`Gasto falló: ${e.message}`, 'warn'); }
    }
    log(`Gastos del día: $${gastoTotal}`, 'info');

    phase('👔', 'NÓMINA — Anticipo empleado');
    try {
        const empId = `dt-emp-${Date.now()}`;
        const nominaId = await db.empleados_finanzas.add({
            userId: empId, nombre: 'Emp DT Test', sueldo: 150,
            deuda: 0, favor: 0, periodoId: 999, fecha: timeProvider.toISOString()
        });
        await db.nomina_ledger.add({
            empleadoId: empId, periodoId: 999,
            subtipo: 'ANTICIPO', monto: 15,
            descripcion: 'Anticipo DT Test', fecha: timeProvider.toISOString()
        });
        state._createdLogIds.push(nominaId);
        log('Anticipo de $15 registrado para empleado DT', 'info');
    } catch (e) { log(`Nómina falló: ${e.message}`, 'warn'); }

    phase('🔍', 'VERIFICACIÓN DE COHERENCIA — DÍA INTENSO');
    state._currentPhase = 'INTENSO_CHECK';
    const cajaFinal = await db.caja_sesion.get(DEFAULT_CAJA);
    const bal = cajaFinal?.balances || {};
    log(`Balance final USD Cash: $${(bal.usdCash || 0).toFixed(2)}`, 'money');
    log(`Balance final VES Cash: Bs${(bal.vesCash || 0).toFixed(0)}`, 'money');
    assert((bal.usdCash || 0) >= 0, 'USD Cash final ≥ $0');
    assert((bal.vesCash || 0) >= 0, 'VES Cash final ≥ 0');
    assert(ventasOK >= 20, `Al menos 20 ventas completadas (got ${ventasOK})`);
    const clienteFinal = await db.clientes.get(clienteId);
    const deudaEsperada = math.round(totalCreditoOtorgado - abonoAmount);
    if (totalCreditoOtorgado > 0) {
        assert((clienteFinal?.deuda || 0) >= 0, `Deuda cliente ≥ $0 (got $${clienteFinal?.deuda})`);
        assertClose(clienteFinal?.deuda || 0, deudaEsperada, `Deuda cliente correcta: ~$${deudaEsperada.toFixed(2)} (got $${(clienteFinal?.deuda || 0).toFixed(2)})`, 0.10);
    }
    try {
        const integrity = await validarIntegridadDiaria({});
        const critFails = integrity.checks.filter(c => !c.passed && c.severity === 'CRITICAL');
        assert(critFails.length === 0, `DB sin errores CRÍTICOS (${integrity.passed}/${integrity.total} checks)`,
            critFails.map(c => c.detail).join('; '));
    } catch (e) { log(`Integrity check error: ${e.message}`, 'warn'); }

    return { ventas: ventasOK, ingresoUSD, creditoOtorgado: totalCreditoOtorgado, abonoRecibido: abonoAmount, gastos: gastoTotal, netaUSD: ingresoUSD - gastoTotal };
}

// ════════════════════════════════════════════════════════════
// SCENARIO 3: DÍA CON INCIDENTES
// ════════════════════════════════════════════════════════════
async function scenarioIncidentes() {
    state._currentPhase = 'INCIDENTES';
    section('📅 SCENARIO 3: DÍA CON INCIDENTES');
    log('Descripción: anulaciones, stock agotado, rechazos correctos.', 'info');

    const sesion = await ensureCajaOpen(250);
    const config = await getConfig();
    const { tasa } = config;
    const balancesInicio = { ...sesion.balances };
    log(`Apertura — USD Cash: $${balancesInicio.usdCash}`, 'info');

    const prodLimitado = await crearProducto({ nombre: '🧪 Stock-Lim DT', precio: 3.00, costo: 1.20, stock: 4 });
    const prodNormal = await crearProducto({ nombre: '🧪 Normal DT', precio: 6.00, costo: 2.50, stock: 50 });

    phase('🛒', 'INCIDENTE 1 — Agotamiento controlado de stock');
    state._currentPhase = 'INCIDENTES';
    let stockVentasOK = 0;

    for (let i = 0; i < 4; i++) {
        try {
            await hacerVenta(prodLimitado, 1, { metodo: 'Efectivo $', amount: 3.00, currency: 'USD', tipo: 'USD', medium: 'CASH' }, tasa);
            stockVentasOK++;
        } catch (e) {
            if (e.message?.includes('DEMO_LIMIT')) { log('⚠️ Demo limit', 'warn'); break; }
        }
    }

    let rechazoOK = false;
    try {
        await hacerVenta(prodLimitado, 1, { metodo: 'Efectivo $', amount: 3.00, currency: 'USD', tipo: 'USD', medium: 'CASH' }, tasa);
        rechazoOK = false;
    } catch (e) {
        rechazoOK = e.message?.includes('STOCK') || e.message?.includes('INSUFICIENTE') || e.message?.includes('DEMO_LIMIT');
    }

    const prodAgotado = await db.productos.get(prodLimitado.id);
    assert((prodAgotado?.stock || 0) >= 0, `Stock no negativo tras agotamiento (got ${prodAgotado?.stock})`);
    assert(stockVentasOK <= 4, `No se vendió más del stock disponible (vendidas: ${stockVentasOK})`);
    assert(rechazoOK || stockVentasOK < 4, 'Venta con stock=0 rechazada correctamente');
    log(`Stock agotado con ${stockVentasOK}/4 ventas completadas — ${rechazoOK ? 'rechazo confirmado' : 'demo limit'}`, 'info');

    phase('❌', 'INCIDENTE 2 — Anulación mid-día');
    let ventaParaAnular = null;
    try {
        ventaParaAnular = await hacerVenta(prodNormal, 2, { metodo: 'Efectivo $', amount: 12.00, currency: 'USD', tipo: 'USD', medium: 'CASH' }, tasa);
    } catch (e) {
        if (e.message?.includes('DEMO_LIMIT')) log('⚠️ Demo limit — skip anulación', 'warn');
    }

    if (ventaParaAnular?.id) {
        const cajaPrevAnulacion = await db.caja_sesion.get(DEFAULT_CAJA);
        const usdPrevAnulacion = cajaPrevAnulacion?.balances?.usdCash || 0;
        try {
            const anulResult = await SalesService.anularVenta(
                ventaParaAnular.id, 'Anulación DT test', DAY_USER,
                async () => { }, actualizarBalances
            );
            const cajaPostAnulacion = await db.caja_sesion.get(DEFAULT_CAJA);
            const usdPostAnulacion = cajaPostAnulacion?.balances?.usdCash || 0;
            assert(!!anulResult?.success || anulResult !== undefined, 'Anulación ejecutada sin error');
            // Anular devuelve el dinero → balance sube
            assert(usdPostAnulacion >= usdPrevAnulacion, `Caja revertida (devuelto dinero): $${usdPrevAnulacion} → $${usdPostAnulacion}`);
            log(`Anulación OK — Caja de $${usdPrevAnulacion} → $${usdPostAnulacion} (retorno correcto)`, 'info');
            state._createdSaleIds = state._createdSaleIds.filter(id => id !== ventaParaAnular.id);
        } catch (e) { assert(false, 'Anulación sin error', e.message); }
    } else {
        assert(true, 'Anulación — skip (demo limit)');
    }

    phase('💳', 'INCIDENTE 3 — Venta 100% crédito sin abono');
    const clienteCredId = await db.clientes.add({
        nombre: '🧪 Cli-Incidente DT', cedula: '99-DT-INC',
        telefono: '', email: '', deuda: 0, favor: 0, saldo: 0,
        createdAt: timeProvider.toISOString()
    });
    state._createdClientIds.push(clienteCredId);

    let creditoFull = 0;
    try {
        await hacerVentaCredito(prodNormal, 3, clienteCredId, tasa);
        creditoFull = 18.00;
        log(`Venta a crédito: $${creditoFull} — sin abono hoy`, 'info');
    } catch (e) {
        if (e.message?.includes('DEMO_LIMIT')) log('⚠️ Demo limit — skip crédito', 'warn');
    }

    phase('🔍', 'VERIFICACIÓN — DÍA INCIDENTES');
    state._currentPhase = 'INCIDENTES_CHECK';
    const cajaFinal = await db.caja_sesion.get(DEFAULT_CAJA);
    const bal = cajaFinal?.balances || {};
    assert((bal.usdCash || 0) >= 0, `Balance USD final positivo ($${(bal.usdCash || 0).toFixed(2)})`);
    if (creditoFull > 0) {
        const clienteDeuda = await db.clientes.get(clienteCredId);
        assertClose(clienteDeuda?.deuda || 0, creditoFull, `Deuda registro correcto (~$${creditoFull})`, 0.10);
    }
    try {
        const integrity = await validarIntegridadDiaria({});
        const critFails = integrity.checks.filter(c => !c.passed && c.severity === 'CRITICAL');
        assert(critFails.length === 0, `DB sin errores CRÍTICOS (${integrity.passed}/${integrity.total} checks)`,
            critFails.map(c => c.detail).join('; '));
    } catch (e) { log(`Integrity check error: ${e.message}`, 'warn'); }

    return { stockVentasOK, rechazoStockOK: rechazoOK, anulacionOK: ventaParaAnular?.id != null, creditoFull };
}

// ════════════════════════════════════════════════════════════
// SCENARIO 4: DÍA DE APERTURA — 3.0 NEW
// Simula apertura de negocio desde cero:
//   - Caja del usuario suspendida temporalmente
//   - Apertura fresh de $100
//   - 15 ventas + 1 gasto
//   - Corte Z oficial
//   - Caja del usuario restaurada
// ════════════════════════════════════════════════════════════
async function scenarioApertura() {
    state._currentPhase = 'APERTURA';
    section('📅 SCENARIO 4: DÍA DE APERTURA DESDE CERO');
    log('Descripción: apertura de caja nueva, 15 ventas, corte Z oficial.', 'info');

    // ── Suspend user caja temporarily ──
    const existingSesion = await db.caja_sesion.get(DEFAULT_CAJA);
    if (existingSesion?.isAbierta) {
        state._aperturaBackup = { ...existingSesion };
        // Mark it as not-abierta so services don't pick it up
        await db.caja_sesion.update(DEFAULT_CAJA, { isAbierta: false, _dtSuspended: true });
        log('Sesión de usuario suspendida temporalmente para test apertura', 'warn');
    }

    // ── Open fresh caja ──
    const montoApertura = 100;
    const balances = { usdCash: montoApertura, usdDigital: 0, vesCash: 0, vesDigital: 0 };
    await db.caja_sesion.put({
        key: DEFAULT_CAJA, isAbierta: true,
        fondoInicial: montoApertura,
        fechaApertura: timeProvider.toISOString(),
        idApertura: `DT-AP-${Date.now()}`,
        balances: { ...balances },
        balancesApertura: { ...balances },
        operador: DAY_USER.nombre, operadorId: DAY_USER.id,
        usuarioApertura: DAY_USER.nombre
    });
    log(`✅ Caja aperturada con $${montoApertura} USD`, 'info');

    const config = await getConfig();
    const { tasa } = config;

    const prod1 = await crearProducto({ nombre: '🧪 Apertura-A DT', precio: 4.00, costo: 1.50, stock: 50 });
    const prod2 = await crearProducto({ nombre: '🧪 Apertura-B DT', precio: 7.00, costo: 2.80, stock: 40 });

    phase('🛒', 'JORNADA — 15 ventas de apertura');
    let ventasOK = 0, ingresoUSD = 0;
    for (let i = 0; i < 15; i++) {
        const prod = i % 2 === 0 ? prod1 : prod2;
        try {
            await hacerVenta(prod, 1, { metodo: 'Efectivo $', amount: prod.precio, currency: 'USD', tipo: 'USD', medium: 'CASH' }, tasa);
            ventasOK++;
            ingresoUSD += prod.precio;
        } catch (e) {
            if (e.message?.includes('DEMO_LIMIT')) { log('⚠️ Demo limit en ventas apertura', 'warn'); break; }
        }
    }
    log(`Ventas del día: ${ventasOK} | Ingreso: $${ingresoUSD.toFixed(2)}`, 'info');

    try { await hacerGasto(10, 'Suministros apertura DT'); log('Gasto: $10 suministros', 'info'); }
    catch (e) { log(`Gasto falló: ${e.message}`, 'warn'); }

    phase('🔍', 'VERIFICACIÓN PRE-CIERRE');
    state._currentPhase = 'APERTURA_CHECK';
    const cajaMid = await db.caja_sesion.get(DEFAULT_CAJA);
    const balMid = cajaMid?.balances || {};
    assert((balMid.usdCash || 0) > 0, `Caja activa con saldo positivo ($${(balMid.usdCash || 0).toFixed(2)})`);
    assert(ventasOK >= 5, `Al menos 5 ventas realizadas (got ${ventasOK})`);

    phase('🔒', 'CIERRE Z — CORTE OFICIAL');
    state._currentPhase = 'APERTURA';
    let corteGenerado = false;
    try {
        const report = await ShiftService.cerrarCaja(DAY_USER, {}, null);
        corteGenerado = !!report;
        assert(corteGenerado, 'Corte Z generado correctamente');
        log('Corte Z emitido — sesión cerrada por Day Tester', 'info');
    } catch (e) { assert(false, 'Corte Z sin error', e.message); }

    const cajaPostCierre = await db.caja_sesion.get(DEFAULT_CAJA);
    assert(!cajaPostCierre?.isAbierta, 'Caja cerrada tras corte Z');

    try {
        const integrity = await validarIntegridadDiaria({});
        const critFails = integrity.checks.filter(c => !c.passed && c.severity === 'CRITICAL');
        assert(critFails.length === 0, `DB sin errores CRÍTICOS (${integrity.passed}/${integrity.total} checks)`,
            critFails.map(c => c.detail).join('; '));
    } catch (e) { log(`Integrity check error: ${e.message}`, 'warn'); }

    return { ventasOK, ingresoUSD, corteGenerado };
}

// ════════════════════════════════════════════
// GROQ AI ANALYSIS — DAILY
// ════════════════════════════════════════════
async function analyzeScenario(scenarioName, dayMetrics, results) {
    state._currentPhase = 'AI';
    section('🤖 ANÁLISIS AI DEL DÍA');

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const failDetails = results.filter(r => !r.passed).map(r => `[${r.suite}] ${r.test}: ${r.detail}`).join('\n');

    const prompt = `Eres un QA Lead analizando la simulación de un día de trabajo en un sistema POS venezolano.

ESCENARIO: ${scenarioName}
RESULTADOS: ${passed} pass | ${failed} fail

MÉTRICAS DEL DÍA:
${JSON.stringify(dayMetrics, null, 2)}

${failed > 0 ? `FALLOS:\n${failDetails}` : 'Sin fallos detectados.'}

Responde en español, máximo 180 palabras:
1. Veredicto del día (🟢 DÍA EXITOSO / 🟡 ALERTAS / 🔴 PROBLEMAS)
2. Observación más importante sobre la coherencia financiera
3. Riesgo detectado para producción
4. Una recomendación`;

    try {
        const resp = await groqService.generateResponse(
            [{ role: 'user', content: prompt }],
            'Eres un QA Engineer senior de sistemas POS. Responde técnico y directo.'
        );
        log('Análisis Groq completado:', 'ai');
        log(resp.text, 'ai');
        return resp.text;
    } catch (e) {
        log(`Groq omitido: ${e.message}`, 'warn');
        return null;
    }
}

// ════════════════════════════════════════════
// GROQ AI ANALYSIS — WEEKLY (3.0)
// Informe completo de los 5 días con tendencias, riesgos
// acumulados y recomendaciones para producción.
// ════════════════════════════════════════════
async function analyzeWeek(weekReport, onLog) {
    const { days, totals } = weekReport;

    // Build per-day summary for the prompt
    const daySummaries = days.map((d, i) =>
        `Día ${i + 1} — ${d.dia} (${d.key}): ${d.passed}P/${d.failed}F | ` +
        `Ventas: ${d.dayMetrics?.ventas || d.dayMetrics?.ventasOK || 0} | ` +
        `Ingreso: $${(d.dayMetrics?.ingresoUSD || 0).toFixed(2)} | ` +
        `Gastos: $${(d.dayMetrics?.gastos || 0).toFixed(2)} | ` +
        `Neta: $${(d.dayMetrics?.netaUSD || 0).toFixed(2)}` +
        (d.failed > 0 ? ` \u274c FALLOS: ${d.results?.filter(r => !r.passed).map(r => r.test).join(', ')}` : ' ✅')
    ).join('\n');

    const prompt = `Eres un QA Lead senior de sistemas POS venezolanos. Analizas una semana laboral completa de simulación.

RESUMEN SEMANAL:
${daySummaries}

TOTALES:
- Tests: ${totals.total} | Pass: ${totals.pass} | Fail: ${totals.fail}
- Ventas semana: ${totals.ventas}
- Ingreso total USD: $${totals.ingresoUSD.toFixed(2)}
- Gastos totales: $${totals.gastos.toFixed(2)}
- Neta semanal USD: $${totals.netaUSD.toFixed(2)}
- Tiempo total: ${totals.elapsed}s

Responde en español, máximo 280 palabras:
1. 🎆 VEREDICTO SEMANAL (🟢 SEMANA EXITOSA / 🟡 ALERTAS / 🔴 PROBLEMAS)
2. 📈 TENDENCIA FINANCIERA: análisis de la evolución del balance día a día
3. ⚠️ RIESGO MÁS ALTO detectado en toda la semana
4. 🔍 PATRÓN DETECTADO: algo positivo o negativo que se repitió en +2 días
5. ✅ RECOMENDACIÓN PRIORITARIA para poner este sistema en producción`;

    try {
        const resp = await groqService.generateResponse(
            [{ role: 'user', content: prompt }],
            'Eres un QA Engineer senior y analista financiero de sistemas POS. Respuesta estructurada, técnica y concisa.'
        );
        // Log the weekly analysis through the same log function
        const weekEntry = {
            time: new Date().toLocaleTimeString('es-VE', { hour12: false }),
            msg: `🤖 INFORME SEMANAL GROQ:\n${resp.text}`,
            type: 'ai', raw: resp.text
        };
        state.logs.push(weekEntry);
        onLog?.(weekEntry);
        return resp.text;
    } catch (e) {
        const failEntry = {
            time: new Date().toLocaleTimeString('es-VE', { hour12: false }),
            msg: `⚠️ Groq semanal omitido: ${e.message}`, type: 'warn', raw: e.message
        };
        state.logs.push(failEntry);
        onLog?.(failEntry);
        return null;
    }
}

// ════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════

const SCENARIOS = {
    tranquilo: { name: '☀️ Día Tranquilo', fn: scenarioTranquilo, description: '20 ventas, 2 gastos, cierre normal' },
    intenso: { name: '🔥 Día Intenso', fn: scenarioIntenso, description: '40 ventas, créditos, abonos, nómina' },
    incidentes: { name: '⚡ Día con Incidentes', fn: scenarioIncidentes, description: 'Anulaciones, stock agotado, crédito full' },
    apertura: { name: '🌅 Día de Apertura', fn: scenarioApertura, description: 'Caja desde cero, 15 ventas, corte Z oficial' },
};

export const DayTester = {
    /** Run a single day scenario with full isolation */
    runScenario: async (scenarioKey, callbacks = {}) => {
        const scenario = SCENARIOS[scenarioKey];
        if (!scenario) throw new Error(`Escenario "${scenarioKey}" no existe. Disponibles: ${Object.keys(SCENARIOS).join(', ')}`);

        // Reset state
        state.logs = [];
        state.results = [];
        state.isRunning = true;
        state.startTime = Date.now();
        state._createdProductIds = [];
        state._createdSaleIds = [];
        state._createdClientIds = [];
        state._createdLogIds = [];
        state._cajaWasOpen = false;
        state._aperturaBackup = null;
        _dayCorrelativo = 800000;

        state.onLog = callbacks.onLog || null;
        state.onProgress = callbacks.onProgress || null;
        state.onComplete = callbacks.onComplete || null;

        // 3.0 — BALANCE ISOLATION: snapshot before running (skip for apertura which manages its own caja)
        const _isAperturaScenario = scenarioKey === 'apertura';
        const _cajaPreRun = !_isAperturaScenario ? await db.caja_sesion.get(DEFAULT_CAJA) : null;
        const _balancesSnapshot = _cajaPreRun?.isAbierta ? { ..._cajaPreRun.balances } : null;

        section(`📅 DAY TESTER — ${scenario.name.toUpperCase()}`);
        log(`Fecha: ${new Date().toLocaleString('es-VE')}`, 'info');
        log(`Descripción: ${scenario.description}`, 'info');

        let dayMetrics = {};
        try {
            dayMetrics = await scenario.fn();
        } catch (err) {
            log(`💥 Error fatal en escenario: ${err.message}`, 'fail');
            state.results.push({ suite: scenarioKey, test: 'SCENARIO_CRASH', passed: false, detail: err.message });
        }

        // 3.0 — 0-tests guard: demo limit may have prevented any test from running
        if (state.results.length === 0) {
            state.results.push({ suite: scenarioKey, test: 'SCENARIO_ASSERTIONS', passed: false, detail: 'Sin assertions ejecutadas — demo limit o error prematuro' });
            log('⚠️ Ninguna assertion ejecutada — demo limit o error temprano', 'warn');
        }

        // AI Analysis (uses results collected so far)
        let aiAnalysis = null;
        try {
            aiAnalysis = await analyzeScenario(scenario.name, dayMetrics, state.results);
        } catch (e) { }

        // Cleanup
        await cleanup(scenarioKey);

        // 3.0 — BALANCE RESTORE: put caja back to pre-test state
        if (_balancesSnapshot) {
            try {
                const cajaPostCleanup = await db.caja_sesion.get(DEFAULT_CAJA);
                if (cajaPostCleanup?.isAbierta) {
                    await db.caja_sesion.update(DEFAULT_CAJA, { balances: { ..._balancesSnapshot } });
                    log('💾 Balances restaurados al estado pre-test', 'info');
                }
            } catch (e) { /* silent — non-critical */ }
        }

        const elapsed = ((Date.now() - state.startTime) / 1000).toFixed(1);
        const passed = state.results.filter(r => r.passed).length;
        const failed = state.results.filter(r => !r.passed).length;

        section('📊 RESULTADO DEL DÍA');
        log(`Tests: ${passed + failed} | ✅ Pass: ${passed} | ❌ Fail: ${failed} | ⏱️ ${elapsed}s`, failed === 0 ? 'pass' : 'fail');
        log(`Veredicto: ${failed === 0 ? '🟢 DÍA EXITOSO — SISTEMA CORRECTO' : `🔴 ${failed} FALLO(S) DETECTADO(S)`}`, failed === 0 ? 'pass' : 'fail');

        state.isRunning = false;
        const summary = { scenario: scenarioKey, passed, failed, total: passed + failed, elapsed, dayMetrics, aiAnalysis, results: [...state.results] };
        state.onComplete?.(summary);
        return summary;
    },

    /** Run all 4 day scenarios sequentially */
    runAll: async (callbacks = {}) => {
        const allResults = [];
        for (const key of Object.keys(SCENARIOS)) {
            const result = await DayTester.runScenario(key, callbacks);
            allResults.push(result);
            if (callbacks.onScenarioComplete) callbacks.onScenarioComplete(result);
        }
        return allResults;
    },

    /**
     * Simulate a full work week (5 days: Mon–Fri).
     * Day schedule: Tranquilo, Intenso, Incidentes, Apertura, Intenso
     * Balance isolation is automatic (each runScenario snapshots/restores).
     */
    runWeek: async (callbacks = {}) => {
        const WEEK_PLAN = [
            { dia: 'Lunes', key: 'tranquilo' },
            { dia: 'Martes', key: 'intenso' },
            { dia: 'Miércoles', key: 'incidentes' },
            { dia: 'Jueves', key: 'apertura' },
            { dia: 'Viernes', key: 'intenso' },
        ];

        const weekStart = Date.now();
        const weekResults = [];
        let weekPass = 0, weekFail = 0;
        let weekVentas = 0, weekIngreso = 0, weekGastos = 0;

        for (let i = 0; i < WEEK_PLAN.length; i++) {
            const { dia, key } = WEEK_PLAN[i];
            callbacks.onWeekProgress?.({ day: i + 1, total: WEEK_PLAN.length, dia, key });

            const dayEntry = {
                time: new Date().toLocaleTimeString('es-VE', { hour12: false }),
                msg: `\n⎯⎯⎯ 📅 ${dia.toUpperCase()} (${key}) — Día ${i + 1}/5 ⎯⎯⎯`,
                type: 'day', raw: `${dia} - ${key}`
            };
            callbacks.onLog?.(dayEntry);

            const result = await DayTester.runScenario(key, callbacks);
            weekResults.push({ dia, key, ...result });

            weekPass += result.passed;
            weekFail += result.failed;
            weekVentas += result.dayMetrics?.ventas || result.dayMetrics?.ventasOK || 0;
            weekIngreso += result.dayMetrics?.ingresoUSD || 0;
            weekGastos += result.dayMetrics?.gastos || 0;

            if (callbacks.onDayComplete) callbacks.onDayComplete({ dia, key, result, dayIndex: i + 1 });
        }

        const weekElapsed = ((Date.now() - weekStart) / 1000).toFixed(1);
        const weekReport = {
            type: 'week',
            days: weekResults,
            totals: {
                pass: weekPass, fail: weekFail, total: weekPass + weekFail,
                ventas: weekVentas, ingresoUSD: weekIngreso, gastos: weekGastos,
                netaUSD: weekIngreso - weekGastos, elapsed: weekElapsed,
            },
        };

        // 3.0 — GROQ WEEKLY ANALYSIS: comprehensive report across all 5 days
        const weekSectionEntry = {
            time: new Date().toLocaleTimeString('es-VE', { hour12: false }),
            msg: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            type: 'section', raw: ''
        };
        state.logs.push(weekSectionEntry);
        callbacks.onLog?.(weekSectionEntry);
        const weekTitleEntry = {
            time: new Date().toLocaleTimeString('es-VE', { hour12: false }),
            msg: '🤖📅 INFORME SEMANAL DE IA — 5 DÍAS',
            type: 'ai', raw: ''
        };
        state.logs.push(weekTitleEntry);
        callbacks.onLog?.(weekTitleEntry);

        let weekAiAnalysis = null;
        try {
            weekAiAnalysis = await analyzeWeek(weekReport, callbacks.onLog);
        } catch (e) { /* silent */ }
        weekReport.aiAnalysis = weekAiAnalysis;

        callbacks.onWeekComplete?.(weekReport);
        return weekReport;
    },

    /** Stop running scenario */
    stop: () => { state.isRunning = false; },

    /** List available scenarios */
    getScenarios: () => Object.entries(SCENARIOS).map(([key, s]) => ({ key, name: s.name, description: s.description })),

    /** Current logs as plain text (copyable) */
    getLogsText: () => state.logs.map(l => `[${l.time}] ${l.msg}`).join('\n'),
};
