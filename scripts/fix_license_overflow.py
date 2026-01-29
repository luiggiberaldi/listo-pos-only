import os
import re

# Constantes definidas en la Directiva
FILE_PATH = r"c:\Users\luigg\Desktop\LISTO POS SENCILLO\src\components\security\LicenseGate.jsx"
DIRECTIVE_ID = "2026-01-22-LICENSE-OVERFLOW"

def fix_license_overflow():
    print(f"[{DIRECTIVE_ID}] Iniciando script de reparación...")
    
    if not os.path.exists(FILE_PATH):
        print(f"Error: El archivo {FILE_PATH} no existe.")
        return

    try:
        with open(FILE_PATH, 'r', encoding='utf-8') as f:
            content = f.read()

        # Patrón original para buscar el span del machineId
        # Buscamos la etiqueta span que contiene el machineId y sus clases
        # El contenido original tiene: className="font-mono text-2xl font-bold text-yellow-500 tracking-wider select-all"
        
        # Usamos regex para ser un poco flexibles con espacios, pero estrictos con las clases clave
        pattern = r'(className="[^"]*select-all)"'
        
        # Verificamos si ya tiene break-all para no duplicar
        if "break-all" in content and "text-yellow-500" in content: # Verificación simple contextual
             # Una verificación más precisa sería ver si el span específico ya lo tiene
             pass

        # Realizamos el reemplazo. 
        # Buscamos exactamente la cadena de clases conocida o una parte significativa unica
        target_string = 'className="font-mono text-2xl font-bold text-yellow-500 tracking-wider select-all"'
        replacement_string = 'className="font-mono text-2xl font-bold text-yellow-500 tracking-wider select-all break-all"'
        
        if target_string in content:
            new_content = content.replace(target_string, replacement_string)
            
            with open(FILE_PATH, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            print(f"[{DIRECTIVE_ID}] Éxito: Se ha aplicado 'break-all' al componente LicenseGate.")
        else:
            # Fallback con regex si el string exacto no coincide por espacios o formato
            print(f"[{DIRECTIVE_ID}] Advertencia: No se encontró la cadena exacta. Intentando búsqueda flexible...")
            
            # Buscamos un span que tenga select-all y text-yellow-500
            regex_pattern = r'(className="[^"]*text-yellow-500[^"]*select-all)([^"]*")'
            
            if re.search(regex_pattern, content):
                 new_content = re.sub(regex_pattern, r'\1 break-all\2', content)
                 with open(FILE_PATH, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                 print(f"[{DIRECTIVE_ID}] Éxito: Se ha aplicado 'break-all' usando Regex.")
            else:
                 print(f"[{DIRECTIVE_ID}] Error: No se pudo localizar el elemento objetivo en el archivo.")

    except Exception as e:
        print(f"[{DIRECTIVE_ID}] Excepción crítica: {str(e)}")

if __name__ == "__main__":
    fix_license_overflow()
