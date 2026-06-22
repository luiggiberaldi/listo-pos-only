![alt text](image.png)# Plan de Optimización de Rendimiento — Listo POS v1.5.4

> Auditoría profunda + plan de acción priorizado. Fecha: 2026-06-21
> Stack: Electron 33 + React 19 + Vite 6 + Zustand 5 + Dexie 4 (IndexedDB) + Firebase/Supabase (sync)

## Resumen ejecutivo

La pantalla de venta (POS) **ya está bien optimizada** a nivel de render (VirtuosoGrid, `React.memo` con comparadores afinados, `useShallow`, debounce de 300 ms en búsqueda). Las verdaderas palancas de rendimiento están en otro lado:

| Área | Problema raíz | Impacto | Esfuerzo |
|------|---------------|---------|----------|
| **1. Bundle inicial** | Las 12 páginas se importan *eager* → chunk principal de **1.9 MB** | 🔴 Tiempo de arranque | Bajo |
| **2. Trabajo en segundo plano** | 4–5 hooks "always-on" arrancan **antes del login**: listeners de Firestore + scans Dexie + polling | 🔴 Arranque + runtime | Medio |
| **3. Capa de datos** | Scans de tabla completa de `ventas`/`logs` sin índices compuestos ni archivado | 🟠 Escala con el tiempo | Medio |
| **4. Render (pulido)** | Estilos inline en VirtuosoGrid, callbacks no memoizados en CartSidebar | 🟡 Micro-jank | Bajo |

**Carga inicial actual (estimada):** ~2.3 MB JS (`index` 1.9 MB + `vendor-ui` 236 KB + `vendor-db` 96 KB + `vendor-react` 48 KB + `vendor-utils` 32 KB) + 196 KB CSS. Firebase (672 KB) ya es *lazy* (2 s). **Meta:** reducir el chunk principal a ~600–900 KB y diferir el trabajo de red hasta después del login.

---

## FASE 1 — Reducir el bundle inicial (mayor impacto en tiempo de carga, bajo riesgo)

### 1.1 Lazy-load de páginas pesadas y poco usadas — `src/App.jsx:25-36`
Hoy **todas** las páginas se importan estáticamente y caen en el chunk de 1.9 MB. Convertir a `React.lazy` las que no son críticas en el arranque:

- **Mantener eager** (ruta crítica): `MainLayout`, `LoginScreen`, `Dashboard`, `PosPage`.
- **Pasar a `lazy()`** (ya hay un `<Suspense>` en `App.jsx:156`): `SimulationPage`, `ReportesPage`, `TotalDiarioPage`, `SalesHistoryPage`, `ConfigPage`, `CierrePage`, `ClientesPage`.

```jsx
const SimulationPage   = lazy(() => import('./pages/SimulationPage'));
const ReportesPage     = lazy(() => import('./pages/ReportesPage'));
const TotalDiarioPage  = lazy(() => import('./pages/TotalDiarioPage'));
const SalesHistoryPage = lazy(() => import('./pages/SalesHistoryPage'));
const ConfigPage       = lazy(() => import('./pages/ConfigPage'));
const CierrePage       = lazy(() => import('./pages/CierrePage'));
const ClientesPage     = lazy(() => import('./pages/ClientesPage'));
```
**Ganancia: ~400–600 KB fuera del chunk principal.**

### 1.2 `SimulationPage` arrastra el motor de simulación + recharts al bundle
`src/pages/SimulationPage.jsx` importa `src/simulation/SimEngine.js` (68 KB) + `SimCatalog.js` (33 KB) + **recharts** de forma estática. Al ser eager en `App.jsx:35`, todo eso vive en el chunk principal. Con 1.1 (lazy de `SimulationPage`) se resuelve automáticamente: el motor de simulación y recharts pasan a su propio chunk bajo demanda. **Ganancia: ~150 KB.**

### 1.3 Eliminar código muerto del módulo Ghost
La UI Ghost está oculta (`App.jsx:12-22, 284-288`) pero quedan archivos que arrastran `react-markdown` + `@google/generative-ai`:
- `src/components/ghost/Assistant.jsx`, `src/services/ghostAI.js`, `src/services/ghost/geminiGhostService.js`.
- Confirmar que ningún componente vivo los importa; si es así, borrarlos o aislarlos tras `import()` dinámico.
- ⚠️ Ojo: `src/components/auth/LegalModal.jsx` **sí** usa `react-markdown` de forma legítima → si se mantiene, considerar lazy-load del modal legal (rara vez se abre). **Ganancia: ~30–80 KB.**

### 1.4 Afinar `manualChunks` — `vite.config.js:98-118`
- `vendor-ui` (236 KB) agrupa `sweetalert2` + `framer-motion` + `lucide-react`. `sweetalert2` (~200 KB) se importa en ~56 archivos (incluidos stores). Separarlo en su propio chunk `vendor-alerts` para que no bloquee la ruta crítica más de lo necesario.
- Verificar que `recharts` y `jspdf` **no** aparezcan en `manualChunks` (deben quedar como chunks lazy automáticos). `jspdf`/`xlsx`/`jsrsasign` ya están bien diferidos.

### 1.5 (Opcional) `sweetalert2` bajo demanda en stores/utils
En `src/stores/*.js` y `src/utils/fiscal_lock.js` el `import Swal from 'sweetalert2'` es eager. Migrar los menos críticos a `const Swal = (await import('sweetalert2')).default`. Beneficio menor frente a 1.1, hacerlo solo si se busca exprimir más. **Ganancia: ~100 KB diferidos.**

---

## FASE 2 — Diferir y reducir el trabajo en segundo plano (arranque + fluidez)

### 2.1 Mover los hooks "always-on" a *después* de la autenticación — `src/App.jsx:64-74`
Hoy se montan en la raíz, **antes del login**, abriendo varios websockets de Firestore y scans Dexie de inmediato:
- `useMasterTelemetry` (listener Firestore + ping cada 30 s) — `src/hooks/sync/useMasterTelemetry.js:188`
- `useRemoteLockListener` (listener Firestore) — `src/hooks/security/useRemoteLockListener.js:14`
- `useListoGoSync` (scans Dexie + escritura Firestore cada 20 s) — `src/hooks/sync/useListoGoSync.js`
- `useLanSync` (polling 30 s + serialización completa de productos) — `src/hooks/sync/useLanSync.js`
- `useSyncEngine` (procesa outbox cada 10 s) — `src/hooks/sync/useSyncEngine.js:109`

**Acción:** envolver estos hooks en un componente que solo se monte cuando `isAuthenticated === true` (p. ej. dentro de `MainLayout` o un `<PostAuthServices/>`). Beneficio: arranque al login mucho más liviano y sin conexiones de red para visitantes no autenticados.

### 2.2 Cachear los scans Dexie de `useListoGoSync` — `useListoGoSync.js:32-60`
El `useLiveQuery` recorre **toda** la tabla `clientes` (`db.clientes.each`) y consulta `ventas` del día en **cada cambio de KPI** (que ocurre con cada venta). Cachear el resultado (TTL 30–60 s) e invalidar solo al completar una venta, en lugar de recalcular en cada tick.

### 2.3 Reducir cadencias de polling
- `useLanSync`: 30 s → 60 s (configurable). — `useLanSync.js:356`
- `useSyncEngine`: outbox 10 s → 30 s. — `useSyncEngine.js:109`
- `useMasterTelemetry`: consolidar el ping de 30 s con el listener en un solo doc/escritura.

### 2.4 `HoldToConfirmButton`: `setInterval(10ms)` → `requestAnimationFrame`
`src/components/finanzas/design/HoldToConfirmButton.jsx:24` actualiza progreso 100 veces/s. Usar `requestAnimationFrame` (sincroniza con el refresco, ~60 Hz) reduce CPU en acciones críticas (cierre de caja, finalizar venta).

### 2.5 Gate del interceptor Ghost de 30 s — `src/services/ghost/ghostAuditInterceptors.js:201`
Es un `setInterval(30s)` que arranca como **efecto a nivel de módulo**, incluso con la UI Ghost oculta. Condicionarlo a un flag de feature o eliminarlo mientras Ghost esté desactivado.

### 2.6 Aislar el reloj de 1 s — `src/layout/MainLayout.jsx:55`
`setInterval(() => setTime(new Date()), 1000)` provoca un re-render por segundo en todas las páginas autenticadas. Extraer el reloj a un componente hoja propio (`<Clock/>` memoizado) para que el tick no re-renderice el layout completo.

---

## FASE 3 — Capa de datos / IndexedDB (escalabilidad a mediano plazo)

### 3.1 Añadir índices compuestos — `src/db.js` (nueva `version(25)`)
Varias consultas filtran por fecha y luego hacen `.filter()` en JS (no indexado) por `status`/`clienteId`/`tipo`:
- `src/pages/SalesHistoryPage.jsx:75`, `src/services/pos/ShiftService.js:45-53`.

```js
dbInstance.version(25).stores({
  ventas: '++id, fecha, corteId, clienteId, status, cajaId, idempotencyKey, [fecha+status], [fecha+clienteId]',
  logs:   '++id, tipo, fecha, usuarioId, productId, producto, [tipo+fecha]'
});
```
Refactorizar las queries para usar el índice: `where('[fecha+status]').between(...)`.

### 3.2 Agregaciones de tabla completa cacheadas — `useUnifiedAnalytics.js:141`
`db.ventas.where('status').equals('COMPLETADA').each(...)` recorre **todas** las ventas históricas para el total de por vida. Hoy hay un cache de 60 s (`useAnalyticsCache`); subir el TTL a 5–10 min e invalidar **solo** al cerrar una venta. A futuro: mantener un acumulado persistente (escribir totales agregados al cierre de turno en `config`/tabla resumen) para evitar el scan por completo.

### 3.3 Reportes en una sola pasada
`src/utils/reports/zReportBuilder.js:117`, `treasuryEngine.js`, `fiscalEngine.js` iteran el array de ventas 3–4 veces. Combinar en un solo `reduce`. Impacto notable con 2.000+ ventas.

### 3.4 Dashboard: consultar stock bajo directo en vez de cargar todo — `src/pages/Dashboard.jsx:156`
Hoy carga **todos** los productos vía `useLiveQuery` para mostrar ~20 alertas. Consultar `db.productos.where('stock').below(umbral)` directamente (requiere mantener el `useMemo` actual como fallback). Prioridad media.

### 3.5 Política de retención / archivado (crecimiento ilimitado)
`ventas`, `logs`, `ghost_audit_log`, `ghost_history` crecen sin límite. En negocios de 50–500 ventas/día, `logs` puede llegar a millones de registros en un año.
- Implementar archivado automático en el arranque: mover registros > 90 días a tablas `*_archive` con ruta de consulta separada.
- Activar/finalizar el `useDataArchiving.js` existente (hoy solo expone helpers, no se ejecuta).
- Limpieza de `ghost_audit_log`/`ghost_history` (retención 90 días).

---

## FASE 4 — Pulido de render (micro-mejoras, bajo esfuerzo)

### 4.1 Extraer estilos inline en VirtuosoGrid — `src/components/pos/ProductGrid.jsx:69,83`
`style={{ height: '100%' }}` se recrea en cada render. Mover a constante a nivel de módulo para evitar churn en el grid virtualizado.

### 4.2 Memoizar callbacks de items en CartSidebar — `src/components/pos/CartSidebar.jsx:116-149`
Los callbacks (`onRemoveItem`, `handleQtyChangeSafe`, etc.) se crean nuevos en cada render, así que el `React.memo` de `CartItem` no puede evitar re-renders. Envolverlos en `useCallback`. Mejora media en carritos grandes.

### 4.3 Migrar consumidores de `useStore()` deprecado — `src/context/StoreContext.jsx:31-58`
`useStore()` fusiona 5 contextos y advierte `[DEPRECATED]` en consola. ~10 componentes fuera del hot path (`ZCutHistory`, `ModalAbono`, `ReporteZUniversal`, etc.) lo usan. Migrarlos a selectores Zustand. No es crítico para el POS, pero reduce re-renders en cierre/reportes.

---

## Verificación (cómo medir cada fase)

1. **Tamaño de bundle:** `npm run build` y comparar `dist/assets/index-*.js`. Meta Fase 1: chunk principal < 900 KB.
2. **Arranque:** medir tiempo a "interactivo" del POS antes/después (DevTools Performance / `performance.now()` en `main.jsx`).
3. **Runtime:** React DevTools Profiler en la pantalla POS durante una venta de 20+ ítems; contar commits.
4. **Datos:** sembrar 10.000 ventas (hay `@faker-js/faker` en devDeps) y cronometrar Dashboard/Reportes/Historial antes y después de los índices.
5. No romper: `npm run build` debe pasar; probar login → POS → venta → cierre tras cada fase.

## Orden recomendado de ejecución
**Fase 1 primero** (mayor impacto visible en carga, riesgo casi nulo) → **Fase 2** (arranque y fluidez) → **Fase 3** (antes de que los datos crezcan) → **Fase 4** (pulido). Las fases 1 y 4 son commits pequeños e independientes; 2 y 3 requieren pruebas de regresión más cuidadas (sync y migración de esquema).
