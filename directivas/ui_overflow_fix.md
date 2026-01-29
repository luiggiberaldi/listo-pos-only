# DIRECTIVA: UI_OVERFLOW_FIX

> **ID:** 2026-01-22-LICENSE-OVERFLOW
> **Script Asociado:** `scripts/fix_license_overflow.py`
> **Estado:** ACTIVO

---

## 1. Objetivos y Alcance
- **Objetivo Principal:** Corregir el desbordamiento visual del `machineId` en la pantalla de "ACCESO DENEGADO" (`LicenseGate.jsx`).
- **Criterio de Éxito:** El componente `LicenseGate.jsx` debe tener la clase `break-all` o `whitespace-normal` aplicada al contenedor del ID para que el texto largo se ajuste a la caja.

## 2. Especificaciones de Entrada/Salida (I/O)

### Entradas (Inputs)
- **Archivos Fuente:**
  - `src/components/security/LicenseGate.jsx`: El componente a modificar.

### Salidas (Outputs)
- **Archivos Modificados:**
  - `src/components/security/LicenseGate.jsx`: El componente con la clase CSS corregida.
- **Retorno de Consola:**
  - Mensaje de éxito indicando que el archivo fue parchado.

## 3. Flujo Lógico (Algoritmo)

1.  **Lectura:** Leer el contenido de `src/components/security/LicenseGate.jsx`.
2.  **Búsqueda:** Localizar la etiqueta `span` que contiene `{machineId || 'IDENTIFICANDO...'}`.
    - Patrón original aproximado: `<span className="font-mono text-2xl font-bold text-yellow-500 tracking-wider select-all">`
3.  **Reemplazo:** Añadir la clase `break-all` y `text-wrap` (o equivalente Tailwind) a la lista de clases.
    - Nuevo patrón: `<span className="font-mono text-2xl font-bold text-yellow-500 tracking-wider select-all break-all">`
4.  **Escritura:** Guardar el archivo modificado.

## 4. Herramientas y Librerías
- **Librerías Python:** `os`, `re` (expresiones regulares).

## 5. Restricciones y Casos Borde
- **Integridad:** No modificar ninguna otra línea del archivo.
- **Codificación:** Mantener UTF-8.
