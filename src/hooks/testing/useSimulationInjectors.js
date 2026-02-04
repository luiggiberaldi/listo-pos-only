import { db } from '../../db';
import Swal from 'sweetalert2';

/**
 * 💉 USE SIMULATION INJECTORS
 * Provides tools to inject test data, reset database, and create chaos scenarios.
 */
export const useSimulationInjectors = () => {

    // --- 🪄 GENERADOR DE PRODUCTO DE PRUEBA ---
    const handleCrearHarina = async () => {
        try {
            // 1. 🧹 LIMPIEZA TOTAL DE BASE DE DATOS
            await Promise.all([
                db.productos.clear(),
                db.ventas.clear(),
                db.clientes.clear(),
                db.logs.clear(),
                db.tickets_espera.clear(),
                db.outbox.clear(),
                db.cortes.clear(),
                db.caja_sesion.clear(),
                db.config.clear()
            ]);

            // 2. 💲 CONFIGURAR TASA A 200
            const configInicial = {
                key: 'general',
                nombre: 'MI NEGOCIO',
                direccion: 'Dirección de Prueba',
                rif: 'J-00000000-0',
                telefono: '0412-0000000',
                tasa: 200,
                iva: 16,
                monedaItems: 'usd',
                monedaTotales: 'both'
            };
            await db.config.put(configInicial);

            // 2.2 🔑 APERTURA AUTOMÁTICA DE CAJA (Para simulaciones financieras)
            const initialBalance = { usdCash: 1000, vesCash: 0, usdDigital: 0, vesDigital: 0 };
            await db.caja_sesion.put({
                key: 'actual',
                isAbierta: true,
                fechaApertura: new Date().toISOString(),
                usuarioApertura: { id: 'sys', nombre: 'Sistema (Audit)' },
                balances: { ...initialBalance },
                balancesApertura: { ...initialBalance },
                idApertura: `sim_${Date.now()}`
            });

            // 2.5 👤 CREAR CLIENTE TEST (LUIGI BERALDI)
            const clienteLuigi = {
                nombre: "Luigi Beraldi",
                documento: "26.353.469",
                telefono: "0412-1234567",
                direccion: "San Cristobal",
                deuda: 0,
                favor: 0,
                saldo: 0,
                fecha_registro: new Date().toISOString()
            };
            await db.clientes.add(clienteLuigi);

            // 3. 📦 CREAR PRODUCTO TEST
            const baseCostBulto = 20;
            const unitsPerBulto = 20;
            const costoUnitario = baseCostBulto / unitsPerBulto; // $1.00

            const productoTest = {
                nombre: "HARINA PAN (TEST)",
                codigo: "HPAN-TEST",
                categoria: "Alimentos",
                precio: 1.50,         // ✅ PVP Unidad: $1.5 SOLICITADO
                costo: costoUnitario, // Costo Unidad ($1.00)
                stock: 200,           // 10 Bultos * 20u = 200u
                tipoUnidad: 'unidad',
                favorito: true,
                fecha_registro: new Date().toISOString(),

                // 📦 JERARQUÍA
                jerarquia: {
                    bulto: {
                        activo: true,
                        nombre: "Bulto",
                        contenido: unitsPerBulto, // ✅ CORREGIDO: contenido
                        precio: 25.00,           // PVP Bulto
                        codigo: "HPAN-BULTO"
                    },
                    paquete: { activo: false, nombre: "Paquete", contenido: 1, precio: 0, codigo: "" }
                },

                // Impuestos (Con IVA solicitado)
                aplicaIva: true,
                exento: false
            };

            await db.productos.add(productoTest);

            // 4. 🔄 RECARGAR PARA APLICAR CAMBIOS DE CONTEXTO
            Swal.fire({
                icon: 'success',
                title: '¡ENTORNO DE PRUEBA LISTO!',
                html: 'Base de datos limpia.<br>Tasa: <b>200 Bs/$</b><br>Producto creado.',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                window.location.reload(); // Necesario para que el Context recargue la config
            });

        } catch (error) {
            console.error("Error creando entorno test:", error);
            Swal.fire('Error', `No se pudo crear el entorno: ${error.message}`, 'error');
        }
    };

    // --- 🧪 HERRAMIENTAS DE CAOS (CHAOS TEST) ---
    const injectScaleProduct = async () => {
        await db.productos.put({
            id: 'SCALE-TEST-1',
            nombre: 'MANZANAS GALA (TEST)',
            codigo: '1010', // PLU
            precio: 5.00,
            stock: 100,
            tipoUnidad: 'peso',
            categoria: 'Frutas',
            jerarquia: null
        });
        Swal.fire('Inyectado', 'Producto "Manzanas" con PLU 1010 creado. (Código Scan: 201010015000)', 'success');
    };

    const injectCorruptProduct = async () => {
        await db.productos.put({
            id: 'CORRUPT-1',
            nombre: 'PRODUCTO GLITCH (CORRUPTO)',
            codigo: 'GLITCH',
            precio: 'NaN', // String NaN
            stock: null, // Null
            jerarquia: undefined
        });
        Swal.fire('Inyectado', 'Producto Corrupto creado. Busca "GLITCH" en POS para probar Crash-to-Reset.', 'warning');
    };

    const setNegativeStock = async () => {
        const p = await db.productos.orderBy('id').first();
        if (p) {
            await db.productos.update(p.id, { stock: -10 });
            Swal.fire('Stock Negativo', `Producto "${p.nombre}" set stock -10.`, 'info');
        } else {
            Swal.fire('Error', 'No hay productos para modificar.', 'error');
        }
    };

    return {
        handleCrearHarina,
        injectScaleProduct,
        injectCorruptProduct,
        setNegativeStock
    };
};
