// ============================================================
// 🏪 SIM CATALOG — Catálogo Realista de Minimarket Venezuela
// ============================================================
// ~150 productos en 10 categorías con precios USD reales 2025-2026
// Distribución Pareto: 20% de productos = 80% de ventas

const CATEGORIAS = {
    BEBIDAS: 'Bebidas',
    ABARROTES: 'Abarrotes',
    LACTEOS: 'Lácteos',
    SNACKS: 'Snacks',
    CUIDADO_PERSONAL: 'Cuidado Personal',
    LIMPIEZA: 'Limpieza',
    CARNES: 'Carnes y Embutidos',
    FRUTAS_VERDURAS: 'Frutas y Verduras',
    PANADERIA: 'Panadería',
    VARIOS: 'Varios'
};

// popularidad: 1-10 (10 = más vendido). Controla selección Pareto.
// margen: fracción de ganancia sobre costo (0.25 = 25%)
const CATALOGO_BASE = [
    // ── BEBIDAS (21) ──────────────────────────────────
    { nombre: 'Agua 500ml', categoria: CATEGORIAS.BEBIDAS, precio: 0.50, costo: 0.30, popularidad: 10, unidadVenta: 'unidad' },
    { nombre: 'Agua 1.5L', categoria: CATEGORIAS.BEBIDAS, precio: 1.00, costo: 0.60, popularidad: 8, unidadVenta: 'unidad' },
    { nombre: 'Coca-Cola 500ml', categoria: CATEGORIAS.BEBIDAS, precio: 1.00, costo: 0.65, popularidad: 10, unidadVenta: 'unidad' },
    { nombre: 'Coca-Cola 2L', categoria: CATEGORIAS.BEBIDAS, precio: 2.00, costo: 1.30, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Pepsi 500ml', categoria: CATEGORIAS.BEBIDAS, precio: 0.90, costo: 0.55, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Frescolita 500ml', categoria: CATEGORIAS.BEBIDAS, precio: 0.80, costo: 0.50, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Chinotto 500ml', categoria: CATEGORIAS.BEBIDAS, precio: 0.80, costo: 0.50, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Jugo Hit 500ml', categoria: CATEGORIAS.BEBIDAS, precio: 0.75, costo: 0.45, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Jugo Yukery 1L', categoria: CATEGORIAS.BEBIDAS, precio: 1.50, costo: 0.90, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Malta Regional', categoria: CATEGORIAS.BEBIDAS, precio: 0.80, costo: 0.50, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Cerveza Polar Pilsen', categoria: CATEGORIAS.BEBIDAS, precio: 1.20, costo: 0.80, popularidad: 9, unidadVenta: 'unidad' },
    { nombre: 'Cerveza Polar Ice', categoria: CATEGORIAS.BEBIDAS, precio: 1.30, costo: 0.85, popularidad: 8, unidadVenta: 'unidad' },
    { nombre: 'Cerveza Solera', categoria: CATEGORIAS.BEBIDAS, precio: 1.50, costo: 1.00, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Gatorade 500ml', categoria: CATEGORIAS.BEBIDAS, precio: 1.50, costo: 1.00, popularidad: 4, unidadVenta: 'unidad' },
    { nombre: 'Té Helado Lipton', categoria: CATEGORIAS.BEBIDAS, precio: 1.20, costo: 0.75, popularidad: 3, unidadVenta: 'unidad' },
    { nombre: 'Café Molido 250g', categoria: CATEGORIAS.BEBIDAS, precio: 2.50, costo: 1.80, popularidad: 8, unidadVenta: 'unidad' },
    { nombre: 'Café instantáneo 50g', categoria: CATEGORIAS.BEBIDAS, precio: 1.80, costo: 1.20, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Leche en polvo 400g', categoria: CATEGORIAS.BEBIDAS, precio: 3.50, costo: 2.50, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Refresco genérico 2L', categoria: CATEGORIAS.BEBIDAS, precio: 1.20, costo: 0.70, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Energizante Speed', categoria: CATEGORIAS.BEBIDAS, precio: 1.50, costo: 1.00, popularidad: 4, unidadVenta: 'unidad' },
    { nombre: 'Ron Santa Teresa', categoria: CATEGORIAS.BEBIDAS, precio: 8.00, costo: 5.50, popularidad: 3, unidadVenta: 'unidad' },

    // ── ABARROTES (25) ────────────────────────────────
    { nombre: 'Harina PAN 1kg', categoria: CATEGORIAS.ABARROTES, precio: 1.50, costo: 1.00, popularidad: 10, unidadVenta: 'unidad' },
    { nombre: 'Arroz 1kg', categoria: CATEGORIAS.ABARROTES, precio: 1.20, costo: 0.80, popularidad: 10, unidadVenta: 'unidad' },
    { nombre: 'Pasta 500g', categoria: CATEGORIAS.ABARROTES, precio: 0.80, costo: 0.50, popularidad: 9, unidadVenta: 'unidad' },
    { nombre: 'Aceite 1L', categoria: CATEGORIAS.ABARROTES, precio: 2.50, costo: 1.80, popularidad: 8, unidadVenta: 'unidad' },
    { nombre: 'Azúcar 1kg', categoria: CATEGORIAS.ABARROTES, precio: 1.00, costo: 0.65, popularidad: 8, unidadVenta: 'unidad' },
    { nombre: 'Sal 1kg', categoria: CATEGORIAS.ABARROTES, precio: 0.50, costo: 0.25, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Mayonesa 500g', categoria: CATEGORIAS.ABARROTES, precio: 2.00, costo: 1.30, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Ketchup 400g', categoria: CATEGORIAS.ABARROTES, precio: 1.80, costo: 1.20, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Salsa de soya', categoria: CATEGORIAS.ABARROTES, precio: 1.50, costo: 0.90, popularidad: 3, unidadVenta: 'unidad' },
    { nombre: 'Atún enlatado', categoria: CATEGORIAS.ABARROTES, precio: 1.80, costo: 1.20, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Sardinas enlatadas', categoria: CATEGORIAS.ABARROTES, precio: 1.20, costo: 0.70, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Caraotas negras 500g', categoria: CATEGORIAS.ABARROTES, precio: 1.00, costo: 0.60, popularidad: 8, unidadVenta: 'unidad' },
    { nombre: 'Lentejas 500g', categoria: CATEGORIAS.ABARROTES, precio: 1.00, costo: 0.60, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Avena 400g', categoria: CATEGORIAS.ABARROTES, precio: 1.20, costo: 0.75, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Vinagre 500ml', categoria: CATEGORIAS.ABARROTES, precio: 0.80, costo: 0.40, popularidad: 4, unidadVenta: 'unidad' },
    { nombre: 'Margarina 500g', categoria: CATEGORIAS.ABARROTES, precio: 1.50, costo: 1.00, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Spaghetti 1kg', categoria: CATEGORIAS.ABARROTES, precio: 1.20, costo: 0.75, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Harina de trigo 1kg', categoria: CATEGORIAS.ABARROTES, precio: 1.00, costo: 0.60, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Maicena 200g', categoria: CATEGORIAS.ABARROTES, precio: 0.80, costo: 0.45, popularidad: 4, unidadVenta: 'unidad' },
    { nombre: 'Salsa de tomate 400g', categoria: CATEGORIAS.ABARROTES, precio: 1.20, costo: 0.70, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Diablitos 115g', categoria: CATEGORIAS.ABARROTES, precio: 1.00, costo: 0.60, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Mantequilla de maní', categoria: CATEGORIAS.ABARROTES, precio: 3.00, costo: 2.00, popularidad: 3, unidadVenta: 'unidad' },
    { nombre: 'Gelatina (sobre)', categoria: CATEGORIAS.ABARROTES, precio: 0.50, costo: 0.25, popularidad: 4, unidadVenta: 'unidad' },
    { nombre: 'Cubitos Maggi x12', categoria: CATEGORIAS.ABARROTES, precio: 0.80, costo: 0.45, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Panela de papelón', categoria: CATEGORIAS.ABARROTES, precio: 0.60, costo: 0.30, popularidad: 5, unidadVenta: 'unidad' },

    // ── LÁCTEOS (12) ──────────────────────────────────
    { nombre: 'Leche UHT 1L', categoria: CATEGORIAS.LACTEOS, precio: 1.80, costo: 1.20, popularidad: 8, unidadVenta: 'unidad' },
    { nombre: 'Queso Blanco 500g', categoria: CATEGORIAS.LACTEOS, precio: 3.50, costo: 2.50, popularidad: 9, unidadVenta: 'unidad' },
    { nombre: 'Queso Amarillo 250g', categoria: CATEGORIAS.LACTEOS, precio: 2.50, costo: 1.70, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Yogurt 200g', categoria: CATEGORIAS.LACTEOS, precio: 1.00, costo: 0.60, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Mantequilla 250g', categoria: CATEGORIAS.LACTEOS, precio: 2.50, costo: 1.70, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Crema de leche 200ml', categoria: CATEGORIAS.LACTEOS, precio: 1.50, costo: 1.00, popularidad: 4, unidadVenta: 'unidad' },
    { nombre: 'Queso de mano', categoria: CATEGORIAS.LACTEOS, precio: 2.00, costo: 1.30, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Ricotta 250g', categoria: CATEGORIAS.LACTEOS, precio: 2.50, costo: 1.80, popularidad: 3, unidadVenta: 'unidad' },
    { nombre: 'Leche condensada', categoria: CATEGORIAS.LACTEOS, precio: 2.00, costo: 1.30, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Suero 500ml', categoria: CATEGORIAS.LACTEOS, precio: 1.00, costo: 0.50, popularidad: 4, unidadVenta: 'unidad' },
    { nombre: 'Natilla 250g', categoria: CATEGORIAS.LACTEOS, precio: 1.50, costo: 0.90, popularidad: 3, unidadVenta: 'unidad' },
    { nombre: 'Huevos (cartón 30)', categoria: CATEGORIAS.LACTEOS, precio: 4.50, costo: 3.20, popularidad: 9, unidadVenta: 'unidad' },

    // ── SNACKS (15) ───────────────────────────────────
    { nombre: 'Galletas María', categoria: CATEGORIAS.SNACKS, precio: 0.80, costo: 0.45, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Galletas Club Social', categoria: CATEGORIAS.SNACKS, precio: 0.60, costo: 0.35, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Doritos', categoria: CATEGORIAS.SNACKS, precio: 1.00, costo: 0.60, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Papas Lays', categoria: CATEGORIAS.SNACKS, precio: 1.20, costo: 0.75, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Cheese Tris', categoria: CATEGORIAS.SNACKS, precio: 0.50, costo: 0.25, popularidad: 8, unidadVenta: 'unidad' },
    { nombre: 'Chocolate Savoy', categoria: CATEGORIAS.SNACKS, precio: 1.50, costo: 1.00, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Toddy barra', categoria: CATEGORIAS.SNACKS, precio: 0.80, costo: 0.50, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Chupeta Bon Bon Bum', categoria: CATEGORIAS.SNACKS, precio: 0.20, costo: 0.10, popularidad: 8, unidadVenta: 'unidad' },
    { nombre: 'Chicle Adams', categoria: CATEGORIAS.SNACKS, precio: 0.30, costo: 0.15, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Maní salado 100g', categoria: CATEGORIAS.SNACKS, precio: 0.80, costo: 0.45, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Galleta Oreo', categoria: CATEGORIAS.SNACKS, precio: 1.00, costo: 0.60, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Caramelos surtidos', categoria: CATEGORIAS.SNACKS, precio: 0.10, costo: 0.05, popularidad: 9, unidadVenta: 'unidad' },
    { nombre: 'Cotufas microondas', categoria: CATEGORIAS.SNACKS, precio: 1.50, costo: 0.90, popularidad: 3, unidadVenta: 'unidad' },
    { nombre: 'Barquilla helado', categoria: CATEGORIAS.SNACKS, precio: 0.50, costo: 0.25, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Tostadas 200g', categoria: CATEGORIAS.SNACKS, precio: 0.80, costo: 0.45, popularidad: 5, unidadVenta: 'unidad' },

    // ── CUIDADO PERSONAL (12) ─────────────────────────
    { nombre: 'Jabón Palmolive', categoria: CATEGORIAS.CUIDADO_PERSONAL, precio: 1.00, costo: 0.60, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Shampoo 400ml', categoria: CATEGORIAS.CUIDADO_PERSONAL, precio: 3.00, costo: 2.00, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Pasta dental Colgate', categoria: CATEGORIAS.CUIDADO_PERSONAL, precio: 2.00, costo: 1.30, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Desodorante Rexona', categoria: CATEGORIAS.CUIDADO_PERSONAL, precio: 3.50, costo: 2.30, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Papel higiénico x4', categoria: CATEGORIAS.CUIDADO_PERSONAL, precio: 2.50, costo: 1.60, popularidad: 8, unidadVenta: 'unidad' },
    { nombre: 'Toallas sanitarias', categoria: CATEGORIAS.CUIDADO_PERSONAL, precio: 2.00, costo: 1.20, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Pañales x10', categoria: CATEGORIAS.CUIDADO_PERSONAL, precio: 5.00, costo: 3.50, popularidad: 4, unidadVenta: 'unidad' },
    { nombre: 'Cepillo dental', categoria: CATEGORIAS.CUIDADO_PERSONAL, precio: 1.00, costo: 0.50, popularidad: 4, unidadVenta: 'unidad' },
    { nombre: 'Crema corporal 200ml', categoria: CATEGORIAS.CUIDADO_PERSONAL, precio: 2.50, costo: 1.60, popularidad: 3, unidadVenta: 'unidad' },
    { nombre: 'Afeitadora desechable', categoria: CATEGORIAS.CUIDADO_PERSONAL, precio: 0.80, costo: 0.40, popularidad: 4, unidadVenta: 'unidad' },
    { nombre: 'Algodón 50g', categoria: CATEGORIAS.CUIDADO_PERSONAL, precio: 1.00, costo: 0.55, popularidad: 3, unidadVenta: 'unidad' },
    { nombre: 'Jabón líquido manos', categoria: CATEGORIAS.CUIDADO_PERSONAL, precio: 2.00, costo: 1.20, popularidad: 5, unidadVenta: 'unidad' },

    // ── LIMPIEZA (10) ─────────────────────────────────
    { nombre: 'Cloro 1L', categoria: CATEGORIAS.LIMPIEZA, precio: 1.00, costo: 0.55, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Desinfectante 1L', categoria: CATEGORIAS.LIMPIEZA, precio: 1.50, costo: 0.90, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Detergente 1kg', categoria: CATEGORIAS.LIMPIEZA, precio: 2.50, costo: 1.70, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Jabón en barra (azul)', categoria: CATEGORIAS.LIMPIEZA, precio: 0.80, costo: 0.40, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Suavizante 500ml', categoria: CATEGORIAS.LIMPIEZA, precio: 2.00, costo: 1.30, popularidad: 4, unidadVenta: 'unidad' },
    { nombre: 'Esponja (pack 3)', categoria: CATEGORIAS.LIMPIEZA, precio: 0.60, costo: 0.30, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Bolsas basura x10', categoria: CATEGORIAS.LIMPIEZA, precio: 1.00, costo: 0.50, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Lavavajilla 500ml', categoria: CATEGORIAS.LIMPIEZA, precio: 1.50, costo: 0.90, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Fabuloso 1L', categoria: CATEGORIAS.LIMPIEZA, precio: 1.50, costo: 0.85, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Escoba', categoria: CATEGORIAS.LIMPIEZA, precio: 3.00, costo: 2.00, popularidad: 2, unidadVenta: 'unidad' },

    // ── CARNES Y EMBUTIDOS (10) ───────────────────────
    { nombre: 'Pollo entero 1.5kg', categoria: CATEGORIAS.CARNES, precio: 4.50, costo: 3.20, popularidad: 8, unidadVenta: 'kg' },
    { nombre: 'Carne molida 500g', categoria: CATEGORIAS.CARNES, precio: 3.50, costo: 2.50, popularidad: 7, unidadVenta: 'kg' },
    { nombre: 'Jamón de pavo 250g', categoria: CATEGORIAS.CARNES, precio: 2.50, costo: 1.70, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Mortadela 250g', categoria: CATEGORIAS.CARNES, precio: 1.50, costo: 0.90, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Salchichas x6', categoria: CATEGORIAS.CARNES, precio: 2.00, costo: 1.30, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Chuleta ahumada 500g', categoria: CATEGORIAS.CARNES, precio: 3.00, costo: 2.10, popularidad: 5, unidadVenta: 'kg' },
    { nombre: 'Tocino 200g', categoria: CATEGORIAS.CARNES, precio: 2.50, costo: 1.70, popularidad: 4, unidadVenta: 'unidad' },
    { nombre: 'Pechuga de pollo 500g', categoria: CATEGORIAS.CARNES, precio: 3.00, costo: 2.00, popularidad: 6, unidadVenta: 'kg' },
    { nombre: 'Costilla de res 500g', categoria: CATEGORIAS.CARNES, precio: 3.50, costo: 2.50, popularidad: 4, unidadVenta: 'kg' },
    { nombre: 'Cazon 500g', categoria: CATEGORIAS.CARNES, precio: 3.00, costo: 2.00, popularidad: 3, unidadVenta: 'kg' },

    // ── FRUTAS Y VERDURAS (15) ────────────────────────
    { nombre: 'Plátano maduro (unid)', categoria: CATEGORIAS.FRUTAS_VERDURAS, precio: 0.30, costo: 0.15, popularidad: 9, unidadVenta: 'unidad' },
    { nombre: 'Tomate (kg)', categoria: CATEGORIAS.FRUTAS_VERDURAS, precio: 1.50, costo: 0.90, popularidad: 8, unidadVenta: 'kg' },
    { nombre: 'Cebolla (kg)', categoria: CATEGORIAS.FRUTAS_VERDURAS, precio: 1.00, costo: 0.55, popularidad: 8, unidadVenta: 'kg' },
    { nombre: 'Papa (kg)', categoria: CATEGORIAS.FRUTAS_VERDURAS, precio: 1.00, costo: 0.60, popularidad: 8, unidadVenta: 'kg' },
    { nombre: 'Ajo (cabeza)', categoria: CATEGORIAS.FRUTAS_VERDURAS, precio: 0.50, costo: 0.25, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Pimentón (unid)', categoria: CATEGORIAS.FRUTAS_VERDURAS, precio: 0.50, costo: 0.25, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Zanahoria (kg)', categoria: CATEGORIAS.FRUTAS_VERDURAS, precio: 1.00, costo: 0.55, popularidad: 5, unidadVenta: 'kg' },
    { nombre: 'Lechuga (unid)', categoria: CATEGORIAS.FRUTAS_VERDURAS, precio: 0.80, costo: 0.40, popularidad: 4, unidadVenta: 'unidad' },
    { nombre: 'Limón (unid)', categoria: CATEGORIAS.FRUTAS_VERDURAS, precio: 0.10, costo: 0.05, popularidad: 8, unidadVenta: 'unidad' },
    { nombre: 'Aguacate (unid)', categoria: CATEGORIAS.FRUTAS_VERDURAS, precio: 1.00, costo: 0.60, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Mandarina (kg)', categoria: CATEGORIAS.FRUTAS_VERDURAS, precio: 1.50, costo: 0.80, popularidad: 5, unidadVenta: 'kg' },
    { nombre: 'Yuca (kg)', categoria: CATEGORIAS.FRUTAS_VERDURAS, precio: 0.80, costo: 0.40, popularidad: 5, unidadVenta: 'kg' },
    { nombre: 'Auyama (kg)', categoria: CATEGORIAS.FRUTAS_VERDURAS, precio: 0.60, costo: 0.30, popularidad: 4, unidadVenta: 'kg' },
    { nombre: 'Cilantro (manojo)', categoria: CATEGORIAS.FRUTAS_VERDURAS, precio: 0.30, costo: 0.10, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Ají dulce (manojo)', categoria: CATEGORIAS.FRUTAS_VERDURAS, precio: 0.30, costo: 0.10, popularidad: 7, unidadVenta: 'unidad' },

    // ── PANADERÍA (10) ────────────────────────────────
    { nombre: 'Pan canilla', categoria: CATEGORIAS.PANADERIA, precio: 0.50, costo: 0.25, popularidad: 10, unidadVenta: 'unidad' },
    { nombre: 'Pan campesino', categoria: CATEGORIAS.PANADERIA, precio: 0.60, costo: 0.30, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Pan de sandwich', categoria: CATEGORIAS.PANADERIA, precio: 1.50, costo: 0.90, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Cachito de jamón', categoria: CATEGORIAS.PANADERIA, precio: 0.80, costo: 0.40, popularidad: 8, unidadVenta: 'unidad' },
    { nombre: 'Empanada', categoria: CATEGORIAS.PANADERIA, precio: 1.00, costo: 0.50, popularidad: 9, unidadVenta: 'unidad' },
    { nombre: 'Pastelito de queso', categoria: CATEGORIAS.PANADERIA, precio: 0.80, costo: 0.40, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Golfeado', categoria: CATEGORIAS.PANADERIA, precio: 0.80, costo: 0.35, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Torta casera (porción)', categoria: CATEGORIAS.PANADERIA, precio: 1.50, costo: 0.80, popularidad: 4, unidadVenta: 'unidad' },
    { nombre: 'Pan dulce', categoria: CATEGORIAS.PANADERIA, precio: 0.50, costo: 0.25, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Piñita (pastelería)', categoria: CATEGORIAS.PANADERIA, precio: 0.40, costo: 0.20, popularidad: 5, unidadVenta: 'unidad' },

    // ── VARIOS (15) ───────────────────────────────────
    { nombre: 'Cigarros (cajetilla)', categoria: CATEGORIAS.VARIOS, precio: 1.50, costo: 1.00, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Hielo 3kg', categoria: CATEGORIAS.VARIOS, precio: 1.00, costo: 0.40, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Pilas AA x2', categoria: CATEGORIAS.VARIOS, precio: 1.50, costo: 0.80, popularidad: 4, unidadVenta: 'unidad' },
    { nombre: 'Recarga telefónica', categoria: CATEGORIAS.VARIOS, precio: 1.00, costo: 0.85, popularidad: 8, unidadVenta: 'unidad' },
    { nombre: 'Fósforos', categoria: CATEGORIAS.VARIOS, precio: 0.20, costo: 0.08, popularidad: 6, unidadVenta: 'unidad' },
    { nombre: 'Encendedor', categoria: CATEGORIAS.VARIOS, precio: 0.50, costo: 0.20, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Bolsa plástica (paq)', categoria: CATEGORIAS.VARIOS, precio: 0.50, costo: 0.20, popularidad: 7, unidadVenta: 'unidad' },
    { nombre: 'Servilletas x100', categoria: CATEGORIAS.VARIOS, precio: 1.00, costo: 0.50, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Vaso desechable x20', categoria: CATEGORIAS.VARIOS, precio: 0.80, costo: 0.40, popularidad: 4, unidadVenta: 'unidad' },
    { nombre: 'Aluminio (rollo)', categoria: CATEGORIAS.VARIOS, precio: 1.50, costo: 0.90, popularidad: 3, unidadVenta: 'unidad' },
    { nombre: 'Bombillo LED', categoria: CATEGORIAS.VARIOS, precio: 2.00, costo: 1.10, popularidad: 2, unidadVenta: 'unidad' },
    { nombre: 'Cinta adhesiva', categoria: CATEGORIAS.VARIOS, precio: 1.00, costo: 0.50, popularidad: 3, unidadVenta: 'unidad' },
    { nombre: 'Cuaderno', categoria: CATEGORIAS.VARIOS, precio: 1.50, costo: 0.80, popularidad: 3, unidadVenta: 'unidad' },
    { nombre: 'Acetaminofén x10', categoria: CATEGORIAS.VARIOS, precio: 0.50, costo: 0.25, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Antiácido (sobre)', categoria: CATEGORIAS.VARIOS, precio: 0.30, costo: 0.12, popularidad: 4, unidadVenta: 'unidad' },

    // ── PREMIUM / BULK (8) — Mejora #4: Productos de ticket alto ──
    { nombre: 'Pack Cerveza Polar x12', categoria: CATEGORIAS.BEBIDAS, precio: 12.00, costo: 8.50, popularidad: 6, unidadVenta: 'pack' },
    { nombre: 'Pack Cerveza Polar x6', categoria: CATEGORIAS.BEBIDAS, precio: 6.50, costo: 4.50, popularidad: 7, unidadVenta: 'pack' },
    { nombre: 'Whisky Cacique 750ml', categoria: CATEGORIAS.BEBIDAS, precio: 15.00, costo: 10.00, popularidad: 3, unidadVenta: 'unidad' },
    { nombre: 'Pañales desechables x30', categoria: CATEGORIAS.VARIOS, precio: 12.00, costo: 8.50, popularidad: 5, unidadVenta: 'paquete' },
    { nombre: 'Leche fórmula bebé 400g', categoria: CATEGORIAS.LACTEOS, precio: 10.00, costo: 7.50, popularidad: 4, unidadVenta: 'unidad' },
    { nombre: 'Aceite vegetal 5L', categoria: CATEGORIAS.ABARROTES, precio: 10.00, costo: 7.00, popularidad: 5, unidadVenta: 'unidad' },
    { nombre: 'Combo Canasta Básica', categoria: CATEGORIAS.ABARROTES, precio: 25.00, costo: 18.00, popularidad: 4, unidadVenta: 'combo' },
    { nombre: 'Detergente industrial 5kg', categoria: CATEGORIAS.LIMPIEZA, precio: 12.00, costo: 8.00, popularidad: 3, unidadVenta: 'unidad' }
];

// ── Motivos de gasto realistas ──
const MOTIVOS_GASTO = [
    { motivo: 'Servicios: Electricidad mensual', rango: [15, 40], frecuencia: 'mensual' },
    { motivo: 'Servicios: Agua potable', rango: [5, 15], frecuencia: 'mensual' },
    { motivo: 'Servicios: Internet/Wifi', rango: [10, 25], frecuencia: 'mensual' },
    { motivo: 'Servicios: Teléfono celular', rango: [5, 10], frecuencia: 'mensual' },
    { motivo: 'Proveedor: Reposición de inventario', rango: [50, 200], frecuencia: 'semanal' },
    { motivo: 'Proveedor: Pedido bebidas', rango: [30, 100], frecuencia: 'semanal' },
    { motivo: 'Limpieza: Productos de limpieza', rango: [5, 15], frecuencia: 'quincenal' },
    { motivo: 'Mantenimiento: Refrigeradores', rango: [20, 60], frecuencia: 'mensual' },
    { motivo: 'Personal: Almuerzo empleados', rango: [3, 8], frecuencia: 'diario' },
    { motivo: 'Transporte: Envío a domicilio', rango: [2, 5], frecuencia: 'diario' },
    { motivo: 'Varios: Insumos oficina', rango: [3, 10], frecuencia: 'quincenal' },
    { motivo: 'Mantenimiento: Reparación menor', rango: [5, 25], frecuencia: 'mensual' },
];

// ── Motivos de consumo interno ──
const MOTIVOS_CONSUMO = [
    'Consumo empleados',
    'Producto dañado/vencido',
    'Muestra para cliente',
    'Uso del negocio',
    'Merma por almacenamiento'
];

// ── Productos típicos de consumo interno ──
const CONSUMOS_FRECUENTES = [
    'Café Molido 250g', 'Agua 500ml', 'Galletas María', 'Azúcar 1kg',
    'Servilletas x100', 'Bolsa plástica (paq)', 'Papel higiénico x4',
    'Jabón líquido manos', 'Cloro 1L', 'Vaso desechable x20'
];

// ── Nombres de empleados simulados ──
const EMPLEADOS_SIM = [
    { id: 'emp_sim_1', nombre: 'Carlos Mendoza', rol: 'cajero', sueldo: 150 },
    { id: 'emp_sim_2', nombre: 'María García', rol: 'cajero', sueldo: 150 },
    { id: 'emp_sim_3', nombre: 'José Rodríguez', rol: 'inventario', sueldo: 180 },
];

// ── Clientes con crédito (fiado) ──
const CLIENTES_CREDITO = [
    { id: 'cli_1', nombre: 'Sra. Carmen Pérez', frecuencia: 'diario', limiteCredito: 50, saldoPendiente: 0 },
    { id: 'cli_2', nombre: 'Don Pedro Ramírez', frecuencia: 'diario', limiteCredito: 80, saldoPendiente: 0 },
    { id: 'cli_3', nombre: 'Familia Hernández', frecuencia: 'semanal', limiteCredito: 120, saldoPendiente: 0 },
    { id: 'cli_4', nombre: 'Sra. Rosa Martínez', frecuencia: 'diario', limiteCredito: 40, saldoPendiente: 0 },
    { id: 'cli_5', nombre: 'Juan el Panadero', frecuencia: 'diario', limiteCredito: 60, saldoPendiente: 0 },
    { id: 'cli_6', nombre: 'Abuela Luisa', frecuencia: 'semanal', limiteCredito: 100, saldoPendiente: 0 },
    { id: 'cli_7', nombre: 'Sr. Miguel Torres', frecuencia: 'quincenal', limiteCredito: 150, saldoPendiente: 0 },
    { id: 'cli_8', nombre: 'Vecina del 5to', frecuencia: 'diario', limiteCredito: 35, saldoPendiente: 0 },
    { id: 'cli_9', nombre: 'Taller Mecánico López', frecuencia: 'semanal', limiteCredito: 200, saldoPendiente: 0 },
    { id: 'cli_10', nombre: 'Peluquería Glamour', frecuencia: 'quincenal', limiteCredito: 80, saldoPendiente: 0 },
    { id: 'cli_11', nombre: 'Familia Suárez', frecuencia: 'semanal', limiteCredito: 90, saldoPendiente: 0 },
    { id: 'cli_12', nombre: 'Don Ramón (conserje)', frecuencia: 'diario', limiteCredito: 25, saldoPendiente: 0 },
];

// ── Tasa de cambio dinámica (inflación VE) ──
const tasaCambioState = { base: 90, actual: 90, dia: 0 };

/**
 * Genera tasa de cambio con fluctuación diaria ±2% y tendencia semanal al alza.
 * Simula devaluación gradual del bolívar.
 */
const generarTasaCambio = (diaSimulado) => {
    if (diaSimulado !== tasaCambioState.dia) {
        tasaCambioState.dia = diaSimulado;
        // Tendencia alcista semanal: +0.3-0.8% por semana
        const semanasTranscurridas = Math.floor(diaSimulado / 7);
        const tendencia = 1 + (semanasTranscurridas * randomFloat(0.003, 0.008));
        // Fluctuación diaria ±2%
        const fluctuacion = 1 + (Math.random() - 0.5) * 0.04;
        tasaCambioState.actual = +(tasaCambioState.base * tendencia * fluctuacion).toFixed(2);
    }
    return tasaCambioState.actual;
};

// ── Motivos de anulación realistas ──
const MOTIVOS_ANULACION = [
    'Cliente se arrepintió',
    'Error en cantidad cobrada',
    'Producto dañado/vencido al entregar',
    'Precio incorrecto en sistema',
    'Cobro duplicado por error del cajero',
];

// ── Errores comunes del día a día ──
const ERRORES_COMUNES = [
    { tipo: 'DESCUADRE', msg: '⚠️ Descuadre de caja: diferencia de ${monto} detectada', prob: 0.15 },
    { tipo: 'FALTANTE', msg: '⚠️ Producto faltante: ${producto} no encontrado en estante', prob: 0.10 },
    { tipo: 'VUELTO_MAL', msg: '⚠️ Error en vuelto: se dio $${monto} de más al cliente', prob: 0.08 },
    { tipo: 'MERMA', msg: '⚠️ Merma detectada: ${cantidad} unidades de ${producto} dañadas', prob: 0.12 },
    { tipo: 'CAJA_CERRADA', msg: '⚠️ Intento de venta con caja cerrada (rechazado)', prob: 0.05 },
    { tipo: 'PRECIO_ERRONEO', msg: '⚠️ Precio erróneo corregido: ${producto} de $${viejo} a $${nuevo}', prob: 0.10 },
];

// ── Productos nuevos que aparecen con el tiempo ──
const NUEVOS_PRODUCTOS = [
    { nombre: 'Energizante Monster 473ml', categoria: 'Bebidas', precio: 3.50, costo: 2.20, popularidad: 7 },
    { nombre: 'Galleta Oreo Triple', categoria: 'Snacks', precio: 2.80, costo: 1.60, popularidad: 8 },
    { nombre: 'Agua Mineral con Gas 600ml', categoria: 'Bebidas', precio: 1.20, costo: 0.50, popularidad: 6 },
    { nombre: 'Salsa BBQ Importada', categoria: 'Abarrotes', precio: 4.50, costo: 2.80, popularidad: 5 },
    { nombre: 'Pan Artesanal Integral', categoria: 'Panadería', precio: 2.00, costo: 0.90, popularidad: 7 },
    { nombre: 'Detergente Pods 20u', categoria: 'Hogar', precio: 8.50, costo: 5.50, popularidad: 6 },
    { nombre: 'Café Premium Molido 500g', categoria: 'Abarrotes', precio: 6.00, costo: 3.50, popularidad: 8 },
    { nombre: 'Protector Solar SPF50', categoria: 'Higiene', precio: 7.00, costo: 4.00, popularidad: 4 },
];

// ── Perfiles de día (fallback sin API) ──
const PERFILES_DIA = {
    NORMAL: { factorVentas: 1.0, ticketBase: 5.0, gastosBase: 2 },
    LENTO: { factorVentas: 0.6, ticketBase: 4.0, gastosBase: 1 },
    PICO: { factorVentas: 1.5, ticketBase: 6.5, gastosBase: 3 },
    FERIADO: { factorVentas: 0.3, ticketBase: 3.5, gastosBase: 0 },
    QUINCENA: { factorVentas: 1.8, ticketBase: 8.0, gastosBase: 3 },
    FIN_DE_SEMANA: { factorVentas: 1.3, ticketBase: 5.5, gastosBase: 1 },
};

// ── Métodos de pago con distribución ──
const METODOS_PAGO = [
    { id: 'EFECTIVO_USD', moneda: 'USD', medio: 'CASH', peso: 35 },
    { id: 'EFECTIVO_BS', moneda: 'VES', medio: 'CASH', peso: 25 },
    { id: 'PAGO_MOVIL', moneda: 'VES', medio: 'DIGITAL', peso: 25 },
    { id: 'ZELLE', moneda: 'USD', medio: 'DIGITAL', peso: 10 },
    { id: 'PUNTO_VENTA', moneda: 'VES', medio: 'DIGITAL', peso: 5 },
];

// ── Distribución horaria (curva gaussiana) ──
// Cada valor = peso relativo de ventas en esa hora
const DISTRIBUCION_HORARIA = {
    6: 2, 7: 5, 8: 10, 9: 12, 10: 15,
    11: 20, 12: 25, 13: 22, 14: 15,
    15: 12, 16: 14, 17: 20, 18: 22, 19: 18,
    20: 10, 21: 5, 22: 2
};

// ── Helpers ──
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Selecciona productos usando distribución Pareto (80/20)
 * Productos con alta popularidad se venden exponencialmente más
 */
const seleccionarProductoPareto = (productos) => {
    const pesos = productos.map(p => Math.pow(p.popularidad, 2.5)); // Exponencial
    const total = pesos.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    for (let i = 0; i < productos.length; i++) {
        rand -= pesos[i];
        if (rand <= 0) return productos[i];
    }
    return productos[productos.length - 1];
};

/**
 * Selecciona método de pago según distribución configurada
 */
const seleccionarMetodoPago = () => {
    const total = METODOS_PAGO.reduce((a, m) => a + m.peso, 0);
    let rand = Math.random() * total;
    for (const metodo of METODOS_PAGO) {
        rand -= metodo.peso;
        if (rand <= 0) return metodo;
    }
    return METODOS_PAGO[0];
};

/**
 * Obtiene la hora para una venta basándose en la curva horaria
 */
const seleccionarHora = () => {
    const horas = Object.entries(DISTRIBUCION_HORARIA);
    const totalPeso = horas.reduce((a, [, peso]) => a + peso, 0);
    let rand = Math.random() * totalPeso;
    for (const [hora, peso] of horas) {
        rand -= peso;
        if (rand <= 0) return parseInt(hora);
    }
    return 12; // fallback mediodía
};

/**
 * Selecciona gastos apropiados para un día según frecuencia
 */
const seleccionarGastosDelDia = (diaDelMes, diaDeLaSemana) => {
    const gastos = [];
    for (const g of MOTIVOS_GASTO) {
        let aplica = false;
        if (g.frecuencia === 'diario') aplica = Math.random() < 0.4;
        else if (g.frecuencia === 'semanal' && diaDeLaSemana === 1) aplica = Math.random() < 0.7;
        else if (g.frecuencia === 'quincenal' && (diaDelMes === 1 || diaDelMes === 15)) aplica = Math.random() < 0.8;
        else if (g.frecuencia === 'mensual' && diaDelMes <= 5) aplica = Math.random() < 0.5;

        if (aplica) {
            gastos.push({
                motivo: g.motivo,
                monto: randomFloat(g.rango[0], g.rango[1])
            });
        }
    }
    return gastos;
};

export {
    CATEGORIAS,
    CATALOGO_BASE,
    MOTIVOS_GASTO,
    MOTIVOS_CONSUMO,
    CONSUMOS_FRECUENTES,
    EMPLEADOS_SIM,
    CLIENTES_CREDITO,
    PERFILES_DIA,
    METODOS_PAGO,
    DISTRIBUCION_HORARIA,
    MOTIVOS_ANULACION,
    ERRORES_COMUNES,
    NUEVOS_PRODUCTOS,
    randomInt,
    randomFloat,
    pickRandom,
    seleccionarProductoPareto,
    seleccionarMetodoPago,
    seleccionarHora,
    seleccionarGastosDelDia,
    generarTasaCambio
};
