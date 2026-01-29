
# scripts/audit_abono_logic.py
import json

def simulate_abono_logic(input_monto, tasa, currency_code, method_name):
    """
    Simula la logica exacta de ModalAbono.jsx y useSalesProcessor.js
    """
    print(f"--- SIMULACION: Input={input_monto} {currency_code} | Tasa={tasa} ---")

    # --- 1. Lógica ModalAbono.jsx ---
    val = float(input_monto)
    monto_usd = val / tasa if currency_code == 'VES' else val
    
    # NUEVO CODIGO (Fix aplicado)
    nuevo_pago = {
        "id": "simulated_id",
        "metodo": method_name,
        "monto": val,               # Nominal
        "montoUSD": monto_usd,      # Normalizado
        "ticker": currency_code,
        "currency": currency_code
    }
    
    print("\n[ModalAbono] Objeto Pago Generado:")
    print(json.dumps(nuevo_pago, indent=2))
    
    # --- 2. Lógica useSalesProcessor.js (registrarAbono) ---
    # Normalización de Pagos (Schema V4)
    # const pagosProcesados = metodosPago.map(p => { ... })
    
    p = nuevo_pago
    amount = float(p.get("monto", 0)) # Line 373: parseFloat(p.monto || 0)
    
    pago_procesado = {
        "id": "new_uuid",
        "method": p["metodo"],
        "amount": amount,           # <--- FIELD OF INTEREST
        "monto": amount,
        "currency": p["currency"]
    }
    
    print("\n[useSalesProcessor] Pago Procesado (Saved to DB):")
    print(json.dumps(pago_procesado, indent=2))
    
    # --- 3. Lógica SalesHistoryPage.jsx (Render) ---
    render_currency = 'Bs' if pago_procesado["currency"] == 'VES' else '$'
    render_amount = pago_procesado["amount"]
    
    print(f"\n[SalesHistoryPage] Renderizado Final: {render_currency} {render_amount:,.2f}")
    
    return render_amount

# Ejecutar Test Case del Usuario
# Venta de 5000 Bs a tasa 200
result = simulate_abono_logic(5000, 200, 'VES', 'Punto de Venta')

if result == 5000:
    print("\n✅ PASÓ: El sistema mostrará 'Bs 5,000.00'")
elif result == 25:
    print("\n❌ FALLÓ: El sistema mostrará 'Bs 25.00' (Bug persistente)")
else:
    print(f"\n⚠️ RESULTADO INESPERADO: {result}")
