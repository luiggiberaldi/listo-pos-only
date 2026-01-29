import os
import re
from pathlib import Path

def replace_in_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Specific replacements
        new_content = content
        new_content = new_content.replace('listo-pos', 'listo-pos')
        new_content = new_content.replace('com.listo.pos', 'com.listo.pos')
        new_content = new_content.replace('listo pos', 'listo pos')
        new_content = new_content.replace('Listo POS', 'Listo POS')
        new_content = new_content.replace('listo', 'listo')
        new_content = new_content.replace('Listo', 'Listo')
        
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Modificado: {file_path}")
            return True
    except Exception as e:
        print(f"Error procesando {file_path}: {e}")
    return False

def rename_file_or_dir(path):
    name = path.name
    new_name = name.replace('listo', 'listo').replace('Listo', 'Listo')
    if new_name != name:
        new_path = path.parent / new_name
        path.rename(new_path)
        print(f"Renombrado: {path} -> {new_path}")
        return new_path
    return path

def run_rename(root_dir):
    exclude_dirs = {'.git', 'node_modules', 'dist', 'dist-electron', 'build', '.tmp', 'respaldo'}
    
    # First, replace content in all files
    for root, dirs, files in os.walk(root_dir, topdown=True):
        # Remove excluded dirs to prevent recursion into them
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for file in files:
            file_path = Path(root) / file
            # Skip binary or large files if necessary
            if file_path.suffix.lower() in {'.exe', '.dll', '.so', '.jpg', '.png', '.ico', '.pdf', '.rar', '.zip'}:
                continue
            replace_in_file(file_path)

        # Then rename files and directories
        for name in files + dirs:
            path = Path(root) / name
            if name in exclude_dirs:
                continue
            rename_file_or_dir(path)

if __name__ == "__main__":
    # Get the project root
    project_root = Path(__file__).parent.parent.absolute()
    print(f"Iniciando renombramiento en: {project_root}")
    run_rename(project_root)
    print("Proceso completado.")
