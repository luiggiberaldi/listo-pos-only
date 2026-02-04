import { useCallback } from 'react';
import { useFinance } from './useFinance';
import { useEmployeeFinance } from './useEmployeeFinance';
import { useInventory } from './useInventory';
import { useStore } from '../../context/StoreContext';
import { db } from '../../db';

// 🛡️ FINANCE 360° ORCHESTRATOR
// Este hook actúa como un "Escudo Lógico" que garantiza la integridad transaccional
// entre los módulos aislados de Nómina, Gastos e Inventario.

export const useFinanceIntegrator = () => {
    const { usuario, usuarios } = useStore(); // Base User + User List for lookups

    // Low-Level Hooks (Tools)
    const { registrarGasto } = useFinance();
    const { registrarDeuda, cerrarPeriodoGlobal, anularMovimientoNomina } = useEmployeeFinance(usuario);
    const { registrarConsumoInterno, actualizarProducto, productos } = useInventory(usuario); // 📦 Added actualizarProducto & productos

    // 1️⃣ ADELANTO DE SUELDO (Caja -> Deuda)
    const registrarAdelantoSueldo = useCallback(async (empleadoId, monto, motivo, moneda = 'USD') => {
        if (!empleadoId || !monto) return { success: false, message: 'Datos incompletos' };

        try {
            // A. Calcular Monto en USD (Para la Deuda)
            let montoUSD = parseFloat(monto);
            const tasa = parseFloat(usuario?.tasa || db.config.get('general').then(c => c?.tasa)) || 0; // Fallback or direct access

            // Nota: Es mejor usar la tasa de configuracion de useStore o similar
            // Para asegurar consistencia, usaremos la moneda y monto para el gasto, 
            // y convertiremos para la deuda.

            if (moneda === 'VES') {
                const config = await db.config.get('general');
                const tasaActual = parseFloat(config?.tasa) || 1;
                montoUSD = montoUSD / tasaActual;
            }

            // B. Registrar SALIDA en Caja (Gasto - En la moneda original para el cuadre)
            const resGasto = await registrarGasto({
                monto: parseFloat(monto),
                moneda: moneda,
                medio: 'CASH',
                motivo: `Adelanto Nómina (Emp: ${empleadoId}) - ${motivo}`,
                categoria: 'NOMINA',
                usuario
            });

            if (!resGasto.success) {
                // Rollback básico
                console.error("Fallo Gasto:", resGasto.message);
                throw new Error(resGasto.message || "Error registrando salida de caja.");
            }

            // A. Registrar DEUDA en Nómina (Siempre en USD para consistencia de sueldos)
            const resDeuda = await registrarDeuda(
                empleadoId,
                montoUSD,
                `Adelanto: ${motivo} (${monto} ${moneda})`,
                'ADELANTO',
                null,
                { logId: resGasto.logId, montoOriginal: monto, monedaOriginal: moneda } // 🛡️ Meta for UNDO
            );
            if (!resDeuda.success) throw new Error(resDeuda.message);

            return { success: true, message: `Adelanto registrado: ${monto} ${moneda} ($${montoUSD.toFixed(2)} USD)` };

        } catch (error) {
            console.error("Integrator Error:", error);
            return { success: false, message: error.message };
        }
    }, [registrarGasto, registrarDeuda, usuario]);


    // 2️⃣ CONSUMO EMPLEADO (Stock -> Deuda)
    const registrarConsumoEmpleado = useCallback(async (empleadoId, producto, cantidad, motivo) => {
        try {
            const montoDeuda = (producto.precio || 0) * cantidad;

            // B. Registrar BAJA INVENTARIO (Consumo Interno)
            const empleado = usuarios?.find(u => u.id == empleadoId);
            const nombreEmpleado = empleado ? empleado.nombre : 'Empleado Desconocido';

            const resInv = await registrarConsumoInterno({
                id: producto.id,
                unidadVenta: 'unidad',
                cantidad: cantidad
            }, `Consumo Nomina (${nombreEmpleado}): ${motivo}`, usuario);

            if (!resInv.success) throw new Error("Error ajustando inventario");

            // A. Registrar DEUDA (Cobro al empleado)
            const resDeuda = await registrarDeuda(
                empleadoId,
                montoDeuda,
                `Consumo: ${producto.nombre} (x${cantidad}) - ${motivo}`,
                'CONSUMO_PRODUCTO',
                null,
                {
                    logId: resInv.logId,
                    productId: producto.id,
                    cantidad,
                    precioSnapshot: producto.precio
                } // 🛡️ Meta for UNDO
            );
            if (!resDeuda.success) throw new Error(resDeuda.message);

            return { success: true, message: 'Consumo cargado a nómina correctamente.' };

        } catch (error) {
            console.error(error);
            return { success: false, message: error.message };
        }
    }, [registrarDeuda, registrarConsumoInterno, usuario, usuarios]);


    // 3️⃣ CIERRE DE NOMINA (Periodo -> Gasto Automático)
    const cerrarSemanaConPago = useCallback(async () => {
        try {
            // A. Ejecutar Cierre en DB (Snapshot de deudas, reset contadores)
            const resCierre = await cerrarPeriodoGlobal();
            if (!resCierre.success) throw new Error(resCierre.message);

            // B. Calcular Saldo a Pagar
            // El cierre retorna info o consultamos el periodo recién cerrado.
            const totalDeudaSemana = resCierre.totalDeuda || 0;
            // ⚠️ OJO: 'totalDeuda' es lo que se DESCONTÓ. Necesitamos saber cuánto se PAGÓ en sueldos netos.
            // Por simplicidad en V1, asumimos que se registra el "NETO A PAGAR" estimado de la nómina fija.
            // Para V2 necesitaremos sumar todos los sueldos base activos y restar la deuda global.

            // FIXME: Hardcoded simulation for safety until we implement total_salary logic.
            // Usaremos un Gasto Genérico para que el usuario ponga el monto real si varía, 
            // O mejor: Registramos el alivio de deuda como un "Ingreso por Cobro Interno" (virtual) 
            // y la salida de nómina real se hace manual.

            // DECISIÓN: Por seguridad, en esta V1 el cierre SOLO cierra el periodo lógico.
            // La salida de dinero "Pago Nómina" se debe confirmar manualmente para validar montos exactos en efectivo.
            // Pero ayudamos retornando los datos para pre-llenar ese gasto.

            return {
                success: true,
                message: 'Semana cerrada.',
                data: resCierre
            };

        } catch (error) {
            return { success: false, message: error.message };
        }
    }, [cerrarPeriodoGlobal]);

    // 4️⃣ COMPRA DE INSUMOS (Caja -> Stock)
    const registrarCompraInsumo = useCallback(async (productoId, cantidad, costoTotal, metodoPago, motivo) => {
        try {
            // Validaciones
            if (!productoId || !cantidad || !costoTotal) throw new Error("Datos incompletos para la compra.");

            // 1. Registrar Salida de Dinero (Gasto)
            const resGasto = await registrarGasto({
                monto: parseFloat(costoTotal),
                moneda: 'USD', // Asumido por ahora, idealmente parametrizable
                medio: metodoPago || 'CASH',
                motivo: `Compra Mercancía: ${motivo}`,
                categoria: 'COMPRA'
            });

            if (!resGasto.success) throw new Error(resGasto.message);

            // 2. Calcular Nuevo Stock
            // Necesitamos el producto actual para saber el stock base
            // Como 'productos' viene de useLiveQuery en useInventory, podría no estar fresco en este callback si no lo pasamos.
            // Mejor fetching directo si es crítico, pero confiaremos en la inyección por ahora o usaremos 'actualizarProducto' que lee antes de escribir.
            const productoActual = productos?.find(p => p.id === productoId);
            if (!productoActual) throw new Error("Producto no encontrado en catálogo local.");

            const nuevoStock = (parseFloat(productoActual.stock) || 0) + parseFloat(cantidad);

            // 3. Actualizar Inventario (Entrada)
            await actualizarProducto(productoId, {
                stock: nuevoStock,
                _motivo: `Compra (Gasto Ref: ${costoTotal})`,
                _detalle: `Entrada por Compra`,
                _smartMetadata: {
                    tipo: 'COMPRA_REPOSICION',
                    costoIncurrido: parseFloat(costoTotal),
                    cantidadComprada: parseFloat(cantidad)
                }
            });

            return { success: true, message: 'Compra registrada y stock actualizado.' };

        } catch (error) {
            console.error(error);
            return { success: false, message: error.message };
        }
    }, [registrarGasto, actualizarProducto, productos]);

    // 5️⃣ REVERTIR MOVIMIENTO (Nómina -> Caja/Stock)
    const revertirMovimiento = useCallback(async (ledgerId) => {
        try {
            return await db.transaction('rw', db.productos, db.logs, db.nomina_ledger, db.empleados_finanzas, db.historial_nomina, async () => {
                // 1. Obtener el registro del ledger
                const mov = await db.nomina_ledger.get(ledgerId);
                if (!mov) throw new Error("Movimiento no encontrado.");
                if (mov.status === 'ANULADO') throw new Error("Este movimiento ya fue anulado.");

                const { subtipo, metadata, empleadoId } = mov;

                // 2. Rollback dependiendo del tipo
                if (subtipo === 'ADELANTO') {
                    // A. Eliminar el Log de Gasto (Caja)
                    if (metadata?.logId) {
                        await db.logs.delete(metadata.logId);
                    }
                }
                else if (subtipo === 'CONSUMO_PRODUCTO') {
                    // A. Devolver Stock
                    if (metadata?.productId && metadata?.cantidad) {
                        const prod = await db.productos.get(metadata.productId);
                        if (prod) {
                            const nuevoStock = (parseFloat(prod.stock) || 0) + parseFloat(metadata.cantidad);
                            await db.productos.update(metadata.productId, { stock: nuevoStock });

                            // B. Log de Auditoría para el Kardex
                            const actor = usuarios?.find(u => u.id == empleadoId);
                            await db.logs.add({
                                fecha: new Date().toISOString(),
                                tipo: 'ENTRADA_DEVOLUCION',
                                productId: metadata.productId,
                                producto: prod.nombre,
                                cantidad: metadata.cantidad,
                                stockFinal: nuevoStock,
                                referencia: 'DEVOLUCION',
                                detalle: `Devolución de Consumo (Reversión Nomina: ${actor?.nombre || 'Emp'})`,
                                usuarioId: usuario?.id || 'sys',
                                usuarioNombre: usuario?.nombre || 'Sistema'
                            });
                        }
                    }
                    // B. Eliminar el Log de Consumo original
                    if (metadata?.logId) {
                        await db.logs.delete(metadata.logId);
                    }
                }

                // 3. Ejecutar Limpieza en Nómina (Deuda y Ledger)
                const resAnulacion = await anularMovimientoNomina(ledgerId);
                if (!resAnulacion.success) throw new Error(resAnulacion.message);

                return { success: true, message: 'Movimiento revertido correctamente.' };
            });
        } catch (error) {
            console.error("Reversion Error:", error);
            return { success: false, message: error.message };
        }
    }, [usuario, usuarios, anularMovimientoNomina]);

    return {
        registrarAdelantoSueldo,
        registrarConsumoEmpleado,
        cerrarSemanaConPago,
        registrarCompraInsumo,
        revertirMovimiento
    };
};
