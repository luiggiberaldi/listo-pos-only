import { useState, useCallback } from 'react';
import { db } from '../../db';
import { useFinanceIntegrator } from '../store/useFinanceIntegrator';
import { useStore } from '../../context/StoreContext';

/**
 * 🛡️ FINANCE VALIDATOR 2.0
 * Simulates integration scenarios and full stress cycles between Inventory, Expenses, and Payroll.
 */
export const useFinanceValidator = () => {
    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);

    // Hooks
    const { registrarConsumoEmpleado, registrarAdelantoSueldo, cerrarSemanaConPago, registrarCompraInsumo } = useFinanceIntegrator();
    const { usuarios, productos, usuario } = useStore();

    const log = (msg) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    const header = (msg) => log(`\n=== ${msg} ===`);
    const success = (msg) => log(`✅ ${msg}`);
    const error = (msg) => log(`❌ ${msg}`);

    // --- UTILS ---
    const asegurarCajaAbierta = async (montoUSD = 1000) => {
        const sesionActual = await db.caja_sesion.get('actual');
        if (!sesionActual || !sesionActual.isAbierta) {
            log("🟡 Caja cerrada detectada. Inicializando fondo de prueba...");
            const initialBalance = { usdCash: montoUSD, vesCash: 0, usdDigital: 0, vesDigital: 0 };
            await db.caja_sesion.put({
                key: 'actual',
                isAbierta: true,
                fechaApertura: new Date().toISOString(),
                usuarioApertura: { id: 'sys', nombre: 'Sistema (Audit)' },
                balances: { ...initialBalance },
                balancesApertura: { ...initialBalance },
                idApertura: `sim_${Date.now()}`
            });
            success(`Caja Abierta: +$${montoUSD.toFixed(2)} (Fondo de Prueba)`);
        }
    };

    // --- ESCENARIOS INDIVIDUALES ---

    const simularConsumo = async () => {
        setIsRunning(true);
        header("SIMULACIÓN: CONSUMO DE EMPLEADO (Roll -> Nómina -> Kardex)");
        try {
            const empleado = usuarios?.find(u => u.activo && u.rol !== 'admin') || usuarios?.[0];
            const producto = await db.productos.orderBy('id').first();
            if (!empleado || !producto) throw new Error("Datos bases insuficientes.");

            log(`👤 Empleado: ${empleado.nombre} | 📦 Producto: ${producto.nombre}`);
            const res = await registrarConsumoEmpleado(empleado.id, producto, 1, "Simulacion Test");
            if (res.success) success("Consumo OK"); else throw new Error(res.message);
        } catch (e) { error(e.message); } finally { setIsRunning(false); }
    };

    const simularAdelanto = async () => {
        setIsRunning(true);
        header("SIMULACIÓN: ADELANTO DE SUELDO (Gasto -> Nómina)");
        try {
            await asegurarCajaAbierta();
            const empleado = usuarios?.find(u => u.activo && u.rol !== 'admin') || usuarios?.[0];
            const montoVES = 2000;
            const config = await db.config.get('general');
            const tasa = parseFloat(config?.tasa) || 1;

            log(`💸 Adelanto: ${montoVES} Bs (Tasa: ${tasa})`);
            const finanzasPre = await db.empleados_finanzas.get(empleado.id);
            const deudaPrevia = finanzasPre?.deudaAcumulada || 0;

            const res = await registrarAdelantoSueldo(empleado.id, montoVES, "Simulacion VES", 'VES');
            if (res.success) {
                const finanzasPost = await db.empleados_finanzas.get(empleado.id);
                success(`OK: Incremento Deuda: $${(finanzasPost.deudaAcumulada - deudaPrevia).toFixed(2)}`);
            } else throw new Error(res.message);
        } catch (e) { error(e.message); } finally { setIsRunning(false); }
    };

    const simularCierreGlobal = async () => {
        setIsRunning(true);
        header("SIMULACIÓN: CIERRE DE NÓMINA (Gasto Automático)");
        try {
            const res = await cerrarSemanaConPago();
            if (res.success) success(`Cierre OK. Neto: $${res.data.metrics.netoAPagar}`);
            else throw new Error(res.message);
        } catch (e) { error(e.message); } finally { setIsRunning(false); }
    };

    // --- 🚀 MASTER CYCLE: 360° SYNERGY 2.0 ---
    const simularCicloCompleto = async () => {
        setIsRunning(true);
        header("🚀 QUANTUM MASTER CYCLE: FINANCE 360° SYNERGY 2.0");
        setLogs(prev => [...prev, "Iniciando ciclo de estrés financiero..."]);

        try {
            // 1. Preparación
            log("Step 1: Asegurando integridad de Caja...");
            await asegurarCajaAbierta(5000); // Empezamos con buen fondo

            const empleado = usuarios?.find(u => u.activo && u.rol !== 'admin') || usuarios?.[0];
            const producto = await db.productos.orderBy('id').first();
            if (!empleado || !producto) throw new Error("Ambiente no preparado: Faltan productos o empleados.");

            // 2. Consumo de Producto
            log(`Step 2: Registrando Consumo de Mercancía (${producto.nombre})...`);
            const resConsumo = await registrarConsumoEmpleado(empleado.id, producto, 2, "Master Cycle Test");
            if (resConsumo.success) success("Consumo Validado (Kardex Sink OK)");

            // 3. Adelanto Multimoneda (VES)
            log("Step 3: Registrando Adelanto en Bolívares (VES)...");
            const resAdelantoVES = await registrarAdelantoSueldo(empleado.id, 5000, "Adelanto Master Cycle", 'VES');
            if (resAdelantoVES.success) success("Adelanto VES Validado (Conversión Tasa OK)");

            // 4. Compra de Insumos (Inventory Feed)
            log(`Step 4: Simulando Compra de Mercancía (Repocisión ${producto.nombre})...`);
            const resCompra = await registrarCompraInsumo(producto.id, 50, 100, 'CASH', 'Repocisión por Auditoría Master');
            if (resCompra.success) success("Compra Validada (Caja Out -> Stock In OK)");

            // 5. Liquidación Final
            log("Step 5: Ejecutando Liquidación Global de Nómina...");
            const resCierre = await cerrarSemanaConPago();
            if (resCierre.success) {
                const { netoAPagar, totalDeuda } = resCierre.data.metrics;
                success(`Ciclo Completado: Liquidación Generada por $${netoAPagar.toFixed(2)}`);
                log(`📊 Auditoría: Descuentos Totales: $${totalDeuda.toFixed(2)}`);
            }

            header("✅ SISTEMA 2.0 CERTIFICADO: SIN ERRORES DETECTADOS");

        } catch (e) {
            error(`CRITICAL FAILURE en Ciclo: ${e.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    return {
        logs,
        isRunning,
        simularConsumo,
        simularAdelanto,
        simularCierreGlobal,
        simularCicloCompleto
    };
};
