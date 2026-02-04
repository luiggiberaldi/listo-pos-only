# Total Diario (Corte Z) - Guía Completa

## Propósito
El **Total Diario** (también conocido como **Corte Z**) es el módulo de auditoría fiscal que consolida todas las transacciones de un período específico, mostrando:
- Resumen financiero completo (ventas, costos, ganancias)
- Desglose por métodos de pago
- Arqueo de fondos en caja (efectivo + digital)
- Cálculos de impuestos (IVA + IGTF)
- Conversión multi-moneda (USD ↔ BS)

## Cómo Acceder
**Ruta:** `/total-diario`

**Desde el Dashboard:**
- Clic en "Total Diario" (sidebar)
- O badge "Ver Corte Z" en cuadros fiscales

**Requiere Permiso:** `REP_VER_TOTAL_DIARIO`

---

## Interfaz Principal

### Header

**Título:** "Total Diario" + 🛡️ (Shield Check)  
**Subtítulo:** "Auditoría detallada de flujos de caja"

**Botón Volver:** Regresa al Dashboard

---

### Selector de Rango Temporal

**4 Opciones de filtrado:**

####1. HOY (Default)
-Desde: 00:00:00  
- Hasta: 23:59:59  
- Incluye: Ventas del día actual

#### 2. SEMANA
- Desde: Lunes de la semana actual  
- Hasta: Hoy (23:59:59)  
- Incluye: Últimos 7 días ajustados al lunes

#### 3. MES
- Desde: Día 1 del mes actual  
- Hasta: Hoy (23:59:59)  
- Incluye: Todo el mes en curso

#### 4. PERSONALIZADO (Custom)
**Inputs mostrados:**
- **Desde:** Selector de fecha (date picker)
- **Hasta:** Selector de fecha (date picker)
- Ícono de búsqueda

**Validación:**
- "Hasta" debe ser >= "Desde"
- Si solo defines "Desde", asume "Hasta" = mismo día

---

## Panel 1: Resultados del Período (Fiscal Summary)

**Card superior con degradado profesional**

### Cuatro Métricas Principales

#### 1. Ventas Brutas
**Qué es:**
- Total facturado incluyendo impuestos
- Suma de TODAS las ventas aprobadas

**Cálculo:**
```javascript
ventasBrutas = Σ(venta.total) donde venta.status !== 'ANULADA'
```

**Indicador Rojo:**
- "Impuestos: -$X.XX"
- Suma de IVA + IGTF

**Ejemplo:**
```
Ventas Brutas: $1,200.00
Impuestos: -$180.00 (IVA $160 + IGTF $20)
```

---

#### 2. Ingreso Neto (Base Imponible)
**Qué es:**
- Dinero real del negocio SIN impuestos
- Base para calcular rentabilidad

**Cálculo:**
```javascript
ingresoNeto = ventasBrutas - totalImpuestos
```

**Color:** Azul (indica liquidez real)

**Ejemplo:**
```
Ventas Brutas: $1,200
IVA + IGTF: -$180
Ingreso Neto: $1,020
```

---

#### 3. Costo de Mercancía
**Qué es:**
- Costo total de los productos vendidos
- Dinero invertido en inventario para estas ventas

**Cálculo:**
```javascript
costoMercancía = Σ(item.cantidad × producto.costo)
```

**Color:** Naranja (gasto)

**Nota:** Solo visible para usuarios con permiso `INV_VER_COSTOS`

**Ejemplo:**
```
Producto A: 10 unidades × $5 = $50
Producto B: 5 unidades × $20 = $100
Costo Total: $150
```

---

#### 4. Ganancia Neta
**Qué es:**
- Utilidad real después de impuestos y costos
- Métrica clave de rentabilidad

**Cálculo:**
```javascript
gananciaNeta = ingresoNeto - costoMercancía
```

**Colores Dinámicos:**
- 🟢 Verde: Ganancia > 0 (exitoso)
- 🔴 Rojo: Ganancia < 0 (pérdida)

**Badge de Margen:**
```javascript
margen % = (gananciaNeta / ingresoNeto) × 100
```

**Ejemplo Ganador:**
```
Ingreso Neto: $1,020
Costo: -$400
Ganancia: $620
Margen: 60.78%
```

**Ejemplo Pérdida:**
```
Ingreso Neto: $500
Costo: -$700
Pérdida: -$200
Margen: -40%
```

---

### Interpretación del Panel Fiscal

**Escenario Saludable:**
- ✅ Ventas Brutas creciendo
- ✅ Ingreso Neto > 60% de Ventas Brutas
- ✅ Ganancia Neta positiva
- ✅ Margen > 30%

**Escenario de Alerta:**
- ⚠️ Margen < 20% (precios bajos o costos altos)
- ⚠️ Ganancia negativa (vendiendo por debajo del costo)
- ⚠️ IVA/IGTF > 20% (verificar configuración de impuestos)

---

## Panel 2: Monitor de Tesorería

**Panel dividido en 2 columnas**

### Columna Izquierda: GAVETA DIVISAS (USD)

**Encabezado:**
- Ícono: $ (verde)
- Título: "GAVETA DIVISAS"
- Subtítulo: "Efectivo, Zelle, Binance"

#### Lista de Métodos

**Desglose por método de pago:**
```
Fondo de Apertura      $ 100.00  🔒
Efectivo $             $ 350.50
Zelle                  $ 220.00
TDC Internacional      $ 180.75
─────────────────────────────────
Total Divisas (Neto):  $ 851.25
```

**Fondo de Apertura:**
- Destacado con fondo verde claro
- Ícono de candado 🔒
- Suma de todos los fondos de apertura del día
- Incluye cierres anteriores + turno activo

**Métodos Excluidos:**
- "Crédito" NO aparece aquí (se muestra aparte)

**Visual:**
- Hover: fondo cambia levemente
- Fuente: Mono (números alineados)

---

### Columna Derecha: GAVETA BOLÍVARES (BS)

**Encabezado:**
- Ícono: Billete (azul)
- Título: "GAVETA BOLÍVARES"
- Subtítulo: "Pago Móvil, Punto, Efectivo Bs"

#### Lista de Métodos

**Desglose por método de pago:**
```
Fondo de Apertura      Bs 500.00
Pago Móvil             Bs 1,250.30
Punto de Venta         Bs 850.75
Efectivo Bs            Bs 300.00
──────────────────────────────────
Total Bolívares (Neto): Bs 2,901.05
```

**Características:**
- Mismo formato que Divisas
- Fondo de apertura incluido
- Conversión NO aplicada (valores nativos)

---

### Sección Especial: Cuentas por Cobrar (Créditos)

**Aparece solo si hay ventas a crédito**

**Card morado inferior:**

**Encabezado:**
- Ícono: Billetera (morado)
- Título: "CUENTAS POR COBRAR"

#### Cálculo Inteligente

**Crédito Generado:**
- Ventas a crédito del período
- Total facturado sin pago inmediato

**Abonos Aplicados:**
- Cobros de deuda del mismo período
- Vueltos aplicados a deuda automáticamente

**Crédito Neto:**
```javascript
creditoNeto = creditoGenerado - abonosRealizados
```

**Ejemplo:**
```
Ventas a crédito: $500
Abonos recibidos: -$200
Crédito Neto: $300 (pendiente de cobro)
```

**Estados Visuales:**

**Crédito Pendiente:**
```
CUENTAS POR COBRAR
Generado $500 - Abonos $200
                      $ 300.00
```

**Totalmente Cobrado:**
```
CUENTAS POR COBRAR
               ¡Cobrado Totalmente! ✅
```

---

### Sección Especial: Saldos a Favor (Monedero)

**Aparece solo si hay vueltos aplicados a monedero**

**Card naranja inferior:**

**Encabezado:**
- Ícono: PieChart (naranja)
- Título: "SALDOS A FAVOR (PASIVO)"
- Subtítulo: "Dinero en gaveta que pertenece a clientes (Monedero)"

**Qué representa:**
- Vueltos que el cliente NO retiró
- Aplicados a su monedero virtual
- Dinero en caja que NO es del negocio (pasivo)

**Ejemplo:**
```
Cliente compra por $48 y paga con $50
Vuelto $2 aplicado a Monedero
Gaveta tiene $50, pero $2 son del cliente
```

**Visual:**
```
SALDOS A FAVOR (PASIVO)
Dinero en gaveta que pertenece a clientes
                              $ 25.50
```

---

### Footer Consolidado: Patrimonio Total

**Panel gris inferior con dos totales:**

#### Total en Dólares
```javascript
totalUSD = (USDcash + USDdigital) + (BScash + BSdigital) / tasa
```

**Incluye:**
- Efectivo $ + Digital $
- Bolívares convertidos a USD (usando tasa configurada)
- Fondo de apertura

**Excluye:**
- Créditos pendientes
- Monedero de clientes

---

#### Total en Bolívares
```javascript
totalBS = (USDcash + USDdigital) × tasa + (BScash + BSdigital)
```

**Incluye:**
- Efectivo Bs + Digital Bs
- Dólares convertidos a BS (usando tasa configurada)
- Fondo de apertura

---

**Visual del Footer:**
```
⚖️ Patrimonio Consolidado
Suma total convertida a una sola moneda

Expresado en Dólares      |  Expresado en Bolívares
     $ 1,250.30           |      Bs 62,515.00
                          
Tasa de Cambio: 1 USD = 50.00 BS
```

---

## Filtrado y Búsqueda

### Rango: HOY

**Automático:**
- Al cargar la página
- Desde 00:00:00 hasta 23:59:59
- Incluye turno actual activo

**Fondo de Apertura:**
- Suma de aperturas de turnos cerrados HOY
- + Apertura del turno activo (si hay)

---

### Rango: SEMANA

**Lógica:**
```javascript
const hoy = new Date();
const diaSemana = hoy.getDay() || 7; // Domingo = 7
const lunes = new Date(hoy);
lunes.setDate(hoy.getDate() - diaSemana + 1);

desde = lunes 00:00:00
hasta = hoy 23:59:59
```

**Ventas Incluidas:**
- Lunes a Hoy (semana parcial o completa)

**Fondo de Apertura:**
- NO aplicado (solo para "HOY")
- Se muestra solo ventas acumuladas

---

### Rango: MES

**Lógica:**
```javascript
const hoy = new Date();
const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

desde = primerDia 00:00:00
hasta = hoy 23:59:59
```

**Ventas Incluidas:**
- Día 1 del mes hasta Hoy

---

### Rango: PERSONALIZADO

**Inputs:**
1. Fecha Desde (requerido)
2. Fecha Hasta (opcional, default = Desde)

**Validación:**
- Hasta >= Desde
- Fechas pasadas permitidas
- Fechas futuras: sin resultados

**Ejemplo:**
```
Desde: 2026-01-15
Hasta: 2026-01-31

Resultados: Ventas del 15 al 31 de enero
```

---

## Casos de Uso Comunes

### Caso 1: Cuadre de Caja al Final del Día

```
Objetivo: Verificar que gaveta física coincide con sistema

1. Total Diario → Rango: HOY
2. Ver "Monitor de Tesorería"
3. Anotar:
   - Efectivo $ (sistema)
   - Efectivo Bs (sistema)
4. Contar gaveta físicamente
5. Comparar

COINCIDE → ✅ Cierre correcto
NO COINCIDE → ⚠️ Investigar diferencias
```

---

### Caso 2: Reporte Semanal para Gerencia

```
Objetivo: Presentar resultados de la semana

1. Total Diario → Rango: SEMANA
2. Ver "Resultados del Período":
   - Ventas Brutas
   - Ganancia Neta
   - Margen %
3. Captura de pantalla
4. Enviar a gerente/dueño

Métricas clave:
- ¿Ganancia positiva?
- ¿Margen > 30%?
- ¿Cuántas transacciones?
```

---

### Caso 3: Auditoría Fiscal Mensual

```
Objetivo: Preparar documentos para contador

1. Total Diario → Rango: MES (o Custom: 1-31)
2. Anotar:
   - Ventas Brutas: $XXX
   - IVA Recaudado: $XXX
   - IGTF Cobrado: $XXX
   - Ingreso Neto: $XXX
3. Ver "Monitor de Tesorería":
   - Desglose por método de pago
4. Exportar o captura de pantalla

Documentos para contador:
- Total Ventas
- Impuestos desglosados
- Métodos de pago
```

---

### Caso 4: Análisis de Rentabilidad por Período

```
Objetivo: Evaluar si el negocio es rentable

1. Total Diario → Rango: MES
2. Ver "Ganancia Neta"
3. Calcular:
   - Ganancia / Días del mes = Ganancia Diaria Promedio
   - Margen % (badge automático)

Decisiones:
- Margen < 20% → Subir precios o reducir costos
- Ganancia negativa → Revisar productos no rentables
- Comparar con mes anterior
```

---

### Caso 5: Verificar Deudas Pendientes

```
Objetivo: Saber cuánto deben los clientes

1. Total Diario → Rango: HOY (o SEMANA/MES)
2. Scroll a "Cuentas por Cobrar"
3. Ver:
   - Crédito Generado: $XXX
   - Abonos: -$XXX
   - Crédito Neto: $XXX

Acciones:
- Si Crédito Neto > $500 → Llamar clientes morosos
- Si "Cobrado Totalmente" → ✅ Excelente recuperación
```

---

## Permisos y Restricciones

### Permiso Requerido: `REP_VER_TOTAL_DIARIO`

**Roles con Acceso:**
- ✅ ADMIN
- ✅ GERENTE
- ✅ SUPERVISOR
- ❌ CAJERO (sin acceso)

**Sin Permiso:**
- Pantalla roja de acceso denegado
- Mensaje: "No tienes autorización para auditar los totales diarios"
- Botón "Volver al Inicio"

---

### Permiso para Ver Costos: `INV_VER_COSTOS`

**Sin este permiso:**
- Panel "Costo de Mercancía" muestra: "---"
- Ganancia Neta: oculta
- Margen %: oculto

**Con permiso:**
- Todos los cálculos financieros visibles

---

## Diferencias con Cierre de Caja

| Aspecto | Total Diario (Corte Z) | Cierre de Caja |
|---------|------------------------|----------------|
| **Propósito** | Auditar financiera global | Cuadre de turno específico |
| **Alcance** | Día/Semana/Mes completo | Solo 1 turno |
| **Fondo Apertura** | Suma de todos los turnos | Solo de este turno |
| **Usuarios** | Gerencia/Contabilidad | Cajero que cierra |
| **Acción** | Solo visualiza | Cierra y registra |
| **Créditos** | Genera estado consolidado | No gestiona créditos |
| **Exportable** | Sí (captura/print) | Sí (ticket impreso) |

---

## Preguntas Frecuentes

**Q: ¿Por qué el Total Diario no coincide con la suma de mis cierres?**  
A: Total Diario incluye:
- Cierres registrados
- Turno activo (si no has cerrado)
- Fondo de apertura acumulado

**Q: ¿Puedo ver el Total Diario de ayer?**  
A: Sí, usa filtro "PERSONALIZADO" y selecciona la fecha de ayer.

**Q: ¿El IGTF se resta automáticamente en Ganancia Neta?**  
A: Sí, el cálculo es:
```
Ventas Brutas - IVA - IGTF = Ingreso Neto
Ingreso Neto - Costos = Ganancia Neta
```

**Q: ¿Qué significa "Patrimonio Consolidado"?**  
A: Es el dinero total en caja expresado en una sola moneda (USD o BS), aplicando la tasa de cambio configurada.

**Q: ¿Las ventas anuladas aparecen en el Total Diario?**  
A: NO. Solo ventas con status `COMPLETADA` o `CREDITO`.

**Q: ¿Por qué aparece "Saldos a Favor (Pasivo)"?**  
A: Cuando un cliente deja vuelto en su monedero virtual. Es dinero en tu gaveta que NO es tuyo legally (es del cliente).

**Q: ¿Puedo exportar este reporte?**  
A: No hay botón directo de exportación, pero puedes:
- Captura de pantalla (Print Screen)
- Imprimir página (Ctrl+P)
- Copiar datos manualmente

**Q: ¿El "Fondo de Apertura" debería sumar a mis ventas?**  
A: NO. Es capital inicial. Las ventas son ADICIONALES al fondo. Ejemplo:
```
Fondo: $100
Ventas: $500
Total en Gaveta: $600 ($100 capital + $500 ganado)
```

---

## Troubleshooting

### Problema: No veo ninguna venta

**Solución:**
1. Verifica el rango de fechas
2. Si es "Custom", asegura que "Desde" esté definido
3. Verifica que haya ventas registradas en ese período
4. Revisa que las ventas no estén anuladas

---

### Problema: El total no coincide con mi cálculo manual

**Solución:**
1. Total Diario incluye fondo de apertura
2. Excluye ventas anuladas automáticamente
3. Aplica tasa de cambio configurada (no tasa externa)
4. Verifica si hay créditos (no suman a gaveta física)

---

### Problema: "Ganancia Neta" muestra "---"

**Solución:**
- No tienes permiso `INV_VER_COSTOS`
- Contacta administrador para solicitar acceso
- O usa rol GERENTE/ADMIN

---

### Problema: Fondo de Apertura es $0 pero abrí con $100

**Solución:**
- Solo funciona en rango "HOY"
- Si filtraste "SEMANA" o "MES", no se aplicafondo
- Cambia a "HOY" para ver el fondo

---

## Mejores Prácticas

### Revisión Diaria
✅ Consultar Total Diario al final de cada jornada  
✅ Comparar "Patrimonio Consolidado" con gaveta física  
✅ Verificar que "Ganancia Neta" sea positiva  
✅ Revisar "Cuentas por Cobrar" y gestionar cobranza

### Reportes Periódicos
✅ Semanal: Evaluar tendencias de venta  
✅ Mensual: Preparar documentos fiscales  
✅ Comparar margen % mes a mes  
✅ Identificar días de mayor/menor ganancia

### Auditoría Financiera
✅ Exportar captura mensual para contador  
✅ Documentar IVA/IGTF recaudado  
✅ Verificar configuración de impuestos periódicamente  
✅ Mantener sincronizada la tasa de cambio

### Gestión de Créditos
✅ Monitorear "Cuentas por Cobrar" diariamente  
✅ Si crédito > $1000, activar cobranza  
✅ Registrar abonos en el sistema inmediatamente  
✅ Verificar que "Crédito Neto" disminuya con el tiempo

---

## Notas Técnicas

### Cálculo de IVA
```javascript
baseImponible = precioProducto / (1 + (ivaRate / 100))
ivaTotal = precioProducto - baseImponible
```

### Cálculo de IGTF
```javascript
if (metodoPago.aplicaIGTF) {
  igtfMonto = subtotal × (igtfRate / 100)
  totalFinal = subtotal + igtfMonto
}
```

### Conversión Multi-Moneda
```javascript
// USD a BS
totalBS = totalUSD × tasaCambio

// BS a USD
totalUSD = totalBS / tasaCambio
```

### Filtro de Ventas Válidas
```javascript
ventasValidas = ventas.filter(v => 
  v.status !== 'ANULADA' && 
  v.tipo !== 'ANULADO' &&
  v.fecha >= rangoInicio &&
  v.fecha <= rangoFin
)
```

### Agrupación de Métodos
```javascript
// Separa por tipo de moneda
metodosDivisas = metodos.filter(m => m.tipo === 'DIVISA')
metodosBolivares = metodos.filter(m => m.tipo === 'BS')

// Suma por método
total[metodo.nombre] += pago.monto
```
