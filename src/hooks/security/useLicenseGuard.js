// 🛡️ FÉNIX SHIELD - LAYER 1: HARDWARE BINDING
// Archivo: src/hooks/security/useLicenseGuard.js

import { useState, useEffect } from 'react';
import { dbMaster, initFirebase } from '../../services/firebase'; // 🚀 Init Import
import { doc, onSnapshot } from 'firebase/firestore';
import { DEFAULT_PLAN } from '../../config/planTiers';

// SALT SECRETO (En producción esto debería estar ofuscado o venir de env cifrado)
const LICENSE_SALT = import.meta.env.VITE_LICENSE_SALT || "LISTO_POS_V1_SECURE_SALT_998877";

export const useLicenseGuard = () => {
    const [status, setStatus] = useState('checking'); // checking | authorized | unauthorized | connecting
    const [machineId, setMachineId] = useState(null);
    const [isSuspended, setIsSuspended] = useState(false);
    const [plan, setPlan] = useState(DEFAULT_PLAN);
    const [firebaseReady, setFirebaseReady] = useState(false);

    // 0. BOOTSTRAP: INICIALIZAR FIREBASE (Evitar Race Conditions)
    useEffect(() => {
        let mounted = true;
        initFirebase().then(ok => {
            if (mounted && ok) setFirebaseReady(true);
        });
        return () => { mounted = false; };
    }, []);

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
                // 🚨 SECURITY FIX: Ya no confiamos ciegamente en WEB.
                // Todo terminal debe tener licencia válida o estar en proceso de activación.

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
                    // Si no tiene licencia local, tal vez es nuevo.
                    // NO bloqueamos inmediatamente si es Web start-up, pero
                    // el Cloud Lock (Layer 2) decidirá si lo deja pasar o no.
                    // Por defecto: Unauthorized hasta que se demuestre lo contrario.
                    console.warn("⚠️ [FÉNIX] Licencia local no encontrada o inválida.");
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

        // 🛑 WAIT FOR FIREBASE & MACHINE ID
        if (!firebaseReady || !machineId || !dbMaster) return;

        console.log("🛡️ [FÉNIX] Conectando con Torre de Control para:", machineId);

        const docRef = doc(dbMaster, 'terminales', machineId);

        // Suscripción en Tiempo Real
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                // 🔒 STRICT ACTIVE-ONLY POLICY
                // Solo el estado explícito 'ACTIVE' permite operar
                if (data.status !== 'ACTIVE') {
                    console.error("⛔ [FÉNIX] ACCESO DENEGADO REMOTAMENTE. Estado:", data.status || 'UNDEFINED');
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
                    // Si la licencia local fallaba pero el remoto dice ACTIVE,
                    // podríamos considerar auto-reparar la licencia (future feature).
                    // Por ahora, solo mantenemos el bloqueo de suspensión sync.
                }

                // 🏪 PLAN TIER: Leer plan del terminal
                const remotePlan = data.plan || DEFAULT_PLAN;
                setPlan(remotePlan);
                localStorage.setItem('listo_plan', remotePlan);
                console.log(`🏪 [FÉNIX] Plan activo: ${remotePlan}`);

                // 🛡️ DEMO SHIELD: Leer config demo del terminal
                const remoteIsDemo = data.isDemo === true;
                const remoteQuotaLimit = data.quotaLimit || 100;
                localStorage.setItem('listo_isDemo', String(remoteIsDemo));
                localStorage.setItem('listo_quotaLimit', String(remoteQuotaLimit));
                console.log(`🛡️ [FÉNIX] Demo: ${remoteIsDemo}, Quota: ${remoteQuotaLimit}`);
            } else {
                // 🆕 TERMINAL NUEVO (No existe en Cloud)
                // No hacemos nada destructivo aún. Esperamos activación manual.
                console.log("☁️ [FÉNIX] Terminal no registrado en nube. Esperando vinculación.");
            }
        }, (error) => {
            console.warn("⚠️ [FÉNIX] Conexión inestable con Master:", error.code);
            // FAIL-SAFE OFFLINE: Mantenemos estado actual.
        });

        return () => unsubscribe();
    }, [machineId, firebaseReady]); // Dependencia clave: firebaseReady

    return { status, machineId, isSuspended, plan };
};

