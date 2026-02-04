// 🛡️ FÉNIX SHIELD - LAYER 1: HARDWARE BINDING
// Archivo: src/hooks/security/useLicenseGuard.js

import { useState, useEffect } from 'react';
import { dbMaster } from '../../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// SALT SECRETO (En producción esto debería estar ofuscado o venir de env cifrado)
const LICENSE_SALT = "LISTO_POS_V1_SECURE_SALT_998877";

export const useLicenseGuard = () => {
    const [status, setStatus] = useState('checking'); // checking | authorized | unauthorized
    const [machineId, setMachineId] = useState(null);
    const [isSuspended, setIsSuspended] = useState(false);

    // 1. VERIFICACIÓN DE INTEGRIDAD LOCAL (HARDWARE BINDING)
    useEffect(() => {
        // 👻 GHOST BYPASS: Permitir acceso total si estamos en simulación
        if (localStorage.getItem('ghost_bypass') === 'true') {
            setStatus('authorized');
            setMachineId('GHOST_AGENT');
            setIsSuspended(false);
            return;
        }

        const verifyLicense = async () => {
            try {
                // Fail-Safe: Revisar bloqueo persistente (System Lock Only)
                // ⚠️ Solo bloqueos ADMNISTRATIVOS (Master) activan la pantalla roja
                if (localStorage.getItem('listo_lock_down') === 'true') {
                    setIsSuspended(true);
                }

                // Detectar entorno
                const isElectron = window.electronAPI && window.electronAPI.getMachineId;
                let currentId = null;

                if (isElectron) {
                    currentId = await window.electronAPI.getMachineId();
                } else {
                    // MODO WEB (FALLBACK): Usamos el System ID (el mismo que usa Telemetría)
                    currentId = localStorage.getItem('sys_installation_id');
                    if (!currentId) {
                        currentId = crypto.randomUUID();
                        localStorage.setItem('sys_installation_id', currentId);
                    }
                }

                setMachineId(currentId);

                // LÓGICA DE VALIDACIÓN (LAYER 1)
                if (!isElectron) {
                    // En Web confiamos ciegamente (Solo Desarrollo/Demo)
                    setStatus('authorized');
                    return;
                }

                // Generar Hash Esperado (ID + SALT)
                const msgBuffer = new TextEncoder().encode(currentId + LICENSE_SALT);
                const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const expectedLicense = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

                // Comparar con Licencia Almacenada
                const storedLicense = localStorage.getItem('listo_license_key')?.toUpperCase();

                if (storedLicense === expectedLicense) {
                    setStatus('authorized');
                } else {
                    console.error("⛔ [FÉNIX] HARDWARE MISMATCH. Bloqueando sistema.");
                    setStatus('unauthorized');
                }

            } catch (error) {
                console.error("❌ [FÉNIX] Error crítico de seguridad:", error);
                setStatus('unauthorized');
            }
        };

        verifyLicense();
    }, []);

    // 2. FÉNIX CLOUD LOCK (REAL-TIME LISTENER)
    useEffect(() => {
        // 👻 GHOST BYPASS
        if (localStorage.getItem('ghost_bypass') === 'true') return;

        // Necesitamos el Machine ID y la conexión a Master
        if (!machineId || !dbMaster) return;

        console.log("🛡️ [FÉNIX] Activando Escucha Remota para:", machineId);

        const docRef = doc(dbMaster, 'terminales', machineId);

        // Suscripción en Tiempo Real
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                // 🔒 STRICT ACTIVE-ONLY POLICY
                // Solo el estado explícito 'ACTIVE' permite operar
                // Cualquier otro valor (SUSPENDED, PENDING, null, undefined) = BLOQUEO
                if (data.status !== 'ACTIVE') {
                    console.error("⛔ [FÉNIX] ACCESO DENEGADO. Estado:", data.status || 'UNDEFINED');
                    localStorage.setItem('listo_lock_down', 'true');
                    setIsSuspended(true);
                } else {
                    // Estado es explícitamente ACTIVE
                    // Si teníamos un bloqueo local, lo liberamos
                    if (localStorage.getItem('listo_lock_down') === 'true') {
                        console.log("🟢 [FÉNIX] ORDEN DE REACTIVACIÓN RECIBIDA.");
                        localStorage.removeItem('listo_lock_down');
                        setIsSuspended(false);
                    }
                }
            } else {
                // El documento no existe en Firestore
                // Esto puede pasar brevemente durante la creación inicial
                // POLICY: Bloquear por seguridad hasta que exista con ACTIVE
                console.warn("⚠️ [FÉNIX] Terminal no encontrado en Master DB. Bloqueando por seguridad.");
                localStorage.setItem('listo_lock_down', 'true');
                setIsSuspended(true);
            }
        }, (error) => {
            console.warn("⚠️ [FÉNIX] Conexión inestable con Master:", error.code);
            // FAIL-SAFE OFFLINE:
            // Si hay error de conexión, MANTENEMOS el estado actual.
            // Si ya estaba bloqueado en localStorage, se mantiene bloqueado.
            // Si estaba libre, se mantiene libre (asumiendo inocencia).
        });

        return () => unsubscribe();
    }, [machineId]);

    return { status, machineId, isSuspended };
};
