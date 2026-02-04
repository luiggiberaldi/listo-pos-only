# POS (Punto de Venta) - Guía Completa

## Propósito
El POS es el corazón operativo de Listo POS. Permite procesar ventas con escáner de códigos, balanzas digitales, teclado completo, y gestión avanzada de carrito usando jerarquías de productos.

## Requisito Previo
⚠️ **LA CAJA DEBE ESTAR ABIERTA** para poder vender. Si no está abierta, se mostrará un botón para abrirla.

---

## Modos de Operación

Listo POS tiene 2 modos visuales:

1. **Modo Escritorio** (por defecto) - Optimizado para PC con teclado
2. **Modo Táctil** - Optimizado para tablets/pantallas touch

*(Se cambia desde Configuración → Interfaz)*

---

## Atajos de Teclado Completos

### Funciones Principales (F-Keys)

| Tecla | Acción | Descripción |
|-------|--------|-------------|
| **F2** | Enfocar búsqueda | Lleva el cursor al campo de búsqueda |
| **F4** | Limpiar carrito | Vacía todos los productos del carrito |
| **F6** | Guardar en espera | Guarda la venta actual y limpia el carrito |
| **F9** | Cobrar | Abre el modal de pago (solo si hay productos) |
| **?** | Ayuda | Muestra la guía rápida de atajos |

### Gestión de Carrito (sin escribir en búsqueda)

| Tecla | Acción | Descripción |
|-------|--------|-------------|
| **+** | Aumentar cantidad | Suma 1 unidad (o 0.05 kg para pesados) al último item |
| **-** | Disminuir cantidad | Resta 1 unidad (o 0.05 kg) al último item |
| **Delete / Backspace** | Eliminar item | Elimina el último producto del carrito |

### Búsqueda y Selección

| Tecla | Acción | Descripción |
|-------|--------|-------------|
| **Enter** | Agregar producto | Agrega el producto seleccionado al carrito |
| **Flechas (↑ ↓ → ←)** | Navegar grid | Mueve la selección entre productos visibles |
| **Escape** | Cancelar | Limpia la búsqueda o cierra modal de ayuda |

### Atajos Avanzados

| Tecla | Acción | Ejemplo | Descripción |
|-------|--------|---------|-------------|
| **[cantidad] + \*** | Multiplicador | `5*` | El próximo producto se agregará 5 veces |
| **\*** (sin número) | Transformar unidad | `*` | Cambia el último item entre Unidad→Paquete→Bulto |
| **[monto] + +** | Venta rápida exenta | `50+` | Crea venta rápida de Bs 50 (exenta) |
| **[monto] + -** | Venta rápida gravada | `100-` | Crea venta rápida de Bs 100 (con IVA) |

---

## Flujo de Trabajo Completo

### 1. Agregar Productos

**Método A: Escáner de Código**
1. Enfoca el campo de búsqueda (F2)
2. Escanea el código de barras
3. El producto se agrega automáticamente

**Método B: Búsqueda Manual**
1. Escribe nombre o código del producto
2. Usa las flechas para navegar
3. Presiona Enter para agregar

**Método C: Clic/Touch**
1. Haz clic en el producto del grid
2. Se agrega instantáneamente

**Método D: Multiplicador**
1. Escribe `5*` (sin presionar Enter)
2. Escanea o selecciona el producto
3. Se agregarán 5 unidades automáticamente

### 2. Modificar Cantidades

**En Carrito:**
- Haz clic en el número de cantidad
- Escribe la nueva cantidad
- Presiona Enter o clic fuera

**Con Teclado:**
- Presiona `+` o `-` para ajustar el último item

### 3. Cambiar Unidad de Venta

**Si el producto tiene jerarquías (Unidad/Paquete/Bulto):**

**Método A: Antes de agregar**
1. Haz clic en el producto del grid
2. Se abre un modal de jerarquías
3. Selecciona la unidad deseada
4. Presiona Enter o clic en "Agregar"

**Método B: Después de agregar**
1. Presiona `*` (asterisco)
2. El último item del carrito cambiará de unidad
3. Ciclo: Unidad → Paquete → Bulto → Unidad

---

## Soporte de Balanzas Digitales

### Códigos EAN-13 de Peso Variable

Listo POS soporta etiquetas de balanzas con formato **Prefijo 20**:

**Estructura:** `20[PLU][PESO][CHECK]`
- **Posición 1-2:** `20` (Prefijo de peso variable)
- **Posición 3-6:** PLU del producto (4 dígitos)
- **Posición 7-11:** Peso en gramos (5 dígitos)
- **Posición 12:** Dígito de verificación

**Ejemplo:**
- Código escaneado: `2001050093` + check
- PLU: `0105` (busca el producto con código `0105` o `105`)
- Peso: `00930` = 0.930 kg
- **Resultado:** Producto agregado con 0.930 kg automáticamente

**Compatibilidad:**
- ✅ Balanzas Systel
- ✅ Balanzas DIGI
- ✅ Compatible con formato estándar venezolano/latam

---

## Ventas Rápidas (Sin Producto)

### ¿Qué son?
Ventas de montos fijos sin producto específico (ej: servicios, recargas).

### Cómo Crear

**Venta Exenta (sin IVA):**
1. Escribe el monto en bolívares: `50`
2. Presiona `+`
3. Se crea un item "VENTA RÁPIDA (EXENTA)" por Bs 50

**Venta Gravada (con IVA):**
1. Escribe el monto: `100`
2. Presiona `-`
3. Se crea un item "VENTA RÁPIDA (GRAVADA)" por Bs 100

---

## Guardar y Recuperar Ventas

### Guardar en Espera (F6)

**Cuando usarlo:**
- Cliente sale a buscar más dinero
- Atención telefónica interrumpe
- Necesitas iniciar otra venta

**Cómo:**
1. Con productos en carrito, presiona F6
2. Opcionalmente, escribe un nombre/nota
3. El carrito se guarda y se limpia

### Recuperar Venta

**Cómo:**
1. Haz clic en "Tickets en Espera" (ícono de reloj)
2. Selecciona el ticket guardado
3. El carrito se restaura automáticamente

---

## Proceso de Cobro (F9)

### 1. Abrir Modal de Pago
- Presiona F9 o clic en botón "Cobrar"
- Verifica Total y desglose

### 2. Seleccionar Cliente (Opcional)
- Busca por nombre, cédula o teléfono
- O clic en "Sin Cliente"

### 3. Ingresar Pago

**Efectivo USD:**
1. Escribe monto recibido
2. Sistema calcula vuelto automáticamente

**Efectivo VES:**
1. Cambia a "Bolívares"
2. Escribe monto
3. Vuelto calculado

**Punto de Venta (Digital):**
1. Selecciona "Punto"
2. Ingresa referencia bancaria
3. Sistema registra como pago digital

**Mixto (Combo):**
1. Ingresa monto en USD efectivo
2. Marca "Completar con Punto"
3. La diferencia se carga automáticamente como digital

### 4. Finalizar

- Presiona "Finalizar Venta" o Enter
- **SI HAY IMPRESORA:** Ticket se imprime automáticamente
- **SI NO HAY:** Modal muestra el ticket para guardar/compartir

---

## Tickets y Facturación

### Ticket Normal
- Generado automáticamente
- Formato: `#YYYYMMDD-###`
- Ejemplo: `#20260203-001`

### Ticket con Saldo a Favor
- Se genera si el cliente pagó de más
- Imprimible para uso futuro
- Canjeables en próximas compras

### Reimprimir
- Desde "Historial de Ventas"
- Busca la venta y clic en "Reimprimir"

---

## Funciones Especiales

### Control de Stock
- **Stock Insuficiente:** Sistema alerta si no hay unidades
- **Permitir sin Stock:** Se configura en Configuración → Inventario
- Si está activado, permite vender en negativo

### Precios Dinámicos
- El precio se calcula según unidad de venta
- Unidad: Precio base
- Paquete: Precio del paquete
- Bulto: Precio del bulto

### Tasa de Cambio
- Se muestra en la esquina superior derecha
- Si cae a 1.0, aparece alerta visual
- Afecta conversión USD ↔ VES

---

## Casos de Uso Comunes

### Caso 1: Venta Básica con Escáner
```
1. F2 (enfocar búsqueda)
2. Escanear código
3. Escanear código
4. Escanear código
5. F9 (cobrar)
6. Ingresar monto
7. Enter (finalizar)
✅ Venta completada
```

### Caso 2: Venta con Múltiples Unidades
```
1. Escribir 12*
2. Escanear producto
✅ 12 unidades agregadas
```

### Caso 3: Cambiar de Unidad a Bulto
```
1. Escanear producto
2. Presionar *
✅ Item cambiado a Bulto
```

### Caso 4: Venta con Balanza
```
1. Pesar producto en balanza
2. Escanear etiqueta generada
✅ Producto agregado con peso exacto
```

### Caso 5: Cliente Olvidó Dinero
```
1. Agregar productos
2. F6 (guardar en espera)
3. Escribir "Juan - Falta efectivo"
4. Cliente vuelve
5. Recuperar ticket
6. F9 (cobrar)
```

---

## Preguntas Frecuentes

**Q: ¿Puedo vender sin abrir caja?**  
A: No. La caja debe estar abierta para registrar ventas.

**Q: ¿Cómo agrego 0.5 unidades?**  
A: Escanea el producto, haz clic en la cantidad en el carrito, escribe `0.5` y presiona Enter.

**Q: ¿Qué pasa si escaneo un código que no existe?**  
A: El sistema buscará coincidencias parciales. Si no hay, no pasará nada (sin error).

**Q: ¿Puedo eliminar un producto específico del carrito?**  
A: Sí, haz clic en el ícono de basura (🗑️) junto al producto en el carrito.

**Q: ¿Cómo cambio entre USD y VES en el pago?**  
A: Usa el selector de moneda en el modal de pago (botones USD / VES).

**Q: ¿El multiplicador se queda activo?**  
A: No, se desactiva automáticamente después de agregar el producto.

**Q: ¿Puedo cancelar un ticket en espera?**  
A: Sí, en el modal "Tickets en Espera", haz clic en el ícono de eliminar (🗑️).

**Q: ¿Qué pasa si presiono F4 por accidente?**  
A: El carrito se limpia. Si tenías productos importantes, deberás volver a agregarlos (no hay "deshacer").

---

## Troubleshooting

### Problema: El escáner no funciona
**Solución:**
- Verifica que el campo de búsqueda esté enfocado (F2)
- Verifica configuración USB del escáner (modo teclado)
- Prueba escribiendo el código manualmente

### Problema: Balanza no se detecta
**Solución:**
- Verifica que el código comience con `20`
- Verifica que el producto tenga el PLU correcto
- Asegúrate de tener exactamente 12-13 dígitos

### Problema: No puedo cobrar (F9 no funciona)
**Solución:**
- Verifica que haya productos en el carrito
- Verifica que la caja esté abierta
- Verifica que no haya un modal ya abierto

### Problema: El precio está incorrecto
**Solución:**
- Verifica la unidad de venta (Unidad/Paquete/Bulto)
- Confirma el precio del producto en Inventario
- Verifica la tasa de cambio si es en VES

### Problema: No se imprime el ticket
**Solución:**
- Verifica que la impresora esté conectada
- Verifica configuración en Configuración → Impresora
- Si no hay impresora, puedes ver el ticket en pantalla

---

## Permisos Requeridos

- **POS_ACCESO** - Acceso básico al punto de venta
- **POS_DESCUENTO** - Aplicar descuentos (feature no documentada aquí)
- **Caja Abierta** - Estado de caja funcionando

---

## Shortcuts Resumidos (Cheatsheet)

```
FUNCIONES
F2 - Buscar
F4 - Limpiar
F6 - Espera
F9 - Cobrar
?  - Ayuda

CARRITO
+  - Más cantidad (último item)
-  - Menos cantidad (último item)
Del - Eliminar (último item)

AVANZADO
5*   - Multiplicar x5
*    - Cambiar unidad
50+  - Venta rápida exenta Bs 50
100- - Venta rápida gravada Bs 100

NAVEGACIÓN
↑↓→← - Mover selección
Enter - Agregar producto
Esc - Cancelar
```

---

## Notas Técnicas

### Scanner Engine
- Auto-detecta códigos de 3+ caracteres
- Match exacto prioritario
- Soporte EAN-13/14 para peso variable

### Cart Management
- Estado persistente en memoria
- Auto-cálculo de totales en tiempo real
- Validación de stock en vivo

### Payment Processing
- Multi-moneda (USD/VES)
- Cálculo automático de vuelto
- Generación de correlativos fiscales

### Keyboard Controller
- Event listeners globales
- Bloqueo inteligente durante modales
- Prevención de doble-input
