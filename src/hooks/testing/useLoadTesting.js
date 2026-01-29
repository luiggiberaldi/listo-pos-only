import { useState } from 'react';

// --- BANCO DE DATOS: PRODUCTOS ---
const SUJETS = ["Harina", "Arroz", "Pasta", "Aceite", "Sardina", "Refresco", "Jabón", "Detergente", "Cerveza", "Galletas", "Leche", "Café", "Azúcar", "Sal", "Vinagre", "Salsa", "Mayonesa", "Mantequilla", "Queso", "Jamón", "Yogurt", "Jugo", "Agua", "Pañales", "Champú", "Carne", "Pollo", "Tomate", "Cebolla"];
const ADJETIVOS = ["Premium", "Económico", "Integral", "Refinado", "Importado", "Nacional", "Picante", "Dulce", "Salado", "Líquido", "En Polvo", "Granulado", "Espeso", "Ligero", "Familiar", "Industrial", "Artesanal", "Gourmet", "Básico", "Extra"];
const MARCAS = ["Polar", "Heinz", "Mavesa", "Nestlé", "Kraft", "Alfonzo Rivas", "Mary", "Primor", "Juana", "Robin Hood", "Los Andes", "Zulia", "Regional", "Solera", "Coca-Cola", "Pepsi", "Gatorade", "Pampers", "Ariel", "Ace", "Plumrose", "Oscar Mayer"];

// --- BANCO DE DATOS: CLIENTES ---
const NOMBRES = ["Juan", "María", "Pedro", "Ana", "Luis", "Carmen", "José", "Elena", "Carlos", "Rosa", "Miguel", "Lucía", "Jorge", "Isabel", "Francisco", "Teresa", "Andrés", "Marta", "Ricardo", "Sonia"];
const APELLIDOS = ["González", "Rodríguez", "López", "García", "Martínez", "Pérez", "Sánchez", "Hernández", "Díaz", "Ramírez", "Torres", "Flores", "Morales", "Rivera", "Gómez", "Ortiz", "Castro", "Rojas", "Álvarez", "Silva"];

const CATEGORIAS_DISTRIBUCION = [
    { nombre: "Víveres", peso: 0.35 },
    { nombre: "Refrigerados", peso: 0.15 },
    { nombre: "Charcutería", peso: 0.10 }, // Generará productos por peso
    { nombre: "Verduras", peso: 0.05 },    // Generará productos por peso
    { nombre: "Licores", peso: 0.10 },
    { nombre: "Limpieza", peso: 0.15 },
    { nombre: "Higiene", peso: 0.05 },
    { nombre: "Golosinas", peso: 0.05 }
];

// UTILS
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const useLoadTesting = () => {
  const [loading, setLoading] = useState(false);

  // 1. GENERADOR DE FECHAS
  const generarFechaVencimiento = () => {
    const r = Math.random();
    const hoy = new Date();
    if (r < 0.05) { // Vencidos (Poco probable)
        const pasada = new Date(hoy);
        pasada.setDate(hoy.getDate() - randomInt(1, 30));
        return pasada.toISOString().split('T')[0];
    }
    if (r < 0.20) { // Por vencer
        const cerca = new Date(hoy);
        cerca.setDate(hoy.getDate() + randomInt(1, 7));
        return cerca.toISOString().split('T')[0];
    }
    if (r < 0.70) { // Frescos
        const lejos = new Date(hoy);
        lejos.setFullYear(hoy.getFullYear() + randomInt(1, 2));
        return lejos.toISOString().split('T')[0];
    }
    return ""; // No perecedero
  };

  const detonarCargaMasiva = () => {
    const msg = "☢️ OPERACIÓN NIVEL OMEGA\n\n- 1.000 Productos con Stock Disponible.\n- Variedad de Formatos (Bultos, Paquetes, Peso).\n- 1.000 Clientes en base de datos.\n- Limpieza total de historial.\n\n¿Confirmar destrucción y recreación?";
    if (!window.confirm(msg)) return;

    setLoading(true);

    setTimeout(() => {
        try {
            // --- BLOQUE 1: PRODUCTOS (1.000) ---
            const productosGenerados = [];
            for (let i = 0; i < 1000; i++) {
              // Selección de Categoría Ponderada
              const categoria = (() => {
                const r = Math.random();
                let acumulado = 0;
                for (const cat of CATEGORIAS_DISTRIBUCION) {
                    acumulado += cat.peso;
                    if (r <= acumulado) return cat.nombre;
                }
                return "Varios";
              })();

              const costoBase = randomFloat(0.5, 60);
              const precioBase = parseFloat((costoBase * randomFloat(1.15, 1.6)).toFixed(2));
              
              // Definición de Formatos y Unidades
              let tipoUnidad = 'unidad';
              let jerarquia = { bulto: { activo: false, contenido: 1 }, paquete: { activo: false, contenido: 1 } };

              if (categoria === "Charcutería" || categoria === "Verduras") {
                  tipoUnidad = 'peso';
              } else {
                  // Lógica de Jerarquía para productos secos/líquidos
                  // 40% de probabilidad de tener formato mayorista
                  if (Math.random() < 0.4) {
                      jerarquia.bulto = { activo: true, contenido: randomInt(6, 24) }; // Bultos de 6, 12, 24
                      
                      // 50% de probabilidad de tener formato intermedio (Paquete) si tiene bulto
                      if (Math.random() > 0.5) {
                          jerarquia.paquete = { activo: true, contenido: Math.floor(jerarquia.bulto.contenido / 2) || 3 };
                      }
                  }
              }

              productosGenerados.push({
                id: `PROD-${Date.now()}-${i}`,
                codigo: `BAR-${20000 + i}`,
                nombre: `${pick(SUJETS)} ${pick(ADJETIVOS)} ${pick(MARCAS)} (${i})`,
                costo: costoBase,
                precio: precioBase,
                // ✅ STOCK SIEMPRE POSITIVO (Disponible para venta)
                stock: randomInt(20, 1000), 
                tipoUnidad,
                jerarquia,
                aplicaIva: categoria !== "Víveres" && categoria !== "Verduras",
                fechaVencimiento: generarFechaVencimiento(),
                categoria
              });
            }

            // --- BLOQUE 2: CLIENTES (1.000) ---
            const clientesGenerados = [];
            for (let j = 0; j < 1000; j++) {
                const nombreCompleto = `${pick(NOMBRES)} ${pick(APELLIDOS)}`;
                const tieneDeuda = Math.random() < 0.1;

                clientesGenerados.push({
                    id: `CLI-${Date.now()}-${j}`,
                    nombre: nombreCompleto,
                    telefono: `0414-${randomInt(1000000, 9999999)}`,
                    cedula: `V-${randomInt(10000000, 30000000)}`,
                    direccion: `Calle ${randomInt(1, 100)}, Casa ${j}`,
                    saldo: tieneDeuda ? randomFloat(10, 500) : 0,
                    activo: true,
                    fechaRegistro: new Date().toISOString()
                });
            }

            // --- PERSISTENCIA ATÓMICA ---
            localStorage.setItem('listo-productos', JSON.stringify(productosGenerados));
            localStorage.setItem('listo-clientes', JSON.stringify(clientesGenerados));
            
            // Purga de seguridad
            localStorage.removeItem('listo-ventas');
            localStorage.removeItem('listo-movimientos');
            localStorage.removeItem('listo-cortes');
            localStorage.removeItem('listo-categorias'); // Se regenerarán dinámicamente

            alert("✅ CARGA MASIVA COMPLETADA\n\n- 1.000 Productos con stock disponible.\n- 1.000 Clientes registrados.\n- Formatos variados (Peso/Unidad/Bulto).\n\nEl sistema se reiniciará para indexar.");
            window.location.reload();

        } catch (e) {
            console.error(e);
            alert("❌ ERROR: Desbordamiento de memoria local.");
        } finally {
            setLoading(false);
        }
    }, 100);
  };

  return { generarInventarioMasivo: detonarCargaMasiva, loading };
};