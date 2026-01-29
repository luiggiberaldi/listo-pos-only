# DIRECTIVA: INTEGRIDAD_FINANCIERA_4C_SOP

> **ID:** 2026-01-21-FIN
> **Script Asociado:** `src/hooks/store/useSalesProcessor.js`
> **Última Actualización:** 21/01/2026
> **Estado:** ACTIVO

---

## 1. Objetivos y Alcance
- **Objetivo Principal:** Blindar el núcleo transaccional del POS (4 Cuadrantes) contra inconsistencias contables, ataques de "Toxic Math" y fugas de capital en devoluciones.
- **Criterio de Éxito:** Aprobar el 100% de las pruebas en `useChaosValidator.js` (V3.0+).

## 2. Especificaciones de Entrada/Salida (I/O)

### Entradas (Inputs)
- **Objeto `ventaFinal`**: Contiene `items`, `total`, `pagos`, `esCredito`, `distribucionVuelto`.
- **Database (IndexedDB)**: Tablas `ventas`, `clientes`, `caja_sesion`.

### Salidas (Outputs)
- **Cuentas Balanceadas**: Actualización atómica de `db.clientes` (Deuda/Favor) y `db.ventas`.
- **Excepciones `CHAOS_GUARD`**: Errores controlados que detienen la persistencia si se viola una regla.

## 3. Flujo Lógico (Algoritmo)

1. **Validación de Sesión:** Verificar que la caja esté abierta (`db.caja_sesion`).
2. **Logic Guards (Pre-Commit):**
   - Verificar que no existan `NaN` o `null` en totales.
   - Validar que ventas a crédito tengan cliente y deuda > 0.
   - Bloquear métodos de pago "Crédito" en abonos de deuda.
3. **Consumo de Saldo:** Deducir `montoSaldoFavor` del cliente analizando el array de pagos.
4. **Persistencia Atómica:** Ejecutar `db.transaction` para productos, ventas y clientes.
5. **Reintegro (Solo Anulación):** Si se anula, reintegrar el consumo de wallet detectado en la venta original.

## 4. Herramientas y Librerías
- **Dexie.js**: Gestión de transacciones ACID en IndexedDB.
- **useChaosValidator**: Herramienta de estresado financiero.

## 5. Restricciones y Casos Borde (Edge Cases)
- **Límites:** El sistema de "Favor - Deuda" debe ser exclusivo; no pueden coexistir valores > 0 en ambos campos tras la normalización.
- **Formatos:** Todo monto debe pasar por `fixFloat` (2 decimales) antes de guardarse.
- **Concurrencia:** Las actualizaciones de saldo deben ser parte de una transacción de lectura/escritura (`rw`) para evitar condiciones de carrera.

## 6. Protocolo de Errores y Aprendizajes (Memoria Viva)

| Fecha | Error Detectado | Causa Raíz | Solución/Parche Aplicado |
|-------|-----------------|------------|--------------------------|
| 21/01 | Toxic Math (NaN) | Fallback `|| 0` ocultaba corrupción en frontend | Usar `Number.isNaN()` en los Guards antes de cualquier normalización. |
| 21/01 | Fugitive Wallet (Boomerang) | `anularVenta` no devolvía fondos pagados con saldo | Implementar detección de pagos `INTERNAL` en el flujo de anulación. |
| 21/01 | Infinite Debt Loop | Abono con método "Crédito" era permitido | Añadir guardia `G4` en `registrarAbono`. |
| 21/01 | Crash TicketSaldoFavor | Acceso a propiedades de `null` (cliente) | Implementar Optional Chaining `?.` en renderizado de tickets. |
| 21/01 | UI Ghost State (Mix) | Input de saldo activo tras quitar cliente | Limpieza automática en `useEffect` dentro de ModalPago. |
| 21/01 | Phantom Inflation (3 Decimals) | `$14.368` confundido con `$14k` | Forzar `fixFloat()` (2 decimales) antes de guardar cualquier abono. |

## 7. Ejemplos de Uso
El blindaje es automático dentro de los hooks:
```javascript
// Llamada estándar desde ModalPago
await registrarVenta(datosVenta); 
// Si hay un NaN, arrojará CHAOS_GUARD y no guardará nada.
```

## 8. Checklist de Pre-Ejecución
- [x] IndexedDB configurado con tablas `ventas` y `clientes`.
- [x] Configuración de tasa cargada.
- [x] Sesión de caja abierta.
- [x] UI Checks: Botones de Mix bloqueados si no hay cliente.

## 9. Checklist Post-Ejecución
- [x] Verificado que `db.clientes` no tenga Deuda y Favor al mismo tiempo.
- [x] Verificado que el Cierre de Caja cuadre tras anulaciones de Wallet.
- [x] Chaos Test V4.0 aprobado (17/17).
