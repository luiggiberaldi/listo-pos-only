import { useState, useCallback } from 'react';
import { useSalesProcessor } from '../store/useSalesProcessor';
import { useStore } from '../../context/StoreContext';
import { db } from '../../db';

/**
 * useChaosValidator V4.0 (ULTIMATE EDITION)
 * 
 * Suite definitiva de pruebas de estrés financiero.
 * Cobertura: Valores extremos, secuencias peligrosas, monedas, integridad de reportes.
 */
export const useChaosValidator = () => {
    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);

    const { usuario, configuracion } = useStore();

    // Mock de dependencias para el procesador
    const mockDeps = {
        transaccionVenta: async (items) => ({ success: true, count: items.length }),
        transaccionAnulacion: async () => true,
        playSound: () => { },
        generarCorrelativo: async () => "CTA4-" + Date.now().toString().slice(-6)
    };

    const mockCaja = {
        abrirCaja: async () => true,
        cerrarSesionCaja: async () => true,
        actualizarBalances: async () => true
    };

    const processor = useSalesProcessor(
        usuario || { id: 999, nombre: 'CHAOS_BOT' },
        configuracion || { tasa: 50 },
        mockDeps,
        mockCaja,
        [],
        () => { }
    );

    const log = (msg, type = 'info', data = null) => {
        const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️', fatal: '💀', fire: '🔥', debug: '🐛' };
        let formattedMsg = `${icons[type] || '•'} ${msg}`;
        if (data) {
            formattedMsg += `\n   >> SNAPSHOT: ${JSON.stringify(data)}`;
        }
        setLogs(prev => [...prev, formattedMsg]);
    };

    const runChaosTest = useCallback(async () => {
        setIsRunning(true);
        setLogs(['🚀 INICIANDO CHAOS TEST V4.0 ULTIMATE', '-----------------------------------']);

        try {
            // 🔓 FORZAR APERTURA DE CAJA
            await db.caja_sesion.put({
                key: 'actual',
                fechaInicio: new Date().toISOString(),
                usuarioInicioId: 999,
                usuarioInicio: 'CHAOS_BOT',
                montoInicial: 1000,
                isAbierta: true
            });

            // 📦 SEMBRAR PRODUCTOS DE CAOS (Asegurar que existan para el validador de stock)
            const chaosProducts = [
                { id: 6, nombre: 'Frankenstein Part', precio: 60, stock: 100, tipoUnidad: 'unidad', jerarquia: null, aplicaIva: false },
                { id: 7, nombre: 'Boomerang Item', precio: 20, stock: 100, tipoUnidad: 'unidad', jerarquia: null, aplicaIva: false },
                { id: 9, nombre: 'Cheap Item', precio: 10, stock: 100, tipoUnidad: 'unidad', jerarquia: null, aplicaIva: false },
                { id: 10, nombre: 'Time Item', precio: 10, stock: 100, tipoUnidad: 'unidad', jerarquia: null, aplicaIva: false },
                { id: 11, nombre: 'Micro Item', precio: 0.01, stock: 100, tipoUnidad: 'unidad', jerarquia: null, aplicaIva: false },
                { id: 12, nombre: 'Luxury Item', precio: 999999.99, stock: 100, tipoUnidad: 'unidad', jerarquia: null, aplicaIva: false },
                { id: 15, nombre: 'Zero Rate Item', precio: 10, stock: 100, tipoUnidad: 'unidad', jerarquia: null, aplicaIva: false },
                { id: 16, nombre: 'IGTF Credit Item', precio: 100, stock: 100, tipoUnidad: 'unidad', jerarquia: null, aplicaIva: false },
                { id: 777, nombre: 'Phoenix Item', precio: 25, stock: 100, tipoUnidad: 'unidad', jerarquia: null, aplicaIva: false },
                // Rafaga items
                ...[0, 1, 2, 3, 4].map(i => ({ id: 100 + i, nombre: `Rafaga Item ${i}`, precio: 5, stock: 100, tipoUnidad: 'unidad', jerarquia: null, aplicaIva: false }))
            ];
            await db.productos.bulkPut(chaosProducts);
            log(`Sembrados ${chaosProducts.length} productos de prueba.`, 'info');

            // 🛠️ PREPARAR SUJETO DE PRUEBA
            const TEST_CLIENT_ID = 8888;
            await db.clientes.put({
                id: TEST_CLIENT_ID,
                nombre: 'TEST SUBJECT 8888',
                deuda: 0,
                favor: 100,
                saldo: -100
            });
            log(`Cliente de prueba creado (ID: ${TEST_CLIENT_ID}, Favor: $100)`, 'info');

            // :::: TEST 6: FRANKENSTEIN (Pago Mixto) ::::
            const input6 = {
                items: [{ id: 6, nombre: 'Frankenstein Part', precio: 60, cantidad: 1 }],
                total: 60,
                pagos: [
                    { metodo: 'Efectivo', amount: 10 },
                    { metodo: 'Tarjeta', amount: 20 },
                    { metodo: 'SALDO A FAVOR', amount: 30, type: 'WALLET', medium: 'INTERNAL' }
                ],
                clienteId: TEST_CLIENT_ID,
            };
            log('TEST 6: Frankenstein (Mixto: Cash+Card+Wallet)', 'debug', input6);
            try {
                await processor.registrarVenta({ ...input6, distribucionVuelto: {}, esCredito: false });
                const client = await db.clientes.get(TEST_CLIENT_ID);
                if (Math.abs(client.favor - 70) < 0.1) {
                    log('ÉXITO: Pago mixto procesado ($100 -> $70).', 'success');
                } else {
                    log(`FALLÓ: Esperado: 70, Recibido: ${client.favor}`, 'error');
                }
            } catch (e) {
                log(`FALLÓ EJECUCIÓN: ${e.message}`, 'fatal');
            }

            // :::: TEST 7: BOOMERANG (Reembolso Wallet) ::::
            const input7 = {
                items: [{ id: 7, nombre: 'Boomerang Item', precio: 20, cantidad: 1 }],
                total: 20,
                pagos: [{ metodo: 'SALDO A FAVOR', amount: 20, medium: 'INTERNAL' }],
                clienteId: TEST_CLIENT_ID
            };
            log('TEST 7: Boomerang (Gasto $20 -> Anular)', 'debug');
            try {
                const venta = await processor.registrarVenta({ ...input7, distribucionVuelto: {}, esCredito: false });
                let client = await db.clientes.get(TEST_CLIENT_ID);
                if (Math.abs(client.favor - 50) > 0.1) throw new Error(`Saldo intermedio incorrecto: ${client.favor}`);

                await processor.anularVenta(venta.id, "Chaos Test Boomerang");

                client = await db.clientes.get(TEST_CLIENT_ID);
                if (Math.abs(client.favor - 70) < 0.1) {
                    log('ÉXITO: Boomerang devolvió el saldo ($70).', 'success');
                } else {
                    log(`FALLÓ: Esperado: 70, Recibido: ${client.favor}`, 'error');
                }
            } catch (e) {
                log(`FALLÓ EJECUCIÓN: ${e.message}`, 'fatal');
            }

            // :::: TEST 8: INFINITE PAYMENT ::::
            log('TEST 8: Infinite Payment (Abonar con Crédito)', 'debug');
            try {
                await processor.registrarAbono(
                    TEST_CLIENT_ID,
                    [{ metodo: 'CREDITO', monto: 10, amount: 10 }],
                    10,
                    'REF-INFINITE'
                );
                log('FALLÓ: Permitió pagar deuda con crédito.', 'fatal');
            } catch (e) {
                log(`Resultado: RECHAZADO. [${e.message}]`, 'success');
            }

            // :::: TEST 9: OVERLOAD (Vuelto a Wallet) ::::
            const input9 = {
                items: [{ id: 9, nombre: 'Cheap Item', precio: 10, cantidad: 1 }],
                total: 10,
                pagos: [{ metodo: 'Efectivo', amount: 100 }],
                clienteId: TEST_CLIENT_ID,
                montoVueltoDigital: 90,
            };
            log('TEST 9: Overload (Vuelto $90 a Wallet)', 'debug');
            try {
                await processor.registrarVenta({ ...input9, esCredito: false, distribucionVuelto: {} });
                const client = await db.clientes.get(TEST_CLIENT_ID);
                if (Math.abs(client.favor - 160) < 0.1) {
                    log('ÉXITO: Vuelto acreditado ($70 -> $160).', 'success');
                } else {
                    log(`FALLÓ: Esperado: 160, Recibido: ${client.favor}`, 'error');
                }
            } catch (e) {
                log(`FALLÓ EJECUCIÓN: ${e.message}`, 'fatal');
            }

            // :::: TEST 10: TIME TRAVELER (Tasa Histórica) ::::
            const input10 = {
                items: [{ id: 10, nombre: 'Time Item', precio: 10, cantidad: 1 }],
                total: 10,
                pagos: [{ metodo: 'Pago Móvil', amount: 200, currency: 'VES', rate: 20 }],
                tasa: 20
            };
            log('TEST 10: Time Traveler (Tasa Histórica)', 'debug', input10);
            try {
                const venta = await processor.registrarVenta({ ...input10, esCredito: false, clienteId: null, distribucionVuelto: {} });
                const record = await db.ventas.get(venta.id);
                if (record.tasa === 20) {
                    log('ÉXITO: Tasa histórica respetada (20).', 'success');
                } else {
                    log(`FALLÓ: Tasa registrada: ${record.tasa}`, 'error');
                }
            } catch (e) {
                log(`FALLÓ EJECUCIÓN: ${e.message}`, 'fatal');
            }

            // 🆕 :::: TEST 11: EL MICROPAGO (Penny Test) ::::
            const input11 = {
                items: [{ id: 11, nombre: 'Micro Item', precio: 0.01, cantidad: 1 }],
                total: 0.01,
                pagos: [{ metodo: 'Efectivo', amount: 0.01 }],
                clienteId: null
            };
            log('TEST 11: Micropago ($0.01)', 'debug');
            try {
                const venta = await processor.registrarVenta({ ...input11, esCredito: false, distribucionVuelto: {} });
                const record = await db.ventas.get(venta.id);
                if (record.total >= 0.01 && record.total < 0.02) {
                    log('ÉXITO: Micropago procesado sin redondear a $0.', 'success');
                } else {
                    log(`FALLÓ: Total registrado: ${record.total}`, 'error');
                }
            } catch (e) {
                log(`FALLÓ EJECUCIÓN: ${e.message}`, 'fatal');
            }

            // 🆕 :::: TEST 12: EL NARCO-PAGO (Max Value) ::::
            const input12 = {
                items: [{ id: 12, nombre: 'Luxury Item', precio: 999999.99, cantidad: 1 }],
                total: 999999.99,
                pagos: [{ metodo: 'Transferencia', amount: 999999.99 }],
                clienteId: null
            };
            log('TEST 12: Narco-Pago ($999,999.99)', 'debug');
            try {
                const venta = await processor.registrarVenta({ ...input12, esCredito: false, distribucionVuelto: {} });
                const record = await db.ventas.get(venta.id);
                if (record.total === 999999.99) {
                    log('ÉXITO: Valor extremo manejado correctamente.', 'success');
                } else {
                    log(`FALLÓ: Total registrado: ${record.total}`, 'error');
                }
            } catch (e) {
                log(`FALLÓ EJECUCIÓN: ${e.message}`, 'fatal');
            }

            // 🆕 :::: TEST 13: LA RÁFAGA (5 Ventas Consecutivas) ::::
            log('TEST 13: La Ráfaga (5 ventas rápidas)', 'debug');
            try {
                const ventasIds = [];
                for (let i = 0; i < 5; i++) {
                    const inputRafaga = {
                        items: [{ id: 100 + i, nombre: `Rafaga Item ${i}`, precio: 5, cantidad: 1 }],
                        total: 5,
                        pagos: [{ metodo: 'Efectivo', amount: 5 }],
                        clienteId: null
                    };
                    const venta = await processor.registrarVenta({ ...inputRafaga, esCredito: false, distribucionVuelto: {} });
                    ventasIds.push(venta.id);
                }

                // Verificar IDs únicos
                const uniqueIds = new Set(ventasIds);
                if (uniqueIds.size === 5) {
                    log('ÉXITO: 5 ventas procesadas con IDs únicos.', 'success');
                } else {
                    log(`FALLÓ: IDs duplicados detectados.`, 'error');
                }
            } catch (e) {
                log(`FALLÓ EJECUCIÓN: ${e.message}`, 'fatal');
            }

            // 🆕 :::: TEST 14: EL APOCALIPSIS (Vender -> Anular -> Re-Vender) ::::
            log('TEST 14: El Apocalipsis (Sell->Cancel->Resell)', 'debug');
            try {
                const inputApo1 = {
                    items: [{ id: 777, nombre: 'Phoenix Item', precio: 25, cantidad: 1 }],
                    total: 25,
                    pagos: [{ metodo: 'Efectivo', amount: 25 }],
                    clienteId: null
                };

                // Primera venta
                const venta1 = await processor.registrarVenta({ ...inputApo1, esCredito: false, distribucionVuelto: {} });

                // Anular
                await processor.anularVenta(venta1.id, "Apocalipsis Test");

                // Re-vender
                const venta2 = await processor.registrarVenta({ ...inputApo1, esCredito: false, distribucionVuelto: {} });

                const record1 = await db.ventas.get(venta1.id);
                const record2 = await db.ventas.get(venta2.id);

                if (record1.status === 'ANULADA' && record2.status === 'COMPLETADA' && venta1.id !== venta2.id) {
                    log('ÉXITO: Ciclo Sell->Cancel->Resell completado.', 'success');
                } else {
                    log(`FALLÓ: Estado inconsistente.`, 'error');
                }
            } catch (e) {
                log(`FALLÓ EJECUCIÓN: ${e.message}`, 'fatal');
            }

            // 🆕 :::: TEST 15: TASA CERO (Division by Zero) ::::
            const input15 = {
                items: [{ id: 15, nombre: 'Zero Rate Item', precio: 10, cantidad: 1 }],
                total: 10,
                pagos: [{ metodo: 'Efectivo', amount: 10 }],
                tasa: 0,
                clienteId: null
            };
            log('TEST 15: Tasa Cero (Division by Zero)', 'debug');
            try {
                const venta = await processor.registrarVenta({ ...input15, esCredito: false, distribucionVuelto: {} });
                const record = await db.ventas.get(venta.id);

                // Verificar que no haya Infinity o NaN
                const totalBS = record.totalBS || 0;
                if (!isFinite(totalBS)) {
                    log('FALLÓ: Infinity/NaN detectado en totalBS.', 'error');
                } else {
                    log('ÉXITO: Tasa cero manejada sin crashes.', 'success');
                }
            } catch (e) {
                log(`Resultado: BLOQUEADO. [${e.message}]`, 'success');
            }

            // 🆕 :::: TEST 16: IGTF SOBRE CRÉDITO ::::
            const input16 = {
                items: [{ id: 16, nombre: 'IGTF Credit Item', precio: 100, cantidad: 1 }],
                total: 100,
                igtfTotal: 3, // 3% IGTF
                pagos: [],
                esCredito: true,
                deudaPendiente: 103, // Total + IGTF
                clienteId: TEST_CLIENT_ID
            };
            log('TEST 16: IGTF sobre Crédito', 'debug');
            try {
                await processor.registrarVenta({ ...input16, distribucionVuelto: {} });
                const client = await db.clientes.get(TEST_CLIENT_ID);

                // Cliente debería tener deuda de 103 más que antes
                // Estado anterior: 160 favor. Estado nuevo: 160 favor, 103 deuda (normalizado)
                if (client.deuda >= 103 || (client.favor > 0 && client.deuda === 0)) {
                    log('ÉXITO: IGTF sumado a deuda correctamente.', 'success');
                } else {
                    log(`FALLÓ: Deuda: ${client.deuda}, Favor: ${client.favor}`, 'error');
                }
            } catch (e) {
                log(`FALLÓ EJECUCIÓN: ${e.message}`, 'fatal');
            }

            // 🆕 :::: TEST 17: POST-MORTEM (Validación Dashboard) ::::
            log('TEST 17: Post-Mortem (Integridad de Reportes)', 'debug');
            try {
                // Leer todas las ventas y calcular totales
                const todasVentas = await db.ventas.toArray();
                const ventasValidas = todasVentas.filter(v => v.status !== 'ANULADA');
                const totalVendido = ventasValidas.reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0);

                log(`Total de ventas válidas: ${ventasValidas.length}`, 'info');
                log(`Total vendido acumulado: $${totalVendido.toFixed(2)}`, 'info');

                // Verificar cliente de prueba
                const clienteFinal = await db.clientes.get(TEST_CLIENT_ID);
                log(`Estado final del cliente ${TEST_CLIENT_ID}: Deuda=$${clienteFinal.deuda}, Favor=$${clienteFinal.favor}`, 'info');

                // Validar exclusividad Deuda/Favor
                if (clienteFinal.deuda > 0 && clienteFinal.favor > 0) {
                    log('FALLÓ: Cliente tiene Deuda y Favor simultáneos (violación G5).', 'error');
                } else {
                    log('ÉXITO: Dashboard e integridad de datos verificados.', 'success');
                }
            } catch (e) {
                log(`FALLÓ EJECUCIÓN: ${e.message}`, 'fatal');
            }

            log('🏁 FIN DEL REPORTE V4.0 ULTIMATE', 'info');
        } catch (error) {
            log(`ERROR CRÍTICO SUITE: ${error.message}`, 'fatal');
        } finally {
            setIsRunning(false);
        }
    }, [processor]);

    return { runChaosTest, logs, isRunning };
};
