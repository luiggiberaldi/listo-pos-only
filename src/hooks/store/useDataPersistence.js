import Swal from 'sweetalert2';
import { generarCapsulaDeTiempo, restaurarCapsulaDeTiempo } from '../../utils/backupUtils';

export const useDataPersistence = () => {

    const exportarDatos = async () => {
        try {
            Swal.fire({ title: 'Generando Respaldo...', text: 'Recopilando datos...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            const capsule = await generarCapsulaDeTiempo();

            const blob = new Blob([JSON.stringify(capsule)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `RESPALDO_LISTO_${new Date().toISOString().split('T')[0]}.json`;
            a.click();

            Swal.close();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Fallo al exportar datos: ' + error.message, 'error');
        }
    };

    const importarDatos = async (json) => {
        try {
            const data = JSON.parse(json);

            // Validación básica de esquema V2
            if (!data._meta || data._meta.schema_version !== 'v2-unified') {
                // Fallback Legacy Import (if needed, or throw)
                if (data.config && !data.dexie) {
                    // Es un backup viejo (V1)
                    throw new Error("Formato antiguo detectado. Use el migrador (No implementado en V2).");
                }
            }

            Swal.fire({ title: 'Restaurando...', text: 'Peligro: Se borrarán los datos actuales.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            await restaurarCapsulaDeTiempo(data);

            Swal.fire({
                icon: 'success',
                title: 'Restauración Exitosa',
                text: 'El sistema se reiniciará para aplicar cambios.',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                window.location.reload();
            });

            return true;
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Archivo corrupto o incompatible: ' + e.message, 'error');
            return false;
        }
    };

    return { exportarDatos, importarDatos };
};