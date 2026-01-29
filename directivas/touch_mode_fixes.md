# Directiva: Corrección de Visualización en Inputs (Modo Touch)

**Estado**: Propuesta
**Fecha**: 2026-01-21
**Prioridad**: Alta (Afecta usabilidad crítica)

---

## 1. El Problema
En el Modo Touch, los campos de entrada de montos ("Inputs de Pago") colapsan visualmente cuando el usuario ingresa más de 3 dígitos.
**Síntomas**:
- El texto se corta o desaparece.
- El cursor se pierde.
- Sensación de "claustrofobia" en el UI.

## 2. Diagnóstico Técnico
El problema raíz es una **Sobrecarga de Padding** combinada con un tamaño de fuente grande, que deja un "Content Box" (área útil de escritura) cercano a cero en pantallas medianas/pequeñas.

- **Padding Izquierdo Actual**: `!pl-20` (80px). Excesivo para un ícono en `left-6`.
- **Padding Derecho Actual**: `!pr-28` (112px). Excesivo para los controles derechos.
- **Fuente**: `text-2xl`. Ocupa mucho espacio horizontal.

Al sumar 192px de padding horizontal fijo, si el contenedor mide 300px (común en grilla de 2 columnas en tablets), solo quedan 108px para el texto. Con `text-2xl`, caben muy pocos caracteres.

## 3. La Solución (Protocolo de Corrección)

### A. Optimización de Espaciado (Regla "Breathing Room")
Debemos reducir el "peso muerto" del padding sin sacrificar la estética espaciosa.

1.  **Padding Left**: Reducir de `pl-20` a **`pl-16`** (64px) o **`pl-14`** (56px).
    - *Cálculo*: Icono (24px) + Margen Izq (24px) + Margen Der del icono (16px) = ~64px.
2.  **Padding Right**: Reducir de `pr-28` a **`pr-24`** (96px) o **`pr-20`** (80px).
    - *Cálculo*: Badge moneda + Botón Rayo ~= 70-80px.

### B. Ajuste de Tipografía
- Evaluar reducir `text-2xl` a **`text-xl`** en Modo Touch si el espacio es crítico, O mantener `2xl` pero asegurar el ancho con la reducción de padding.

### C. Restricciones de CSS
- Asegurar que el input no tenga un ancho fijo que force el colapso.
- Verificar `min-width` en el contenedor padre si es flex.

---

## 4. Pasos de Ejecución (SOP)
1.  **Modificar `PaymentForm.jsx` / `InputPago`**:
    - Ajustar las clases condicionales `isTouch`.
    - Probaremos: `isTouch ? '!pl-14 !pr-24' : ...`
2.  **Verificación**:
    - Ingresar montos grandes (ej. `123456.78`).
    - Verificar que el texto no se solape con el ícono ni con el botón de acción.
3.  **Memoria**: Si esto soluciona el problema, estandarizar estos paddings para todos los inputs "grandes" en Modo Touch.

---

## 5. Problema #2: Colapso de Layout con Referencia (Modo Touch)
**Diagnóstico**: 
Cuando se activa el campo de referencia (ej. Zelle, Transferencia), el layout actual (Flex Row) intenta colocar el Input de Monto y el de Referencia lado a lado.
- En pantallas táctiles (incluso tablets), el Input de Monto se reduce al ~60% del ancho.
- Debido al tamaño de fuente grande (`text-2xl` o `text-xl`) y el padding, los dígitos se cortan inmediatamente.

**Solución Propuesta (Layout Vertical)**:
En Modo Touch, **forzar siempre el apilamiento vertical** de los inputs cuando el método requiere referencia.
Dejar de luchar por el espacio horizontal.

1.  **Cambio de Flex Direction**:
    - Actual: `isTouch ? 'flex-col sm:flex-row' : ''`
    - Propuesta: `isTouch ? 'flex-col' : ''` (Eliminar `sm:flex-row` para Touch).
    
    *Resultado*:
    [ INPUT MONTO (100% Ancho) ]
    [ INPUT REFERENCIA (100% Ancho) ]

2.  **Ajuste de Referencia**:
    - El contenedor de referencia debe tener `w-full` en lugar de `sm:w-2/5` cuando está en Modo Touch.

**Plan de Acción**:
1. Modificar el contenedor padre en `PaymentForm.jsx` (Línea ~64).
2. Modificar el contenedor de Referencia (Línea ~122) para que ocupe ancho completo en Touch.

---

## 6. Problema #3: Numeric Pad Inactivo en Referencias
**Diagnóstico**:
El `NumericPad` (panel lateral en modo Touch) está "cableado" exclusivamente para actualizar el estado `pagos` (montos). No tiene conocimiento de cuándo el usuario está editando una referencia.
- `ModalPago.jsx` solo rastrea `activeInputId` (que es el ID del método de pago).
- No distingue si el foco está en el *Monto* o en la *Referencia*.

**Solución Propuesta (Estado Dual)**:
Introducir una distinción de "Tipo de Campo Activo" en `ModalPago`.

1.  **Nuevo Estado**: `const [activeInputType, setActiveInputType] = useState('amount');` // 'amount' | 'ref'
2.  **Enrutamiento de Eventos**:
    - Input Monto `onFocus` -> `setActiveInputId(id)` + `setActiveInputType('amount')`
    - Input Referencia `onFocus` -> `setActiveInputId(id)` + `setActiveInputType('ref')`
3.  **Lógica del Pad**:
    - Si `activeInputType === 'amount'` -> Actualizar `pagos`.
    - Si `activeInputType === 'ref'` -> Actualizar `referencias`.
4.  **UX Extra**: 
    - Actualizar placeholder en Touch de "" a "Ref #".

**Plan de Acción**:
1. Modificar `ModalPago/index.jsx` para gestionar el nuevo estado y pasarlo al `NumericPad`.
2. Modificar `PaymentForm.jsx` para exponer el evento `onFocus` del input de referencia.

---

## 7. Problema #4: Redundancia Visual en Placeholder (Modo Touch)
**Diagnóstico**:
El input de referencia tiene un ícono decorativo estático (`#`) a la izquierda.
Al cambiar el placeholder a "Ref #", se crea una redundancia visual:
`[ # ] [ Ref # ]`

**Solución Propuesta**:
Simplificar el placeholder en Modo Touch para eliminar el símbolo redundante.

- **Antes**: `placeholder="Ref #"`
- **Propuesta**: `placeholder="Referencia"` o `placeholder="Ref"`

**Plan de Acción**:
1. Modificar `PaymentForm.jsx` (Línea ~130) para usar un texto más limpio.

---

## 8. Problema #5: Desbordamiento de Tasa de Cambio (Modo Touch)
**Diagnóstico**:
En la tarjeta de **Bolívares**, el encabezado contiene el Título y el Badge de Tasa alineados horizontalmente (`flex-row`).
En pantallas táctiles con fuentes grandes (`text-lg`), el contenido excede el ancho disponible de la tarjeta (50% de la pantalla), provocando que el badge de la tasa se salga del contenedor ("overflow").

**Solución Propuesta (Responsive Header)**:
Cambiar la dirección del layout del encabezado en Modo Touch para evitar colisiones.

1.  **Layout Vertical**:
    - Cambiar de `flex-row` a `flex-col` en el contenedor del encabezado (solo cuando `isTouch` es true).
    - Alinear los elementos a la izquierda (`items-start`).
2.  **Ajuste de Margen**:
    - Añadir un pequeño margen (`gap-2`) para separar el título de la tasa.

**Plan de Acción**:
1. Modificar `PaymentForm.jsx` (Líneas ~222) para aplicar clases condicionales al header de Bolívares.

---

---

---

---

## 9. Problema #6: Encabezado de Vuelto Desproporcionado (Modo Touch) - Iteración 4 (Final)
**Solicitud (User)**: "Vuelto Total" en una línea, debajo Dólares, debajo Bolívares. Eliminar "Modo Manual".

**Solución Propuesta (Clean Vertical Stack)**:
Simplificar al máximo. Una columna vertical alineada a la izquierda.

**Estructura (Solo Modo Touch)**:
1.  **Línea 1**: Título "VUELTO TOTAL" (Ancho completo).
    - *Nota*: Si "Mix Activo", el badge puede ir flotando a la derecha o al lado, pero "Modo Manual" desaparece.
2.  **Línea 2**: **Monto USD** (`text-4xl` o `text-3xl`).
3.  **Línea 3**: **Monto Bs** (`text-base` o `text-sm`).

**Resultado Visual**:
```
VUELTO TOTAL
$13.00
~ Bs 4.524,00
```

**Plan de Acción**:
1. Modificar `ChangeCalculator.jsx` para usar `flex-col` simple y ocultar el badge en modo manual para Touch.

---

## 10. Problema #7: Barra de Búsqueda de Clientes Colapsada (Modo Touch)
**Diagnóstico**:
El componente `ClienteSelector.jsx` usa estilos fijos (`py-2.5`, `!pl-10`, `text-sm`) que son insuficientes para el Modo Touch, causando que el texto "Buscar por nombre..." se corte o se vea muy pequeño y apretado.
Además, el componente no recibe la prop `isTouch`.

**Solución Propuesta**:
1.  **Inyectar Contexto**: Pasar `isTouch` desde `ModalPago/index.jsx` a `ClienteSelector`.
2.  **Estilos Responsivos**:
    - Aumentar padding vertical (`py-4` en Touch).
    - Aumentar tamaño de fuente (`text-lg` o `text-xl`).
    - Ajustar posición del ícono de búsqueda (más grande y centrado).
    - Ajustar padding izquierdo (`!pl-12` o `!pl-14`) para que el texto no toque el ícono.

**Diagnóstico (Iteración 2)**:
El texto "Buscar cliente..." sigue siendo muy largo para el ancho de columna disponible (30%) en Modo Touch con fuente grande.

**Solución (Iteración 2)**:
1.  **Acortar Placeholder**: Cambiar a simplemente **"Buscar..."**.
2.  **Ajuste Fino**: Reducir ligeramente el tamaño de fuente de `text-lg` a `text-base` si es necesario para mantener balance.

**Plan de Acción**:
1. Modificar `ClienteSelector.jsx` para usar `placeholder="Buscar..."` en Touch.

