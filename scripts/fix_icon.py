from PIL import Image
import os

input_path = r"C:/Users/luigg/Desktop/LISTO POS SENCILLO/listo-master/public/icon.ico"
output_path = r"C:/Users/luigg/Desktop/LISTO POS SENCILLO/listo-master/public/icon_fixed.ico"

print(f"Attempting to repair icon: {input_path}")

try:
    # Try opening. Pillow is good at detecting format even if extension is wrong.
    img = Image.open(input_path)
    print(f"Image opened. Format: {img.format}, Size: {img.size}, Mode: {img.mode}")

    # Ensure it's RGBA
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    # Standard Windows Icon Sizes
    icon_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    
    # Save as new clean ICO
    img.save(output_path, format='ICO', sizes=icon_sizes)
    print(f"Success! Fixed icon saved to: {output_path}")

    # Replace the original to keep config simple
    img.save(input_path, format='ICO', sizes=icon_sizes)
    print("Overwritten original file with fixed version.")

except Exception as e:
    print(f"Error repairing icon: {e}")
    # If it fails to open, it might be totally garbage.
    # In that case, we might need to fallback to a generic one or ask user for PNG.
