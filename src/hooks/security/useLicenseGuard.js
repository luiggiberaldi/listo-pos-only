// 🛡️ FÉNIX SHIELD - LAYER 1: HARDWARE BINDING
// Archivo: src/hooks/security/useLicenseGuard.js

import { useState, useEffect } from 'react';
import { dbMaster, initFirebase } from '../../services/firebase'; // 🚀 Init Import
import { doc, onSnapshot } from 'firebase/firestore';
import { DEFAULT_PLAN } from '../../config/planTiers';
import { useConfigStore } from '../../stores/useConfigStore';
import { SecureStorage } from '../../utils/SecureStorage';

// [FIX M1] Salt centralizado — solo se usa para validación LEGACY (V1 SHA-256).
// Una vez que todos los terminales migren a JWT (V2), este import puede eliminarse.
import { LICENSE_SALT_LEGACY } from '../../config/licenseLegacy';

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

    // 1. VERIFICACIÓN DE INTEGRIDAD LOCAL (HARDWARE BINDING - FÉNIX v2)
    useEffect(() => {
        // [FIX C1] GHOST BYPASS: Solo disponible en entorno DEV de Vite.
        // En producción (npm run build) import.meta.env.DEV es false → bypass NUNCA activo.
        if (import.meta.env.DEV && localStorage.getItem('ghost_bypass') === 'true') {
            setStatus('authorized');
            setMachineId('GHOST_AGENT');
            setIsSuspended(false);
            return;
        }

        const verifyLicense = async () => {
            try {
                // Detectar entorno
                const isElectron = window.electronAPI && window.electronAPI.getMachineId;
                let currentId = null;

                if (isElectron) {
                    currentId = await window.electronAPI.getMachineId();
                } else {
                    // MODO WEB (FALLBACK): Usamos el System ID
                    currentId = localStorage.getItem('sys_installation_id');
                    if (!currentId) {
                        currentId = crypto.randomUUID();
                        localStorage.setItem('sys_installation_id', currentId);
                    }
                }

                setMachineId(currentId);

                // LÓGICA DE VALIDACIÓN (LAYER 1 - ASIMÉTRICA)
                const storedLicense = SecureStorage.get('listo_license_key');

                if (!storedLicense) {
                    console.warn("⚠️ [FÉNIX] Licencia local no encontrada.");
                    setStatus('unauthorized');
                    return;
                }

                // 🛡️ FÉNIX V2: Verificar Firma RSA
                try {
                    const { FENIX_PUBLIC_KEY } = await import('../../config/fenix_public_key');
                    const { KJUR } = await import('jsrsasign');

                    // 1. Verificar firma (RS256)
                    const isValid = KJUR.jws.JWS.verify(storedLicense, FENIX_PUBLIC_KEY, ['RS256']);

                    if (isValid) {
                        // 2. Leer Payload
                        const payload = KJUR.jws.JWS.readSafeJSONString(storedLicense.split('.')[1]);

                        // [FIX M3] 3. Verificar Expiración (offline) — NUEVO
                        if (payload.exp) {
                            const nowSecs = Math.floor(Date.now() / 1000);
                            if (nowSecs > payload.exp) {
                                console.warn("⏰ [FÉNIX] Licencia expirada. exp:", new Date(payload.exp * 1000).toLocaleDateString());
                                setStatus('unauthorized');
                                return;
                            }
                        }

                        // 4. Verificar ID (Anti-Clonación)
                        if (payload.id === currentId) {
                            console.log("✅ [FÉNIX] Licencia OFFLINE verificada y válida.");
                            setStatus('authorized');
                            // Aplicar Plan Localmente (Offline Capability)
                            if (payload.plan) {
                                setPlan(payload.plan);
                                SecureStorage.set('listo_plan', payload.plan);
                            }
                        } else {
                            console.error("⛔ [FÉNIX] CLON DETECTADO. ID Licencia:", payload.id, "vs Hardware:", currentId);
                            setStatus('unauthorized'); // Mismatch
                        }
                    } else {
                        // Fallback V1 (Hash Legacy) - Solo por transición, eventualmente eliminar.
                        // SI la licencia NO es un JWT (no tiene puntos), probamos el hash antiguo.
                        if (!storedLicense.includes('.')) {
                            const msgBuffer = new TextEncoder().encode(currentId + LICENSE_SALT_LEGACY);
                            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
                            const hashArray = Array.from(new Uint8Array(hashBuffer));
                            const expectedLicense = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

                            if (storedLicense === expectedLicense) {
                                console.warn("⚠️ [FÉNIX] Usando Licencia LEGACY (V1). Se recomienda actualizar.");
                                setStatus('authorized');
                                return;
                            }
                        }

                        console.error("❌ [FÉNIX] Firma digital inválida.");
                        setStatus('unauthorized');
                    }
                } catch (cryptoError) {
                    console.error("❌ [FÉNIX] Error criptográfico:", cryptoError);
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
    // [FIX C2] El estado 'isSuspended' es ahora PURAMENTE REACTIVO desde Firestore.
    // Se eliminó el uso de localStorage 'listo_lock_down' como fuente de verdad
    // porque era trivialmente bypasseable (localStorage.clear()) y causaba falsos
    // positivos permanentes ante errores transitorios de Firebase.
    useEffect(() => {
        // [FIX C1] Solo el entorno DEV activa ghost bypass
        if (import.meta.env.DEV && localStorage.getItem('ghost_bypass') === 'true') return;

        // 🛑 WAIT FOR FIREBASE & MACHINE ID
        if (!firebaseReady || !machineId || !dbMaster) return;

        console.log("🛡️ [FÉNIX] Conectando con Torre de Control para:", machineId);

        const docRef = doc(dbMaster, 'terminales', machineId);

        // Suscripción en Tiempo Real
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                // 🔒 STRICT ACTIVE-ONLY POLICY
                // Solo el estado explícito 'ACTIVE' permite operar.
                // El estado vive en React (isSuspended), NO en localStorage.
                if (data.status !== 'ACTIVE') {
                    console.error("⛔ [FÉNIX] ACCESO DENEGADO REMOTAMENTE. Estado:", data.status || 'UNDEFINED');
                    setIsSuspended(true);
                } else {
                    // Estado es explícitamente ACTIVE
                    setIsSuspended(false);
                    console.log("🟢 [FÉNIX] Terminal ACTIVO confirmado por nube.");
                }

                // 🏪 PLAN TIER: Leer plan del terminal
                const remotePlan = data.plan || DEFAULT_PLAN;
                setPlan(remotePlan);
                SecureStorage.set('listo_plan', remotePlan);
                console.log(`🏪 [FÉNIX] Plan activo: ${remotePlan}`);

                // 🛡️ DEMO SHIELD: Leer config demo del terminal
                const remoteIsDemo = data.isDemo === true;
                const remoteQuotaLimit = data.quotaLimit || 100;
                localStorage.setItem('listo_isDemo', String(remoteIsDemo));
                localStorage.setItem('listo_quotaLimit', String(remoteQuotaLimit));
                console.log(`🛡️ [FÉNIX] Demo: ${remoteIsDemo}, Quota: ${remoteQuotaLimit}`);

                // 🔄 SYNC TO ZUSTAND STORE (Real-Time Reactivity)
                const { setDemoConfig, loadConfig } = useConfigStore.getState();
                setDemoConfig(remoteIsDemo, remoteQuotaLimit);
                loadConfig(); // Recalculate isQuotaBlocked with fresh usageCount
            } else {
                // 🆕 TERMINAL NUEVO (No existe en Cloud)
                // No hacemos nada destructivo aún. Esperamos activación manual.
                console.log("☁️ [FÉNIX] Terminal no registrado en nube. Esperando vinculación.");
            }
        }, (error) => {
            console.warn("⚠️ [FÉNIX] Conexión inestable con Master:", error.code);
            // FAIL-SAFE OFFLINE: Mantenemos estado actual (no bloqueamos por error de red).
        });

        return () => unsubscribe();
    }, [machineId, firebaseReady]); // Dependencia clave: firebaseReady

    return { status, machineId, isSuspended, plan };
};
