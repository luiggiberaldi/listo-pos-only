
# scripts/audit_dashboard_logic.py
import json

def audit_dashboard_logic():
    print("--- AUDITORIA DASHBOARD ---")
    
    # 1. Simular Datos (Escenario: Venta Credito Hoy + Abono Hoy)
    ventas = [
        {
            "id": "venta_1",
            "tipo": "VENTA",
            "status": "COMPLETADA",
            "total": 29.00,
            "esCredito": True,
            "deudaPendiente": 4.00, # Pago parcial? No, el abono es separate
            # En V4, si hay abono separado, la venta original mantiene su forma?
            # Si el abono redujo la deuda, deudaPendiente en la venta original se actualiza?
            # Si, pero aqui simulamos el array de ventas FLAT.
        },
        {
            "id": "abono_1",
            "tipo": "COBRO_DEUDA",
            "status": "COMPLETADA",
            "total": 25.00, # USD
            "pagos": [
                { "metodo": "Punto de Venta", "amount": 25.00, "currency": "USD" } 
                # Simplificado, el engine normaliza
            ]
        }
    ]
    
    # 2. Logic: isValidSale (KPIs)
    # Excludes COBRO_DEUDA
    kpi_sales = [v for v in ventas if v["tipo"] != 'COBRO_DEUDA']
    total_sales = sum(v["total"] for v in kpi_sales)
    
    # 3. Logic: agruparPorMetodo (Pie Chart)
    # Includes COBRO_DEUDA (isValidCashFlow)
    # Logic actual:
    map_metodos = {"Crédito": 0, "Punto de Venta": 0}
    
    for v in ventas:
        if v["tipo"] == 'VENTA' and v.get("esCredito"):
            map_metodos["Crédito"] += v["total"]
        
        elif v["tipo"] == 'COBRO_DEUDA':
            # Suma el pago
            map_metodos["Punto de Venta"] += v["total"]
            
            # MISSING LOGIC: Subtract from Credit?
    
    total_pie = sum(map_metodos.values())
    
    print(f"Total Sales (Centro Dashboard): ${total_sales:.2f}")
    print(f"Total Arqueo (Pie Chart):     ${total_pie:.2f}")
    print(f"  - Crédito: ${map_metodos['Crédito']:.2f}")
    print(f"  - Punto:   ${map_metodos['Punto de Venta']:.2f}")
    
    if total_pie > total_sales:
        print("\n⚠️  DOUBLE COUNTING DETECTADO: El Pie Chart suma Credito + Abono ($54 vs $29)")
        print("   Solución: Restar el Abono de la columna 'Crédito'.")
        
        # Simular Fix
        map_fixed = map_metodos.copy()
        # Abono fue 25. Restamos 25 de credito
        map_fixed["Crédito"] -= 25.00
        total_fixed = sum(map_fixed.values())
        
        print("\n--- CON FIX ---")
        print(f"Total Arqueo: ${total_fixed:.2f}")
        print(f"  - Crédito: ${map_fixed['Crédito']:.2f}")
        print(f"  - Punto:   ${map_fixed['Punto de Venta']:.2f}")
        
        if total_fixed == total_sales:
            print("✅ MATCH: El Pie Chart ahora coincide con la Venta Neta.")
            return True
            
    return False

audit_dashboard_logic()
