import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { fixFloat, convertirABase } from '../../utils/mathUtils';
import { useRBAC, PERMISSIONS } from './useRBAC';

const DEFAULT_CATEGORIAS = ["General", "Víveres", "Bebidas", "Limpieza", "Otros"];

export const useInventory = (usuario, configuracion, registrarEventoSeguridad) => {

    // 🛡️ SECURITY LAYER (MIDDLEWARE)
    const { hasPermission } = useRBAC(usuario);

    // Helper para verificar permisos y lanzar error si falla
    const verify = (permiso, actionName) => {
        if (!hasPermission(permiso)) {
            const mensaje = `Intento bloqueado: ${actionName} por usuario ${usuario?.nombre || 'Desconocido'} (${usuario?.roleId || 'N/A'})`;
            console.warn(`⛔ [SECURITY] ${mensaje}`);

            // 📝 AUDIT TRAIL INTEGRATION
            if (typeof registrarEventoSeguridad === 'function') {
                registrarEventoSeguridad('ACCESO_DENEGADO', mensaje, 'WARNING', usuario?.nombre || 'System');
            }

            throw new Error(`ACCESO DENEGADO: No tienes permiso para ${actionName}.`);
        }
    };

    const productos = useLiveQuery(() => db.productos.toArray(), []) || [];
    const configData = useLiveQuery(() => db.config.get('general'), []);
    const categorias = configData?.categorias || DEFAULT_CATEGORIAS;

    const movimientos = useLiveQuery(
        () => db.logs
            .where('tipo')
            .anyOf('ENTRADA_INICIAL', 'ENTRADA_EDICION', 'ENTRADA_DEVOLUCION', 'SALIDA_VENTA', 'SALIDA_AJUSTE', 'PRODUCTO_ELIMINADO')
            .reverse()
            .toArray()
        , []) || [];

    // --- MOTOR DE PERSISTENCIA (DEXIE) ---

    // Internal helper for usage INSIDE transactions
    const logMovimientoInternal = async (tipo, productId, productoNombre, cant, stockFinal, ref, detalle, usuarioActor = null, metadata = null) => {
        const actor = usuarioActor || usuario;

        // 🛡️ Security Audit Context (Browser/Device info)
        const sysInfo = {
            ua: navigator.userAgent.substring(0, 100),
            page: window.location.hash || 'POS'
        };

        await db.logs.add({
            fecha: new Date().toISOString(),
            tipo,
            productId: productId || null,
            producto: productoNombre,
            cantidad: cant,
            stockFinal,
            referencia: ref,
            detalle,
            usuarioId: actor?.id || 'sys',
            usuarioNombre: actor?.nombre || 'Sistema',
            meta: metadata, // 🧠 Smart Kardex 2.0 Data
            sysInfo // 🔒 Security Trace
        });
    };

    const agregarProducto = async (n) => {
        verify(PERMISSIONS.INVENTORY_MANAGE, 'Crear Producto');
        await db.transaction('rw', db.productos, db.logs, async () => {
            const stockBase = parseFloat(n.stock) || 0;
            const prod = { ...n, stock: fixFloat(stockBase), id: Date.now() };
            await db.productos.put(prod);
            await logMovimientoInternal('ENTRADA_INICIAL', prod.id, prod.nombre, prod.stock, prod.stock, 'INICIO', 'Stock Inicial');
        });
    };

    const actualizarProducto = async (id, datos, _motivo) => {
        if (!hasPermission(PERMISSIONS.INVENTORY_MANAGE) && !hasPermission(PERMISSIONS.INVENTORY_ADJUST)) {
            throw new Error("Permisos insuficientes para modificar productos.");
        }

        const idKey = Number(id) || id;

        await db.transaction('rw', db.productos, db.logs, async () => {
            const prodAnterior = await db.productos.get(idKey);
            if (!prodAnterior) return;

            const stockAnterior = parseFloat(prodAnterior.stock) || 0;
            const nuevoStock = datos.stock !== undefined ? fixFloat(datos.stock) : stockAnterior;

            const nombreHaCambiado = datos.nombre && datos.nombre.trim() !== prodAnterior.nombre;

            await db.productos.update(idKey, { ...datos, stock: nuevoStock });

            // 🔄 CASCADE UPDATE: Si cambia el nombre, actualizar todo el historial (Opción 2)
            if (nombreHaCambiado) {
                const nuevoNombre = datos.nombre.trim();
                // 1. Actualizar por ID (Registros Modernos)
                await db.logs.where('productId').equals(idKey).modify({ producto: nuevoNombre });

                // 2. Actualizar por Nombre Antiguo (Registros Legacy sin ID)
                // Solo si el nombre anterior era válido para evitar updates masivos accidentales
                if (prodAnterior.nombre && prodAnterior.nombre !== 'Sin Nombre') {
                    await db.logs.where('producto').equals(prodAnterior.nombre).modify({ producto: nuevoNombre });
                }
            }

            if (Math.abs(nuevoStock - stockAnterior) > 0.001) {
                const diff = nuevoStock - stockAnterior;
                const tipoMov = diff > 0 ? 'ENTRADA_EDICION' : 'SALIDA_AJUSTE';

                // 🧠 Smart Kardex 2.1: Inferencia Jerárquica Automática
                let meta = datos._smartMetadata || null;

                // Combine quantity description with reason/note
                let detalleFinal = datos._detalle || '';
                const motivoReal = datos._motivo || _motivo;

                if (motivoReal) {
                    detalleFinal = detalleFinal ? `${detalleFinal} (${motivoReal})` : motivoReal;
                } else if (!detalleFinal) {
                    detalleFinal = 'Ajuste Manual';
                }

                if (!meta && prodAnterior.jerarquia) {
                    const absDiff = Math.abs(diff);
                    const { bulto, paquete } = prodAnterior.jerarquia;

                    // 1. Intentar inferir Bulto
                    if (bulto?.activo && absDiff >= parseFloat(bulto.contenido) && absDiff % parseFloat(bulto.contenido) < 0.01) {
                        const cantBultos = absDiff / parseFloat(bulto.contenido);
                        meta = {
                            unidad: 'bulto',
                            factor: parseFloat(bulto.contenido),
                            cantidadOriginal: cantBultos
                        };
                    }
                    // 2. Intentar inferir Paquete
                    else if (paquete?.activo && absDiff >= parseFloat(paquete.contenido) && absDiff % parseFloat(paquete.contenido) < 0.01) {
                        const cantPaquetes = absDiff / parseFloat(paquete.contenido);
                        meta = {
                            unidad: 'paquete',
                            factor: parseFloat(paquete.contenido),
                            cantidadOriginal: cantPaquetes
                        };
                    }
                }

                await logMovimientoInternal(tipoMov, prodAnterior.id, prodAnterior.nombre, Math.abs(diff), nuevoStock, 'MANUAL', detalleFinal, null, meta);
            }
        });
    };

    const eliminarProducto = async (id) => {
        verify(PERMISSIONS.INVENTORY_MANAGE, 'Eliminar Producto');
        const idKey = Number(id) || id;

        await db.transaction('rw', db.productos, db.logs, async () => {
            const prod = await db.productos.get(idKey);
            if (prod) {
                await logMovimientoInternal('PRODUCTO_ELIMINADO', prod.id, prod.nombre, 0, 0, 'SISTEMA', 'Producto eliminado del catálogo');
                await db.productos.delete(idKey);
            }
        });
    };

    const vaciarInventarioCompleto = async () => {
        verify(PERMISSIONS.SETTINGS_DB_RESET, 'Vaciar Inventario');
        await db.transaction('rw', db.productos, db.logs, async () => {
            await db.productos.clear();
            await db.logs.clear();
        });
    };

    const crearCategoria = async (nuevoNombre) => {
        verify(PERMISSIONS.INVENTORY_MANAGE, 'Crear Categoría');
        if (!nuevoNombre) return;
        const nombre = nuevoNombre.trim();

        await db.transaction('rw', db.config, async () => {
            const currentConfig = await db.config.get('general') || {};
            const catsActuales = currentConfig.categorias || DEFAULT_CATEGORIAS;
            if (catsActuales.some(c => c.toLowerCase() === nombre.toLowerCase())) return;
            await db.config.put({ ...currentConfig, key: 'general', categorias: [...catsActuales, nombre].sort() });
        });
    };

    const eliminarCategoria = async (nombre) => {
        verify(PERMISSIONS.INVENTORY_MANAGE, 'Eliminar Categoría');
        if (nombre === 'General' || nombre === 'Todas') return false;

        return await db.transaction('rw', db.config, db.productos, async () => {
            const currentConfig = await db.config.get('general') || {};
            const catsActuales = currentConfig.categorias || DEFAULT_CATEGORIAS;

            await db.config.put({ ...currentConfig, key: 'general', categorias: catsActuales.filter(c => c !== nombre) });
            await db.productos.where('categoria').equals(nombre).modify({ categoria: 'General' });
            return true;
        });
    };

    const transaccionVenta = async (itemsCarrito, usuarioVendedor) => {
        verify(PERMISSIONS.POS_ACCESS, 'Realizar Venta');
        const referenciaLog = "Venta POS";

        await db.transaction('rw', db.productos, db.logs, async () => {
            for (const item of itemsCarrito) {
                const idKey = Number(item.id) || item.id;
                const prod = await db.productos.get(idKey);

                if (prod) {
                    const factor = convertirABase(1, item.unidadVenta || 'unidad', prod.jerarquia);
                    const descuentoTotal = fixFloat(item.cantidad * factor);
                    const nuevoStock = fixFloat(prod.stock - descuentoTotal);

                    await db.productos.update(idKey, { stock: nuevoStock });

                    // 🧠 Smart Kardex 2.0 Metadata Construction
                    const smartMetadata = {
                        unidad: item.unidadVenta || 'unidad', // "BULTO"
                        factor: factor,                       // 20
                        cantidadOriginal: item.cantidad,      // 1
                        precioSnapshot: item.precio,          // Snapshot Price
                        costoSnapshot: prod.costo || 0        // Snapshot Cost
                    };

                    await logMovimientoInternal(
                        'SALIDA_VENTA',
                        prod.id,
                        prod.nombre,
                        descuentoTotal,
                        nuevoStock,
                        referenciaLog,
                        'Venta',
                        usuarioVendedor,
                        smartMetadata
                    );
                }
            }
        });
    };

    const transaccionAnulacion = async (itemsVenta, usuarioAnulador, motivo) => {
        verify(PERMISSIONS.POS_VOID_TICKET, 'Anular Venta'); // ✅ Fixed Permission Key
        await db.transaction('rw', db.productos, db.logs, async () => {
            for (const item of itemsVenta) {
                const idKey = Number(item.id) || item.id;
                const prod = await db.productos.get(idKey);
                if (prod) {
                    const factor = convertirABase(1, item.unidadVenta || 'unidad', prod.jerarquia);
                    const reintegroTotal = fixFloat(item.cantidad * factor);
                    const nuevoStock = fixFloat(prod.stock + reintegroTotal);

                    await db.productos.update(idKey, { stock: nuevoStock });

                    // 🧠 Smart Kardex 3.0: Hierarchical Restoration on Void
                    const smartMetadata = {
                        unidad: item.unidadVenta || 'unidad',
                        factor: factor,
                        cantidadOriginal: item.cantidad,
                        isVoid: true
                    };

                    await logMovimientoInternal(
                        'ENTRADA_DEVOLUCION',
                        prod.id,
                        prod.nombre,
                        reintegroTotal,
                        nuevoStock,
                        'POS',
                        motivo || 'Anulación', // ✅ Use Custom Reason
                        usuarioAnulador,
                        smartMetadata
                    );
                }
            }
        });
    };

    const eliminarMovimiento = async (id) => {
        verify(PERMISSIONS.INVENTORY_MANAGE, 'Eliminar Movimiento');
        await db.logs.delete(id);
    };

    const eliminarMovimientos = async (ids) => {
        verify(PERMISSIONS.INVENTORY_MANAGE, 'Eliminar Movimientos');
        if (!Array.isArray(ids)) return;
        await db.logs.bulkDelete(ids);
    };

    // --- 📦 CONSUMO INTERNO / MERMAS ---
    const registrarConsumoInterno = async (item, motivo, usuarioActor) => {
        verify(PERMISSIONS.INVENTORY_ADJUST, 'Registrar Consumo Interno');

        await db.transaction('rw', db.productos, db.logs, async () => {
            const idKey = Number(item.id) || item.id;
            const prod = await db.productos.get(idKey);

            if (prod) {
                // Cálculo de reducción de stock
                const factor = convertirABase(1, item.unidadVenta || 'unidad', prod.jerarquia);
                const cantidadTotal = fixFloat(item.cantidad * factor);
                const nuevoStock = fixFloat(prod.stock - cantidadTotal);

                await db.productos.update(idKey, { stock: nuevoStock });

                // Metadata para rastreo de costo
                const smartMetadata = {
                    unidad: item.unidadVenta || 'unidad',
                    factor: factor,
                    cantidadOriginal: item.cantidad,
                    costoSnapshot: prod.costo || 0, // Importante para reportes de pérdida
                    motivoExplicito: motivo
                };

                await logMovimientoInternal(
                    'CONSUMO_INTERNO',
                    prod.id,
                    prod.nombre,
                    cantidadTotal,
                    nuevoStock,
                    'INTERNO',
                    motivo,
                    usuarioActor,
                    smartMetadata
                );
            }
        });
        return { success: true };
    };

    return {
        productos,
        categorias,
        movimientos,
        agregarProducto,
        actualizarProducto,
        eliminarProducto,
        vaciarInventarioCompleto,
        crearCategoria,
        eliminarCategoria,
        transaccionVenta,
        transaccionAnulacion,
        eliminarMovimiento,
        eliminarMovimientos,
        registrarConsumoInterno
    };
};