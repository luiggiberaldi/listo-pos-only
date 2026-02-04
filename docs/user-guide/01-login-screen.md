# Login Screen - User Guide

## Purpose
The Login Screen is the entry point to Listo POS. It allows users to authenticate using their personal profile and PIN code.

## Visual Design
- **Netflix-style interface** with profile cards
- **3D card effects** on hover
- **Keyboard shortcuts** for quick access
- **Suggestions button** for feedback

## How to Access
- Automatically displayed when opening Listo POS
- Shown after logging out

---

## Step-by-Step Login Guide

### Method 1: Mouse/Touch

1. **Select Your Profile**
   - Click on your user card
   - Your card will expand and highlight

2. **Enter Your PIN**
   - A PIN pad will appear
   - Click the numbers to enter your 6-digit PIN
   - Click the green arrow button (→) or press Enter

3. **Access Granted**
   - If correct, you'll enter the Dashboard
   - If incorrect, the PIN pad will shake and clear

### Method 2: Keyboard Shortcuts

1. **Quick Profile Selection**
   - Press number keys 1-9 to select the corresponding profile
   - Example: Press `1` to select the first user

2. **Enter PIN**
   - Type your 6-digit PIN directly
   - Press `Enter` to submit

3. **Cancel**
   - Press `Escape` to go back to profile selection

---

## Key Features

### Profile Cards
- **Color-coded avatars** - Each user has a unique gradient color
- **Role badges** - Shows user permission level (Owner, Admin, Vendor)
- **Active indicator** - Only active users are shown

### PIN Security
- **6 digits required** - Exactly 6 numbers
- **Hidden input** - PIN is masked for privacy
- **Auto-submit** - Submits automatically when 6 digits are entered

### Keyboard Navigation
- **Numeric shortcuts** - Press 1-9 to select users
- **Enter** - Submit PIN
- **Escape** - Cancel/Go back
- **Backspace** - Delete last digit

### Suggestions Button
- Located in bottom-right corner
- Send feedback or suggestions to development team
- Requires internet connection

---

## Common Questions

**Q: ¿Olvidé mi PIN, qué hago?**  
A: Solo el Propietario o un Administrador puede restablecer PINs. Contacta a tu administrador. Si eres el Propietario y olvidaste tu PIN, consulta la documentación de recuperación de acceso.

**Q: ¿Puedo cambiar mi perfil después de seleccionarlo?**  
A: Sí, presiona `Escape` o haz clic en el botón "Cancelar" (X) para volver a la selección de perfiles.

**Q: ¿Por qué no veo todos los usuarios?**  
A: Solo se muestran usuarios activos. Los usuarios desactivados no aparecen en la pantalla de login.

**Q: ¿Qué pasa si ingreso el PIN incorrecto?**  
A: El sistema mostrará un error visual (shake animation) y limpiará el campo para que intentes de nuevo. No hay límite de intentos.

**Q: ¿Cómo envío una sugerencia?**  
A: Haz clic en el botón "Sugerencias" en la esquina inferior derecha, completa el formulario con título y mensaje, y presiona "Enviar". Requiere conexión a internet.

---

## Troubleshooting

### Problema: El PIN no se acepta
**Solución:**
- Verifica que estés usando exactamente 6 dígitos
- Asegúrate de estar seleccionando el usuario correcto
- Contacta a un administrador para verificar/restablecer tu PIN

### Problema: No veo mi usuario
**Solución:**
- Verifica que tu cuenta esté activa
- Consulta con un administrador
- Si eres el único usuario, verifica la configuración en la base de datos

### Problema: El botón de Sugerencias no funciona
**Solución:**
- Verifica tu conexión a internet
- Asegúrate de completar tanto el título como el mensaje
- Espera unos segundos y reinténtalo

---

## Technical Details

### Keyboard Shortcuts Summary
| Key | Action |
|-----|--------|
| 1-9 | Select user by position |
| 0-9 | Enter PIN digit |
| Enter | Submit PIN |
| Escape | Cancel/Go back |
| Backspace | Delete last digit |

### Security Features
- PIN is hashed before storage
- No PIN length enforcement during entry (but validation requires 6)
- Session timeout after inactivity
- No brute-force protection (consider adding)

### Role Indicators
- 👑 **Owner** - Full system access
- 🛡️ **Admin** - Administrative privileges
- 💼 **Vendor** - Standard user access
