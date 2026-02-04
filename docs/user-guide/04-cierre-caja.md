# Cierre de Caja - Guía Completa

## Propósito
El sistema de Cierre de Caja gestiona todo el ciclo de vida del flujo efectivo: apertura, seguimiento de ventas, arqueo de dinero y cierre fiscal con generación de Reporte Z.

## Flujo Completo del Ciclo de Caja

```
APERTURA → VENTAS → CIERRE Z
  (Base)   (Turno)   (Arqueo)
```

---

## Parte 1: Apertura de Caja

### ¿Qué es la Apertura?
Es el proceso de registrar el dinero inicial con el que comienzas el turno. Este monto es crucial para calcular correctamente el arqueo al cerrar.

### Cómo Abrir la Caja

**Desde el Sidebar:**
1. Clic en "Abrir Caja" en el menú lateral
2. Ingresa los balances iniciales:
   - **USD Cash** (Efectivo en dólares)
   - **VES Cash** (Efectivo en bolívares)
3. Opcionalmente:
   - **USD Digital** (Saldo inicial en punto de venta)
   - **VES Digital**
4. Presiona "Abrir Caja"

**Desde el POS:**
- Si intentas vender sin abrir caja, aparece un botón
- Clic en "Abrir Caja"
- Sigue el mismo proceso

### Balances Iniciales

**¿Por qué son importantes?**
El sistema usará estos montos para calcular:
- **Dinero esperado al cierre** = Base + Ventas
- **Diferencias en el arqueo** = Esperado vs Contado

**Ejemplo:**
```
Base Inicial: $100 USD
Ventas del día: $500 USD
Esperado al cierre: $600 USD
Si cuentas $595, hay faltante de $5
```

---

## Parte 2: Durante el Turno

### Estado de Caja Abierta

Mientras la caja está abierta:
- **POS habilitado** - Puedes procesar ventas
- **Ventas se acumulan** - Todas se asocian al turno activo
- **Contador visible** - Puedes ver ventas acumuladas
- **Anulaciones permitidas** - Con permisos adecuados

### Consultar Estado Actual

**Desde Dashboard:**
- Las estadísticas muestran datos del turno activo
- "Tesorería" = Base + Ventas

**Desde Cierre de Caja:**
1. Ve a "Cierre de Caja" en el menú
2. Tab "Turno Actual"
3. Ver resumen:
   - Base de apertura
   - Total de ventas
   - Desglose por método de pago
   - Ventas anuladas (si las hay)

---

## Parte 3: Cierre Fiscal (Reporte Z)

### ¿Qué es el Cierre Z?

Es el proceso de **finalizar el turno y generar un reporte fiscal** que documenta todas las transacciones. El cierre Z:

- ✅ Genera correlativo secuencial (Z-000001, Z-000002, etc.)
- ✅ Calcula totales de ventas, IVA, métodos de pago
- ✅ "Sella" todas las ventas del turno (ya no pueden modificarse)
- ✅ Reinicia contadores para el nuevo turno
- ✅ Imprime comprobante fiscal (opcional)

### Cómo Cerrar la Caja

**Paso 1: Ir a Cierre de Caja**
- Menú lateral → "Cierre de Caja"
- Tab "Turno Actual"

**Paso 2: Revisar Resumen**
Verifica las siguientes estadísticas:
- **Apertura:** Base inicial
- **Total Vendido:** Ingresos del turno
- **Gravado/Exento:** Desglose para IVA
- **Métodos de Pago:** Efectivo/Punto/Crédito
- **Ventas Anuladas:** Si existen

**Paso 3: Iniciar Cierre**
1. Clic en botón "Cerrar Turno" (ícono Lock 🔒)
2. Confirma en el diálogo de SweetAlert
3. **Opcional:** Marca "No imprimir comprobante" si no quieres ticket físico

**Paso 4: Generación Automática**
El sistema:
1. Genera número correlativo Z
2. Crea reporte fiscal completo
3. Marca todas las ventas con `corteId`
4. Guarda el corte en historial
5. Imprime (si no marcaste la opción)
6. Reinicia el estado de caja (ahora está CERRADA)

---

## Entendiendo el Reporte Z

### Secciones del Reporte

**1. Encabezado**
- Nombre del negocio
- RIF
- Dirección
- Fecha y hora del cierre
- ID del corte (Z-######)

**2. Periodo Fiscal**
- Hora de apertura
- Hora de cierre
- Usuario que cerró

**3. Totales de Ventas**
- **Total Bruto USD:** Total de todas las ventas
- **Total Bruto VES:** Equivalente en bolívares
- **Base Imponible:** Monto gravado sin IVA
- **IVA:** Impuesto calculado
- **Exento:** Ventas sin IVA

**4. Métodos de Pago**
- Efectivo USD
- Efectivo VES
- Punto de Venta (Digital)
- Crédito

**5. Rango de Facturas**
- Primera factura del turno
- Última factura del turno

**6. Estadísticas**
- Cantidad de transacciones
- Cantidad de productos vendidos
- Ticket promedio

**7. Ventas Anuladas** (si aplica)
- Listado de ventas anuladas
- Total de anulaciones

---

## Arqueo de Dinero

### ¿Qué es el Arqueo?

El arqueo es el proceso de **contar físicamente el dinero** y compararlo con lo que el sistema espera que tengas.

### Cómo Realizar el Arqueo

**Método Manual (Recomendado):**

1. **Cierra la caja** (genera el Reporte Z)
2. **Cuenta el dinero físico:**
   - Efectivo USD
   - Efectivo VES
3. **Compara con el reporte:**
   - **Esperado** = Base + Ventas en Efectivo
   - **Contado** = Tu conteo físico
   - **Diferencia** = Esperado - Contado

**Ejemplo de Arqueo:**

```
BASE INICIAL:
USD Cash: $100
VES Cash: Bs 1.000

VENTAS DEL TURNO:
• Efectivo USD: $450
• Efectivo VES: Bs 5.000
• Punto/Digital: $50 (no afecta efectivo)

ESPERADO AL CIERRE:
USD Cash: $100 + $450 = $550
VES Cash: Bs 1.000 + Bs 5.000 = Bs 6.000

CONTEO REAL:
USD Cash: $548
VES Cash: Bs 6.000

RESULTADO:
USD: Faltante de $2
VES: Cuadrado ✅
```

---

## Historial de Cierres Z

### Consultar Cierres Anteriores

1. Ve a "Cierre de Caja"
2. Tab "Historial Z"
3. Verás lista con todos los cierres:
   - ID del corte (Z-######)
   - Fecha y hora
   - Total vendido
   - Usuario que cerró

### Reimprimir Reporte Z

1. En el historial, localiza el cierre deseado
2. Clic en el ícono de impresora 🖨️
3. El reporte se imprime o muestra en pantalla

---

## Preguntas Frecuentes

**Q: ¿Puedo vender sin abrir caja?**  
A: No. El sistema requiere abrir caja antes de permitir ventas.

**Q: ¿Qué pasa si olvido ingresar la base inicial?**  
A: El sistema asumirá $0 como base. Esto afectará el cálculo de tesorería, pero puedes corregirlo manualmente en el arqueo.

**Q: ¿Puedo cerrar la caja sin ventas?**  
A: No. Si no hay movimientos, el sistema mostrará "Caja Fría" y no permitirá el cierre.

**Q: ¿Qué significa "sellar" las ventas?**  
A: Cuando cierras, todas las ventas del turno reciben un `corteId` que las marca como parte de ese cierre. Ya no pueden editarse ni anularse.

**Q: ¿Puedo abrir caja dos veces en el mismo día?**  
A: Sí, puedes cerrar y abrir múltiples veces. Cada cierre genera un nuevo Reporte Z.

**Q: ¿Qué pasa si marco "No imprimir comprobante"?**  
A: El cierre se realiza normalmente, pero no se imprime el ticket. Puedes imprimirlo después desde el historial.

**Q: ¿Cómo sé cuándo fue mi última apertura?**  
A: En el tab "Turno Actual" aparece la hora de apertura en la sección de estado.

**Q: ¿El cierre Z afecta el inventario?**  
A: No directamente. Las ventas ya descontaron stock cuando se procesaron. El cierre solo genera el reporte fiscal.

**Q: ¿Puedo ver ventas de cierres anteriores?**  
A: Sí, ve a "Historial de Ventas" y filtra por fecha. Las ventas tienen el `corteId` asociado.

---

## Permisos Requeridos

- **CAJA_ABRIR** - Abrir caja (Owner/Admin)
- **CAJA_CERRAR** - Cerrar caja y generar Z (Owner/Admin)
- **REP_VER_REPORTES** - Ver historial de cierres

---

## Troubleshooting

### Problema: No puedo abrir caja
**Solución:**
- Verifica que tengas permisos de CAJA_ABRIR
- Verifica que la caja no esté ya abierta
- Cierra sesión y vuelve a entrar

### Problema: El botón "Cerrar Turno" está deshabilitado
**Solución:**
- Verifica que haya ventas en el turno
- Verifica que tengas permisos de CAJA_CERRAR
- Verifica que la caja esté abierta

### Problema: Las ventas no aparecen en el resumen
**Solución:**
- Verifica que las ventas no estén anuladas
- Verifica que las ventas no tengan `corteId` de un cierre anterior
- Recarga la página

### Problema: El reporte Z muestra $0
**Solución:**
- Verifica que existan ventas completadas
- Verifica la tasa de cambio configurada
- Verifica que no todas las ventas estén anuladas

---

## Mejores Prácticas

### Apertura
✅ Cuenta el dinero físico ANTES de abrir  
✅ Registra montos exactos, no aproximados  
✅ Anota la base en un cuaderno físico de respaldo

### Durante el Turno
✅ Verifica el estado periódicamente  
✅ No mezcles dinero de turnos diferentes  
✅ Anula ventas erróneas de inmediato

### Cierre
✅ Cierra al finalizar el día o turno  
✅ Cuenta el efectivo cuidadosamente  
✅ Imprime el Reporte Z para tu archivo  
✅ Guarda el ticket físico por auditoría

### Arqueo
✅ Separa billetes por denominación  
✅ Cuenta dos veces para verificar  
✅ Documenta faltantes o sobrantes  
✅ Investiga diferencias mayores a $5

---

## Notas Técnicas

### Correlativo Z
- Secuencial e incremental (Z-000001, Z-000002...)
- Generado por `generarCorrelativo('z')`
- Almacenado en configuración del sistema

### Sellado de Ventas
- Campo `corteId` en tabla de ventas
- Bulk update para marcar todas las ventas
- Evita doble contabilización

### Cálculo de IVA
```javascript
taxRate = configuracion.porcentajeIva || 16
baseImponible = totalGravado / (1 + taxRate/100)
iva = totalGravado - baseImponible
```

### Métodos de Pago
- **Efectivo:** Requiere conteo físico
- **Digital/Punto:** No requiere conteo (ya está en banco)
- **Crédito:** No genera ingreso inmediato
