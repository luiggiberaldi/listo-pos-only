// 📄 SAVE PDF UNIVERSAL - Shared save logic for all PDF generators
// Handles: Electron (native save dialog), Browser File System API, and fallback blob download.
// V1.0

export const savePdfUniversal = async (doc, fileName) => {
    // 1. ELECTRON
    if (window.electronAPI && window.electronAPI.savePDF) {
        const pdfArrayBuffer = doc.output('arraybuffer');
        try {
            const result = await window.electronAPI.savePDF(pdfArrayBuffer, fileName);
            if (result.success) {
                const { default: Swal } = await import('sweetalert2');
                Swal.fire({
                    icon: 'success',
                    title: '¡Guardado Exitoso!',
                    html: `Ubicación:<br/><small style="color:#666; word-break:break-all;">${result.path}</small>`,
                    showDenyButton: true,
                    confirmButtonText: '📄 Abrir Ahora',
                    denyButtonText: '📂 Ver en Carpeta',
                    confirmButtonColor: '#6366f1',
                    denyButtonColor: '#64748b'
                }).then((swalResult) => {
                    if (swalResult.isConfirmed && result.path) {
                        window.electronAPI.openFileDefault(result.path);
                    } else if (swalResult.isDenied && result.path) {
                        window.electronAPI.openFileLocation(result.path);
                    }
                });
                return { success: true, method: 'electron' };
            } else {
                if (!result.canceled) {
                    const { default: Swal } = await import('sweetalert2');
                    Swal.fire('Error', 'Error guardando: ' + result.error, 'error');
                }
                return { success: false, method: 'electron', error: result.error };
            }
        } catch (e) {
            console.error('Electron save error:', e);
            throw e;
        }
    }

    // 2. BROWSER (File System Access API + Fallback)
    const blob = doc.output('blob');
    try {
        if (window.showSaveFilePicker) {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{ description: 'PDF File', accept: { 'application/pdf': ['.pdf'] } }],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();

            const { default: Swal } = await import('sweetalert2');
            Swal.fire({
                icon: 'success',
                title: 'Guardado',
                text: 'El archivo se guardó en la carpeta seleccionada.',
                timer: 3000
            });
        } else {
            throw new Error("API no soportada");
        }
    } catch (err) {
        // 3. Fallback clásico: blob link download
        console.log("Fallback download...", err);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    return { success: true, method: 'browser' };
};
