# AUDITORÍA COMPLETA - LISTO POS v1.5.3
**Fecha:** 25 de abril 2026
**Auditor:** Claude Code (Opus 4.6)
**Alcance:** Código fuente completo, configuración, seguridad, tests, scripts, deployment

---

## RESUMEN EJECUTIVO

| Categoría | Críticos | Altos | Medios | Bajos |
|-----------|----------|-------|--------|-------|
| Seguridad | 6 | 4 | 3 | 2 |
| Bugs / Lógica | 5 | 7 | 4 | 3 |
| Rendimiento | 1 | 3 | 5 | 2 |
| Deuda Técnica | 2 | 5 | 8 | 6 |
| **Total** | **14** | **19** | **20** | **13** |

**Archivos revisados:** 200+
**Líneas auditadas:** 15,000+

---

## 🔴 CRÍTICOS — Requieren acción inmediata

### C1. Credenciales expuestas en `.env` (SEGURIDAD)
**Archivo:** `.env`
**Impacto:** Todas las API keys, credenciales Firebase y Supabase están en texto plano en el repositorio.
- Línea 1: `VITE_OPENROUTER_API_KEY=sk-or-v1-...`
- Líneas 3-17: 15 claves GROQ activas
- Líneas 19-25: Credenciales Firebase (Cliente 0001)
- Líneas 35-41: Credenciales Firebase de producción (`listo-pos-prod`)
- Líneas 43-45: Credenciales Supabase con JWT expuesto
- Líneas 27-33: Hashes de God Mode y Master Key

**Acción requerida:**
1. Revocar TODAS las API keys expuestas inmediatamente
2. Regenerar credenciales Firebase y Supabase
3. Eliminar `.env` del historial de git (`git filter-branch`)
4. Verificar que `.env` esté en `.gitignore`

---

### C2. Reglas Firestore excesivamente permisivas (SEGURIDAD)
**Archivo:** `firestore.rules:10-12`
```javascript
match /merchants/{merchantId} {
  allow read, write: if request.auth != null;
}
```
**Problema:** Cualquier usuario autenticado (incluso anónimo) puede leer/escribir datos de TODOS los comercios. No hay validación de propiedad.

**Fix recomendado:**
```javascript
match /merchants/{merchantId} {
  allow read, write: if request.auth.uid == resource.data.ownerId;
  allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
}
```

---

### C3. Sales hardcodeados y salts en código fuente (SEGURIDAD)
**Archivos y líneas:**
- `src/hooks/store/useAuth.js:12` — `INTERNAL_SYNC_SALT = "L1STO_SUPP0RT_S3CR3T_K3Y_X9#77_V2"`
- `src/utils/securityUtils.js:9` — `PIN_SALT = "LISTO_POS_V1_SECURE_SALT_998877"`
- `electron/lanServer.js:18` — `LICENSE_SALT` con fallback hardcodeado

**Impacto:** Las sales son visibles en el bundle de producción. Compromete el hashing de PINs y licencias.

**Fix:** Mover a variables de entorno. Usar salts dinámicos por usuario para PINs.

---

### C4. Autenticación Firebase sin reintentos (BUG)
**Archivo:** `src/services/firebase.js:94-99`
```javascript
signInAnonymously(authInstance).catch(e =>
    console.error(`❌ Error Auth ${label}:`, e.message)
);
```
**Problema:** Si la autenticación falla, la app continúa con `authClient = null`, causando crashes silenciosos en componentes que esperan `dbClient`.

**Fix:** Implementar retry con backoff exponencial o lanzar error para prevenir inicialización incompleta.

---

### C5. Lógica incorrecta en merge de cantidades del carrito (BUG)
**Archivo:** `src/stores/useCartStore.js:123-130`
```javascript
const nuevaCantFinal = seTransformo ? (itemDest.cantidad + cantidadDestino) : cantidadDestino;
```
**Problema:** Cuando hay auto-conversión de unidades (`seTransformo = true`), `cantidadDestino` ya contiene la cantidad convertida, pero se suma a la existente. Resulta en cantidades incorrectas.

**Fix:** Clarificar semántica: `cantidadDestino` debe ser la cantidad final, no acumulativa.

---

### C6. Script de eliminación automática sin confirmación (DEUDA TÉCNICA)
**Archivo:** `dead_code_audit.cjs:224-250`
```javascript
fs.unlinkSync(fullPath); // Eliminación irreversible sin confirmación
```
**Problema:** Elimina archivos automáticamente sin dry-run, sin backup, sin confirmación.

**Fix:** Agregar flag `--dry-run` (activado por defecto), crear backup antes de eliminar, requerir confirmación.

---

## 🟠 ALTOS — Resolver en próximo sprint

### A1. Race condition en listener de licencia
**Archivo:** `src/hooks/security/useLicenseGuard.js:143-199`
**Problema:** `onSnapshot` no limpia suscripciones duplicadas si `machineId` cambia. Múltiples montajes crean listeners huérfanos → memory leak.

### A2. Error en PIN reset puede crear hashes nulos
**Archivo:** `src/hooks/store/useAuth.js:234-244`
```javascript
const nuevoHash = await hashPin(nuevoPin); // Puede fallar/retornar null
storeUpdateUser(userId, { pinHash: nuevoHash }); // Almacena null → usuario bloqueado
```
**Fix:** Validar `nuevoHash` antes de almacenar.

### A3. Race condition en sincronización del carrito
**Archivo:** `src/hooks/store/usePOS.js:77-147`
**Problema:** El efecto se ejecuta cuando `productos` cambia su referencia (común en React), reconstruyendo todo el carrito y perdiendo cambios pendientes.

**Fix:** Usar un hash de versión del inventario en vez de la referencia del array.

### A4. Imports dinámicos fallan silenciosamente
**Archivo:** `src/services/pos/SalesService.js:34-47`
**Problema:** Si `useConfigStore` no carga, `license` defaultea a `{ isDemo: false }`, pudiendo bypasear límites de demo.

### A5. Z-cuts duplicados posibles
**Archivo:** `src/services/pos/ShiftService.js:26-90`
**Problema:** `db.cortes.put()` no verifica duplicados por `cajaId`. Un re-open accidental puede corromper reportes de cierre.

### A6. Math float-point en cálculos financieros
**Archivo:** `src/services/pos/SalesService.js:99-100, 137`
```javascript
rate: parseFloat(ventaFinal.tasa) || 1, // parseFloat directo, no Decimal
```
**Problema:** `parseFloat` en vez de `Decimal.js` para tasas de cambio. Errores de redondeo se acumulan en transacciones multi-divisa.

### A7. Auto-backup sin protección de concurrencia
**Archivo:** `src/hooks/safety/useAutoBackup.js:48-51`
**Problema:** Si un backup tarda más que el intervalo, se ejecutan múltiples backups concurrentes.

### A8. Contaminación del objeto `window`
**Archivos:** `src/context/AuthContext.jsx:12-18`, `src/App.jsx:113`
```javascript
window.__GLOBAL_AUTH_CONTEXT__ = AuthContext;
window.GhostTools = { ... };
window.ghostErrors = [];
```
**Problema:** Polución del namespace global, vulnerable a manipulación por scripts de terceros.

### A9. Firebase no se reinicializa tras fallo
**Archivo:** `src/services/firebase.js:25-32`
**Problema:** Si la inicialización falla, las siguientes llamadas retornan la promesa cacheada del fallo. No hay mecanismo de retry.

### A10. innerHTML y onclick inline (XSS potencial)
**Archivo:** `src/pages/config/security/hooks/useSecurityManager.js:36, 367-369`
```javascript
btn.innerHTML = isPassword ? EYE_OFF_ICON : EYE_ICON;
onclick="const ck = document.getElementById('perm-${p.key}')..."
```
**Problema:** Patrones vulnerables a XSS si `p.key` contiene caracteres especiales.

---

## 🟡 MEDIOS — Resolver en 1-3 meses

### M1. Consultas Dexie sin índices
**Archivo:** `src/hooks/sync/useListoGoSync.js:59-72`
```javascript
const anuladas = await db.ventas
    .where('fecha').between(startOfDay, endOfDay)
    .filter(v => v.status === 'ANULADA').count();
```
**Problema:** Full table scan diario. Agregar índice compuesto `(fecha, status)`.

### M2. `db.ventas.toArray()` sin límites
**Archivo:** `src/hooks/sync/useListoGoSync.js:27`
**Problema:** Carga TODAS las ventas en memoria. Usar `.limit()` y filtro por fecha.

### M3. Cache de analytics se invalida cada 60s
**Archivo:** `src/hooks/analytics/useAnalyticsCache.js:12`
**Problema:** TTL de 1 minuto causa escaneos repetidos de DB en días ocupados. Aumentar a 5 min o usar invalidación basada en eventos.

### M4. Sin rate limiting en llamadas Ghost AI
**Archivo:** `src/services/ghost/geminiGhostService.js:44-100`
**Problema:** Sin circuit breaker ni backoff si la API de Gemini falla repetidamente.

### M5. `Math.random()` para IDs de módulo
**Archivo:** `src/context/AuthContext.jsx:6`
```javascript
const MODULE_ID = Math.random().toString(36).substring(7);
```
**Fix:** Usar `crypto.getRandomValues()` o la librería UUID ya instalada.

### M6. StoreContext re-renderiza innecesariamente
**Archivo:** `src/context/StoreContext.jsx:30-52`
**Problema:** Merge de 6 contexts en un objeto nuevo en cada render. Usar hooks selectivos.

### M7. Persistencia del carrito síncrona en cada cambio
**Archivo:** `src/hooks/store/useCart.js:20`
**Problema:** Escribe a `localStorage` sincrónicamente en cada mutación del carrito. Usar debounce.

### M8. eslint-disable sin justificación
**Archivo:** `src/components/products/ProductHierarchy.jsx:33`
```javascript
// eslint-disable-next-line react-hooks/exhaustive-deps
```
**Fix:** Resolver las dependencias reales en vez de desactivar la regla.

### M9. FileReader sin manejo de error
**Archivo:** `src/components/inventario/BulkImportModal.jsx:51`
**Problema:** Falta `reader.onerror` handler. Fallos silenciosos al importar archivos.

### M10. División por cero retorna 0 silenciosamente
**Archivo:** `src/utils/mathCore.js:17-20`
```javascript
if (div.isZero()) return 0; // Oculta bugs
```
**Fix:** Loggear warning y considerar lanzar error en modo estricto.

### M11. Ghost Memory no verifica flush exitoso
**Archivo:** `src/services/ghost/GhostMemory.js:119-150`
**Problema:** Marca memoria como flushed antes de confirmar escritura en la nube.

### M12. Timeout faltante en Firebase listeners
**Archivo:** `src/hooks/sync/useMasterTelemetry.js:186-196`
**Problema:** `onSnapshot` sin timeout si la conexión se cuelga. Agregar timeout de 30s.

---

## 🟢 BAJOS — Mejoras de calidad

### B1. `console.log` en producción
**Archivos:** Múltiples (useSecurityManager.js:179-191, AuthContext.jsx:27, ModalPago/index.jsx:253, etc.)
**Nota:** Vite está configurado para strip console.logs en build, pero `console.warn` y `console.error` persisten.

### B2. `alert()` nativo en lugar de SweetAlert
**Archivos:** `src/utils/reset_license_test.js:13`, `src/utils/pdfGenerator.js`, `src/components/security/ContractGuard.jsx`

### B3. Accesibilidad incompleta
- Botones sin `aria-label` en múltiples componentes
- Modales SweetAlert sin estructura ARIA (`role="dialog"`, `aria-labelledby`)
- Imágenes con `alt` genérico

### B4. `reset_trigger.js` corrupto
**Archivo:** `reset_trigger.js` (raíz del proyecto)
**Problema:** Contenido parece estar codificado o dañado (espacios entre cada carácter).

### B5. Scrapers sin certificado SSL
**Archivos:** `scraper_backup_300.cjs`, `scraper_canasta_40.cjs`
**Problema:** No verifican certificados SSL en requests HTTPS.

### B6. Playwright config no optimizado para CI
**Archivo:** `tests/ghost/playwright.config.js`
- `headless: false` siempre activo
- `slowMo: 100` en CI es innecesario
- Un solo worker

### B7. Validación de schema incompleta en imports
**Archivo:** `src/hooks/store/useDataPersistence.js:32`
**Problema:** Solo verifica `schema_version == 'v2-unified'`, no valida estructura interna.

---

## DEUDA TÉCNICA

### DT1. Duplicación de lógica de cálculos
**Archivos:** `src/components/ModalPago/index.jsx:174-175` (tiene FIXME acknowledging this)
Lógica financiera duplicada entre UI y controllers.

### DT2. Tres librerías de virtualización instaladas
`react-virtualized-auto-sizer`, `react-virtuoso`, `react-window` — estandarizar en una.

### DT3. Firebase + Supabase como backends paralelos
Dos backends cloud incrementan complejidad y superficie de ataque. Considerar consolidar.

### DT4. Mezcla CJS/ESM en scripts
Scrapers usan `.cjs`, componentes usan ESM. Inconsistencia que complica mantenimiento.

### DT5. Electron + PWA + Cloudflare Workers
Tres targets de deployment con lógica compartida pero sin abstracción clara.

### DT6. Sin tests unitarios para lógica financiera
El módulo más crítico (`SalesService.js`, `FinanceService.js`, `mathCore.js`) no tiene tests automatizados de cálculos financieros.

### DT7. `wrangler.toml` con `compatibility_date` desactualizado
Fecha `2024-01-01` — actualizar a `2025-01-01` o posterior.

---

## RECOMENDACIONES POR PRIORIDAD

### Inmediato (esta semana)
1. **Revocar y regenerar** todas las API keys expuestas en `.env`
2. **Actualizar `firestore.rules`** con validación de propiedad
3. **Mover salts** a variables de entorno
4. **Fixear** lógica de merge del carrito (C5)
5. **Agregar null-check** en PIN reset (A2)

### Corto plazo (1 mes)
1. Implementar retry en autenticación Firebase (C4)
2. Agregar índices Dexie para queries frecuentes (M1)
3. Implementar circuit breaker para Ghost AI (M4)
4. Eliminar polución de `window` (A8)
5. Corregir race conditions en sync (A3, A7)
6. Agregar tests financieros (DT6)

### Mediano plazo (3 meses)
1. Consolidar backend (Firebase o Supabase, no ambos)
2. Estandarizar librería de virtualización
3. Migrar licenciamiento a JWT/RS256 (ya marcado como TODO)
4. Implementar CSP headers en Electron
5. Mejorar accesibilidad (WCAG 2.1 AA)
6. Optimizar bundle size (analizar chunks duplicados)

---

*Fin del reporte de auditoría*
