import pandas as pd
import random

# Configuration
TOTAL_PRODUCTS = 300
CATEGORIES = ['ALIMENTOS', 'BEBIDAS', 'SNACKS', 'LIMPIEZA', 'PERSONAL', 'HOGAR']

def generate_data():
    data = []
    for i in range(1, TOTAL_PRODUCTS + 1):
        cat = random.choice(CATEGORIES)
        cost = round(random.uniform(0.5, 20.0), 2)
        price = round(cost * random.uniform(1.3, 1.6), 2) # 30-60% margin
        stock = random.randint(0, 150)
        
        item = {
            "codigo": f"IMP-{i:03d}",
            "nombre": f"PRODUCTO IMPORTADO {i} - {cat}",
            "categoria": cat,
            "costo": cost,
            "precio": price,
            "stock": stock,
            "minimo": 10
        }
        data.append(item)
    return data

def main():
    try:
        df = pd.DataFrame(generate_data())
        filename = "mock_products_300.xlsx"
        df.to_excel(filename, index=False)
        print(f"SUCCESS: Generated {filename} with {TOTAL_PRODUCTS} products.")
    except ImportError:
        print("ERROR: pandas or openpyxl not installed.")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    main()
