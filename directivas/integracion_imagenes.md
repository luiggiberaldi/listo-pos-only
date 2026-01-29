# DIRECTIVA: INTEGRACION_IMAGENES_POS_2.0

> **ID:** POS2.0-IMG-001
> **Script Asociado:** N/A (Direct Integration)
> **Última Actualización:** 2026-01-21
> **Estado:** ACTIVO

---

## 1. Objetivos y Alcance
- **Objetivo Principal:** Habilitar la carga, almacenamiento y visualización de imágenes de productos en el sistema local (Dexie.js / React).
- **Criterio de Éxito:** 
    1. Base de datos Dexie actualizada a v10 con campo `imagen`.
    2. Utilidad de compresión funcionando (300px WebP).
    3. UI de creación permite subir/pegar fotos.
    4. El sistema no se ralentiza.

## 2. Especificaciones de Entrada/Salida (I/O)

### Entradas
- Archivos de imagen (JPG, PNG, WebP) subidos por el usuario o pegados del portapapeles.

### Salidas
- String Base64 optimizado (WebP, quality 0.8, resize 300px) guardado en `db.productos`.

## 3. Flujo Lógico (Algoritmo)

1.  **Actualización de Esquema (Dexie):**
    - Incrementar versión de `db.js`.
    - Añadir campo `imagen` a la tabla `productos` (no indexado para evitar overhead, solo storage).

2.  **Motor de Compresión (`src/utils/imageUtils.js`):**
    - Crear función `compressImage(file)`.
    - Usar HTML5 Canary (Canvas) para redimensionar a MAX 300x300.
    - Exportar como `image/webp` con calidad 0.7-0.8.

3.  **Interfaz de Carga (`ModalProducto.jsx` o `ProductBasicInfo.jsx`):**
    - Añadir zona de Drop/Click.
    - Manejar evento `onPaste` para Ctrl+V.
    - Visualizar la previsualización al instante.

4.  **Visualización en Listados:**
    - Crear componente `ProductAvatar` que muestre imagen o fallback de iniciales.

## 4. Herramientas y Librerías
- **Browser Native:** Canvas API, FileReader.
- **Iconos:** `lucide-react` (Image, Camera, Upload).

## 5. Restricciones y Casos Borde (Edge Cases)

- **Límites:** Imágenes > 5MB deben ser rechazadas antes?? No, deben ser procesadas. Pero si el *procesamiento* falla, rechazar.
- **Almacenamiento:** IndexedDB tiene límites variables (blob support). Guardar como Base64 string es más compatible pero ocupa ~30% más. Con compresión 20KB, es aceptable.
- **Quota:** Si el disco se llena, `QuotaExceededError`. Manejar con try-catch.

## 6. Protocolo de Errores y Aprendizajes
| Fecha | Error Detectado | Solución |
|-------|-----------------|----------|
| 21/01 | (Previsto) Base64 muy largo congela UI | **Solución:** Usar `requestAnimationFrame` o WebWorker si fuera necesario. Por ahora, Canvas sincrono para 1 imagen es ok. |

