# Directiva: Estado del Entorno Python (ENV-PY-001)

**Estado Actual:**
- **Versión de Python:** 3.14.2 (Versión de Pre-lanzamiento/Alpha).
- **Codificación de Terminal:** `cp1252` (Windows Standard).
- **Problema Detectado:** El Servidor de Lenguaje (Pyrefly) falla constantemente (Error `3221225781`).

## Diagnóstico Técnico
1. **Incompatibilidad de Versión:** Python 3.14 es demasiado nuevo. La mayoría de herramientas de desarrollo (Language Servers, linters) aún no son compatibles, lo que causa los "crashes" reportados.
2. **Errores de Codificación:** Al usar `cp1252`, los scripts que intenten imprimir Emojis o caracteres Unicode fallarán con `UnicodeEncodeError`.

## Restricciones y Reglas de Operación
- **No usar Emojis en Scripts:** Todo `print()` en Python debe ser texto plano (ASCII).
- **Manejo de Errores:** Ignorar mensajes de "Language server crashed" en el IDE, ya que es un problema de compatibilidad de la versión de Python y no del código.
- **Lógica Determinista:** Mantener los scripts con lógica simple que no dependa de librerías de terceros complejas que podrían no estar compiladas para 3.14 aún.

## Soluciones Recomendadas
- **Para Estabilidad:** Instalar Python 3.12.x si se requiere un entorno de desarrollo profesional sin errores de servidor.
- **Para Codificación:** Si se necesitan caracteres especiales, los scripts deben forzar UTF-8 en sus headers o usar:
  ```python
  import sys
  import io
  sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
  ```
