# Propuesta: Estrategia de Escaneo para Productos con Jerarquía

## El Problema
Actualmente, el sistema protege la venta preguntando *“¿Qué quieres vender?”* (Unidad, Paquete o Bulto) cada vez que escaneas un producto que tiene jerarquías activas.
- **Ventaja**: Evita errores (vender un bulto a precio de unidad).
- **Desventaja**: Frena el flujo rápido de caja (requiere 1 clic extra por cada producto).

---

## Estrategias de la Industria (Benchmarking)

### 1. El Estándar Global (GS1) - La Solución Ideal
En el retail profesional (Walmart, Farmatodo, etc.), **la Unidad y el Bulto tienen códigos de barras DISTINTOS**.
- **Cata de Coca-Cola**: Código `54490001` → El sistema marca 1 Lata.
- **Pack de 6 Latas**: Código `54490002` → El sistema marca 1 Pack (Precio distinto).
- **Caja de 24 Botellas**: Código `123456789` → El sistema marca 1 Caja.

**¿Cómo lo maneja el POS?**
Simplemente se guardan como 3 "códigos" distintos vinculados al mismo inventario, o el sistema entiende que el código `X` descuenta `1` y el código `Y` descuenta `12`. **Cero preguntas al cajero.**

### 2. La Solución de Software (Tu Propuesta) - "Default Override"
Cuando el producto **no tiene códigos distintos** (ej: una caja de plátanos tiene el mismo código pegado que el plátano individual, o no tiene código y usan uno genérico), el software debe decidir por el usuario.

**Tu idea es sólida:** Configurar una "Unidad por Defecto para Escáner".

---

## Nuestra Propuesta: "Smart Default"

Modificar el Inventario para que cada producto con jerarquía tenga una preferencia de marcado rápido.

### Cambios en Inventario
Agregar un selector: **"Al Escanear usar:"**
1.  **Preguntar Siempre** (Comportamiento actual - Seguro).
2.  **Unidad** (Rápido - Estándar).
3.  **Bulto** (Para mayoristas).

### Nuevo Flujo en Caja (POS)
Al escanear el código `123456`:

| Configuración | Comportamiento |
| :--- | :--- |
| **Preguntar** | Abre el modal de selección (Actual). |
| **Unidad** | **Agrega 1 Unidad inmediatamente.** (Bypasea el modal). |
| **Bulto** | Agrega 1 Bulto inmediatamente. |

### ¿Y si quiero vender lo contrario?
Si dejaste "Unidad" por defecto, pero viene un cliente con un Bulto:
1.  Escaneas el código (Se agrega 1 Unidad).
2.  Tocas la línea del producto en la cesta.
3.  En el modal de edición, cambias la unidad de "Unidad" a "Bulto".

**Alternativa Pro**: Crear un botón en el POS llamado "Modo Mayorista" que invierta temporalmente la preferencia.

---

## Veredicto
Tu propuesta de **"Elegir en el inventario cual será la jerarquía"** es la opción más pragmática para negocios mixtos (detal/mayor) que no tienen códigos de barras diferenciados para sus cajas.

**¿Procedemos a implementar el campo `defaultScannedUnit` en el modelo de producto?**
