import os
import subprocess
import json

def check_ready():
    base_path = r"c:\Users\luigg\Desktop\LISTO POS SENCILLO\listo-master"
    root_path = r"c:\Users\luigg\Desktop\LISTO POS SENCILLO"
    
    print(f"--- Diagnóstico de Build: {base_path} ---\n")
    
    # 1. Verificar package.json
    pkg_path = os.path.join(base_path, "package.json")
    if not os.path.exists(pkg_path):
        print("[FAIL] package.json no encontrado.")
        return
    
    with open(pkg_path, 'r') as f:
        pkg = json.load(f)
    
    print(f"[OK] package.json cargado. Versión: {pkg.get('version')}")
    
    # 2. Verificar scripts
    scripts = pkg.get('scripts', {})
    if 'dist' in scripts:
        print("[OK] Script 'dist' presente.")
    else:
        print("[WARN] Script 'dist' NO presente (común en este proyecto usar 'electron:build').")
    
    if 'electron:build' in scripts:
        print("[OK] Script 'electron:build' presente.")
    else:
        print("[FAIL] Script 'electron:build' NO presente.")
    
    # 3. Verificar Icono
    build_config = pkg.get('build', {})
    win_config = build_config.get('win', {})
    icon_path_rel = win_config.get('icon')
    
    if icon_path_rel:
        icon_path_abs = os.path.join(base_path, icon_path_rel.replace('/', os.sep))
        if os.path.exists(icon_path_abs):
            print(f"[OK] Icono encontrado en: {icon_path_rel}")
        else:
            print(f"[FAIL] Icono NO encontrado en: {icon_path_rel}")
            # Buscar alternativa
            alt_icon = os.path.join(root_path, "build", "ico.ico")
            if os.path.exists(alt_icon):
                print(f"      -> Sugerencia: Copiar {alt_icon} a {icon_path_abs}")
    else:
        print("[WARN] No se ha configurado ruta de icono en win config.")

    # 4. Verificar node_modules
    nm_path = os.path.join(base_path, "node_modules")
    if os.path.exists(nm_path):
        print("[OK] node_modules existe.")
    else:
        print("[FAIL] node_modules NO encontrado. Requiere npm install.")

    # 5. Verificar Electron entry point
    main_file = pkg.get('main')
    if main_file:
        main_path = os.path.join(base_path, main_file.replace('/', os.sep))
        if os.path.exists(main_path):
            print(f"[OK] Entry point de Electron encontrado: {main_file}")
        else:
            print(f"[FAIL] Entry point de Electron NO encontrado: {main_file}")

    print("\n--- Fin del Diagnóstico ---")

if __name__ == "__main__":
    check_ready()
