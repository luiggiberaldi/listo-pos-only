import { useEffect } from 'react';
import { useConfigStore } from '../stores/useConfigStore';
import Swal from 'sweetalert2';

/**
 * 🛡️ DEMO SHIELD NOTIFICATIONS
 * Monitors usage thresholds and triggers evaluative toasts.
 */
export const useDemoShieldNotifications = () => {
    const { license } = useConfigStore();

    useEffect(() => {
        if (!license.isDemo) return;

        const { usageCount, quotaLimit } = license;
        const percentage = (usageCount / quotaLimit) * 100;

        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });

        if (percentage >= 100) {
            Toast.fire({
                icon: 'error',
                title: 'PERIODO DE PRUEBA FINALIZADO',
                text: 'Contacte a soporte para activar la licencia full.'
            });
        } else if (percentage >= 90) {
            const remaining = quotaLimit - usageCount;
            Toast.fire({
                icon: 'warning',
                title: 'BLOQUEO INMINENTE',
                text: `¡Atención! Te quedan solo ${remaining} ventas de prueba.`
            });
        } else if (percentage >= 80) {
            Toast.fire({
                icon: 'info',
                title: 'MODO DEMO ACTIVO',
                text: `Has usado el ${Math.floor(percentage)}% de tus ventas de prueba.`
            });
        }
    }, [license.usageCount, license.quotaLimit, license.isDemo]);
};
