// CLEAR LICENSE SCRIPT
// Run this directly in the browser console via Electron or DevTools
// Or include it temporarily in the app

try {
    console.log("🧹 [TEST] Borrando licencia local...");
    localStorage.removeItem('listo_license_key');
    console.log("✅ Licencia eliminada. La terminal es 'virgen' de nuevo.");

    // Opcional: Borrar SystemID para simular nueva instalación Web (No afecta Electron real)
    // localStorage.removeItem('sys_installation_id');

    alert("✅ MEMORIA DE LICENCIA BORRADA.\n\nLa aplicación se reiniciará y pedirá activación.");
    window.location.reload();
} catch (e) {
    console.error("Error borrando licencia:", e);
}
