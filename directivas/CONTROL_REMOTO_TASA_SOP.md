# 📡 SOP: CONTROL REMOTO DE TASA (LISTO GO ↔ POS)

> **Versión:** 1.0 (2026-01-24)  
> **Estado:** Implementado y Verificado  
> **Objetivo:** Permitir que el dueño del negocio cambie la tasa (USD/EUR/Manual) desde su celular con confirmación obligatoria en el POS.

---

## 🏗️ 1. ARQUITECTURA DEL FLUJO

El sistema opera bajo un modelo de **Solicitud y Confirmación (Handshake)** para evitar cambios accidentales por mala conexión o toques involuntarios.

### A. Capa de Solicitud (App Listo GO)
1. El usuario selecciona el modo (`AUTO` o `MANUAL`).
2. Se genera un `requestId` único.
3. Se escribe en `merchants/{systemId}/remote_tasa` con `status: 'PENDING'`.

### B. Capa de Escucha (POS Hook: `useRemoteTasa`)
1. Un listener global en `MainLayout.jsx` detecta el cambio en Firestore.
2. Compara el `timestamp` y el `status` para evitar bucles.
3. Dispara una alerta de **SweetAlert** bloqueante con sonido de advertencia.

### C. Capa de Decisión (Cajero)
- **SI ACEPTA:** 
    - El POS actualiza su `ConfigContext` local.
    - Realiza un "Ping Back" actualizando `remote_tasa.status: 'ACCEPTED'` y la `tasaAplicada` global en la nube.
- **SI IGNORA:**
    - El POS cierra la alerta.
    - Actualiza `remote_tasa.status: 'REJECTED'`.

---

## 📡 2. RUTEO DE DATOS (Double Antenna)

- **Colección:** `merchants`
- **Antena:** `dbClient` (Listo GO Sync)
- **Campos Críticos:**
    - `remote_tasa.status`: `PENDING` | `ACCEPTED` | `REJECTED`
    - `remote_tasa.currency`: `USD` | `EUR`
    - `tasaAplicada`: Refleja el valor real que el POS está usando actualmente.

---

## 🛡️ 3. REGLAS DE SEGURIDAD Y ESTABILIDAD

- **Anti-Rebote:** El hook usa `lastTimestampRef` y `isMounted` guard para evitar alertas infinitas durante remounts de React o al entrar a la pantalla de ventas.
- **Confirmación Obligatoria:** El POS solo cambia su tasa interna **TRAS** la confirmación manual del cajero.
- **Sincronización de Moneda:** Si se elige `AUTO (EUR)`, el POS consulta dinámicamente el precio del Euro en el BCV vía API local.

---

## 🎨 4. UX PRINCIPLES APLICADOS

1. **Cero Tecnicismos:** En lugar de "Update Success", usamos "¡Cambio Aceptado!".
2. **Subtileza en el Móvil:** El manager recibe Toasts (avisos superiores) en lugar de modales intrusivos para no interrumpir su monitoreo.
3. **Feedback Visual:** El botón de "Cobrar" en el móvil actualiza su valor en Bs inmediatamente cuando el POS confirma.

---

## 🛠️ 5. MANTENIMIENTO

- **Archivo POS:** `src/hooks/sync/useRemoteTasa.js`
- **Archivo App:** `listo-go/src/Dashboard.jsx` (Manejador de respuestas)
- **API Tasa:** `api.dolarvzla.com/public/exchange-rate` (Compartida por App y POS)

---
*Documento propiedad del Arquitecto de Listo POS - Protocolo FÉNIX.*
