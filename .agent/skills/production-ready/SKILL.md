---
name: production-ready
description: Valida que el código esté listo para producción, enfocado en seguridad, manejo de errores y rendimiento.
---

# Production Ready Skill

Esta skill se enfoca en la robustez, seguridad y eficiencia del código antes de ser desplegado.

## Instrucciones y Validaciones

### 1. Manejo de Errores (Error Handling)
- [ ] **Try-Catch Mandatorio**: TODA operación que involucre I/O (llamadas a API, consultas a Base de Datos, lectura de archivos) o cálculos críticos debe estar envuelta en bloques `try-catch`.
- [ ] **Manejo Gracioso**: Nunca dejes un `catch` vacío. Loguea el error o retorna un estado de error manejable por la UI.

### 2. Seguridad
- [ ] **Cero Secretos**: Verifica que NO existan API Keys, tokens, contraseñas o URLs con credenciales "quemadas" (hardcoded) en el código. Usa variables de entorno (`process.env`).
- [ ] **Sanitización**: Asegura que los inputs de usuario sean validados antes de usarse.

### 3. Rendimiento (PWA & Mobile Focus)
- [ ] **Uso de Memoria**: Evita crear arreglos o objetos gigantes en memoria innecesariamente. Usa streams o paginación si es posible.
- [ ] **Leaks**: Asegura que los listeners de eventos (`addEventListener`) o suscripciones se limpien (`removeEventListener`) cuando los componentes se desmontan.
- [ ] **Eficiencia**: Revisa bucles anidados que puedan optimizarse.
