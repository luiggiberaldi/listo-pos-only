# Configuración Operativa - Guía Completa

## PropósitoEsta sección agrupa las **configuraciones críticas del día a día operativo**: gestión de inventario, tasas de cambio, métodos de pago e impuestos.

## Cómo Acceder
1. Menú lateral → "Configuración" / "Preferencias"
2. Grupo **"GESTIÓN OPERATIVA"** incluye:
   - Inventario
   - Finanzas/Tasa

---

## 📦 Sección 1: Configuración de Inventario

### Propósito
Controla las reglas de negocio aplicables a la gestión de stock y productos.

### Interfaz
- Card única centrada
- Switch ON/OFF principal
- Botón "GUARDAR PREFERENCIA"

---

### Regla: Vender sin Stock (Venta en Negativo)

#### Qué significa

**Switch ON:**
- Sistema permite agregar productos al carrito aunque stock = 0
- Stock puede volverse negativo (-1, -2, -3...)
- Útil para preventas o mercancía en tránsito

**Switch OFF:**
- Sistema bloquea agregar productos con stock = 0
- Mensaje de error al intentar venderlos
- Control estricto de inventario

#### Cuándo Activar (ON)

✅ **Preventas:**
- Vendes antes de recibir mercancía
- Cliente paga hoy, entregas mañana

✅ **Mercancía en Tránsito:**
- Producto viene en camino
- Registras ventas mientras llega

✅ **Flexibilidad Operativa:**
- No quieres detener ventas por desajustes de stock
- Confías en reabastecimiento rápido

#### Cuándo Desactivar (OFF)

❌ **Control Estricto:**
- Evitar sobreventa de productos limitados
- Asegurar que solo vendes existencias reales

❌ **Prevenir Errores:**
- Detectar productos que necesitan reorden
- Alerta temprana de faltantes

❌ **Auditoría Precisa:**
- Stock siempre refleja existencias físicas
- No hay ambigüedad entre vendido/existente

#### Efecto en el Sistema

**Con switch ON:**
```
Producto: Coca-Cola 2L
Stock actual: 0

Usuario intenta vender: ✅ PERMITIDO
Stock después de venta: -1

Alerta visual: 🔴 Stock negativo en Inventario
```

**Con switch OFF:**
```
Producto: Coca-Cola 2L
Stock actual: 0

Usuario intenta vender: ❌ BLOQUEADO
Sistema muestra: "Producto sin stock disponible"

Usuario debe: Ajustar stock primero (Entrada)
```

#### Permisos Requeridos

**Ver:** `INV_EDITAR`
- Puedes ver la configuración actual

**Modificar:** `INV_EDITAR`
- Puedes cambiar el switch

**Modo Solo Lectura:**
- Badge lock 🔒 visible
- Switch deshabilitado (opaco)
- No puedes cambiar

### Guardar Cambios

**Botón "GUARDAR PREFERENCIA":**
- Solo visible si tienes permisos
- Confirmación: "Configuración Actualizada"
- Cambios aplican inmediatamente

---

## 💰 Sección 2: Finanzas y Tasas

### Propósito
Configura tasas de cambio, impuestos (IVA/IGTF) y métodos de pago aceptados en caja.

---

### Subsección: Impuesto al Valor Agregado (IVA)

#### Qué es

El **IVA** es el impuesto que se aplica automáticamente a productos marcados como "Gravados".

#### Configuración

**Campo: Tasa General (%)**
- Input numérico
- Rango: 0% - 100%
- Default: 16% (Venezuela)
- Paso: 0.01 (decimales permitidos)

**Ejemplo:**
```
Venezuela: 16%
Colombia: 19%
México: 16%
Sin IVA: 0%
```

#### Aplicación Automática

**Productos Gravados:**
- Al crear/editar producto, marca "Gravado"
- Sistema calcula IVA automáticamente al vender
- Aparece en ticket y reportes Z

**Cálculo:**
```javascript
Precio sin IVA: $10.00
IVA 16%: $1.60
Precio Final: $11.60
```

**Reportes Z:**
- Base Imponible (total sin IVA)
- IVA Recaudado
- Total Bruto

#### Nota Informativa

ℹ️ **Importante:** Este porcentaje aplica a:
- Todos los productos "Gravados"
- Cálculos automáticos en reportes
- Facturas fiscales

---

### Subsección: Impuesto a Grandes Transacciones (IGTF)

#### Qué es

El **IGTF** es un recargo porcentual aplicado a pagos en divisas ($/€). Específico de Venezuela.

#### Configuración

**Toggle: Habilitar IGTF**
- **ON:** Sistema cobra recargo automático
- **OFF:** No se aplica IGTF

**Campo: Porcentaje (%)**
- Input numérico
- Default: 3%
- Habilitado solo si toggle está ON

#### Aplicación Selectiva

**Por Método de Pago:**
- Al crear/editar método de pago
- Checkbox: "Aplica Impuesto IGTF (+3%)"
- Solo para métodos marcados

**Ejemplo:**
```
Métodos CON IGTF:
- TDC Internacional (+3%)
- Zelle (+3%)
- PayPal (+3%)

Métodos SIN IGTF:
- Efectivo $
- Pago Móvil Bs
- Transferencia Bancaria Bs
```

#### Cálculo Automático

```javascript
Venta: $100
Cliente paga con: TDC (aplica IGTF)

Subtotal: $100
IGTF 3%: $3
Total a Cobrar: $103
```

**En Ticket:**
- Aparece línea adicional: "IGTF 3%: $3.00"
- Total a Pagar incluye recargo

#### Ventajas del Sistema

✅ Transparente con clientes
✅ Cálculo automático (sin errores humanos)
✅ Reportes Z desglosan IGTF recaudado
✅ Configuración por método (flexibilidad)

---

### Subsección: Métodos de Pago

#### Qué son

Los **métodos de pago** son las formas aceptadas para cobrar ventas: efectivo, tarjeta, transferencia, etc.

#### Vista Principal

**Dos Columnas:**
- **BOLÍVARES (Bs):** Métodos en moneda local
- **DIVISAS ($/€):** Métodos en moneda extranjera

**Cada Método Muestra:**
- Icono visual (tarjeta, teléfono, billete, etc.)
- Nombre del método
- Badges:
  - 🟢 ACTIVO / 🔴 INACTIVO
  - 📋 Requiere Ref (si aplica)
  - 🔶 IGTF +3% (si aplica)
- Botones de acción: ✏️ Editar | 🗑️ Eliminar

---

### Crear Nuevo Método de Pago

**Botón "+ NUEVO MÉTODO"** (superior derecha)

#### Modal de Creación

**Campos:**

**1. Nombre del Método**
- Texto libre
- Ejemplo: "Pago Móvil", "Zelle", "TDC VISA"

**2. Moneda**
- Select: Bolívares | Divisa
- Define en qué columna aparecerá

**3. Icono Visual**
- Select: TARJETA, TELÉFONO, BILLETE, BILLETERA, ENVIAR, BITCOIN
- Mejora UX en POS

**4. Exigir Referencia (Checkbox)**
- **ON:** Al cobrar, sistema pide # de comprobante
- **OFF:** No solicita referencia
- Útil para trazabilidad (transferencias, pago móvil)

**5. Aplica Impuesto IGTF (Checkbox)**
- **ON:** Suma automáticamente recargo IGTF
- **OFF:** No aplica recargo
- Solo visible si IGTF está habilitado globalmente

#### Botones
- **Cancelar:** Cierra modal sin guardar
- **Guardar:** Crea/actualiza método

---

### Editar Método de Pago

1. Clic en icono **✏️ Editar** del método
2. Modal se abre con datos actuales
3. Modifica campos necesarios
4. Guardar

**Restricciones:**
- No puedes cambiar tipo (Bs ↔ Divisa) si ya lo usaste en ventas

---

### Activar/Desactivar Método

**Toggle Switch** junto a cada método

**ACTIVO (🟢):**
- Aparece en POS al cobrar
- Usuarios pueden seleccionarlo

**INACTIVO (🔴):**
- No aparece en POS
- Útil para métodos temporalmente no disponibles
- No se elimina (historial intacto)

**Protección:**
- No puedes desactivar TODOS los métodos
- Sistema requiere al menos 1 activo

---

### Eliminar Método de Pago

**Clic en icono 🗑️**

**Confirmación:**
- Diálogo: "¿Eliminar?"
- Botón: "Sí"

**Restricciones:**
- No puedes eliminar métodos usados en ventas históricas
- Sistema muestra error informativo

**Alternativa:**
- Si no puedes eliminar, **desactívalo**
- Oculta del POS pero mantiene historial

---

### Métodos de Pago por Defecto

El sistema viene con métodos pre-creados:

**Bolívares (Bs):**
- Efectivo Bs
- Pago Móvil
- Transferencia Bancaria

**Divisas ($/€):**
- Efectivo $
- Zelle
- TDC (Tarjeta)

**Puedes:**
- Editarlos
- Desactivarlos
- Agregar nuevos

---

## 🌐 Sincronización con BCV (Tasa de Cambio)

**Nota:** Esta función está documentada en detalle en la sección anterior (`ConfigFinanzas.jsx` incluye lógica de sincronización con BCV).

**Resumen:**
- Botón "Sincronizar con BCV"
- Actualiza tasa USD/VES automáticamente
- Requiere internet
- Muestra loading mientras consulta

---

## ⚙️ Sistema de Permisos

### INV_EDITAR
- Ver y modificar reglas de inventario
- Cambiar "Vender sin Stock"

### CONF_FINANZAS_VER
- Ver configuración de impuestos
- Ver métodos de pago

### CONF_FINANZAS_EDITAR
- Modificar IVA/IGTF
- Crear/editar/eliminar métodos de pago
- Activar/desactivar métodos

### Modo Solo Lectura
**Cuando aparece:**
- Usuario tiene permiso VER pero no EDITAR
- Badge "🔒 SOLO LECTURA" visible

**Restricciones:**
- Switches deshabilitados (opacos)
- Botones ocultos o bloqueados
- Inputs en modo readonly

---

## 📋 Casos de Uso Comunes

### Caso 1: Configurar Sistema para Preventas

```
Objetivo: Permitir ventas de productos no recibidos aún

1. Config → Inventario
2. "Vender sin Stock": ON
3. Guardar
4. Ahora puedes vender aunque stock = 0
5. Al recibir mercancía: Ajustar Stock (Entrada)
```

### Caso 2: Agregar Nuevo Método de Pago

```
Objetivo: Aceptar pagos con PayPal

1. Config → Finanzas/Tasa
2. Clic "+ NUEVO MÉTODO"
3. Nombre: "PayPal"
4. Moneda: Divisa
5. Icono: ENVIAR
6. Exigir Referencia: ON
7. Aplica IGTF: ON (+3%)
8. Guardar
9. Método aparece en columna DIVISAS
10. Al cobrar en POS, ya está disponible
```

### Caso 3: Desactivar Método Temporalmente

```
Situación: Punto de venta Bs no funciona hoy

1. Config → Finanzas/Tasa
2. Busca "Pago Móvil" en columna Bolívares
3. Clic en toggle (verde → rojo)
4. Método desactivado
5. No aparece en POS al cobrar
6. Al restaurar servicio: Toggle nuevamente
```

### Caso 4: Configurar IVA para Nuevo País

```
Objetivo: Sistema en Colombia (IVA 19%)

1. Config → Finanzas/Tasa
2. IVA: Cambiar de 16% a 19%
3. Guardar
4. Todos los productos "Gravados" usan nueva tasa
5. Reportes Z calculan con 19%
```

---

## Preguntas Frecuentes

**Q: ¿Puedo tener diferentes IVA por producto?**  
A: No, el IVA es global. Todos los productos "Gravados" usan la misma tasa. Para exentos, desmarca "Gravado" al crear producto.

**Q: ¿El IGTF es obligatorio para Venezuela?**  
A: Sí, legalmente. El sistema lo calcula automáticamente si lo activas y marcas los métodos correctos.

**Q: ¿Qué pasa si elimino un método usado en ventas?**  
A: Sistema no permite eliminarlo (error). Solo puedes desactivarlo para ocultar del POS.

**Q: ¿Puedo desactivar TODOS los métodos?**  
A: No, sistema requiere al menos 1 método activo para poder cobrar.

**Q: ¿El stock negativo afecta reportes?**  
A: Sí, aparece en Inventario con alerta roja. Los reportes muestran el valor real (positivo o negativo).

**Q: ¿Cómo sincronizar tasa con BCV?**  
A: Config → Finanzas/Tasa → Botón "Sincronizar con BCV" (requiere internet).

---

## Troubleshooting

### Problema: No puedo activar "Vender sin Stock"
**Solución:**
- Verifica permisos (INV_EDITAR)
- Si ves lock 🔒, contacta administrador

### Problema: IGTF no se calcula
**Solución:**
- Verifica que IGTF esté habilitado (toggle ON)
- Verifica que método de pago tenga checkbox "Aplica IGTF" marcado
- Recarga página

### Problema: No puedo eliminar método de pago
**Solución:**
- Si el método fue usado en ventas, no se puede eliminar
- Alternativa: Desactívalo (toggle OFF)
- Queda oculto del POS pero historial intacto

### Problema: IVA no aparece en ticket
**Solución:**
- Verifica que producto esté marcado como "Gravado"
- Verifica que IVA global > 0%
- Config → Diseño Ticket → Contenido → "Impuestos": ON

---

## Mejores Prácticas

### Inventario
✅ Activa "Vender sin Stock" solo si tienes control de reabastecimiento  
✅ Si activas, monitorea stock negativo diariamente  
✅ Realiza conteos físicos mensualmente  
✅ Ajusta stock en cuanto recibas mercancía

### IVA e IGTF
✅ Verifica tasa IVA según legislación de tu país  
✅ Actualiza porcentajes cuando cambien leyes  
✅ Marca correctamente productos gravados/exentos  
✅ Configura IGTF solo en métodos que lo requieran legalmente

### Métodos de Pago
✅ Usa nombres claros y descriptivos  
✅ Activa "Exigir Referencia" para todos los métodos electrónicos  
✅ Asigna iconos representativos (mejora UX)  
✅ Desactiva métodos no disponibles temporalmente  
✅ No elimines métodos con historial (solo desactiva)

### Mantenimiento
✅ Revisa métodos activos semanalmente  
✅ Actualiza tasa BCV diariamente (Venezuela)  
✅ Verifica configuración antes de cierre fiscal  
✅ Documenta cambios importantes (bitácora)

---

## Notas Técnicas

### Stock Negativo
- Permitido: -999,999
- Alerta visual en Inventario (rojo)
- Kardex registra movimiento negativo
- Se corrige con Ajuste de Stock (Entrada)

### Cálculo de IVA
```javascript
precioConIVA = precioBase × (1 + (ivaRate / 100))
ivaTotal = precioBase × (ivaRate / 100)
```

### Cálculo de IGTF
```javascript
igtfMonto = montoVenta × (igtfRate / 100)
totalFinal = montoVenta + igtfMonto
```

### ID de Métodos
- Auto-generado (timestamp único)
- Inmutable después de creación
- Usado en relaciones de ventas
