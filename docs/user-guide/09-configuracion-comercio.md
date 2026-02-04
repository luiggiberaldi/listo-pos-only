# Configuración Comercio - Guía Completa

## Propósito
Esta sección de Configuración agrupa todas las **personalizaciones de identidad comercial y apariencia visual** del sistema: datos del negocio, diseño de tickets e interfaz de usuario.

## Cómo Acceder
1. Menú lateral → "Configuración" / "Preferencias"
2. Panel lateral izquierdo muestra 3 grupos
3. Grupo **"COMERCIO"** incluye:
   - Mi Negocio
   - Diseño Ticket
   - Apariencia UI

---

## 📋 Sección 1: Mi Negocio

### Propósito
Configura la información legal y comercial que aparece en facturas, tickets y reportes.

### Campos Disponibles

#### 1. Nombre Legal / Razón Social (OBLIGATORIO)
**Qué es:**
- Nombre oficial del comercio
- Aparece en tickets, reportes y encabezados

**Ejemplo:**
```
Inversiones Globales C.A.
Bodega El Ahorro
```

**Validación:**
- Campo obligatorio
- Si está vacío, aparece alerta al guardar

#### 2. RIF / Documento Fiscal
**Qué es:**
- Registro de Identificación Fiscal (Venezuela: RIF)
- Identificador tributario del negocio

**Formato:**
- Auto-capitaliza (J-12345678-0)
- Venezuela: `J-XXXXXXXX-X` o `V-XXXXXXXX-X`

**Uso:**
- Aparece en facturas fiscales
- Requerido para cumplimiento tributario

#### 3. Teléfono
**Qué es:**
- Número de contacto del negocio

**Formato Automático:**
- Sistema aplica máscara automáticamente
- `(0412) 123-4567`
- Solo necesitas escribir los números

**Ejemplo:**
```
Escribes: 04121234567
Sistema muestra: (0412) 123-4567
```

#### 4. Dirección Fiscal
**Qué es:**
- Ubicación física del comercio
- Aparece en tickets y facturas

**Formato:**
- Campo de texto largo (textarea)
- Acepta múltiples líneas

**Ejemplo:**
```
Av. Principal, Centro Comercial Los Robles
Local 45, Piso 2
Caracas, Distrito Capital
```

### Vista Previa en Tiempo Real

**Lado derecho del formulario:**
- Vista previa simulada del ticket
- Actualización instantánea al escribir
- Formato térmico realista (papel beige)

**Incluye:**
- Logo "LISTO POS" (demo)
- Tu nombre comercial
- RIF formateado
- Teléfono con máscara
- Dirección completa
- Separadores con estilo

### Vinculación con Listo GO App

**Qué es:**
- ID único para conectar app móvil
- Permite monitoreo remot el tiempo real

**Componentes:**
- **ID de Vinculación:** Código alfanumérico único
- **Código QR:** Para escanear desde app
- **Estado de Sync:** Indicador (En Línea / Sincronizando / Error)

**Cómo usar:**
1. Instala Listo GO en tu smartphone
2. Escanea el código QR
3. O copia manualmente el ID de vinculación
4. App se conecta automáticamente

**Estados:**
- 🟢 **En Línea:** Sync funcionando correctamente
- 🟡 **Sincronizando:** Transferencia de datos en curso
- 🔴 **Error de Sync:** Problema de conexión

**Copiar ID:**
- Haz clic en el ID (se vuelve verde)
- O botón "COPIAR ID"
- Confirmación visual al copiar

### Guardar Cambios

**Botón flotante inferior derecha:**
- "GUARDAR CAMBIOS" (verde esmeralda)
- Solo visible si tienes permisos de edición
- Confirmación: "Configuración Actualizada" (1 segundo)

### Permisos

**Ver:** `CONF_NEGOCIO_VER`
- Puedes ver todos los datos
- No puedes modificar

**Editar:** `CONF_NEGOCIO_EDITAR`
- Puedes modificar todos los campos
- Botón "Guardar" habilitado

**Modo Solo Lectura:**
- Badge "SOLO LECTURA" visible
- Campos deshabilitados
- Botón "Copiar" sigue funcionando

### Iconos Visuales

- 🏢 **Edificio:** Nombre del negocio
- 📋 **Documento:** RIF
- 📞 **Teléfono:** Número de contacto
- 📍 **Pin:** Dirección

---

## 🖨️ Sección 2: Diseño Ticket

### Propósito
Personaliza el formato, contenido y estilo visual de los tickets/facturas impresas.

### Interfaz
- **Panel Izquierdo:** Controles de configuración
- **Panel Derecho:** Vista Previa en Tiempo Real

---

### Subsección: Economía y Moneda

#### 1. Precio en Productos
**Opciones:**
- **Solo Dólares ($):** Productos muestran solo precio en USD
- **Solo Bolívares (Bs):** Productos solo en VES
- **Ambos / Mixto:** Precio dual `$3.50 / Bs 100`

**Recomendación:**
- Mixto para Venezuela (dolarización)
- Solo $ para países con moneda única

#### 2. Totales Finales
**Qué muestra:**
- Formato del total a pagar al final del ticket

**Opciones:**
- **Solo Dólares:** `TOTAL: $125.50`
- **Solo Bolívares:** `TOTAL: Bs 3,600`
- **Ambos:** Ambas monedas

#### 3. Mostrar Tasa de Cambio
**Switch ON/OFF**

**Si está activado:**
- Muestra tasa aplicada en el ticket
- Ejemplo: `Tasa: 1$ = 36.00 Bs`

**Útil para:**
- Transparencia con clientes
- Justificar cambio de precios
- Requerimientos contables

---

### Subsección: Geometría

#### 1. Margen Lateral (X)
**Qué controla:**
- Espacio horizontal desde los bordes
- Rango: 0-15mm

**Uso:**
- Ajusta si impresora corta texto
- Default: 0mm (sin margen)

#### 2. Margen Superior (Y)
**Qué controla:**
- Espacio al inicio del ticket
- Rango: 0-10mm

**Uso:**
- Evita que logo quede muy arriba
- Compensar guillotina de impresora

#### 3. Corte de Papel (Feed)
**Qué controla:**
- Avance de papel después de imprimir
- Rango: 0-100px

**Uso:**
- Define cuánto papel "sobrante" queda
- Facilita rasgar el ticket

**Recomendado:**
- 30-50px para impresoras térmicas
- 0px si corte es automático

#### 4. Estilo de Separadores
**Opciones:**
- **Guiones:** `- - - - - - -`
- **Puntos:** `. . . . . . .`
- **Sólido:** `___________`
- **Doble:** `===========`

**Uso:**
- Separar secciones del ticket
- Mejora legibilidad

---

### Subsección: Tipografía

#### 1. Familia de Fuente
**Opciones:**
- **Clásica:** Courier New (tradicional)
- **Moderna:** Arial / Helvetica (legible)
- **Compacta:** Condensed (ahorra espacio)

**Botones táctiles:**
- Clic para cambiar
- Preview actualiza al instante

#### 2. Tamaño Fuente
**Rango:** 9-16px
**Slider continuo**

**Recomendado:**
- 11px: Balance espacio/legibilidad
- 13px+: Clientes con dificultad visual
- 9px: Tickets muy largos (muchos productos)

#### 3. Espaciado de Línea
**Rango:** 0.8x - 2.0x
**Qué controla:** Altura entre líneas

**Uso:**
- 1.1x: Compacto (default)
- 1.5x+: Más legible (espaciado amplio)
- 0.8x: Ultra-compacto (ahorra papel)

---

### Subsección: Marca

#### 1. Tamaño Logo
**Rango:** 10% - 150%
**Qué controla:** Escala del logo en ticket

**Uso:**
- 60%: Default equilibrado
- 100%+: Logo prominente
- 30%: Logo discreto (esquina)

#### 2. Contraste Logo
**Rango:** 0.5 - 2.0
**Qué controla:** Intensidad de la imagen

**Uso:**
- 1.0: Normal
- 1.5+: Logo más oscuro/contrastado
- 0.7: Logo sutil (marca de agua)

#### 3. Marca de Agua
**Configuraciones:**

**Tamaño:** 20%-200%
- Logo de fondo del ticket
- Branding sutil

**Opacidad:** 0-0.5
- Transparencia del watermark
- 0.1: Apenas visible
- 0.3: Visible pero no intrusivo

**Posición Y:** -200px a +200px
- Desplazamiento vertical
- Centrar o mover hacia arriba/abajo

---

### Subsección: Contenido (Datos)

**Switches ON/OFF para cada elemento:**

#### Elementos Visuales
- **Logo:** Mostrar logotipo en encabezado
- **Dirección:** Incluir dirección del negocio
- **RIF/NIT:** Mostrar identificador fiscal

#### Datos de Transacción
- **Cliente:** Nombre del cliente (si fue seleccionado)
- **Vendedor:** Usuario que procesó la venta
- **Impuestos:** Desglose de IVA

#### Impuestos Especiales
- **Desglose IGTF:** Impuesto bancario (3%)
  - Solo para pagos con TDC/Transferencia
  - Venezuela only

---

### Mensajes Personalizados

#### 1. Mensaje Cabecera
**Dónde aparece:** Después del logo, antes de productos

**Uso:**
- Promociones: "¡20% OFF en toda la tienda!"
- Horarios: "Lunes a Sábado: 8am-6pm"
- Política: "No se aceptan devoluciones sin factura"

**Límite:** 2 líneas (recomendado)

#### 2. Mensaje Pie de Página
**Dónde aparece:** Al final del ticket

**Uso predeterminado:**
- Si está vacío: Mensaje legal automático

**Ejemplos:**
```
¡Gracias por su compra! Vuelva pronto
Síguenos en Instagram @tunegocio
```

---

### Vista Previa en Tiempo Real

**Panel derecho (solo escritorio):**
- Simulación de ticket térmico
- Actualización instantánea
- Vista realista con papel beige y bordes dentados

**Incluye:**
- Logo demo "LISTO POS"
- Tu nombre comercial (live)
- Datos simulados de venta
- Todos los ajustes aplicados

**Interacción:**
- Cada cambio se refleja inmediatamente
- Sin necesidad de guardar para previsualizar

---

### Guardar Configuración

**Botón "GUARDAR CONFIGURACIÓN 3.1":**
- Parte inferior del panel izquierdo
- Color negro/blanco según tema
- Confirmación visual al guardar

---

## 🎨 Sección 3: Apariencia UI

### Propósito
Controla la experiencia visual y ergonómica de la interfaz del sistema para todos los usuarios.

---

### Resolución Activa

**Panel superior derecho:**
- Muestra resolución actual de tu pantalla
- Ejemplo: `1920 x 1080`
- Actualización automática al cambiar ventana

---

### Escala de Interfaz (Zoom)

#### Qué Controla
- Tamaño global de textos y botones
- Rango: 80% - 150%

#### Controles
- **Botón -** (Zoom Out): Reduce 10%
- **Barra de progreso:** Visual del nivel actual
- **Botón +** (Zoom In): Aumenta 10%
- **Indicador numérico:** Muestra porcentaje exacto

#### Usos
- **80%-90%:** Pantallas pequeñas, maximizar espacio
- **100%:** Default óptimo
- **120%-150%:** Accesibilidad, dificultad visual

#### Efecto
- Aplica instantáneamente a TODO el sistema
- Persiste al cerrar sesión
- Se guarda automáticamente

---

### Ergonomía y Accesibilidad

#### 1. Modo Táctil

**Qué hace:**
- Botones más grandes y espaciados
- Optimizado para pantallas touch
- Margen de error táctil aumentado

**Detección automática:**
- Sistema detecta si tu dispositivo es táctil
- Se activa automáticamente en tablets/touch screens

**Cuándo activar manualmente:**
- Puntos de venta con monitor touch
- Kioscos interactivos
- Tablets/iPads usados como terminal

**Visual:**
- Card azul cuando está activo
- ✓ Check verde de confirmación

#### 2. Sonido (pitido)

**Qué hace:**
- Feedback auditivo al escanear productos
- "Beep" al agregar al carrito
- Confirmación de acciones

**Cuándo activar:**
- Ambiente ruidoso (necesitas confirmación auditiva)
- Scanner de códigos de barras
- Operación sin mirar pantalla

**Cuándo desactivar:**
- Ambiente silencioso (biblioteca, oficina)
- Preferencia personal
- Clientes sensibles al ruido

**Visual:**
- Card verde cuando está activo
- Ícono altavoz/silencio según estado

#### 3. Pantalla Completa

**Botón:** "ACTIVAR PANTALLA COMPLETA"

**Qué hace:**
- Oculta barra del navegador/OS
- Maximiza espacio de trabajo
- Modo kiosco

**Cómo salir:**
- Presiona `ESC` en teclado
- O vuelve a clickear el botón

**Uso:**
- Terminales de POS dedicadas
- Presentaciones
- Maximizar espacio en pantallas pequeñas

---

### Información del Sistema

**Panel lateral derecho (oscuro):**

#### Entorno Detectado
**Electron (App):**
- 🔵 Punto azul
- Aplicación de escritorio empaquetada

**Navegador Web:**
- 🟠 Punto naranja
- Versión web (Chrome/Firefox/Edge)

#### Notas Técnicas
- Resolución mínima recomendada: 1024x768px
- Optimizado para escritorio y tablets
- Activar Modo Táctil en dispositivos touch

---

### Zona de Pruebas (Dev Mode Only)

**Activación secreta:**
1. Haz clic 5 veces en el ícono de Apariencia (superior izquierdo)
2. Aparece mensaje: "MODO DESARROLLADOR ACTIVADO 🧪"
3. Card amarilla "ZONA DE PRUEBAS" aparece

**Contenido:**
- Botón "ABRIR LABORATORIO"
- Acceso a `/simulation` (página de simulación)
- Herramientas de estrés y pruebas

**Solo para:**
- Developers
- Testing
- Debugging

---

### Guardar Cambios

**Botón flotante inferior derecha:**
- "GUARDAR CAMBIOS"
- Color negro según diseño
- Confirmación automática

---

## ⚙️ Sistema de Permisos (3 Secciones)

### CONF_NEGOCIO_VER
- Ver datos del negocio
- Acceder a todas las secciones de comercio

### CONF_NEGOCIO_EDITAR
- Modificar Mi Negocio
- Cambiar Diseño Ticket
- Ajustar Apariencia UI

### Modo Solo Lectura
**Cuándo aparece:**
- Usuario tiene permiso VER pero no EDITAR
- Badge "🔒 SOLO LECTURA" visible

**Restricciones:**
- Campos deshabilitados (grises)
- Botones bloqueados
- Puedes ver, no modificar

**Funciones activas:**
- Copiar datos (ícono copiar sigue funcionando)
- Navegar entre tabs
- Vista previa de tickets

---

## 📋 Casos de Uso Comunes

### Caso 1: Configurar Negocio Nuevo

```
Objetivo: Setup inicial desde cero

1. Ve a Configuración → Mi Negocio
2. Completa:
   - Nombre: "Bodega La Esquina"
   - RIF: "J-12345678-0"
   - Teléfono: "04121234567" (auto-formatea)
   - Dirección: "Calle Principal #45, Caracas"
3. Clic en "GUARDAR CAMBIOS"
4. Ve a Diseño Ticket
5. Configura:
   - Precio Productos: Ambos ($/Bs)
   - Totales: Ambos
   - Mostrar Tasa: ON
   - Mensaje Pie: "¡Gracias por su compra!"
6. Ajusta tamaño fuente: 11px
7. Guardar Configuración
8. Ve a Apariencia UI
9. Si usas touch: Activa Modo Táctil
10. Guardar
```

### Caso 2: Ajustar Ticket para Impresora Nueva

```
Problema: Impresora corta los bordes

1. Ve a Diseño Ticket
2. Geometría:
   - Margen Lateral (X): +3mm
   - Margen Superior (Y): +2mm
3. Vista Previa actualiza
4. Imprime ticket de prueba
5. Ajusta hasta que sea perfecto
6. Guardar
```

### Caso 3: Modo Kiosco para Punto de Venta

```
Objetivo: Terminal dedicada, pantalla completa

1. Ve a Apariencia UI
2. Activa:
   - Modo Táctil: ON
   - Sonido: ON (feedback auditivo)
   - Escala: 120% (botones más grandes)
3. Guardar
4. Clic "ACTIVAR PANTALLA COMPLETA"
5. Terminal queda lista para operar
```

---

## Preguntas Frecuentes

**Q: ¿Los cambios requieren reiniciar sistema?**  
A: No, todos los cambios se aplican inmediatamente.

**Q: ¿Puedo tener logos diferentes por sucursal?**  
A: Actualmente no, logo/configuración es global.

**Q: ¿Cómo subo mi propio logo?**  
A: Actualmente usa logo por defecto. Próxima versión permitirá upload.

**Q: ¿El diseño de ticket afecta facturas electrónicas?**  
A: No, solo para impresión térmica. Facturación electrónica usa template legal fijo.

**Q: ¿Puedo resetear a defaults?**  
A: No hay botón automático. Ajusta manualmente a valores originales.

**Q: ¿La Vista Previa es exacta a la impresión real?**  
A: Muy cercana (~95%). Prueba imprimir para ajustes finales.

---

## Troubleshooting

### Problema: No puedo guardar cambios
**Solución:**
- Verifica permisos (CONF_NEGOCIO_EDITAR)
- Si ves badge "SOLO LECTURA", contacta administrador

### Problema: Vista Previa no se actualiza
**Solución:**
- Recarga página (F5)
- Verifica que estés editando campos correctos

### Problema: RIF no se formatea
**Solución:**
- Escribe sin guiónes: `J123456780`
- Sistema autocapitaliza mayúsculas
- Para formato manual: `J-12345678-0`

### Problema: Zoom no se aplica
**Solución:**
- Asegúrate de guardar con botón flotante
- Recarga página si persiste
- Clear cache del navegador

---

## Mejores Prácticas

### Configuración Inicial
✅ Completa TODOS los campos de Mi Negocio  
✅ Usa RIF real para cumplimiento fiscal  
✅ Prueba diseño de ticket antes de usar en producción  
✅ Ajusta escala según dispositivo y usuario

### Diseño de Tickets
✅ Precio dual ($/Bs) para Venezuela  
✅ Mostrar tasa para transparencia  
✅ Mensaje Pie de Página amigable y profesional  
✅ Prueba imprimir en papel antes de habilitar

### Apariencia
✅ Modo Táctil ON para touch screens  
✅ Zoom 100% para pantallas normales  
✅ Zoom 120%+ para usuarios con dificultad visual  
✅ Pantalla Completa para terminales dedicadas

### Mantenimiento
✅ Actualiza teléfono/dirección al cambiar  
✅ Revisa mensaje de ticket mensualmente (promociones)  
✅ Sincroniza con app móvil para monitoreo remoto
