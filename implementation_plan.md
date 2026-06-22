# Plan de Implementación: Alineación de Precisión Financiera y Eliminación de Drift

Este plan detalla las modificaciones para alinear la precisión y el flujo de redondeo financiero de **Listo POS (Main)** con el estándar comprobado de **Listo POS Lite**. 

La alineación corregirá los siguientes errores lógicos:
1. **Drift Visual Fila vs. Total**: La discrepancia de centavos en la que la suma de las filas mostradas en el ticket no coincide exactamente con el Gran Total.
2. **Desviación de Conversión a Bolívares (Bs)**: Las diferencias de céntimos en Bolívares que ocurren cuando un cliente multiplica manualmente el precio del dólar en pantalla por la tasa oficial.

---

## 🛠️ Cambios Propuestos

### 1. Ajuste del Cerebro de Cálculos del Carrito

#### [MODIFY] [usePosCalcStore.js](file:///c:/Users/luigg/Desktop/listo%20pos%202026/listo-pos-only/src/stores/usePosCalcStore.js)
- Modificar la función pura `computeCalcState(carrito, configuracion)` para que el subtotal y el impuesto de cada ítem se redondeen a 2 decimales en USD **antes** de acumularse en los totales globales y convertirse a Bolívares.
- **Implementación lógica propuesta:**
```javascript
function computeCalcState(carrito, configuracion) {
    const tasa = new Decimal(configuracion.tasa || 1);
    const ivaGlobal = configuracion.ivaActivo
        ? new Decimal(configuracion.porcentajeIva || 0)
        : new Decimal(0);
    const ivaDivisor = ivaGlobal.div(100);

    const { subtotalUSD, totalImpuestoUSD, totalUSD, carritoBS, totalBS_Sum } = carrito.reduce((acc, item, index) => {
        const precioUnitario = d(item.precio);
        const cantidad = d(item.cantidad);
        
        // 1. Redondear el subtotal de la línea en USD a 2 decimales inmediatamente
        const subtotalItemUSD = precioUnitario.times(cantidad).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

        // 2. Calcular el impuesto sobre la base ya redondeada del ítem y redondearlo a 2 decimales
        let impuestoItemUSD = d(0);
        if (!item.exento && item.aplicaIva !== false) {
            impuestoItemUSD = subtotalItemUSD.times(ivaDivisor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        }

        // 3. El total de la línea es la suma exacta de sus partes redondeadas a 2 decimales
        const totalItemUSD = subtotalItemUSD.plus(impuestoItemUSD);
        
        // 4. Convertir el total exacto de la línea a BS y redondear a 2 decimales
        const totalItemBS = totalItemUSD.times(tasa).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        acc.carritoBS[index] = totalItemBS.toNumber();

        // 5. Acumular los totales usando las bases e impuestos ya redondeados individualmente
        acc.subtotalUSD = acc.subtotalUSD.plus(subtotalItemUSD);
        acc.totalImpuestoUSD = acc.totalImpuestoUSD.plus(impuestoItemUSD);
        acc.totalUSD = acc.totalUSD.plus(totalItemUSD);
        acc.totalBS_Sum = acc.totalBS_Sum.plus(totalItemBS);
        
        return acc;
    }, { subtotalUSD: d(0), totalImpuestoUSD: d(0), totalUSD: d(0), carritoBS: [], totalBS_Sum: d(0) });

    return {
        subtotalBase: subtotalUSD.toNumber(),
        totalImpuesto: totalImpuestoUSD.toNumber(),
        totalUSD: totalUSD.toNumber(), // Libre de drift fila-vs-total
        totalBS: totalBS_Sum.toNumber(),
        carritoBS,
        tasa: tasa.toNumber(),
        ivaGlobal: ivaGlobal.toNumber(),
        tasaCaida: tasa.toNumber() === 1,
        tasaInvalida: configuracion?.tasa === 0,
    };
}
```

---

### 2. Sincronización del Controlador Financiero

#### [MODIFY] [FinancialController.js](file:///c:/Users/luigg/Desktop/listo%20pos%202026/listo-pos-only/src/controllers/FinancialController.js)
- Alinear `calculateCartTotals` con la misma lógica del store para garantizar simetría matemática entre el frontend y el backend/validador.
- Redondear la porción de conversión a dólares de los pagos recibidos en Bolívares a 2 decimales exactos en `calculatePaymentStatus`.

**Modificación de `calculateCartTotals`:**
```javascript
    calculateCartTotals: (items, taxRate = 0, exchangeRate = 1) => {
        let subtotalBase = 0;
        let totalImpuesto = 0;
        let totalUSD_Sum = 0;
        let totalBS_Sum = 0;
        let totalExento = 0;

        const processedItems = items.map(item => {
            const precio = math.round(item.precio);
            const cantidad = math.round(item.cantidad, 4);
            
            // Redondear subtotal del ítem a 2 decimales en USD
            const subtotalItemUSD = math.round(math.mul(precio, cantidad), 2);

            let impuestoItem = 0;
            if (!item.exento && item.aplicaIva !== false) {
                impuestoItem = math.round(math.mul(subtotalItemUSD, math.div(taxRate, 100)), 2);
            } else {
                totalExento = math.add(totalExento, subtotalItemUSD);
            }

            // Total del ítem en USD (suma de partes redondeadas)
            const totalItemUSD = math.add(subtotalItemUSD, impuestoItem);
            
            // Total del ítem en BS (conversión directa y redondeada a 2 decimales)
            const totalItemBS = math.round(math.mul(totalItemUSD, exchangeRate), 2);

            subtotalBase = math.add(subtotalBase, subtotalItemUSD);
            totalImpuesto = math.add(totalImpuesto, impuestoItem);
            totalUSD_Sum = math.add(totalUSD_Sum, totalItemUSD);
            totalBS_Sum = math.add(totalBS_Sum, totalItemBS);

            return {
                ...item,
                subtotalUSD: subtotalItemUSD,
                impuestoUSD: impuestoItem,
                totalUSD: totalItemUSD,
                totalBS: totalItemBS
            };
        });

        return {
            subtotalBase: math.round(subtotalBase),
            totalImpuesto: math.round(totalImpuesto),
            totalExento: math.round(totalExento),
            totalUSD: math.round(totalUSD_Sum),
            totalBS: math.round(totalBS_Sum),
            processedItems
        };
    }
```

**Modificación en `calculatePaymentStatus`:**
```javascript
            // Normalizar pago en Bs a dólares redondeando a 2 decimales
            let valInUSD = amount;
            if (p.currency === 'VES' || p.currency === 'BS' || p.tipo === 'BS') {
                valInUSD = exchangeRate > 0 ? math.round(math.div(amount, exchangeRate), 2) : 0;
                totalPagadoBS = math.add(totalPagadoBS, amount);
            } else {
                totalPagadoUSD = math.add(totalPagadoUSD, amount);
            }
```

---

## 📋 Plan de Verificación

### Pruebas Automatizadas
1. Ejecutar el script de pruebas unitarias internas de Listo POS:
   ```powershell
   node c:\Users\luigg\.gemini\antigravity-ide\brain\842c2ef1-c2b1-4dd2-9c9a-8aff3a1a531f\scratch\run_tests.mjs
   ```
2. Ejecutar la simulación de prueba en el entorno de desarrollo para validar que no haya regresiones ni compilaciones fallidas:
   ```powershell
   npm run build
   ```

### Verificación Manual
1. **Prueba de Drift en Carrito**:
   - Cargar un producto con precio `$1.005` y cantidad `5`.
   - Verificar que el total de la línea muestre `$1.01`.
   - Verificar que el Gran Total muestre **$5.05** (evitando el drift anterior de `$5.03`).
2. **Prueba de Drift en Bolívares**:
   - Cargar un producto de `$5.45`, cantidad `1.5` y tasa de `36.52 Bs/$`.
   - Verificar que el total en Bolívares del ítem muestre **298.73 Bs** (coincidiendo con `$8.18 * 36.52`, evitando el drift anterior de `298.55 Bs`).
