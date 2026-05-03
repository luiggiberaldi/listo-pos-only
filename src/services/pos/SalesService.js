
import { db } from '../../db';
import { FinancialController } from '../../controllers/FinancialController';
import math from '../../utils/mathCore';
import { timeProvider } from '../../utils/TimeProvider';
import { DEFAULT_CAJA } from '../../config/cajaDefaults';
import { appendAuditEntry } from '../../utils/auditChain';
import { dispatchSaleCompleted, dispatchStockReverted } from '../lanSyncDispatcher';

// Constantes locales
const CURRENCY = { USD: 'USD', VES: 'VES', EUR: 'EUR' };
const MEDIUM = { CASH: 'CASH', CARD: 'CARD', DIGITAL: 'DIGITAL', CREDIT: 'CREDIT' };

/**
 * Servicio de Ventas (Pure JS)
 * Encargado de la lógica transaccional de ventas, anulaciones y abonos.
 */
export const SalesService = {

    /**
     * Registra una nueva venta en la base de datos.
     * @param {Object} ventaFinal - Objeto de venta preparado.
     * @param {Object} usuario - Usuario actual.
     * @param {Object} configuracion - Configuración del sistema.
     * @param {Function} transaccionVenta - Función para actualizar inventario.
     * @param {Function} actualizarBalances - Función para actualizar caja.
     * @param {Function} generarCorrelativo - Función para generar ID.
     */
    registrarVenta: async (ventaFinal, usuario, configuracion, transaccionVenta, actualizarBalances, generarCorrelativo, cajaId = DEFAULT_CAJA) => {
        // Validación de Estado (Lectura directa a DB)
        const sesion = await db.caja_sesion.get(cajaId);
        if (!sesion || !sesion.isAbierta) throw new Error("Caja cerrada. Abra turno.");

        // 🛡️ DEMO SHIELD: QUOTA CHECK
        // (Simplified for Service: Logic should be in Guard, but we keep critical check)
        const { getLifetimeSales } = await import('../../db');
        let license = { isDemo: false, quotaLimit: 9999 };

        try {
            const mod = await import('../../stores/useConfigStore');
            if (mod && mod.useConfigStore && typeof mod.useConfigStore.getState === 'function') {
                const state = mod.useConfigStore.getState();
                if (state && state.license) {
                    license = state.license;
                }
            }
        } catch (error) {
            console.warn("⚠️ SalesService: Could not load ConfigStore. Quota check will use defaults.", error);
            // License defaults to { isDemo: false } which means no quota enforcement
            // This is intentional fail-safe: if store unavailable, allow sales
        }

        if (license && license.isDemo) {
            const currentCount = await getLifetimeSales();
            if (currentCount >= license.quotaLimit) {
                throw new Error("DEMO_LIMIT_REACHED");
            }
        }

        const itemsAProcesar = ventaFinal.items || [];
        if (itemsAProcesar.length === 0) throw new Error("Carrito vacío");

        // 🛡️ CHAOS_GUARD: VALIDACIÓN DE STOCK
        if (configuracion && !configuracion.permitirSinStock) {
            const consumos = {};

            for (const item of itemsAProcesar) {
                const id = item.id;
                if (item.tipoUnidad === 'peso') continue;

                let factor = 1;
                if (item.unidadVenta === 'bulto') {
                    factor = parseFloat(item.jerarquia?.bulto?.contenido || 1);
                    if (item.jerarquia?.paquete?.activo) factor *= parseFloat(item.jerarquia?.paquete?.contenido || 1);
                } else if (item.unidadVenta === 'paquete') {
                    factor = parseFloat(item.jerarquia?.paquete?.contenido || 1);
                }

                if (!consumos[id]) {
                    let stockActual = item.stock;
                    if (stockActual === undefined) {
                        const p = await db.productos.get(id);
                        stockActual = p?.stock || 0;
                    }
                    consumos[id] = { required: 0, available: parseFloat(stockActual || 0), nombre: item.nombre };
                }
                consumos[id].required += (item.cantidad * factor);
            }

            for (const id in consumos) {
                const c = consumos[id];
                if (c.required > c.available + 0.0001) {
                    const diff = c.required - c.available;
                    throw new Error(`STOCK INSUFICIENTE: ${c.nombre} (Falta: ${diff.toFixed(2)} Unds)`);
                }
            }
        }

        // 🔑 IDEMPOTENCY KEY: Prevent duplicate sales from double-clicks or retries
        const idempotencyKey = ventaFinal._idempotencyKey || crypto.randomUUID();
        const existingDuplicate = await db.ventas.where('idempotencyKey').equals(idempotencyKey).first();
        if (existingDuplicate) {
            console.warn(`⚠️ [IDEMPOTENCY] Duplicate sale blocked: ${idempotencyKey}`);
            return existingDuplicate;
        }

        // --- INICIO TRANSACCIÓN ACID ---
        return await db.transaction('rw', db.ventas, db.productos, db.logs, db.clientes, db.caja_sesion, async () => {

            const rawPagos = ventaFinal.pagos || ventaFinal.metodos || [];
            const totalFactura = math.round(ventaFinal.total || 0);
            const tasaVenta = math.round(ventaFinal.tasa || 1, 4);

            // 🔢 CROSS-VALIDATION: Verify subtotal + IGTF = total
            const subtotalExpected = math.round(ventaFinal.subtotal || 0);
            const igtfExpected = math.round(parseFloat(ventaFinal.igtfTotal) || 0);
            const descuentoExpected = math.round(parseFloat(ventaFinal.descuento) || 0);
            if (subtotalExpected > 0) {
                const computedTotal = math.round(math.sub(math.add(subtotalExpected, igtfExpected), descuentoExpected));
                const tolerance = 0.02; // 2 centavos tolerance for rounding
                if (Math.abs(computedTotal - totalFactura) > tolerance) {
                    console.error(`❌ [CROSS-VALIDATION] Total mismatch: computed=${computedTotal}, received=${totalFactura}`);
                    throw new Error(`CHAOS_GUARD: Discrepancia en totales. Esperado: $${computedTotal.toFixed(2)}, Recibido: $${totalFactura.toFixed(2)}`);
                }
            }

            // 1. Prepare Payments for Controller
            const pagosForController = rawPagos.map(p => ({
                amount: math.round(parseFloat(p.amount || p.monto || p.montoBS || p.amountBS || 0)),
                currency: p.currency || (p.tipo === 'BS' ? 'VES' : 'USD'),
                type: p.tipo,
                medium: p.medium,
                aplicaIGTF: p.aplicaIGTF
            }));

            // 🧮 2. FINANCIAL CORE VALIDATION
            const fStatus = FinancialController.calculatePaymentStatus(totalFactura, pagosForController, configuracion, tasaVenta);

            if (Number.isNaN(totalFactura)) throw new Error("CHAOS_GUARD: Detectadas matemáticas corruptas (Total is NaN).");
            if (pagosForController.some(p => p.amount < 0)) throw new Error("CHAOS_GUARD: No se permiten pagos negativos.");

            const totalPagadoUSD = fStatus.totalPagadoGlobalUSD;

            if (ventaFinal.esCredito && !ventaFinal.clienteId) {
                throw new Error("CHAOS_GUARD: Venta a Crédito requiere Cliente.");
            }

            if (ventaFinal.esCredito && (ventaFinal.deudaPendiente <= 0.01)) {
                throw new Error("CHAOS_GUARD: Venta clasificada como Crédito pero sin deuda pendiente (Use Contado).");
            }

            const pagosProcesados = (ventaFinal.pagos || ventaFinal.metodos || []).map(p => {
                const methodStr = (p.metodo || 'Desconocido').toLowerCase();
                const isCash = methodStr.includes('efectivo') || methodStr.includes('cash');

                return {
                    id: crypto.randomUUID(),
                    method: p.metodo || 'Desconocido',
                    amount: math.round(parseFloat(p.amount || p.monto || p.montoBS || p.amountBS || 0)),
                    currency: p.currency || (p.tipo === 'BS' ? CURRENCY.VES : CURRENCY.USD),
                    medium: p.medium || (isCash ? MEDIUM.CASH : MEDIUM.DIGITAL),
                    rate: math.round(parseFloat(ventaFinal.tasa) || 1, 4),
                    originalRef: p
                };
            });

            const vueltosProcesados = [];
            const dist = ventaFinal.distribucionVuelto || {};

            if (math.round(dist.usd || 0) > 0.001) {
                vueltosProcesados.push({
                    amount: math.round(dist.usd),
                    currency: CURRENCY.USD,
                    medium: MEDIUM.CASH,
                    rate: 1
                });
            }
            if (math.round(dist.bs || 0) > 0.001) {
                vueltosProcesados.push({
                    amount: math.round(dist.bs),
                    currency: CURRENCY.VES,
                    medium: MEDIUM.CASH,
                    rate: tasaVenta
                });
            }

            const vueltosUSD = vueltosProcesados.find(v => v.currency === CURRENCY.USD)?.amount || 0;
            const vueltosVES = vueltosProcesados.find(v => v.currency === CURRENCY.VES)?.amount || 0;

            const totalEntregadoFisicoUSD = math.add(
                vueltosUSD,
                (tasaVenta > 0 ? math.div(vueltosVES, tasaVenta) : 0)
            );

            let remanenteVueltoUSD = math.round(math.sub(fStatus.cambioUSD, totalEntregadoFisicoUSD));

            if (remanenteVueltoUSD > 0.01 && !ventaFinal.clienteId) {
                throw new Error(`CHAOS_GUARD: Existe un vuelto de $${remanenteVueltoUSD.toFixed(2)} sin asignar a un cliente.`);
            }

            if (remanenteVueltoUSD < -0.01) {
                throw new Error(`CHAOS_GUARD: El vuelto entregado excede el cambio debido por $${Math.abs(remanenteVueltoUSD).toFixed(2)}.`);
            }

            // 📦 3. IMPACTO INVENTARIO
            await transaccionVenta(itemsAProcesar, usuario);

            // 💰 4. IMPACTO CAJA
            const pagosReales = pagosProcesados.filter(p => p.medium !== 'INTERNAL');
            await actualizarBalances('SALE', pagosReales, vueltosProcesados);

            // 👥 5. IMPACTO CLIENTES
            let appliedToDebt = 0;
            let appliedToWallet = 0;

            if (ventaFinal.clienteId) {
                const targetClienteId = parseInt(ventaFinal.clienteId);

                if (!isNaN(targetClienteId)) {
                    await db.clientes.where('id').equals(targetClienteId).modify(c => {
                        let consumoSaldo = parseFloat(ventaFinal.montoSaldoFavor || 0);
                        if (consumoSaldo === 0 && pagosProcesados.length > 0) {
                            consumoSaldo = pagosProcesados
                                .filter(p => p.medium === 'INTERNAL' || p.method === 'SALDO A FAVOR')
                                .reduce((sum, p) => sum + p.amount, 0);
                        }

                        const oldDebt = c.deuda || 0;

                        const result = FinancialController.simulateCustomerUpdate(
                            c,
                            ventaFinal.esCredito ? (ventaFinal.deudaPendiente || 0) : 0,
                            remanenteVueltoUSD,
                            consumoSaldo
                        );

                        c.deuda = result.deuda;
                        c.favor = result.favor;

                        if (remanenteVueltoUSD > 0 && oldDebt > 0) {
                            appliedToDebt = Math.min(remanenteVueltoUSD, oldDebt);
                        } else {
                            appliedToDebt = 0;
                        }

                        appliedToWallet = remanenteVueltoUSD > 0 ? math.round(remanenteVueltoUSD - appliedToDebt) : 0;
                        c.saldo = math.sub(c.deuda, c.favor);
                    });
                }
            }

            // 💾 6. GUARDAR VENTA
            const idVentaManual = timeProvider.timestamp();
            const ventaToSave = {
                ...ventaFinal,
                id: idVentaManual,
                idVenta: ventaFinal.idVenta || await generarCorrelativo('factura'),
                idempotencyKey,
                items: itemsAProcesar,
                vendedorId: usuario?.id || 'sys',
                vendedor: usuario?.nombre || 'Cajero',
                usuario: { id: usuario?.id, nombre: usuario?.nombre },
                status: 'COMPLETADA',
                corteId: null,
                cajaId,

                payments: pagosProcesados,
                change: vueltosProcesados,
                distribucionVuelto: {
                    usd: vueltosProcesados.filter(v => v.currency === CURRENCY.USD).reduce((a, b) => a + b.amount, 0),
                    bs: vueltosProcesados.filter(v => v.currency === CURRENCY.VES).reduce((a, b) => a + b.amount, 0)
                },
                financialSchema: 'v4-strict',
                igtfTotal: parseFloat(ventaFinal.igtfTotal) || 0,
                vueltoCredito: !!ventaFinal.vueltoCredito,
                montoVueltoCredito: ventaFinal.vueltoCredito ? (parseFloat(ventaFinal.cambio) || 0) : 0,
                montoSaldoFavor: parseFloat(ventaFinal.montoSaldoFavor) || 0,
                appliedToDebt: appliedToDebt,
                appliedToWallet: appliedToWallet,
                timestamp: timeProvider.toISOString(),
                _lww_updated_at: Date.now()
            };

            await db.ventas.add(ventaToSave);

            // 🔐 AUDIT CHAIN: Log sale to tamper-proof trail
            appendAuditEntry('SALE_COMPLETED', {
                idVenta: ventaToSave.idVenta,
                total: totalFactura,
                items: itemsAProcesar.length,
                vendedor: usuario?.nombre,
                idempotencyKey
            }).catch(err => console.warn('Audit chain write failed (non-blocking):', err));

            // [V4] LAN SYNC: Dispatch sale + stock to principal
            dispatchSaleCompleted(ventaToSave, itemsAProcesar);

            return ventaToSave;
        });
    },

    /**
     * Anula una venta existente.
     */
    anularVenta: async (id, motivo, usuario, transaccionAnulacion, actualizarBalances) => {
        return await db.transaction('rw', db.ventas, db.productos, db.logs, db.clientes, db.caja_sesion, async () => {
            const venta = await db.ventas.get(id);
            if (!venta) throw new Error("Venta no encontrada.");
            if (venta.status === 'ANULADA') return { success: false, message: 'Ya anulada' };

            // 1. Revertir Dinero (Caja)
            if (actualizarBalances && venta.payments && venta.change) {
                await actualizarBalances('REFUND', venta.payments, venta.change);
            }

            // 2. Revertir Inventario
            await transaccionAnulacion(venta.items, usuario, motivo);

            // 3. Revertir Crédito Cliente
            if (venta.clienteId) {
                const targetClienteId = parseInt(venta.clienteId);
                if (!isNaN(targetClienteId)) {
                    await db.clientes.where('id').equals(targetClienteId).modify(c => {
                        // A. Revertir Venta Crédito
                        if (venta.esCredito) {
                            c.deuda = Math.max(0, (c.deuda || 0) - (venta.deudaPendiente || 0));
                        }

                        // A.2 Revertir Consumo de Saldo
                        let consumoSaldo = venta.montoSaldoFavor || 0;
                        if (consumoSaldo === 0 && Array.isArray(venta.payments || venta.pagos)) {
                            consumoSaldo = (venta.payments || venta.pagos)
                                .filter(p => p.medium === 'INTERNAL' || p.method === 'SALDO A FAVOR' || p.metodo === 'SALDO A FAVOR')
                                .reduce((sum, p) => sum + (parseFloat(p.amount || p.monto) || 0), 0);
                        }
                        if (consumoSaldo > 0) {
                            c.favor = (c.favor || 0) + consumoSaldo;
                        }

                        // B. Revertir Vuelto Aplicado
                        if (venta.appliedToDebt > 0) {
                            c.deuda = (c.deuda || 0) + venta.appliedToDebt;
                        }

                        if (venta.appliedToWallet > 0) {
                            c.favor = Math.max(0, (c.favor || 0) - venta.appliedToWallet);
                        }

                        // Fallback Legacy
                        if (venta.appliedToDebt === undefined && venta.appliedToWallet === undefined) {
                            if (venta.montoVueltoDigital > 0) {
                                c.favor = Math.max(0, (c.favor || 0) - (venta.montoVueltoDigital || 0));
                            } else if (venta.vueltoCredito && venta.cambio > 0) {
                                c.favor = Math.max(0, (c.favor || 0) - (venta.cambio || 0));
                            }
                        }

                        // Normalización
                        const neto = (c.favor || 0) - (c.deuda || 0);

                        if (neto >= 0) {
                            c.favor = parseFloat(neto.toFixed(2));
                            c.deuda = 0;
                        } else {
                            c.favor = 0;
                            c.deuda = parseFloat(Math.abs(neto).toFixed(2));
                        }

                        c.saldo = parseFloat((c.deuda - c.favor).toFixed(2));
                    });
                }
            }

            // 4. Marcar Anulada
            await db.ventas.update(id, {
                status: 'ANULADA',
                motivoAnulacion: motivo || 'Sin motivo',
                fechaAnulacion: timeProvider.toISOString(),
                usuarioAnulacionId: usuario?.id || 'sys',
                usuarioAnulacion: usuario?.nombre || 'Sistema',
                _lww_updated_at: Date.now()
            });

            // 🔐 AUDIT CHAIN: Log void to tamper-proof trail
            appendAuditEntry('SALE_VOIDED', {
                idVenta: venta.idVenta || id,
                total: venta.total,
                motivo: motivo || 'Sin motivo',
                usuario: usuario?.nombre
            }).catch(err => console.warn('Audit chain write failed (non-blocking):', err));

            // [V4] LAN SYNC: Dispatch stock revert to principal
            dispatchStockReverted(venta.items);

            return { success: true };
        });
    },

    /**
     * Registra un abono a cuenta (Cobranza).
     */
    registrarAbono: async (clienteId, metodosPago = [], totalAbono = 0, referencia = '', usuario, configuracion, actualizarBalances, generarCorrelativo, cajaId = DEFAULT_CAJA) => {
        const sesion = await db.caja_sesion.get(cajaId);
        if (!sesion || !sesion.isAbierta) throw new Error("Caja cerrada. Abra turno.");

        return await db.transaction('rw', db.ventas, db.logs, db.clientes, db.caja_sesion, async () => {
            const targetClienteId = parseInt(clienteId);
            const cliente = await db.clientes.get(targetClienteId);
            if (!cliente) throw new Error("Cliente no encontrado");

            // 1. Normalize
            const pagosProcesados = metodosPago.map(p => {
                const methodStr = (p.metodo || 'Desconocido').toLowerCase();
                const isCash = methodStr.includes('efectivo') || methodStr.includes('cash');

                return {
                    id: crypto.randomUUID(),
                    method: p.metodo || 'Desconocido',
                    metodo: p.metodo || 'Desconocido',
                    amount: math.round(p.monto || 0),
                    monto: math.round(p.monto || 0),
                    currency: p.currency || (p.tipo === 'BS' ? CURRENCY.VES : CURRENCY.USD),
                    medium: p.medium || (isCash ? MEDIUM.CASH : MEDIUM.DIGITAL),
                    rate: math.round(configuracion.tasa || 1, 4),
                    originalRef: p.referencia || referencia
                };
            });

            // ⛔ CHAOS_GUARD: Validar ANTES de mutar estado
            if (metodosPago.some(m => m.metodo === 'CREDITO' || m.medium === 'CREDIT')) {
                throw new Error("CHAOS_GUARD: No se puede abonar a una deuda usando Crédito.");
            }

            // 2. Update Cash
            const pagosReales = pagosProcesados.filter(p => p.medium !== 'INTERNAL');
            if (pagosReales.length > 0) {
                await actualizarBalances('SALE', pagosReales, []);
            }

            // 3. Update Client
            const abono = math.round(totalAbono);
            cliente.deuda = cliente.deuda || 0;
            cliente.favor = cliente.favor || 0;

            const result = FinancialController.simulateCustomerUpdate(cliente, 0, abono, 0);

            // Validate: overpayment creates credit (favor), which is expected behavior
            if (result.favor > 0 && cliente.deuda > 0) {
                console.log(`ℹ️ [ABONO] Sobrepago detectado: $${result.favor.toFixed(2)} será saldo a favor.`);
            }

            cliente.deuda = result.deuda;
            cliente.favor = result.favor;
            const nuevoSaldo = math.sub(cliente.deuda, cliente.favor);

            await db.clientes.update(clienteId, {
                saldo: nuevoSaldo,
                deuda: cliente.deuda,
                favor: cliente.favor
            });

            // (Validación movida antes de actualizarBalances)

            const idTransaccion = timeProvider.timestamp();
            const transaccion = {
                id: idTransaccion,
                idVenta: await generarCorrelativo('factura'),
                fecha: timeProvider.toISOString(),
                tipo: 'COBRO_DEUDA',
                corteId: null,
                clienteId: cliente.id,
                clienteNombre: cliente.nombre,
                total: abono,
                deudaRestante: cliente.deuda,
                favorRestante: cliente.favor,
                items: [],
                metodos: metodosPago,
                payments: pagosProcesados,
                pagos: pagosProcesados,
                change: [],
                totalBS: parseFloat((totalAbono * (configuracion.tasa || 1)).toFixed(2)), // fixFloat replacement
                vendedorId: usuario?.id || 'sys',
                vendedor: usuario?.nombre || 'Cajero',
                usuario: { id: usuario?.id, nombre: usuario?.nombre },
                status: 'COMPLETADA',
                tasa: configuracion.tasa,
                financialSchema: 'v4-strict',
                timestamp: timeProvider.toISOString(),
                _lww_updated_at: Date.now()
            };

            await db.ventas.add(transaccion);

            // 🔐 AUDIT CHAIN: Log payment to tamper-proof trail
            appendAuditEntry('PAYMENT_RECEIVED', {
                idVenta: transaccion.idVenta,
                clienteId: cliente.id,
                total: abono,
                deudaRestante: cliente.deuda,
                usuario: usuario?.nombre
            }).catch(err => console.warn('Audit chain write failed (non-blocking):', err));

            return transaccion;
        });
    },

    /**
     * Sanea la cuenta de un cliente (Ajuste Administrativo).
     */
    sanearCuentaCliente: async (clienteId, tipo, motivo, usuario, generarCorrelativo) => {
        return await db.transaction('rw', db.ventas, db.clientes, db.logs, async () => {
            const targetClienteId = parseInt(clienteId);
            const cliente = await db.clientes.get(targetClienteId);
            if (!cliente) throw new Error("Cliente no encontrado");

            const montoAjustado = tipo === 'DEUDA' ? (cliente.deuda || 0) : (cliente.favor || 0);
            if (montoAjustado <= 0) return null;

            await db.clientes.update(targetClienteId, {
                deuda: tipo === 'DEUDA' ? 0 : (cliente.deuda || 0),
                favor: tipo === 'FAVOR' ? 0 : (cliente.favor || 0),
                saldo: tipo === 'DEUDA' ? -(cliente.favor || 0) : (cliente.deuda || 0)
            });

            const transaccion = {
                id: timeProvider.timestamp(),
                idVenta: await generarCorrelativo('factura'),
                fecha: timeProvider.toISOString(),
                tipo: 'AJUSTE_ADMINISTRATIVO',
                motivo: motivo,
                clienteId: cliente.id,
                clienteNombre: cliente.nombre,
                total: montoAjustado,
                cargoVenta: tipo === 'DEUDA' ? 0 : 0,
                abonoTotal: tipo === 'DEUDA' ? montoAjustado : 0,
                montoAjusteFavor: tipo === 'FAVOR' ? montoAjustado : 0,
                vendedorId: usuario?.id || 'sys',
                vendedor: usuario?.nombre || 'Cajero',
                usuario: { id: usuario?.id, nombre: usuario?.nombre },
                status: 'COMPLETADA',
                timestamp: timeProvider.toISOString(),
                _lww_updated_at: Date.now()
            };

            await db.ventas.add(transaccion);

            // 🔐 AUDIT CHAIN: Log adjustment to tamper-proof trail
            appendAuditEntry('ADMIN_ADJUSTMENT', {
                idVenta: transaccion.idVenta,
                clienteId: cliente.id,
                tipo,
                montoAjustado,
                motivo,
                usuario: usuario?.nombre
            }).catch(err => console.warn('Audit chain write failed (non-blocking):', err));

            return transaccion;
        });
    }
};
