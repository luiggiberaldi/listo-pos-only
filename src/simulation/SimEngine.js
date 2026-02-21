// ============================================================
// 🏭 SIM ENGINE — Motor Local de Transacciones
// ============================================================
// Genera todas las transacciones de un día SIN usar API.
// Escribe directamente a IndexedDB usando la misma estructura
// que los servicios reales (SalesService, FinanceService).

import { db } from '../db';
import { FinanceService } from '../services/pos/FinanceService';
import { ShiftService } from '../services/pos/ShiftService';
import { timeProvider } from '../utils/TimeProvider';
import { simTimekeeper } from './SimTimekeeper';
import { generarPerfilDia, generarAprendizajeSemanal, generarAuditoriaDiaria } from './SimDirector';
import { validarIntegridadDiaria, ejecutarEdgeCases } from './SimValidator';
import {
    CATALOGO_BASE,
    EMPLEADOS_SIM,
    CLIENTES_CREDITO,
    CONSUMOS_FRECUENTES,
    MOTIVOS_CONSUMO,
    MOTIVOS_ANULACION,
    ERRORES_COMUNES,
    NUEVOS_PRODUCTOS,
    randomInt,
    randomFloat,
    pickRandom,
    seleccionarProductoPareto,
    seleccionarMetodoPago,
    seleccionarHora,
    seleccionarGastosDelDia,
    generarTasaCambio
} from './SimCatalog';

// ── Estado de la simulación ──
const simState = {
    isRunning: false,
    diasMeta: 0,
    metricas: { ventasSemana: 0, transaccionesSemana: 0, gastosSemana: 0 },
    historialSemanal: [],
    logs: [],
    onLog: null,       // callback para UI
    onDayComplete: null, // callback para UI
    onProgress: null,   // callback para UI
    perfilActual: null,
    aprendizaje: null,
    ventasDelDia: 0,
    gastosDelDia: 0,
    transaccionesDelDia: 0,
    correlativoGlobal: 100000,
    _logHora: 6,       // Hora dinámica para logs (avanza con cada acción)
    _logMinuto: 0,
    // Tier 1: Credit sales tracking
    creditosDelDia: 0,
    abonosDelDia: 0,
    ventasPorProducto: {},  // Tier 1: Trending tracking
    tasaCambioHoy: 90,      // Tier 1: Dynamic exchange rate
    // Tier 2: Full coverage tracking
    anulacionesDelDia: 0,
    totalCostoDelDia: 0,    // Mejora #1: Costo real acumulado
    nominaPagada: 0,
    erroresDelDia: 0,
    productosAgregados: 0,
    productosModificados: 0,
    _nuevoProductoIndex: 0, // Track which new product to add next
    // QA tracking
    stressMode: false,
    qaReport: {
        totalDias: 0,
        integrityPassed: 0,
        integrityFailed: 0,
        edgePassed: 0,
        edgeFailed: 0,
        bugsDetectados: [],
        alertasAcumuladas: 0,
        anomaliasAcumuladas: 0,
        serviceBugs: [],
        slowOps: 0,
        peorDia: null,
        peorDiaScore: 0
    }
};

// ── Time sync helper: align timeProvider with simTimekeeper ──
function syncTimeProvider() {
    const simDate = simTimekeeper.getState().fechaActual;
    const realNow = Date.now();
    timeProvider.offset = simDate.getTime() - realNow;
}
function restoreTimeProvider() {
    timeProvider.offset = 0;
    timeProvider.saveOffset();
}

// ── Log helper (usa hora dinámica que avanza con la simulación) ──
function addLog(msg, type = 'info') {
    const h = String(simState._logHora).padStart(2, '0');
    const m = String(simState._logMinuto).padStart(2, '0');
    const entry = {
        time: `${h}:${m}`,
        fecha: simTimekeeper.getState().fechaFormateada,
        msg,
        type,
        ts: Date.now()
    };
    simState.logs.push(entry);
    if (simState.logs.length > 500) simState.logs.shift();
    if (simState.onLog) simState.onLog(entry);
}

// Avanza la hora del log para simular progresión temporal
function avanzarLogHora(hora) {
    if (hora > simState._logHora) {
        simState._logHora = hora;
        simState._logMinuto = randomInt(0, 59);
    } else {
        simState._logMinuto = Math.min(59, simState._logMinuto + randomInt(1, 10));
    }
}

// ── Generar correlativo único ──
function generarCorrelativo() {
    simState.correlativoGlobal++;
    return `SIM-${simState.correlativoGlobal}`;
}

/**
 * FASE 0: Cargar inventario inicial del catálogo.
 * Crea los productos en la BD si no existen.
 */
async function cargarInventarioInicial() {
    const existentes = await db.productos.count();
    if (existentes > 20) {
        addLog(`📦 Inventario existente: ${existentes} productos`, 'info');

        // 🛡️ Auto-fix: Ensure all products have precioVenta
        const sinPrecio = await db.productos.filter(p => !p.precioVenta || p.precioVenta <= 0).toArray();
        if (sinPrecio.length > 0) {
            for (const p of sinPrecio) {
                const precioFix = p.precio || p.costo * 1.4 || 1.00;
                await db.productos.update(p.id, {
                    precioVenta: +precioFix.toFixed(2),
                    precio: p.precio || +precioFix.toFixed(2)
                });
            }
            addLog(`🔧 ${sinPrecio.length} productos sin precio corregidos automáticamente`, 'warn');
        }

        return;
    }


    addLog('📦 Cargando catálogo de minimarket (150 productos)...', 'info');

    const productosDB = CATALOGO_BASE.map((p, i) => ({
        nombre: p.nombre,
        codigo: `SIM-${String(i + 1).padStart(4, '0')}`,
        categoria: p.categoria,
        precio: p.precio,
        precioVenta: p.precio, // FIX: Campo requerido por validador QA
        costo: p.costo,
        stock: randomInt(30, 120), // Stock inicial realista para minimarket
        unidadVenta: p.unidadVenta || 'unidad',
        imagen: null,
        alertaStock: 5,
        _simPopularidad: p.popularidad // Metadata interna para selección
    }));

    await db.productos.bulkPut(productosDB);
    addLog(`✅ ${productosDB.length} productos cargados`, 'success');
}

/**
 * FASE 1: Abrir caja del día.
 */
async function abrirCaja(perfil) {
    const fondoInicial = +randomFloat(50, 150).toFixed(2);
    const ts = simTimekeeper.generarTimestamp(6, 0);
    const empleado = pickRandom(EMPLEADOS_SIM);
    const tasaCambio = perfil.tasaCambio || simState.tasaCambioHoy || 90;

    // ✅ Use correct balance structure expected by FinanceService/ShiftService
    const balancesApertura = {
        usdCash: fondoInicial,
        usdDigital: 0,
        vesCash: +(fondoInicial * tasaCambio * 0.1).toFixed(2), // ~10% of fund in VES
        vesDigital: 0
    };

    const idApertura = `AP-SIM-${Date.now()}`;
    await db.caja_sesion.put({
        key: 'caja-1',
        isAbierta: true,
        fondoInicial,
        fechaApertura: ts,
        idApertura,
        balances: { ...balancesApertura },
        balancesApertura: { ...balancesApertura },
        operador: empleado.nombre,
        operadorId: empleado.id,
        usuarioApertura: empleado.nombre
    });

    await db.logs.add({
        tipo: 'APERTURA_CAJA',
        fecha: ts,
        producto: 'CAJA',
        cantidad: fondoInicial,
        stockFinal: 0,
        referencia: 'USD',
        detalle: `Apertura simulada — Fondo: $${fondoInicial.toFixed(2)}`,
        usuarioId: empleado.id,
        usuarioNombre: empleado.nombre,
        meta: { fondoInicial, moneda: 'USD', simulation: true }
    });

    addLog(`🔓 Caja abierta — Fondo: $${fondoInicial.toFixed(2)} (${empleado.nombre})`, 'info');
    return { fondoInicial, empleado };
}

/**
 * FASE 2: Generar ventas del día.
 * Distribuye ventas según curva horaria.
 */
async function generarVentasDelDia(perfil) {
    let totalVentas = perfil.totalVentas || randomInt(50, 90);

    // Stress mode: 3x ventas para probar límites de IndexedDB
    if (simState.stressMode) {
        totalVentas = Math.ceil(totalVentas * 3);
        if (totalVentas < 200) totalVentas = randomInt(200, 300);
    }

    const ticketBase = perfil.ticketPromedio || 5.0;
    const tasaCambio = simState.tasaCambioHoy;
    const probabilidadCredito = 0.15 + Math.random() * 0.05; // 15-20%

    // Obtener productos disponibles
    let productos = await db.productos.where('stock').above(0).toArray();
    if (productos.length === 0) {
        addLog('⚠️ Sin productos con stock — abortando ventas', 'warn');
        return;
    }

    let ventasGeneradas = 0;
    let montoTotal = 0;
    const ticketMax = ticketBase * 3.5; // Mejora #4: Cap más alto para tickets realistas

    for (let i = 0; i < totalVentas; i++) {
        if (!simState.isRunning) break;
        await simTimekeeper.esperarSiPausado();

        // Mejora #2: Re-fetch productos cada 20 ventas para stock actualizado
        if (i > 0 && i % 20 === 0) {
            productos = await db.productos.where('stock').above(0).toArray();
            if (productos.length === 0) break;

            // Mid-day restock: si a mitad de ventas hay pocos productos con stock, reabastecer
            if (i === Math.floor(totalVentas / 2) && productos.length < 30) {
                await verificarReabastecimiento(3); // umbral reducido para mid-day
                productos = await db.productos.where('stock').above(0).toArray();
            }
        }

        // Seleccionar hora realista
        const hora = seleccionarHora();
        const minuto = randomInt(0, 59);

        // Seleccionar 1-5 productos para esta venta
        const numItems = randomInt(1, Math.min(5, productos.length));
        const items = [];
        let totalVenta = 0;
        let totalCosto = 0;

        for (let j = 0; j < numItems; j++) {
            const prod = seleccionarProductoPareto(productos);

            // ✅ C1: Weight-based sales — fractional qty for kg products
            let qty;
            if (prod.unidadVenta === 'kg') {
                // Realistic weight: 0.250 to 3.000 kg
                qty = +(randomFloat(0.25, 3.0)).toFixed(3);
            } else {
                qty = randomInt(1, 3);
            }

            // Mejora #2: Validar stock antes de agregar al carrito
            if ((prod.stock || 0) < qty) continue; // Skip si stock insuficiente

            const precioUnitario = prod.precioVenta || prod.precio;
            const costoUnitario = prod.costo || precioUnitario * 0.6;
            const subtotal = +(precioUnitario * qty).toFixed(2);

            items.push({
                id: prod.id,
                nombre: prod.nombre,
                precio: precioUnitario,
                costo: costoUnitario,
                cantidad: qty,
                subtotal,
                unidad: prod.unidadVenta || 'unidad'
            });

            totalVenta += subtotal;
            totalCosto += +(costoUnitario * qty).toFixed(2);

            // Decrementar stock (local + DB)
            prod.stock = Math.max(0, (prod.stock || 0) - qty);
            try {
                await db.productos.where('id').equals(prod.id).modify(p => {
                    p.stock = Math.max(0, (p.stock || 0) - qty);
                });
            } catch { /* producto ya eliminado */ }
        }

        if (items.length === 0) continue; // Skip si no se pudieron agregar items

        totalVenta = +totalVenta.toFixed(2);
        totalCosto = +totalCosto.toFixed(2);

        // ✅ C2: Random discounts on ~5% of sales (10-20% off)
        let descuento = 0;
        if (Math.random() < 0.05) {
            const porcentajeDesc = randomFloat(0.10, 0.20);
            descuento = +(totalVenta * porcentajeDesc).toFixed(2);
            totalVenta = +(totalVenta - descuento).toFixed(2);
        }

        // Mejora #4: Sin variación artificial — precios reales del catálogo
        if (totalVenta < 0.50) totalVenta = 0.50;


        // Seleccionar método de pago
        const metodo = seleccionarMetodoPago();
        const ts = simTimekeeper.generarTimestamp(hora, minuto);
        const empleado = pickRandom(EMPLEADOS_SIM);
        const correlativo = generarCorrelativo();

        // Tier 1: Determinar si es venta a crédito (fiado)
        const esCredito = Math.random() < probabilidadCredito;
        let clienteCredito = null;
        if (esCredito) {
            clienteCredito = pickRandom(CLIENTES_CREDITO);
            // Verificar que no exceda límite
            if (clienteCredito.saldoPendiente + totalVenta > clienteCredito.limiteCredito) {
                clienteCredito = null; // Rechazar crédito si excede límite
            }
        }

        // ✅ C3/C4: Build payment methods array with VES-only and mixed support
        let metodosPago;
        if (clienteCredito) {
            metodosPago = [{
                moneda: 'USD', medio: 'CREDIT',
                monto: totalVenta, referencia: `FIADO-${clienteCredito.nombre}`
            }];
        } else {
            const r = Math.random();
            if (r < 0.15) {
                // C3: 15% — VES-only payment (cash or digital)
                const medioVES = Math.random() < 0.5 ? 'CASH' : 'DIGITAL';
                metodosPago = [{
                    moneda: 'VES', medio: medioVES,
                    monto: +(totalVenta * tasaCambio).toFixed(2),
                    referencia: correlativo
                }];
            } else if (r < 0.25) {
                // C4: 10% — Mixed payment (part USD + part VES)
                const splitRatio = randomFloat(0.3, 0.7);
                const montoUSD = +(totalVenta * splitRatio).toFixed(2);
                const montoVES = +((totalVenta - montoUSD) * tasaCambio).toFixed(2);
                metodosPago = [
                    { moneda: 'USD', medio: 'CASH', monto: montoUSD, referencia: correlativo },
                    { moneda: 'VES', medio: Math.random() < 0.5 ? 'CASH' : 'DIGITAL', monto: montoVES, referencia: correlativo }
                ];
            } else {
                // Regular USD payment
                metodosPago = [{
                    moneda: metodo.moneda, medio: metodo.medio,
                    monto: metodo.moneda === 'VES' ? +(totalVenta * tasaCambio).toFixed(2) : totalVenta,
                    referencia: correlativo
                }];
            }
        }

        // Crear registro de venta (con timing para stress test)
        const _t0 = simState.stressMode ? performance.now() : 0;
        await db.ventas.add({
            fecha: ts,
            items,
            total: totalVenta,
            totalCosto,
            descuento, // ✅ C2: Track discounts
            metodosPago,
            status: 'COMPLETADA',
            correlativo,
            clienteId: clienteCredito?.id || null,
            clienteNombre: clienteCredito?.nombre || null,
            esCredito: !!clienteCredito,
            usuarioId: empleado.id,
            usuarioNombre: empleado.nombre,
            tasaDelMomento: tasaCambio,
            meta: { simulation: true }
        });


        // Performance check (stress mode)
        if (simState.stressMode && _t0) {
            const elapsed = performance.now() - _t0;
            if (elapsed > 500) {
                simState.qaReport.slowOps++;
                addLog(`⏱️ SLOW: db.ventas.add tomó ${elapsed.toFixed(0)}ms`, 'warn');
            }
        }

        // Actualizar saldo del cliente si es crédito
        if (clienteCredito) {
            clienteCredito.saldoPendiente = +(clienteCredito.saldoPendiente + totalVenta).toFixed(2);
            simState.creditosDelDia += totalVenta;

            // 🔧 FIX: Persistir deuda en db.clientes para que cobrarDeudas() funcione
            try {
                const dbCliente = await db.clientes.where('nombre').equals(clienteCredito.nombre).first();
                if (dbCliente) {
                    await db.clientes.update(dbCliente.id, {
                        deuda: +(dbCliente.deuda + totalVenta).toFixed(2),
                        saldo: +(dbCliente.deuda + totalVenta).toFixed(2)
                    });
                }
            } catch { /* cliente no encontrado */ }
        }

        // Log de venta
        await db.logs.add({
            tipo: 'VENTA',
            fecha: ts,
            producto: items.map(i => i.nombre).join(', '),
            cantidad: totalVenta,
            stockFinal: 0,
            referencia: correlativo,
            detalle: `Venta ${correlativo} — ${items.length} items — ${metodo.id}`,
            usuarioId: empleado.id,
            usuarioNombre: empleado.nombre,
            meta: {
                items: items.length,
                metodo: metodo.id,
                moneda: metodo.moneda,
                totalUSD: totalVenta,
                simulation: true
            }
        });

        ventasGeneradas++;
        montoTotal += totalVenta;
        simState.totalCostoDelDia += totalCosto; // Mejora #1: Acumular costo real

        // Tier 1: Track product sales for trending
        for (const item of items) {
            simState.ventasPorProducto[item.nombre] = (simState.ventasPorProducto[item.nombre] || 0) + item.cantidad;
        }

        // Mejora #3: Sincronizar hora del log con hora real de venta
        simState._logHora = hora;
        simState._logMinuto = minuto;

        // Log cada 20 ventas para no saturar
        if (ventasGeneradas % 20 === 0) {
            addLog(`🛒 ${ventasGeneradas}/${totalVentas} ventas — $${montoTotal.toFixed(2)} acumulado`, 'info');
        }
    }

    simState.ventasDelDia = montoTotal;
    simState.transaccionesDelDia = ventasGeneradas;
    simState.metricas.ventasSemana += montoTotal;
    simState.metricas.transaccionesSemana += ventasGeneradas;

    addLog(`✅ ${ventasGeneradas} ventas completadas — Total: $${montoTotal.toFixed(2)}`, 'success');
    if (simState.creditosDelDia > 0) {
        addLog(`💳 Ventas a crédito: $${simState.creditosDelDia.toFixed(2)} (fiado)`, 'info');
    }
}

/**
 * FASE 3: Generar gastos del día.
 * ✅ A3: Now uses FinanceService.registrarGasto() real service.
 */
async function generarGastosDelDia(perfil) {
    const gastosDelPerfil = perfil.gastos || [];
    const gastosFallback = seleccionarGastosDelDia(
        simTimekeeper.getState().diaDelMes,
        simTimekeeper.getState().diaSemana
    );

    const gastosFinales = gastosDelPerfil.length > 0 ? gastosDelPerfil : gastosFallback;
    let totalGastos = 0;
    let gastosRegistrados = 0;

    for (const gasto of gastosFinales) {
        if (!simState.isRunning) break;

        const hora = randomInt(9, 17);
        avanzarLogHora(hora);
        // Sync timeProvider so FinanceService writes correct timestamp
        const simDate = new Date(simTimekeeper.getState().fechaActual);
        simDate.setHours(hora, randomInt(0, 59), randomInt(0, 59));
        timeProvider.offset = simDate.getTime() - Date.now();

        const empleado = pickRandom(EMPLEADOS_SIM);
        const monto = +(gasto.monto || randomFloat(5, 30)).toFixed(2);

        try {
            // ✅ Use REAL FinanceService — exercises validation, balance update, and logging
            await FinanceService.registrarGasto({
                monto,
                moneda: 'USD',
                medio: 'CASH',
                motivo: gasto.motivo || 'Gasto operativo',
                usuario: { id: empleado.id, nombre: empleado.nombre }
            });
            totalGastos += monto;
            gastosRegistrados++;
        } catch (e) {
            // Service might reject (e.g. caja cerrada) — log as bug
            addLog(`🐛 FinanceService rechazó gasto: ${e.message}`, 'error');
            simState.qaReport.serviceBugs.push({
                service: 'FinanceService.registrarGasto',
                error: e.message,
                context: { monto, motivo: gasto.motivo }
            });
        }
    }

    simState.gastosDelDia = totalGastos;
    simState.metricas.gastosSemana += totalGastos;

    if (gastosRegistrados > 0) {
        addLog(`💸 ${gastosRegistrados} gastos registrados — Total: $${totalGastos.toFixed(2)}`, 'info');
    }
}

/**
 * FASE 4: Generar consumo interno.
 */
async function generarConsumosDelDia(perfil) {
    const consumosDelPerfil = perfil.consumos || [];

    // Si Groq no generó consumos, generar localmente
    const consumos = consumosDelPerfil.length > 0 ? consumosDelPerfil : (
        Math.random() < 0.4 ? [{
            producto: pickRandom(CONSUMOS_FRECUENTES),
            qty: 1,
            motivo: pickRandom(MOTIVOS_CONSUMO)
        }] : []
    );

    for (const consumo of consumos) {
        if (!simState.isRunning) break;

        // Buscar producto en inventario
        const prod = await db.productos
            .where('nombre')
            .equals(consumo.producto)
            .first();

        if (!prod || prod.stock <= 0) continue;

        const qty = consumo.qty || 1;
        const hora = randomInt(8, 18);
        const ts = simTimekeeper.generarTimestamp(hora, randomInt(0, 59));
        const empleado = pickRandom(EMPLEADOS_SIM);

        // Decrementar stock
        await db.productos.where('id').equals(prod.id).modify(p => {
            p.stock = Math.max(0, (p.stock || 0) - qty);
        });

        // Registrar en logs
        await db.logs.add({
            tipo: 'CONSUMO_INTERNO',
            fecha: ts,
            producto: prod.nombre,
            productId: prod.id,
            cantidad: qty,
            stockFinal: Math.max(0, (prod.stock || 0) - qty),
            referencia: `CI-${Date.now()}`,
            detalle: consumo.motivo || 'Consumo interno',
            usuarioId: empleado.id,
            usuarioNombre: empleado.nombre,
            meta: {
                tipo: 'CONSUMO_MODAL',
                motivoExplicito: consumo.motivo || 'Consumo interno',
                costoSnapshot: prod.costo || 0,
                precioSnapshot: prod.precio || 0,
                simulation: true
            }
        });

        addLog(`☕ Consumo: ${qty}x ${prod.nombre} (${consumo.motivo || 'uso interno'})`, 'info');
    }
}

/**
 * FASE 5: Cerrar caja del día.
 */
async function cerrarCaja(perfil) {
    const ts = simTimekeeper.generarTimestamp(21, 30);
    const empleado = pickRandom(EMPLEADOS_SIM);

    // Leer sesión actual para calcular cierre
    const sesion = await db.caja_sesion.get('caja-1');
    const fondoInicial = sesion?.fondoInicial || 100;

    const ventasNetas = simState.ventasDelDia;
    const gastosNetos = simState.gastosDelDia;
    const efectivoFinal = +(fondoInicial + ventasNetas - gastosNetos).toFixed(2);

    await db.caja_sesion.put({
        key: 'caja-1',
        isAbierta: false,
        fondoInicial,
        fechaApertura: sesion?.fechaApertura,
        fechaCierre: ts,
        balances: { USD: efectivoFinal, VES: efectivoFinal * (perfil.tasaCambio || 90) },
        operador: empleado.nombre,
        operadorId: empleado.id
    });

    await db.logs.add({
        tipo: 'CIERRE_CAJA',
        fecha: ts,
        producto: 'CAJA',
        cantidad: efectivoFinal,
        stockFinal: 0,
        referencia: 'USD',
        detalle: `Cierre simulado — Efectivo: $${efectivoFinal.toFixed(2)}`,
        usuarioId: empleado.id,
        usuarioNombre: empleado.nombre,
        meta: {
            fondoInicial,
            ventasNetas,
            gastosNetos,
            efectivoFinal,
            simulation: true
        }
    });

    addLog(`🔒 Caja cerrada — Efectivo final: $${efectivoFinal.toFixed(2)}`, 'success');
}

/**
 * Reabastecer productos con stock bajo.
 * Simula llegada de proveedor cada ciertos días.
 */
async function verificarReabastecimiento(minProductos = 5) {
    const productosAgotados = await db.productos
        .where('stock')
        .below(5)
        .toArray();

    if (productosAgotados.length < minProductos) return;

    addLog(`📦 Reabasteciendo ${productosAgotados.length} productos con stock bajo...`, 'info');

    for (const prod of productosAgotados) {
        const nuevoStock = randomInt(20, 60);
        await db.productos.where('id').equals(prod.id).modify(p => {
            p.stock = (p.stock || 0) + nuevoStock;
        });
    }

    addLog(`✅ Reabastecimiento completado (${productosAgotados.length} productos)`, 'success');
}
// ========================================================
// 🎯 TIER 2: FULL SYSTEM COVERAGE — 8 nuevas funciones
// ========================================================

/**
 * FASE 0B: Crear clientes iniciales en db.clientes (Quadrants).
 * Se ejecuta una sola vez al inicio de la simulación.
 */
async function crearClientesIniciales() {
    const existentes = await db.clientes.count();
    if (existentes >= 5) {
        addLog(`👥 ${existentes} clientes existentes en DB`, 'info');
        return;
    }

    const clientesDB = CLIENTES_CREDITO.slice(0, 8).map((c, i) => ({
        nombre: c.nombre,
        documento: `V-${randomInt(10000000, 30000000)}`,
        telefono: `04${randomInt(12, 26)}-${randomInt(1000000, 9999999)}`,
        deuda: 0,
        favor: 0,
        saldo: 0,
        limiteCredito: c.limiteCredito,
        meta: { simulation: true, frecuencia: c.frecuencia }
    }));

    await db.clientes.bulkAdd(clientesDB);
    addLog(`👥 ${clientesDB.length} clientes creados en DB (Quadrants)`, 'success');
}

/**
 * FASE 3B: Cobrar deudas de clientes fiados.
 * 30-50% de clientes con deuda hacen un abono parcial o total.
 */
async function cobrarDeudas() {
    const clientesConDeuda = await db.clientes.where('deuda').above(0.01).toArray();
    if (clientesConDeuda.length === 0) return;

    const tasaCobro = 0.30 + Math.random() * 0.20; // 30-50%
    const clientesQuePagan = clientesConDeuda
        .filter(() => Math.random() < tasaCobro)
        .slice(0, 5); // Max 5 por día

    let totalAbonos = 0;

    for (const cliente of clientesQuePagan) {
        // Pago parcial (40-100% de la deuda)
        const porcentaje = 0.40 + Math.random() * 0.60;
        const montoAbono = +(cliente.deuda * porcentaje).toFixed(2);
        if (montoAbono < 0.50) continue;

        const nuevaDeuda = +(cliente.deuda - montoAbono).toFixed(2);
        await db.clientes.where('id').equals(cliente.id).modify({
            deuda: Math.max(0, nuevaDeuda),
            saldo: Math.max(0, nuevaDeuda)
        });

        const correlativo = generarCorrelativo();
        const ts = simTimekeeper.generarTimestamp(randomInt(9, 17), randomInt(0, 59));
        const empleado = pickRandom(EMPLEADOS_SIM);

        await db.ventas.add({
            fecha: ts,
            items: [],
            total: montoAbono,
            totalCosto: 0,
            metodosPago: [{
                moneda: 'USD',
                medio: Math.random() < 0.5 ? 'CASH' : 'DIGITAL',
                monto: montoAbono,
                referencia: `ABONO-${correlativo}`
            }],
            status: 'COMPLETADA',
            correlativo,
            clienteId: cliente.id,
            clienteNombre: cliente.nombre,
            esAbono: true,
            usuarioId: empleado.id,
            usuarioNombre: empleado.nombre,
            tasaDelMomento: simState.tasaCambioHoy,
            meta: { simulation: true, tipo: 'ABONO' }
        });

        await db.logs.add({
            tipo: 'ABONO_CUENTA',
            fecha: ts,
            producto: 'COBRANZA',
            cantidad: montoAbono,
            stockFinal: nuevaDeuda,
            referencia: correlativo,
            detalle: `Abono de ${cliente.nombre}: $${montoAbono} (deuda restante: $${nuevaDeuda.toFixed(2)})`,
            usuarioId: empleado.id,
            usuarioNombre: empleado.nombre,
            meta: { clienteId: cliente.id, simulation: true }
        });

        totalAbonos += montoAbono;
        avanzarLogHora(randomInt(10, 16));
    }

    if (totalAbonos > 0) {
        simState.abonosDelDia = totalAbonos;
        addLog(`💵 Cobros: ${clientesQuePagan.length} abonos por $${totalAbonos.toFixed(2)}`, 'success');
    }
}

/**
 * FASE 6B: Anular ventas aleatorias (2-5% del día).
 * Simula errores de cajero, cancelaciones y devoluciones.
 */
async function anularVentasAleatorias() {
    const state = simTimekeeper.getState();
    const hoyStr = state.fechaActual.toISOString().split('T')[0]; // "2026-02-13"

    // Solo ventas de HOY (filtro por fecha ISO del timestamp)
    const ventasHoy = await db.ventas
        .where('status').equals('COMPLETADA')
        .filter(v => {
            if (!v.meta?.simulation || v.esAbono) return false;
            const fechaVenta = typeof v.fecha === 'string' ? v.fecha.split('T')[0] : '';
            return fechaVenta === hoyStr;
        })
        .toArray();

    if (ventasHoy.length < 5) return; // No anular si hay muy pocas ventas

    // 2-5% de las ventas del día, máximo 3
    const porcentaje = 0.02 + Math.random() * 0.03;
    const cantidadAnular = Math.min(3, Math.max(1, Math.ceil(ventasHoy.length * porcentaje)));

    const ventasAAnular = ventasHoy
        .sort(() => Math.random() - 0.5)
        .slice(0, cantidadAnular);

    let totalAnulado = 0;

    for (const venta of ventasAAnular) {
        const motivo = pickRandom(MOTIVOS_ANULACION);
        const empleado = pickRandom(EMPLEADOS_SIM);
        const ts = simTimekeeper.generarTimestamp(randomInt(18, 20), randomInt(0, 59));

        // Marcar venta como anulada
        await db.ventas.where('id').equals(venta.id).modify({
            status: 'ANULADA',
            motivoAnulacion: motivo,
            anuladoPor: empleado.nombre,
            fechaAnulacion: ts
        });

        // Restaurar stock de productos anulados
        if (venta.items && venta.items.length > 0) {
            for (const item of venta.items) {
                try {
                    await db.productos.where('nombre').equals(item.nombre).modify(p => {
                        p.stock = (p.stock || 0) + (item.cantidad || 1);
                    });
                } catch { /* skip */ }
            }
        }

        // Log de auditoría
        await db.logs.add({
            tipo: 'ANULACION_VENTA',
            fecha: ts,
            producto: 'ANULACION',
            cantidad: venta.total,
            referencia: venta.correlativo,
            detalle: `Venta ${venta.correlativo} anulada: ${motivo}`,
            usuarioId: empleado.id,
            usuarioNombre: empleado.nombre,
            meta: { ventaId: venta.id, motivo, simulation: true }
        });

        totalAnulado += venta.total;
    }

    if (totalAnulado > 0) {
        simState.anulacionesDelDia = totalAnulado;
        addLog(`🚫 ${ventasAAnular.length} ventas anuladas — $${totalAnulado.toFixed(2)} devuelto`, 'warn');
    }
}

/**
 * FASE 5B: Cerrar caja con Corte Z formal.
 * ✅ A2: Now uses ShiftService.cerrarCaja() real service.
 * Falls back to manual close if service fails (e.g., different balance structure).
 */
async function cerrarCajaConCorteZ(perfil) {
    const empleado = pickRandom(EMPLEADOS_SIM);
    const sesion = await db.caja_sesion.get('caja-1');
    if (!sesion || !sesion.isAbierta) return;

    // Sync timeProvider to closing hour (9:30 PM)
    const simDate = new Date(simTimekeeper.getState().fechaActual);
    simDate.setHours(21, 30, 0);
    timeProvider.offset = simDate.getTime() - Date.now();

    const ventasNetas = +(simState.ventasDelDia - simState.anulacionesDelDia).toFixed(2);

    try {
        // ✅ Use REAL ShiftService — exercises generarReporteZ, balance validation, corte persistence
        const reporte = await ShiftService.cerrarCaja(
            { id: empleado.id, nombre: empleado.nombre },
            { meta: { simulation: true } },
            null // no playSound during simulation
        );

        addLog(`🔒 Corte Z (Service): $${ventasNetas.toFixed(2)} neto | Gastos: $${simState.gastosDelDia.toFixed(2)} | Abonos: $${simState.abonosDelDia.toFixed(2)}`, 'success');

        // Check for descuadre in the real report
        if (reporte?.descuadreTotal && Math.abs(reporte.descuadreTotal) > 0.01) {
            addLog(`⚠️ Descuadre detectado: $${reporte.descuadreTotal.toFixed(2)}`, 'warn');
        }
    } catch (e) {
        // Fallback: close manually if service fails
        addLog(`⚠️ ShiftService.cerrarCaja falló: ${e.message} — cierre manual`, 'warn');
        simState.qaReport.serviceBugs.push({
            service: 'ShiftService.cerrarCaja',
            error: e.message,
            context: { ventasNetas, gastos: simState.gastosDelDia }
        });

        // Manual close fallback to not break simulation flow
        const ts = simTimekeeper.generarTimestamp(21, 30);
        await db.caja_sesion.put({
            key: 'caja-1',
            isAbierta: false,
            fondoInicial: sesion?.fondoInicial || 100,
            fechaApertura: sesion?.fechaApertura,
            fechaCierre: ts,
            balances: sesion?.balances || {},
            operador: empleado.nombre,
            operadorId: empleado.id
        });

        await db.logs.add({
            tipo: 'CORTE_Z',
            fecha: ts,
            producto: 'CAJA',
            cantidad: ventasNetas,
            stockFinal: 0,
            referencia: `Z-SIM-${Date.now()}`,
            detalle: `Corte Z (manual fallback): $${ventasNetas.toFixed(2)} neto`,
            usuarioId: empleado.id,
            usuarioNombre: empleado.nombre,
            meta: { simulation: true, fallback: true }
        });

        addLog(`🔒 Corte Z (fallback): $${ventasNetas.toFixed(2)} neto | Gastos: $${simState.gastosDelDia.toFixed(2)}`, 'success');
    }
}

/**
 * FASE 9: Procesar nómina quincenal.
 * Paga salarios a empleados cada 15 días.
 */
async function procesarNomina(diaSimulado) {
    if (diaSimulado % 15 !== 0 || diaSimulado === 0) return;

    addLog('💼 Procesando nómina quincenal...', 'info');

    let totalNomina = 0;
    const ts = simTimekeeper.generarTimestamp(10, 0);

    for (const emp of EMPLEADOS_SIM) {
        const sueldoQuincenal = +(emp.sueldo / 2).toFixed(2);

        // Registrar en empleados_finanzas
        try {
            const existe = await db.empleados_finanzas.get(emp.id);
            if (!existe) {
                await db.empleados_finanzas.put({
                    userId: emp.id,
                    sueldoBase: emp.sueldo,
                    frecuenciaPago: 'quincenal',
                    deudaAcumulada: 0,
                    favor: 0,
                    ultimoPago: ts
                });
            } else {
                await db.empleados_finanzas.update(emp.id, { ultimoPago: ts });
            }
        } catch { /* table may not exist */ }

        // Registrar en nomina_ledger
        try {
            await db.nomina_ledger.add({
                empleadoId: emp.id,
                tipo: 'SALARIO',
                monto: sueldoQuincenal,
                fecha: ts,
                periodoId: `Q${Math.ceil(diaSimulado / 15)}`,
                status: 'PAGADO',
                meta: { nombre: emp.nombre, rol: emp.rol, simulation: true }
            });
        } catch { /* table may not exist */ }

        // Registrar como gasto operativo
        await db.logs.add({
            tipo: 'GASTO_CAJA',
            fecha: ts,
            producto: 'NOMINA',
            cantidad: sueldoQuincenal,
            referencia: 'USD',
            detalle: `Pago quincenal a ${emp.nombre} (${emp.rol}): $${sueldoQuincenal}`,
            usuarioId: 'admin',
            usuarioNombre: 'Administrador',
            meta: { moneda: 'USD', medio: 'CASH', tipo: 'NOMINA', simulation: true }
        });

        totalNomina += sueldoQuincenal;
    }

    simState.nominaPagada = totalNomina;
    simState.gastosDelDia += totalNomina;
    addLog(`💰 Nómina: $${totalNomina.toFixed(2)} pagado a ${EMPLEADOS_SIM.length} empleados`, 'success');
}

/**
 * FASE 10: Modificar precios de productos (inflación semanal).
 * Ajusta 5-10 productos al azar, ±3-8% en precio.
 */
async function modificarProductosAleatorios(diaSimulado) {
    if (diaSimulado % 7 !== 0 || diaSimulado === 0) return;

    const productos = await db.productos.toArray();
    const cantidad = randomInt(5, 10);
    const productosAModificar = productos.sort(() => Math.random() - 0.5).slice(0, cantidad);

    let modificados = 0;
    for (const prod of productosAModificar) {
        const factorInflacion = 1 + randomFloat(0.03, 0.08); // +3-8%
        const precioViejo = prod.precio;
        const precioNuevo = +(precioViejo * factorInflacion).toFixed(2);
        const costoNuevo = +(prod.costo * (1 + randomFloat(0.02, 0.05))).toFixed(2);

        await db.productos.where('id').equals(prod.id).modify({
            precio: precioNuevo,
            costo: costoNuevo
        });

        await db.logs.add({
            tipo: 'AJUSTE_PRECIO',
            fecha: simTimekeeper.generarTimestamp(8, 0),
            producto: prod.nombre,
            productId: prod.id,
            cantidad: precioNuevo,
            stockFinal: prod.stock,
            referencia: `$${precioViejo} → $${precioNuevo}`,
            detalle: `Ajuste inflacionario: ${prod.nombre}`,
            usuarioId: 'admin',
            usuarioNombre: 'Administrador',
            meta: { precioViejo, precioNuevo, costoNuevo, simulation: true }
        });
        modificados++;
    }

    simState.productosModificados = modificados;
    addLog(`📝 ${modificados} precios ajustados (inflación semanal)`, 'info');
}

/**
 * FASE 11: Agregar producto nuevo al catálogo.
 * Cada ~10 días se "descubre" un producto nuevo.
 */
async function agregarProductoNuevo(diaSimulado) {
    if (diaSimulado % 10 !== 0 || diaSimulado === 0) return;
    if (simState._nuevoProductoIndex >= NUEVOS_PRODUCTOS.length) return;

    const nuevo = NUEVOS_PRODUCTOS[simState._nuevoProductoIndex];
    simState._nuevoProductoIndex++;

    const id = await db.productos.add({
        nombre: nuevo.nombre,
        codigo: `NEW-${String(simState._nuevoProductoIndex).padStart(3, '0')}`,
        categoria: nuevo.categoria,
        precio: nuevo.precio,
        costo: nuevo.costo,
        stock: randomInt(20, 50),
        popularidad: nuevo.popularidad,
        unidad: 'und',
        meta: { simulation: true, fechaAlta: simTimekeeper.getState().fechaFormateada }
    });

    await db.logs.add({
        tipo: 'ALTA_PRODUCTO',
        fecha: simTimekeeper.generarTimestamp(9, 0),
        producto: nuevo.nombre,
        productId: id,
        cantidad: 1,
        stockFinal: randomInt(20, 50),
        detalle: `Nuevo producto agregado: ${nuevo.nombre} ($${nuevo.precio})`,
        usuarioId: 'admin',
        usuarioNombre: 'Administrador',
        meta: { simulation: true }
    });

    simState.productosAgregados++;
    addLog(`🆕 Producto nuevo: ${nuevo.nombre} ($${nuevo.precio})`, 'success');
}

/**
 * FASE 12: Simular errores comunes del día a día.
 * 10-15% de los días tienen algún incidente.
 */
async function simularErroresComunes() {
    const hayErrores = Math.random() < 0.15;
    if (!hayErrores) return;

    const productos = await db.productos.limit(20).toArray();
    const erroresHoy = ERRORES_COMUNES.filter(e => Math.random() < e.prob);
    if (erroresHoy.length === 0) return;

    const error = pickRandom(erroresHoy);
    const prod = pickRandom(productos);
    const empleado = pickRandom(EMPLEADOS_SIM);
    const ts = simTimekeeper.generarTimestamp(randomInt(8, 19), randomInt(0, 59));

    // Resolver template variables
    let mensaje = error.msg
        .replace('${monto}', `$${randomFloat(0.5, 5).toFixed(2)}`)
        .replace('${producto}', prod?.nombre || 'Producto')
        .replace('${cantidad}', String(randomInt(1, 5)))
        .replace('${viejo}', String(prod?.precio || 0))
        .replace('${nuevo}', String(+(prod?.precio * 1.05).toFixed(2) || 0));

    await db.logs.add({
        tipo: `ERROR_${error.tipo}`,
        fecha: ts,
        producto: prod?.nombre || 'SISTEMA',
        cantidad: 0,
        detalle: mensaje,
        usuarioId: empleado.id,
        usuarioNombre: empleado.nombre,
        meta: { errorTipo: error.tipo, simulation: true }
    });

    // Si es merma, descontar stock
    if (error.tipo === 'MERMA' && prod) {
        const merma = randomInt(1, 3);
        await db.productos.where('id').equals(prod.id).modify(p => {
            p.stock = Math.max(0, (p.stock || 0) - merma);
        });
    }

    simState.erroresDelDia++;
    addLog(mensaje, 'warn');
}

// ========================================================
// 📈 TIER 1: TRENDING PRODUCTS — Ajuste de popularidad
// ========================================================

/**
 * Ajusta popularidad de productos en DB según ventas reales de la semana.
 * Top 10% → +1 popularidad (max 10)
 * Bottom 10% sin ventas → -1 popularidad (min 1)
 */
async function ajustarPopularidadProductos() {
    const ventas = simState.ventasPorProducto;
    const entries = Object.entries(ventas).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return;

    const topCount = Math.max(3, Math.ceil(entries.length * 0.1));
    const topNames = entries.slice(0, topCount).map(([name]) => name);
    const bottomNames = entries.slice(-topCount).map(([name]) => name);

    // Boost top sellers
    let boosted = 0;
    for (const name of topNames) {
        try {
            await db.productos.where('nombre').equals(name).modify(p => {
                const current = p._simPopularidad || p.popularidad || 5;
                if (current < 10) {
                    p._simPopularidad = current + 1;
                    boosted++;
                }
            });
        } catch { /* skip */ }
    }

    // Penalize underperformers
    let penalized = 0;
    const allProductos = await db.productos.toArray();
    const productosConVentas = new Set(entries.map(([name]) => name));
    for (const prod of allProductos) {
        if (!productosConVentas.has(prod.nombre)) {
            const current = prod._simPopularidad || prod.popularidad || 5;
            if (current > 1) {
                await db.productos.where('id').equals(prod.id).modify(p => {
                    p._simPopularidad = current - 1;
                });
                penalized++;
            }
        }
    }

    if (boosted > 0 || penalized > 0) {
        addLog(`📊 Trending: ${boosted} productos ↑ | ${penalized} productos ↓`, 'info');
    }
}

// ========================================================
// 🚀 ORQUESTADOR PRINCIPAL
// ========================================================

/**
 * Simula un día completo del minimarket.
 */
async function simularDia() {
    const state = simTimekeeper.getState();
    const tipoDia = simTimekeeper.getTipoDia();
    const diaNum = state.diasSimulados + 1;

    // ✅ Phase A: Align timeProvider with simulated date
    syncTimeProvider();

    addLog(`━━━━━━━━━━━━━━━━━━━━━━━━`, 'separator');
    addLog(`📅 DÍA ${diaNum}: ${state.fechaFormateada} (${tipoDia})`, 'header');

    // Reset contadores del día
    simState.ventasDelDia = 0;
    simState.gastosDelDia = 0;
    simState.transaccionesDelDia = 0;
    simState.creditosDelDia = 0;
    simState.abonosDelDia = 0;
    simState.anulacionesDelDia = 0;
    simState.totalCostoDelDia = 0;  // Mejora #1: Reset costo diario
    simState.nominaPagada = 0;
    simState.erroresDelDia = 0;
    simState.productosAgregados = 0;
    simState.productosModificados = 0;
    simState._logHora = 6;
    simState._logMinuto = 0;

    // Dynamic exchange rate
    simState.tasaCambioHoy = generarTasaCambio(state.diasSimulados);

    // ── FASE 1: Perfil del día ──
    const perfil = await generarPerfilDia({
        fecha: state.fechaActual.toISOString().split('T')[0],
        diaSemana: state.fechaActual.toLocaleDateString('es-VE', { weekday: 'long' }),
        tipoDia,
        ventasSemana: simState.metricas.ventasSemana,
        tasaActual: simState.tasaCambioHoy
    });

    simState.perfilActual = perfil;
    addLog(`🎬 Perfil: ${perfil.tipo} — ${perfil.totalVentas} ventas estimadas (${perfil.source})`, 'info');
    addLog(`💱 Tasa: Bs ${simState.tasaCambioHoy}/$`, 'info');
    if (perfil.humor) addLog(`💬 "${perfil.humor}"`, 'info');

    // ── FASE 2: Abrir caja ──
    await abrirCaja(perfil);

    // ── FASE 3: Generar ventas ──
    await generarVentasDelDia(perfil);

    // ── FASE 4: Cobrar deudas de clientes fiados ──
    await cobrarDeudas();

    // ── FASE 5: Gastos operativos ──
    await generarGastosDelDia(perfil);

    // ── FASE 6: Consumo interno ──
    await generarConsumosDelDia(perfil);

    // ── FASE 7: Anulaciones (2-5% ventas) ──
    await anularVentasAleatorias();

    // ── FASE 8: Errores comunes ──
    await simularErroresComunes();

    // ── FASE 9: Cerrar caja con Corte Z formal ──
    await cerrarCajaConCorteZ(perfil);

    // ── FASE 10: Nómina quincenal ──
    await procesarNomina(diaNum);

    // ── FASE 11: Reabastecimiento cada 3 días ──
    if (diaNum % 3 === 0) {
        await verificarReabastecimiento();
    }

    // ── FASE 12: CRUD productos (semanal) ──
    await modificarProductosAleatorios(diaNum);
    await agregarProductoNuevo(diaNum);

    // ── FASE 13: Aprendizaje semanal ──
    if (diaNum % 7 === 0) {
        addLog('🧠 Ejecutando aprendizaje semanal...', 'info');
        const aprendizaje = await generarAprendizajeSemanal({
            fechaInicio: 'semana anterior',
            fechaFin: state.fechaFormateada,
            ventasTotales: simState.metricas.ventasSemana,
            totalTransacciones: simState.metricas.transaccionesSemana,
            ticketPromedio: simState.metricas.transaccionesSemana > 0
                ? simState.metricas.ventasSemana / simState.metricas.transaccionesSemana
                : 0,
            gastosTotales: simState.metricas.gastosSemana,
            utilidadBruta: simState.metricas.ventasSemana - simState.metricas.gastosSemana,
            categoriasTop: ['Bebidas', 'Abarrotes', 'Panadería'],
            productosAgotados: (await db.productos.where('stock').below(1).count())
        });

        simState.aprendizaje = aprendizaje;
        addLog(`📈 Aprendizaje: ${aprendizaje.recomendacion || 'Sin recomendación'}`, 'success');

        // Trending products
        await ajustarPopularidadProductos();

        // Reset métricas semanales
        simState.metricas = { ventasSemana: 0, transaccionesSemana: 0, gastosSemana: 0 };
        simState.ventasPorProducto = {};
    }

    const ventasNetas = +(simState.ventasDelDia - simState.anulacionesDelDia).toFixed(2);
    const utilidad = +(ventasNetas - simState.gastosDelDia).toFixed(2);
    // Mejora #1: Margen real basado en costo
    const margenReal = ventasNetas > 0 ? +((ventasNetas - simState.totalCostoDelDia) / ventasNetas * 100).toFixed(1) : 0;
    addLog(`📊 Resumen: $${ventasNetas.toFixed(2)} ventas netas | $${simState.gastosDelDia.toFixed(2)} gastos | Margen: ${margenReal}%`, 'success');

    // ── FASE 14: Auditoría AI del día ──
    const auditoria = await generarAuditoriaDiaria({
        fecha: state.fechaFormateada,
        tipoDia,
        ventasBrutas: simState.ventasDelDia,
        ventasNetas,
        gastos: simState.gastosDelDia,
        utilidad,
        margenReal,              // Mejora #1: Pasar margen real a auditoría
        totalCosto: simState.totalCostoDelDia,
        transacciones: simState.transaccionesDelDia,
        anulaciones: simState.anulacionesDelDia,
        creditos: simState.creditosDelDia,
        abonos: simState.abonosDelDia,
        errores: simState.erroresDelDia,
        nominaPagada: simState.nominaPagada,
        tasaCambio: simState.tasaCambioHoy,
        fondoCaja: 100
    });

    // Loguear resultado de auditoría
    const auditIcon = auditoria.veredicto === 'OK' ? '✅' : auditoria.veredicto === 'ALERTA' ? '⚠️' : '🚨';
    const auditType = auditoria.veredicto === 'OK' ? 'success' : auditoria.veredicto === 'ALERTA' ? 'warn' : 'error';
    addLog(`${auditIcon} AUDITORÍA AI: ${auditoria.veredicto} — Margen: ${auditoria.margenReal}% — Riesgo: ${auditoria.riesgoOperativo} (${auditoria.source})`, auditType);

    if (auditoria.alertas && auditoria.alertas.length > 0) {
        auditoria.alertas.forEach(a => addLog(`   ⚡ ${a}`, 'warn'));
    }
    if (auditoria.anomalias && auditoria.anomalias.length > 0) {
        auditoria.anomalias.forEach(a => addLog(`   🔍 ${a}`, 'error'));
    }
    if (auditoria.sugerencia) {
        addLog(`   💡 ${auditoria.sugerencia}`, 'info');
    }

    // Track audit alerts
    simState.qaReport.alertasAcumuladas += (auditoria.alertas?.length || 0);
    simState.qaReport.anomaliasAcumuladas += (auditoria.anomalias?.length || 0);

    // ── FASE 15: Validación de integridad de datos ──
    try {
        const integrity = await validarIntegridadDiaria({ fecha: state.fechaFormateada });
        const intIcon = integrity.score === 'PASS' ? '✅' : integrity.score === 'WARN' ? '⚠️' : '🔴';
        const intType = integrity.score === 'PASS' ? 'success' : integrity.score === 'WARN' ? 'warn' : 'error';
        addLog(`${intIcon} INTEGRIDAD: ${integrity.passed}/${integrity.total} checks OK (${integrity.score})`, intType);

        simState.qaReport.integrityPassed += integrity.passed;
        simState.qaReport.integrityFailed += integrity.failed;

        if (integrity.bugs.length > 0) {
            integrity.bugs.forEach(b => addLog(`   ${b}`, 'error'));
            simState.qaReport.bugsDetectados.push(...integrity.bugs.map(b => ({ dia: diaNum, bug: b })));
        }

        // Track peor día
        const dayScore = integrity.failed + (auditoria.anomalias?.length || 0) + simState.erroresDelDia;
        if (dayScore > simState.qaReport.peorDiaScore) {
            simState.qaReport.peorDiaScore = dayScore;
            simState.qaReport.peorDia = { dia: diaNum, fecha: state.fechaFormateada, score: dayScore };
        }
    } catch (e) {
        addLog(`⚠️ Error en validación de integridad: ${e.message}`, 'error');
    }

    // ── FASE 16: Edge Cases (20% probabilidad por día) ──
    if (Math.random() < 0.20) {
        addLog(`🧪 Ejecutando edge cases...`, 'info');
        try {
            const edgeResults = await ejecutarEdgeCases(addLog);
            simState.qaReport.edgePassed += edgeResults.passed;
            simState.qaReport.edgeFailed += edgeResults.failed;

            if (edgeResults.failed > 0) {
                simState.qaReport.bugsDetectados.push(
                    ...edgeResults.results.filter(r => !r.passed).map(r => ({ dia: diaNum, bug: `EDGE ${r.test}: ${r.detail}` }))
                );
            }
            addLog(`🧪 Edge cases: ${edgeResults.passed}/${edgeResults.total} passed`, edgeResults.failed > 0 ? 'error' : 'success');
        } catch (e) {
            addLog(`⚠️ Error en edge cases: ${e.message}`, 'error');
        }
    }

    // ── FASE 17: 👻 Ghost Auditor Report (Real Pipeline → Firebase → Listo Master) ──
    try {
        addLog(`👻 Generando reporte Ghost Auditor...`, 'info');
        const ghostEventBus = (await import('../services/ghost/ghostEventBus')).default;
        const { GHOST_CATEGORIES } = await import('../services/ghost/ghostEventBus');

        const dateKey = state.fechaActual.toISOString().slice(0, 10);

        // Emit simulated events through the REAL event bus
        // Sales
        for (let i = 0; i < simState.transaccionesDelDia; i++) {
            const ticketAmount = simState.ventasDelDia / Math.max(simState.transaccionesDelDia, 1);
            ghostEventBus.emit(GHOST_CATEGORIES.SALE, 'sale_completed', {
                total: +(ticketAmount * (0.5 + Math.random())).toFixed(2),
                items: randomInt(1, 8),
                paymentMethods: [pickRandom(['Efectivo USD', 'Pago Móvil', 'Efectivo Bs', 'Zelle', 'Punto de Venta'])],
                hasDebt: Math.random() < 0.1,
                tasa: simState.tasaCambioHoy
            }, i < 2 ? 'WARN' : 'INFO');
        }

        // Inventory adjustments
        const invAdjustments = randomInt(0, 5);
        for (let i = 0; i < invAdjustments; i++) {
            ghostEventBus.emit(GHOST_CATEGORIES.INVENTORY, 'stock_adjusted', {
                product: pickRandom(['Harina PAN', 'Aceite Diana', 'Arroz Mary', 'Azúcar', 'Leche']),
                oldStock: randomInt(0, 50),
                newStock: randomInt(5, 100),
                reason: 'manual'
            }, 'INFO');
        }

        // Errors (from sim)
        for (let i = 0; i < simState.erroresDelDia; i++) {
            ghostEventBus.emit(GHOST_CATEGORIES.ERROR, 'runtime_error', {
                message: 'Error simulado durante prueba de estrés',
                source: 'SimEngine'
            }, 'CRITICAL');
        }

        // Anulaciones
        if (simState.anulacionesDelDia > 0) {
            ghostEventBus.emit(GHOST_CATEGORIES.SALE, 'sale_voided', {
                count: simState.anulacionesDelDia,
                totalAnulado: simState.anulacionesDelDia * (simState.ventasDelDia / Math.max(simState.transaccionesDelDia, 1))
            }, 'WARN');
        }

        // Corte Z
        ghostEventBus.emit(GHOST_CATEGORIES.SALE, 'corte_z', {
            totalVentas: simState.transaccionesDelDia,
            totalIngresos: ventasNetas,
            cajaId: `SIM-Z-${diaNum}`
        }, 'INFO');

        // Session
        ghostEventBus.emit(GHOST_CATEGORIES.SESSION, 'session_end', {
            duration: randomInt(8, 14) * 3600000,
            source: 'SimEngine'
        }, 'INFO');

        // Flush events to Dexie
        await ghostEventBus.flush();

        // Now trigger the REAL digest + Firebase sync pipeline
        const { generateDailyReport } = await import('../services/ghost/ghostDigestService');
        const report = await generateDailyReport(dateKey);

        if (report.status === 'complete') {
            // Push to Firebase via the real scheduler mechanism
            try {
                const { dbMaster, initFirebase, isFirebaseReady } = await import('../services/firebase');
                if (!isFirebaseReady()) await initFirebase();
                const { dbMaster: masterDb } = await import('../services/firebase');
                if (masterDb) {
                    const { doc: fbDoc, setDoc: fbSetDoc } = await import('firebase/firestore');
                    const systemId = report.businessName?.replace(/\s+/g, '_').toLowerCase() || 'sim_pos';
                    const docId = `${systemId}_${dateKey}`;
                    const docRef = fbDoc(masterDb, 'ghost_daily_reports', docId);
                    await fbSetDoc(docRef, { ...report, systemId, syncedAt: Date.now(), _simulated: true });
                    addLog(`👻 ✅ Reporte Ghost enviado a Listo Master — Score: ${report.aiDigest?.healthScore || '?'}`, 'success');
                } else {
                    addLog(`👻 ⚠️ Firebase Master no disponible — reporte guardado localmente`, 'warn');
                }
            } catch (fbErr) {
                addLog(`👻 ⚠️ Firebase sync falló: ${fbErr.message} — reporte guardado localmente`, 'warn');
            }
        } else {
            addLog(`👻 Día sin eventos, reporte vacío`, 'info');
        }
    } catch (ghostErr) {
        addLog(`👻 ⚠️ Ghost Auditor fase omitida: ${ghostErr.message}`, 'warn');
    }

    simState.qaReport.totalDias++;

    if (simState.onDayComplete) {
        simState.onDayComplete({
            dia: diaNum,
            fecha: state.fechaFormateada,
            ventas: simState.ventasDelDia,
            ventasNetas,
            gastos: simState.gastosDelDia,
            utilidad,
            transacciones: simState.transaccionesDelDia,
            creditos: simState.creditosDelDia,
            abonos: simState.abonosDelDia,
            anulaciones: simState.anulacionesDelDia,
            nomina: simState.nominaPagada,
            errores: simState.erroresDelDia,
            tasaCambio: simState.tasaCambioHoy,
            perfil
        });
    }
}

/**
 * Inicia la simulación maestra.
 * @param {Object} config
 * @param {string} config.fechaInicio - Fecha de inicio ISO
 * @param {number} config.dias - Cantidad de días a simular
 * @param {number} config.velocidad - Segundos por día simulado (2-10)
 * @param {Function} config.onLog - Callback para logs
 * @param {Function} config.onDayComplete - Callback al completar un día
 * @param {Function} config.onProgress - Callback de progreso general
 */
export async function iniciarSimulacion(config) {
    if (simState.isRunning) {
        addLog('⚠️ Simulación ya en curso', 'warn');
        return;
    }

    // Configurar
    simState.isRunning = true;
    simState.diasMeta = config.dias || 30;
    simState.stressMode = config.stressMode || false;
    simState.onLog = config.onLog || null;
    simState.onDayComplete = config.onDayComplete || null;
    simState.onProgress = config.onProgress || null;
    simState.logs = [];
    simState.metricas = { ventasSemana: 0, transaccionesSemana: 0, gastosSemana: 0 };
    // Reset QA report
    simState.qaReport = {
        totalDias: 0, integrityPassed: 0, integrityFailed: 0,
        edgePassed: 0, edgeFailed: 0, bugsDetectados: [],
        alertasAcumuladas: 0, anomaliasAcumuladas: 0,
        serviceBugs: [], slowOps: 0, peorDia: null, peorDiaScore: 0
    };

    simTimekeeper.configurar({
        fechaInicio: config.fechaInicio || new Date().toISOString(),
        velocidad: config.velocidad || 3
    });
    simTimekeeper.iniciar();

    addLog('🚀 SIMULACIÓN MAESTRA INICIADA', 'header');
    addLog(`📋 Meta: ${simState.diasMeta} días — Velocidad: ${config.velocidad || 3}s/día${simState.stressMode ? ' — 🔥 STRESS MODE' : ''}`, 'info');

    // Crear clientes Quadrants en DB
    await crearClientesIniciales();

    // ══ LIMPIEZA PRE-SIMULACIÓN: Purgar datos de corridas anteriores ══
    try {
        // 1. Eliminar ventas de simulación anteriores
        const ventasSim = await db.ventas.filter(v => v.meta?.simulation).toArray();
        if (ventasSim.length > 0) {
            await db.ventas.bulkDelete(ventasSim.map(v => v.id));
            addLog(`🧹 ${ventasSim.length} ventas de sim anterior eliminadas`, 'info');
        }

        // 2. Eliminar logs de simulación anteriores
        const logsSim = await db.logs.filter(l => l.meta?.simulation).toArray();
        if (logsSim.length > 0) {
            await db.logs.bulkDelete(logsSim.map(l => l.id));
            addLog(`🧹 ${logsSim.length} logs de sim anterior eliminados`, 'info');
        }

        // 3. Eliminar cortes de simulación
        const cortesSim = await db.cortes?.filter(c => c.meta?.simulation).toArray().catch(() => []);
        if (cortesSim?.length > 0) {
            await db.cortes.bulkDelete(cortesSim.map(c => c.id));
        }

        // 4. Productos de simulación anteriores (limpiar antes de cargar nuevos)
        const prodsSim = await db.productos.filter(p => p._edgeTest || p.categoria === 'TEST' || p.codigo?.startsWith('SIM-')).toArray();
        if (prodsSim.length > 0) {
            await db.productos.bulkDelete(prodsSim.map(p => p.id));
            addLog(`🧹 ${prodsSim.length} productos de sim anterior eliminados`, 'info');
        }

        // 5. Correlativo: fresco desde 100000 (datos viejos ya purgados)
        simState.correlativoGlobal = 100000;
        addLog(`🔢 Correlativo inicia en 100001 (DB limpia)`, 'info');
    } catch (e) {
        addLog(`⚠️ Error en limpieza pre-sim: ${e.message}`, 'error');
        simState.correlativoGlobal = 100000;
    }

    // Cargar inventario fresco (DESPUÉS de purga)
    await cargarInventarioInicial();

    // Loop principal
    for (let dia = 0; dia < simState.diasMeta; dia++) {
        if (!simState.isRunning) break;
        await simTimekeeper.esperarSiPausado();

        await simularDia();

        // Notificar progreso
        if (simState.onProgress) {
            simState.onProgress({
                diaActual: dia + 1,
                diasTotal: simState.diasMeta,
                porcentaje: Math.round(((dia + 1) / simState.diasMeta) * 100)
            });
        }

        // Avanzar al siguiente día
        simTimekeeper.siguienteDia();

        // Pausa ajustable entre días (mínimo para no bloquear UI)
        await new Promise(r => setTimeout(r, Math.max(100, (config.velocidad || 3) * 200)));
    }

    simTimekeeper.detener();
    simState.isRunning = false;

    // ════════════════════════════════════════════
    // 📋 QA REPORT CONSOLIDADO
    // ════════════════════════════════════════════
    const qa = simState.qaReport;
    addLog(`━━━━━━━━━━━━━━━━━━━━━━━━`, 'separator');
    addLog(`📋 QA REPORT — ${qa.totalDias} DÍAS SIMULADOS`, 'header');
    addLog(`━━━━━━━━━━━━━━━━━━━━━━━━`, 'separator');

    // Integridad
    const intTotal = qa.integrityPassed + qa.integrityFailed;
    addLog(`🔍 Integridad: ${qa.integrityPassed}/${intTotal} checks passed`, qa.integrityFailed > 0 ? 'error' : 'success');

    // Edge Cases
    const edgeTotal = qa.edgePassed + qa.edgeFailed;
    if (edgeTotal > 0) {
        addLog(`🧪 Edge Cases: ${qa.edgePassed}/${edgeTotal} passed`, qa.edgeFailed > 0 ? 'error' : 'success');
    }

    // Alertas y Anomalías
    addLog(`⚡ Alertas AI: ${qa.alertasAcumuladas} | Anomalías: ${qa.anomaliasAcumuladas}`, qa.anomaliasAcumuladas > 0 ? 'warn' : 'info');

    // Peor día
    if (qa.peorDia) {
        addLog(`📉 Peor día: Día ${qa.peorDia.dia} (${qa.peorDia.fecha}) — Score: ${qa.peorDia.score}`, 'warn');
    }

    // Bugs detectados
    if (qa.bugsDetectados.length > 0) {
        addLog(`🐛 BUGS DETECTADOS: ${qa.bugsDetectados.length}`, 'error');
        // Mostrar los primeros 10
        qa.bugsDetectados.slice(0, 10).forEach(b => {
            addLog(`   Día ${b.dia}: ${b.bug}`, 'error');
        });
        if (qa.bugsDetectados.length > 10) {
            addLog(`   ... y ${qa.bugsDetectados.length - 10} más`, 'error');
        }
    }

    // Slow operations
    if (qa.slowOps > 0) {
        addLog(`⏱️ Operaciones lentas (>500ms): ${qa.slowOps}`, 'warn');
    }

    // ✅ Phase A: Service bugs detected
    if (qa.serviceBugs.length > 0) {
        addLog(`🔧 Service Bugs: ${qa.serviceBugs.length} servicios rechazaron operaciones`, 'warn');
        const grouped = {};
        qa.serviceBugs.forEach(b => { grouped[b.service] = (grouped[b.service] || 0) + 1; });
        Object.entries(grouped).forEach(([svc, count]) => {
            addLog(`   └ ${svc}: ${count} rechazos`, 'warn');
        });
    }

    // Mejora #6: Score final — solo bugs técnicos afectan el veredicto
    const hasCriticalBugs = qa.bugsDetectados.some(b => b.bug.includes('🔴'));
    const hasEdgeFails = qa.edgeFailed > 0;
    const score = (hasCriticalBugs || hasEdgeFails)
        ? '🔴 NOT READY'
        : (qa.integrityFailed > 0 || qa.bugsDetectados.length > 0)
            ? '🟡 NEEDS REVIEW'
            : '🟢 READY FOR PRODUCTION';

    // Anomalías AI se reportan aparte como Business Insights
    if (qa.anomaliasAcumuladas > 0) {
        addLog(`💼 Business Insights: ${qa.anomaliasAcumuladas} observaciones del auditor AI (no afectan veredicto técnico)`, 'info');
    }

    addLog(`━━━━━━━━━━━━━━━━━━━━━━━━`, 'separator');
    addLog(`🏆 VEREDICTO FINAL: ${score}`, score.includes('🟢') ? 'success' : score.includes('🟡') ? 'warn' : 'error');
    addLog(`━━━━━━━━━━━━━━━━━━━━━━━━`, 'separator');

    // Mejora #5: Guardar QA Report en DB
    try {
        await db.logs.add({
            tipo: 'QA_REPORT',
            fecha: new Date().toISOString(),
            producto: 'SIMULACION',
            cantidad: qa.totalDias,
            referencia: `QA-${Date.now()}`,
            detalle: `QA Report: ${score} — ${qa.integrityPassed}/${intTotal} integrity, ${qa.edgePassed}/${edgeTotal} edge`,
            meta: {
                simulation: true,
                type: 'QA_FINAL_REPORT',
                veredicto: score,
                integridad: { passed: qa.integrityPassed, failed: qa.integrityFailed, total: intTotal },
                edgeCases: { passed: qa.edgePassed, failed: qa.edgeFailed, total: edgeTotal },
                bugs: qa.bugsDetectados,
                alertasAI: qa.alertasAcumuladas,
                anomaliasAI: qa.anomaliasAcumuladas,
                slowOps: qa.slowOps,
                peorDia: qa.peorDia
            }
        });
    } catch { /* non-critical */ }

    addLog('🏁 SIMULACIÓN COMPLETADA', 'header');

    // ✅ Phase A: Restore timeProvider to real time
    restoreTimeProvider();
}

export function detenerSimulacion() {
    simState.isRunning = false;
    simTimekeeper.detener();
    addLog('⛔ Simulación detenida por usuario', 'warn');
}

export function pausarSimulacion() {
    simTimekeeper.pausar();
    addLog('⏸️ Simulación pausada', 'info');
}

export function reanudarSimulacion() {
    simTimekeeper.reanudar();
    addLog('▶️ Simulación reanudada', 'info');
}

export function getSimState() {
    return { ...simState, timeState: simTimekeeper.getState() };
}

export function getLogs() {
    return [...simState.logs];
}
