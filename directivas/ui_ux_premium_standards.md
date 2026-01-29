# Directiva Global: Estándares UI/UX Premium (Listo POS)

**Objetivo**: Establecer las reglas visuales y de comportamiento que definen la experiencia "Premium" del sistema. Estas reglas son inmutables a menos que una nueva directiva lo especifique.

---

## 1. Filosofía Visual: "Glass & Clean"

La interfaz debe sentirse ligera, moderna y ordenada. Evitamos el ruido visual a toda costa.

### Reglas de Contenedores (Glassmorphism)
- **Fondos**: No usar colores sólidos saturados para contenedores grandes.
  - *Correcto*: `bg-emerald-50/30 backdrop-blur-sm` (Sutil, translúcido).
  - *Incorrecto*: `bg-white` (Plano) o `bg-emerald-100` (Muy fuerte).
- **Bordes**: Usar bordes sutiles que definan el límite sin ser agresivos.
  - *Estándar*: `border-emerald-100/50`.

### Jerarquía
- **Tarjetas Separadas**: Elementos lógicamente distintos (ej: Dólares vs Bolívares) deben vivir en "islas" visuales separadas.
- **Títulos**: Uppercase, pequeños (`text-xs` o `text-sm`), con tracking amplio (`tracking-wide`) y colores oscuros pero no negros (`text-emerald-900`).

---

## 2. Componente: Input Inteligente ("All-in-One")

El input de pago no es solo una caja de texto; es un centro de control.

### Anatomía
1.  **Icono Semántico**: A la izquierda, centrado verticalmente.
2.  **Acciones Integradas**: Botones secundarios (como "Completar Saldo / Rayo") deben estar **dentro** del input (absolute positioning a la derecha), no flotando afuera.
3.  **Badges Internos**: La moneda (USD/BS) es un badge interno, no un label externo.

### Comportamiento "Houdini" (Smart Visibility)
- **Elementos Condicionales**: No mostrar inputs vacíos que ensucien la pantalla.
  - *Regla*: El campo `# Referencia` debe estar oculto (`opacity-0`, `max-h-0`) por defecto.
  - *Trigger*: Solo aparece (animación suave `ease-spring`) cuando el `monto > 0`.

### 2.1. Standard de Layout: Vertical Stack (Estilo 1)
**Regla Absoluta**: En formularios de pago, la estructura Monto/Referencia SIEMPRE debe ser vertical (`flex-col`).
- **NUNCA** colocar la referencia al lado del monto (Row layout).
- **Por qué**: Garantiza que el input monetario (el más importante) tenga el 100% del ancho disponible en cualquier dispositivo, evitando errores de dedo.
- **Animación**: La referencia debe usar transiciones de `max-height` ("Cortina Vertical") para no romper el flujo visual.
- **Márgenes Inteligentes**: Si el input tiene badges flotantes inferiores (ej: Tasa de Cambio), el input de referencia debe añadir un `margin-top` dinámico para no solaparse.

---

## 3. Authentic Branding (Colores Reales)

Respetamos los colores de marca de los métodos de pago para reducir la carga cognitiva (reconocimiento instantáneo).

| Método | Color Base | Clase Tailwind Texto | Clase Tailwind Fondo |
| :--- | :--- | :--- | :--- |
| **Zelle** | Púrpura | `text-purple-600` | `bg-purple-50` |
| **Binance / USDT** | Amarillo | `text-yellow-600` | `bg-yellow-50` |
| **Pago Móvil / Bs** | Azul | `text-blue-600` | `bg-blue-50` |
| **Efectivo USD** | Esmeralda | `text-emerald-600` | `bg-emerald-50` |

**Implementación Técnica**:
Usar una función helper `getBrandStyles(nombre)` que retorne el set completo de clases (borde, texto, ring, fondo) para aplicarlo dinámicamente al input cuando está activo.

---

## 4. Micro-interacciones (Tactile Feel)

El software debe "sentirse" al tocarlo.

- **Active Scale**: Todos los botones e interacciones deben tener `active:scale-95` o `active:scale-90`.
- **Focus Ring**: Al enfocar un input, usar un `ring-4` del color de la marca con baja opacidad (`ring-purple-500/20`) para dar sensación de "resplandor".
- **Transiciones**: Todo cambio de estado debe tener `transition-all duration-200` o `300`.

---

## 5. Protocolo de Estabilidad Visual (Zero Layout Shift)

**Regla de Oro**: El contenedor principal de una interfaz de alta interacción (como el POS) debe ser **INMÓVIL**. El contenido puede cambiar internamente, pero el "shell" nunca debe redimensionarse ni saltar.

### Anti-Patrones (PROHIBIDO) 🚫
1. **Renderizado Condicional Directo**: `{condicion && <Componente />}` → Esto elimina el nodo del DOM y causa Reflow inmediato.
2. **Alturas Automáticas**: Dejar que el contenido empuje el modal (`h-auto`).
3. **Min-Height Variables**: `min-h-[200px]` que luego crece a `300px`.

### Patrón Correcto: "Fixed Shell, Fluid Content" ✅

#### 1. Contenedor de Altura Fija
Establecer una altura explícita que acomode el contenido más alto posible.
```jsx
// El contenedor reserva el espacio desde el principio
<div className="relative w-full h-[320px]"> 
  ...
</div>
```

#### 2. Posicionamiento Absoluto
Los hijos se superponen en el mismo espacio, evitando que se empujen entre sí.
```jsx
<div className="absolute inset-0 ..."> 
  <ContenidoA />
</div>
```

#### 3. Visibilidad por Opacidad (No DOM Removal)
Mantener los elementos en el DOM pero invisibles/intocables.
```jsx
className={`absolute inset-0 transition-all duration-300 ${
  isActive 
    ? 'opacity-100 scale-100 z-10 pointer-events-auto' 
    : 'opacity-0 scale-95 z-0 pointer-events-none'
}`}
```

### Tabla de Decisión
| Escenario | Estrategia |
|:---|:---|
| Modales de Pago | **Fixed Height Protocol** (Obligatorio) |
| Tooltips / Popovers | Absolute + Z-Index |
| Listas dinámicas (Items) | `animate-height` (Librerías) o `min-h` |
| Alertas Globales | `fixed` top/bottom (Overlay) |


