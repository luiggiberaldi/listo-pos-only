# DIRECTIVA: VUELTO_MIX_SOP 💱⚖️

> **ID:** 2026-01-25-VUELTO
> **Componente:** `ChangeCalculator.jsx` & `useSalesProcessor.js`
> **Jerarquía:** Crítica (Integridad Financiera)

---

## 1. El Triángulo de Cuadre (Regla de Oro)
El vuelto total (`cambioUSD`) debe distribuirse exactamente entre 3 destinos, sin generar decimales "huérfanos":
1. **Efectivo USD:** Entrega física en dólares.
2. **Efectivo BS:** Entrega física en bolívares (convertido por tasa).
3. **Monedero FÉNIX:** Saldo a favor digital cargado al cliente.

**Fórmula de Validación:**
`Vuelto_Total = (Monto_USD) + (Monto_BS / Tasa) + (Monto_Monedero)`

---

## 2. Blindaje Matemático (Zero-Leakage)

### A. Prioridad de Redondeo
- Toda entrada manual debe pasar por `fixFloat(2)` antes de ser restada del remanente.
- El remanente debe usar una **tolerancia de $0.01**. Si el remanente es `< 0.01` y `> -0.01`, se considera "Cuadre Exacto".

### B. El "Vuelto Invisible"
Si el usuario confirma la venta y el `Remanente` es positivo (sobra dinero no asignado):
- **CON CLIENTE:** Se carga AUTOMÁTICAMENTE al Monedero.
- **SIN CLIENTE:** El sistema debe **BLOQUEAR** la finalización o advertir (para evitar pérdida de capital para el negocio o el cliente).

### C. Conversión Reversa
Si se entrega vuelto en Bs, el sistema debe calcular el equivalente en USD restándolo del total en dólares del vuelto para asegurar que no se entregue ni un céntimo de más.

---

## 3. Protocolistas de Seguridad (Guards)

- **G1 (Anti-Negativos):** Prohibido ingresar montos negativos en las gavetas de vuelto.
- **G2 (Anti-Sobre-Entrega):** La suma de los vueltos no puede exceder el `cambioUSD`. Si ocurre, el botón de "Cerrar Venta" debe deshabilitarse.
- **G3 (Persistencia Atómica):** El monto asignado al Monedero debe guardarse en la misma transacción que la venta. Si falla la escritura del saldo, falla la venta.

---

## 4. UX Ergonómica
- **Botón ZAP:** Debe llenar el campo actual con el 100% del `Remanente` actual.
- **Tecla ESPACIO:** Debe priorizar la moneda del foco actual.

---

> [!IMPORTANT]
> **Nota Fiscal:** El vuelto en Bs no genera base imponible adicional, es solo una devolución de sobre-pago. La tasa usada para el vuelto DEBE ser la misma tasa usada para el cobro.
