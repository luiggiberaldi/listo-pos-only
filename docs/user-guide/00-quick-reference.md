# Guía de Referencia Rápida - Listo POS

## 🎯 Propósito
Documento de consulta rápida para usuarios del sistema Listo POS. Incluye shortcuts de teclado, soluciones a problemas comunes, FAQ global y glosario de términos.

---

## ⌨️ Atajos de Teclado (Shortcuts)

### POS - Punto de Venta

| Atajo | Acción | Contexto |
|-------|--------|----------|
| `Enter` | Agregar producto escaneado al carrito | Después de escanear código |
| `F9` | Finalizar venta (abrir modal de pago) | Con productos en carrito |
| `Esc` | Cancelar modal/acción actual | En modal de pago/producto |
| `Ctrl + B` | Buscar producto manualmente | Siempre en POS |
| `Ctrl + K` | Abrir búsqueda global (si está habilitada) | Cualquier pantalla |
| `/` (barra) | Focus en buscador de productos | En POS |

### Generales

| Atajo | Acción | Disponibilidad |
|-------|--------|----------------|
| `Ctrl + P` | Imprimir página actual | Navegador |
| `F11` | Pantalla completa (toggle) | Navegador/Electron |
| `Ctrl + +` | Aumentar zoom | Navegador |
| `Ctrl + -` | Reducir zoom | Navegador |
| `Ctrl + 0` | Resetear zoom 100% | Navegador |
| `Alt + ←` | Volver página anterior | Navegador |

### Modales y Formularios

| Atajo | Acción | Contexto |
|-------|--------|----------|
| `Enter` | Confirmar/Guardar | En formularios |
| `Esc` | Cancelar/Cerrar | En modales |
| `Tab` | Siguiente campo | En formularios |
| `Shift + Tab` | Campo anterior | En formularios |

---

## 🚀 Flujos Rápidos Comunes

### 1. Venta Rápida (30 segundos)
```
1. POS → Escanear código de barras
2. Enter (agregar al carrito)
3. F9 (finalizar venta)
4. Seleccionar método de pago
5. Enter (confirmar)
✅ Ticket impreso automáticamente
```

### 2. Cuadre de Caja (2 minutos)
```
1. Sidebar → Cerrar Caja
2. Verificar totales por método
3. Si hay diferencia: Ajustar en modal
4. Ingresar PIN
5. Confirmar cierre
✅ Turno cerrado, listo para nuevo día
```

### 3. Consulta Rápida de Stock
```
1. POS → Buscar producto (Ctrl + B)
2. Ver unidades disponibles
3. Si stock bajo: Inventario → Ajustar Stock
4. Tipo: "Entrada" → Cantidad → Guardar
✅ Inventario actualizado
```

### 4. Cobro de Deuda
```
1. Clientes → Buscar cliente
2. Ver saldo pendiente
3. Clic "Cobrar"
4. Monto a abonar → Método de pago
5. Confirmar
✅ Deuda reducida, recibo generado
```

---

## 🆘 Troubleshooting Rápido

### Problema: "No puedo agregar producto al carrito"

**Posibles causas:**
- ❌ Stock = 0 y "Vender sin Stock" está OFF
- ❌ Producto inactivo
- ❌ Precio = 0

**Solución rápida:**
1. Inventario → Buscar producto
2. Activar producto (si está inactivo)
3. Ajustar stock (Entrada)
4. Verificar precio > 0
5. Reintentar en POS

---

### Problema: "Error al imprimir ticket"

**Posibles causas:**
- ❌ Impresora desconectada
- ❌ Drivers no instalados
- ❌ Navegador bloqueó impresión

**Solución rápida:**
1. Verificar conexión USB/Bluetooth de impresora
2. Configuración → Diseño Ticket → Probar impresión
3. Si falla: Reimprimir desde Historial Ventas
4. Alternativa: Usar impresora PDF (generar archivo)

---

### Problema: "La tasa de cambio no actualiza"

**Posibles causas:**
- ❌ Sin conexión a internet
- ❌ BCV API no responde
- ❌ No tiene permiso

**Solución rápida:**
1. Configuración → Finanzas/Tasa
2. Verificar internet
3. Clic "Sincronizar con BCV"
4. Si persiste: Ingresar tasa manualmente
5. Guardar

---

### Problema: "Olvidé mi PIN"

**Solución:**
- **Si eres empleado:** Contacta al administrador para resetear tu PIN
- **Si eres admin:** No hay reset automático, debes recordarlo (medida de seguridad)

**Prevención:**
- Cambiar PIN a uno memorable pero seguro
- Documentar en lugar seguro (no digital)

---

### Problema: "Sistema lento al cargar"

**Causas comunes:**
- ❌ Base de datos saturada (> 80%)
- ❌ Demasiadas ventas históricas
- ❌ Navegador con muchas pestañas

**Solución:**
1. Configuración → Salud de Datos
2. Ver saturación
3. Si > 70%: Clic "Optimizar Base de Datos"
4. Días a conservar: 30
5. Confirmar limpieza
6. Reiniciar navegador

---

### Problema: "No aparece un cliente que registré"

**Verificar:**
1. Clientes → Buscar por nombre/cédula/teléfono
2. Revisar filtros (si están activos desactiva filtrar")
3. Si no aparece: Puede haberse eliminado
4. Solución: Registrar nuevamente

---

### Problema: "Ganancia Neta muestra '---'"

**Causa:**
- No tienes permiso `INV_VER_COSTOS`

**Solución:**
- Solicitar acceso al administrador
- O cambiar tu rol a GERENTE/ADMIN

---

## ❓ FAQ Global

### VENTAS

**Q: ¿Puedo anular una venta de hace 2 días?**  
A: Sí, desde Historial Ventas → Buscar venta → Anular (requiere permiso `VENTAS_ANULAR`).

**Q: ¿Se puede vender en dólares Y bolívares en la misma transacción?**  
A: Sí, el sistema permite pagos mixtos. Elige método $ y método Bs, calcula automáticamente.

**Q: ¿Qué pasa si cierro mal la caja?**  
A: El sistema mantiene historial. Contacta administrador para auditoría y ajuste manual si es necesario.

---

### INVENTARIO

**Q: ¿Cómo sé qué productos se están agotando?**  
A: Inventario → Ver lista → Buscar ícono ⚠️ (stock < mínimo).

**Q: ¿El Kardex afecta el stock real?**  
A: NO. Kardex es solo auditoría (lectura). Stock se modifica en "Ajustar Stock".

**Q: ¿Puedo importar productos desde Excel?**  
A: Actualmente no hay importador integrado. Debe registrarse manualmente o programar migración.

---

### CLIENTES

**Q: ¿Los clientes pueden tener más de una deuda?**  
A: Sí, cada venta a crédito genera una deuda independiente. El "Saldo Total" suma todas.

**Q: ¿Qué es el Monedero de Clientes?**  
A: Saldo a favor del cliente (vueltos no retirados). Puede usarlo en próxima compra.

**Q: ¿Cómo elimino un cliente?**  
A: Clientes → Editar → Eliminar. Solo si NO tiene deudas pendientes ni historial de compras.

---

### REPORTES

**Q: ¿Cuál es la diferencia entre Total Diario y Cierre de Caja?**  
A: **Total Diario** = Auditoría global (día/semana/mes). **Cierre Caja** = Cuadre de 1 turno específico.

**Q: ¿Los reportes incluyen ventas anuladas?**  
A: NO. Todas las estadísticas excluyen ventas anuladas automáticamente.

**Q: ¿Puedo exportar reportes a PDF?**  
A: Usa Ctrl+P (impresora PDF) o captura de pantalla. No hay exportador nativo aún.

---

### CONFIGURACIÓN

**Q: ¿Puedo cambiar el IVA de 16% a 19%?**  
A: Sí. Configuración → Finanzas/Tasa → IVA: cambiar %. Afecta solo ventas FUTURAS.

**Q: ¿Cómo agrego mi logo al ticket?**  
A: Configuración → Diseño Ticket → Subir imagen → Ajustar tamaño.

**Q: ¿Qué pasa si desactivo TODOS los métodos de pago?**  
A: Sistema no permite. Requiere al menos 1 método activo para poder cobrar.

---

### SEGURIDAD Y USUARIOS

**Q: ¿Cuántos usuarios puedo crear?**  
A: Ilimitados. Solo limitado por tu licencia si aplica.

**Q: ¿Puedo rastrear quién hizo una venta específica?**  
A: Sí. Historial Ventas → Ver detalles → "Vendedor: Juan Pérez".

**Q: ¿El rol CUSTOM es mejor que CAJERO?**  
A: No necesariamente. CUSTOM es un lienzo en blanco. CAJERO tiene permisos optimizados para caja.

---

### BACKUP Y DATOS

**Q: ¿Con qué frecuencia debo hacer backup?**  
A: **Crítico:** Diario (Firestore). **Secundario:** Semanal (Export JSON local).

**Q: ¿Qué datos incluye el backup en nube?**  
A: Ventas, productos, clientes, usuarios, configuración, métodos de pago. TODO.

**Q: ¿Puedo recuperar datos después de "Optimizar BD"?**  
A: Sí. El archivo JSON generado contiene las ventas archivadas. Guardar en lugar seguro.

---

## 📖 Glosario de Términos

### A

**Apertura de Caja**: Registro del fondo inicial al comenzar turno. Dinero semilla para vueltos.

**Arqueo**: Conteo físico del dinero en gaveta para cuadre con sistema.

**Atom (Átomo)**: Unidad de conocimiento en Ghost AI. Respuesta específica a consulta.

---

### B

**Base Imponible**: Precio SIN impuestos (IVA/IGTF). Base para calcular rentabilidad.

**BCV**: Banco Central de Venezuela. Fuente oficial de tasa de cambio USD/VES.

---

### C

**Cierre de Caja**: Finalización de turno con cuadre de efectivo vs sistema.

**Corte Z**: Reporte fiscal diario de ventas totales. Sinónimo de Total Diario.

**Crédito**: Venta sin pago inmediato. Cliente debe pagar después (deuda).

**CRUD**: Create, Read, Update, Delete. Operaciones básicas de gestión de datos.

---

### D

**Dashboard**: Pantalla principal con KPIs y resumen operativo.

**Deuda**: Monto pendiente de pago por cliente con venta a crédito.

---

### E

**Efectivo Bs**: Dinero en bolívares en formato físico (billetes/monedas).

**Efectivo $**: Dinero en dólares en formato físico (billetes).

---

### F

**Fondo de Apertura**: Capital inicial para dar vueltos. Se suma al total de caja al cerrar.

**Firestore**: Base de datos en nube de Google. Usado para backup maestro.

---

### G

**Ganancia Neta**: Utilidad después de costos e impuestos. Métrica clave de rentabilidad.

**Gaveta**: Cajón físico donde se guarda dinero (efectivo).

**Ghost AI**: Asistente inteligente del sistema. Responde consultas de usuarios.

---

### H

**Historial**: Registro cronológico de ventas realizadas. Permite auditoría y análisis.

---

### I

**IGTF**: Impuesto a Grandes Transacciones Financieras. 3% sobre pagos en divisas (Venezuela).

**Ingreso Neto**: Ventas brutas menos impuestos. Dinero real del negocio.

**IVA**: Impuesto al Valor Agregado. Porcentaje sobre productos gravados (16% Venezuela).

**IndexedDB**: Base de datos local del navegador. Almacenamiento offline.

---

### J

*No hay términos relevantes*

---

### K

**Kardex**: Registro histórico de movimientos de inventario (entradas/salidas) por producto.

**KPI**: Key Performance Indicator. Métrica clave de desempeño (ventas, ganancias, etc.).

---

### L

**Listo GO**: Companion app móvil para monitoreo remoto del POS.

---

### M

**Margen**: Porcentaje de ganancia sobre ingreso neto. Fórmula: (Ganancia/Ingreso) × 100.

**Método de Pago**: Forma de cobro aceptada (Efectivo, Zelle, Pago Móvil, etc.).

**Monedero**: Saldo a favor del cliente (vueltos no retirados). Dinero virtual del cliente.

---

### N

**Negativo (Stock)**: Inventario con cantidad < 0. Permitido si "Vender sin Stock" está ON.

---

### O

**Offline**: Sin conexión a internet. Sistema funciona localmente con limitaciones.

---

### P

**Pago Mixto**: Transacción con 2+ métodos de pago (ej: $50 + Bs 100).

**Pasivo**: Obligación financiera. En POS: dinero en gaveta que NO es del negocio (monedero clientes).

**Patrimonio Consolidado**: Total en caja expresado en una sola moneda (USD o BS).

**PIN**: Código numérico de seguridad para acciones sensibles (4-6 dígitos).

**POS**: Point of Sale. Punto de Venta. Módulo principal de facturación.

**Preventa**: Venta registrada antes de recibir mercancía. Requiere "Vender sin Stock" ON.

---

### Q

*No hay términos relevantes*

---

### R

**RBAC**: Role-Based Access Control. Sistema de permisos por roles.

**Reimprimir**: Generar ticket nuevamente de venta existente.

**Rol**: Conjunto de permisos asignados a usuario (ADMIN, GERENTE, CAJERO, etc.).

---

### S

**Stock**: Cantidad disponible de producto en inventario.

**Stock Mínimo**: Umbral de alerta. Sistema avisa cuando stock < mínimo.

**Sync**: Sincronización. Envío de datos local a nube o viceversa.

---

### T

**Tasa de Cambio**: Relación de conversión USD ↔ BS. Ejemplo: 1 USD = 50 BS.

**Tesorería**: Gestión de fondos. Monitor de dinero en caja.

**Ticket**: Recibo impreso de venta. Comprobante para cliente.

**Turno**: Período de trabajo de un cajero. Desde apertura hasta cierre de caja.

---

### U

**USD**: Dólar estadounidense. Moneda extranjera aceptada.

---

### V

**Venta Bruta**: Total facturado incluyendo impuestos. Ingreso aparente.

**Venta Neta**: Ingreso después de restar impuestos. Base real.

**VES (Bs)**: Bolívar venezolano. Moneda local.

**Vuelto**: Diferencia entre pago del cliente y total de venta. Cambio devuelto.

---

### W

**Wallet**: Ver "Monedero". Saldo virtual del cliente.

---

### X-Z

**Zoom**: Amplificación de interfaz. Ajustable 80%-150% en apariencia.

---

## 🔢 Fórmulas Clave

### Financieras

```javascript
// Ventas Brutas
ventasBrutas = Σ(venta.total)

// Ingreso Neto
ingresoNeto = ventasBrutas - (IVA + IGTF)

// Ganancia Neta
gananciaNeta = ingresoNeto - costosMercancía

// Margen %
margen = (gananciaNeta / ingresoNeto) × 100
```

### Inventario

```javascript
// Valor Total de Inventario
valorInventario = Σ(producto.stock × producto.precio)

// Costo de Reposición
costoReposicion = Σ(producto.stock × producto.costo)
```

### Impuestos

```javascript
// IVA (16%)
baseImponible = precio / 1.16
iva = precio - baseImponible

// IGTF (3%)
igtf = subtotal × 0.03
totalConIGTF = subtotal + igtf
```

---

## 🎨 Iconografía del Sistema

| Ícono | Significado |
|-------|-------------|
| 🟢 | Activo / Éxito / Saludable |
| 🔴 | Inactivo / Error / Crítico |
| 🟡 | Advertencia / Precaución |
| ⚠️ | Stock bajo / Atención requerida |
| 🔒 | Bloqueado / Requiere permisos |
| ✅ | Completado / Verificado |
| ❌ | Rechazado / Cancelado |
| 📊 | Reportes / Estadísticas |
| 💰 | Finanzas / Dinero |
| 📦 | Inventario / Productos |
| 👥 | Clientes / Usuarios |
| ⚙️ | Configuración |
| 🔄 | Sincronizando / Actualizando |
| ⏸️ | Pausado |

---

## 📞 Soporte y Ayuda

### Ghost AI (Asistente Integrado)
**Ubicación:** Ícono chat (esquina inferior derecha)  
**Uso:** Pregunta en lenguaje natural  
**Ejemplos:**
- "¿Cómo anulo una venta?"
- "¿Por qué no puedo cerrar la caja?"
- "Explícame el IGTF"

**Respuesta:** Instantánea basada en contexto del sistema

---

### Documentación Completa
**Ubicación:** `docs/user-guide/` (este directorio)  
**Módulos:**
1. Login Screen
2. Dashboard
3. POS Page
4. Cierre de Caja
5. Historial Ventas
6. Clientes
7. Reportes/Estadísticas
8. Inventario/Kardex
9-11. Configuración (3 partes)
12. Total Diario (Corte Z)

---

### Contacto Técnico
- **Desarrollador:** [Tu contacto]
- **Soporte:** [Email/Teléfono]
- **Repo GitHub:** [Si aplica]

---

## ✨ Tips y Trucos

### Productividad

💡 **Usa el buscador del navegador (Ctrl+F)** en reportes para encontrar ventas específicas  
💡 **Modo Pantalla Completa (F11)** para enfoque total en POS  
💡 **Configura Zoom nivel adecuado** (Config → Apariencia) según distancia de pantalla  
💡 **Activa Modo Táctil** si usas tablet/touchscreen (botones más grandes)  
💡 **Piloto Automático ON** en Salud de Datos para limpieza automática

### Seguridad

🔐 **Cambia PINs cada 60-90 días**  
🔐 **No compartas tu PIN** con otros usuarios  
🔐 **Backup en nube DIARIO** para negocios críticos  
🔐 **Verifica permisos** antes de asignar rol CUSTOM

### Precisión Fiscal

📋 **Sincroniza tasa BCV diariamente** (Venezuela)  
📋 **Verifica IVA/IGTF** antes de cierre mensual  
📋 **Revisa Total Diario** al final de jornada  
📋 **Exporta reportes mensuales** para contabilidad

---

## 📄 Actualizaciones de Esta Guía

**Versión 1.0** - Febrero 2026  
- Versión inicial con 12 módulos documentados
- 110 átomos de conocimiento activos
- Cobertura completa de funcionalidades core

---

**🎯 Esta guía se actualiza continuamente con nuevas funcionalidades y mejoras**

---

*Documento creado para facilitar la adopción y uso eficiente de Listo POS*
