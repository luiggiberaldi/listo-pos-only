# Historial de Ventas - Guía Completa

## Propósito
El Historial de Ventas es el registro completo y auditable de todas las transacciones del sistema. Permite buscar, filtrar, consultar detalles, anular y reimprimir ventas.

## Cómo Acceder
- Menú lateral → "Historial de Ventas"
- O desde Dashboard → "Historia de Ventas"

---

## Interfaz Principal

### Elementos de la Pantalla

**1. Contador de Resultados**
- Muestra total de ventas encontradas con filtros actuales
- Número de página actual / total de páginas

**2. Barra de Filtros**
- Rango de fechas (Desde / Hasta)
- Buscador de texto
- Filtro de estado (Todas / Aprobadas / Anuladas)
- Items por página

**3. Tabla de Ventas**
- Lista paginada de transacciones
- Información resumida por venta
- Acciones disponibles

**4. Controles de Paginación**
- Navegar entre páginas
- Cambiar items por página (20/50/100)

---

## Búsqueda y Filtros

### Filtro por Fecha

**Por defecto:** Muestra ventas de hoy

**Cómo cambiar:**
1. Campo "Desde" → Selecciona fecha inicial
2. Campo "Hasta" → Selecciona fecha final
3. Los resultados se actualizan automáticamente

**Ejemplos de Uso:**
- **Ventas de hoy:** Desde = Hoy, Hasta = Hoy
- **Ventas de la semana:** Desde = Lunes, Hasta = Hoy
- **Ventas de un mes:** Desde = 01/02/2026, Hasta = 28/02/2026
- **Ventas de un día específico:** Desde = 15/01/2026, Hasta = 15/01/2026

### Buscador de Texto

**Qué puedes buscar:**
- ✅ Número de factura (Ej: `0045`, `#20260203-001`)
- ✅ Nombre del cliente (Ej: `Juan`, `María`)
- ✅ Monto total (Ej: `25.00`, `150`)
- ✅ Referencia bancaria (Ej: `1234567890`)
- ✅ Método de pago (Ej: `efectivo`, `punto`)

**Cómo usar:**
1. Escribe el término en el campo de búsqueda
2. Los resultados se filtran en tiempo real
3. La búsqueda es "profunda" - busca en todos los campos

**Ejemplo:**
```
Búsqueda: "juan"
Resultados: Todas las ventas del cliente Juan Pérez
```

### Filtro por Estado

**Opciones:**
- **TODAS** - Muestra todas las ventas (aprobadas y anuladas)
- **APROBADAS** - Solo ventas completadas
- **ANULADAS** - Solo ventas canceladas

**Cómo usar:**
- Haz clic en el selector de estado
- Elige la opción deseada
- Los resultados se filtran automáticamente

---

## Información de la Tabla

### Columnas Visibles

| Columna | Descripción |
|---------|-------------|
| **Ref** | Número de factura o ID de venta |
| **Fecha** | Fecha y hora de la transacción |
| **Cliente** | Nombre del cliente (o "Sin Cliente") |
| **Items** | Cantidad de productos vendidos |
| **Total** | Monto total en USD |
| **Método** | Forma de pago principal |
| **Estado** | COMPLETADA o ANULADA |
| **Acciones** | Botones para ver/reimprimir/anular |

### Estados Visuales

**COMPLETADA:**
- Badge verde con ícono ✓
- Venta válida y contabilizada

**ANULADA:**
- Badge rojo con ícono ✗
- Venta cancelada y no contabilizada
- Aparece tachada en la tabla

---

## Ver Detalles de una Venta

### Cómo Abrir Detalles

**Método 1: Expandir en Tabla**
1. Haz clic en la f

ila de la venta
2. Se expande mostrando productos

**Método 2: Modal Completo**
1. Haz clic en el ícono de ojo (👁️)
2. Se abre modal con información completa

### Información Mostrada en el Modal

**Sección 1: Encabezado**
- Número de factura
- Fecha y hora
- Estado (Completada/Anulada)
- Usuario que procesó la venta

**Sección 2: Cliente**
- Nombre
- Cédula/RIF
- Teléfono
- Si es "Sin Cliente", no aparece sección

**Sección 3: Productos**
- Lista detallada con:
  - Cantidad
  - Nombre del producto
  - Precio unitario
  - Subtotal

**Sección 4: Totales**
- Subtotal
- IVA (si aplica)
- Total en USD
- Total en VES (conversión)

**Sección 5: Métodos de Pago**
- Efectivo USD/VES
- Punto de Venta (con referencia)
- Crédito (si aplica)
- Vuelto dado

**Sección 6: Información Fiscal** (si aplica)
- Base Imponible
- IVA Calculado
- Monto Exento

---

## Reimprimir Ticket

### Cuándo Reimprimir
- Cliente perdió su ticket
- Necesitas duplicado para archivo
- Auditoría o revisión

### Cómo Reimprimir

**Método 1: Desde la Tabla**
1. Localiza la venta en la lista
2. Haz clic en el ícono de impresora (🖨️)
3. El ticket se envía a la impresora

**Método 2: Desde el Modal**
1. Abre detalles de la venta (ícono ojo)
2. Botón "Reimprimir" en la parte inferior
3. El ticket se genera

**Nota:** Si no hay impresora configurada, se muestra el ticket en pantalla y puedes guardarlo como PDF desde el navegador.

---

## Anular una Venta

### ⚠️ Importante
- Solo usuarios con permiso `VENTAS_ANULAR` pueden anular
- La anulación requiere autorización con PIN
- Una venta anulada **NO se puede revertir**
- El stock se devuelve automáticamente

### Cuándo Anular
- ✅ Venta registrada por error
- ✅ Cliente devolvió todos los productos
- ✅ Error en el monto o productos
- ❌ **NO anular** si solo quieres cambiar un producto (mejor crear nueva venta)

### Cómo Anular

1. **Localiza la venta** en el historial
2. **Clic en ícono Ban** (🚫) en la columna de acciones
3. **Confirma la acción** en el diálogo
4. **Ingresa tu PIN** para autorizar (seguridad)
5. **Verifica motivo** (opcional pero recomendado)

### Qué Pasa al Anular

**Inmediatamente:**
- ✅ Estado cambia a "ANULADA"
- ✅ Stock de productos se devuelve automáticamente
- ✅ Venta se marca con tachado en la tabla
- ✅ Se excluye de reportes financieros
- ✅ Se registra en auditoría quien anuló y cuándo

**Lo que NO pasa:**
- ❌ El registro NO se borra (queda para auditoría)
- ❌ El número de factura NO se reutiliza
- ❌ El dinero NO se devuelve automáticamente (eso es manual)

---

## Paginación

### Navegar Entre Páginas

**Botones de Paginación:**
- **◀ Anterior** - Va a la página previa
- **Siguiente ▶** - Va a la página siguiente
- **Número de página actual** se muestra en el contador

### Cambiar Items por Página

**Opciones:**
- 20 items (por defecto)
- 50 items
- 100 items

**Cómo cambiar:**
1. Selector "Items por página"
2. Elige la cantidad deseada
3. La tabla se actualiza

**Recomendación:**
- 20 items → Uso diario normal
- 50 items → Búsquedas rápidas
- 100 items → Análisis o exportación

---

## Casos de Uso Comunes

### Caso 1: Buscar Venta por Cliente
```
1. Campo "Buscar": Escribe nombre del cliente
2. Resultado: Todas las ventas de ese cliente
3. Haz clic en ojo para ver detalles
```

### Caso 2: Consultar Ventas de Ayer
```
1. Campo "Desde": Selecciona ayer
2. Campo "Hasta": Selecciona ayer
3. Resultado: Ventas del día anterior
```

### Caso 3: Ver Solo Ventas Anuladas
```
1. Filtro Estado: "ANULADAS"
2. Resultado: Solo ventas canceladas
3. Útil para auditoría
```

### Caso 4: Buscar por Referencia Bancaria
```
1. Campo "Buscar": Pega número de referencia
2. Resultado: Venta con ese pago
3. Verifica método de pago en detalles
```

### Caso 5: Reimprimir para Cliente
```
1. Busca la venta (por nombre o fecha)
2. Clic en impresora
3. Entrega ticket al cliente
```

---

## Preguntas Frecuentes

**Q: ¿Cuánto tiempo se guardan las ventas?**  
A: Permanentemente. Todas las ventas quedan registradas en la base de datos local.

**Q: ¿Puedo editar una venta después de procesada?**  
A: No. Solo puedes anularla y crear una nueva venta correcta.

**Q: ¿Las ventas anuladas aparecen en reportes?**  
A: No. Las ventas anuladas se excluyen automáticamente de cálculos financieros.

**Q: ¿Puedo anular una venta de hace semanas?**  
A: Sí, siempre que tengas los permisos necesarios. No hay límite de tiempo.

**Q: ¿Qué pasa si anulo una venta por error?**  
A: No se puede revertir. Deberás crear una nueva venta idéntica.

**Q: ¿Puedo exportar el historial a Excel?**  
A: Actualmente no hay función de exportación automática. Puedes copiar datos manualmente o usar reportes.

**Q: ¿El historial muestra ventas de todos los usuarios?**  
A: Sí, muestra ventas de todos. El campo "Usuario" indica quién procesó cada venta.

**Q: ¿Cómo busco una venta si no recuerdo la fecha exacta?**  
A: Usa un rango de fechas amplio (ej: todo el mes) y luego filtra por cliente o monto.

---

## Troubleshooting

### Problema: No aparecen ventas
**Solución:**
- Verifica el rango de fechas (amplíalo)
- Verifica que no estés filtrando solo anuladas
- Limpia el campo de búsqueda
- Verifica que existan ventas en ese periodo

### Problema: Búsqueda no encuentra nada
**Solución:**
- Verifica la ortografía
- Intenta buscar solo una palabra
- Verifica que estés en el rango de fechas correcto
- Usa el número de factura exacto

### Problema: No puedo anular una venta
**Solución:**
- Verifica que tengas permiso VENTAS_ANULAR
- Verifica que la venta no esté ya anulada
- Verifica que no esté sellada por un cierre Z muy antiguo

### Problema: El ticket no se imprime
**Solución:**
- Verifica que la impresora esté conectada
- Verifica configuración de impresora en Config
- Si no hay impresora, guarda como PDF desde el navegador

---

## Permisos Requeridos

- **VENTAS_VER** - Ver historial (todos los usuarios)
- **VENTAS_ANULAR** - Anular ventas (Admin/Owner)
- **REP_VER_REPORTES** - Ver información financiera detallada

---

## Mejores Prácticas

### Búsqueda Eficiente
✅ Usa rangos de fechas específicos  
✅ Combina varios filtros para acotar resultados  
✅ Usa el número de factura si lo conoces

### Anulaciones
✅ Verifica 2 veces antes de anular  
✅ Documenta el motivo en un cuaderno físico  
✅ Informa al cliente sobre la anulación  
✅ Crea la nueva venta correcta de inmediato

### Reimpresiones
✅ Verifica que sea la venta correcta antes de imprimir  
✅ Indica en el ticket físico que es "COPIA"  
✅ Guarda registro de reimpresiones frecuentes (posible fraude)

### Auditoría
✅ Revisa ventas anuladas semanalmente  
✅ Verifica que las referencias bancarias coincidan  
✅ Compara totales del historial con el Reporte Z

---

## Notas Técnicas

### Motor de Búsqueda (Dexie)
- Indexado por fecha para máxima velocidad
- Búsqueda "profunda" en todos los campos
- Filtros combinables en memoria

### Paginación
- Offset + Limit para eficiencia
- Resetea a página 0 al cambiar filtros
- Cuenta total calculada dinámicamente

### Performance
- Optimizado para 10,000+ ventas
- Búsquedas típicas: <100ms
- Paginación sin lag visual
