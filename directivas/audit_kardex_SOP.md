# DIRECTIVA: AUDIT_KARDEX_SOP

> **ID:** 20260120_AUDIT_KARDEX
> **Script Asociado:** `scripts/audit_kardex_logic.py`
> **Última Actualización:** 2026-01-20
> **Estado:** ACTIVO

---

## 1. Objetivos y Alcance
- **Objetivo Principal:** Auditar el sistema de Kardex (inventario) en busca de inconsistencias lógicas, errores de cálculo y oportunidades de mejora en la trazabilidad.
- **Criterio de Éxito:** Generar un reporte detallado con hallazgos críticos y una propuesta de mejora estructural sin entrega de código directo al usuario.

## 2. Especificaciones de Entrada/Salida (I/O)

### Entradas (Inputs)
- **Archivos Fuente:**
  - `src/components/ModalKardex.jsx`: Componente de visualización.
  - `src/context/StoreContext.jsx`: Lógica de persistencia y estado.
  - `src/pages/InventarioPage.jsx`: Punto de entrada del inventario.

### Salidas (Outputs)
- **Artefactos Generados:**
  - `.tmp/audit_report.json`: Reporte técnico de hallazgos (uso interno).
- **Retorno de Consola:** Resumen de la auditoría completada.

## 3. Flujo Lógico (Algoritmo)

1. **Investigación de Persistencia:** Identificar cómo se guardan los movimientos y si hay validación de integridad (evitar registros huérfanos).
2. **Análisis de Cálculo de Saldo:** Verificar si el `stockFinal` en los movimientos coincide con la realidad del stock del producto tras cada operación.
3. **Revisión de Flujo de Datos:** Analizar cómo se integran las ventas, compras y ajustes manuales en el flujo del Kardex.
4. **Evaluación de UX/UI:** Identificar si la presentación de datos en el `ModalKardex` permite una auditoría humana eficiente.

## 4. Herramientas y Librerías
- **Librerías Python:** Ninguna por ahora (basado en análisis estático de código).

## 5. Restricciones y Casos Borde (Edge Cases)
- **Saldos Negativos:** El sistema debe manejar o alertar sobre stock negativo.
- **Borrado de Historial:** Analizar el impacto de la función `eliminarMovimiento` en la integridad de la auditoría.
- **Concurrencia:** Posibles problemas si se registran ventas simultáneas que afecten el mismo stock.

## 6. Protocolo de Errores y Aprendizajes (Memoria Viva)

| Fecha | Error Detectado | Causa Raíz | Solución/Parche Aplicado |
|-------|-----------------|------------|--------------------------|
| 20/01 | Inicio Auditoría | N/A | Creación de directiva inicial. |

## 7. Ejemplos de Uso
N/A (Tarea de Auditoría Analítica).

## 8. Checklist de Pre-Ejecución
- [x] Localizar archivos clave del Kardex.
- [x] Leer `StoreContext` para entender el flujo de datos.

## 9. Checklist Post-Ejecución
- [ ] Documentar hallazgos en la propuesta final.
- [ ] Actualizar esta directiva con hallazgos para evitar regresiones.
