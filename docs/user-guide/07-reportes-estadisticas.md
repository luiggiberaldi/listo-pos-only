# Reportes y Estadísticas - Guía Completa

## Propósito
El panel de Reportes y Estadísticas proporciona análisis de negocio en tiempo real: KPIs financieros, gráficos de tendencias, productos estrella y mejores clientes.

## Cómo Acceder
- Menú lateral → "Reportes" o "Estadísticas"
- O desde Dashboard → "Reportes"

---

## Interfaz Principal

### Elementos de la Pantalla

**1. Cabecera**
- Título: "Análisis de Negocio"
- Fecha de actualización de datos
- Total de transacciones analizadas

**2. KPIs Financieros** (4 tarjetas principales)
- Ventas Hoy
- Ganancia Estimada
- Ticket Promedio
- Total del Mes

**3. Gráfico de Ritmo de Ventas**
- Heatmap por hora del día
- Muestra actividad de ventas

**4. Top Performers** (2 columnas)
- Productos Estrella
- Mejores Clientes

---

## KPIs Financieros

### 1. Ventas Hoy

**Qué muestra:**
- Total de ingresos del día actual en USD
- Cantidad de operaciones completadas
- Porcentaje de variación vs ayer

**Indicadores:**
- 🟢 Verde con flecha arriba: Ventas aumentaron vs ayer
- 🔴 Rojo con flecha abajo: Ventas disminuyeron vs ayer
- Porcentaje muestra la diferencia exacta

**Ejemplo:**
```
Ventas Hoy: $1,250
15 operaciones finalizadas
↑ 18% vs ayer
```

### 2. Ganancia Estimada

**Qué muestra:**
- Margen neto del día (Ventas - Costos)
- Calculado automáticamente por producto

**Cómo se calcula:**
```
Ganancia = Σ(precio_venta - costo) por cada producto vendido
```

**Nota:** Es "estimada" porque usa el costo registrado en cada producto.

### 3. Ticket Promedio

**Qué muestra:**
- Gasto medio por cliente
- Indica valor promedio de cada venta

**Cómo se calcula:**
```
Ticket Promedio = Total Vendido / Cantidad de Ventas
```

**Ejemplo:**
```
Total vendido: $1,250
Ventas: 15
Ticket Promedio: $83.33
```

**Utilidad:**
- Benchmark para promociones
- Identificar oportunidades de upselling
- Comparar con días anteriores

### 4. Total del Mes

**Qué muestra:**
- Suma de ventas del mes actual
- Cantidad total de ventas del mes

**Resetea:**
- Automáticamente el día 1 de cada mes

---

## Gráfico: Ritmo de Ventas

### Qué es

Un **heatmap horizontal** que muestra las ventas por cada hora del día actual (0h - 23h).

### Cómo Leer

**Barras:**
- **Altura** = Monto vendido en esa hora
- **Color azul** = Actividad registrada
- **Gris** = Sin ventas en esa hora

**Tooltip:**
- Pasa el mouse sobre una barra
- Muestra monto exacto vendido

**Etiquetas:**
- Cada 4 horas aparece la hora (0h, 4h, 8h, etc.)

### Ejemplo de Interpretación

```
8h: Barra pequeña ($50) → Apertura lenta
12h: Barra grande ($400) → Hora pico (mediodía)
18h: Barra mediana ($200) → Segunda ola
2h: Sin barra → Cerrado
```

### Utilidad

- **Identificar horas pico** para planificar personal
- **Detectar patrones** de compra
- **Optimizar horarios** de atención
- **Planificar promociones** en horas bajas

---

## Top Performers

### Productos Estrella

**Qué muestra:**
- Top 5 productos más vendidos (por ingresos)
- Cantidad de unidades vendidas
- Total de ingresos generados

**Ordenamiento:**
- #1 = Mayor ingreso total
- Calculado: Precio × Cantidad vendida

**Formato:**
```
#1 COCA-COLA 2L
   45 unidades vendidas
   $135
```

**Utilidad:**
- Identificar qué reabastecer
- Productos a destacar
- Análisis de demanda

### Mejores Clientes

**Qué muestra:**
- Top 5 clientes con más gasto total
- Cantidad de visitas registradas
- Total gastado histórico

**Ordenamiento:**
- #1 = Mayor gasto acumulado
- Considera todas las compras (no solo hoy)

**Formato:**
```
JP  JUAN PÉREZ
    12 visitas registradas
    $450
```

**Utilidad:**
- Identificar clientes VIP
- Programas de fidelización
- Ofertas personalizadas

---

## Permisos y Restricciones

### Permiso: REP_VER_TOTAL_DIARIO

**Si tienes permiso:**
- ✅ Ves todos los KPIs financieros
- ✅ Ves montos exactos de ventas y ganancias
- ✅ Acceso completo al panel

**Si NO tienes permiso:**
- ❌ KPIs financieros bloqueados con candado 🔒
- ✅ Puedes ver Ritmo de Ventas (sin montos)
- ✅ Puedes ver Top Productos y Clientes (sin montos)
- ⚠️ Mensaje: "Información Financiera Protegida"

### Quién tiene permiso por defecto

- **Owner (Propietario):** ✅ Sí
- **Administrador:** ✅ Sí
- **Cajero:** ❌ No
- **Vendedor:** ❌ No

---

## Interpretación de Datos

### Variación vs Ayer

**Verde (Positiva):**
- Ventas de hoy > Ventas de ayer
- Indicador de crecimiento

**Roja (Negativa):**
- Ventas de hoy < Ventas de ayer
- No necesariamente malo (lunes vs domingo)

**Contexto importante:**
- Compara días similares (Lunes con Lunes)
- Considera eventos especiales
- Analiza tendencias semanales/mensuales

### Análisis de Ganancia

**Ganancia Alta + Ventas Altas:**
- 🟢 Excelente: Buenos productos, buenos márgenes

**Ganancia Baja + Ventas Altas:**
- 🟡 Revisar: Mucho volumen, poco margen (¿precios bajos?)

**Ganancia Alta + Ventas Bajas:**
- 🟡 Oportunidad: Buenos márgenes, necesitas más tráfico

**Ganancia Baja + Ventas Bajas:**
- 🔴 Crítico: Revisar estrategia de precios y tráfico

---

## Casos de Uso Comunes

### Caso 1: Planificar Personal

```
Objetivo: Optimizar turnos de empleados

1. Revisa Ritmo de Ventas
2. Identifica horas pico (12h-14h, 18h-20h)
3. Asigna más personal en esas horas
4. Reduce  personal en horas bajas (3h-6h)
```

### Caso 2: Decidir Qué Reabastecer

```
Objetivo: Compra inteligente de inventario

1. Ve a Productos Estrella
2. Anota Top 5 con mayor rotación
3. Prioriza reabastecimiento de esos productos
4. Evita sobrestockear productos que no aparecen
```

### Caso 3: Programa de Fidelización

```
Objetivo: Recompensar clientes frecuentes

1. Ve a Mejores Clientes
2. Identifica Top 10 (desplaza si hay más)
3. Crea descuentos especiales para ellos
4. Contacta para agradecer su preferencia
```

### Caso 4: Análisis de Rendimiento Semanal

```
Lunes: $500
Martes: $450 (-10%)
Miércoles: $600 (+33%)
Jueves: $550 (-8%)
Viernes: $800 (+45%)

Conclusión: Viernes es el mejor día
Acción: Planificar promociones para Martes (día bajo)
```

---

## Preguntas Frecuentes

**Q: ¿Los datos se actualizan en tiempo real?**  
A: Sí, cada vez que completas una venta, se reflejaautomáticamente en el Dashboard.

**Q: ¿Puedo ver estadísticas de meses anteriores?**  
A: Actualmente no. El panel muestra: Hoy y Mes Actual.

**Q: ¿Por qué mi ganancia es negativa?**  
A: Si los costos de productos están mal configurados (muy altos), la ganancia calculada puede ser negativa. Revisa costos en Inventario.

**Q: ¿El Ritmo de Ventas se resetea cada día?**  
A: Sí, muestra solo las ventas del día actual.

**Q: ¿Cuántos productos/clientes muestra el Top?**  
A: Máximo 5 de cada uno.

**Q: ¿Puedo exportar estos datos?**  
A: Actualmente no hay función de exportación automática.

**Q: ¿Qué pasa si no hay ventas hoy?**  
A: Todos los KPIs mostrarán $0 y el gráfico estará vacío.

---

## Troubleshooting

### Problema: Todos los KPIs muestran $0
**Solución:**
- Verifica que haya ventas completadas hoy
- Verifica que la caja esté abierta
- Recarga la página

### Problema: "Información Financiera Protegida"
**Solución:**
- Contacta al administrador para solicitar permisos
- Tu rol actual no permite ver montos financieros

### Problema: La ganancia no coincide
**Solución:**
- Verifica costos de productos en Inventario
- Asegúrate de que todos los productos tengan costo configurado
- La ganancia es "estimada" basada en costos registrados

### Problema: No aparecen clientes en Top Clientes
**Solución:**
- Verifica que estés vendiendo con clientes seleccionados
- Las ventas "Sin Cliente" no cuentan para este ranking

---

## Mejores Prácticas

### Análisis Diario
✅ Revisa KPIs cada mañana al abrir  
✅ Compara con el día anterior  
✅ Identifica tendencias semanales  
✅ Ajusta estrategia según resultados

### Optimización de Inventario
✅ Reabastece Productos Estrella primero  
✅ Evalúa eliminar productos que nunca aparecen en Top  
✅ Ajusta precios si margen es muy bajo  
✅ Promociona productos de difícil rotación

### Gestión de Clientes
✅ Contacta Mejores Clientes mensualmente  
✅ Ofrece descuentos exclusivos  
✅ Pide feedback sobre experiencia  
✅ Fideliza con programas de puntos

### Planificación Operativa
✅ Usa Ritmo de Ventas para turnos  
✅ Prepara inventario antes de horas pico  
✅ Planifica limpieza en horas bajas  
✅ Ajusta horario de atención según datos

---

## Notas Técnicas

### Motor de BI (Business Intelligence)
- **Hook:** `useUnifiedAnalytics`
- **Actualización:** Tiempo real (reactivo)
- **Caché:** En memoria durante sesión

### Cálculos

**Variación vs Ayer:**
```javascript
variacion = ((ventasHoy - ventasAyer) / ventasAyer) * 100
```

**Ticket Promedio:**
```javascript
ticketPromedio = totalVentas / cantidadVentas
```

**Ganancia:**
```javascript
ganancia = Σ((precioVenta - costo) × cantidad)
```

### Performance
- Optimizado para 10,000+ ventas
- Cálculos en <50ms
- Gráficos renderizados con CSS puro (no canvas)
