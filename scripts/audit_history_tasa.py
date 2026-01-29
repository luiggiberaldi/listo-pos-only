
# scripts/audit_history_tasa.py
import json

def audit_history_logic():
    print("--- AUDITORIA LOGICA DE TASAS (HISTORIAL) ---")
    
    # Simular configuración actual (Tasa 200)
    config = {"tasa": 200}
    
    # Simular transacciones
    # Una venta vieja con tasa 100, y una nueva que usará la tasa de config
    movimientos = [
        {
            "id": "old_sale",
            "total": 29.00,
            "tasa": 100, # Tasa vieja
            "cargoReal": 29.00
        },
        {
            "id": "new_sale",
            "total": 10.00,
            "tasa": 200, # Tasa actual
            "cargoReal": 10.00
        }
    ]
    
    print(f"Tasa Actual Global: {config['tasa']}")
    print("\nProcesando Historial...")
    
    for mov in movimientos:
        # Lógica aplicada en ModalHistorialCliente.jsx:
        # (mov.cargoReal * (mov.tasa || tasa))
        tasa_uso = mov.get("tasa") or config["tasa"]
        total_bs = mov["cargoReal"] * tasa_uso
        
        print(f"ID: {mov['id']} | USD: ${mov['cargoReal']:.2f} | Tasa: {tasa_uso} | Total Bs: {total_bs:,.2f}")
        
        if mov['id'] == "old_sale":
            expected = 2900
            if total_bs == expected:
                print(f"  ✅ CORRECTO: Mantiene tasa histórica ({expected} Bs)")
            else:
                print(f"  ❌ ERROR: Debería ser {expected} Bs")

    # Resumen de Deuda Actual (Top KPI)
    # Lógica: (deuda_total * tasa_global)
    deuda_total = sum(m["cargoReal"] for m in movimientos)
    deuda_bs_actual = deuda_total * config["tasa"]
    
    print(f"\nResumen Superior (KPI):")
    print(f"Deuda Total USD: ${deuda_total:.2f}")
    print(f"Equivalencia Bs (Tasa {config['tasa']}): {deuda_bs_actual:,.2f} Bs")
    
    if deuda_bs_actual == 7800: # (29 + 10) * 200
        print("✅ CORRECTO: El resumen usa la tasa del mercado actual.")
    else:
        print("❌ ERROR en el resumen.")

audit_history_logic()
