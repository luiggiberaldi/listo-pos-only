import { useState } from 'react';
import { db } from '../../db';

import Swal from 'sweetalert2';

// Constantes financieras locales (Mirror de usePOS original)
const CURRENCY = { USD: 'USD', VES: 'VES', EUR: 'EUR' };
const MEDIUM = { CASH: 'CASH', CARD: 'CARD', DIGITAL: 'DIGITAL', CREDIT: 'CREDIT' };
const fixFloat = (n) => parseFloat((parseFloat(n) || 0).toFixed(2));

export const useSalesProcessor = (
    usuario,
    configuracion,
    { transaccionVenta, transaccionAnulacion, playSound, generarCorrelativo },
    { abrirCaja, cerrarSesionCaja, actualizarBalances }, // De useCajaEstado
    carrito,
    setCarrito
) => {
    const [isProcessing, setIsProcessing] = useState(false);



    // C. ANULACIÓN
    const anularVenta = async (id, motivo) => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            // TRANSACTION: Ventas + Productos + Logs + Clientes + Caja
            await db.transaction('rw', db.ventas, db.productos, db.logs, db.clientes, db.caja_sesion, async () => {
                const venta = await db.ventas.get(id);
                if (!venta) throw new Error("Venta no encontrada.");
                if (venta.status === 'ANULADA') return;

                // 1. Revertir Dinero (Caja)
                if (actualizarBalances && venta.payments && venta.change) {
                    await actualizarBalances('REFUND', venta.payments, venta.change);
                }

                // 2. Revertir Inventario (Devolución)
                // Usamos la función inyectada, pero OJO: transaccionAnulacion inicia su propia transaction.
                // Dexie anida transactions automáticamente si son compatibles.
                await transaccionAnulacion(venta.items, usuario, motivo);

                // 3. Revertir Crédito Cliente (Quadrants Reversal Smart)
                if (venta.clienteId) {
                    const targetClienteId = parseInt(venta.clienteId);
                    if (!isNaN(targetClienteId)) {
                        await db.clientes.where('id').equals(targetClienteId).modify(c => {
                            // A. Revertir Q1 (Venta Crédito)
                            if (venta.esCredito) {
                                c.deuda = Math.max(0, (c.deuda || 0) - (venta.deudaPendiente || 0));
                            }

                            // A.2 Revertir Consumo de Saldo (Devolución al Monedero) 🆕
                            let consumoSaldo = venta.montoSaldoFavor || 0;
                            // Si no hay flag explícito, buscamos en los pagos
                            if (consumoSaldo === 0 && Array.isArray(venta.pagos)) {
                                consumoSaldo = venta.pagos
                                    .filter(p => p.medium === 'INTERNAL' || p.method === 'SALDO A FAVOR' || p.metodo === 'SALDO A FAVOR')
                                    .reduce((sum, p) => sum + (parseFloat(p.amount || p.monto) || 0), 0);
                            }
                            if (consumoSaldo > 0) {
                                c.favor = (c.favor || 0) + consumoSaldo;
                            }

                            // B. Revertir Q2/Q3 (Vuelto Digital aplicado a Deuda o Favor)
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

                            // ⚖️ NORMALIZACIÓN FINAL (Exclusividad Deuda/Favor)
                            const neto = (c.favor || 0) - (c.deuda || 0);

                            if (neto >= 0) {
                                c.favor = parseFloat(neto.toFixed(2));
                                c.deuda = 0;
                            } else {
                                c.favor = 0;
                                c.deuda = parseFloat(Math.abs(neto).toFixed(2));
                            }

                            // Sync Saldo Legacy
                            c.saldo = parseFloat((c.deuda - c.favor).toFixed(2));
                        });
                    }
                }

                // 4. Marcar Anulada
                await db.ventas.update(id, {
                    status: 'ANULADA',
                    motivoAnulacion: motivo || 'Sin motivo',
                    fechaAnulacion: new Date().toISOString(),
                    usuarioAnulacionId: usuario?.id || 'sys',
                    usuarioAnulacion: usuario?.nombre || 'Sistema'
                });
            });

            if (playSound) playSound('TRASH');
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Fallo al anular venta', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // D. REGISTRAR VENTA (EL NÚCLEO)
    const registrarVenta = async (ventaFinal) => {
        // Validación de Estado (Lectura directa a DB para evitar race condition)
        const sesion = await db.caja_sesion.get('actual');
        if (!sesion || !sesion.isAbierta) throw new Error("Caja cerrada. Abra turno.");

        try {
            setIsProcessing(true);
            const itemsAProcesar = carrito.length > 0 ? carrito : (ventaFinal.items || []);
            if (itemsAProcesar.length === 0) throw new Error("Carrito vacío");

            // 🛡️ CHAOS_GUARD: VALIDACIÓN STRICTA DE STOCK
            // Si la configuración prohíbe venta sin stock, validamos una última vez antes de procesar.
            if (configuracion && !configuracion.permitirSinStock) {
                const consumos = {}; // { id: { required: 0, available: 0, nombre: '' } }

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
                        // 🛰️ [CHAOS_REPAIR] Si el snapshot no trae stock (ej: Simulación Quantum), consultamos DB
                        if (stockActual === undefined) {
                            const p = await db.productos.get(id);
                            stockActual = p?.stock || 0;
                        }
                        consumos[id] = { required: 0, available: parseFloat(stockActual || 0), nombre: item.nombre };
                    }
                    consumos[id].required += (item.cantidad * factor);
                }

                // Check violations
                for (const id in consumos) {
                    const c = consumos[id];
                    if (c.required > c.available + 0.0001) {
                        const diff = c.required - c.available;
                        throw new Error(`STOCK INSUFICIENTE: ${c.nombre} (Falta: ${diff.toFixed(2)} Unds)`);
                    }
                }
            }

            // --- INICIO TRANSACCIÓN ACID ---
            // Afecta: Ventas, Productos, Logs, Clientes, Caja, Config (Correlativos)
            const nuevaVenta = await db.transaction('rw', db.ventas, db.productos, db.logs, db.clientes, db.caja_sesion, db.config, async () => {

                // 🧾 1. NORMALIZACIÓN STRICTA (Sin Adivinanzas)
                // 🛡️ LOGIC GUARDS (CHAOS PROOF)
                const rawPagos = ventaFinal.pagos || ventaFinal.metodos || [];
                const totalFactura = parseFloat(ventaFinal.total || 0);
                const tasaVenta = parseFloat(ventaFinal.tasa) || 1;

                // 🧮 CALCULO PRECISO DE TOTAL PAGADO (Normalized to USD)
                const totalPagadoUSD = rawPagos.reduce((acc, p) => {
                    const amt = parseFloat(p.amount || p.monto || 0);
                    const rate = parseFloat(p.rate || p.tasa || tasaVenta);
                    const currency = p.currency || (p.tipo === 'BS' ? 'VES' : 'USD');
                    return acc + (currency === 'USD' ? amt : (rate > 0 ? amt / rate : 0));
                }, 0);

                // G0: NO Toxic Math (NaN Checks - RAW INPUT)
                if (Number.isNaN(totalFactura) || ventaFinal.total === null) {
                    throw new Error("CHAOS_GUARD: Detectadas matemáticas corruptas (Total is NaN/Null).");
                }
                if (rawPagos.some(p => Number.isNaN(parseFloat(p.amount || p.monto)))) {
                    throw new Error("CHAOS_GUARD: Detectadas matemáticas corruptas (Payment Amount is NaN/Null).");
                }

                // G1: NO Negative Payments
                if (rawPagos.some(p => (parseFloat(p.amount || p.monto) || 0) < 0)) {
                    throw new Error("CHAOS_GUARD: No se permiten pagos negativos.");
                }

                // G2: NO Credit without Client
                if (ventaFinal.esCredito && !ventaFinal.clienteId) {
                    throw new Error("CHAOS_GUARD: Venta a Crédito requiere Cliente.");
                }

                // G3: NO Credit with Zero Debt (Fake Credit)
                // If it's credit, but Debt Pending is 0 (or covered fully), it's invalid.
                if (ventaFinal.esCredito && (ventaFinal.deudaPendiente <= 0.01)) {
                    throw new Error("CHAOS_GUARD: Venta clasificada como Crédito pero sin deuda pendiente (Use Contado).");
                }

                const pagosProcesados = (ventaFinal.pagos || ventaFinal.metodos || []).map(p => {
                    // Requerimos que la UI envíe currency y medium. Si no, fallback seguro.
                    const methodStr = (p.metodo || 'Desconocido').toLowerCase();
                    const isCash = methodStr.includes('efectivo') || methodStr.includes('cash');

                    return {
                        id: crypto.randomUUID(),
                        method: p.metodo || 'Desconocido',
                        amount: parseFloat(p.amount || p.monto || 0), // Valor nominal en la moneda original
                        currency: p.currency || (p.tipo === 'BS' ? CURRENCY.VES : CURRENCY.USD),
                        medium: p.medium || (isCash ? MEDIUM.CASH : MEDIUM.DIGITAL),
                        rate: parseFloat(ventaFinal.tasa) || 1,
                        originalRef: p
                    };
                });

                const vueltosProcesados = [];
                // ⚠️ VUELTO HÍBRIDO: Puede haber parte físico y parte digital
                const dist = ventaFinal.distribucionVuelto || {};
                // tasaVenta ya fue declarada arriba.

                // Vueltos físicos (Salen de Caja)
                if (parseFloat(dist.usd || 0) > 0.001) {
                    vueltosProcesados.push({
                        amount: fixFloat(dist.usd),
                        currency: CURRENCY.USD,
                        medium: MEDIUM.CASH,
                        rate: 1
                    });
                }
                if (parseFloat(dist.bs || 0) > 0.001) {
                    vueltosProcesados.push({
                        amount: fixFloat(dist.bs),
                        currency: CURRENCY.VES,
                        medium: MEDIUM.CASH,
                        rate: tasaVenta
                    });
                }

                // ⚖️ CALCULO DE REMANENTE (VUELTO NO ASIGNADO)
                const totalEntregadoFisicoUSD = fixFloat(
                    (vueltosProcesados.find(v => v.currency === CURRENCY.USD)?.amount || 0) +
                    (vueltosProcesados.find(v => v.currency === CURRENCY.VES)?.amount || 0) / tasaVenta
                );

                // 🔥 FALLBACK DE VUELTO (Si no viene de UI, calculamos la diferencia real)
                // Usamos Math.max(0) para evitar que ventas a crédito (bajo pago) generen "vuelto negativo"
                const totalDebeVueltoUSD = fixFloat(ventaFinal.cambio || ventaFinal.montoVueltoDigital || Math.max(0, totalPagadoUSD - totalFactura));
                let remanenteVueltoUSD = fixFloat(totalDebeVueltoUSD - totalEntregadoFisicoUSD);

                // G2: NO unassigned change without Client
                if (remanenteVueltoUSD > 0.01 && !ventaFinal.clienteId) {
                    throw new Error(`CHAOS_GUARD: Existe un vuelto de $${remanenteVueltoUSD.toFixed(2)} sin asignar a un cliente (Monedero). Especifique cliente o entregue en efectivo.`);
                }

                // G2.5: NO EXCESS CHANGE (Over-payment of change)
                if (remanenteVueltoUSD < -0.01) {
                    throw new Error(`CHAOS_GUARD: El vuelto entregado excede el cambio debido por $${Math.abs(remanenteVueltoUSD).toFixed(2)}.`);
                }

                // 📦 2. IMPACTO INVENTARIO
                await transaccionVenta(itemsAProcesar, usuario);

                // 💰 3. IMPACTO CAJA (Balances)
                // 🛑 Excluimos pagos internos (Saldo a Favor) para no descuadrar caja
                const pagosReales = pagosProcesados.filter(p => p.medium !== 'INTERNAL');
                await actualizarBalances('SALE', pagosReales, vueltosProcesados);

                // 👥 4. IMPACTO CLIENTES (Crédito y Vuelto A Cuenta)
                // Variables para guardar distribución exacta del vuelto (Scope function)
                let appliedToDebt = 0;
                let appliedToWallet = 0;

                if (ventaFinal.clienteId) {
                    // 🛡️ TYPE SAFETY: Ensure ID is number for IndexedDB
                    const targetClienteId = parseInt(ventaFinal.clienteId);

                    if (!isNaN(targetClienteId)) {
                        await db.clientes.where('id').equals(targetClienteId).modify(c => {
                            // Q0: CONSUMO DE SALDO A FAVOR (Pago con Monedero)
                            let consumoSaldo = fixFloat(ventaFinal.montoSaldoFavor || 0);
                            if (consumoSaldo === 0 && pagosProcesados.length > 0) {
                                consumoSaldo = pagosProcesados
                                    .filter(p => p.medium === 'INTERNAL' || p.method === 'SALDO A FAVOR')
                                    .reduce((sum, p) => sum + p.amount, 0);
                            }

                            if (consumoSaldo > 0) {
                                c.favor = Math.max(0, fixFloat((c.favor || 0) - consumoSaldo));
                            }

                            // Q1: AUMENTO DE DEUDA (Crédito Nuevo)
                            if (ventaFinal.esCredito) {
                                c.deuda = fixFloat((c.deuda || 0) + (ventaFinal.deudaPendiente || 0));
                            }

                            // Q2 & Q3: VUELTO DIGITAL (Monedero)
                            // El monedero absorbe AUTOMÁTICAMENTE el remanente de vuelto
                            const totalVueltoApp = fixFloat(remanenteVueltoUSD);

                            if (totalVueltoApp > 0.001) {
                                const deudaActual = c.deuda || 0;

                                if (deudaActual > 0.001) {
                                    // Prioridad: Pagar Deuda
                                    if (deudaActual >= totalVueltoApp) {
                                        // Cubre parte de la deuda
                                        appliedToDebt = totalVueltoApp;
                                        c.deuda = fixFloat(deudaActual - totalVueltoApp);
                                    } else {
                                        // Paga toda la deuda y sobra
                                        appliedToDebt = deudaActual;
                                        appliedToWallet = fixFloat(totalVueltoApp - deudaActual);

                                        c.deuda = 0;
                                        c.favor = fixFloat((c.favor || 0) + appliedToWallet);
                                    }
                                } else {
                                    // No hay deuda, todo a Wallet (Favor)
                                    appliedToWallet = totalVueltoApp;
                                    c.favor = fixFloat((c.favor || 0) + appliedToWallet);
                                }
                            }

                            // ⚖️ 5. NORMALIZACIÓN STRICTA (Exclusividad Deuda/Favor)
                            const neto = fixFloat((c.favor || 0) - (c.deuda || 0));

                            if (neto >= 0) {
                                c.favor = neto;
                                c.deuda = 0;
                            } else {
                                c.favor = 0;
                                c.deuda = Math.abs(neto);
                            }

                            // Sync Legacy
                            c.saldo = fixFloat(c.deuda - c.favor);
                        });
                    }
                }

                // 💾 5. GUARDAR VENTA
                const idVentaManual = Date.now();
                const ventaToSave = {
                    ...ventaFinal,
                    id: idVentaManual,
                    idVenta: ventaFinal.idVenta || await generarCorrelativo('factura'), // ✅ Use existing or generate new
                    items: itemsAProcesar,
                    vendedorId: usuario?.id || 'sys',
                    vendedor: usuario?.nombre || 'Cajero',
                    usuario: { id: usuario?.id, nombre: usuario?.nombre },
                    status: 'COMPLETADA',
                    corteId: null,

                    // FINANCIAL CORE V4
                    payments: pagosProcesados,
                    change: vueltosProcesados, // ✅ Truth (Cash Flow)
                    distribucionVuelto: { // ✅ Sync for Ticket Display (Avoid Double Counting)
                        usd: vueltosProcesados.filter(v => v.currency === CURRENCY.USD).reduce((a, b) => a + b.amount, 0),
                        bs: vueltosProcesados.filter(v => v.currency === CURRENCY.VES).reduce((a, b) => a + b.amount, 0)
                    },
                    financialSchema: 'v4-strict',
                    igtfTotal: parseFloat(ventaFinal.igtfTotal) || 0,
                    vueltoCredito: !!ventaFinal.vueltoCredito,
                    montoVueltoCredito: ventaFinal.vueltoCredito ? (parseFloat(ventaFinal.cambio) || 0) : 0,
                    montoSaldoFavor: parseFloat(ventaFinal.montoSaldoFavor) || 0, // ✅ Persistence
                    // QUADRANTS METADATA (Para anulación precisa)
                    appliedToDebt: appliedToDebt,
                    appliedToWallet: appliedToWallet,
                    timestamp: new Date().toISOString()
                };

                // 🔍 DEBUG: VERIFY PERSISTENCE
                if (typeof window !== 'undefined') window.__LAST_VENTA_SAVED = ventaToSave;

                await db.ventas.add(ventaToSave);
                return ventaToSave;
            });
            // --- FIN TRANSACCIÓN ---

            if (carrito.length > 0) {
                setCarrito([]);
                if (playSound) playSound('CASH_REGISTER');
            }

            return nuevaVenta;

        } catch (error) {
            console.error("Error Transaction:", error);
            if (playSound) playSound('ERROR');
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    // E. REGISTRAR ABONO (COBRANZA DEUDA)
    const registrarAbono = async (clienteId, metodosPago = [], totalAbono = 0, referencia = '') => {
        // Validación de Estado
        const sesion = await db.caja_sesion.get('actual');
        if (!sesion || !sesion.isAbierta) throw new Error("Caja cerrada. Abra turno.");

        try {
            setIsProcessing(true);

            const result = await db.transaction('rw', db.ventas, db.logs, db.clientes, db.caja_sesion, db.config, async () => {
                const targetClienteId = parseInt(clienteId);
                const cliente = await db.clientes.get(targetClienteId);
                if (!cliente) throw new Error("Cliente no encontrado");

                // 1. NORMALIZACIÓN DE PAGOS (Schema V4)
                const pagosProcesados = metodosPago.map(p => {
                    const methodStr = (p.metodo || 'Desconocido').toLowerCase();
                    const isCash = methodStr.includes('efectivo') || methodStr.includes('cash');

                    return {
                        id: crypto.randomUUID(),
                        method: p.metodo || 'Desconocido',
                        metodo: p.metodo || 'Desconocido', // ✅ Spanish Alias
                        amount: parseFloat(p.monto || 0),
                        monto: parseFloat(p.monto || 0), // ✅ Spanish Alias
                        currency: p.currency || (p.tipo === 'BS' ? CURRENCY.VES : CURRENCY.USD),
                        medium: p.medium || (isCash ? MEDIUM.CASH : MEDIUM.DIGITAL),
                        rate: parseFloat(configuracion.tasa) || 1,
                        originalRef: p.referencia || referencia
                    };
                });

                // 2. ACTUALIZAR CAJA (Solo ENTRADA de dinero REAL)
                // 🛑 Excluimos pagos internos (Sanear Cuenta / Ajustes) para no inflar la caja
                const pagosReales = pagosProcesados.filter(p => p.medium !== 'INTERNAL');
                if (pagosReales.length > 0) {
                    await actualizarBalances('SALE', pagosReales, []);
                }

                // 3. ACTUALIZAR CLIENTE (Quadrants Logic)
                const abono = fixFloat(totalAbono); // ✅ Enforce 2 decimals

                // Init fields if undefined (migration safety)
                cliente.deuda = cliente.deuda || 0;
                cliente.favor = cliente.favor || 0;

                // Q2: ABONO A DEUDA
                if (cliente.deuda >= abono) {
                    // Paga parte o toda la deuda
                    cliente.deuda -= abono;
                } else {
                    // Paga toda la deuda y sobra dinero (Overflow -> Favor)
                    const resto = abono - cliente.deuda;
                    cliente.deuda = 0;
                    cliente.favor += resto; // Q3 Implicito
                }

                // ⚖️ NORMALIZACIÓN FINAL
                const neto = (cliente.favor || 0) - (cliente.deuda || 0);
                if (neto >= 0) {
                    cliente.favor = parseFloat(neto.toFixed(2));
                    cliente.deuda = 0;
                } else {
                    cliente.favor = 0;
                    cliente.deuda = parseFloat(Math.abs(neto).toFixed(2));
                }

                cliente.deuda = fixFloat(cliente.deuda);
                cliente.favor = fixFloat(cliente.favor);

                // Sync Legacy
                const nuevoSaldo = fixFloat(cliente.deuda - cliente.favor);

                await db.clientes.update(clienteId, {
                    saldo: nuevoSaldo,
                    deuda: cliente.deuda,
                    favor: cliente.favor
                });

                // G5: NO Infinite Payment (Block paying debt with credit)
                if (metodosPago.some(m => m.metodo === 'CREDITO' || m.medium === 'CREDIT')) {
                    throw new Error("CHAOS_GUARD: No se puede abonar a una deuda usando Crédito.");
                }

                // 4. REGISTRAR TRANSACCIÓN (COBRO_DEUDA)
                const idTransaccion = Date.now();
                const transaccion = {
                    id: idTransaccion,
                    idVenta: await generarCorrelativo('factura'), // O 'recibo_cobro'? Usamos factura por simplicidad fiscal? Mejor 'RECIBO'.
                    fecha: new Date().toISOString(),
                    tipo: 'COBRO_DEUDA', // <--- CLAVE
                    corteId: null, // ✅ Fix: Ensure it appears in CierrePage
                    clienteId: cliente.id,
                    clienteNombre: cliente.nombre,
                    total: abono, // ✅ Use Rounded Value
                    deudaRestante: cliente.deuda, // 📸 Snapshot for Ticket
                    favorRestante: cliente.favor, // 📸 Snapshot for Ticket

                    // Arrays vacíos de items (no es venta de mercancía)
                    items: [],

                    metodos: metodosPago, // Legacy map
                    payments: pagosProcesados, // New Schema
                    pagos: pagosProcesados, // ✅ Alias for UI Consistency
                    change: [],

                    totalBS: fixFloat(totalAbono * (configuracion.tasa || 1)), // ✅ Correct VES total

                    vendedorId: usuario?.id || 'sys',
                    vendedor: usuario?.nombre || 'Cajero',
                    usuario: { id: usuario?.id, nombre: usuario?.nombre },
                    status: 'COMPLETADA',
                    tasa: configuracion.tasa,
                    financialSchema: 'v4-strict',
                    timestamp: new Date().toISOString()
                };

                await db.ventas.add(transaccion);
                return transaccion;
            });

            if (playSound) playSound('SUCCESS');
            return result; // ✅ Ahora 'result' existe y contiene la transacción

        } catch (error) {
            console.error("Error Abono:", error);
            if (playSound) playSound('ERROR');
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    // F. SANEAR CUENTA (Ajuste Administrativo)
    const sanearCuentaCliente = async (clienteId, tipo, motivo = 'Ajuste Manual') => {
        try {
            setIsProcessing(true);
            const result = await db.transaction('rw', db.ventas, db.clientes, db.logs, db.config, async () => {
                const targetClienteId = parseInt(clienteId);
                const cliente = await db.clientes.get(targetClienteId);
                if (!cliente) throw new Error("Cliente no encontrado");

                const montoAjustado = tipo === 'DEUDA' ? (cliente.deuda || 0) : (cliente.favor || 0);
                if (montoAjustado <= 0) return true; // Ya está en cero

                // 1. ACTUALIZAR CLIENTE (Zero out)
                await db.clientes.update(targetClienteId, {
                    deuda: tipo === 'DEUDA' ? 0 : (cliente.deuda || 0),
                    favor: tipo === 'FAVOR' ? 0 : (cliente.favor || 0),
                    saldo: tipo === 'DEUDA' ? -(cliente.favor || 0) : (cliente.deuda || 0)
                });

                // 2. REGISTRAR LOG DE AJUSTE
                const transaccion = {
                    id: Date.now(),
                    idVenta: await generarCorrelativo('factura'),
                    fecha: new Date().toISOString(),
                    tipo: 'AJUSTE_ADMINISTRATIVO',
                    motivo: motivo,
                    clienteId: cliente.id,
                    clienteNombre: cliente.nombre,
                    total: montoAjustado,
                    // Snapshot para el historial
                    cargoVenta: tipo === 'DEUDA' ? 0 : 0,
                    abonoTotal: tipo === 'DEUDA' ? montoAjustado : 0, // Si sancamos deuda, es como un abono
                    montoAjusteFavor: tipo === 'FAVOR' ? montoAjustado : 0,

                    vendedorId: usuario?.id || 'sys',
                    vendedor: usuario?.nombre || 'Cajero',
                    usuario: { id: usuario?.id, nombre: usuario?.nombre },
                    status: 'COMPLETADA',
                    timestamp: new Date().toISOString()
                };

                await db.ventas.add(transaccion);
                return transaccion;
            });

            if (playSound) playSound('SUCCESS');
            return result;
        } catch (error) {
            console.error("Error Saneamiento:", error);
            if (playSound) playSound('ERROR');
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        isProcessing,
        registrarVenta,
        anularVenta,
        registrarAbono,
        sanearCuentaCliente
    };
};
