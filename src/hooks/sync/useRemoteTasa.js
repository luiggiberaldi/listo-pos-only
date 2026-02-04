import { useEffect, useRef } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { dbClient } from '../../services/firebase';
import { useAuthContext } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import Swal from 'sweetalert2';

/**
 * 📡 Hook: useRemoteTasa
 * Escucha cambios en 'merchants/{systemId}/remote_tasa'
 * Permite que la App (Listo GO) controle la configuración de divisas del POS.
 */
export const useRemoteTasa = () => {
    const { getSystemID } = useAuthContext();
    const { guardarConfiguracion, obtenerTasaBCV, playSound } = useStore();

    // Referencia para evitar bucles infinitos procesando la misma orden
    const lastTimestampRef = useRef(0);
    // 🛡️ Guard to prevent logic execution after unmount or during overlapping effects
    const isMounted = useRef(true);
    // Track current opening dialog to close it specifically if needed
    const currentSwalRef = useRef(null);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            // Si hay un Swal abierto por este hook, lo cerramos
            if (currentSwalRef.current) {
                Swal.close();
                currentSwalRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const systemId = getSystemID();
        if (!systemId) return;

        const unsub = onSnapshot(doc(dbClient, 'merchants', systemId), (docSnap) => {
            if (!docSnap.exists()) return;
            if (!isMounted.current) return;

            const data = docSnap.data();
            const remoteOrder = data.remote_tasa;

            if (!remoteOrder) return;

            // 1. Validación de Timestamp (Anti-Rebote)
            let remoteTime = 0;
            if (remoteOrder.timestamp?.toMillis) {
                remoteTime = remoteOrder.timestamp.toMillis();
            } else if (remoteOrder.timestamp?.seconds) {
                remoteTime = remoteOrder.timestamp.seconds * 1000;
            }

            // ⚠️ IGNORAR SI ES VIEJO 
            if (remoteTime <= lastTimestampRef.current) return;

            // Si la orden ya está aceptada o rechazada en la nube, la ignoramos localmente
            if (remoteOrder.status !== 'PENDING') return;

            lastTimestampRef.current = remoteTime;
            console.log("📡 [REMOTE TASA] Nueva Orden Solicitada:", remoteOrder.mode, remoteOrder.value);

            // 🔔 SONIDO DE ATENCIÓN
            if (playSound && isMounted.current) playSound('WARNING');

            // 2. SOLICITUD DE CONFIRMACIÓN
            const confirmarCambio = async () => {
                let titulo = '¿Aceptar Cambio de Tasa?';
                let html = '';
                let confirmText = 'Sí, Actualizar';

                if (remoteOrder.mode === 'AUTO') {
                    const currency = remoteOrder.currency || 'USD';
                    html = `<p>Se solicita activar <strong>Sincronización Automática (BCV ${currency})</strong>.</p>`;
                } else if (remoteOrder.mode === 'MANUAL') {
                    html = `<h1 style="font-size: 3em; color: #34d399; font-weight: bold;">Bs ${remoteOrder.value}</h1><p>Nueva Tasa Manual Propuesta</p>`;
                }

                const swalInstance = Swal.fire({
                    title: titulo,
                    html: html,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#10b981',
                    cancelButtonColor: '#64748b',
                    confirmButtonText: confirmText,
                    cancelButtonText: 'Ignorar',
                    background: '#0f172a',
                    color: '#fff',
                    allowOutsideClick: false,
                    backdrop: `rgba(0,0,0,0.8)`
                });

                currentSwalRef.current = swalInstance;
                return swalInstance;
            };

            // Ejecutamos el flujo de decisión
            confirmarCambio().then((result) => {
                // 🛑 SAFETY CHECK: Si el componente se desmontó, ignoramos la resolución.
                // Esto es crucial para evitar el "Rechazo Instantáneo" causado por Swal.close() en un remount.
                if (!isMounted.current) {
                    console.log("🛡️ [REMOTE TASA] Ignorando resolución por desmontaje...");
                    return;
                }

                // 🛑 USER REJECTION HANDLER
                // Solo escribimos REJECTED si el usuario REALMENTE hizo clic en cancelar/ignorar.
                if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
                    console.log("🚫 [REMOTE TASA] User Manually Rejected.");
                    try {
                        updateDoc(doc(dbClient, 'merchants', systemId), { "remote_tasa.status": "REJECTED" });
                    } catch (e) { console.error(e); }
                    return;
                }

                if (!result.isConfirmed) return;

                // --- LÓGICA DE ACTUALIZACIÓN (Solo si usuario confirma) ---
                if (playSound) playSound('SUCCESS');

                if (remoteOrder.mode === 'AUTO') {
                    const currency = remoteOrder.currency || 'USD';

                    Swal.fire({
                        title: 'Sincronizando...',
                        text: `Conectando con BCV (${currency})...`,
                        timer: 2000,
                        showConfirmButton: false,
                        background: '#1e293b',
                        color: '#fff'
                    });

                    guardarConfiguracion(prev => ({
                        ...prev,
                        autoUpdateTasa: true,
                        autoUpdateFrecuencia: 3600000
                    }));

                    const executeAutoSync = async () => {
                        const tasaResult = await obtenerTasaBCV(true, currency);
                        if (tasaResult) {
                            try {
                                updateDoc(doc(dbClient, 'merchants', systemId), {
                                    tasaAplicada: tasaResult,
                                    'config.tasa': tasaResult,
                                    'config.tipoTasa': currency,
                                    tasaUltimaActualizacion: serverTimestamp(),
                                    "remote_tasa.status": "ACCEPTED"
                                });
                            } catch (e) { console.error(e); }
                        }
                    };
                    executeAutoSync();

                } else if (remoteOrder.mode === 'MANUAL') {
                    const nuevaTasa = parseFloat(remoteOrder.value);

                    guardarConfiguracion(prev => ({
                        ...prev,
                        autoUpdateTasa: false,
                        tasa: nuevaTasa,
                        fechaTasa: new Date().toISOString()
                    }));

                    Swal.fire({
                        title: '¡Tasa Actualizada!',
                        text: `El POS ahora opera a Bs ${nuevaTasa}`,
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false,
                        background: '#0f172a',
                        color: '#fff'
                    });

                    // ☁️ PING BACK
                    try {
                        updateDoc(doc(dbClient, 'merchants', systemId), {
                            tasaAplicada: nuevaTasa,
                            'config.tasa': nuevaTasa,
                            tasaUltimaActualizacion: serverTimestamp(),
                            "remote_tasa.status": "ACCEPTED"
                        });
                    } catch (e) {
                        console.error("❌ Error uploading confirmation:", e);
                    }
                }
            });

        }, (error) => {
            console.error("❌ [REMOTE TASA] Error en listener:", error);
        });

        return () => unsub();
    }, [getSystemID, guardarConfiguracion, obtenerTasaBCV, playSound]);
};
