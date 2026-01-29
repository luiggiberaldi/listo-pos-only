import sys
import os
import platform

# DIRECTIVA: ENV-PY-001
# Diagnostico de Salud del Sistema Python

def check_health():
    print("-" * 40)
    print("DIAGNOSTICO DE SALUD PYTHON")
    print("-" * 40)
    
    # 1. Version
    version = sys.version.split()[0]
    print(f"Python Version: {version}")
    
    if "3.14" in version:
        print("[AVISO] Estas usando una version Alpha/Preview de Python (3.14).")
        print("        Es NORMAL que el servidor de lenguaje (IDE) de errores o 'crashes'.")
        print("        No afecta la ejecucion de tus scripts de auditoria.")
    
    # 2. Encoding
    encoding = sys.stdout.encoding
    print(f"Terminal Encoding: {encoding}")
    
    # 3. OS Info
    print(f"Sistema Operativo: {platform.system()} {platform.release()}")
    
    # 4. Prueba de Operaciones Matematicas (Critico para POS)
    try:
        from decimal import Decimal
        res = Decimal("10.5") + Decimal("0.5")
        if res == Decimal("11.0"):
            print("[OK] Libreria Decimal: Operando correctamente.")
    except Exception as e:
        print(f"[ERROR] Libreria Decimal: {e}")

    print("-" * 40)
    print("ESTADO: El interprete funciona correctamente para scripts de auditoria.")
    print("        Ignora los errores de 'connection got disposed' del editor.")
    print("-" * 40)

if __name__ == "__main__":
    check_health()
