
// ✅ SYSTEM IMPLEMENTATION - V. 1.0 (MASTER TELEMETRY)
// Archivo: src/hooks/sync/useMasterTelemetry.js
// Responsabilidad: Enviar "Ping" de estado a la Antena Master (Control Central).

import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2'; // 🔔 IMPORTANTE: Alertas
import { dbMaster } from '../../services/firebase'; // 📡 Antena B
import { supabase } from '../../services/supabaseClient'; // 🟢 Supabase Client for Cascade Deletion Support
import { doc, setDoc, getDoc, serverTimestamp, onSnapshot, updateDoc, collection, addDoc } from 'firebase/firestore';
import { useAuthContext } from '../../context/AuthContext';
// import { useStore } from '../../context/StoreContext'; // 🗑️ DEPRECATED: Avoid circular dependency
import { useConfigContext } from '../../context/ConfigContext'; // 🟢 DIRECT ACCESS
import { useUnifiedAnalytics } from '../analytics/useUnifiedAnalytics';

export const useMasterTelemetry = () => {

    // 1. FUENTES DE DATOS
    const { getSystemID, adminResetUserPin, usuarios } = useAuthContext();
    const { configuracion } = useConfigContext(); // 🟢 DIRECT
    const { kpis } = useUnifiedAnalytics(); // Fuente de Verdad Financiera

    const [status, setStatus] = useState('active'); // 'active' | 'syncing' | 'error'
    const [hwId, setHwId] = useState(null); // ID de Hardware Real

    // 1.5 OBTENER HARDWARE ID (Async)
    useEffect(() => {
        const fetchHwId = async () => {
            if (window.electronAPI?.getMachineId) {
                try {
                    const id = await window.electronAPI.getMachineId();
                    // console.log("📡 [TELEMETRY] Usando ID de Hardware:", id);
                    setHwId(id);
                } catch (e) {
                    console.error("📡 [TELEMETRY] Fallo al obtener HWID:", e);
                    setHwId(getSystemID()); // Fallback
                }
            } else {
                setHwId(getSystemID()); // Fallback web
            }
        };
        fetchHwId();
    }, []);

    // 2. REFERENCIAS PARA DEBOUNCE
    const timeoutRef = useRef(null);
    const lastPayloadRef = useRef('');

    // 3. GENERADOR DE PAYLOAD (Con Lógica Anti-Zombie)
    const getTelemetryPayload = async () => {
        // PREFERENCIA: Hardware ID > System ID
        const finalId = hwId || getSystemID();
        const totalVentas = kpis?.hoy?.total || 0;

        // 🛡️ AUDIT COUNT (Anti-Reset)
        let lifetimeSales = 0;
        try {
            const { getLifetimeSales } = await import('../../db');
            lifetimeSales = await getLifetimeSales();
        } catch (e) {
            console.warn("Telemetry: Failed to count lifetime sales", e);
        }

        // 🛡️ INFERRED STATUS LOGIC
        const isLocalLocked = localStorage.getItem('listo_lock_down') === 'true';
        const safeStatus = isLocalLocked ? 'SUSPENDED' : 'ACTIVE';

        // 💾 DISK HEALTH CHECK
        let storageData = null;
        if (window.electronAPI?.getDiskInfo) {
            try {
                storageData = await window.electronAPI.getDiskInfo();
            } catch (e) {
                console.warn("⚠️ [TELEMETRY] Disk info failed", e);
            }
        }

        return {
            id: finalId, // ID unificado con Security Guard
            nombreNegocio: configuracion?.nombre || 'Comercio Sin Nombre',
            version: 'v4.2-demo-shield', // Versión del POS
            ventasHoyUSD: totalVentas,
            conteoVentasHoy: kpis?.hoy?.count || 0, // 🟢 NUEVO: Contador de tickets
            usage_count: lifetimeSales, // 🛡️ DEMO SHIELD TRACKING
            status: safeStatus,
            storage: storageData // 🟢 NUEVO: Salud de Disco
            // lastSeen y _syncedAt se ponen en el envío
        };
    };

    // 4. EFECTO DE TRANSMISIÓN (RADAR)
    useEffect(() => {
        // Si no hay conexión a Master (ej. modo offline total sin licencia), abortamos
        if (!dbMaster) return;

        const transmitir = async () => {
            const payload = await getTelemetryPayload();
            const payloadString = JSON.stringify(payload);

            // Evitar re-envíos si nada cambió (salvo el timestamp)
            if (payloadString === lastPayloadRef.current) return;

            setStatus('syncing');

            try {
                // 🏭 FACTORY LOCKDOWN LOGIC
                // Verificar si el terminal ya existe en la Master DB
                const docRef = doc(dbMaster, 'terminales', payload.id);
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    // 🔒 NUEVO TERMINAL: Crear con estado SUSPENDED (bloqueado de fábrica)
                    console.warn("📡 [FACTORY-LOCKDOWN] Nuevo terminal detectado. Creando con estado SUSPENDED.");
                    await setDoc(docRef, {
                        ...payload,
                        status: 'SUSPENDED', // Override: Force suspended for new terminals
                        lastSeen: serverTimestamp(),
                        _lastIp: 'ANONYMOUS',
                        _createdAt: serverTimestamp()
                    });
                } else {
                    // Terminal existente: Solo actualizar campos de telemetría
                    // NO sobrescribir el campo 'status' (mantener el que tiene en Firestore)
                    const { status: _, ...payloadWithoutStatus } = payload; // Remove status from payload
                    await setDoc(docRef, {
                        ...payloadWithoutStatus,
                        lastSeen: serverTimestamp(),
                        _lastIp: 'ANONYMOUS'
                    }, { merge: true });
                }

                // console.log(`📡 [MASTER-LINK] Ping enviado: $${payload.ventasHoyUSD}`);
                lastPayloadRef.current = payloadString;
                setStatus('active');

            } catch (error) {
                console.error("📡 [MASTER-LINK] ❌ Error de conexión/permisos:", error);
                setStatus('error');
            }

            // 🟢 SUPABASE HEARTBEAT (For Cascade Deletion Support)
            // Upsert client to ensure it exists in 'listo_clients' so FKs work
            if (supabase) {
                try {
                    await supabase
                        .from('listo_clients')
                        .upsert({
                            system_id: payload.id,
                            business_name: payload.nombreNegocio,
                            last_sync: new Date().toISOString(),
                            // Don't overwrite status or created_at if exists
                        }, { onConflict: 'system_id' });
                    // console.log("🟢 [SUPABASE-LINK] Heartbeat sent");
                } catch (sbError) {
                    console.warn("⚠️ [SUPABASE-LINK] Sync failed:", sbError);
                }
            }
        };

        // DEBOUNCE 30s + WARMUP
        // Cada vez que cambia el KPI de ventas o el nombre, reiniciamos el timer
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // ⏰ WARMUP DELAY (10 Segundos iniciales extra)
        // Esto permite que useLicenseGuard (Fénix) corra primero al arrancar,
        // detecte si estamos bloqueados, y marque el localStorage ANTES de que enviemos el primer ping.
        // Así evitamos el "Zombie on Boot".
        const delay = lastPayloadRef.current === '' ? 10000 : 30000;

        timeoutRef.current = setTimeout(() => {
            transmitir();
        }, delay);

        return () => clearTimeout(timeoutRef.current);

    }, [kpis?.hoy?.total, kpis?.hoy?.count, configuracion?.nombre, dbMaster, hwId]);

    // 5. 🔑 PIN RESET PROTOCOL LISTENER (REMOTE RESCUE)
    useEffect(() => {
        if (!dbMaster || !hwId) return;

        const finalId = hwId || getSystemID();
        const docRef = doc(dbMaster, 'terminales', finalId);

        let connectionTimeout;

        // Real-time listener for Master commands
        const unsubscribe = onSnapshot(docRef, async (docSnap) => {
            // ✅ CONEXIÓN EXITOSA
            clearTimeout(connectionTimeout);
            // if (!data) console.log(`📡 [SEGURIDAD] Conectado a canal seguro: ${finalId}`);

            if (docSnap.exists()) {
                const data = docSnap.data();

                // Check if Master has requested a PIN reset
                if (data.request_pin_reset === true) {
                    console.warn("🔑 [PIN-RESET] Solicitud de reset recibida del Master.");

                    try {
                        // Execute PIN reset (Dynamic Admin ID)
                        // 🔍 SYSTEM FIX: Don't assume ID 1. Find the real Owner/Admin.
                        const adminUser = usuarios.find(u => u.roleId === 'ROL_DUENO' || u.rol === 'admin' || u.id === 1);

                        if (!adminUser) {
                            throw new Error("No se encontró usuario Administrador para resetear.");
                        }

                        if (adminResetUserPin) {

                            // 🛑 HANDSHAKE: Ask user for permission before resetting
                            let isConfirmed = false;

                            const result = await Swal.fire({
                                title: 'SOPORTE REMOTO',
                                html: `
                                        <div style="text-align: left; color: #94a3b8; font-size: 0.95em;">
                                            <p style="margin-bottom: 12px;">Se ha recibido una solicitud para restablecer las credenciales de administrador.</p>
                                            
                                            <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px; margin: 16px 0;">
                                                <p style="margin: 0; font-size: 0.8em; text-transform: uppercase; color: #f59e0b; margin-bottom: 4px; font-weight: bold;">Acción Requerida:</p>
                                                <p style="margin: 0; color: #e2e8f0;">Cambiar PIN Maestro a: <strong style="color: #ffffff; font-family: monospace; font-size: 1.2em;">123456</strong></p>
                                            </div>

                                            <p style="font-size: 0.8em;">Por seguridad, confirme esta acción solo si usted la solicitó.</p>
                                        </div>
                                    `,
                                icon: 'warning',
                                iconColor: '#f59e0b',
                                background: '#0f172a', // Slate 950
                                color: '#f8fafc',
                                showCancelButton: true,
                                confirmButtonColor: '#10b981',
                                cancelButtonColor: '#ef4444',
                                confirmButtonText: 'AUTORIZAR',
                                cancelButtonText: 'DENEGAR',
                                reverseButtons: true,
                                allowOutsideClick: false,
                                width: '450px'
                            });
                            isConfirmed = result.isConfirmed;

                            if (isConfirmed) {
                                // ✅ USER ACCEPTED
                                await adminResetUserPin(adminUser.id, '123456');
                                console.log(`✅ [PIN-RESET] PIN de usuario ${adminUser.nombre} (${adminUser.id}) restablecido.`);

                                // Send confirmation back to Master
                                await updateDoc(docRef, {
                                    request_pin_reset: false,
                                    last_pin_reset: serverTimestamp(),
                                    _pin_reset_confirmed: true,
                                    _pin_reset_status: 'ACCEPTED'
                                });

                                if (Swal) {
                                    Swal.fire('PIN Restablecido', 'Usa 123456 para ingresar.', 'success');
                                }

                            } else {
                                // ❌ USER REJECTED
                                console.warn("⛔ [PIN-RESET] Usuario rechazo la solicitud.");
                                await updateDoc(docRef, {
                                    request_pin_reset: false,
                                    _pin_reset_rejected_at: serverTimestamp(),
                                    _pin_reset_status: 'REJECTED'
                                });
                            }

                            // Confirmation/Rejection sent in block above
                            console.log("📡 [PIN-RESET] Respuesta procesada.");
                        } else {
                            console.error("❌ [PIN-RESET] Función adminResetUserPin no disponible.");
                        }

                    } catch (error) {
                        console.error("❌ [PIN-RESET] Error ejecutando reset:", error);

                        // Report error to Master
                        await updateDoc(docRef, {
                            request_pin_reset: false,
                            _pin_reset_error: error.message,
                            _pin_reset_error_at: serverTimestamp()
                        });
                    }
                }
            }
        }, (error) => {
            console.error("⚠️ [PIN-RESET] Error en listener de Master:", error);

            if (error.code === 'permission-denied') {
                if (Swal) {
                    Swal.fire({
                        title: '⚠️ Error de Seguridad',
                        text: 'El terminal no tiene permiso para leer comandos del Master. Verifica las Reglas de Firestore.',
                        icon: 'error',
                        toast: true,
                        position: 'top-end',
                        timer: 5000
                    });
                }
            }
        });

        connectionTimeout = setTimeout(() => {
            console.warn("⚠️ [TELEMETRY] Firebase listener no respondió en 30s. Posible problema de conexión.");
        }, 30000);

        return () => {
            clearTimeout(connectionTimeout);
            unsubscribe();
        };
    }, [dbMaster, hwId, adminResetUserPin, usuarios]);

    // 6. 🚨 SISTEMA DE REPORTE DE INCIDENTES (EL CHISMOSO)
    const reportarIncidente = async (tipo, detalle, nivel = 'ALERTA') => {
        if (!dbMaster) return;

        try {
            const finalId = hwId || getSystemID();
            const collectionRef = collection(dbMaster, 'incidentes'); // 📂 Colección Nueva

            await addDoc(collectionRef, {
                terminalId: finalId,
                nombreNegocio: configuracion?.nombre || 'Desconocido',
                tipo: tipo, // EJ: 'ACCESO_NO_AUTORIZADO', 'ELEVACION_FALLIDA'
                detalle: detalle,
                nivel: nivel,
                fecha: serverTimestamp(),
                usuarioImplicado: usuarios?.find(u => u.activo)?.nombre || 'Anónimo', // Intenta adivinar
                metadata: {
                    version: 'v4.1-stable',
                    ruta: window.location.pathname
                }
            });

            // console.log(`🚨 [CHISMOSO] Incidente reportado: ${tipo}`);
        } catch (error) {
            console.error("🚨 [CHISMOSO] Error reportando incidente:", error);
        }
    };

    return { status, reportarIncidente };
};
