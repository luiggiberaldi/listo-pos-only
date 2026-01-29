from PIL import Image
import os

# Paths
input_path = r"C:/Users/luigg/.gemini/antigravity/brain/1b16191e-6eb4-4ebd-839a-e8c0ba35d0c1/master_icon_shield_white_1769170280710.png"
output_path = r"C:/Users/luigg/Desktop/LISTO POS SENCILLO/listo-master/public/icon.ico"

# Open the image
img = Image.open(input_path)

# Prepare sizes for a robust Windows icon
icon_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]

# Save as ICO (Pillow handles the resizing automatically for ICOs if prompted, but passing the original high-res image is best)
img.save(output_path, format='ICO', sizes=icon_sizes)

print(f"Successfully created icon at: {output_path}")
print("Icon sizes included:", icon_sizes)
