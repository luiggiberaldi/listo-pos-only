import shutil
import os
import sys

# Configuration
SOURCE_ICON = r"C:\Users\luigg\Desktop\LISTO POS SENCILLO\dist\POS (6).ico"
DESTINATIONS = [
    r"C:\Users\luigg\Desktop\LISTO POS SENCILLO\public\ICONO.ico",
    r"C:\Users\luigg\Desktop\LISTO POS SENCILLO\build\ico.ico"
]

def update_icons():
    print("🚀 Iniciando actualización de iconos...")
    
    # 1. Validation
    if not os.path.exists(SOURCE_ICON):
        print(f"❌ Error: Archivo fuente no encontrado: {SOURCE_ICON}")
        sys.exit(1)
        
    print(f"✅ Fuente encontrada: {SOURCE_ICON}")

    # 2. Execution
    success_count = 0
    for dest in DESTINATIONS:
        try:
            dest_dir = os.path.dirname(dest)
            if not os.path.exists(dest_dir):
                os.makedirs(dest_dir)
                print(f"📂 Creando directorio: {dest_dir}")
            
            # Backup optional (simple implementation for now just overwrites)
            shutil.copy2(SOURCE_ICON, dest)
            print(f"✅ Icono actualizado en: {dest}")
            success_count += 1
        except Exception as e:
            print(f"❌ Error al copiar a {dest}: {e}")

    if success_count == len(DESTINATIONS):
        print("✨ Todos los iconos actualizados correctamente.")
    else:
        print("⚠️ Hubo advertencias durante la actualización.")

if __name__ == "__main__":
    update_icons()
