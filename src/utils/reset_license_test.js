// CLEAR LICENSE SCRIPT
// Run this directly in the browser console via Electron or DevTools
// Or include it temporarily in the app

import Swal from 'sweetalert2';

try {
    console.log("🧹 [TEST] Borrando licencia local...");
    localStorage.removeItem('listo_license_key');
    console.log("✅ Licencia eliminada. La terminal es 'virgen' de nuevo.");

    // Opcional: Borrar SystemID para simular nueva instalación Web (No afecta Electron real)
    // localStorage.removeItem('sys_installation_id');

    Swal.fire({
        icon: 'success',
        title: 'Memoria de licencia borrada',
        text: 'La aplicación se reiniciará y pedirá activación.',
        confirmButtonColor: '#0f172a'
    }).then(() => {
        window.location.reload();
    });
} catch (e) {
    console.error("Error borrando licencia:", e);
}
