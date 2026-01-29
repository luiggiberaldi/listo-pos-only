# DIRECTIVA: ECOSISTEMA FINANCIERO DE CLIENTES (4 CUADRANTES)

> **ID:** FENIX-FIN-002
> **Script Asociado:** `scripts/verify_financial_logic.js` (Opcional)
> **Última Actualización:** 2026-01-20
> **Estado:** ACTIVO
> **Versión Schema:** V7 (Quadrants)

---

## 1. Objetivos y Alcance
Este documento define la **Lógica Sagrada** de cómo se manejan los saldos de clientes. Ninguna función o script debe violar estos principios.
- **Objetivo Principal:** Garantizar la integridad matemática entre la Deuda (Lo que el cliente debe) y el Favor (Lo que el negocio debe al cliente).
- **Criterio de Éxito:** La suma de `Deuda - Favor` siempre debe igualar el `Saldo` neto. Jamás deben existir ambos positivos simultáneamente de forma incoherente (Normalización Estricta).

---

## 2. Los 4 Cuadrantes de Impacto (Customer Impact Logic)

Al procesar cualquier venta o abono, el sistema mueve dinero a través de 4 cuadrantes lógicos:

### Q0: Consumo de Saldo a Favor (Wallet Payment)
- **Definición:** El cliente paga usando dinero que ya tenía en su "Monedero" (Favor).
- **Regla:** Reduce el `Favor`. No toca la `Deuda` ni la Caja física.
- **Cálculo:** `Favor = Favor - MontoSaldoFavor`.

### Q1: Generación de Deuda (Credit)
- **Definición:** El cliente se lleva mercancía sin pagar (Fiado).
- **Regla:** Aumenta la `Deuda`.
- **Cálculo:** `Deuda = Deuda + DeudaPendiente`.

### Q2: Abono a Deuda (Debt Payment from Change)
- **Definición:** El cliente paga con un billete grande (o abona) y el sobrante se aplica automáticamente a pagar su deuda vieja.
- **Regla:** "El Vuelto mata Deuda". Si hay vuelto y hay deuda, se paga la deuda primero.
- **Cálculo:** `Deuda = Deuda - VueltoAplicado`.

### Q3: Depósito a Monedero (Wallet Deposit from Change)
- **Definición:** El cliente paga y el vuelto (o el exceso de pago) se guarda en su cuenta para el futuro.
- **Regla:** Solo ocurre si la Deuda es 0.
- **Cálculo:** `Favor = Favor + VueltoSobrante`.

---

## 3. Reglas de Normalización Estricta (The Golden Rules)

Para evitar estados corruptos (ej: Deuda $50 y Favor $20 simultáneos, que matemáticamente es Deuda $30), se debe aplicar siempre esta lógica al guardar:

1.  **Cálculo del Neto Real:**
    `Neto = Favor - Deuda`

2.  **Asignación de Exclusividad:**
    - Si `Neto >= 0` (El cliente tiene dinero a favor):
        - `Favor = Neto`
        - `Deuda = 0`
    - Si `Neto < 0` (El cliente debe dinero):
        - `Favor = 0`
        - `Deuda = abs(Neto)`

**Consecuencia:** Nunca pueden ser ambos mayores a 0 al final de una transacción exitosa (salvo condiciones de carrera no manejadas, que la transacción DB previene).

---

## 4. Persistencia y Atomicidad

Toda operación que afecte saldos debe ser **ATÓMICA** (usando `db.transaction` en Dexie).

- **Tablas Afectadas:** `clientes`, `ventas`, `logs`, `caja_sesion`.
- **Sync Legacy:** Aunque usemos Deuda/Favor, siempre se debe calcular y guardar el campo `saldo` (legacy) para compatibilidad:
    `cliente.saldo = round(cliente.deuda - cliente.favor)`

---

## 5. Casos de Uso y Validaciones

### Caso: Venta Híbrida (Vuelto a Monedero)
- **Escenario:** Cliente compra $10, paga con $20. Pide guardar los $10 de vuelto.
- **Flujo:**
    1. Caja: Entran $20 (Ingreso Real).
    2. Q3: `Favor += 10`.
    3. Normalización: Si tenía deuda previa de $5, se pagan esos $5 primero (Q2) y solo $5 van a Favor.

### Caso: Cobro de Deuda (Abono)
- **Escenario:** Cliente debe $100. Viene y abona $120.
- **Flujo:**
    1. Caja: Entran $120.
    2. Q2: Deuda ($100) se cancela completamente.
    3. Q3: Sobran $20 -> `Favor = 20`.
    4. Normalización: Deuda 0, Favor 20.

---

## 6. Historial de Aprendizaje

| Fecha | Evento | Detalle |
|-------|--------|---------|
| 20/01/2026 | **Double Ticket Bug** | Se detectó doble incremento de correlativo (UI + DB). **Solución:** `useSalesProcessor` ahora respeta el `idVenta` si ya viene generado desde la UI. |
| 20/01/2026 | **Precisión Bs** | Discrepancia de decimales en totales Bs. **Solución:** Calcular Bs desde `TotalRaw` (alta precisión) y no desde `TotalUSD` redondeado. |

---

> **Nota Final:** Esta directiva es la referencia absoluta. Si el código dice otra cosa, el código está mal.
