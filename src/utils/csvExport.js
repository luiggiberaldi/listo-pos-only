/**
 * Utility for robust CSV Exporting
 * Matches the logic of pdfGenerator.js: Electron -> Modern Browser -> Fallback
 */

export const downloadCSV = (csvContent, fileName) => {
    return new Promise(async (resolve, reject) => {
        try {
            // 1. ELECTRON (Intento Genérico)
            // Nota: Si la API se llama savePDF pero es genérica, podríamos intentar usarla, 
            // pero por seguridad buscamos saveFile o saveCSV primero.
            if (window.electronAPI) {
                const buffer = new TextEncoder().encode(csvContent);

                // Intentamos métodos comunes de puentes Electron
                const saveMethod = window.electronAPI.saveFile || window.electronAPI.saveCSV;

                if (saveMethod) {
                    saveMethod(buffer, fileName)
                        .then(result => {
                            if (result.success) {
                                import('sweetalert2').then(SwalModule => {
                                    SwalModule.default.fire({
                                        icon: 'success',
                                        title: 'Exportado',
                                        text: `Archivo guardado en: ${result.path}`,
                                        timer: 3000
                                    });
                                });
                                resolve({ success: true, method: 'electron' });
                            } else {
                                alert('Error guardando: ' + result.error);
                                resolve({ success: false, method: 'electron', error: result.error });
                            }
                        })
                        .catch(reject);
                    return;
                }
                // Si no hay método específico, seguimos al fallback moderno
            }

            // 2. BROWSER (MODERNO + FALLBACK)
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

            try {
                if (window.showSaveFilePicker) {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: fileName,
                        types: [{ description: 'CSV File', accept: { 'text/csv': ['.csv'] } }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();

                    import('sweetalert2').then(SwalModule => {
                        SwalModule.default.fire({
                            icon: 'success',
                            title: 'Exportado',
                            text: 'El archivo CSV se guardó correctamente.',
                            timer: 3000
                        });
                    });
                    resolve({ success: true, method: 'browser-modern' });
                } else {
                    throw new Error("API File System no soportada");
                }
            } catch (err) {
                // 3. Fallback clásico: Blob Link
                // Este es el que fallaba en Electron, pero es nuestro último recurso
                console.log("Fallback download...", err);
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                resolve({ success: true, method: 'browser-fallback' });
            }
        } catch (error) {
            console.error("CSV Export Error:", error);
            reject(error);
        }
    });
};
