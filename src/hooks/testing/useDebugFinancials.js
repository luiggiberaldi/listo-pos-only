import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { usePOSContext } from '../../context/POSContext';
import { useCajaEstado } from '../caja/useCajaEstado';
import { useAuthContext } from '../../context/AuthContext';
import { db } from '../../db';

export const useDebugFinancials = () => {
    const pos = usePOSContext();
    const caja = useCajaEstado();
    const auth = useAuthContext();

    // 🛡️ REFS PROXIES (Prevention of Stale Closures)
    const posRef = useRef(pos);
    const cajaRef = useRef(caja);
    const authRef = useRef(auth);

    useEffect(() => { posRef.current = pos; }, [pos]);
    useEffect(() => { cajaRef.current = caja; }, [caja]);
    useEffect(() => { authRef.current = auth; }, [auth]);

    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);

    const addLog = (msg, type = 'info') => {
        const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
        setLogs(prev => [...prev, line]);
        console.log(line); // Console fallback
    };

    const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const ejecutarDiagnostico = async () => {
        if (isRunning) return;
        setIsRunning(true);
        setLogs([]);

        try {
            addLog("🔬 INICIANDO DIAGNÓSTICO FINANCIERO V3 (FULL SPECTRUM)");
            addLog("📋 Objetivo: Verificar 4-Cuadrantes, Vueltos, Mixtos y Anulaciones.");

            // 1. LIMPIEZA
            addLog("🧹 1. Limpiando DB...");
            await db.ventas.clear();
            await db.cortes.clear();

            // 2. APERTURA
            // USD: 100 | VES: 0 | DIG: 0
            addLog("🔓 2. Apertura de Caja ($100 USD)...");
            await cajaRef.current.abrirCaja({ usdCash: 100, vesCash: 0 }, authRef.current.usuario);
            await esperar(300);

            // 3. VENTA SIMPLE (Efectivo USD)
            // +10 USD
            addLog("🛒 3. Venta Simple: $10 (Efectivo USD)...");
            const venta1 = {
                total: 10,
                items: [{ id: 1, nombre: 'Item A', precio: 10, cantidad: 1 }],
                metodos: [{ metodo: 'Efectivo USD', monto: 10, tipo: 'DIVISA' }],
                tasa: 50
            };
            await posRef.current.registrarVenta(venta1);
            await esperar(300);

            // 4. VENTA MIXTA (USD + VES)
            // Total $5. Paga $2 USD + $3 en Bs (150 Bs)
            // +2 USD | +150 VES
            addLog("💱 4. Venta Mixta: Total $5 ($2 USD + 150 Bs)...");
            const venta2 = {
                total: 5,
                items: [{ id: 2, nombre: 'Item B', precio: 5, cantidad: 1 }],
                metodos: [
                    { metodo: 'Efectivo USD', monto: 2, tipo: 'DIVISA' },
                    { metodo: 'Efectivo Bs', montoBS: 150, tipo: 'BS' } // $3 * 50 = 150
                ],
                tasa: 50
            };
            await posRef.current.registrarVenta(venta2);
            await esperar(300);

            // 5. VENTA DIGITAL (Zelle)
            // +20 USD Digital
            addLog("💳 5. Venta Digital: $20 (Zelle)...");
            const venta3 = {
                total: 20,
                items: [{ id: 3, nombre: 'Item C', precio: 20, cantidad: 1 }],
                metodos: [{ metodo: 'Zelle', monto: 20, tipo: 'DIVISA' }],
                tasa: 50
            };
            await posRef.current.registrarVenta(venta3);
            await esperar(300);

            // 6. ANULACIÓN (La Venta 3 - Digital)
            // -20 USD Digital
            // Necesitamos el ID real
            const ventasDB = await db.ventas.toArray();
            const ventaParaAnular = ventasDB.find(v => v.total === 20 && v.status === 'COMPLETADA');

            if (ventaParaAnular) {
                addLog(`🔙 6. Anulando Venta Digital ID ${ventaParaAnular.idVenta}...`);
                await posRef.current.anularVenta(ventaParaAnular.id, "Test Anulación");
            } else {
                addLog("⚠️ No se encontró venta para anular.");
            }
            await esperar(500);

            // 7. VERIFICACIÓN FINAL (CIERRE)
            addLog("🔒 7. Cerrando Caja y Auditando...");
            const reporte = await posRef.current.cerrarCaja();

            const final = reporte.tesoreriaDetallada;

            // EXPECTED VALUES:
            // USD CASH: 100 (Open) + 10 (V1) + 2 (V2) = 112
            // VES CASH: 0 (Open) + 150 (V2) = 150
            // USD DIG: 0 (Open) + 20 (V3) - 20 (Anulada) = 0

            const val = {
                usdCash: final.usdCash.final,
                vesCash: final.vesCash.final,
                usdDig: final.usdDigital.final
            };

            addLog(`📦 RESULTADOS OBTENIDOS:`);
            addLog(`   USD Cash: ${val.usdCash} (Esp: 112)`);
            addLog(`   Bs Cash:  ${val.vesCash} (Esp: 150)`);
            addLog(`   USD Dig:  ${val.usdDig} (Esp: 0)`);

            const okUSDCash = Math.abs(val.usdCash - 112) < 0.1;
            const okVESCash = Math.abs(val.vesCash - 150) < 0.1;
            const okUSDDig = Math.abs(val.usdDig - 0) < 0.1;

            if (okUSDCash && okVESCash && okUSDDig) {
                addLog("🎉 ÉXITO TOTAL: Integridad Financiera Validada (V3).");
            } else {
                addLog("💀 FALLO: Discrepancia detectada.");
            }

        } catch (error) {
            addLog(`🔥 ERROR FATAL: ${error.message}`);
            console.error(error);
        } finally {
            setIsRunning(false);
        }
    };

    return { ejecutarDiagnostico, isRunning, logs };
};
