import json
from decimal import Decimal

# DIRECTIVA: TEST-FIN-001
# Script de Regresión para Lógica de Tesorería

def d(val):
    return Decimal(str(val)) if val is not None else Decimal(0)

class TreasuryEngine:
    def __init__(self):
        self.recaudado = d(0)
        self.ventas_brutas = d(0)
        self.breakdown = {}

    def procesar_transaccion(self, tx):
        tipo = tx.get('tipo', 'VENTA')
        status = tx.get('status', 'COMPLETADA')
        corte_id = tx.get('corteId') # Puede ser None (válido) o ID
        
        # FILTRO 1: Validez General (Espejo de CierrePage + treasuryEngine)
        if status == 'ANULADA': 
            return # Ignorar anuladas
        
        # IMPORTANTE: La UI filtra por 'corteId'. 
        # Si corteId tiene valor (y no es el actual que estamos cerrando), se ignora.
        # Aquí asumimos que estamos auditando una sesión abierta, así que corteId debe ser None/Undefined.
        if corte_id:
            # Si tiene corteId, ya fue cerrada.
            return

        total = d(tx.get('total', 0))
        es_credito = tx.get('esCredito', False)
        deuda = d(tx.get('deudaPendiente', 0))

        # --- LÓGICA DE VENTAS BRUTAS (FISCAL) ---
        # Solo sumamos si es una Venta real (no un Cobro de Deuda)
        if tipo != 'COBRO_DEUDA':
            self.ventas_brutas += total

        # --- LÓGICA DE RECAUDADO (CAJA) ---
        
        # CASO 1: COBRO DE DEUDA (Abono independiente)
        if tipo == 'COBRO_DEUDA':
            self.recaudado += total
            self._add_breakdown('Abonos (Deuda)', total)
            return

        # CASO 2: VENTA A CRÉDITO (Total o Parcial)
        if es_credito:
            # Lógica corregida 20/01/26: Priorizar 'Pagado Real' sobre flag de crédito
            pagado_implicito = total - deuda
            
            if pagado_implicito > d('0.01'):
                self.recaudado += pagado_implicito
                self._add_breakdown('Efectivo (Implícito)', pagado_implicito)
            
            # El resto es crédito (no entra a caja)
            return

        # CASO 3: VENTA CONTADO (Standard)
        # Aquí idealmente sumaríamos los pagos explícitos, pero el fallback es 'Total'
        # Si hay pagos, usarlos (TODO: Expandir lógica si es necesario)
        self.recaudado += total
        self._add_breakdown('Efectivo (Venta)', total)

    def _add_breakdown(self, key, amount):
        if key not in self.breakdown:
            self.breakdown[key] = d(0)
        self.breakdown[key] += amount

    def reporte(self):
        return {
            "recaudado": float(self.recaudado),
            "ventas_brutas": float(self.ventas_brutas),
            "detalles": {k: float(v) for k, v in self.breakdown.items()}
        }

# --- EJECUCIÓN DE PRUEBAS ---

def run_tests():
    engine = TreasuryEngine()
    
    scenarios = [
        # 1. Venta Contado ($20)
        {"id": 1, "total": 20, "esCredito": False, "corteId": None},
        
        # 2. Venta Crédito Total ($50) -> Recaudado 0
        {"id": 2, "total": 50, "esCredito": True, "deudaPendiente": 50, "corteId": None},
        
        # 3. Venta Mixta ($100, paga $60) -> Recaudado $60
        {"id": 3, "total": 100, "esCredito": True, "deudaPendiente": 40, "corteId": None},
        
        # 4. Abono de Deuda ($10) - El caso de hoy
        {"id": 4, "total": 10, "tipo": 'COBRO_DEUDA', "corteId": None}, 
        # NOTA: En la DB real, este campo corteId solía faltar (undefined). 
        # Python .get('corteId') devuelve None si falta, lo cual es correcto para nuestra simulación "FIXED".
        
        # 5. Venta ya cerrada (Ignorar)
        {"id": 5, "total": 500, "corteId": 999} 
    ]

    print("Ejecutando batería de pruebas...")
    for tx in scenarios:
        engine.procesar_transaccion(tx)

    res = engine.reporte()
    
    # VALIDACIONES (ASSERTIONS)
    
    # Recaudado Esperado: 
    # 20 (Caso 1) + 0 (Caso 2) + 60 (Caso 3) + 10 (Caso 4) = $90
    assert res['recaudado'] == 90.0, f"FALLO RECAUDADO: Esperado 90.0, Obtenido {res['recaudado']}"
    
    # Bruto Esperado:
    # 20 + 50 + 100 = $170 (El abono no suma a bruto, la venta cerrada tampoco)
    assert res['ventas_brutas'] == 170.0, f"FALLO BRUTO: Esperado 170.0, Obtenido {res['ventas_brutas']}"

    print("\n[OK] PRUEBAS EXITOSAS")
    print("-" * 20)
    print(f"Total Recaudado: ${res['recaudado']}")
    print(f"Ventas Brutas:   ${res['ventas_brutas']}")
    print("Desglose:", res['detalles'])

if __name__ == "__main__":
    try:
        run_tests()
    except AssertionError as e:
        print(f"\n[FAIL] ERROR CRITICO DE LOGICA: {e}")
        exit(1)
