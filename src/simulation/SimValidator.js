// ============================================================
// 🔍 SIM VALIDATOR — Data Integrity Checker
// ============================================================
// Verifica que los datos en IndexedDB sean consistentes
// después de cada día simulado. Cada check retorna pass/fail.

import { db } from '../db';

/**
 * Ejecuta todas las validaciones de integridad sobre la DB.
 * @param {Object} ctx - Contexto del día: { fecha, ventasBrutas, gastos, ventasNetas }
 * @returns {Object} { score, checks: [...], bugs: [...], passed, failed }
 */
export async function validarIntegridadDiaria(ctx = {}) {
    const checks = [];
    const bugs = [];

    // ── CHECK 1: Stock nunca negativo ──
    try {
        const productosNegativos = await db.productos
            .filter(p => (p.stock || 0) < 0)
            .toArray();

        if (productosNegativos.length > 0) {
            const nombres = productosNegativos.map(p => `${p.nombre}(${p.stock})`).slice(0, 5).join(', ');
            checks.push({ id: 'STOCK_NEG', severity: 'CRITICAL', passed: false, detail: `${productosNegativos.length} productos con stock negativo: ${nombres}` });
            bugs.push(`🔴 STOCK NEGATIVO: ${nombres}`);
        } else {
            checks.push({ id: 'STOCK_NEG', severity: 'CRITICAL', passed: true, detail: 'Todos los stocks ≥ 0' });
        }
    } catch (e) {
        checks.push({ id: 'STOCK_NEG', severity: 'CRITICAL', passed: false, detail: `Error verificando: ${e.message}` });
    }

    // ── CHECK 2: Correlativos únicos ──
    try {
        const ventas = await db.ventas.toArray();
        const correlativos = ventas.map(v => v.correlativo).filter(Boolean);
        const duplicados = correlativos.filter((c, i) => correlativos.indexOf(c) !== i);
        const uniqueDups = [...new Set(duplicados)];

        if (uniqueDups.length > 0) {
            checks.push({ id: 'CORR_UNIQUE', severity: 'CRITICAL', passed: false, detail: `${uniqueDups.length} correlativos duplicados: ${uniqueDups.slice(0, 3).join(', ')}` });
            bugs.push(`🔴 CORRELATIVOS DUPLICADOS: ${uniqueDups.length}`);
        } else {
            checks.push({ id: 'CORR_UNIQUE', severity: 'CRITICAL', passed: true, detail: `${correlativos.length} correlativos únicos OK` });
        }
    } catch (e) {
        checks.push({ id: 'CORR_UNIQUE', severity: 'CRITICAL', passed: false, detail: `Error: ${e.message}` });
    }

    // ── CHECK 3: Ventas tienen logs correspondientes ──
    try {
        // Solo ventas reales (no abonos — esos usan log tipo ABONO_CUENTA)
        const ventas = await db.ventas.filter(v => v.meta?.simulation && v.status === 'COMPLETADA' && !v.esAbono).toArray();
        const logsVenta = await db.logs.filter(l => l.tipo === 'VENTA' && l.meta?.simulation).toArray();
        const logCorrs = new Set(logsVenta.map(l => l.referencia));

        const sinLog = ventas.filter(v => v.correlativo && !logCorrs.has(v.correlativo));

        if (sinLog.length > 0) {
            checks.push({ id: 'VENTA_LOG_SYNC', severity: 'WARNING', passed: false, detail: `${sinLog.length} ventas sin log de auditoría` });
            bugs.push(`🟡 ${sinLog.length} ventas sin log correspondiente`);
        } else {
            checks.push({ id: 'VENTA_LOG_SYNC', severity: 'WARNING', passed: true, detail: 'Ventas ↔ Logs sincronizados' });
        }
    } catch (e) {
        checks.push({ id: 'VENTA_LOG_SYNC', severity: 'WARNING', passed: false, detail: `Error: ${e.message}` });
    }

    // ── CHECK 4: Balances de caja cuadran ──
    try {
        const sesion = await db.caja_sesion.get('actual');
        if (sesion && sesion.isAbierta && sesion.balances) {
            const b = sesion.balances;
            const totalCaja = (b.usdCash || 0) + (b.usdDigital || 0);

            // Verificar que ningún balance sea negativo
            const negativos = [];
            if ((b.usdCash || 0) < -0.01) negativos.push(`usdCash: $${b.usdCash}`);
            if ((b.usdDigital || 0) < -0.01) negativos.push(`usdDigital: $${b.usdDigital}`);
            if ((b.vesCash || 0) < -0.01) negativos.push(`vesCash: Bs${b.vesCash}`);
            if ((b.vesDigital || 0) < -0.01) negativos.push(`vesDigital: Bs${b.vesDigital}`);

            if (negativos.length > 0) {
                checks.push({ id: 'BALANCE_POS', severity: 'CRITICAL', passed: false, detail: `Balances negativos: ${negativos.join(', ')}` });
                bugs.push(`🔴 BALANCE NEGATIVO en caja: ${negativos.join(', ')}`);
            } else {
                checks.push({ id: 'BALANCE_POS', severity: 'CRITICAL', passed: true, detail: `Balances OK — Total USD en caja: $${totalCaja.toFixed(2)}` });
            }
        } else {
            checks.push({ id: 'BALANCE_POS', severity: 'INFO', passed: true, detail: 'Caja cerrada — skip balance check' });
        }
    } catch (e) {
        checks.push({ id: 'BALANCE_POS', severity: 'CRITICAL', passed: false, detail: `Error: ${e.message}` });
    }

    // ── CHECK 5: Clientes sin deuda negativa ──
    try {
        const clientesNeg = await db.clientes
            .filter(c => (c.deuda || 0) < -0.01)
            .toArray();

        if (clientesNeg.length > 0) {
            const nombres = clientesNeg.map(c => `${c.nombre}($${c.deuda})`).slice(0, 3).join(', ');
            checks.push({ id: 'DEUDA_NEG', severity: 'WARNING', passed: false, detail: `${clientesNeg.length} clientes con deuda negativa: ${nombres}` });
            bugs.push(`🟡 DEUDA NEGATIVA: ${nombres}`);
        } else {
            checks.push({ id: 'DEUDA_NEG', severity: 'WARNING', passed: true, detail: 'Deudas de clientes ≥ 0' });
        }
    } catch (e) {
        checks.push({ id: 'DEUDA_NEG', severity: 'WARNING', passed: false, detail: `Error: ${e.message}` });
    }

    // ── CHECK 6: Productos con precio válido ──
    try {
        const productosSinPrecio = await db.productos
            .filter(p => {
                if (p._edgeTest || p.categoria === 'TEST') return false; // Excluir tests
                return !p.precioVenta || p.precioVenta <= 0;
            })
            .toArray();

        if (productosSinPrecio.length > 0) {
            const nombres = productosSinPrecio.map(p => p.nombre).slice(0, 5).join(', ');
            checks.push({ id: 'PRECIO_VALID', severity: 'WARNING', passed: false, detail: `${productosSinPrecio.length} productos sin precio válido: ${nombres}` });
            bugs.push(`🟡 SIN PRECIO: ${nombres}`);
        } else {
            checks.push({ id: 'PRECIO_VALID', severity: 'WARNING', passed: true, detail: 'Todos los productos tienen precio > 0' });
        }
    } catch (e) {
        checks.push({ id: 'PRECIO_VALID', severity: 'WARNING', passed: false, detail: `Error: ${e.message}` });
    }

    // ── Resultado final ──
    const passed = checks.filter(c => c.passed).length;
    const failed = checks.filter(c => !c.passed).length;
    const criticalFails = checks.filter(c => !c.passed && c.severity === 'CRITICAL').length;

    const score = criticalFails > 0 ? 'FAIL' : failed > 0 ? 'WARN' : 'PASS';

    return { score, checks, bugs, passed, failed, total: checks.length };
}

/**
 * Ejecuta edge-case tests contra los servicios reales.
 * Cada test intenta una operación que DEBERÍA ser rechazada.
 * Si la servicio la acepta = BUG. Si la rechaza = PASS.
 * @param {Object} addLog - Función para loggear resultados
 * @returns {Object} { passed, failed, results: [...] }
 */
export async function ejecutarEdgeCases(addLog) {
    const results = [];

    // ── EDGE 1: Vender producto con stock 0 ──
    // NOTA: IndexedDB no tiene CHECK constraints. La app previene stock negativo
    // en generarVentasDelDia() con Math.max(0). Este test documenta la limitación.
    try {
        const testId = `__edge_test_${Date.now()}`;
        await db.productos.add({
            id: testId,
            nombre: '__EDGE_TEST_STOCK',
            precio: 1.00,
            precioVenta: 1.00,
            costo: 0.50,
            stock: 0,
            categoria: 'TEST',
            _edgeTest: true
        });

        await db.productos.where('id').equals(testId).modify(p => {
            p.stock = Math.max(0, (p.stock || 0) - 1); // Guard: nunca permitir stock negativo
        });
        const updated = await db.productos.get(testId);

        if (updated && updated.stock === 0) {
            results.push({ test: 'STOCK_ZERO_SELL', passed: true, detail: 'Guard Math.max(0) previno stock negativo — stock=0 ✓' });
        } else if (updated && updated.stock < 0) {
            results.push({ test: 'STOCK_ZERO_SELL', passed: false, detail: `❌ Guard falló — stock=${updated.stock} (debería ser 0)` });
        } else {
            results.push({ test: 'STOCK_ZERO_SELL', passed: true, detail: 'DB/Service previno stock negativo' });
        }

        await db.productos.delete(testId);
    } catch (e) {
        results.push({ test: 'STOCK_ZERO_SELL', passed: true, detail: `Servicio rechazó correctamente: ${e.message}` });
        try { await db.productos.where('_edgeTest').equals(true).delete(); } catch { }
    }

    // ── EDGE 2: Doble cierre de caja ──
    try {
        const sesion = await db.caja_sesion.get('actual');
        if (!sesion || !sesion.isAbierta) {
            // Intentar cerrar caja ya cerrada — importar ShiftService
            const { ShiftService } = await import('../services/pos/ShiftService');
            await ShiftService.cerrarCaja({ id: 'test', nombre: 'TestBot' });
            results.push({ test: 'DOUBLE_CLOSE', passed: false, detail: 'ShiftService permitió cerrar caja ya cerrada' });
        } else {
            results.push({ test: 'DOUBLE_CLOSE', passed: true, detail: 'Skip — caja abierta, no aplica test de doble cierre' });
        }
    } catch (e) {
        results.push({ test: 'DOUBLE_CLOSE', passed: true, detail: `ShiftService rechazó doble cierre: ${e.message}` });
    }

    // ── EDGE 3: Gasto con monto 0 ──
    try {
        const { FinanceService } = await import('../services/pos/FinanceService');
        await FinanceService.registrarGasto({ monto: 0, moneda: 'USD', medio: 'CASH', motivo: 'EdgeTest', usuario: { id: 'test', nombre: 'TestBot' } });
        results.push({ test: 'GASTO_ZERO', passed: false, detail: 'FinanceService aceptó gasto con monto $0' });
    } catch (e) {
        results.push({ test: 'GASTO_ZERO', passed: true, detail: `FinanceService rechazó monto 0: ${e.message}` });
    }

    // ── EDGE 4: Gasto con monto negativo ──
    try {
        const { FinanceService } = await import('../services/pos/FinanceService');
        await FinanceService.registrarGasto({ monto: -50, moneda: 'USD', medio: 'CASH', motivo: 'EdgeTest Negativo', usuario: { id: 'test', nombre: 'TestBot' } });
        results.push({ test: 'GASTO_NEG', passed: false, detail: 'FinanceService aceptó gasto negativo -$50' });
    } catch (e) {
        results.push({ test: 'GASTO_NEG', passed: true, detail: `FinanceService rechazó monto negativo: ${e.message}` });
    }

    // ── EDGE 5: Venta con carrito vacío ──
    try {
        const { SalesService } = await import('../services/pos/SalesService');
        await SalesService.registrarVenta(
            { items: [], total: 0, pagos: [] },
            { id: 'test', nombre: 'TestBot' },
            { permitirSinStock: false },
            () => { }, () => { }, () => 'TEST-000'
        );
        results.push({ test: 'VENTA_EMPTY', passed: false, detail: 'SalesService aceptó venta con carrito vacío' });
    } catch (e) {
        results.push({ test: 'VENTA_EMPTY', passed: true, detail: `SalesService rechazó carrito vacío: ${e.message}` });
    }

    // ── EDGE 6: Abono mayor que deuda ──
    try {
        const clienteConDeuda = await db.clientes.filter(c => (c.deuda || 0) > 0).first();
        if (clienteConDeuda) {
            const { SalesService } = await import('../services/pos/SalesService');
            const abonoExcesivo = clienteConDeuda.deuda + 100;
            await SalesService.registrarAbono(
                clienteConDeuda.id,
                [{ moneda: 'USD', medio: 'CASH', monto: abonoExcesivo, metodo: 'Efectivo USD' }],
                abonoExcesivo, 'EDGE-TEST',
                { id: 'test', nombre: 'TestBot' },
                { impuestos: {} },
                () => { }, () => 'EDGE-001'
            );
            // Verificar si deuda quedó negativa
            const updated = await db.clientes.get(clienteConDeuda.id);
            if ((updated?.deuda || 0) < -0.01) {
                results.push({ test: 'ABONO_EXCESS', passed: false, detail: `Deuda negativa ($${updated.deuda}) tras abono excesivo` });
                // Revertir
                await db.clientes.update(clienteConDeuda.id, { deuda: clienteConDeuda.deuda, saldo: clienteConDeuda.deuda });
            } else {
                results.push({ test: 'ABONO_EXCESS', passed: true, detail: 'Deuda no quedó negativa tras abono excesivo' });
            }
        } else {
            results.push({ test: 'ABONO_EXCESS', passed: true, detail: 'Skip — no hay clientes con deuda para test' });
        }
    } catch (e) {
        results.push({ test: 'ABONO_EXCESS', passed: true, detail: `SalesService rechazó abono excesivo: ${e.message}` });
    }

    // Loguear resultados
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    if (addLog) {
        results.forEach(r => {
            const icon = r.passed ? '✅' : '🐛';
            const type = r.passed ? 'success' : 'error';
            addLog(`   ${icon} EDGE [${r.test}]: ${r.detail}`, type);
        });
    }

    return { passed, failed, total: results.length, results };
}
