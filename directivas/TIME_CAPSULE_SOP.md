# SOP: Sistema de Respaldo Total 'Time Capsule' ⏳🛡️

## 1. Misión
Garantizar la supervivencia absoluta de los datos de **Listo POS** ante fallos de hardware, robos o corrupción de datos locales, permitiendo una restauración total del estado del sistema (Dexie + LocalStorage) en menos de 2 minutos.

## 2. Arquitectura 'Digital Preservation'
- **Captura:** El sistema escanea todas las tablas de Dexie y llaves críticas de LocalStorage (licencia, usuarios, configuración).
- **Compresión:** Uso de `LZString` (UTF16) para minimizar el impacto en la cuota de red.
- **Fragmentación (Chunking):** 
    - Límite seguro: **900KB** por documento.
    - Los respaldos que superen este límite se dividen en fragmentos y se almacenan en una sub-colección indexada en Firestore (`backups/{terminalId}/chunks/`).
- **Inmunidad al Futuro:** El JSON incluye un encabezado `_meta` con la versión del esquema para permitir migraciones automáticas en el futuro.

## 3. Seguridad de Acceso
- **Exportación:** Requiere permiso `ADMIN_CONFIG`.
- **Restauración:** Requiere permiso `CONF_SISTEMA_EDITAR` (Nivel Master/Dueño), ya que implica una sobrescritura destructiva de la base de datos local.

## 4. Trampas Conocidas (Lecciones Aprendidas) 🚩
- **Race Condition en Carga:** No se debe iniciar la restauración hasta que el motor de sincronización esté en pausa para evitar colisiones.
- **Límites de Firestore:** Nunca intentar subir más de 1MB en un solo documento. El chunking de 450,000 caracteres UTF-16 es el estándar de seguridad.
- **Referencia a window.location.reload():** Es obligatoria tras la restauración para limpiar los Singletons de React Context y forzar la lectura del nuevo estado.

## 5. Protocolo de Verificación
1. Ejecutar "Respaldo Total (Nube)".
2. Verificar que aparezca un documento en la colección `backups` de la terminal correspondiente.
3. Verificar que si el tamaño es grande, existan documentos numerados en la sub-colección `chunks`.
4. Ejecutar "Restaurar Nube" y confirmar que los datos (usuarios, productos, ventas) coinciden exactamente con el respaldo.
