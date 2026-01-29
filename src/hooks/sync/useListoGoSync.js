
// ✅ SYSTEM IMPLEMENTATION - V. 2.0 (LISTO GO RICH SYNC)
// Archivo: src/hooks/sync/useListoGoSync.js
// Responsabilidad: Sincronizar "Snapshot" Financiero y Operativo a Firebase (Listo GO).
// Incluye: Canal de Control Remoto (Remote Lock).

import { useEffect, useRef, useState, useMemo } from 'react';
import { useUnifiedAnalytics } from '../analytics/useUnifiedAnalytics';
import { useInventory } from '../store/useInventory';
import { useAuthContext } from '../../context/AuthContext';
import { useSyncEngine } from './useSyncEngine';
import { useStore } from '../../context/StoreContext';
import { dbClient } from '../../services/firebase'; // ✅ Explicit Client DB
import { serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useCajaEstado } from '../caja/useCajaEstado';

export const useListoGoSync = () => {

    // 1. DATA SOURCES
    const { configuracion } = useStore();
    const { kpis } = useUnifiedAnalytics(); // Ventas del día & Ganancia (Already calculated)
    const { productos } = useInventory();
    const { estado } = useCajaEstado(); // Estado de la Gaveta (Cash Flow)

    const { getSystemID, tempPukCode } = useAuthContext();
    const { syncSnapshot } = useSyncEngine();
    const [lastSyncStatus, setLastSyncStatus] = useState('idle');

    // 2. EXTRA DATA (Async Logic via Dexie)
    const extraStats = useLiveQuery(async () => {
        // A. Total Deuda Clientes & Lista
        let totalDeuda = 0;
        const deudores = [];

        await db.clientes.each(c => {
            const d = parseFloat(c.deuda || 0);
            if (d > 0) {
                totalDeuda += d;
                deudores.push({
                    id: c.id,
                    nombre: c.nombre,
                    telefono: c.telefono,
                    deuda: d
                });
            }
        });

        // Sort descending & limit top 50
        deudores.sort((a, b) => b.deuda - a.deuda);
        const topDeudores = deudores.slice(0, 50);

        // B. Alertas de Anulación (Hoy)
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

        const anuladas = await db.ventas
            .where('fecha').between(startOfDay, endOfDay)
            .filter(v => v.status === 'ANULADA')
            .count();

        // C. Feed de Pagos Recientes (Monitor de Tesorería)
        const paymentFeed = [];
        let totalVentasActivasHoy = 0;
        const metodosPagoHoy = {};

        const ventasActivas = await db.ventas
            .where('fecha').between(startOfDay, endOfDay)
            .filter(v => v.status !== 'ANULADA')
            .reverse() // Newest first optimization
            .toArray();

        ventasActivas.forEach(v => {
            totalVentasActivasHoy += v.total || 0;
            if (v.pagos && Array.isArray(v.pagos)) {
                v.pagos.forEach((p, idx) => {
                    // Update Stats
                    if (p.metodo && p.monto) {
                        metodosPagoHoy[p.metodo] = (metodosPagoHoy[p.metodo] || 0) + p.monto;
                    }

                    // Feed Collection (Only with Reference)
                    if (p.referencia && p.referencia.length >= 2) {
                        paymentFeed.push({
                            id: `${v.id}_${idx}`,
                            hora: v.fecha,
                            metodo: p.metodo,
                            monto: p.monto,
                            referencia: p.referencia,
                            cliente: v.clienteNombre || 'Cliente'
                        });
                    }
                });
            }
        });

        // Sort feed desc by time just in case, limit 15
        paymentFeed.sort((a, b) => new Date(b.hora) - new Date(a.hora));
        const recentPayments = paymentFeed.slice(0, 15);

        return { totalDeuda, anuladas, topDeudores, totalVentasActivasHoy, metodosPagoHoy, recentPayments };
    }, []) || { totalDeuda: 0, anuladas: 0, topDeudores: [], recentPayments: [] };

    // 3. REF Y DEBOUNCE
    const timeoutRef = useRef(null);
    const lastSnapshotRef = useRef(null);

    // 4. CALCULO DE ALERTA INVENTARIO (MEMOIZADO)
    // 4. CALCULO DE ALERTA INVENTARIO (MEMOIZADO)
    const stockStats = useMemo(() => {
        let stockBajo = 0;
        const items = [];

        productos.forEach(p => {
            if (p.stock <= (p.stockMinimo || 5)) {
                stockBajo++;
                // Solo guardamos datos esenciales para la App (Top 50 para no reventar el payload)
                if (items.length < 50) {
                    items.push({
                        id: p.id,
                        nombre: p.nombre,
                        stock: p.stock,
                        minimo: p.stockMinimo || 5
                    });
                }
            }
        });
        return { stockBajo, items };
    }, [productos]);

    const getSnapshotPayload = () => {
        // A. Resumen Financiero Hoy
        const ventasUSD = kpis?.hoy?.total || 0;
        const gananciaUSD = kpis?.hoy?.ganancia || 0;
        const tasaActual = configuracion?.tasa || 1;

        // B. PUK Code
        const pukCode = tempPukCode || "HIDDEN-IN-POS";

        const payload = {
            systemId: getSystemID(),

            // 📊 FINANZAS (PREMIUM DATA)
            gananciaUSD: gananciaUSD,
            ventasHoyUSD: ventasUSD,
            ventasHoyBS: ventasUSD * tasaActual,

            // 👥 DEUDA
            totalDeudaClientes: extraStats.totalDeuda,
            deudores: extraStats.topDeudores,

            // ⚠️ ALERTAS OPERATIVAS & SEGURIDAD
            alertas: {
                stockBajo: stockStats.stockBajo,
                items: stockStats.items,
                anulaciones: extraStats.anuladas
            },

            // 💸 MONITOR DE TESORERÍA (FEED)
            feedPagos: extraStats.recentPayments,

            // 🔑 META
            pukCode,
            tasaAplicada: tasaActual,
            nombreNegocio: configuracion?.nombre || "Sin Nombre",
            updatedAt: new Date().toISOString()
        };

        // 💵 CAJA (CASH FLOW REAL)
        // Solo enviamos boveda física si la caja está abierta para no sobreescribir con 0s al cerrar
        if (estado?.isAbierta) {
            payload.efectivoEnCaja = {
                usd: estado.balances?.usdCash || 0,
                bs: estado.balances?.vesCash || 0
            };
        }

        return payload;
    };

    // 5. EFECTO PRINCIPAL (SYNC LOOP 20s)
    useEffect(() => {
        if (configuracion?.pausarSync) {
            if (lastSyncStatus !== 'paused') setLastSyncStatus('paused');
            return;
        }

        const runSync = () => {
            if (configuracion?.pausarSync) return;

            const payload = getSnapshotPayload();
            const jsonPayload = JSON.stringify(payload);

            setLastSyncStatus('bg-syncing');
            const docId = getSystemID();

            syncSnapshot('merchants', docId, {
                ...payload,
                lastSync: serverTimestamp()
            }).then((ok) => {
                if (ok) {
                    setLastSyncStatus('ok');
                    lastSnapshotRef.current = jsonPayload;
                } else {
                    setLastSyncStatus('error');
                }
            });
        };

        // Primera ejecución inmediata (para que la App no espere)
        if (!timeoutRef.current) {
            runSync();
        }

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(runSync, 20000); // ⏱️ 20s Loop

        return () => clearTimeout(timeoutRef.current);

    }, [kpis, stockStats, extraStats, estado]);

    // 6. 🛡️ REMOTE LOCK LISTENER: DEPRECATED (Moved to App.jsx for Deadlock Prevention)
    // See: src/hooks/security/useRemoteLockListener.js

    return { lastSyncStatus };
};
