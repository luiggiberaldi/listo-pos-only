import { useEffect } from 'react';
import { dbMaster } from '../../../services/firebase'; // Adjust path depending on location
import { doc, collection, addDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import axios from 'axios';

/**
 * Hook personalizado para manejar la sincronización forense Offline/Online.
 * @param {boolean} signed - Estado actual de la firma
 * @param {string} machineId - ID único del hardware
 */
export const useLegalSync = (signed, machineId) => {

    useEffect(() => {
        const attemptSync = async () => {
            const pending = localStorage.getItem('pending_legal_sync');

            // Solo sincronizamos si hay algo pendiente, tenemos ID de máquina y conexión
            if (pending && dbMaster && machineId && navigator.onLine) {
                try {
                    console.log("🔄 [Bóveda Legal] Intentando sincronizar firma pendiente...");

                    // 1. Intentar obtener la IP real de sincronización
                    let syncIp = 'OFFLINE_SYNC_UNKNOWN';
                    try {
                        const ipRes = await axios.get('https://api.ipify.org?format=json', { timeout: 3000 });
                        syncIp = ipRes.data.ip;
                    } catch (e) {
                        console.warn("No se pudo obtener IP en sync:", e);
                    }

                    const payload = JSON.parse(pending);

                    // Verificamos que el payload pertenezca a esta máquina
                    if (payload.machine_id !== machineId) return;

                    const terminalRef = doc(dbMaster, 'terminales', machineId);
                    const auditRef = collection(terminalRef, 'legal_audit_trail');

                    // 2. Inyectamos el payload pendiente ACTUALIZANDO la IP
                    await addDoc(auditRef, {
                        ...payload,
                        ip_address: syncIp, // Reemplazamos OFFLINE_IP con la IP real de conexión
                        original_ip_placeholder: payload.ip_address, // Opcional: guardamos el rastro
                        sync_timestamp: serverTimestamp(),
                        sync_source: 'OFFLINE_RECOVERY'
                    });

                    // 3. Sincronizar también Perfil Maestro con datos KYC (si existen en el payload)
                    const masterUpdate = {
                        contrato_firmado: true,
                        fecha_firma: serverTimestamp(),
                        version_contrato: payload.contract_version || 'v1.1-2026',
                        ultima_ip_firma: syncIp
                    };

                    if (payload.kyc_data) {
                        // Sincronizar datos del negocio si vienen en el payload offline
                        Object.assign(masterUpdate, {
                            nombreNegocio: payload.kyc_data.nombreNegocio,
                            propietario: payload.kyc_data.nombreRepresentante,
                            rif: payload.kyc_data.rif,
                            telefono: payload.kyc_data.telefono,
                            email_contacto: payload.kyc_data.email
                        });
                    }

                    await setDoc(terminalRef, masterUpdate, { merge: true });

                    // Si éxito, limpiar local
                    localStorage.removeItem('pending_legal_sync');

                    console.log(`✅ [Bóveda Legal] Sincronización Exitosa desde IP: ${syncIp}`);

                } catch (error) {
                    console.warn("⚠️ [Bóveda Legal] Falló la sincronización automática:", error);
                }
            }
        };

        // Check inicial y luego cada 30s
        if (signed) {
            attemptSync();
            const interval = setInterval(attemptSync, 30000);
            return () => clearInterval(interval);
        }
    }, [signed, machineId]);
};
