# Protocolo de Desarrollo: Diseñador de Etiquetas (Label Studio)

> **IDENTIFICADOR**: DISEÑO_ETIQUETAS_SOP
> **ESTADO**: ACTIVO
> **ÚLTIMA ACTUALIZACIÓN**: 2026-01-25

## 1. Principios Fundamentales
El módulo `PriceLabelGenerator.jsx` y su interfaz `LabelStudioModal.jsx` son componentes críticos para la operación offline. Su diseño debe ser:

1.  **WYSIWYG Real y Local**: Lo que ves en el preview debe ser idéntico al PDF final. Toda generación ocurre en el cliente (`jsPDF`), sin depender de servidores.
2.  **Sistema de Gravedad (Gravity Layout)**: Los elementos nunca deben superponerse.
    *   La posición de cada elemento (Precio, Badge, Footer) depende de dónde terminó el anterior (`safeY`).
    *   Si el usuario mueve un elemento hacia arriba manualmente, el sistema de colisión lo detendrá al tocar el elemento superior.
3.  **Márgenes Inviolables**: El contenido jamás debe imprimirse fuera de `printableWidth` y `printableHeight`.

## 2. Arquitectura Modular

```
src/components/inventario/
├── LabelStudioModal.jsx       # ORQUESTADOR (Estado, Persistencia, Render Loop)
├── PriceLabelGenerator.jsx    # MOTOR GRÁFICO (Lógica de dibujo pura, sin UI)
└── studio/
    ├── StudioSidebar.jsx      # UI CONTROL (Inputs, Sliders)
    └── StudioPreview.jsx      # UI VIEW (Iframe PDF)
```

## 3. Reglas de Renderizado (`PriceLabelGenerator.jsx`)

### A. Pre-Cálculo de Geometría
Antes de dibujar, calcular alturas.
*   *Retail Template*: La altura del header negro depende de las líneas del título.

### B. Capas de Dibujo
1.  **Fondos/Bordes**: Se dibujan primero. Respetan `marginX` y `marginY`.
    *   *Boutique*: Doble borde solo si hay espacio suficiente.
2.  **Contenido (Gravity Flow)**:
    *   `Title` → Define `safeY` inicial.
    *   `Badge` → Se posiciona relativo a `safeY`. Si hay colisión, baja. Nuevo `safeY`.
    *   `Prices` → Se posicionan relativos a `safeY`. Nuevo `safeY`.
    *   `Footer` → Se posiciona desde abajo (`h - margin`), pero **nunca** por encima del último `safeY`.

## 4. Persistencia
*   Los perfiles se guardan en `localStorage` por formato (`listo_label_profiles`).
*   Al cambiar de papel (58mm -> 80mm), se debe cargar el perfil asociado automáticamente.

## 5. Validación de Cambios
Cualquier modificación futura debe pasar estas pruebas:
1.  **Prueba de Desbordamiento**: Poner un título de 5 líneas. ¿El precio baja o se solapa? (Debe bajar).
2.  **Prueba de Margen**: Poner márgenes a 10mm. ¿El contenido se encoge o se corta? (Debe encogerse/adaptarse).
3.  **Prueba de Footer**: Subir el footer al máximo. ¿Tapa el precio? (No debe).
