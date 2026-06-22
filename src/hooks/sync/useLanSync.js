// ✅ SYSTEM IMPLEMENTATION - V. 4.0 (LAN SYNC HOOK — FULL MULTI-CAJA)
// Archivo: src/hooks/sync/useLanSync.js
// V4.0: Bidirectional client/sale/corte/expense sync + PIN pairing

import { useState, useEffect, useCallback } from 'react';
import { db } from '../../db';
import { useLicenseGuard } from '../security/useLicenseGuard';

const POLLING_INTERVAL = 60000;
const SYNC_PORT = 3847;
const TOKEN_KEY = 'listo-lan-auth-token';

function normalizeName(name) {
    if (!name || typeof name !== 'string') return '';
    return name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export const useLanSync = () => {
    const [role, setRole] = useState('standalone');
    const [serverIP, setServerIP] = useState('');
    const [synced, setSynced] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [error, setError] = useState(null);
    const [myIP, setMyIP] = useState('');
    const [lanToken, setLanToken] = useState(null);

    const { status: licenseStatus } = useLicenseGuard();

    // Restaurar token guardado
    useEffect(() => {
        try {
            const saved = localStorage.getItem(TOKEN_KEY);
            if (saved) setLanToken(saved);
        } catch { /* ignore */ }
    }, []);

    const getAuthHeaders = useCallback((extra = {}) => {
        const headers = { ...extra };
        if (lanToken) headers['Authorization'] = `Bearer ${lanToken}`;
        return headers;
    }, [lanToken]);

    // Cargar configuración al iniciar
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

    // ═══════════════════════════════════════════════════════════
    // 📡 ROL: PRINCIPAL (SERVER)
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        if (role !== 'principal') return;

        const hydrateServer = async () => {
            const prods = await db.productos.toArray();
            const cats = await db.config.get('categories') || { list: [] };
            const negocio = await db.config.get('general');

            const configPayload = {
                nombreNegocio: negocio?.nombreNegocio || 'Mi Negocio',
                moneda: negocio?.moneda || '$',
                tasa: negocio?.tasa || 1,
                _licenseActive: licenseStatus === 'authorized',
            };

            window.electronAPI.lanSyncProducts(prods, cats.list || [], configPayload);

            // [V4] También hidratar cache de clientes
            try {
                const clientes = await db.clientes.toArray();
                window.electronAPI.lanSyncClients(clientes);
            } catch (e) {
                console.warn('[LAN] Error hidratando clientes:', e.message);
            }

            setSynced(true);
            setLastSyncTime(new Date());
        };

        hydrateServer();

        // 👂 Listener de Stock (secundaria vende → actualiza mi DB)
        const removeStockListener = window.electronAPI?.onLanStockUpdate?.(async (updates) => {
            try {
                console.log('📡 [LAN] Recibida actualización de stock remota:', updates);
                await db.transaction('rw', db.productos, async () => {
                    for (const update of updates) {
                        if (update.skipped) continue;
                        // [V4] Intentar por ID primero
                        let prod = null;
                        if (update.id) {
                            prod = await db.productos.get(update.id);
                        }
                        if (!prod) {
                            const allProds = await db.productos.toArray();
                            const normalizedUpdate = normalizeName(update.nombre);
                            prod = allProds.find(p => normalizeName(p.nombre) === normalizedUpdate);
                        }
                        if (prod) {
                            await db.productos.update(prod.id, {
                                stock: (prod.stock || 0) + (update.delta || 0),
                            });
                        }
                    }
                });
                hydrateServer();
            } catch (e) {
                console.error('❌ [LAN] Error procesando stock update:', e.message);
            }
        });

        // [V4] 👂 Listener de Clientes (secundaria crea/edita cliente)
        const removeClientListener = window.electronAPI?.onLanClientSync?.(async (data) => {
            try {
                console.log('📡 [LAN] Recibidos clientes remotos:', data.clientes?.length);
                if (!data.clientes) return;

                await db.transaction('rw', db.clientes, async () => {
                    for (const clienteRemoto of data.clientes) {
                        if (!clienteRemoto.documento) continue;

                        const existentes = await db.clientes.where('documento').equals(clienteRemoto.documento).toArray();
                        const local = existentes[0];

                        if (local) {
                            // LWW merge
                            const remoteTs = clienteRemoto._lww_updated_at || 0;
                            const localTs = local._lww_updated_at || 0;
                            const updates = {};

                            if (remoteTs > localTs) {
                                if (clienteRemoto.nombre) updates.nombre = clienteRemoto.nombre;
                                if (clienteRemoto.telefono !== undefined) updates.telefono = clienteRemoto.telefono;
                                if (clienteRemoto.direccion !== undefined) updates.direccion = clienteRemoto.direccion;
                                updates._lww_updated_at = remoteTs;
                            }

                            // Deuda/favor: apply deltas if sent
                            if (clienteRemoto._deudaDelta !== undefined) {
                                updates.deuda = (local.deuda || 0) + (clienteRemoto._deudaDelta || 0);
                            }
                            if (clienteRemoto._favorDelta !== undefined) {
                                updates.favor = (local.favor || 0) + (clienteRemoto._favorDelta || 0);
                            }

                            if (Object.keys(updates).length > 0) {
                                await db.clientes.update(local.id, updates);
                            }
                        } else {
                            // Nuevo cliente
                            const { id, _deudaDelta, _favorDelta, ...rest } = clienteRemoto;
                            await db.clientes.add(rest);
                        }
                    }
                });

                // Re-hidratar cache
                const clientes = await db.clientes.toArray();
                window.electronAPI.lanSyncClients(clientes);
            } catch (e) {
                console.error('❌ [LAN] Error procesando clientes remotos:', e.message);
            }
        });

        // [V4] 👂 Listener de Ventas (secundaria completa venta)
        const removeSaleListener = window.electronAPI?.onLanSaleReceived?.(async (data) => {
            try {
                console.log('📡 [LAN] Recibidas ventas remotas:', data.ventas?.length);
                if (!data.ventas) return;

                for (const venta of data.ventas) {
                    // Dedup por idempotencyKey (skip if missing — must have unique key)
                    if (!venta.idempotencyKey) {
                        console.warn('⚠️ [LAN] Venta sin idempotencyKey, generando uno');
                        venta.idempotencyKey = `lan_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                    }
                    const existing = await db.ventas
                        .where('idempotencyKey')
                        .equals(venta.idempotencyKey)
                        .first();
                    if (existing) continue;
                    // Insertar con cajaId original
                    await db.ventas.add({
                        ...venta,
                        id: undefined, // auto-generate
                        cajaId: data.cajaId || venta.cajaId || 'secundaria',
                        _syncedFromLAN: true,
                    });
                }
                hydrateServer();
            } catch (e) {
                console.error('❌ [LAN] Error procesando ventas remotas:', e.message);
            }
        });

        // [V4] 👂 Listener de Cortes (secundaria cierra caja)
        const removeCorteListener = window.electronAPI?.onLanCorteReceived?.(async (data) => {
            try {
                console.log('📡 [LAN] Recibido corte remoto de:', data.cajaId);
                if (!data.corte) return;

                const corte = {
                    ...data.corte,
                    id: undefined,
                    cajaId: data.cajaId || 'secundaria',
                    _syncedFromLAN: true,
                };

                // Dedup by unique Z-cut ID if present
                if (corte.corteId) {
                    const existing = await db.cortes
                        .where('corteId')
                        .equals(corte.corteId)
                        .first()
                        .catch(() => null);
                    if (existing) return;
                }

                await db.cortes.add(corte);
            } catch (e) {
                console.warn('⚠️ [LAN] Error guardando corte remoto:', e.message);
            }
        });

        // [V4] 👂 Listener de Gastos (secundaria registra gasto)
        const removeExpenseListener = window.electronAPI?.onLanExpenseReceived?.(async (data) => {
            try {
                console.log('📡 [LAN] Recibidos gastos remotos:', data.gastos?.length);
                if (!data.gastos) return;

                for (const gasto of data.gastos) {
                    await db.logs.add({
                        ...gasto,
                        id: undefined,
                        cajaId: data.cajaId || 'secundaria',
                        _syncedFromLAN: true,
                    });
                }
            } catch (e) {
                console.warn('⚠️ [LAN] Error guardando gastos remotos:', e.message);
            }
        });

        return () => {
            if (typeof removeStockListener === 'function') removeStockListener();
            if (typeof removeClientListener === 'function') removeClientListener();
            if (typeof removeSaleListener === 'function') removeSaleListener();
            if (typeof removeCorteListener === 'function') removeCorteListener();
            if (typeof removeExpenseListener === 'function') removeExpenseListener();
        };
    }, [role, licenseStatus]);


    // ═══════════════════════════════════════════════════════════
    // 🛰️ ROL: SECUNDARIA (CLIENT)
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        if (role !== 'secundaria' || !serverIP) return;

        const syncFromMaster = async () => {
            try {
                const response = await fetch(
                    `http://${serverIP}:${SYNC_PORT}/api/products/since?t=${lastSyncTime ? lastSyncTime.getTime() : 0}`,
                    { headers: getAuthHeaders() }
                );

                if (response.status === 401) {
                    console.warn('🔑 [LAN] Token rechazado. Re-pair necesario desde Config.');
                    setError('Token expirado — re-emparejar desde Config');
                    return;
                }

                const data = await response.json();

                if (data.hasChanges && data.productos) {
                    console.log(`📥 [LAN] Sincronizando ${data.productos.length} productos del Master...`);

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
                                mapExistentes.delete(key);
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

                        for (const [, prod] of mapExistentes) {
                            await db.productos.delete(prod.id);
                        }

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

        syncFromMaster();
        const interval = setInterval(syncFromMaster, POLLING_INTERVAL);
        return () => clearInterval(interval);
    }, [role, serverIP, getAuthHeaders]);


    // 🛠️ ACCIONES PÚBLICAS
    const setNetworkRole = async (newRole, newTargetIP) => {
        const config = { role: newRole, targetIP: newTargetIP };
        await window.electronAPI.lanSaveConfig(config);
        setRole(newRole);
        setServerIP(newTargetIP);

        if (newRole === 'principal') {
            console.warn('⚠️ [LAN] Configurado como Principal. Se requiere reinicio para iniciar el servidor.');
        }
    };

    const scanForMaster = async () => {
        const baseIP = myIP.split('.').slice(0, 3).join('.');

        const checkIP = async (ip) => {
            try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 1000);
                const res = await fetch(`http://${ip}:${SYNC_PORT}/api/ping`, { signal: controller.signal });
                clearTimeout(id);
                if (res.ok) {
                    const info = await res.json();
                    return { ip, ...info };
                }
            } catch { /* ignore */ }
            return null;
        };

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
        hasToken: !!lanToken,
    };
};
