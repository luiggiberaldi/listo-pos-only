# DIRECTIVA: GESTIÓN DE ASSETS DE APLICACIÓN

> **ID:** SYS-ASSETS-001
> **Script Asociado:** scripts/update_app_icon.py
> **Última Actualización:** 2026-01-22
> **Estado:** ACTIVO

---

## 1. Objetivos y Alcance
- **Objetivo Principal:** Estandarizar el proceso de actualización de iconos y recursos estáticos de la aplicación Electron.
- **Criterio de Éxito:** 
    1. El icono se actualiza en todas las ubicaciones críticas (`public/`, `build/`).
    2. No se rompen las referencias en `package.json` o `main.js`.

## 2. Especificaciones de Entrada/Salida (I/O)

### Entradas
- Ruta absoluta al nuevo archivo de icono (`.ico`).

### Salidas
- Archivos reemplazados en:
    - `public/ICONO.ico` (Runtime Window)
    - `build/ico.ico` (Installer/Build Artifacts)

## 3. Flujo Lógico (Algoritmo)

1.  **Validación:**
    - Verificar que el archivo fuente existe y es una extensión válida (`.ico`, `.png`).
    - Verificar que las carpetas destino existen (`public/`, `build/`).

2.  **Backup (Opcional pero recomendado):**
    - Crear copia `_backup` de los iconos existentes antes de sobrescribir.

3.  **Despliegue:**
    - Copiar fuente -> `public/ICONO.ico` (Mantener nombre para compatibilidad con main.js).
    - Copiar fuente -> `build/ico.ico` (Mantener nombre para compatibilidad con electron-builder).

## 4. Restricciones y Casos Borde
- **Nombres de Archivo:** NO cambiar los nombres de destino (`ICONO.ico`, `ico.ico`) a menos que se refactorice `main.js` y `package.json` simultáneamente.
- **Cache de Windows:** Windows cachea agresivamente los iconos. Es posible que no se vea el cambio inmediatamente en el Explorador sin reiniciar `explorer.exe` o limpiar caché.

## 5. Protocolo de Errores
| Error | Solución |
|-------|----------|
| Archivo fuente no encontrado | Abortar y notificar ruta incorrecta. |
| Permiso denegado | Verificar que ningún proceso (build, IDE) tenga bloqueado el archivo. |
