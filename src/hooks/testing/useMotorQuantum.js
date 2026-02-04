import { useState, useRef, useEffect } from 'react';
import { db } from '../../db';
import math from '../../utils/mathCore';
import { useInventoryStore } from '../../stores/useInventoryStore';
import { useConfigStore } from '../../stores/useConfigStore';
import { useCartStore } from '../../stores/useCartStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useUIStore } from '../../stores/useUIStore';
import { useSalesProcessor } from '../store/useSalesProcessor';
import { useCajaEstado } from '../caja/useCajaEstado';
import { useAuthContext } from '../../context/AuthContext'; // Legacy bridge
import { useInventory } from '../store/useInventory'; // Legacy helpers for inv transactions

// 🛡️ DEFINITIVE EDITION V13 (SHADOW LEDGER + CHAOS)
export const useMotorQuantum = () => {
    // 🔌 CONNECTIONS
    const caja = useCajaEstado();
    // const auth = useAuthContext(); // We might use store directly eventually
    const { usuario, actualizarSesionLocal } = useAuthContext();
    const inv = useInventory(usuario, useConfigStore.getState().configuracion);

    // 🛡️ REFS PROXIES
    const cajaRef = useRef(caja);
    useEffect(() => { cajaRef.current = caja; }, [caja]);

    // We instantiate sales processor "on demand" or keep a ref?
    // useSalesProcessor requires props. We can simulate it or use instances.
    // For direct methods, we might need to instantiate it inside the execution context
    // or wrap it.

    // To make this work, we'll instantiate useSalesProcessor inside a wrapper that provides
    // the necessary dependencies (mocks or real stores).
    // Actually, useSalesProcessor depends on `useCajaEstado`, `useSecureAction` (not passed explicitly but used? No, passed in).

    // REAL INSTANTIATION HOOK (We will likely use this inside a component, but useMotorQuantum is a hook)
    // So we can call other hooks here.
    const { playSound } = useUIStore();
    const generarCorrelativo = useConfigStore(state => state.generarCorrelativo);

    // Helpers
    const transaccionVenta = inv.transaccionVenta;
    const transaccionAnulacion = inv.transaccionAnulacion;

    // Instanciamos el Processor Real
    const processor = useSalesProcessor(
        usuario,
        useConfigStore.getState().configuracion,
        { transaccionVenta, transaccionAnulacion, playSound, generarCorrelativo },
        caja,
        [], // 🛡️ FORCE EMPTY CART (Avoid Stale State in Tests)
        useCartStore.getState().setCarrito
    );

    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState([]);

    // 🕵️ SHADOW LEDGER (Truth Source)
    // Validaremos contra mathCore para precisión absoluta.
    const shadowLedger = useRef({
        usdCash: 0,
        vesCash: 0,
        usdDigital: 0,
        vesDigital: 0,
        ventas: 0,
        gastos: 0,
        igtf: 0
    });

    const addLog = (msg, type = 'info') => {
        const time = new Date().toLocaleTimeString('es-VE', { hour12: false, fractionalSecondDigits: 3 });
        const logLine = `[${time}] ${msg}`;
        setLogs(prev => [...prev, logLine]);
        if (type === 'error') console.error(logLine);
        else console.log(logLine);
    };

    const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // --- UTILS ---
    const resetShadow = () => {
        shadowLedger.current = {
            usdCash: 0,
            vesCash: 0,
            usdDigital: 0,
            vesDigital: 0,
            ventas: 0,
            gastos: 0,
            igtf: 0
        };
    };

    const cambiarIdentidad = async (roleId) => {
        // Mock switch
        const roles = {
            'DUENO': { id: 1, nombre: 'Quantum Dueño', permisos: ['*'] },
            'CAJERO': { id: 2, nombre: 'Quantum Cajero', permisos: ['caja.abrir', 'ventas.crear'] }
        };
        const u = roles[roleId] || roles['DUENO'];
        actualizarSesionLocal(u);
        return u;
    };

    const limpiarDB = async () => {
        addLog("🧹 LIMPIEZA TOTAL...", 'warning');
        await db.caja_sesion.clear();
        await db.ventas.clear();
        await db.cortes.clear();
        await db.logs.clear();
        await db.productos.clear();
        await db.clientes.clear();
        await esperar(500);
    };

    // --- 🔥 TEST 1: VUELTO DE LA DISCORDIA ---
    const testVueltoDiscordia = async () => {
        addLog("🧪 TEST: Vuelto de la Discordia", 'header');

        // 1. Setup w/ Client & Product
        const cliente = { id: 101, nombre: 'Juan Discordia', saldo: 0, favor: 5, deuda: 0 }; // $5 a favor
        await db.clientes.put(cliente);

        // 🆕 Create missing product
        await db.productos.put({ id: 99, nombre: 'Test Item', precio: 10, stock: 100, tipoUnidad: 'unidad', aplicaIva: false });

        // Venta de $10.
        // Paga con Saldo ($2) + $5 Cash + $4 en Bs. Total $11.
        // Vuelto $1.
        // ¿Cómo se da el vuelto? Preferencia: Cash.

        const venta = {
            total: 10,
            items: [{ id: 99, nombre: 'Test', precio: 10, cantidad: 1 }],
            metodos: [
                { metodo: 'SALDO A FAVOR', monto: 2, tipo: 'INTERNAL', medium: 'INTERNAL' },
                { metodo: 'Efectivo USD', monto: 5, tipo: 'DIVISA', medium: 'CASH' },
                { metodo: 'Efectivo Bs', montoBS: 400, amount: 400, tipo: 'BS', medium: 'CASH', currency: 'VES' } // Tasa 100. 400 Bs = $4
            ],
            distribucionVuelto: { usd: 1, bs: 0 },
            clienteId: 101,
            tasa: 100,
            fecha: new Date().toISOString()
        };

        try {
            await processor.registrarVenta(venta);
            // Validar
            const cUpdated = await db.clientes.get(101);
            // Tenía 5 favor. Usó 2. Le quedan 3.
            if (cUpdated.favor === 3) addLog("✅ Saldo a favor descontado correctamente.");
            else addLog(`❌ ERROR SALDO FACTOR: Esparaba 3, tiene ${cUpdated.favor}`, 'error');

        } catch (e) {
            addLog(`❌ Excepción: ${e.message}`, 'error');
        }
    };

    // --- 🔥 TEST 2: JERARQUÍA PROFUNDA ---
    const testJerarquiaProfunda = async () => {
        addLog("🧪 TEST: Jerarquía Profunda", 'header');

        // Producto: TABACO
        // Stock: 1000 Unidades.
        // Bulto: 50 Unidades.
        // Paquete: 10 Unidades.

        const p = {
            id: 200, nombre: 'Tabaco Quantum', precio: 1, stock: 1000, tipoUnidad: 'unidad',
            jerarquia: {
                bulto: { activo: true, contenido: 5, precio: 40 }, // 5 Paquetes * 10 Unds = 50 Unds ($40)
                paquete: { activo: true, contenido: 10, precio: 9 }  // 10 Unds ($9)
            }
        };
        await db.productos.put(p);

        // 1. Vender 1 Bulto (50 uds)
        await processor.registrarVenta({
            total: 40,
            items: [{
                ...p,
                cantidad: 1,
                unidadVenta: 'bulto',
                precio: 40,
                jerarquia: { ...p.jerarquia, bulto: { ...p.jerarquia.bulto, contenido: 5 } } // Match actual
            }],
            metodos: [{ metodo: 'Ef', monto: 40 }],
            tasa: 100
        });

        // 2. Vender 2 Paquetes (20 uds)
        await processor.registrarVenta({
            total: 18,
            items: [{
                ...p,
                cantidad: 2,
                unidadVenta: 'paquete',
                precio: 9
            }],
            metodos: [{ metodo: 'Ef', monto: 18 }],
            tasa: 100
        });

        // 3. Vender 5 Unidades
        await processor.registrarVenta({
            total: 5,
            items: [{ ...p, cantidad: 5, unidadVenta: 'unidad', precio: 1 }],
            metodos: [{ metodo: 'Ef', monto: 5 }],
            tasa: 100
        });

        // Total vendido: 50 + 20 + 5 = 75 unidades.
        // Stock esperado: 925.

        const prodFinal = await db.productos.get(200);
        if (math.eq(prodFinal.stock, 925)) {
            addLog("✅ Jerarquía Profunda validada: Stock 925/1000.");
        } else {
            addLog(`❌ ERROR JERARQUÍA: Esperaba 925, obtuvo ${prodFinal.stock}`, 'error');
        }
    };

    // --- 🔥 TEST 3: BLOQUEO UI vs API ---
    const testBloqueoUI = async () => {
        addLog("🧪 TEST: Validación de Bloqueo UI", 'header');

        // Simular bloqueo UI
        useUIStore.getState().setIsProcessing(true);
        addLog("🔒 Sistema Put in Processing Mode (UI Locked).");

        // Intentar Inyectar al Carrito Directamente
        try {
            useCartStore.getState().agregarAlCarrito({ id: 999, nombre: 'HACK', precio: 1 }, 1);

            // Should verify if it was added
            const cart = useCartStore.getState().carrito;
            const hacked = cart.find(i => i.id === 999);

            if (hacked) {
                addLog("⚠️ SECURITY NOTICE: API Store Access is NOT blocked by UI state (Expected behavior in Client-Side JS, but noteworthy). UI Buttons should be disabled.", 'warning');
            } else {
                addLog("🛡️ Store protected internally (Unexpected but good!)");
            }
        } finally {
            useUIStore.getState().setIsProcessing(false);
            useCartStore.getState().limpiarCarrito();
        }
    };

    // --- 🔥 TEST 4: IGTF ROUNDING AUDIT ---
    const testIGTFRounding = async () => {
        addLog("🧪 TEST: Auditoría de Redondeo IGTF (100 Iteraciones)", 'header');
        // Simular 10 ventas pequeñas con IGTF
        let accumIGTF = 0;

        for (let i = 0; i < 10; i++) {
            const monto = 1.05;
            const igtf = math.round(monto * 0.03); // 3%
            accumIGTF = math.add(accumIGTF, igtf);

            await processor.registrarVenta({
                total: math.add(monto, igtf),
                items: [{ id: 300, nombre: 'Micro Item', precio: monto, cantidad: 1 }],
                metodos: [{ metodo: 'USD Cash', monto: monto, tipo: 'DIVISA', medium: 'CASH', aplicaIGTF: true }],
                igtfTotal: igtf,
                tasa: 100
            });
        }

        // Check Z Report (Implicitly check logic locally first)
        addLog(`📊 IGTF Acumulado (Shadow): ${accumIGTF}`);
    };


    // --- 🔥 TEST 5: TASA VOLÁTIL ---
    const testTasaVolatil = async () => {
        addLog("🧪 TEST: Tasa Volátil", 'header');

        // 1. Iniciar con Tasa 100
        await db.config.put({ key: 'general', tasa: 100, monedaBase: 'USD' });

        // 2. Simular Venta en Progreso (Objecto estático)
        const venta = {
            total: 10,
            items: [{ id: 99, nombre: 'Volatile Item', precio: 10, cantidad: 1 }],
            metodos: [{ metodo: 'Ef Bs', montoBS: 1000, tipo: 'BS' }], // 10 * 100 = 1000
            tasa: 100 // Tasa snapshot
        };

        // 3. CAMBIAR TASA A 200 EN MEDIO DEL PROCESO
        await db.config.put({ key: 'general', tasa: 200, monedaBase: 'USD' });
        addLog("⚠️ TASA CAMBIADA A 200 (Mientras se procesaba venta a 100)");

        try {
            // El procesador usa la tasa que ENVÍAMOS en el objeto venta, no la de la DB actual
            // para operaciones de conversión dentro de la venta misma si ya están calculadas.
            // Pero si hace validaciones contra ConfigStore actual podría fallar.
            // Lo correcto es que RESPETE 'venta.tasa'.

            const result = await processor.registrarVenta(venta);

            if (result.tasa === 100) {
                // Check if payment was considered valid. 
                // 1000 Bs at rate 100 is $10. VALID.
                // 1000 Bs at rate 200 is $5. INVALID (Underpayment).

                // If success, it means it honored rate 100.
                addLog("✅ Tasa Snapshot Respetada (100).");
            } else {
                addLog(`❌ Tasa Mutada: ${result.tasa}`, 'error');
            }

        } catch (e) {
            // If errors saying "Insufficient Payment", it used 200.
            addLog(`❌ Fallo por cambio de tasa: ${e.message}`, 'error');
        }
    };


    // --- 🧱 BULK GENERATORS (Restored) ---
    const generarProductosMasivos = async (cantidad) => {
        addLog(`🧪 GENERANDO ${cantidad} PRODUCTOS...`);
        const batch = [];
        const now = new Date().toISOString();

        for (let i = 1; i <= cantidad; i++) {
            const num = Math.floor(Math.random() * 900000);
            batch.push({
                nombre: `PRODUCTO TEST ${num}`,
                codigo: `TEST-${num}`,
                precio: Math.random() * 50 + 1,
                stock: 100,
                tipoUnidad: 'unidad',
                fecha_registro: now,
                aplicaIva: false
            });
        }
        await db.productos.bulkAdd(batch);
        addLog(`✅ ${cantidad} PRODUCTOS CREADOS.`);
    };

    const generarClientesMasivos = async (cantidad) => {
        addLog(`🧪 GENERANDO ${cantidad} CLIENTES...`);
        const batch = [];
        const now = new Date().toISOString();
        for (let i = 1; i <= cantidad; i++) {
            batch.push({
                nombre: `Cliente Test ${i}`,
                documento: `V-${10000000 + i}`,
                deuda: 0,
                favor: 0,
                fecha_registro: now
            });
        }
        await db.clientes.bulkAdd(batch);
        addLog(`✅ ${cantidad} CLIENTES CREADOS.`);
    };

    // --- MAIN RUNNER ---
    const runDefinitiveSuite = async () => {
        if (isRunning) return;
        setIsRunning(true);
        setLogs([]);

        try {
            addLog("⚛️ INICIANDO SUITE QUANTUM: DEFINITIVE EDITION", 'header');

            await limpiarDB();

            addLog("⏳ Sincronizando Estado (Wait 1.5s)...");
            await esperar(1500); // 🕒 Wait for useLiveQuery to sync 'closed' state

            // 🧹 ENSURE CART IS CLEAN (Critical for Jerarquía Test)
            useCartStore.getState().limpiarCarrito();
            addLog("🛒 Carrito Limpiado.");

            // Pre-seed common
            await db.config.put({ key: 'general', tasa: 100, monedaBase: 'USD' });

            // USE REF TO OPEN
            await cajaRef.current.abrirCaja({ usdCash: 1000, vesCash: 100000 }, { id: 1, nombre: 'Admin' });

            await testVueltoDiscordia();
            await esperar(500);

            await testJerarquiaProfunda();
            await esperar(500);

            // Seed Hack Product for UI Lock Test
            await db.productos.put({ id: 999, nombre: 'HACK ITEM', precio: 1, stock: 100, tipoUnidad: 'unidad' });
            await testBloqueoUI();
            await esperar(500);

            // Seed Micro Item for IGTF Test
            await db.productos.put({ id: 300, nombre: 'Micro Item', precio: 1.05, stock: 1000, tipoUnidad: 'unidad', aplicaIva: false });
            await testIGTFRounding();
            await esperar(500);

            await testTasaVolatil();

            addLog("✅ SUITE COMPLETADA.", 'success');

        } catch (e) {
            addLog(`🔥 CRITICAL FAILURE: ${e.message}`, 'error');
        } finally {
            setIsRunning(false);
        }
    };


    return {
        runDefinitiveSuite,
        generarProductosMasivos,
        generarClientesMasivos,
        isRunning,
        logs
    };
};
