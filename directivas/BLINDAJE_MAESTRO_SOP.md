# SOP: Blindaje Maestro (Respaldo en Nube Firestore) ☁️🛡️

## 1. Misión
Garantizar la continuidad operativa de cualquier negocio usando **Listo POS** mediante la preservación digital de toda su estructura de datos (Ventas, Inventario, Clientes, Usuarios y Licencias).

## 2. Puntos Clave del Sistema
- **Motor de Compresión:** Utiliza `LZString UTF16` para reducir el payload JSON en un ~80%.
- **Almacenamiento:** Firestore (Colección `backups`).
- **Seguridad:** Autenticación anónima vinculada al `machineId` de la terminal.
- **Límite de Seguridad:** 1MB por documento (Arquitectura optimizada para negocios de alta rotación sin costos operativos de Storage).

## 3. UI/UX: Estándares de Presentación
- **Branding:** No usar términos técnicos como "Dexie" o "Firestore" en la interfaz del cliente.
- **Acciones:**
    - `GUARDAR`: Envía el estado actual comprimido a la nube.
    - `RESTAURAR`: Descarga y aplica el respaldo (Acción destructiva supervisada).
- **Feedback:** Mostrar siempre el indicador de "Último Respaldo" para dar tranquilidad al usuario.

## 4. Troubleshooting
- **Error 1MB:** Si el respaldo es demasiado grande, se debe instruir al cliente a contactar soporte técnico para una segmentación manual o migración a Storage (Requiere pago).
- **Inconsistencia tras Restaurar:** El sistema DEBE reiniciar la aplicación (`window.location.reload`) post-restauración para refrescar el estado global de React.
