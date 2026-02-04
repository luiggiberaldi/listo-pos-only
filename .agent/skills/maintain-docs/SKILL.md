---
name: maintain-docs
description: Protocolo inteligente para mantener la documentación sincronizada con el código fuente.
---

# Documentation Maintenance Skill (Smart Docs)

Esta skill proporciona el protocolo para que el agente mantenga la documentación actualizada automáticamente al realizar cambios en el código.

## 🎯 Cuándo Ejecutar

Esta skill debe activarse cuando realices cambios en:
1.  **Interfaz de Usuario (UI):** Nuevos botones, cambios de layout, nuevos modales, colores/temas.
2.  **Lógica de Negocio:** Cambio en fórmulas (IVA, IGTF, Ganancias), reglas de validación, flujos de estado.
3.  **Base de Datos:** Nuevos campos en esquemas (Dexie), cambios en estructuras JSON.
4.  **Shortcuts/Teclado:** Nuevos atajos o cambios en los existentes.

## 🗺️ Mapa de Sincronización (Código -> Doc)

Usa esta tabla para saber qué archivo de documentación actualizar según el componente modificado.

| Módulo / Componente | Archivo de Documentación |
|---------------------|--------------------------|
| `LoginScreen.jsx`, `AuthProvider` | `01-login-screen.md` |
| `Dashboard.jsx`, `KPIs`, `Stats` | `02-dashboard.md` |
| `PosPage.jsx`, `Cart`, `ProductSearch` | `03-pos-page.md` |
| `TurnoStore`, `CierreCaja`, `ZReport` | `04-cierre-caja.md` |
| `VentasPage`, `SalesService` | `05-historial-ventas.md` |
| `ClientesPage`, `ClientService` | `06-clientes.md` |
| `ReportesPage`, `Estadisticas` | `07-reportes-estadisticas.md` |
| `InventarioPage`, `ProductForm`, `Kardex` | `08-inventario-kardex.md` |
| `ConfigNegocio`, `ConfigTicket`, `Apariencia` | `09-configuracion-comercio.md` |
| `ConfigFinanzas`, `ConfigInventario` | `10-configuracion-operativa.md` |
| `ConfigSeguridad`, `ConfigSalud`, `Backup` | `11-configuracion-sistema-seguridad.md` |
| `TotalDiarioPage`, `FiscalSummary` | `12-total-diario-corte-z.md` |
| `Shortcuts`, `Hotkeys` | `00-quick-reference.md` |

## 🔄 Protocolo de Actualización

### Paso 1: Identificar el Impacto
Al terminar una tarea de código, pregúntate:
- "¿He cambiado algo que el usuario ve?" (UI)
- "¿He cambiado cómo funciona algo?" (Lógica)
- "¿He añadido una nueva funcionalidad?" (Feature)

### Paso 2: Lectura Cruzada
1.  Abre el archivo de documentación correspondiente (ver Mapa).
2.  Busca la sección relacionada.
3.  Compara lo escrito con tu nuevo código.

### Paso 3: Ejecución de Cambios
- **Si es UI:** Actualiza descripciones de botones, posiciones o capturas (descripción textual de la UI).
- **Si es Lógica:** Actualiza fórmulas, reglas o notas de "Importante".
- **Si es Feature Nueva:** Crea una nueva sección con el formato estándar (Propósito -> Cómo usar -> FAQ).

### Paso 4: Actualización de Conocimiento (Cerebro)
Si el cambio es significativo (cambia un proceso core), debes actualizar los **Átomos de Conocimiento** en `scripts/ghost/KnowledgeMiner.js`.
1.  Busca el átomo relacionado por `uid`.
2.  Actualiza `local_response` y `technical_steps`.
3.  Ejecuta `node scripts/ghost/KnowledgeMiner.js` para regenerar `atomic_logic.json`.

### Paso 5: Verificación de Integridad
1.  Verifica que no rompiste enlaces internos.
2.  Asegura que el lenguaje sea consistente (Tono profesional, claro, explicativo).
3.  Revisa si el cambio afecta a `00-quick-reference.md` (Shortcuts o troubleshooting).

## 📝 Plantilla de Sección Nueva

```markdown
## [Nombre de la Funcionalidad]

### Propósito
[Breve descripción de para qué sirve]

### Cómo Utilizar
1. Paso 1...
2. Paso 2...
3. Paso 3...

### Reglas / Notas Importantes
- ⚠️ Nota de seguridad
- 💡 Tip de uso

### FAQ Relacionado
**Q: [Pregunta común]?**
A: [Respuesta]
```
