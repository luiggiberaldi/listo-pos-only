import { useState, useEffect, useCallback } from 'react';
import { db } from '../../db';

// CONFIGURACIÓN
const POLLING_INTERVAL = 30000; // 30s
const SYNC_PORT = 3847;

export const useLanSync = () => {
    const [role, setRole] = useState('standalone'); // 'principal', 'secundaria', 'standalone'
    const [serverIP, setServerIP] = useState('');
    const [synced, setSynced] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [error, setError] = useState(null);
    const [myIP, setMyIP] = useState('');

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
            const cats = await db.config.get('categories') || { list: [] }; // Asumimos estructura
            // También podríamos leer config del negocio
            const negocio = await db.config.get('general');

            const configPayload = {
                nombreNegocio: negocio?.nombreNegocio || 'Mi Negocio',
                moneda: negocio?.moneda || '$',
                tasa: negocio?.tasa || 1,
                _licenseActive: true // Placeholder, debe venir de useLicenseGuard
            };

            window.electronAPI.lanSyncProducts(prods, cats.list || [], configPayload);
            setSynced(true);
            setLastSyncTime(new Date());
        };

        hydrateServer();

        // 👂 Listener de Stock (Si una secundaria vende, actualiza mi DB)
        const removeListener = window.electronAPI.onLanStockUpdate(async (updates) => {
            console.log('📡 [LAN] Recibida actualización de stock remota:', updates);

            await db.transaction('rw', db.productos, async () => {
                for (const update of updates) {
                    if (update.skipped) continue;

                    // Buscar producto exacto (usando nombre por ahora, idealmente ID)
                    const prod = await db.productos.where('nombre').equals(update.nombre).first();
                    if (prod) {
                        // Actualizar stock localmente SIN re-emitir evento (evitar loop infinito)
                        await db.productos.update(prod.id, { stock: update.newStock });
                    }
                }
            });

            // Re-hidratar servidor para tener dato fresco
            hydrateServer();
        });

        return () => removeListener();
    }, [role]);


    // 🛰️ ROL: SECUNDARIA (CLIENT)
    // Polling al servidor para traer cambios
    useEffect(() => {
        if (role !== 'secundaria' || !serverIP) return;

        const syncFromMaster = async () => {
            try {
                const response = await fetch(`http://${serverIP}:${SYNC_PORT}/api/products/since?t=${lastSyncTime ? lastSyncTime.getTime() : 0}`);
                const data = await response.json();

                if (data.hasChanges && data.productos) {
                    console.log(`📥 [LAN] Sincronizando ${data.productos.length} productos del Master...`);

                    // ⚠️ ESTRATEGIA: OVERWRITE TOTAL (Más seguro para MVP)
                    // Idealmente: Delta update
                    await db.transaction('rw', db.productos, db.config, async () => {
                        await db.productos.clear();
                        await db.productos.bulkAdd(data.productos);

                        // Sync Config básica también
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
    }, [role, serverIP]);


    // 🛠️ ACCIONES PÚBLICAS
    const setNetworkRole = async (newRole, newTargetIP) => {
        const config = { role: newRole, targetIP: newTargetIP };
        await window.electronAPI.lanSaveConfig(config);
        setRole(newRole);
        setServerIP(newTargetIP);

        // Si cambiamos a Principal, forzar reinicio de server?
        // Electron ya lo maneja al reinicio de app, pero quizás necesitemos reinicio manual
        if (newRole === 'principal') {
            alert("Por favor reinicia la aplicación para iniciar el servidor.");
        }
    };

    const scanForMaster = async () => {
        // Escaneo básico de IPs en el rango local
        const baseIP = myIP.split('.').slice(0, 3).join('.');
        const candidates = [];

        // Promesas con timeout rápido
        const checkIP = async (ip) => {
            try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 1000); // 1s timeout
                const res = await fetch(`http://${ip}:${SYNC_PORT}/api/ping`, { signal: controller.signal });
                clearTimeout(id);
                if (res.ok) {
                    const info = await res.json();
                    return { ip, ...info };
                }
            } catch (e) { /* ignore */ }
            return null;
        };

        // Barrido rápido (loteado para no ahogar la red)
        // Escaneamos .1 a .254
        const discoveries = [];
        // Hacemos lotes de 20
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
        scanForMaster
    };
};
