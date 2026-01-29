# DIRECTIVA: CONSTRUCCIÓN Y DESPLIEGUE DE APLICACIÓN (BUILD)

> **ID:** SYS-BUILD-001
> **Script Asociado:** scripts/build_app.py
> **Última Actualización:** 2026-01-22
> **Estado:** ACTIVO

---

## 1. Objetivos y Alcance
- **Objetivo Principal:** Generar el ejecutable (.exe) de Listo Master para Windows.
- **Criterio de Éxito:** 
    1. Generación exitosa de `dist_electron/win-unpacked/Listo Master.exe`.
    2. Ausencia de errores de "symlink" o permisos durante `electron-builder`.

## 2. Especificaciones de Entrada/Salida (I/O)

### Entradas
- Código fuente en `src/` y `electron/`.
- Configuración en `package.json` y `vite.config.js`.

### Salidas
- **Directorio de Salida:** `dist_electron/`
- **Artefactos Clave:**
    - `dist_electron/win-unpacked/` (Ejecutable descomprimido para pruebas rápidas)
    - `dist_electron/Listo Master Setup <version>.exe` (Instalador, si se genera)

## 3. Flujo Lógico (Algoritmo)

1.  **Limpieza Previa (Opcional):**
    - Eliminar `dist/` y `dist_electron/` para asegurar un build limpio.

2.  **Construcción (Build):**
    - Ejecutar `npm run electron:build`.
    - Esto dispara: `vite build` -> `electron-builder`.

3.  **Manejo de Cache (Critical Path):**
    - Si `electron-builder` falla con errores de "winCodeSign" o "symlink", **LIMPIAR CACHÉ**.
    - Ruta de Caché: `%LOCALAPPDATA%\electron-builder\Cache`.
    - Acción: Borrar carpeta `winCodeSign` o toda la cache.

## 4. Restricciones y Casos Borde
- **Permisos de Windows:** La extracción de herramientas de firma (winCodeSign) a veces requiere permisos elevados o Modo Desarrollador si intenta crear symlinks.
- **Antivirus:** Puede bloquear la creación del .exe. Añadir exclusiones si falla silenciosamente.

## 5. Protocolo de Errores
| Error | Solución |
|-------|----------|
| `Cannot create symbolic link` | Borrar `%LOCALAPPDATA%\electron-builder\Cache`. Reintentar. |
| `Chunk size warning` | Ajustar `chunkSizeWarningLimit` en `vite.config.js`. |
| `EBUSY` o `EPERM` | Cerrar VS Code / Terminales bloqueantes. Ejecutar como Admin si persiste. |
