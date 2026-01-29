# DIRECTIVA: RENOMBRAR_PROYECTO_SOP

> **ID:** 20260120_RENAME
> **Script Asociado:** `scripts/renombrar_proyecto.py`
> **Última Actualización:** 2026-01-20
> **Estado:** ACTIVO

---

## 1. Objetivos y Alcance
- **Objetivo Principal:** Renombrar todas las referencias de "listo" a "listo" en el código fuente, archivos de configuración y nombres de archivos.
- **Criterio de Éxito:** No quedan referencias a "listo" (case-insensitive) en los archivos procesados, y el nombre del proyecto en `package.json` es "listo-pos" (o similar).

## 2. Especificaciones de Entrada/Salida (I/O)

### Entradas (Inputs)
- **Archivos Fuente:** Todo el directorio raíz (excluyendo carpetas ignoradas).

### Salidas (Outputs)
- **Artefactos Generados:** Archivos modificados in-place.
- **Retorno de Consola:** Resumen de archivos modificados y ocurrencias reemplazadas.

## 3. Flujo Lógico (Algoritmo)

1. **Escaneo:** Listar todos los archivos en el proyecto, excluyendo `node_modules`, `.git`, `dist`, `build`, `.tmp`.
2. **Reemplazo en Contenido:**
   - Reemplazar "listo pos" -> "listo pos"
   - Reemplazar "Listo POS" -> "Listo POS"
   - Reemplazar "listo" -> "listo"
   - Reemplazar "Listo" -> "Listo"
3. **Renombrado de Archivos:** Buscar archivos o carpetas que contengan "listo" en su nombre y renombrarlos a "listo".

## 4. Herramientas y Librerías
- **Librerías Python:** `os`, `re`, `pathlib`.

## 5. Restricciones y Casos Borde (Edge Cases)
- **Case Sensitivity:** Se deben manejar variaciones de mayúsculas/minúsculas.
- **Exclusiones:** No tocar binarios, `.rar`, o carpetas de dependencias.
- **Paths:** Si se renombra una carpeta, hay que tener cuidado con las referencias relativas en el mismo script.

## 6. Protocolo de Errores y Aprendizajes (Memoria Viva)

| Fecha | Error Detectado | Causa Raíz | Solución/Parche Aplicado |
|-------|-----------------|------------|--------------------------|
| 20/01 | N/A | N/A | Inicio de tarea |

## 7. Ejemplos de Uso

```bash
python scripts/renombrar_proyecto.py
```

## 8. Checklist de Pre-Ejecución
- [x] Copia de seguridad (el usuario tiene un .rar y carpeta respaldo)
- [ ] Script creado en `scripts/renombrar_proyecto.py`
- [ ] Lista de archivos a procesar validada

## 9. Checklist Post-Ejecución
- [ ] Verificación manual de la UI
- [ ] Grep de "listo" para asegurar limpieza total
