# Clientes - Guía Completa

## Propósito
La página de Clientes permite gestionar la cartera de contactos, control de créditos, historial de compras y análisis de deudas/saldo a favor.

## Cómo Acceder
- Menú lateral → "Clientes"
- O desde Dashboard → "Clientes"

---

## Interfaz Principal

### Elementos de la Pantalla

**1. Contador de Registros**
- Muestra total de clientes en la base de datos

**2. Barra de Búsqueda**
- Busca por nombre, documento (cédula/RIF) o teléfono
- Resultados en tiempo real

**3. Filtros Rápidos**
- **Todos** - Muestra todos los clientes
- **Deudores** - Solo clientes con deuda pendiente
- **Saldo a Favor** - Solo clientes con crédito a favor

**4. Tabla de Clientes**
- Lista paginada (10 clientes por página)
- Información de contacto y estado de cuenta
- Acciones disponibles por cliente

---

## Crear Nuevo Cliente

### Cómo Crear

1. **Clic en "NUEVO CLIENTE"** (botón azul superior derecho)
2. **Formulario se abre** con los siguientes campos:

**Campos Obligatorios:**
- **Nombre** - Nombre completo del cliente
- **Documento** - Cédula o RIF (formato: V-12345678)

**Campos Opcionales:**
- **Teléfono** - Número de contacto
- **Dirección** - Dirección física
- **Email** - Correo electrónico

3. **Presiona "Guardar"**
4. **Confirmación** - Toast verde indica éxito

### Ejemplo de Registro

```
Nombre: Juan Pérez
Documento: V-12345678
Teléfono: 0424-1234567
Dirección: Av. Principal, Casa #10
Email: juan@ejemplo.com
```

---

## Buscar Clientes

### Búsqueda por Texto

**Qué puedes buscar:**
- ✅ Nombre (Ej: `Juan`, `Pérez`)
- ✅ Documento completo (Ej: `V-12345678`)
- ✅ Documento parcial (Ej: `12345`)
- ✅ Teléfono (Ej: `0424`)

**Cómo usar:**
1. Escribe en el campo de búsqueda
2. Los resultados se filtran automáticamente
3. La búsqueda es insensible a mayúsculas

###  Filtros por Estado de Cuenta

**Filtro "Deudores":**
- Muestra solo clientes con deuda > $0.01
- Badge rojo indica deuda
- Muestra equivalente en bolívares

**Filtro "Saldo a Favor":**
- Muestra solo clientes con crédito a favor > $0.01
- Badge verde indica saldo positivo
- Se puede usar en futuras compras

**Filtro "Todos":**
- Muestra todos los clientes sin filtrar
- Incluye solventes, deudores y con saldo a favor

---

## Estado de Cuenta

### Tipos de Estado

**1. Solvente** (Badge gris)
- Deuda: $0
- Saldo a Favor: $0
- Cliente sin pendientes

**2. Deudor** (Badge rojo)
- Deuda > $0.01
- Muestra monto en USD y equivalente en VES
- Requiere cobro

**3. Saldo a Favor** (Badge verde)
- Crédito disponible > $0.01
- Cliente puede usarlo en próximas compras
- Generado por abonos o devoluciones

---

## Ver Historial de Cliente

### Cómo Abrir

1. Localiza al cliente en la tabla
2. Haz clic en el ícono **📄 (FileText)** en acciones
3. Se abre modal "Estado de Cuenta"

### Información del Modal

**Sección 1: Resumen**
- Deuda actual
- Saldo a favor actual
- Balance neto

**Sección 2: Historial de Compras**
- Lista de todas las ventas a crédito
- Fecha, monto, estado (Pendiente/Pagada)
- Total histórico

**Sección 3: Historial de Abonos**
- Lista de pagos realizados
- Fecha, monto, método
- Responsable del registro

### Acciones Disponibles

- **Imprimir Estado de Cuenta**
- **Exportar a Excel** (si disponible)
- **Cerrar**

---

## Vender a un Cliente

### Cómo Vender

1. Localiza al cliente en la tabla
2. Haz clic en el ícono **🛍️ (ShoppingBag)** en acciones
3. **Redirige automáticamente al POS** con cliente preseleccionado
4. Agrega productos normalmente
5. Al cobrar, el cliente ya está seleccionado

**Beneficio:**
- Ahorra tiempo al no buscar cliente en el POS
- Garantiza facturación correcta
- Historial de compras automático

---

## Gestión de Créditos

### Vender a Crédito

**En el POS:**
1. Selecciona productos
2. Presiona F9 (Cobrar)
3. Selecciona el cliente
4. Método de pago: **"Crédito"**
5. Finalizar venta

**Resultado:**
- Deuda del cliente aumenta
- Venta registrada como pendiente
- Stock se descuenta normalmente

### Realizar Abono (Cobrar Deuda)

**Solo disponible para clientes con deuda > $0**

1. Localiza al cliente deudor
2. Haz clic en el ícono **💰 (Wallet)** en acciones
3. **Modal de Abono se abre**
4. Ingresa datos:
   - **Monto a abonar** (máximo: deuda actual)
   - **Método de pago** (Efectivo USD/VES, Punto)
   - **Referencia** (opcional para punto/transferencia)
5. Presiona "Registrar Abono"

**Qué pasa:**
- ✅ Deuda del cliente se reduce
- ✅ Abono registrado en historial
- ✅ Si paga de más → Saldo a favor automático
- ✅ Si paga exacto → Cliente queda solvente

**Ejemplo:**
```
Deuda actual: $50
Abono: $30
Nueva deuda: $20

---

Deuda actual: $50
Abono: $60
Nueva deuda: $0
Saldo a Favor: $10
```

### Usar Saldo a Favor

**En el POS:**
1. Selecciona cliente con saldo a favor
2. Al cobrar, el sistema detecta el crédito
3. Opción: **"Descontar de Saldo a Favor"**
4. El saldo se resta automáticamente del total

**Ejemplo:**
```
Total a pagar: $30
Saldo a favor: $10
Cliente paga: $20
Nuevo saldo a favor: $0
```

---

## Editar Cliente

### Cómo Editar

1. Localiza al cliente
2. Haz clic en el ícono **✏️ (Edit2)** en acciones
3. Formulario se abre con datos actuales
4. Modifica los campos necesarios
5. Presiona "Guardar"

**Campos Editables:**
- Nombre
- Documento
- Teléfono
- Dirección
- Email

**Nota:** No puedes editar deuda o saldo a favor directamente (solo con abonos o ventas)

---

## Eliminar Cliente

### ⚠️ Importante
- Solo se puede eliminar si el cliente **NO tiene:**
  - Deuda pendiente
  - Saldo a favor
  - Ventas registradas

### Cómo Eliminar

1. Localiza al cliente
2. Haz clic en el ícono **🗑️ (Trash2)** en acciones
3. Confirma en el diálogo
4. **Si tiene pendientes:** Error indica que está bloqueado
5. **Si está limpio:** Cliente eliminado

**Si necesitas eliminar un cliente con historial:**
1. Liquida todas las deudas (abonos)
2. Usa todo el saldo a favor (ventas)
3. Verifica que no tenga ventas recientes
4. Intenta eliminar nuevamente

---

## Paginación

### Navegar Entre Páginas

**Botones:**
- **◀ Anterior** - Va a la página previa
- **Siguiente ▶** - Va a la página siguiente

**Info Mostrada:**
- "Página X de Y"

**Items por Página:**
- Fijo: 10 clientes por página

---

## Casos de Uso Comunes

### Caso 1: Registrar Venta a Crédito
```
1. Cliente "Juan" compra $50 y no tiene efectivo
2. En POS: Selecciona Juan como cliente
3. Método de pago: Crédito
4. Finalizar venta
5. Deuda de Juan = $50
```

### Caso 2: Cliente Abona Parcialmente
```
1. Juan debe $50
2. Paga $20 en efectivo
3. Clientes → Juan → Wallet (Abono)
4. Monto: $20, Método: Efectivo USD
5. Nueva deuda de Juan = $30
```

### Caso 3: Cliente Paga de Más
```
1. Juan debe $10
2. Paga $15
3. Nueva deuda: $0
4. Saldo a favor: $5
5. Próxima compra de $20, paga solo $15
```

### Caso 4: Buscar Cliente por Teléfono
```
1. Campo búsqueda: "0424"
2. Aparecen todos los clientes con ese prefijo
3. Selecciona el correcto
```

---

## Preguntas Frecuentes

**Q: ¿Puedo tener clientes sin documento?**  
A: No, el documento es obligatorio para registrar.

**Q: ¿Los créditos tienen límite?**  
A: No hay límite por defecto. Debes controlarlo manualmente.

**Q: ¿Puedo vender a crédito sin registrar cliente primero?**  
A: No, debes crear el cliente antes de venderle.

**Q: ¿El saldo a favor expira?**  
A: No, permanece hasta que el cliente lo use.

**Q: ¿Puedo eliminar un abono registrado por error?**  
A: No directamente. Debes hacer un ajuste manual (venta negativa o nuevo abono inverso).

**Q: ¿Cómo sé cuánto debe un cliente en total?**  
A: En la tabla aparece el badge rojo con el monto total.

**Q: ¿Puedo exportar la lista de clientes?**  
A: Actualmente no hay exportación automática.

**Q: ¿Los clientes ven su propio historial?**  
A: No, es solo interno para el negocio.

---

## Troubleshooting

### Problema: No puedo eliminar un cliente
**Solución:**
- Verifica que no tenga deuda
- Verifica que no tenga saldo a favor
- Liquida todos los pendientes primero

### Problema: El cliente aparece duplicado
**Solución:**
- Verifica que no usaste documentos diferentes
- Si es duplicado real, transfiere las deudas manualmente
- Elimina el duplicado vacío

### Problema: La deuda no coincide con mis cálculos
**Solución:**
- Revisa el historial completo (ventas + abonos)
- Verifica ventas anuladas (no afectan deuda)
- Consulta reportes de auditoría

### Problema: No veo el botón de abono
**Solución:**
- Verifica que el cliente tenga deuda > $0
- Verifica permisos CLI_CREDITO
- Actualiza la página

---

## Permisos Requeridos

- **CLI_VER** - Ver clientes (todos los usuarios)
- **CLI_CREAR** - Crear nuevos clientes
- **CLI_EDITAR** - Editar información
- **CLI_ELIMINAR** - Eliminar clientes
- **CLI_CREDITO** - Gestionar créditos y abonos

---

## Mejores Prácticas

### Registro de Clientes
✅ Usa documentos completos (V-12345678, J-87654321)  
✅ Registra teléfono siempre (para contacto)  
✅ Verifica datos antes de guardar

### Gestión de Créditos
✅ Establece límites de crédito por cliente (mental)  
✅ Revisa deudores semanalmente  
✅ Registra abonos inmediatamente al recibirlos  
✅ Pide referencia en pagos digitales

### Control de Cartera
✅ Filtra "Deudores" cada lunes  
✅ Contacta clientes con deudas > 30 días  
✅ Ofrece descuentos por pronto pago  
✅ Documenta acuerdos de pago especiales

### Auditoría
✅ Revisa saldos a favor sospechosos  
✅ Verifica abonos sin referencia  
✅ Compara deuda total vs ventas a crédito  
✅ Exporta lista de deudores mensualmente

---

## Notas Técnicas

### Cálculo de Deuda
```javascript
deuda_actual = sum(ventas_credito) - sum(abonos)
```

### Saldo a Favor
```javascript
// Si abono > deuda
favor = abono - deuda
deuda = 0
```

### Búsqueda
- Insensible a mayúsculas
- Búsqueda parcial (contiene)
- Indexada para performance

### Paginación
- 10 items por página fijo
- Hooks de React para eficiencia
- Resetea a página 1 al cambiar filtros
