# Ejemplo de Refactoring: Clean Architecture

Este ejemplo muestra cómo transformar un código monolítico y acoplado en uno modular y limpio.

## ❌ ANTES (Violación de principios)

```javascript
// Procesador de Ordenes - Lógica mixta, nombres pobres, función larga
function process(d) {
    let t = 0;
    // Valida inventario y calcula total mezclado con UI
    for (let i = 0; i < d.items.length; i++) {
        if (d.items[i].q > 0) {
            let p = d.items[i].price;
            if (d.items[i].type === 'food') {
                p = p * 0.9; // Descuento mágico quemanado
            }
            t += p * d.items[i].q;
        } else {
            console.log('Error: Out of stock for ' + d.items[i].name); // UI coupled
            return;
        }
    }
    
    // Guarda en BD directamente (Acoplamiento)
    const db = require('database');
    db.save('orders', { total: t, items: d.items });
    
    document.getElementById('total-display').innerText = t; // UI coupled
}
```

## ✅ DESPUÉS (Aplicando Clean Architecture)

### 1. Separación de Lógica de Negocio (Dominio)

```javascript
const FOOD_DISCOUNT_FACTOR = 0.9;

/**
 * Calcula el precio de un ítem aplicando reglas de negocio.
 */
function calculateItemPrice(item) {
    let price = item.price;
    if (item.type === 'food') {
        price *= FOOD_DISCOUNT_FACTOR;
    }
    return price;
}

/**
 * Calcula el total de la orden.
 * Retorna el total o lanza un error si hay problemas de validación.
 */
function calculateOrderTotal(items) {
    let total = 0;
    for (const item of items) {
        if (item.quantity <= 0) {
            throw new Error(`Out of stock for item: ${item.name}`);
        }
        total += calculateItemPrice(item) * item.quantity;
    }
    return total;
}
```

### 2. Capa de Aplicación / Orquestación

```javascript
async function processOrder(orderData, dbRepository, uiPresenter) {
    try {
        const total = calculateOrderTotal(orderData.items);
        
        // Persistencia desacoplada
        await dbRepository.saveOrder({ ...orderData, total });
        
        // UI desacoplada
        uiPresenter.showTotal(total);
        
    } catch (error) {
        uiPresenter.showError(error.message);
    }
}
```

**Beneficios:**
- **Nomenclatura**: Nombres claros (`calculateOrderTotal`, `processOrder`).
- **Modularidad**: Funciones pequeñas y enfocadas.
- **Desacoplamiento**: La lógica no sabe nada del DOM ni de la base de datos específica.
