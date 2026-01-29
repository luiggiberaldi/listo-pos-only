/**
 * 🖼️ IMAGE ENGINE (POS 2.0)
 * Utilidad para compresión "al vuelo" de imágenes.
 * Objetivo: Reducir imágenes de 5MB a ~20KB para no saturar IndexedDB.
 */

export const compressImage = async (file, maxWidth = 300, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error("No se proporcionó ningún archivo"));
            return;
        }

        // Validación básica de tipo
        if (!file.type.startsWith('image/')) {
            reject(new Error("El archivo no es una imagen válida"));
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;

            img.onload = () => {
                // Cálculo de dimensiones manteniendo Aspect Ratio
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Lógica de redimensionado (Max Dimension)
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width *= maxWidth / height;
                        height = maxWidth;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');

                // Suavizado para mejor calidad visual en reducción
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                ctx.drawImage(img, 0, 0, width, height);

                // Exportar a WebP (Mejor compresión que JPG/PNG)
                // Si el navegador no soporta WebP, fallback a JPEG
                const dataUrl = canvas.toDataURL('image/webp', quality);

                resolve(dataUrl);
            };

            img.onerror = (err) => {
                reject(new Error("Error al cargar la imagen para procesamiento"));
            };
        };

        reader.onerror = (err) => {
            reject(new Error("Error al leer el archivo de imagen"));
        };
    });
};
