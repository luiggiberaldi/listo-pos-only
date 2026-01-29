import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { db } from '../../db';
import { fixFloat } from '../../utils/mathUtils';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const delay = (ms) => new Promise(res => setTimeout(res, ms));

export const useSimulation = () => {
    const store = useStore();
    const storeRef = useRef(store);

    useEffect(() => { storeRef.current = store; }, [store]);

    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [mode, setMode] = useState('IDLE');
    const abortRef = useRef(false);

    // --- MOTOR DE LOGS V10 ---
    const addLog = (msg, type = 'info', detail = null) => {
        const now = new Date();
        const time = `${now.toLocaleTimeString('es-VE', { hour12: false })}.${now.getMilliseconds().toString().padStart(3, '0')}`;
        const fullMsg = detail ? `${msg} ➤ ${detail}` : msg;
        setLogs(prev => [...prev, { time, msg: fullMsg, type }]);
    };

    // 🧹 Limpieza Robusta (Prevent Ghost Data)
    const limpiarDatosSeguro = async () => {
        addLog("🧹 LIMPIEZA PROFUNDA: Purgando Base de Datos...", 'dim');

        try {
            await Promise.all([
                db.ventas.clear(),
                db.tickets_espera.clear(),
                db.logs.clear(),
                db.cortes.clear(),
            ]);
        } catch (e) { console.error("Error clearing", e); }

        let intentos = 0;
        while (intentos < 10) {
            const cVentas = await db.ventas.count();
            const cCortes = await db.cortes.count();
            if (cVentas === 0 && cCortes === 0) {
                addLog("✨ DB LIMPIA CONFIRMADA", 'info');
                return;
            }
            await delay(200);
            intentos++;
        }
        addLog("⚠️ ADVERTENCIA: No se pudo confirmar limpieza total (Ghost Data risk)", 'warning');
    };

    const cambiarIdentidad = (rolHumano) => {
        // Mapeo manual para evitar depender de estructuras externas que pueden cambiar
        const MAPA_ROLES = {
            'DUEÑO': 'ROL_DUENO',
            'ENCARGADO': 'ROL_ENCARGADO',
            'GERENTE': 'ROL_ENCARGADO', // Alias
            'CAJERO': 'ROL_EMPLEADO',
            'EMPLEADO': 'ROL_EMPLEADO'
        };

        const roleId = MAPA_ROLES[rolHumano.toUpperCase()] || 'ROL_EMPLEADO';

        const usuarioSimulado = {
            ...storeRef.current.usuario,
            id: 9000 + Math.floor(Math.random() * 1000), // 🆔 ID Falso para evitar "God Mode" (id:1)
            nombre: `[SIM] ${rolHumano}`,
            role: roleId,   // ID real del sistema (ej: ROL_DUENO)
            roleId: roleId, // Importante para useRBAC
            tipo: roleId === 'ROL_DUENO' ? 'ADMIN' : 'EMPLEADO',
            isSimulated: true
        };

        if (storeRef.current.actualizarSesionLocal) {
            storeRef.current.actualizarSesionLocal(usuarioSimulado);
        }
        addLog(`👤 Identidad cambiada a: ${rolHumano}`, 'info');
    };

    // ---------------------------------------------------------
    // ⚔️ ESCENARIO 1: ATAQUE DE CONCURRENCIA (Stress Test)
    // ---------------------------------------------------------
    const ataqueConcurrencia = async (tasa, dia) => {
        const productos = storeRef.current.productos;
        let victima = productos.find(p => parseFloat(p.stock) > 0) || productos[0];

        if (!victima) return { usd: 0, bs: 0, venta: 0 };

        // Auto-Recarga de Munición
        if (parseFloat(victima.stock) < 50) {
            try { if (storeRef.current.actualizarProducto) await storeRef.current.actualizarProducto(victima.id, { stock: 1000 }); } catch (e) { }
        }

        addLog(`⚔️ RÁFAGA CONCURRENTE`, 'warning', `Objetivo: ${victima.nombre}`);

        const intentos = Array(15).fill(null).map(async (_, i) => {
            const idTransaccion = `RACE-D${dia}-${i}`;
            await delay(randomInt(1, 10));
            try {
                const promesaVenta = storeRef.current.registrarVenta({
                    items: [{ ...victima, cantidad: 1, unidadVenta: 'unidad', precio: victima.precio }],
                    total: victima.precio, subtotal: victima.precio, totalBS: victima.precio * tasa, tasa,
                    metodos: [{ metodo: 'Efectivo Divisa', monto: victima.precio, montoBS: 0, tipo: 'DIVISA' }],
                    cambio: 0, distribucionVuelto: { usd: 0, bs: 0 }, esCredito: false, clienteId: null,
                    _debugId: idTransaccion
                });
                await promesaVenta;
                return { success: true, valor: victima.precio };
            } catch (e) { return { success: false }; }
        });

        const resultados = await Promise.all(intentos);
        const exitos = resultados.filter(r => r.success);

        // Esperamos a que React termine de procesar el lote
        await delay(500);

        const dineroGenerado = exitos.reduce((acc, curr) => acc + curr.valor, 0);
        addLog(`   ✅ Ventas Procesadas: ${exitos.length}`, 'dim');

        return { usd: dineroGenerado, bs: 0, venta: dineroGenerado };
    };

    // ---------------------------------------------------------
    // 💸 ESCENARIO 2: PAGO MIXTO (Auditando Dashboard y Tasa)
    // ---------------------------------------------------------
    const eventoPagoMixto = async (tasa) => {
        const productos = storeRef.current.productos;
        const prod = productos[randomInt(0, productos.length - 1)];
        const precio = parseFloat(prod.precio) || 10;

        // Dividimos el pago: 50% USD, 50% Bs
        const pagoUSD = fixFloat(precio / 2);
        const pagoBsEnDolares = fixFloat(precio - pagoUSD);
        const pagoBsFisico = fixFloat(pagoBsEnDolares * tasa);

        addLog(`💱 VENTA MIXTA (USD + Bs)`, 'info', `Total: $${precio} ($${pagoUSD} + Bs ${pagoBsFisico})`);

        try {
            await storeRef.current.registrarVenta({
                items: [{ ...prod, cantidad: 1, unidadVenta: 'unidad', precio: precio }],
                total: precio, subtotal: precio, totalBS: precio * tasa, tasa,
                metodos: [
                    { metodo: 'Efectivo Divisa', monto: pagoUSD, montoBS: 0, tipo: 'DIVISA' },
                    { metodo: 'Punto de Venta', monto: pagoBsEnDolares, montoBS: pagoBsFisico, tipo: 'BS' }
                ],
                cambio: 0, distribucionVuelto: { usd: 0, bs: 0 }, esCredito: false, clienteId: null
            });
            return { usd: pagoUSD, bs: pagoBsFisico, venta: precio };
        } catch (e) {
            addLog(`❌ Fallo Mixto: ${e.message}`, 'error');
            return { usd: 0, bs: 0, venta: 0 };
        }
    };

    // ---------------------------------------------------------
    // 🔄 ESCENARIO 3: VUELTO COMPLEJO (Auditando Caja Chica)
    // ---------------------------------------------------------
    const eventoVueltoComplejo = async (tasa) => {
        const productos = storeRef.current.productos;
        const prod = productos[randomInt(0, productos.length - 1)];
        const precio = parseFloat(prod.precio) || 5;

        // Paga con billete grande ($20), quiere vuelto en Bs
        const billete = 20;
        if (precio >= billete) return { usd: 0, bs: 0, venta: 0 }; // Skip si es muy caro

        const cambioUSD = billete - precio;
        const cambioBS = fixFloat(cambioUSD * tasa);

        addLog(`🔄 VUELTO EN BOLÍVARES`, 'info', `Venta: $${precio} | Pagó: $${billete} | Vuelto: Bs ${cambioBS}`);

        try {
            await storeRef.current.registrarVenta({
                items: [{ ...prod, cantidad: 1, unidadVenta: 'unidad', precio: precio }],
                total: precio, subtotal: precio, totalBS: precio * tasa, tasa,
                metodos: [{ metodo: 'Efectivo Divisa', monto: billete, montoBS: 0, tipo: 'DIVISA' }],
                cambio: cambioUSD,
                distribucionVuelto: { usd: 0, bs: cambioBS }, // Todo el vuelto en Bs
                esCredito: false, clienteId: null
            });

            // Ledger: Entró $20 USD, Salió X Bs. La venta neta es el precio.
            // Pero en CAJA FÍSICA: Entró $20 (billete), Salió Bs (vuelto).
            return { usd: billete, bs: -cambioBS, venta: precio };
        } catch (e) {
            addLog(`❌ Fallo Vuelto: ${e.message}`, 'error');
            return { usd: 0, bs: 0, venta: 0 };
        }
    };

    // ---------------------------------------------------------
    // 🎭 ESCENARIO 4: CLIENTE TÓXICO (Auditando Seguridad)
    // ---------------------------------------------------------
    const ataqueClienteToxico = async (tasa) => {
        const productos = storeRef.current.productos;
        const prod = productos[randomInt(0, productos.length - 1)];
        const precio = parseFloat(prod.precio) || 1;
        const cantidad = randomInt(2, 5);
        const total = precio * cantidad;

        addLog(`🎭 CLIENTE TÓXICO`, 'warning', `Compra y anula $${total}`);

        let ventaId = null;
        try {
            await storeRef.current.registrarVenta({
                items: [{ ...prod, cantidad, unidadVenta: 'unidad', precio: total }],
                total, subtotal: total, totalBS: total * tasa, tasa,
                metodos: [{ metodo: 'Efectivo Divisa', monto: total, montoBS: 0, tipo: 'DIVISA' }],
                cambio: 0, distribucionVuelto: { usd: 0, bs: 0 }, esCredito: false, clienteId: null
            });
            await delay(50);
            const ventas = storeRef.current.ventas;
            ventaId = ventas[0]?.id;
        } catch (e) { return { usd: 0, bs: 0, venta: 0 }; }

        await delay(100);

        if (ventaId) {
            const pinReal = storeRef.current.configuracion?.pinAdmin || "123456";
            try {
                if (storeRef.current.anularVenta) {
                    await storeRef.current.anularVenta(ventaId, pinReal);
                    addLog(`   ✅ Anulación Exitosa (Saldo revertido)`, 'dim');
                    return { usd: 0, bs: 0, venta: 0 }; // Efecto neutro
                }
            } catch (e) {
                addLog(`❌ Fallo anulando: ${e.message}`, 'error');
                return { usd: total, bs: 0, venta: total }; // Se quedó con el dinero por error
            }
        }
        return { usd: 0, bs: 0, venta: 0 };
    };
    const testRBAC = async () => {
        const productos = storeRef.current.productos;
        const victima = productos[0]; // Usamos el primer producto para pruebas de update
        let score = 0;

        addLog(`🛡️ INICIANDO AUDITORÍA RBAC COMPLETA (Fase 6)`, 'header');

        // --- SUITE 1: GESTIÓN DE CATEGORÍAS ---
        addLog(`   🔹 TEST 1: Gestión de Categorías`, 'info');

        // 1.1 Cajero intenta CREAR (Debe fallar)
        cambiarIdentidad('Cajero');
        await delay(150);
        try {
            if (storeRef.current.crearCategoria) {
                await storeRef.current.crearCategoria("HACK_CAT");
                addLog(`      ❌ [FALLO] Cajero LOGRÓ crear categoría`, 'error-bold');
                score -= 10;
            }
        } catch (e) {
            addLog(`      ✅ Cajero bloqueado (Crear Cat): ${e.message}`, 'success');
            score += 1;
        }

        // 1.2 Encargado intenta CREAR (Debe poder)
        cambiarIdentidad('Encargado');
        await delay(150);
        try {
            if (storeRef.current.crearCategoria) {
                await storeRef.current.crearCategoria("CAT_LEGAL");
                addLog(`      ✅ Encargado creó categoría exitosamente`, 'success');
                score += 1;
            }
        } catch (e) {
            addLog(`      ⚠️ [ADVERTENCIA] Encargado bloqueado (Crear Cat): ${e.message}`, 'warning');
        }

        // --- SUITE 2: MODIFICACIÓN DE PRODUCTOS ---
        addLog(`   🔹 TEST 2: Modificación de Productos`, 'info');

        // 2.1 Cajero intenta CAMBIAR PRECIO (Debe fallar)
        cambiarIdentidad('Cajero');
        await delay(150);
        try {
            if (storeRef.current.actualizarProducto && victima) {
                await storeRef.current.actualizarProducto(victima.id, { precio: 0.01 });
                addLog(`      ❌ [FALLO] Cajero LOGRÓ cambiar precio`, 'error-bold');
                score -= 10;
            }
        } catch (e) {
            addLog(`      ✅ Cajero bloqueado (Update): ${e.message}`, 'success');
            score += 1;
        }

        // 2.2 Encargado intenta CAMBIAR PRECIO (Debe poder)
        cambiarIdentidad('Encargado');
        await delay(150);
        try {
            if (storeRef.current.actualizarProducto && victima) {
                await storeRef.current.actualizarProducto(victima.id, { precio: victima.precio }); // Mismo precio para no romper nada
                addLog(`      ✅ Encargado autorizado para Update`, 'success');
                score += 1;
            }
        } catch (e) {
            addLog(`      ⚠️ [ADVERTENCIA] Encargado bloqueado (Update): ${e.message}`, 'warning');
        }

        // --- SUITE 3: ELIMINACIÓN Y DESTRUCCIÓN ---
        addLog(`   🔹 TEST 3: Zona de Peligro (Eliminar/Reset)`, 'info');

        // 3.1 Cajero intenta ELIMINAR CATEGORÍA (Debe fallar)
        cambiarIdentidad('Cajero');
        await delay(150);
        try {
            if (storeRef.current.eliminarCategoria) {
                await storeRef.current.eliminarCategoria("General"); // Intento de sabotaje real
                addLog(`      ❌ [FALLO] Cajero LOGRÓ eliminar categoría`, 'error-bold');
                score -= 10;
            }
        } catch (e) {
            addLog(`      ✅ Cajero bloqueado (Del Cat): ${e.message}`, 'success');
            score += 1;
        }

        // 3.2 Encargado intenta VACIAR BD (Debe fallar)
        cambiarIdentidad('Encargado');
        await delay(150);
        try {
            if (storeRef.current.vaciarInventarioCompleto) {
                await storeRef.current.vaciarInventarioCompleto();
                addLog(`      ❌ [FALLO CRÍTICO] Encargado VACIÓ la base de datos`, 'error-bold');
                return { score: -100 };
            }
        } catch (e) {
            addLog(`      ✅ Encargado bloqueado (Reset DB): ${e.message}`, 'success');
            score += 1;
        }

        // Evaluación Final del Día
        if (score >= 4) {
            addLog(`   🛡️ NIVEL DE SEGURIDAD: IMPENETRABLE (${score}/6 Checks)`, 'success-bold');
        } else {
            addLog(`   🛡️ NIVEL DE SEGURIDAD: VULNERABLE (${score}/6 Checks)`, 'error-bold');
        }

        return { score };
    };

    /**
     * 🌌 MODO: QUANTUM V10 (OMNI-TEST)
     */
    const ejecutarQuantumMode = async () => {
        if (isRunning) return;
        setIsRunning(true);
        setMode('QUANTUM');
        setLogs([]);
        abortRef.current = false;

        addLog("⚛️ MOTOR QUANTUM V10 (OMNI-TEST_SECURE)", "header");
        addLog("📋 Objetivo: Auditoría Integral (POS + Financiera + Seguridad).", "dim");

        // Fase 0: Limpieza Inicial (Como Dueño)
        cambiarIdentidad('Dueño');
        await delay(500);
        limpiarDatosSeguro();
        await delay(1000);

        // 🌱 SEMILLA INICIAL: Crear productos si está vacío
        // Nota: Al usar LiveQuery, la referencia productos se actualiza asíncronamente.
        // Forzamos inserción directa en tienda.
        try {
            addLog("🌱 SIEMBRA DE DATOS: Creando inventario inicial...", 'dim');
            const productosBase = [
                { nombre: 'Harina Pan', precio: 1.50, stock: 1000, codigo: '001', categoria: 'Víveres' },
                { nombre: 'Coca Cola 2L', precio: 2.50, stock: 500, codigo: '002', categoria: 'Bebidas' },
                { nombre: 'Jabón Ace', precio: 3.00, stock: 200, codigo: '003', categoria: 'Limpieza' }
            ];

            for (const p of productosBase) {
                if (storeRef.current.agregarProducto) {
                    await storeRef.current.agregarProducto(p);
                }
            }
            await delay(1000); // Esperar que Dexie actualice
        } catch (e) { console.error("Error sembrando", e); }

        let dia = 1;

        try {
            while (!abortRef.current) {
                const nuevaTasa = randomFloat(40, 60);
                addLog(`=== 📅 DÍA ${dia} | TASA: Bs ${nuevaTasa} ===`, 'day-header');

                // 1. APERTURA (Gerente/Encargado)
                cambiarIdentidad('Encargado');
                const configActual = storeRef.current.configuracion || {};
                if (storeRef.current.guardarConfiguracion) {
                    storeRef.current.guardarConfiguracion({ ...configActual, tasa: nuevaTasa });
                }

                // 🧹 Limpieza (Ya manejada globalmente si se requiere, o invocada via función)
                // const limpiarDatosSeguro = ... eliminado para usar versión global

                const aperturaUSD = randomInt(50, 100);
                try { storeRef.current.abrirCajaPOS(aperturaUSD); } catch (e) { }

                let shadow = { fisicoUSD: aperturaUSD, fisicoBS: 0, ventaNeta: 0 };
                addLog(`🔓 Apertura: $${aperturaUSD}`, 'info');
                await delay(500);

                // 2. CICLO OPERATIVO CAJERO
                cambiarIdentidad('Cajero');
                const ciclos = 6;

                for (let i = 0; i < ciclos; i++) {
                    if (abortRef.current) break;

                    const dado = Math.random();
                    let resultado = { usd: 0, bs: 0, venta: 0 };

                    if (dado < 0.20) {
                        resultado = await ataqueConcurrencia(nuevaTasa, dia);
                    } else if (dado < 0.40) {
                        resultado = await eventoPagoMixto(nuevaTasa);
                    } else if (dado < 0.60) {
                        resultado = await eventoVueltoComplejo(nuevaTasa);
                    } else if (dado < 0.70) {
                        resultado = await ataqueClienteToxico(nuevaTasa);
                    } else {
                        // Venta Simple
                        const prod = storeRef.current.productos[0];
                        if (prod) {
                            const precio = parseFloat(prod.precio);
                            try {
                                await storeRef.current.registrarVenta({
                                    items: [{ ...prod, cantidad: 1, precio }],
                                    total: precio, subtotal: precio, totalBS: precio * nuevaTasa, tasa: nuevaTasa,
                                    metodos: [{ metodo: 'Efectivo Divisa', monto: precio, montoBS: 0, tipo: 'DIVISA' }],
                                    cambio: 0, distribucionVuelto: { usd: 0, bs: 0 }, esCredito: false, clienteId: null
                                });
                                resultado = { usd: precio, bs: 0, venta: precio };
                                addLog(`🛒 Venta Simple: $${precio}`, 'dim');
                            } catch (e) { }
                        }
                    }

                    shadow.fisicoUSD += resultado.usd;
                    shadow.fisicoBS += resultado.bs;
                    shadow.ventaNeta += resultado.venta;
                    await delay(100);
                }

                // 3. AUDITORÍA DE SEGURIDAD (RBAC)
                // Ejecutamos al final del día operativo antes del cierre
                await testRBAC();

                // 4. CIERRE
                await delay(500);
                cambiarIdentidad('Encargado');

                const corte = storeRef.current.cerrarCaja ? storeRef.current.cerrarCaja() : {};

                const sistemaFisicoUSD = corte.tesoreriaDetallada?.usd?.total || 0;
                const sistemaFisicoBS = corte.tesoreriaDetallada?.bs?.total || 0;
                const sistemaVentaNeta = corte.totalVentas || 0;

                const diffUSD = Math.abs(sistemaFisicoUSD - shadow.fisicoUSD);
                const diffBS = Math.abs(sistemaFisicoBS - shadow.fisicoBS);
                const diffVenta = Math.abs(sistemaVentaNeta - shadow.ventaNeta);

                const esPerfecto = diffUSD < 0.1 && diffBS < 1 && diffVenta < 0.1;

                if (esPerfecto) {
                    addLog(`✨ DÍA ${dia} CUADRADO PERFECTO.`, 'success-bold');
                } else {
                    addLog(`💀 ERROR EN CIERRE:`, 'error-bold');
                    if (diffVenta >= 0.1) addLog(`   📉 Ventas: Sistema $${fixFloat(sistemaVentaNeta)} vs Real $${fixFloat(shadow.ventaNeta)}`, 'error');
                    if (diffUSD >= 0.1) addLog(`   📉 Caja USD: Sistema $${fixFloat(sistemaFisicoUSD)} vs Real $${fixFloat(shadow.fisicoUSD)}`, 'error');
                    if (diffBS >= 1) addLog(`   📉 Caja Bs: Sistema Bs ${fixFloat(sistemaFisicoBS)} vs Real Bs ${fixFloat(shadow.fisicoBS)}`, 'error');
                }

                addLog('---------------------------------------', 'dim');
                dia++;
                await delay(1500);
            }

        } catch (e) {
            addLog(`💥 ERROR CRÍTICO: ${e.message}`, 'error-bold');
        } finally {
            setIsRunning(false);
            setMode('IDLE');
        }
    };

    const detenerSimulacion = () => {
        abortRef.current = true;
        addLog("✋ DETENIENDO...", 'warning');
    };

    // ---------------------------------------------------------
    // 🏃 MARATHON MODE: Simulador de Flujo Financiero (7 Días)
    // ---------------------------------------------------------
    const ejecutarMarathonMode = async () => {
        if (isRunning) return;
        setIsRunning(true);
        setMode('MARATHON');
        setLogs([]);
        abortRef.current = false;

        addLog("🏃 INICIANDO MARATÓN FINANCIERA (7 Virtual-Days)", "header");
        addLog("📋 Objetivo: Validar Ciclos de Caja (Apertura -> Venta -> Cierre -> Reapertura)", "dim");

        cambiarIdentidad('Dueño');
        await delay(500);
        limpiarDatosSeguro();
        await delay(1000);

        // Sembrar
        try {
            const productosBase = [
                { nombre: 'Harina Pan', precio: 1.50, stock: 9999, codigo: '001', categoria: 'Víveres' },
                { nombre: 'Coca Cola 2L', precio: 2.50, stock: 9999, codigo: '002', categoria: 'Bebidas' },
                { nombre: 'Queso', precio: 5.00, stock: 999, codigo: '004', categoria: 'Charcutería' }
            ];
            for (const p of productosBase) {
                if (storeRef.current.agregarProducto) await storeRef.current.agregarProducto(p);
            }
            await delay(1000);
        } catch (e) { }

        let saldoCajaActual = 100; // Capital Inicial
        let dias = 7;

        try {
            for (let d = 1; d <= dias; d++) {
                if (abortRef.current) break;
                const tasa = randomFloat(40 + d, 40 + d + 2); // Inflación simulada diaria
                addLog(`📅 DÍA ${d} | TASA: Bs ${tasa}`, 'day-header');

                // --- TURNO MAÑANA ---
                addLog(`   ☀️ Turno Mañana: Abriendo con $${fixFloat(saldoCajaActual)}`, 'info');

                cambiarIdentidad('Encargado');
                await delay(200);
                if (storeRef.current.guardarConfiguracion) storeRef.current.guardarConfiguracion({ ...storeRef.current.configuracion, tasa });

                try { storeRef.current.abrirCajaPOS(saldoCajaActual); } catch (e) {
                    addLog(`   ❌ Error Apertura: ${e.message}`, 'error');
                }

                // Operaciones Mañana
                cambiarIdentidad('Cajero');
                let shadowMañana = { usd: saldoCajaActual, bs: 0, explicacion: `Apertura: $${fixFloat(saldoCajaActual)}` };

                for (let i = 0; i < 10; i++) {
                    const res = await eventoPagoMixto(tasa);
                    shadowMañana.usd += res.usd;
                    shadowMañana.bs += res.bs;
                    if (res.venta > 0) shadowMañana.explicacion += ` | +$${res.usd.toFixed(2)} (Mix)`;
                    await delay(100);
                }

                addLog(`   📊 SHADOW MAÑANA: Calc=$${fixFloat(shadowMañana.usd)}`, 'dim');

                // Cierre Turno Mañana
                cambiarIdentidad('Encargado');
                await delay(500);
                const corteManana = await storeRef.current.cerrarCaja();

                // Inspección Forense
                const sistManana = corteManana.tesoreriaDetallada.usd.total;
                addLog(`   🕵️ FORENSE: Sist=$${fixFloat(sistManana)} vs Real=$${fixFloat(shadowMañana.usd)}`, 'dim');

                // Validar Mañana
                const diffM = Math.abs(sistManana - shadowMañana.usd);
                if (diffM < 0.1) {
                    addLog(`   ✅ Cierre Mañana Cuadrado: $${fixFloat(sistManana)}`, 'success');
                } else {
                    addLog(`   ❌ DESCUADRE MAÑANA DETECTADO`, 'error-bold');
                    addLog(`      Expectativa: ${shadowMañana.explicacion}`, 'error');
                    addLog(`      Sistema Reporta: $${fixFloat(sistManana)}`, 'error');
                    addLog(`      Diferencia: $${fixFloat(diffM)}`, 'error');
                }

                saldoCajaActual = sistManana; // Rollover para la tarde
                await delay(1000);

                // --- TURNO TARDE ---
                addLog(`   🌙 Turno Tarde: Abriendo con $${fixFloat(saldoCajaActual)}`, 'info');
                try { storeRef.current.abrirCajaPOS(saldoCajaActual); } catch (e) { }

                cambiarIdentidad('Cajero');
                let shadowTarde = { usd: saldoCajaActual, bs: 0, explicacion: `Apertura: $${fixFloat(saldoCajaActual)}` };

                for (let i = 0; i < 10; i++) {
                    const res = await eventoVueltoComplejo(tasa);
                    shadowTarde.usd += res.usd;
                    shadowTarde.bs += res.bs; // bs será negativo porque sale vuelto
                    if (res.venta > 0) shadowTarde.explicacion += ` | +$${res.usd.toFixed(2)} (In) - Bs${Math.abs(res.bs).toFixed(2)} (Out)`;
                    await delay(100);
                }

                // RBAC Check Nocturno
                addLog(`   👮 Ronda Nocturna de Seguridad`, 'dim');
                const scoreRBAC = await testRBAC();
                if (scoreRBAC.score < 1) addLog(`   ❌ FALLO SEGURIDAD NOCTURNA`, 'error-bold');

                // Cierre Final del Día
                cambiarIdentidad('Encargado');
                await delay(500);
                const corteTarde = await storeRef.current.cerrarCaja();

                const sistTarde = corteTarde.tesoreriaDetallada.usd.total;
                const diffT = Math.abs(sistTarde - shadowTarde.usd);

                if (diffT < 0.1) {
                    addLog(`   ✅ Cierre Día ${d} Exitoso. Saldo Final: $${fixFloat(sistTarde)}`, 'success-bold');
                } else {
                    addLog(`   💀 ERROR CRÍTICO CIERRE DÍA ${d}`, 'error-bold');
                    addLog(`      Expectativa: ${shadowTarde.explicacion}`, 'error');
                    addLog(`      Sistema: $${fixFloat(sistTarde)}`, 'error');
                }

                saldoCajaActual = sistTarde; // Rollover para mañana
                addLog('---------------------------------------', 'dim');
                await delay(1000);
            }
            addLog("🏁 MARATÓN FINALIZADA", 'success-bold');

        } catch (e) {
            addLog(`💥 CRASH: ${e.message}`, 'error-bold');
        } finally {
            setIsRunning(false);
            setMode('IDLE');
        }
    };

    const ejecutarSimulacion = async () => { };
    const ejecutarUltimateMode = async () => { };

    return { ejecutarQuantumMode, ejecutarMarathonMode, ejecutarUltimateMode, ejecutarSimulacion, detenerSimulacion, logs, isRunning, mode };
};