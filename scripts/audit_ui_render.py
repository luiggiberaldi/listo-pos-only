
# scripts/audit_ui_render.py
import json

def simulate_render_logic(pago_obj, tasa):
    """
    Simula la logica de renderizado de ModalAbono.jsx (Lineas 263-264)
    """
    print(f"--- RENDER SIMULATION [Tasa: {tasa}] ---")
    print("Objeto Pago:", json.dumps(pago_obj, indent=2))
    
    # LOGICA ACTUAL (Con Bug)
    # <span className="text-[10px] text-[#6366f1] font-bold">≈ ${p.monto.toFixed(2)}</span>
    
    amount_displayed = pago_obj["monto"]
    render_buggy = f"≈ ${amount_displayed:.2f}"
    
    # LOGICA ESPERADA (Fix propuestas)
    # Debemos usar montoUSD si existe, o calcularlo
    amount_real = pago_obj.get("montoUSD", pago_obj["monto"] / tasa) # Fallback logic
    render_fixed = f"≈ ${amount_real:.2f}"
    
    print(f"\n[ACTUAL - BUG] Render: {render_buggy}")
    print(f"[ESPERADO   ] Render: {render_fixed}")
    
    return render_buggy, render_fixed

# CASO DE PRUEBA: Abono de 5000 Bs (Tasa 200) -> $25
# Como quedo el objeto tras mi fix anterior:
pago_test = {
    "metodo": "Punto de Venta",
    "monto": 5000,       # Nominal (Bs)
    "montoUSD": 25,      # Normalizado ($)
    "ticker": "VES"
}

buggy, fixed = simulate_render_logic(pago_test, 200)

if buggy == "≈ $5000.00":
    print("\n✅ BUG REPRODUCIDO: El sistema muestra el monto en Bs como si fueran Dolares.")
else:
    print("\n❌ NO SE REPRODUJO: Revisa la logica.")
