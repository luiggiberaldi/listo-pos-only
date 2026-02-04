# Inventario y Kardex - Guía Ultra-Detallada

## Propósito
El módulo de Inventario es el núcleo de gestión de productos: alta/baja, actualización de stock, control de costos, categorización, generación de etiquetas, importación masiva y auditoría completa (Kardex).

## Cómo Acceder
- Menú lateral → "Inventario"
- O desde Dashboard → "Inventario"

---

## Interfaz Principal

### Elementos de la Pantalla

**1. KPIs Estadísticos** (si tienes permisos)
- Total de Productos
- Valor del Inventario (a precio de venta)
- Valor de Costo
- Ganancia Proyectada
- Productos con Stock Bajo

**2. Barra de Herramientas**
- Búsqueda rápida
- Filtros por categoría
- Botones de acción (Nuevo, Importar, Etiquetas, Kardex)

**3. Tabla de Productos**
- Lista paginada (50 items por página)
- Columnas: Producto/SKU, Estado, Precio, Costo, Margen, Stock
- Acciones por producto

**4. Paginación**
- Navegación entre páginas
- Indicador de items mostrados

---

## Crear Nuevo Producto

### Cómo Crear

1. **Clic en "+ NUEVO PRODUCTO"** (botón superior)
2. **Formulario completo se abre** con pestañas:

### Pestaña 1: Información Básica

**Campos Obligatorios:**
- **Nombre** - Nombre del producto (Ej: "Coca-Cola 2L")
- **Precio** - Precio de venta en USD

**Campos Opcionales:**
- **Código/SKU** - Código de barras o identificador único
- **Categoría** - Selecciona de lista o deja "General"
- **Descripción** - Detalles adicionales

### Pestaña 2: Inventario

**Stock:**
- **Stock Actual** - Cantidad disponible
- **Stock Mínimo** - Alerta de reorden (default: 5)

**Costo:**
- **Costo Unitario** - Precio de compra (para calcular margen)
- **IVA** - Indica si el producto genera IVA

### Pestaña 3: Unidades y Jerarquía

**Tipo de Producto:**
- **Unidad** - Producto por pieza (default)
- **Peso** - Producto que se vende por kg/gramo

**Jerarquía (Avanzado):**
- Sistema de empaque multinivel
- Ejemplo: 1 Bulto = 6 Paquetes = 24 Unidades

**Cómo configurar jerarquía:**
```
Producto: Coca-Cola
├─ Unidad: $2 (pieza individual)
├─ Paquete: $11 (6 unidades)
└─ Bulto: $20 (24 unidades = 4 paquetes)
```

**Configuración:**
1. Activa "Paquete"
2. Factor: 6 (cuántas unidades tiene)
3. Precio: $11
4. Activa "Bulto"
5. Factor: 24
6. Precio: $20

### Pestaña 4: Personalización

**Opciones:**
- **Color de etiqueta** - Para destacar visualmente
- **Notas internas** - Información para el equipo

3. **Presiona "Guardar"**
4. **Producto aparece en la tabla**

---

## Buscar Productos

### Búsqueda por Texto

**Qué puedes buscar:**
- ✅ Nombre (Ej: `coca`, `cola`)
- ✅ Código/SKU completo o parcial
- ✅ Descripción

**Cómo usar:**
1. Escribe en el campo de búsqueda
2. Los resultados se filtran instantáneamente
3. La búsqueda es insensible a mayúsculas

### Filtros por Categoría

**Cómo filtrar:**
1. Clic en selector de categoría
2. Elige categoría específica
3. Solo muestra productos de esa categoría

**Categorías Especiales:**
- **Todas** - Muestra todo el inventario
- **General** - Productos sin categoría asignada

---

## Editar Producto

### Cómo Editar

1. Localiza el producto en la tabla
2. Haz clic en el ícono **✏️ (Editar)** en acciones
3. Formulario se abre con datos actuales
4. Modifica los campos necesarios
5. Presiona "Guardar"

**Qué puedes editar:**
- ✅ Nombre, precio, código
- ✅ Stock actual
- ✅ Costo, IVA
- ✅ Categoría
- ✅ Jerarquía de unidades
- ✅ Stock mínimo

---

## Ajustar Stock

### Cuándo Ajustar

- 📦 Recibiste mercancía nueva
- 📤 Producto se dañó/venció
- 🔍 Conteo físico difiere del sistema
- ✏️ Corrección de error de registro

### Cómo Ajustar

1. Localiza el producto
2. Haz clic en el ícono **⚙️ (Ajustar)** en acciones
3. **Modal de Ajuste se abre**
4. Ingresa datos:
   - **Tipo de movimiento:**
     - **Entrada** (+) - Aumenta stock
     - **Salida** (-) - Disminuye stock
   - **Cantidad** - Cuánto ajustar
   - **Motivo** - Razón del ajuste (obligatorio para auditoría)
5. Presiona "Confirmar Ajuste"

**Ejemplo:**
```
Producto: Coca-Cola 2L
Stock actual: 50

Ajuste:
Tipo: Entrada (+)
Cantidad: 20
Motivo: "Recepción de mercancía - Factura #1234"

Stock nuevo: 70
```

### Motivos Comunes

**Entradas:**
- Compra de mercancía
- Devolución de cliente
- Corrección de inventario (faltaba)

**Salidas:**
- Producto dañado
- Producto vencido
- Muestra gratis
- Corrección de inventario (sobraba)
- Uso interno

---

## Duplicar Producto

### Cuándo Usar

- Crear producto similar (Ej: Coca-Cola 2L → Coca-Cola 3L)
- Ahorra tiempo al no llenar todo el formulario

### Cómo Duplicar

1. Localiza el producto base
2. Haz clic en el ícono **📋 (Duplicar)**
3. Formulario se abre con datos copiados
4. Modifica lo necesario (nombre, precio, código)
5. **Stock siempre empieza en 0**
6. Guardar

---

## Eliminar Producto

### ⚠️ Importante
- **No se puede recuperar** después de eliminar
- Útil para productos descontinuados
- Si tiene ventas históricas, considera desactivarlo en lugar de borrarlo

### Cómo Eliminar

1. Localiza el producto
2. Haz clic en el ícono **🗑️ (Eliminar)**
3. Confirma en el diálogo
4. Producto eliminado

---

## Gestión de Categorías

### Crear Categoría

1. Haz clic en "Gestionar Categorías" (ícono carpeta)
2. Clic en "+ Nueva Categoría"
3. Ingresa nombre (Ej: "Lácteos")
4. Se capitaliza automáticamente
5. Guardar

### Eliminar Categoría

1. En el panel de categorías
2. Clic en ícono **✗** junto a la categoría
3. Confirma
4. **Los productos de esa categoría pasan a "General"**

**Categorías Protegidas:**
- "General" no se puede eliminar

---

## Kardex (Auditoría Completa)

### Qué es el Kardex

El **Kardex** es el registro histórico completo de todos los movimientos de inventario: entradas, salidas, ajustes y ventas.

### Requisito
- **Permiso:** ADMIN_AUDITORIA (solo Owner/Admin)

### Cómo Acceder

1. Clic en botón "Kardex" (ícono 📊) en la barra superior
2. Modal se abre con tabla completa

### Información del Kardex

**Columnas:**
- **Fecha/Hora** - Timestamp exacto del movimiento
- **Producto** - Nombre del ítem afectado
- **Tipo** - Entrada, Salida, Venta, Ajuste
- **Cantidad** - Cuánto se movió
- **Stock Anterior** - Stock antes del movimiento
- **Stock Resultante** - Stock después
- **Motivo** - Razón del movimiento
- **Usuario** - Quién realizó la acción

### Tipos de Movimientos

**1. ENTRADA (+)**
- Compra/recepción de mercancía
- Devoluciones de clientes
- Ajustes positivos

**2. SALIDA (-)**
- Ventas (automáticas)
- Productos dañados/vencidos
- Ajustes negativos
- Muestras gratis

**3. VENTA**
- Generado automáticamente al procesar venta en POS
- No requiere motivo manual

**4. AJUSTE**
- Correcciones manuales
- Requiere motivo obligatorio

### Filtrar Kardex

**Por Producto:**
- Selector muestra solo movimientos de un producto específico

**Por Tipo:**
- Filtra solo Entradas, Salidas, Ventas o Ajustes

**Por Fecha:**
- Rango de fechas personalizado

### Ejemplo de Kardex

```
Fecha              | Producto      | Tipo    | Cant | Anterior | Nuevo | Motivo
2026-02-03 09:00  | Coca-Cola 2L  | ENTRADA | +50  | 20       | 70    | Compra #1234
2026-02-03 10:30  | Coca-Cola 2L  | VENTA   | -2   | 70       | 68    | Venta #0045
2026-02-03 11:15  | Coca-Cola 2L  | SALIDA  | -5   | 68       | 63    | Producto dañado
2026-02-03 14:00  | Coca-Cola 2L  | VENTA   | -3   | 63       | 60    | Venta #0046
```

---

## Importación Masiva (Bulk Import)

### Cuándo Usar
- Carga inicial de inventario
- Migración desde otro sistema
- Actualización masiva de precios

### Cómo Importar

1. **Clic en "Importar"** (ícono descarga) en la barra superior
2. **Modal de importación se abre**
3. **Descarga plantilla Excel** (botón "Descargar Plantilla")
4. **Llena la plantilla:**

**Columnas de la Plantilla:**
- `nombre` (obligatorio)
- `codigo` (opcional)
- `precio` (obligatorio)
- `costo` (opcional)
- `stock` (opcional, default: 0)
- `stockMinimo` (opcional, default: 5)
- `categoria` (opcional)
- `descripcion` (opcional)

**Ejemplo:**
```excel
nombre           | codigo    | precio | costo | stock | categoria
Coca-Cola 2L     | 7501234   | 3.50   | 2.00  | 50    | Bebidas
Pepsi 2L         | 7502345   | 3.50   | 2.00  | 40    | Bebidas
Leche Entera 1L  | 7503456   | 2.00   | 1.20  | 30    | Lácteos
```

5. **Sube el archivo** (arrastra o selecciona)
6. **Sistema valida** y muestra preview
7. **Presiona "Importar"**
8. **Confirmación** indica cuántos se crearon/actualizaron

### Reglas de Importación

- **Nuevos:** Si el código no existe, se crea
- **Existentes:** Si el código existe, se actualiza
- **Sin código:** Se crea siempre como nuevo
- **Errores:** Se reportan en resumen final

---

## Generación de Etiquetas de Precio

### Etiqueta Simple (Individual)

**Cómo imprimir una etiqueta:**
1. Localiza el producto
2. Haz clic en el ícono **🖨️ (Imprimir)** en acciones
3. Etiqueta se genera y envía a impresora

**Formato de etiqueta:**
- Nombre del producto
- Precio en USD
- Precio en VES (conversión automática)
- Código de barras (si tiene)

### Etiquetas Masivas (Label Studio)

**Cómo generar múltiples:**
1. **Selecciona productos** (checkbox al inicio de cada fila)
2. Clic en "Etiquetas" (ícono 🏷️) en barra superior
3. **Label Studio se abre**
4. **Opciones:**
   - Etiquetas por hoja (Default: 50)
   - Tamaño de fuente
   - Incluir código de barras
   - Incluir descripción
5. **Presiona "Generar PDF"**
6. PDF se descarga listo para imprimir

### Etiquetas por Jerarquía

Si el producto tiene jerarquía (Bulto/Paquete):
- **Opción:** Generar etiqueta para cada nivel
- **Ejemplo:** Coca-Cola
  - Etiqueta Unidad: $2
  - Etiqueta Paquete x6: $11
  - Etiqueta Bulto x24: $20

---

## Imprimir Listas

### Tipos de Listas

**1. Lista Completa**
- Todos los productos del inventario
- Útil para auditoría física

**2. Lista por Categoría**
- Solo productos de categoría seleccionada

**3. Lista de Seleccionados**
- Solo productos marcados con checkbox

### Cómo Imprimir

1. Clic en "Imprimir Listas" (ícono 📄)
2. Modal se abre
3. Selecciona tipo de lista
4. **Opciones:**
   - Incluir costos (si tienes permiso)
   - Incluir stock
   - Incluir códigos
5. **Presiona "Generar PDF"**
6. PDF se descarga

**Formato:**
```
INVENTARIO - LISTA COMPLETA
Fecha: 2026-02-03

#  | Código    | Nombre           | Categoría | Stock | Precio | Costo
1  | 7501234   | Coca-Cola 2L     | Bebidas   | 50    | $3.50  | $2.00
2  | 7502345   | Pepsi 2L         | Bebidas   | 40    | $3.50  | $2.00
...
```

---

## Selección Múltiple

### Cómo Usar

**Seleccionar Todos en Página:**
1. Checkbox en la cabecera de la tabla
2. Marca todos los visibles en la página actual

**Seleccionar Individual:**
1. Checkbox al inicio de cada fila

**Acciones con Selección:**
- Generar etiquetas masivas
- Imprimir lista de seleccionados
- Eliminar múltiples (si tienes permiso)

---

## Indicadores Visuales

### Estado del Producto

**Stock Óptimo (Verde):**
- Stock > Stock Mínimo
- Producto disponible

**Stock Bajo (Amarillo/Naranja):**
- Stock ≤ Stock Mínimo
- ⚠️ Requiere reorden

**Sin Stock (Rojo):**
- Stock = 0
- 🚫 No disponible para venta

### Margen de Ganancia

**Si tienes permiso INV_VER_COSTOS:**
- **Verde:** Margen > 30%
- **Amarillo:** Margen 10-30%
- **Rojo:** Margen < 10%

**Calclo:**
```
Margen = ((Precio - Costo) / Precio) × 100
```

---

## Permisos del Sistema

### INV_VER_COSTOS
- Ver columna de costo
- Ver margen de ganancia
- Critical para análisis financiero

### REP_VER_DASHBOARD
- Ver KPIs estadísticos
- Ver valor del inventario

### ADMIN_AUDITORIA
- Acceder al Kardex completo
- Ver historial de movimientos

### INV_EDITAR
- Crear/editar productos
- Ajustar stock

### INV_ELIMINAR
- Eliminar productos

---

## Casos de Uso Comunes

### Caso 1: Recepción de Mercancía

```
Objetivo: Registrar compra de 50 Coca-Colas

1. Buscar "Coca-Cola 2L"
2. Clic en Ajustar (⚙️)
3. Tipo: Entrada (+)
4. Cantidad: 50
5. Motivo: "Compra proveedor XYZ - Factura #1234"
6. Confirmar
7. Stock actual: 20 → 70
```

### Caso 2: Conteo Físico Difiere

```
Objetivo: El sistema dice 50, pero hay 45

1. Buscar producto
2. Ajustar
3. Tipo: Salida (-)
4. Cantidad: 5
5. Motivo: "Conteo físico - Faltante detectado"
6. Confirmar
7. Stock: 50 → 45
```

### Caso 3: Importar 100 Productos Nuevos

```
1. Clic en "Importar"
2. Descargar plantilla
3. Llenar Excel con 100 productos
4. Subir archivo
5. Revisar preview
6. Importar
7 Confirmación: "100 productos creados"
```

### Caso 4: Etiquetas para Góndola Nueva

```
Objetivo: Imprimir etiquetas para 30 productos

1. Filtrar por categoría "Bebidas"
2. Seleccionar todos (checkbox cabecera)
3. Clic en "Etiquetas"
4. Label Studio abre
5. Configurar: 16 etiquetas por hoja
6. Generar PDF
7. Imprimir
```

---

## Preguntas Frecuentes

**Q: ¿Puedo tener productos con el mismo nombre?**  
A: Sí, pero se recomienda diferenciarlos con el código/SKU.

**Q: ¿Qué pasa si vendo un producto sin stock?**  
A: El sistema permite vender en negativo (stock = -1). Útil para preventa, pero genera alerta.

**Q: ¿Los ajustes de stock afectan reportes?**  
A: Sí, se registran en el Kardex pero no cuentan como ventas.

**Q: ¿Puedo editar el Kardex?**  
A: No, es append-only (solo agregar). Garantiza integridad de auditoría.

**Q: ¿El sistema soporta lotes o fechas de vencimiento?**  
A: Actualmente no. Cada producto es un ítem único sin trazabilidad por lote.

**Q: ¿Cuántos productos puedo tener?**  
A: Ilimitados, pero la paginación muestra 50 por página para performance.

**Q: ¿Puedo exportar el inventario?**  
A: Sí, usa "Imprimir Listas" y luego convierte el PDF a Excel si necesitas.

---

## Troubleshooting

### Problema: No veo la columna de costo
**Solución:**
- Necesitas permiso INV_VER_COSTOS
- Contacta al administrador

### Problema: El Kardex no aparece
**Solución:**
- Requiere permiso ADMIN_AUDITORIA
- Solo Owner y Admin por defecto

### Problema: No puedo importar Excel
**Solución:**
- Verifica que el archivo sea .xlsx (no .xls)
- Usa la plantilla oficial descargada
- Verifica que las columnas coincidan exactamente

### Problema: Las etiquetas no se imprimen
**Solución:**
- Verifica impresora configurada
- Si no hay impresora, se descarga como PDF
- Verifica que el navegador permita ventanas emergentes

---

## Mejores Prácticas

### Control de Inventario
✅ Realiza conteos físicos mensuales  
✅ Ajusta discrepancias inmediatamente  
✅ Usa motivos descriptivos en ajustes  
✅ Revisa Kardex para detectar fugas

### Gestión de Productos
✅ Usa códigos SKU únicos  
✅ Configura stock mínimo realista  
✅ Actualiza costos al recibir mercancía  
✅ Categoriza productos correctamente

### Etiquetas
✅ Imprime etiquetas al recibir mercancía nueva  
✅ Usa jerarquía para productos con empaque múltiple  
✅ Verifica precios antes de imprimir

### Auditoría
✅ Revisa Kardex semanalmente  
✅ Investiga movimientos sospechosos  
✅ Exporta Kardex mensual para archivo  
✅ Compara stock teórico vs físico

---

## Notas Técnicas

### Cálculo de KPIs

**Valor Inventario (Venta):**
```javascript
Σ(precio × stock) para todos los productos
```

**Valor Inventario (Costo):**
```javascript
Σ(costo × stock) para todos los productos
```

**Ganancia Proyectada:**
```javascript
ValorVenta - ValorCosto
```

**Stock Bajo:**
```javascript
Cuenta productos donde stock ≤ stockMinimo
```

### Performance
- Paginación: 50 items por página
- Búsqueda: Indexada para <100ms
- Kardex: Optimizado para 50,000+ movimientos
