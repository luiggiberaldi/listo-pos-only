---
name: clean-architecture
description: Asegura que el código siga principios SOLID, DRY y KISS para mejorar la mantenibilidad.
---

# Clean Architecture Skill

Esta skill guía al agente para asegurar que el código generado o refactorizado cumpla con altos estándares de mantenibilidad y limpieza.

## Checklist de Revisión

Al escribir o revisar código, verifica los siguientes puntos:

### 1. Nomenclatura
- [ ] **Descriptiva y Consistente**: Las variables, funciones y clases deben tener nombres que expliquen claramente su propósito.
- [ ] **Idioma**: Usa Inglés o Español de forma consistente en todo el archivo (no mezclar Spanglish a menos que sea terminología estándar).
- [ ] **Convenciones**: camelCase para variables/funciones, PascalCase para clases/componentes (dependiendo del lenguaje).

### 2. Modularidad
- [ ] **Principio de Responsabilidad Única (SRP)**: Cada función o clase debe hacer una sola cosa bien.
- [ ] **Longitud**: Las funciones NO deben exceder las 40 líneas de código. Si es más larga, divídela en sub-funciones auxiliares.
- [ ] **Complejidad Ciclomática**: Evita anidamiento excesivo (if dentro de for dentro de if).

### 3. Desacoplamiento
- [ ] **Separación de Lógica y UI**: La lógica de negocio (cálculos, reglas, transformaciones de datos) debe estar separada de la capa de presentación (UI, renders, console logs).
- [ ] **Inyección de Dependencias**: Evita instanciar dependencias pesadas dentro de las funciones; prefiere recibirlas como argumentos.
