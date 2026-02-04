# Configuración Sistema y Seguridad - Guía Completa

## Propósito
Esta sección agrupa las **configuraciones críticas de seguridad, usuarios y mantenimiento del sistema**: gestión de equipo, roles, permisos RBAC, backup/restore de datos y salud de la base de datos.

## Cómo Acceder
1. Menú lateral → "Configuración" / "Preferencias"
2. Grupo **"SEGURIDAD Y SISTEMA"** incluye:
   - Mi Perfil/Equipo
   - Salud de Datos

---

## 👤 Sección 1: Mi Perfil y Gestión de Equipo

### Propósito
Administra usuarios del sistema, roles, permisos granulares (RBAC) y seguridad de acceso mediante PIN.

### Vista Principal: Mi Perfil

**Hero Card Superior** mostra:
- Avatar (iniciales del usuario)
- Nombre completo
- Rol asignado (CAJERO, SUPERVISOR, GERENTE, ADMIN, CUSTOM)
- Badge de rol (visual)
- Botones de acción:
  - **Cambiar PIN:** Actualiza tu código de acceso personal
  - **Actualizar Nombre:** Modifica tu nombre de usuario

---

### Cambiar Mi PIN

**Qué es:**
- Código numérico de 4-6 dígitos
- Requerido para acciones sensibles (eliminar ventas, cerrar caja, etc.)
- Personal e intransferible

**Cómo cambiar:**
1. Clic "Cambiar PIN" (ícono candado)
2. Modal solicita:
   - **PIN Actual:** Para validar identidad
   - **PIN Nuevo:** Mínimo 4 dígitos
   - **Confirmar PIN:** Repetir nuevo PIN

**Validaciones:**
- PIN actual debe ser correcto
- PIN nuevo debe tener 4-6 dígitos
- Confirmación debe coincidir
- No puede ser "0000" o secuencias obvias

**Confirmación:**
- "PIN actualizado con éxito"
- Se requiere el nuevo PIN inmediatamente para acciones seguras

**Cuándo cambiarlo:**
✅ Primera vez que accedes al sistema  
✅ Sospecha de compromiso de seguridad  
✅ Política de empresa (cada 30-90 días)  
✅ Después de compartirlo accidentalmente

---

### Actualizar Mi Nombre

**Cómo:**
1. Clic "Actualizar Nombre"
2. Input con nombre actual prellenado
3. Editar y confirmar

**Uso:**
- Aparece en tickets ("Atendido por: Juan Pérez")
- Visible en historial de ventas
- Aparece en reportes de actividad

---

### Gestión de Personal (Administradores Only)

**Requiere Permiso:** `CONF_USUARIOS_EDITAR`

#### Dos Tabs Superiores

**1. PERSONAL (Default)**
- Registro de nuevos empleados
- Lista de usuarios actuales
- Gestión de permisos

**2. REPORTE NÓMINA**
- Informe de ventas/comisiones por empleado
- Métricas de desempeño
- (Requiere `CONF_USUARIOS_EDITAR`)

---

### Registrar Nuevo Empleado

**Formulario (panel izquierdo):**

####Campos

**1. Nombre Completo**
- Texto libre
- Ejemplo: "María González"
- Aparecerá en tickets y sistema

**2. Usuario (Login)**
- Identificador único
- Solo letras, números, guiones
- Ejemplo: "mgonzalez", "empleado01"
- No se puede cambiar después

**3. PIN**
- 4-6 dígitos numéricos
- PIN temporal inicial
- Empleado debe cambiarlo al primer login

**4. Rol Predefinido (Select)**
Opciones:
- **CAJERO:** POS acceso, ventas básicas
- **SUPERVISOR:** Cajero + anular ventas + reportes
- **GERENTE:** Supervisor + inventario + reportes avanzados
- **ADMIN:** Acceso total al sistema
- **CUSTOM:** Permisos personalizados (seleccionar manualmente)

**Botón: "Registrar Empleado"**

#### Proceso

1. Sistema valida datos
2. Crea usuario en base de datos
3. Asigna rol y permisos
4. Muestra confirmación
5. Usuario aparece en lista inmediatamente

---

### Lista de Personal (panel derecho)

**Tabla muestra:**
- Avatar (iniciales)
- Nombre completo
- Usuario (ID)
- Rol (badge visual)
- Acciones (iconos)

#### Acciones por Empleado

**🔄 Resetear PIN**
- Cambia PIN a uno temporal (ej: "1234")
- Requiere confirmación con SweetAlert
- Empleado debe cambiarlo en siguiente login
- **Uso:** Empleado olvidó su PIN

**✏️ Editar Nombre**
- Modal con input prellenado
- Actualiza nombre del empleado
- **Uso:** Corrección de errores, nombres duplicados

**🔐 Gestionar Permisos**
- Abre matriz de permisos (solo para CUSTOM)
- Para roles predefinidos: muestra permisos del rol (readonly)
- **Uso:** Customizar acceso granular

**💼 Ficha Financiera**
- Modal con estadísticas del empleado:
  - Total ventas realizadas
  - Comisiones ganadas
  - Promedio de tickets
  - Best sellers
- **Uso:** Evaluar desempeño

**🗑️ Despedir / Eliminar**
- Requiere confirmación crítica
- Solo si el empleado NO tiene ventas activas
- Si tiene historial: se marca como "inactivo" en lugar de borrar
- **Uso:** Rotación de personal

---

### Sistema de Roles y Permisos (RBAC)

#### Qué es RBAC

**Role-Based Access Control** = Control de Acceso Basado en Roles

**Concepto:**
- Cada usuario tiene un **Rol**
- Cada rol tiene **Permisos** específicos
- Permisos controlan qué puede hacer cada usuario

#### Roles Predefinidos

**🟢 CAJERO**
Permisos:
- `POS_ACCESO` - Usar punto de venta
- `POS_CONCILIACION` - Cierre de caja
- `VENTAS_VER` - Ver historial de sus ventas
- `CLIENTES_VER` - Consultar clientes

**Restricciones:**
- NO ver costos/ganancias
- NO modificar inventario
- NO anular ventas de otros
- NO acceder a configuración

---

**🟡 SUPERVISOR**
Incluye todos los permisos de CAJERO +
- `CLIENTES_EDITAR` - Gestionar clientes
- `VENTAS_ANULAR` - Anular cualquier venta
- `REP_VER_TOTAL_DIARIO` - Ver reportes diarios
- `VENTAS_MODIFICAR` - Editar ventas

**Restricciones:**
- NO ver costos/márgenes
- NO modificar configuración general
- NO gestionar usuarios

---

**🔵 GERENTE**
Incluye todos los permisos de SUPERVISOR +
- `INV_EDITAR` - CRUD completo de inventario
- `INV_VER_COSTOS` - Ver costos y márgenes
- `REP_VER_DASHBOARD` - Dashboard completo
- `ADMIN_AUDITORIA` - Acceso a Kardex
- `CONF_NEGOCIO_VER` - Ver configuraciones

**Restricciones:**
- NO gestionar usuarios
- NO modificar configuraciones críticas
- NO acceso a respaldos de sistema

---

** ADMIN**
**Acceso Total** a todo el sistema:
- Todas las funciones sin restricciones
- Gestionar usuarios
- Configuración completa
- Backup/Restore
- Auditoría total

---

**⚙️ CUSTOM**
**Personalizado:**
- Inicia SIN PERMISOS
- Administrador selecciona manualmente cada permiso
- Flexibilidad máxima
- **Uso:** Roles especiales (auditor, contador, etc.)

---

### Matriz de Permisos (CUSTOM Role)

**Cómo acceder:**
1. Lista de Personal → Usuario con rol CUSTOM
2. Clic "🔐 Gestionar Permisos"
3. Modal muestra matriz completa

**Estructura:**

#### Grupos de Permisos

**📦 PUNTO DE VENTA**
- `POS_ACCESO` - Acceder al POS
- `POS_DESCUENTOS` - Aplicar descuentos manuales
- `POS_CONCILIACION` - Cerrar caja/turno

**📊 VENTAS E HISTORIAL**
- `VENTAS_VER` - Ver historial completo
- `VENTAS_ANULAR` - Anular ventas
- `VENTAS_MODIFICAR` - Editar ventas guardadas  
- `VENTAS_REIMPRIMIR` - Reimprimir tickets

**👥 CLIENTES**
- `CLIENTES_VER` - Consultar clientes
- `CLIENTES_EDITAR` - CRUD clientes
- `CLIENTES_CREDITO` - Gestionar créditos/deudas

**📦 INVENTARIO**
- `INV_VER` - Ver productos
- `INV_EDITAR` - Crear/modificar productos
- `INV_ELIMINAR` - Borrar productos
- `INV_VER_COSTOS` - Ver costos/márgenes

**📈 REPORTES Y ANÁLISIS**
- `REP_VER_DASHBOARD` - Dashboard KPIs
- `REP_VER_TOTAL_DIARIO` - Reportes diarios
- `REP_EXPORTAR` - Exportar reportes

**⚙️ CONFIGURACIÓN**
- `CONF_NEGOCIO_VER/EDITAR` - Datos del negocio
- `CONF_FINANZAS_VER/EDITAR` - Métodos de pago, tasas
- `CONF_USUARIOS_VER/EDITAR` - Gestión de equipo
- `CONF_SISTEMA_VER/EDITAR` - Salud de datos, respaldos

**🛡️ ADMINISTRACIÓN AVANZADA**
- `ADMIN_AUDITORIA` - Kardex y auditorías
- `ADMIN_CONFIG` - Configuraciones críticas

**Interfaz:**
- Checkboxes por permiso
- Descripción breve de cada uno
- Agrupados visualmente
- Botón "Guardar Permisos"

---

### Modo Solo Lectura

**Usuarios sin `CONF_USUARIOS_EDITAR`:**
- Ven su propio perfil
- Pueden cambiar su PIN
- Pueden actualizar su nombre
- **NO ven** formulario de registro
- **NO ven** lista de personal
- Banner: "No tienes permisos para gestionar el equipo"

---

## 🗄️ Sección 2: Salud de Datos

### Propósito
Monitorea el estado del sistema, realiza respaldos, restaura datos y optimiza la base de datos.

---

### Panel de Información del Sistema

#### Tres Métricas Principales (cards superiores)

**1. Integridad**
- Estado: ÓPTIMO / REVISAR
- Indicador verde/rojo
- Monitorea salud de archivos

**2. Rendimiento**
- Estado: ALTO / MEDIO / BAJO
- Basado en saturación de DB
- Latencia de escritura

**3. Seguridad**
- ACTIVA (siempre)
- "Protocolo Fénix v4"
- Sistema de backup automático

---

### Almacenamiento Local (panel izquierdo)

#### Información Mostrada

**Espacio Usado:**
- Barra de progreso visual (DNA-style)
- X MB / Y MB (usados / máximo)
- Porcentaje de saturación

**Límite Máximo:**
- IndexedDB: ~50 MB (navegador)
- Electron App: Sin límite estricto

#### Codificación Visual

**🟢 Verde (0-50%):**
- Saludable
- No requiere acción

**🟡 Amarillo (50-80%):**
- Advertencia
- Considerar limpieza

**🔴 Rojo (80%+):**
- Crítico
- Purga recomendada urgente

---

#### Registros Totales

- Número de ventas en base de datos
- Incluye aprobadas, anuladas, crédito

---

#### Piloto Automático

**Toggle ON/OFF**

**Cuando está ACTIVO:**
- Sistema purga automáticamente ventas antiguas
- Umbral: 5000 ventas (navegador), 1500 (app)
- Mantiene últimos 30 días
- No toca ventas a crédito (deuda pendiente)
- Genera backup antes de purgar

**Cuando está DESACTIVADO:**
- No hay limpieza automática
- Usuario controla mantenimiento manualmente

**Recomendación:**
✅ ON para negocios de alto volumen  
❌ OFF para control manual total

---

####Sincronización Nube

**Toggle ON/OFF**

**Qué controla:**
- Envío de datos en tiempo real a Companion

 App (Listo GO)
- Sincronización de ventas, inventario, clientes

**Estados:**
- ⚡ ACTIVO: Sincronizando normalmente
- ⏸️ PAUSADO: Sin envío de datos

**Cuándo pausar:**
- Internet lento (reduce lag)
- Problemas de conectividad
- Testing/pruebas locales

**Nota:** Backup maestro (Firestore) es independiente de este toggle

---

### Mantenimiento Profundo (panel derecho)

**Botón: "OPTIMIZAR BASE DE DATOS"**

#### Qué hace

1. Archiva ventas antiguas (> X días)
2. Genera backup JSON automático
3. Borra solo ventas aprobadas antiguas
4. NO toca ventas a crédito (deuda pendiente)
5. Marca historial como archivado

#### Proceso

1. Clic en botón
2. Requiere PIN de seguridad
3. Modal solicita: "Días a conservar" (default: 30)
4. Muestra alertas:
   - "Las ventas a Crédito NO se tocarán"
   - "Se generará respaldo JSON automático"
5. Confirmar con "INICIAR LIMPIEZA"
6. Progreso: "OPTIMIZANDO..."
7. Confirmación: "Registros archivados: N"

#### Archivo Generado

- JSON guardado en carpeta `backups/`
- Nombre: `archivo_YYYY-MM-DD_HH-mm.json`
- Contiene todas las ventas purgadas
- Puede restaurarse manualmente si es necesario

#### Cuándo usar

✅ Saturación > 80%  
✅ Rendimiento lento  
✅ Mantenimiento mensual programado  
✅ Antes de migrar a nuevo dispositivo

---

### Blindaje Maestro (footer section)

**Panel oscuro inferior con 4 opciones:**

---

#### 1. Exportar Local (Descarga JSON)

**Qué hace:**
- Genera archivo JSON con TODA la base de datos
- Incluye: ventas, productos, clientes, configuración, usuarios

**Contenido:**
```json
{
  "productos": [...],
  "ventas": [...],
  "clientes": [...],
  "usuarios": [...],
  "config": {...}
}
```

**Proceso:**
1. Clic "EXPORTAR"
2. Sistema recopila datos
3. Descarga automática: `listo_pos_backup_YYYY-MM-DD.json`
4. Guardado en carpeta de descargas

**Uso:**
- Backup manual antes de cambios críticos
- Migración a otro dispositivo
- Archivo histórico
- Auditoría externa

---

#### 2. Importar Local (Restaurar JSON)

**Qué hace:**
- Sube archivo JSON previamente exportado
- Restaura TODA la base de datos

**Proceso:**
1. Clic "IMPORTAR"
2. Selector de archivos (solo .json)
3. Sistema valida estructura
4. Confirmación:
   - "¿Reemplazar datos actuales?"
   - "Esta acción NO se puede deshacer"
5. Importa datos
6. Reinicia sistema
7. Login nuevamente

**⚠️ ADVERTENCIAS:**
- Reemplaza TODO (ventas, productos, usuarios, configuración)
- NO es merge (es reemplazo total)
- Crear backup antes de importar

**Uso:**
- Restaurar after fallo crítico
- Migrar datos de otro dispositivo
- Revertir a estado anterior

---

#### 3. Guardar Ahora (Backup Nube - Firestore)

**Qué hace:**
- Sube instantáneamente TODA la base de datos a Firestore
- Backup en nube seguro y cifrado
- Asociado a tu System ID

**Proceso:**
1. Clic "GUARDAR AHORA"
2. Requiere PIN de seguridad (`ADMIN_CONFIG`)
3. Loading: "GUARDANDO..."
4. Confirmación:
   - "Nube Sincronizada"
   - "Respaldo exitoso (X MB)"
   - "Datos blindados en Firestore"
5. Timestamp actualizado

**Frecuencia Recomendada:**
- Diariamente (negocios de alto volumen)
- Semanalmente (negocios estándar)
- Antes de cambios mayores (siempre)

**Ventajas:**
✅ Accesible desde cualquier dispositivo  
✅ Protección contra fallo de hardware  
✅ Versionado automático  
✅ Cifrado en tránsito y reposo

---

#### 4. Restaurar (Download desde Firestore)

**Qué hace:**
- Descarga el último backup de Firestore
- Reemplaza base de datos local

**Proceso:**
1. Clic "RESTAURAR"
2. Requiere PIN (`CONF_SISTEMA_EDITAR`)
3. Diálogo de confirmación:
   - "⚠ DESCARGA DE DATOS"
   - "Se descargarán ventas, inventario y usuarios"
   - "El sistema se reiniciará al finalizar"
4. Confirmar: "INICIAR DESCARGA"
5. Loading: "Restaurando..."
6. Sistema reinicia automáticamente
7. Login con usuarios restaurados

**Cuándo usar:**
- Recuperación de desastre (pérdida de datos)
- Migrar a nuevo dispositivo
- Sincronizar múltiples terminales
- Revertir después de importación incorrecta

**⚠️ ADVERTENCIA CRÍTICA:**
- Reemplaza TODA la BD local
- NO deshacible
- Asegurar que backup en nube sea correcto

---

### Indicador de Última Sincronización

**Badge verde (si existe backup):**
- "Sincronizado: DD/MM/YYYY HH:MM:SS"
- Indicador pulsante verde
- Ubicado bajo "Blindaje Maestro"

**Si NO hay backup:**
- No se muestra badge
- Recomendación: hacer primer backup

---

## ⚙️ Sistema de Permisos (Resumen)

### Por Sección

**Mi Perfil/Equipo:**
- `CONF_USUARIOS_VER` - Ver configuración de usuarios
- `CONF_USUARIOS_EDITAR` - Crear/editar/eliminar empleados

**Salud de Datos:**
- `CONF_SISTEMA_VER` - Ver estadísticas
- `CONF_SISTEMA_EDITAR` - Exportar/Importar/Backup
- `ADMIN_CONFIG` - Optimizar BD, Backup nube

---

## 📋 Casos de Uso Comunes

### Caso 1: Crear Nuevo Empleado Cajero

```
Objetivo: Agregar cajero para turno nocheche

1. Config → Mi Perfil/Equipo
2. Tab: PERSONAL
3. Formulario:
   - Nombre: "Carlos Ruiz"
   - Usuario: "cruiz"
   - PIN: "5678" (temporal)
   - Rol: CAJERO
4. Clic "Registrar Empleado"
5. Carlos aparece en lista
6. Al primer login, sistema le pide cambiar PIN
```

---

### Caso 2: Empleado Olvidó PIN

```
Problema: María no recuerda su PIN

1. Config → Mi Perfil/Equipo
2. Buscar "María" en lista
3. Clic en ícono "🔄 Resetear PIN"
4. Confirmación: "¿Resetear PIN de María?"
5. Confirmar
6. PIN cambiado a "1234" (temporal)
7. Informar a María
8. María cambia PIN en siguiente login
```

---

### Caso 3: Backup Antes de Actualización

```
Objetivo: Proteger datos antes de actualizar app

1. Config → Salud de Datos
2. Scroll a "Blindaje Maestro"
3. Clic "GUARDAR AHORA"
4. Ingresar PIN de admin
5. Esperar confirmación
6. Verificar timestamp actualizado
7. Proceder con actualización
```

---

### Caso 4: Base de Datos Saturada (90%)

```
Problema: Rendimiento lento, storage al 90%

1. Config → Salud de Datos
2. Ver barra roja de saturación
3. Panel "Mantenimiento Profundo"
4. Clic "OPTIMIZAR BASE DE DATOS"
5. Ingresar PIN
6. Días a conservar: 30
7. Confirmar limpieza
8. Esperar: "Registros archivados: 4500"
9. Satación baja a ~40%
10. Rendimiento restaurado
```

---

### Caso 5: Migrar Datos a Nuevo Dispositivo

```
Objetivo: Pasar de PC vieja a PC nueva

DISPOSITIVO VIEJO:
1. Config → Salud de Datos
2. Clic "GUARDAR AHORA" (Firestore)
3. Confirmar backup exitoso

DISPOSITIVO NUEVO:
1. Instalar Listo POS
2. Login como admin (será admin default)
3. Config → Salud de Datos
4. Clic "RESTAURAR"
5. Confirmar descarga
6. Sistema reinicia
7. Login con usuarios restaurados
8. ¡Listo! Todos los datos migrados
```

---

## Preguntas Frecuentes

**Q: ¿Puedo tener múltiples administradores?**  
A: Sí, puedes asignar rol ADMIN a varios usuarios.

**Q: ¿Qué pasa si borro un empleado con ventas?**  
A: Sistema NO permite borrar. Se marca como "inactivo" y no aparece en selección, pero historial queda intacto.

**Q: ¿Cuál es la diferencia entre Exportar Local y Guardar en Nube?**  
A: **Exportar** = JSON en tu PC, manual. **Guardar Nube** = Firestore, automático, accesible desde cualquier dispositivo.

**Q: ¿Los backups incluyen imágenes de productos?**  
A: Sí, si usas base64. Si usas URLs externas, solo se guarda la URL (no la imagen).

**Q: ¿Se puede recuperar ventas después de "Optimizar BD"?**  
A: Sí, el archivo JSON generado durante la purga contiene las ventas archivadas. Puedes importarlo manualmente.

**Q: ¿El Piloto Automático elimina permanentemente las ventas?**  
A: Sí, PERO genera backup automático antes. Las ventas a crédito NUNCA se tocan.

**Q: ¿Cuántos backups en Firestore se guardan?**  
A: Solo el último. Cada "GUARDAR AHORA" reemplaza el anterior. Para versiones históricas, usa Exportar Local.

---

## Troubleshooting

### Problema: No puedo registrar empleado
**Solución:**
- Verifica permiso `CONF_USUARIOS_EDITAR`
- Si ves solo tu perfil, no tienes acceso
- Contacta administrador

### Problema: Backup en nube falla
**Solución:**
- Verifica conexión a internet
- Revisa consola del navegador (errores)
- Asegura que Firestore esté configurado correctamente
- Intenta Exportar Local como alternativa

### Problema: Importación falla con "Estructura inválida"
**Solución:**
- Verifica que el archivo sea JSON válido
- Debe tener claves: productos, ventas, clientes, usuarios, config
- No uses archivos editados manualmente
- Usa solo archivos generados por "Exportar"

### Problema: Optimización no libera espacio
**Solución:**
- Sistema solo borra ventas aprobadas antiguas
- Ventas a crédito NO se borran (normal)
- Verifica que tengas ventas > X días
- Revisa archivo generado en carpeta backups/

---

## Mejores Prácticas

### Gestión de Usuarios
✅ Asigna roles según responsabilidad real  
✅ Usa CUSTOM solo cuando sea necesario  
✅ Fuerza cambio de PIN en primer login  
✅ Revisa permisos trimestralmente  
✅ Desactiva usuarios inactivos (no borrar)

### Seguridad
✅ PIN de admin debe ser único y complejo  
✅ No compartir PINs entre usuarios  
✅ Cambiar PINs cada 60-90 días  
✅ Monitorear quién anula ventas (auditoría)

### Backups
✅ Backup en nube DIARIO para alto volumen  
✅ Exportar local SEMANAL como respaldo secundario  
✅ Antes de cualquier cambio mayor: backup manual  
✅ Probar restauración al menos una vez al mes  
✅ Guardar exports en múltiples ubicaciones (USB, Drive, etc.)

### Mantenimiento
✅ Piloto Automático ON para negocios activos  
✅ Optimizar BD cuando saturación > 70%  
✅ Revisar "Salud de Datos" semanalmente  
✅ Conservar al menos 30 días de historial  
✅ Archivar ventas viejas trimestralmente (3+ meses)

---

## Notas Técnicas

### Estructura de Backup JSON

```json
{
  "version": "2.0",
  "timestamp": "2026-02-03T12:00:00Z",
  "systemID": "SYSTEM_ABC123",
  "productos": [ ... ],
  "ventas": [ ... ],
  "clientes": [ ... ],
  "usuarios": [
    {
      "id": "user_001",
      "nombre": "Admin",
      "usuario": "admin",
      "pin": "hashed_pin",
      "rol": "ADMIN"
    }
  ],
  "configuracion": { ... },
  "metodosPago": [ ... ]
}
```

### Límites IndexedDB

- Chromium: ~50 MB / dominio
- Firefox: ~50 MB (solicitableasta 100 MB)
- Safari: ~50 MB
- Electron: Sin límite (solo disco)

### Firestore Limits

- Documento máximo: 1 MB
- Listo POS divide en múltiples documentos si excede
- Lectura: 50K/día (gratis)
- Escritura: 20K/día (gratis)
