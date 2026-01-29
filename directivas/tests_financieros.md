# Directiva: Validación de Escenarios Financieros (TEST-FIN-001)

**Objetivo:** Asegurar que ningún cambio en el código (JS/React) rompa la lógica contable fundamental.
**Regla de Oro:** Si el script de Python no cuadra con la UI, la UI está mal.

## Escenarios Críticos (Regression Suite)

Todo cierre de caja debe soportar estoicamente estos casos:

### 1. Venta Contado Simple
- **Input:** Total $20, Pagado $20 (Efectivo/Digital).
- **Output Esperado:**
  - Recaudado: $20.
  - Ventas Brutas: $20.
  - Deuda: $0.

### 2. Venta a Crédito Total ("Fiado")
- **Input:** Total $50, Deuda $50, `esCredito: true`.
- **Output Esperado:**
  - Recaudado: $0.
  - Ventas Brutas: $50.
  - Deuda: $50.

### 3. Venta Mixta (Abono Inicial)
- **Input:** Total $100, Deuda $40, Pagado $60, `esCredito: true`.
- **Output Esperado:**
  - Recaudado: $60 (Debe detectarse incluso si el array de pagos está sucio, usando `Total - Deuda`).
  - Ventas Brutas: $100.
  - Deuda: $40.

### 4. Abono de Deuda (Cobro Posterior)
- **Input:** Transacción `tipo: 'COBRO_DEUDA'`, Total $40.
- **Output Esperado:**
  - Recaudado: $40.
  - Ventas Brutas: $0 (Ya se sumó cuando se hizo la venta original).
  - Deuda: -$40 (Reduce la deuda del cliente).

### 5. El Caso "Fantasma" (Usuario Error)
- **Input:** `esCredito: true` pero `deuda: 0` (Usuario marcó crédito pero cobró todo).
- **Output Esperado:**
  - Recaudado: Total de la venta (El sistema asume cobro implícito).
  - Ventas Brutas: Total de la venta.
  - Deuda: $0.

## Procedimiento de Auditoría
1. Registrar las transacciones en formato JSON (como existen en DexieDB).
2. Correr `scripts/audit_closing_scenarios.py`.
3. Comparar TOTALES.
