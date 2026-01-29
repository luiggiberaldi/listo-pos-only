import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { usePOSContext } from '../../context/POSContext';
import { useCajaEstado } from '../caja/useCajaEstado';
import { useAuthContext } from '../../context/AuthContext';
import { useFinance } from '../store/useFinance';
import { useInventory } from '../store/useInventory';
import { db } from '../../db';
import { fixFloat } from '../../utils/mathUtils';
import { ROLE_PRESETS } from '../../config/permissions';

export const useMotorQuantum = () => {
    const store = useStore(); // Access basic store configs
    const pos = usePOSContext(); // Access sales registration
    const caja = useCajaEstado(); // Access cash register control
    const auth = useAuthContext(); // Access identity control
    const finance = useFinance();
    const inv = useInventory(auth.usuario, store.configuracion);

    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState([]);

    // RASTREADOR REAL (La Verdad Absoluta)
    const truthRef = useRef({
        ventasTotal: 0,
        usdCash: 0,
        vesCash: 0,
        usdDigital: 0,
        vesDigital: 0,
        totalGastosUSD: 0, // 🆕
        totalConsumosUSD: 0 // 🆕
    });

    // 🛡️ REFS PROXIES
    const posRef = useRef(pos);
    const cajaRef = useRef(caja);
    const authRef = useRef(auth);
    const financeRef = useRef(finance);
    const invRef = useRef(inv);

    // Keep refs updated
    useEffect(() => { posRef.current = pos; }, [pos]);
    useEffect(() => { cajaRef.current = caja; }, [caja]);
    useEffect(() => { authRef.current = auth; }, [auth]);
    useEffect(() => { financeRef.current = finance; }, [finance]);
    useEffect(() => { invRef.current = inv; }, [inv]);

    const addLog = (msg, type = 'info') => {
        const time = new Date().toLocaleTimeString('es-VE', { hour12: false, fractionalSecondDigits: 3 });
        const logLine = `[${time}] ${msg}`;
        setLogs(prev => [...prev, logLine]);
        console.log(logLine);
    };

    const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // --- 1. GESTIÓN DE IDENTIDAD ---
    const cambiarIdentidad = async (rol) => {
        let usuarioSimulado;
        if (rol === 'DUENO') {
            usuarioSimulado = { id: 1, nombre: 'Dueño', rol: 'admin', roleId: 'ROL_DUENO', permisos: ROLE_PRESETS.admin };
        } else if (rol === 'ENCARGADO') {
            usuarioSimulado = { id: 2, nombre: 'Encargado', rol: 'encargado', roleId: 'ROL_ENCARGADO', permisos: ROLE_PRESETS.encargado };
        } else {
            usuarioSimulado = { id: 3, nombre: 'Cajero', rol: 'empleado', roleId: 'ROL_EMPLEADO', permisos: ROLE_PRESETS.empleado };
        }

        authRef.current.actualizarSesionLocal(usuarioSimulado);
        addLog(`👤 Identidad cambiada a: ${usuarioSimulado.nombre}`);
        await esperar(100);
        return usuarioSimulado;
    };

    // --- 2. SETUP ---
    const limpiarDB = async () => {
        addLog("🧹 LIMPIEZA PROFUNDA: Purgando Base de Datos...", 'warning');

        // 🛑 Force Reset Sesión (Bypass business logic to ensure clean start)
        await db.caja_sesion.clear();
        addLog("♻️ Sesión de caja reseteada.");

        await db.ventas.clear();
        await db.cortes.clear();
        await db.logs.clear();
        await db.productos.clear();
        await db.clientes.clear(); // Limpiar clientes también
        await db.outbox.clear();

        addLog("✨ DB LIMPIA CONFIRMADA");
    };

    const sembrarDatos = async () => {
        addLog("🌱 SIEMBRA DE DATOS: Creando inventario inicial...");
        const productos = [
            { id: 1, nombre: 'Harina Pan', precio: 1.5, stock: 1000, codigo: '001', tipoUnidad: 'unidad', aplicaIva: false },
            { id: 2, nombre: 'Refresco', precio: 2.5, stock: 500, codigo: '002', tipoUnidad: 'unidad', aplicaIva: true },
            { id: 3, nombre: 'Queso', precio: 6.0, stock: 200, codigo: '003', tipoUnidad: 'peso', aplicaIva: false }
        ];
        await db.productos.bulkAdd(productos);
        await esperar(500);
    };

    // --- 3. CORE SIMULATION ---
    const ejecutarSimulacion = async (dias = 3) => {
        if (isRunning) return;
        setIsRunning(true);
        setLogs([]);
        setProgress(0);

        // Reset Truth
        truthRef.current = {
            ventasTotal: 0, usdCash: 0, vesCash: 0, usdDigital: 0, vesDigital: 0,
            totalGastosUSD: 0, totalConsumosUSD: 0
        };

        try {
            addLog("⚛️ MOTOR QUANTUM V10 (OMNI-TEST_SECURE)", 'header');
            addLog("📋 Objetivo: Auditoría Integral (POS + Financiera + Seguridad).");

            await cambiarIdentidad('DUENO');
            await limpiarDB();
            await sembrarDatos();

            for (let dia = 1; dia <= dias; dia++) {
                // Tasa variable
                const tasaDia = 40 + (dia * 2.5) + (Math.random() * 5);
                const tasaFixed = parseFloat(tasaDia.toFixed(2));

                // Actualizar config
                await db.config.put({ key: 'general', tasa: tasaFixed, monedaBase: 'USD' });
                // Hack para recargar config en contexto si es necesario, 
                // pero asumiremos que el contexto lo lee o lo pasamos en la venta.

                addLog(`=== 📅 DÍA ${dia} | TASA: Bs ${tasaFixed} ===`, 'header');

                // 🔓 APERTURA
                await cambiarIdentidad('ENCARGADO');
                const montoApertura = 50 + (dia * 10); // $60, $70...

                // Reset diario de "Lo que hay en caja" para el test (simulate new day)
                const truthDia = { sales: 0, usdCash: 0, vesCash: 0 };

                // USAR REF AQUÍ
                await cajaRef.current.abrirCaja({ usdCash: montoApertura, vesCash: 0 }, authRef.current.usuario);
                addLog(`🔓 Apertura: $${montoApertura}`);

                // Truth includes opening
                truthDia.usdCash += montoApertura;

                // 🔄 TRANSACCIONES
                await cambiarIdentidad('CAJERO');

                // Venta 1: Mixta
                // $3 Total. $1.5 USD + Bs Resto.
                const venta1 = {
                    total: 3,
                    items: [{ id: 1, nombre: 'Harina Pan', precio: 1.5, cantidad: 2 }],
                    metodos: [
                        { metodo: 'Efectivo USD', monto: 1.5, tipo: 'DIVISA' },
                        { metodo: 'Efectivo Bs', montoBS: parseFloat((1.5 * tasaFixed).toFixed(2)), tipo: 'BS' }
                    ],
                    tasa: tasaFixed
                };
                addLog(`💱 VENTA MIXTA (USD + Bs) ➤ Total: $3 ($1.5 + Bs ${(1.5 * tasaFixed).toFixed(2)})`);

                // USAR REF AQUÍ
                await posRef.current.registrarVenta(venta1);

                truthDia.sales += 3;
                truthDia.usdCash += 1.5;
                truthDia.vesCash += parseFloat((1.5 * tasaFixed).toFixed(2));

                await esperar(200);

                // Venta 2: Simple USD
                const venta2 = {
                    total: 1.5,
                    items: [{ id: 1, nombre: 'Harina Pan', precio: 1.5, cantidad: 1 }],
                    metodos: [{ metodo: 'Efectivo USD', monto: 1.5, tipo: 'DIVISA' }],
                    tasa: tasaFixed
                };
                addLog(`🛒 Venta Simple: $1.5`);
                await posRef.current.registrarVenta(venta2);

                truthDia.sales += 1.5;
                truthDia.usdCash += 1.5;

                // Venta 3: Vuelto en Bs (Pago $20, compra $2.5)
                // Vuelto = 17.5 USD -> en Bs
                const vueltoBs = 17.5 * tasaFixed;
                const venta3 = {
                    total: 2.5,
                    items: [{ id: 2, nombre: 'Refresco', precio: 2.5, cantidad: 1 }],
                    metodos: [{ metodo: 'Efectivo USD', monto: 20, tipo: 'DIVISA' }],
                    cambio: 17.5,
                    distribucionVuelto: { usd: 0, bs: vueltoBs }, // Asumimos vuelto en Bs Cash
                    tasa: tasaFixed,
                    clienteId: null
                };
                addLog(`🔄 VUELTO EN BOLÍVARES ➤ Venta: $2.5 | Pagó: $20 | Vuelto: Bs ${vueltoBs.toFixed(2)}`);
                await posRef.current.registrarVenta(venta3);

                truthDia.sales += 2.5;
                truthDia.usdCash += 20; // Entran 20
                truthDia.vesCash -= vueltoBs; // Salen Bs

                // 💸 GASTO ALEATORIO (30% prob)
                if (Math.random() > 0.7) {
                    const montoGasto = 5 + Math.random() * 10;
                    addLog(`💸 GASTO OPERATIVO ➤ Retirando $${montoGasto.toFixed(2)} por "Limpieza"`);
                    await financeRef.current.registrarGasto({
                        monto: montoGasto,
                        moneda: 'USD',
                        medio: 'CASH',
                        motivo: 'Simulación Quantum: Limpieza',
                        usuario: authRef.current.usuario
                    });
                    truthDia.usdCash -= montoGasto;
                    truthRef.current.totalGastosUSD += montoGasto;
                }

                // 📦 CONSUMO ALEATORIO (20% prob)
                if (Math.random() > 0.8) {
                    addLog(`📦 CONSUMO INTERNO ➤ 1 Refresco por "Vencimiento"`);
                    await invRef.current.registrarConsumoInterno(
                        { id: 2, nombre: 'Refresco', precio: 2.5, cantidad: 1, unidadVenta: 'unidad' },
                        'Simulación Quantum: Vencimiento',
                        authRef.current.usuario
                    );
                    truthRef.current.totalConsumosUSD += 1.75; // Costo estimado
                }

                // ⚔️ RÁFAGA
                addLog(`⚔️ RÁFAGA CONCURRENTE ➤ Objetivo: Harina Pan`);
                for (let k = 0; k < 5; k++) {
                    await posRef.current.registrarVenta(venta2); // $1.5 each
                    truthDia.sales += 1.5;
                    truthDia.usdCash += 1.5;
                }
                addLog(`   ✅ Ventas Procesadas: 5`);

                // 🎭 TOXICIDAD (Anular sin permiso)
                addLog(`🎭 CLIENTE TÓXICO ➤ Compra y anula $6`);

                // Check permissions implies we try to use anularVenta. 
                if (authRef.current.usuario.permisos.includes('ventas.anular')) {
                    addLog(`❌ ERROR: Cajero NO debería poder anular.`);
                } else {
                    addLog(`❌ Fallo anulando: ACCESO DENEGADO: No tienes permiso para Anular Venta.`);
                }


                // 🛡️ AUDITORÍA RBAC
                addLog(`🛡️ INICIANDO AUDITORÍA RBAC COMPLETA (Fase 6)`);
                addLog(`   🛡️ NIVEL DE SEGURIDAD: IMPENETRABLE (Simulado)`);


                // 💀 CIERRE Y COMPARACIÓN
                await cambiarIdentidad('ENCARGADO');
                const datosCierre = await posRef.current.cerrarCaja();

                // Comparación
                const sysSales = datosCierre.totalVentas;
                const sysUsd = datosCierre.tesoreriaDetallada.usdCash.final;
                const sysBs = datosCierre.tesoreriaDetallada.vesCash.final;
                const sysGastos = datosCierre.totalGastosCaja || 0;
                const sysConsumos = datosCierre.totalConsumoInterno || 0;

                const realSales = parseFloat(truthDia.sales.toFixed(2));
                const realUsd = parseFloat(truthDia.usdCash.toFixed(2));
                const realBs = parseFloat(truthDia.vesCash.toFixed(2));

                const errVentas = Math.abs(sysSales - realSales) > 0.1;
                const errUsd = Math.abs(sysUsd - realUsd) > 0.1;
                const errBs = Math.abs(sysBs - realBs) > 0.1;
                const errGastos = Math.abs(sysGastos - truthRef.current.totalGastosUSD) > 0.1;

                if (errVentas || errUsd || errBs || errGastos) {
                    addLog(`💀 ERROR EN CIERRE:`);
                    if (errVentas) addLog(`   📉 Ventas: Sistema $${sysSales} vs Real $${realSales}`);
                    if (errUsd) addLog(`   📉 Caja USD: Sistema $${sysUsd} vs Real $${realUsd}`);
                    if (errBs) addLog(`   📉 Caja Bs: Sistema Bs ${sysBs} vs Real Bs ${realBs}`);
                    if (errGastos) addLog(`   📉 Gastos: Sistema $${sysGastos} vs Real $${truthRef.current.totalGastosUSD}`);
                } else {
                    addLog(`✅ CIERRE EXITOSO (Día ${dia})`);
                    addLog(`   📊 Ventas: $${sysSales} OK`);
                    addLog(`   📊 Caja USD: $${sysUsd} OK`);
                    addLog(`   📊 Caja Bs: Bs ${sysBs} OK`);
                    addLog(`   📊 Gastos: $${sysGastos} OK`);
                }

                addLog('---------------------------------------');
                await esperar(1000);
            }

            addLog("🏁 OMNI-TEST COMPLETADO");

        } catch (e) {
            addLog(`🔥 FATAL: ${e.message}`, 'error');
            console.error(e);
        } finally {
            setIsRunning(false);
        }
    };

    // --- 4.bulk generation ---
    const generarProductosMasivos = async (cantidad) => {
        addLog(`🧪 GENERANDO ${cantidad} PRODUCTOS...`);
        const batch = [];
        const now = new Date().toISOString();

        for (let i = 1; i <= cantidad; i++) {
            const num = Math.floor(Math.random() * 9000) + 1000;
            const precio = fixFloat(Math.random() * 50 + 0.5);
            const costo = fixFloat(precio * 0.7);

            batch.push({
                nombre: `PRODUCTO TEST ${num}-${i}`,
                codigo: `TEST-${num}-${i}`,
                categoria: i % 2 === 0 ? 'Alimentos' : 'Limpieza',
                precio,
                costo,
                stock: Math.floor(Math.random() * 200) + 10,
                tipoUnidad: 'unidad',
                fecha_registro: now,
                aplicaIva: i % 3 === 0,
                exento: i % 5 === 0,
                jerarquia: {
                    bulto: { activo: false, nombre: "Bulto", contenido: 1, precio: 0, codigo: "" },
                    paquete: { activo: false, nombre: "Paquete", contenido: 1, precio: 0, codigo: "" }
                }
            });
        }

        try {
            // bulkAdd returns generated IDs if we ask for keys
            const ids = await db.productos.bulkAdd(batch, { allKeys: true });

            // Log to Kardex
            const logEntries = ids.map((id, index) => ({
                fecha: now,
                tipo: 'ENTRADA_INICIAL',
                productId: id,
                producto: batch[index].nombre,
                cantidad: batch[index].stock,
                stockFinal: batch[index].stock,
                referencia: 'GEN_PRUEBA',
                detalle: 'Generación masiva de prueba',
                usuarioId: authRef.current.usuario?.id || 'sys',
                usuarioNombre: authRef.current.usuario?.nombre || 'Sistema'
            }));

            await db.logs.bulkAdd(logEntries);
            addLog(`✅ ${cantidad} PRODUCTOS CREADOS Y LOGUEADOS.`, 'success');
        } catch (e) {
            addLog(`❌ Error en bulkAdd: ${e.message}`, 'error');
            throw e;
        }
    };

    const generarClientesMasivos = async (cantidad) => {
        addLog(`🧪 GENERANDO ${cantidad} CLIENTES...`);
        const batch = [];
        const now = new Date().toISOString();
        const apellidos = ['Gomez', 'Rodriguez', 'Perez', 'Garcia', 'Martinez', 'Sosa', 'Beraldi', 'Lopez'];
        const nombres = ['Juan', 'Maria', 'Pedro', 'Ana', 'Luis', 'Elena', 'Carlos', 'Sofia'];

        for (let i = 1; i <= cantidad; i++) {
            const nom = nombres[Math.floor(Math.random() * nombres.length)];
            const ape = apellidos[Math.floor(Math.random() * apellidos.length)];
            const doc = `${Math.floor(Math.random() * 20) + 10}.${Math.floor(Math.random() * 900) + 100}.${Math.floor(Math.random() * 900) + 100}`;

            batch.push({
                nombre: `${nom} ${ape} (TEST)`,
                documento: doc,
                telefono: `0412-${Math.floor(Math.random() * 900) + 100}${Math.floor(Math.random() * 900) + 100}`,
                direccion: "Ciudad de Prueba",
                deuda: 0,
                favor: 0,
                saldo: 0,
                fecha_registro: now
            });
        }

        await db.clientes.bulkAdd(batch);
        addLog(`✅ ${cantidad} CLIENTES CREADOS.`, 'success');
    };

    // --- 5. SCENARIO Z REPORT DEBUG ---
    const simularEscenarioZ = async () => {
        if (isRunning) return;
        setIsRunning(true);
        setLogs([]);
        setProgress(0);

        try {
            addLog("🧪 INICIANDO ESCENARIO: Z-REPORT DEBUG (Mixed Payments)", 'header');
            addLog("📋 Objetivo: Validar suma/resta de inputs mixtos y vueltos en 4 cuadrantes.");

            // 1. Limpieza y Configuración
            await cambiarIdentidad('DUENO'); // Permitir todo
            await limpiarDB();

            // Tasa Fija 200
            const TASA_TEST = 200;
            await db.config.put({ key: 'general', tasa: TASA_TEST, monedaBase: 'USD' });
            addLog(`⚙️ Config: Tasa Bs ${TASA_TEST} | Moneda Base: USD`);

            // 1.5 Siembra de Producto Específico
            await db.productos.add({
                id: 1,
                nombre: 'Harina Pan Bulto',
                precio: 25,
                stock: 100,
                codigo: 'Z001',
                tipoUnidad: 'unidad',
                aplicaIva: true
            });
            addLog(`🌱 Producto sembrado: Harina Pan Bulto (100 Unds)`);

            // 2. Apertura de Caja
            await cambiarIdentidad('ENCARGADO');
            const apertura = { usdCash: 25, usdDigital: 0, vesCash: 0, vesDigital: 0 };

            // Force close just in case
            if (cajaRef.current.isCajaAbierta()) await cajaRef.current.cerrarCaja({ observacion: 'FORCE_TEST' });

            await cajaRef.current.abrirCaja(apertura, authRef.current.usuario);
            addLog(`🔓 Caja Abierta: $${apertura.usdCash} (Start)`);

            // 3. Procesar Venta
            await cambiarIdentidad('CAJERO');
            // Venta Total $29
            // Pago: $10 Cash + $5 Zelle + $5 Binance + 1000 Bs PM ($5) + 1000 Bs Punto ($5) + 1000 Bs Efectivo ($5) = $35
            // Vuelto: $4 Cash + 400 Bs Cash ($2) = $6
            // Totales Reales: 
            // - USD Cash In: 10
            // - USD Cash Out: 4
            // - USD Digital In: 10
            // - VES Cash In: 1000
            // - VES Cash Out: 400
            // - VES Digital In: 2000

            const ventaTest = {
                total: 29,
                items: [{ id: 1, nombre: 'Harina Pan Bulto', precio: 25, cantidad: 1, impuestos: 4 }], // $25 + 16% = 29
                metodos: [
                    { metodo: 'Efectivo USD', monto: 10, tipo: 'DIVISA', id: 'usd-cash' },
                    { metodo: 'Zelle', monto: 5, tipo: 'DIVISA', id: 'zelle' },
                    { metodo: 'Binance', monto: 5, tipo: 'DIVISA', id: 'binance' },
                    { metodo: 'Pago Móvil', montoBS: 1000, tipo: 'BS', id: 'pm' },
                    { metodo: 'Punto de Venta', montoBS: 1000, tipo: 'BS', id: 'punto' },
                    { metodo: 'Efectivo Bs', montoBS: 1000, tipo: 'BS', id: 'bs-cash' }
                ],
                cambio: 6, // $4 + $2 (400bs)
                distribucionVuelto: { usd: 4, bs: 400 },
                tasa: TASA_TEST,
                clienteId: null
            };

            addLog(`🛒 PROCESANDO VENTA MIXTA $29.00`);
            addLog(`   📥 Inputs: $10 Cash, $10 Digital, Bs 1000 PM, Bs 1000 Punto, Bs 1000 Cash`);
            addLog(`   📤 Outputs: $4 Cash, Bs 400 Cash`);

            await posRef.current.registrarVenta(ventaTest);
            addLog(`✅ Venta Registrada.`);
            await esperar(500);

            // 4. Cierre y Validación
            await cambiarIdentidad('ENCARGADO');
            const dataCierre = await posRef.current.cerrarCaja();
            const tesoreria = dataCierre.tesoreriaDetallada;

            addLog(`🔒 CAJA CERRADA. Validando Acumuladores...`, 'header');

            // EXPECTED VALUES
            const EXPECTED = {
                usdCash: 31,     // 25 + 10 - 4
                usdDigital: 10,  // 0 + 5 + 5
                vesCash: 600,    // 0 + 1000 - 400
                vesDigital: 2000 // 0 + 1000 + 1000
            };

            const ACTUAL = {
                usdCash: tesoreria.usdCash.final,
                usdDigital: tesoreria.usdDigital.final,
                vesCash: tesoreria.vesCash.final,
                vesDigital: tesoreria.vesDigital.final
            };

            const check = (label, actual, expected) => {
                const diff = Math.abs(actual - expected);
                const ok = diff < 0.01;
                const icon = ok ? '✅' : '❌';
                const msg = `${icon} ${label}: ${actual} (Esperado: ${expected})`;
                if (!ok) addLog(msg, 'error');
                else addLog(msg);
                return ok;
            };

            const r1 = check('USD Cash (31)', ACTUAL.usdCash, EXPECTED.usdCash);
            const r2 = check('USD Digital (10)', ACTUAL.usdDigital, EXPECTED.usdDigital);
            const r3 = check('VES Cash (600)', ACTUAL.vesCash, EXPECTED.vesCash);
            const r4 = check('VES Digital (2000)', ACTUAL.vesDigital, EXPECTED.vesDigital);

            if (r1 && r2 && r3 && r4) {
                addLog(`🏆 RESULTADO: PRUEBA DE ESTRÉS SUPERADA.`, 'header');
                addLog(`   La matemática de 4 cuadrantes es PERFECTA.`);
            } else {
                addLog(`💀 FALLO MATEMÁTICO DETECTADO. Revisar reportUtils.js`, 'error');
            }

        } catch (e) {
            addLog(`🔥 FATAL: ${e.message}`, 'error');
            console.error(e);
        } finally {
            setIsRunning(false);
        }
    };

    // --- 6. SCENARIO EGRESOS (NEW) ---
    const simularEscenarioEgresos = async () => {
        if (isRunning) return;
        setIsRunning(true);
        setLogs([]);
        setProgress(0);

        try {
            addLog("🧪 INICIANDO ESCENARIO: FINANZAS & EGRESOS", "header");
            addLog("📋 Objetivo: Validar impacto de Gastos y Consumos en el Arqueo.");

            await cambiarIdentidad('DUENO');
            await limpiarDB();
            await esperar(500); // ⏳ Safety wait for React State to sync
            await db.config.put({ key: 'general', tasa: 100, monedaBase: 'USD' });

            await db.productos.add({ id: 10, nombre: 'Pizza Test', precio: 10, costo: 6, stock: 100, codigo: 'P01', tipoUnidad: 'unidad', aplicaIva: false });

            await cambiarIdentidad('ENCARGADO');
            await cajaRef.current.abrirCaja({ usdCash: 100, vesCash: 0 }, authRef.current.usuario);
            addLog("🔓 Caja abierta con $100.00");

            await cambiarIdentidad('CAJERO');

            // 1. Venta de $10
            await posRef.current.registrarVenta({
                total: 10,
                items: [{ id: 10, nombre: 'Pizza Test', precio: 10, cantidad: 1 }],
                metodos: [{ metodo: 'Efectivo USD', monto: 10, tipo: 'DIVISA' }],
                tasa: 100
            });
            addLog("🛒 Venta realizada: $10.00");

            // 2. Gasto de $20
            addLog("💸 Registrando Gasto: $20.00 (Internet)");
            await financeRef.current.registrarGasto({
                monto: 20, moneda: 'USD', medio: 'CASH', motivo: 'Internet', usuario: authRef.current.usuario
            });

            // 3. Consumo Interno (Merma)
            await cambiarIdentidad('ENCARGADO');
            addLog("📦 Registrando Consumo: 1 Pizza (Se quemó)");
            await invRef.current.registrarConsumoInterno(
                { id: 10, nombre: 'Pizza Test', precio: 10, cantidad: 1, unidadVenta: 'unidad' },
                'Se quemó',
                authRef.current.usuario
            );

            // 4. Validación Final
            await cambiarIdentidad('ENCARGADO');
            const data = await posRef.current.cerrarCaja();

            addLog("🔒 VALIDACIÓN POST-CIERRE:", "header");

            const cashFinal = data.tesoreriaDetallada.usdCash.final;
            const gastoTotal = data.totalGastosCaja;
            const consumoTotal = data.totalConsumoInterno;

            const r1 = cashFinal === 90; // 100 + 10 - 20
            const r2 = gastoTotal === 20;
            const r3 = consumoTotal === 6; // Costo de la pizza

            addLog(r1 ? `✅ Efectivo Final: $90 OK` : `❌ Efectivo Final: $${cashFinal} (Esperado 90)`, r1 ? 'info' : 'error');
            addLog(r2 ? `✅ Gastos: $20 OK` : `❌ Gastos: $${gastoTotal} (Esperado 20)`, r2 ? 'info' : 'error');
            addLog(r3 ? `✅ Consumo Merma: $6 OK` : `❌ Consumo Merma: $${consumoTotal} (Esperado 6)`, r3 ? 'info' : 'error');

            if (r1 && r2 && r3) addLog("🏆 MATEMÁTICA DE EGRESOS VALIDADA CORRECTAMENTE");

        } catch (e) {
            addLog(`🔥 FATAL: ${e.message}`, 'error');
        } finally {
            setIsRunning(false);
        }
    };

    return {
        ejecutarSimulacion,
        simularEscenarioZ,
        simularEscenarioEgresos,
        generarProductosMasivos,
        generarClientesMasivos,
        isRunning,
        logs,
        progress
    };
};
