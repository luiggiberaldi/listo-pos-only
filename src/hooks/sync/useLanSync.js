// ✅ SYSTEM IMPLEMENTATION - V. 3.0 (LAN SYNC HOOK — HARDENED)
// Archivo: src/hooks/sync/useLanSync.js
// Fixes aplicados:
//   [FIX M3] _licenseActive obtiene estado REAL del store
//   [FIX m1] alert() reemplazado por console.warn (no bloqueante)
//   [FIX C1] Auth token en requests de secundaria + token handshake
//   [FIX M6] Normalización de nombres para match de stock

import { useState, useEffect, useCallback } from 'react';
import { db } from '../../db';
import { useLicenseGuard } from '../security/useLicenseGuard';

// CONFIGURACIÓN
const POLLING_INTERVAL = 30000; // 30s
const SYNC_PORT = 3847;
const TOKEN_KEY = 'listo-lan-auth-token';

// [FIX M6] Normalizar nombre (tildes, espacios, case)
function normalizeName(name) {
    if (!name || typeof name !== 'string') return '';
    return name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export const useLanSync = () => {
    const [role, setRole] = useState('standalone'); // 'principal', 'secundaria', 'standalone'
    const [serverIP, setServerIP] = useState('');
    const [synced, setSynced] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [error, setError] = useState(null);
    const [myIP, setMyIP] = useState('');
    const [lanToken, setLanToken] = useState(null); // [FIX C1]

    // [FIX M3] Obtener estado real de licencia desde useLicenseGuard
    const { status: licenseStatus } = useLicenseGuard();

    // [FIX C1] Restaurar token guardado
    useEffect(() => {
        try {
            const saved = localStorage.getItem(TOKEN_KEY);
            if (saved) setLanToken(saved);
        } catch { /* ignore */ }
    }, []);

    // [FIX C1] Helper para headers con auth
    const getAuthHeaders = useCallback((extra = {}) => {
        const headers = { ...extra };
        if (lanToken) headers['Authorization'] = `Bearer ${lanToken}`;
        return headers;
    }, [lanToken]);

    // 🔄 Cargar configuración al iniciar
    useEffect(() => {
        const loadConfig = async () => {
            if (!window.electronAPI) {
                console.warn('[LAN] Electron API no disponible. Modo Navegador.');
                return;
            }
            try {
                const config = await window.electronAPI.lanGetConfig();
                if (config?.role) setRole(config.role);
                if (config?.targetIP) setServerIP(config.targetIP);

                const ip = await window.electronAPI.lanGetIP();
                setMyIP(ip);
            } catch (err) {
                console.error('LAN Init Error:', err);
            }
        };
        loadConfig();
    }, []);

    // 📡 ROL: PRINCIPAL (SERVER)
    // Escucha cambios en DB y actualiza el cache del servidor Electron
    useEffect(() => {
        if (role !== 'principal') return;

        // Sincronización Inicial (Hydration)
        const hydrateServer = async () => {
            const prods = await db.productos.toArray();
            const cats = await db.config.get('categories') || { list: [] };
            const negocio = await db.config.get('general');

            const configPayload = {
                nombreNegocio: negocio?.nombreNegocio || 'Mi Negocio',
                moneda: negocio?.moneda || '$',
                tasa: negocio?.tasa || 1,
                // [FIX M3] Estado REAL de licencia — ya no es placeholder
                _licenseActive: licenseStatus === 'authorized',
            };

            window.electronAPI.lanSyncProducts(prods, cats.list || [], configPayload);
            setSynced(true);
            setLastSyncTime(new Date());
        };

        hydrateServer();

        // 👂 Listener de Stock (Si una secundaria vende, actualiza mi DB)
        const removeListener = window.electronAPI?.onLanStockUpdate?.(async (updates) => {
            console.log('📡 [LAN] Recibida actualización de stock remota:', updates);

            await db.transaction('rw', db.productos, async () => {
                for (const update of updates) {
                    if (update.skipped) continue;

                    // [FIX M6] Usar nombre normalizado para buscar
                    const allProds = await db.productos.toArray();
                    const normalizedUpdate = normalizeName(update.nombre);
                    const prod = allProds.find(p => normalizeName(p.nombre) === normalizedUpdate);

                    if (prod) {
                        await db.productos.update(prod.id, { stock: update.newStock });
                    }
                }
            });

            // Re-hidratar servidor para tener dato fresco
            hydrateServer();
        });

        return () => { if (typeof removeListener === 'function') removeListener(); };
    }, [role, licenseStatus]); // [FIX M3] Re-hidratar si cambia el estado de licencia


    // 🛰️ ROL: SECUNDARIA (CLIENT)
    // Polling al servidor para traer cambios (con auth token)
    useEffect(() => {
        if (role !== 'secundaria' || !serverIP) return;

        const syncFromMaster = async () => {
            try {
                const response = await fetch(
                    `http://${serverIP}:${SYNC_PORT}/api/products/since?t=${lastSyncTime ? lastSyncTime.getTime() : 0}`,
                    { headers: getAuthHeaders() } // [FIX C1]
                );

                // [FIX C1] Si 401, reintentar handshake via ping
                if (response.status === 401) {
                    console.warn('🔑 [LAN] Token rechazado. Reintentando handshake...');
                    try {
                        const pingRes = await fetch(`http://${serverIP}:${SYNC_PORT}/api/ping`);
                        if (pingRes.ok) {
                            const pingData = await pingRes.json();
                            if (pingData.lanToken) {
                                setLanToken(pingData.lanToken);
                                try { localStorage.setItem(TOKEN_KEY, pingData.lanToken); } catch { /**/ }
                            }
                        }
                    } catch { /* ignore ping failures */ }
                    return; // Próximo poll usará el nuevo token
                }

                const data = await response.json();

                if (data.hasChanges && data.productos) {
                    console.log(`📥 [LAN] Sincronizando ${data.productos.length} productos del Master...`);

                    // Sync inteligente usando transacción (no clear+bulkAdd destructivo)
                    await db.transaction('rw', db.productos, db.config, async () => {
                        const existentes = await db.productos.toArray();
                        const mapExistentes = new Map(existentes.map(p => [normalizeName(p.nombre), p]));

                        for (const prod of data.productos) {
                            const key = normalizeName(prod.nombre);
                            if (!key) continue;

                            const existing = mapExistentes.get(key);
                            if (existing) {
                                await db.productos.update(existing.id, {
                                    precio: prod.precio,
                                    costo: prod.costo,
                                    stock: prod.stock,
                                    categoria: prod.categoria,
                                    codigoBarras: prod.codigoBarras,
                                    unidad: prod.unidad,
                                    impuesto: prod.impuesto,
                                    stockMinimo: prod.stockMinimo,
                                    descripcion: prod.descripcion,
                                    activo: prod.activo,
                                    imagen: prod.imagen,
                                });
                                mapExistentes.delete(key); // Marcar como procesado
                            } else {
                                await db.productos.add({
                                    nombre: prod.nombre.trim(),
                                    precio: Number(prod.precio) || 0,
                                    costo: Number(prod.costo) || 0,
                                    stock: Number(prod.stock) || 0,
                                    categoria: prod.categoria || 'General',
                                    codigoBarras: prod.codigoBarras || '',
                                    unidad: prod.unidad || 'unidad',
                                    impuesto: Number(prod.impuesto) || 0,
                                    stockMinimo: Number(prod.stockMinimo) || 0,
                                    descripcion: prod.descripcion || '',
                                    activo: prod.activo !== false,
                                    imagen: prod.imagen || '',
                                });
                            }
                        }

                        // Eliminar productos que ya no existen en el Master
                        for (const [, prod] of mapExistentes) {
                            await db.productos.delete(prod.id);
                        }

                        // Sync Config básica
                        if (data.config) {
                            await db.config.put({ key: 'general', ...data.config });
                        }
                    });

                    setSynced(true);
                    setLastSyncTime(new Date());
                    setError(null);
                }
            } catch (err) {
                console.warn('⚠️ [LAN] Fallo conexión con Master:', err.message);
                setError('Sin conexión al Master');
                setSynced(false);
            }
        };

        // Initial Sync
        syncFromMaster();

        // Polling Interval
        const interval = setInterval(syncFromMaster, POLLING_INTERVAL);
        return () => clearInterval(interval);
    }, [role, serverIP, getAuthHeaders]);


    // 🛠️ ACCIONES PÚBLICAS
    const setNetworkRole = async (newRole, newTargetIP) => {
        const config = { role: newRole, targetIP: newTargetIP };
        await window.electronAPI.lanSaveConfig(config);
        setRole(newRole);
        setServerIP(newTargetIP);

        // [FIX m1] Reemplazar alert() bloqueante con console.warn
        if (newRole === 'principal') {
            console.warn('⚠️ [LAN] Configurado como Principal. Se requiere reinicio para iniciar el servidor.');
            // El componente ConfigConexionLAN ya muestra un toast/Swal al usuario
        }
    };

    const scanForMaster = async () => {
        // Escaneo básico de IPs en el rango local
        const baseIP = myIP.split('.').slice(0, 3).join('.');

        // Promesas con timeout rápido
        const checkIP = async (ip) => {
            try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 1000); // 1s timeout
                const res = await fetch(`http://${ip}:${SYNC_PORT}/api/ping`, { signal: controller.signal });
                clearTimeout(id);
                if (res.ok) {
                    const info = await res.json();
                    // [FIX C1] Capturar token durante scan
                    if (info.lanToken) {
                        setLanToken(info.lanToken);
                        try { localStorage.setItem(TOKEN_KEY, info.lanToken); } catch { /**/ }
                    }
                    return { ip, ...info };
                }
            } catch (e) { /* ignore */ }
            return null;
        };

        // Barrido rápido (loteado para no ahogar la red)
        const discoveries = [];
        for (let i = 1; i < 255; i += 20) {
            const batch = [];
            for (let j = 0; j < 20 && (i + j) < 255; j++) {
                batch.push(checkIP(`${baseIP}.${i + j}`));
            }
            const results = await Promise.all(batch);
            results.forEach(r => r && discoveries.push(r));
        }

        return discoveries;
    };

    return {
        role,
        serverIP,
        myIP,
        synced,
        lastSyncTime,
        error,
        setNetworkRole,
        scanForMaster,
        hasToken: !!lanToken, // [FIX C1] Para debug en UI
    };
};
