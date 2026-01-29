# 🏛️ REGLAS OPERATIVAS - LISTO POS (Fénix v2.2)

> **Rol:** Arquitecto de Listo POS | **Cobertura:** listo-pos + listo-master + electron + scripts

---

## 🔒 1. CÓDIGO INTOCABLE

**Archivos protegidos (requieren autorización explícita):**

| Archivo | Función |
|:---|:---|
| `src/services/firebase.js` | Double Antenna |
| `src/components/security/LicenseGate.jsx` | HWID + SHA-256 |
| `src/components/security/ContractGuard.jsx` | Firma Legal |
| `src/hooks/security/useLicenseGuard.js` | Kill Switch |
| `src/hooks/sync/useMasterTelemetry.js` | Factory Lockdown |
| `electron/main.js` | getMachineId, IPC |

**Constantes sagradas:** `LICENSE_SALT`, `machineIdSync()`, `FULL_CONTRACT`

⚠️ Si el usuario pide modificar esto: **PREGUNTAR** antes, **DOCUMENTAR** en `directivas/SEGURIDAD_FENIX_SOP.md`.

---

## 📡 2. DOUBLE ANTENNA (FIREBASE)

| Antena | Variable | Uso |
|:---|:---|:---|
| **CLIENT** | `dbClient` | Ventas, Inventario, Sync GO |
| **MASTER** | `dbMaster` | Telemetría, Kill Switch, Auditoría |

**Ruteo obligatorio:**
- `useListoGoSync.js` → `dbClient`
- `useMasterTelemetry.js` → `dbMaster`
- `ContractGuard.jsx` → `dbMaster`
- `listo-master/*` → Master directo

```javascript
// POS: Datos usuario
import { dbClient } from '../../services/firebase';
// POS: Telemetría
import { dbMaster } from '../../services/firebase';
```

> **"Nunca enviar ventas a dbMaster. Nunca telemetría a dbClient."**

---

## 💾 3. DEXIE.JS (OFFLINE-FIRST)

**Tablas:** `productos`, `ventas`, `clientes`, `config`, `logs`, `tickets_espera`, `outbox`, `cortes`, `caja_sesion`

**Ley:** Datos nacen en LOCAL → luego sync a Firebase.

```javascript
// ✅ CORRECTO
const id = await db.ventas.add(data);  // LOCAL FIRST
if (navigator.onLine) await setDoc(...); // CLOUD AFTER

// ❌ PROHIBIDO
await setDoc(...); // Sin Dexie previo
```

---

## ⚡ 4. ELECTRON IPC

| Handler | Función |
|:---|:---|
| `get-machine-id` | HWID para licencias |
| `get-disk-info` | Salud del disco |
| `pdf-save` | Guardar PDF |
| `test-print` | Impresión tickets |
| `firebase-sync` | Sync seguro |

```javascript
await window.electronAPI.getMachineId();
await window.electronAPI.getDiskInfo();
```

**Seguridad:** `nodeIntegration: false`, `contextIsolation: true`

---

## 🧮 5. MOTOR MATEMÁTICO

**Usar siempre `src/utils/mathUtils.js`:**

```javascript
import { d, fixFloat } from '../utils/mathUtils';
const total = fixFloat(d(precio).times(cantidad).toNumber(), 2);
```

| Función | Uso |
|:---|:---|
| `d(val)` | Constructor Decimal |
| `fixFloat(num, 2)` | Corrección flotante |
| `formatCurrency()` | Formateo visual |
| `desglosarStock()` | Desglose jerárquico |

> **"Nunca usar +, -, *, / nativos para dinero."**

---

## 🇻🇪 6. LOCALIZACIÓN VENEZUELA

| Campo | Formato | Regex |
|:---|:---|:---|
| RIF | `V-12345678` | `/^[VEJGPC]-\d{4,9}$/i` |
| Teléfono | `04XX-1234567` | `/^\d{4}-\d{7}$/` |

- **Tasa BCV:** Conversiones USD↔BS dinámicas.
- **IGTF:** 3% para pagos electrónicos.
- **Recibos:** "DOCUMENTO ADMINISTRATIVO - NO FISCAL"

---

## 🎨 7. UI/UX

**Paleta (tailwind.config.js):**
- `primary`: #6366F1 (Indigo)
- `status-success`: #10B981
- `status-danger`: #F43F5E

**Utilidades:** `.font-numbers`, `.scrollbar-hide`

**Touch Mode:** `isTouch` prop → inputs `h-20`, botones grandes.
**Iconos:** Solo Lucide React.
**Estabilidad Visual:** Fixed Height Shell + Opacity transitions (Zero Layout Shift).

---

## 🎛️ 8. LISTO MASTER

App separada para administración central.
- `Dashboard.jsx`, `Fabrica.jsx`, `FeedbackInbox.jsx`
- Conexión directa a proyecto Master (no usa Double Antenna del POS).

> **"listo-master NUNCA accede a datos de ventas de clientes."**

---

## 📚 9. DIRECTIVAS

Ubicación: `directivas/`

| Archivo | Tema |
|:---|:---|
| `financial_integrity_SOP.md` | Finanzas |
| `touch_mode_fixes.md` | UI Touch |
| `build_deploy_app.md` | Builds |
| `ui_ux_premium_standards.md` | Estabilidad Visual |

**Protocolo Edge Cases:**
1. STOP → 2. DOCUMENT en directiva → 3. FIX → 4. VERIFY

---

## 🔄 10. CICLO DE DESARROLLO

1. **CONSULTAR** directiva existente.
2. **PLANIFICAR** si es nuevo: `{nombre}_SOP.md`.
3. **EJECUTAR** siguiendo directiva.
4. **ACTUALIZAR** memoria con lecciones.

**Estilo:** Conciso, técnico. "Consultando directiva de [X]..."

---

## 📬 11. SILENT FAILOVER (FIREBASE)

Si Firebase falla, el usuario **NO** debe enterarse.
- **Mecanismo:** Guardar en Dexie tabla `outbox`.
- **Sync:** Reintentar en background cuando `navigator.onLine` sea true.
- **UI:** Mostrar indicador sutil ("Sin conexión, guardando local") pero permitir seguir operando.

---

## 🛡️ 12. SCHEMA SOVEREIGNTY

La estructura de la base de datos es Ley.
- **Prohibido:** Agregar campos "ad-hoc" a `ventas` o `productos` sin actualizar `directivas/db_schema_SOP.md`.
- **Validación:** Usar Zod o PropTypes para validar payload antes de guardar.

---

## 👮 13. RBAC (SEGURIDAD DE ROLES)

Funciones críticas requieren validación de rol:
- **Admin:** Configuración, Inventario, Cierre de Caja.
- **Cajero:** Ventas, Vuelto.

```javascript
if (user.role !== 'admin') return <AccessDenied />;
```

---

## 📦 14. ASSET INTEGRITY

Base de datos ligera = Sistema rápido.
- **Imágenes:** No guardar Base64 > 50KB en Dexie o Firebase.
- **Preferencia:** Guardar en `localStorage` o sistema de archivos local (Electron) y referenciar por path/URL.
- **Límite:** Máx 400px x 400px para thumbnails de productos.

---

## ⚛️ 15. ATOMIC TRANSACTIONS

El dinero y el inventario deben cuadrar siempre.
- **Flujo:** (Venta + Descuento Stock + Ticket) = **1 Unidad Indivisible**.
- **Error:** Si falla el descuento de stock, la venta **NO** se procesa.
- **Implementación:** Usar `db.transaction('rw', ...)` en Dexie.

---

## 🎯 16. FILOSOFÍA UX: "PROFESIONALISMO A TRAVÉS DE LA SIMPLICIDAD EXTREMA"

**Regla Suprema:** ¿Puede un usuario que nunca ha usado una PC entender esto en 5 segundos? Si no, rediseña.

### A. Cero Inglés, Cero Tecnicismos

| ❌ Prohibido | ✅ Correcto |
|:---|:---|
| Dashboard | Inicio / Panel |
| Login | Entrar |
| Inventory | Depósito / Inventario |
| Settings | Ajustes / Configuración |
| Logout | Salir |
| Stock | Existencias |
| Checkout | Cobrar |

**Validación:** Antes de escribir cualquier texto en la UI, pregúntate: "¿Lo diría un bodeguero venezolano?"

### B. Interfaz Predictiva

**Módulo de Cobro:**
- Generar automáticamente botones de billetes comunes venezolanos: `$1`, `$5`, `$10`, `$20`, `$50`, `$100`
- Cálculo de vuelto debe ser instantáneo y mostrar distribución óptima de billetes
- Sugerir monto exacto si el cliente tiene saldo a favor

### C. Diseño "Apple del Barrio"

**Estándares visuales obligatorios:**
- Botones: Mínimo `48px` de altura (Touch: `64px`)
- Espaciado: Mínimo `16px` entre elementos interactivos
- Fuentes: Mínimo `14px` para texto de lectura, `16px` para botones
- Tablas: Evitar. Preferir tarjetas con espaciado generoso
- Colores: Alto contraste (WCAG AA mínimo)

### D. Feedback Instantáneo

Toda acción debe tener confirmación visual:
- **Guardar producto:** ✅ Check verde + mensaje "Producto guardado"
- **Cobrar venta:** 🎉 Animación de éxito + sonido opcional
- **Cambiar tasa:** 💱 Actualización en tiempo real de todos los precios visibles
- **Error:** ⚠️ Toast rojo con mensaje claro (no códigos técnicos)

**Implementación:**
```javascript
// ✅ CORRECTO
Swal.fire({ icon: 'success', title: '¡Listo!', text: 'Producto guardado', timer: 1500 });

// ❌ PROHIBIDO
console.log('Product saved'); // Usuario no ve nada
```

### E. Prioridad de Tasa

- Botón "Tasa del Día" debe estar en header principal (siempre visible)
- Cambio de tasa actualiza TODA la UI sin recargar página
- Mostrar última actualización: "Tasa: Bs 36.50 (hace 2 horas)"

### F. Test de los 5 Segundos

Antes de implementar cualquier componente, valida:
1. ✅ ¿Los botones son obvios?
2. ✅ ¿El texto es en español claro?
3. ✅ ¿Hay suficiente espacio para tocar/clickear?
4. ✅ ¿El usuario sabe qué pasó después de cada acción?
5. ✅ ¿Funciona sin internet?

---

## ⚡ QUICK REFERENCE

```javascript
// Firebase
import { dbClient, dbMaster } from '../../services/firebase';

// Dexie
import { db } from '../../db';
await db.productos.toArray();

// Math
import { d, fixFloat } from '../utils/mathUtils';

// Electron
await window.electronAPI.getMachineId();
```

---
*Consultar antes de cualquier intervención significativa.*
