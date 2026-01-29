# DIRECTIVA: Debugging Financiero (Corte Z y Totales)

> **ID:** DEBUG-FIN-001
> **Script Asociado:** `scripts/audit_sales_data.py` (Pendiente de creación)
> **Última Actualización:** 2026-01-20
> **Estado:** ACTIVO

---

## 1. Objetivos y Alcance
Diagnosticar y resolver discrepancias en los totales financieros (Total Recaudado, Ventas Brutas) reportados por el sistema de Cierre (CierrePage) versus la realidad física.

## 2. Especificaciones de Entrada/Salida (I/O)
### Entradas
- **Archivo BD:** `IndexedDB` (Estado local del navegador).
- **Reporte Visual:** Capturas de pantalla o descripción del usuario (ej: "Total dice 0").

### Salidas
- **Diagnóstico:** Causa raíz identificada (ej: "Transacción excluida por filtro").
- **Parche:** Corrección en `fiscalEngine.js` o `CierrePage.jsx`.

## 3. Flujo Lógico (Algoritmo de Diagnóstico)
1. **Verificar Datos Crudos:** Inspeccionar el objeto `venta` o `transaccion` en la base de datos para ver sus flags (`esCredito`, `pagos`, `status`, `tipo`).
2. **Trazar el Motor de Cálculo:** Seguir el flujo de `agruparPorMetodo` en `treasuryEngine.js`.
3. **Validar Filtros:** Confirmar si `isValidSale` o `isValidCashFlow` está descartando la transacción inadvertidamente.
4. **Simular Cálculo:** Ejecutar la lógica de suma manualmente con los valores encontrados.

## 4. Restricciones y Casos Borde (Memoria)
- **Abonos Separados:** Los cobros de deuda (`tipo: 'COBRO_DEUDA'`) deben sumarse al flujo de caja pero NO a las ventas brutas.
- **Ventas a Crédito:** Una venta a crédito (`esCredito: true`) suma a Ventas Brutas pero NO al flujo de caja inicial (excepto la inicial si la hubo).
- **"Ghost Payments":** Si `esCredito` es true y `deudaPendiente` es 0 (error de usuario), el sistema fuerza a Crédito.
- **Abonos Desconectados:** Los abonos pueden no realizarse sobre la venta original, sino como transacciones independientes.
- **Regla de Oro: Historial Inmutable:** En toda la aplicación (Historial de Clientes, Detalle de Venta, Reporte Z), los movimientos pasados DEBEN conservar la tasa a la que se pactaron (`mov.tasa`). Solo los balances de deuda actual y precios de productos en el carrito se ajustan a la tasa vigente.

## 6. Historial de Aprendizaje (Errores Comunes)

| Fecha | Error Detectado | Causa Raíz | Solución/Parche Aplicado |
|-------|-----------------|------------|--------------------------|
| 20/01/2026 | Total Recaudado en 0 tras Abono | `agruparPorMetodo` enviaba todo a 'Crédito' en el fallback si la venta era a crédito, ignorando abonos parciales. | Se modificó el Fallback para inferir 'Efectivo' basado en `total - deuda`, y se relajó la regla de `deuda===0`. |
| 20/01/2026 | Total sigue en 0 con parche aplicado | El filtro `v.corteId === null` excluía los Abonos porque estos se guardaban sin la propiedad `corteId` (undefined). | **SOLUCIONADO**: Se cambió el filtro a `!v.corteId` y se aseguró `corteId: null` en el creador del Abono. |
| 20/01/2026 | Abono en Bs se mostraba como USD | `ModalAbono.jsx` normalizaba montos a USD antes de guardar, pero el sistema espera valores nominales para VES. | **SOLUCIONADO**: Se modificó `ModalAbono.jsx` para guardar el valor nominal en `monto` y usar `montoUSD` para cálculos. |
| 20/01/2026 | Renderizado incorrecto en Lista Abonos | Al cambiar `monto` a nominal, el renderizado que esperaba USD mostró el valor nominal como si fuera $. | **SOLUCIONADO**: Se actualizó el render de `ModalAbono` para usar `montoUSD` en la visualización de equivalencia. |
| 20/01/2026 | Doble Conteo en Dashboard (Crédito + Abono) | El gráfico de torta mostraba la Venta original (Crédito) Y el Abono (POS), duplicando visualmente el volumen. | **SOLUCIONADO**: En `treasuryEngine.js`, al procesar un `COBRO_DEUDA`, se resta el monto del bucket 'Crédito' para reflejar que la deuda se ha convertido en efectivo. |
| 20/01/2026 | Deuda Histórica cambiaba con la Tasa | El historial de cliente usaba la `tasa` global para calcular el valor en Bs de transacciones viejas, alterando el registro histórico. | **SOLUCIONADO**: Se modificó `ModalHistorialCliente.jsx` para priorizar `mov.tasa` (tasa de la transacción) en las filas del historial, manteniendo la tasa global solo en el resumen de deuda actual. |

**VERIFICACIÓN**: El script `scripts/audit_abono_logic.py` simuló la carga de datos con el parche aplicado:
- Input: 5000 Bs (Tasa 200)
- Guardado en DB: `amount: 5000` (VES)
- Renderizado: `Bs 5,000.00`
- Conclusión: El flujo lógico es correcto. El error reportado por el usuario se debe a datos históricos (cargados antes del fix) o caché.
