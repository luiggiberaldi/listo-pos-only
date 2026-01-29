import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { dbClient } from '../../services/firebase';
import { useAuthContext } from '../../context/AuthContext';

export const useRemoteLockListener = () => {
    const { getSystemID } = useAuthContext();

    useEffect(() => {
        const sysId = getSystemID();
        if (!sysId || !dbClient) return;

        // "La oreja en la puerta" - Listener Permanente
        const unsub = onSnapshot(doc(dbClient, 'merchants', sysId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();

                // Si el dueño activa el candado desde Listo GO
                if (data.remote_lock === true) {
                    // console.warn("🔒 [SEC] REMOTE LOCK TRIGGERED BY OWNER");

                    if (localStorage.getItem('listo_owner_lock') !== 'true') {
                        localStorage.setItem('listo_owner_lock', 'true');
                        // Forzamos recarga para que el LicenseGuard active la pantalla roja
                        window.location.reload();
                    }
                } else {
                    // Si el dueño quita el candado
                    // O si el campo no existe/es falso
                    if (localStorage.getItem('listo_owner_lock') === 'true') {
                        console.log("🔓 [SEC] REMOTE LOCK REMOVED BY OWNER");
                        localStorage.removeItem('listo_owner_lock');
                        window.location.reload();
                    }
                }
            }
        }, (error) => {
            console.error("❌ [SEC] Error escuchando Remote Lock:", error);
        });

        return () => unsub();
    }, [getSystemID]);
};
