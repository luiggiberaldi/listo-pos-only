# Dashboard - User Guide

## Purpose
The Dashboard is the main control center of Listo POS, showing real-time financial stats, alerts, and quick access to all system features.

## How to Access
- Automatically displayed after login
- Click "Dashboard" in sidebar menu

---

## Quick Overview

The Dashboard shows 4 main sections:

1. **Financial Stats** (Top cards)
   - Sales revenue
   - Cash flow
   - Treasury balance
   - Inventory value

2. **Quick Actions** (Shortcut buttons)
   - Open POS
   - View Inventory
   - Manage Clients
   - View Reports

3. **Alerts** (Side panel)
   - Low stock items (⚠️ orange)
   - Out of stock items (🔴 red)
   - Expiring products (📅 yellow)

4. **Exchange Rate** (Top-right)
   - Current rate selector
   - USD/EUR/Manual options

---

## How to Use

### Viewing Sales Data

**Time Range Selector:**
- **Hoy** - Today's sales
- **Semana** - Current week (Mon-Sun)
- **Mes** - Current month
- **Personalizado** - Custom date range

**To change range:**
1. Click the time selector (default: "Hoy")
2. Select your preferred range
3. For custom: pick start/end dates

### Quick Actions

**Open POS:**
- Click "POS" card or use sidebar
- Only if cash register is open

**View Inventory:**
- Click "Inventario" card
- See all products and stock levels

**Manage Clients:**
- Click "Clientes" card
- View customer database

**View Reports:**
- Click "Reportes" card
- Access financial reports

### Exchange Rate Management

**USD (Dólar):**
- Click "USD" button
- Fetches BCV official rate automatically
- Requires internet

**EUR (Euro):**
- Click "EUR" button
- Fetches BCV euro rate
- Requires internet

**Manual:**
- Click "Manual" button
- Enter custom rate value
- Use for alternative sources

---

## Understanding Stats

### Total Vendido (Sales)
- Revenue from completed sales
- Shown in USD
- Updates in real-time

### Flujo de Caja (Cash Flow)
- Net cash movement
- Includes sales and expenses
- Positive = profit, Negative = loss

### Tesorería (Treasury)
- Available cash balance
- Cash + Digital payments
- USD + VES converted

### Inventario (Inventory Value)
- Total stock cost
- Potential sale value
- Expected profit margin

---

## Alerts Explained

### 🟠 Stock Crítico (Low Stock)
- Products below minimum threshold
- Restock recommended
- Click to view product details

### 🔴 Agotados (Out of Stock)
- Products with 0 units
- Cannot be sold
- Requires immediate restock

### 📅 Vencimiento Próximo (Expiring Soon)
- Products expiring within 30 days
- Applies to perishables only
- Organize sales/promotions

---

## Common Questions

**Q: ¿El Dashboard se actualiza automáticamente?**  
A: Sí, el Dashboard se actualiza en tiempo real cuando se completan ventas o se modifican productos.

**Q: ¿Por qué mi tesorería no coincide con las ventas?**  
A: La tesorería incluye el balance inicial de caja, gastos registrados, y métodos de pago mixtos (efectivo + digital).

**Q: ¿Cómo actualizo la tasa de cambio?**  
A: Haz clic en USD o EUR (si tienes internet) para obtener la tasa del BCV, o usa "Manual" para ingresar una tasa personalizada.

**Q: ¿Qué significa "Stock Mínimo"?**  
A: Es el nivel de inventario que activa la alerta de stock crítico. Se configura por producto.

**Q: ¿Puedo ver ventas de meses anteriores?**  
A: Sí, usa el selector "Personalizado" y elige el rango de fechas deseado.

---

## Troubleshooting

### Problema: Las stats muestran $0
**Solución:**
- Verifica que haya ventas completadas en el rango seleccionado
- Confirma que la caja esté abierta
- Revisa la fecha del sistema

### Problema: La tasa BCV no se actualiza
**Solución:**
- Verifica conexión a internet
- Intenta el botón Manual para usar tasa personalizada
- El BCV puede estar temporalmente inaccesible

### Problema: No veo alertas de stock
**Solución:**
- Verifica que los productos tengan "Stock Mínimo" configurado
- Revisa que haya productos con stock bajo/agotado
- Actualiza el inventario si es necesario

---

## Keyboard Shortcuts

None (Dashboard is mouse/touch focused)

---

## Permissions Required

- **View Dashboard:** Standard access (all users)
- **Financial Details:** Requires `REP_VER_DASHBOARD` permission
- **Manage Exchange Rate:** Admin/Owner only
