import { useCallback } from 'react';
import { db } from '../../db';

// 🔧 Helper: Get current open period ID (or create one)
// [FIX] Resilient to missing periodos_nomina table (stale IndexedDB)
const _getPeriodoId = async () => {
    try {
        // Check if table exists before querying
        if (!db.periodos_nomina) {
            console.warn('⚠️ periodos_nomina table not defined in schema');
            return `auto-${Date.now()}`;
        }
        const abierto = await db.periodos_nomina.where('status').equals('ABIERTO').first();
        if (abierto) return abierto.id;
        // Auto-create if missing
        return await db.periodos_nomina.add({
            fechaInicio: new Date().toISOString(),
            fechaFin: null,
            totalPagado: 0,
            totalDeuda: 0,
            status: 'ABIERTO'
        });
    } catch (err) {
        // [FIX] If periodos_nomina doesn't exist in IDB (version mismatch),
        // fallback to a timestamp-based period so the rest of the flow works
        console.warn('⚠️ periodos_nomina not available, using fallback period:', err.message);
        return `auto-${Date.now()}`;
    }
};

export const useEmployeeFinance = (usuarioActivo) => {

    // Registrar Deuda (Adelanto de dinero o Consumo de producto)
    const registrarDeuda = useCallback(async (empleadoId, monto, detalle, tipo = 'ADELANTO', referenceId = null, metadata = {}) => {
        if (!empleadoId) return { success: false, message: 'ID de empleado requerido' };

        try {
            // [FIX] Build table list dynamically — periodos_nomina may not exist in older IDB versions
            const tables = [db.empleados_finanzas, db.historial_nomina, db.nomina_ledger];
            if (db.periodos_nomina) tables.push(db.periodos_nomina);
            return await db.transaction('rw', ...tables, async () => {
                // 1. Obtener o Crear registro financiero
                let finanzas = await db.empleados_finanzas.get(empleadoId);
                if (!finanzas) {
                    finanzas = { userId: empleadoId, sueldoBase: 0, deudaAcumulada: 0, favor: 0 };
                }

                // 2. Actualizar Deuda
                finanzas.deudaAcumulada = (finanzas.deudaAcumulada || 0) + monto;
                await db.empleados_finanzas.put(finanzas);

                // 3. Registrar en Historial Legacy
                const histId = await db.historial_nomina.add({
                    userId: empleadoId,
                    fecha: new Date().toISOString(),
                    tipo,
                    monto,
                    detalle,
                    referenceId,
                    metadata, // 🏷️ Added metadata for cross-refs
                    registradoPor: usuarioActivo?.id || 'SISTEMA'
                });

                // 4. 🆕 FINANCE 2.0 LEDGER (Immutable)
                const currentPeriodoId = await _getPeriodoId(); // [FIX BUG-2]
                const ledgerId = await db.nomina_ledger.add({
                    empleadoId,
                    tipo: 'DEUDA',
                    subtipo: tipo,
                    monto,
                    fecha: new Date().toISOString(),
                    detalle,
                    periodoId: currentPeriodoId, // [FIX BUG-2] Real period ID
                    status: 'PENDIENTE',
                    metadata, // 🏷️ Linked IDs (Expense, Product, Log)
                    historyId: histId,
                    registradoPor: usuarioActivo?.id || 'SISTEMA'
                });

                return { success: true, ledgerId, historyId: histId };
            });
        } catch (error) {
            console.error('Error registrando deuda:', error);
            return { success: false, message: error.message };
        }
    }, [usuarioActivo]);

    // 🆕 ANULAR MOVIMIENTO (Back-end Logic)
    const anularMovimientoNomina = useCallback(async (ledgerId) => {
        try {
            return await db.transaction('rw', db.empleados_finanzas, db.historial_nomina, db.nomina_ledger, async () => {
                const ledgerEntry = await db.nomina_ledger.get(ledgerId);
                if (!ledgerEntry) throw new Error("Registro no encontrado");
                if (ledgerEntry.status === 'ANULADO') throw new Error("Ya está anulado");

                // 1. Restar de la deuda acumulada
                const finanzas = await db.empleados_finanzas.get(ledgerEntry.empleadoId);
                if (finanzas) {
                    finanzas.deudaAcumulada = Math.max(0, (finanzas.deudaAcumulada || 0) - ledgerEntry.monto);
                    await db.empleados_finanzas.put(finanzas);
                }

                // 2. Marcar como Anulado
                await db.nomina_ledger.update(ledgerId, { status: 'ANULADO' });

                // 3. Marcar en historial legacy si existe
                if (ledgerEntry.historyId) {
                    await db.historial_nomina.update(ledgerEntry.historyId, { tipo: 'ANULADO', monto: 0 });
                }

                return { success: true };
            });
        } catch (error) {
            return { success: false, message: error.message };
        }
    }, []);

    // Pagar Nómina (Liquidar deuda y registrar salida de dinero)
    const procesarPagoNomina = useCallback(async (empleadoId, montoPagoReal, totalDeudaDescontada, detallesPago) => {
        try {
            const tables = [db.empleados_finanzas, db.historial_nomina, db.nomina_ledger];
            if (db.periodos_nomina) tables.push(db.periodos_nomina);
            await db.transaction('rw', ...tables, async () => {
                const finanzas = await db.empleados_finanzas.get(empleadoId);
                if (!finanzas) throw new Error("Empleado sin registro financiero");

                // 1. Resetear Deuda
                finanzas.deudaAcumulada = 0; // Se asume que se descuenta todo lo acumulado hasta el momento
                finanzas.ultimoPago = new Date().toISOString();
                await db.empleados_finanzas.put(finanzas);

                // 2. Registrar el Pago de Nómina (Salida Neta para la empresa)
                await db.historial_nomina.add({
                    userId: empleadoId,
                    fecha: new Date().toISOString(),
                    tipo: 'PAGO_NOMINA',
                    monto: montoPagoReal, // Lo que realmente salió de caja
                    detalle: `Pago de Nómina. Descontado: ${totalDeudaDescontada}. Notas: ${detallesPago}`,
                    registradoPor: usuarioActivo?.id
                });

                // 3. 🆕 FINANCE 2.0 LEDGER
                const currentPeriodoId = await _getPeriodoId(); // [FIX BUG-2]

                // [FIX BUG-3] Mark all pending debts as PAID
                await db.nomina_ledger
                    .where({ empleadoId, status: 'PENDIENTE' })
                    .modify({ status: 'PAGADO', pagadoEn: new Date().toISOString() });

                // Register the payment event
                await db.nomina_ledger.add({
                    empleadoId,
                    tipo: 'PAGO',
                    subtipo: 'NOMINA_LIQUIDACION',
                    monto: montoPagoReal,
                    deudaDescontada: totalDeudaDescontada,
                    fecha: new Date().toISOString(),
                    periodoId: currentPeriodoId, // [FIX BUG-2]
                    status: 'COMPLETED',
                    registradoPor: usuarioActivo?.id
                });
            });
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }, [usuarioActivo]);

    const obtenerFinanzas = useCallback(async (empleadoId) => {
        const datos = await db.empleados_finanzas.get(empleadoId);
        return datos || { userId: empleadoId, sueldoBase: 0, deudaAcumulada: 0, favor: 0 };
    }, []);

    const actualizarConfiguracion = useCallback(async (empleadoId, config) => {
        // config: { sueldoBase, frecuenciaPago }
        // Mejor usamos update o get+put
        let current = await db.empleados_finanzas.get(empleadoId);
        if (!current) current = { userId: empleadoId, deudaAcumulada: 0, ...config };
        else current = { ...current, ...config };

        await db.empleados_finanzas.put(current);
        return { success: true };
    }, []);

    // 🆕 Cierre de Periodo (Reiniciar Contadores)
    const cerrarPeriodo = useCallback(async (empleadoId, pinAdmin) => {
        try {
            const tables = [db.empleados_finanzas, db.historial_nomina, db.nomina_ledger];
            if (db.periodos_nomina) tables.push(db.periodos_nomina);
            await db.transaction('rw', ...tables, async () => {
                const finanzas = await db.empleados_finanzas.get(empleadoId);
                if (!finanzas || finanzas.deudaAcumulada === 0) return; // Nada que cerrar

                const deudaCerrada = finanzas.deudaAcumulada;
                const currentPeriodoId = await _getPeriodoId(); // [FIX BUG-2]

                // 1. Resetear Deuda de la semana/periodo
                finanzas.deudaAcumulada = 0;
                finanzas.ultimoCierre = new Date().toISOString();
                await db.empleados_finanzas.put(finanzas);

                // 2. Log de Cierre (Legacy)
                await db.historial_nomina.add({
                    userId: empleadoId,
                    fecha: new Date().toISOString(),
                    tipo: 'CIERRE_PERIODO',
                    monto: 0,
                    detalle: `Cierre de Periodo. Deuda Archivada: $${deudaCerrada.toFixed(2)}`,
                    registradoPor: usuarioActivo?.id || 'ADMIN'
                });

                // 3. [FIX BUG-1] Write to Ledger too
                await db.nomina_ledger.add({
                    empleadoId,
                    tipo: 'CIERRE',
                    subtipo: 'PERIODO_INDIVIDUAL',
                    monto: 0,
                    deudaArchivada: deudaCerrada,
                    fecha: new Date().toISOString(),
                    periodoId: currentPeriodoId,
                    status: 'COMPLETED',
                    registradoPor: usuarioActivo?.id || 'ADMIN'
                });

                // [FIX BUG-3] Mark pending debts as PAID for this employee
                await db.nomina_ledger
                    .where({ empleadoId, status: 'PENDIENTE' })
                    .modify({ status: 'PAGADO', pagadoEn: new Date().toISOString() });
            });
            return { success: true };
        } catch (error) {
            console.error("Error cerrando periodo:", error);
            return { success: false, message: error.message };
        }
    }, [usuarioActivo]);

    // 🗓️ GESTIÓN DE PERIODOS
    const obtenerPeriodoActual = async () => {
        try {
            if (!db.periodos_nomina) return null;
            const abierto = await db.periodos_nomina.where('status').equals('ABIERTO').first();
            if (abierto) return abierto;

            // Si no hay abierto, creamos uno nuevo AUTO
            const nuevoId = await db.periodos_nomina.add({
                fechaInicio: new Date().toISOString(),
                fechaFin: null,
                totalPagado: 0,
                totalDeuda: 0,
                status: 'ABIERTO'
            });
            return await db.periodos_nomina.get(nuevoId);
        } catch (err) {
            console.warn('⚠️ obtenerPeriodoActual failed:', err.message);
            return null;
        }
    };

    // 🆕 Cierre de Periodo GLOBAL (Finance 2.0)
    const cerrarPeriodoGlobal = useCallback(async (pinAdmin) => {
        try {
            const tables = [db.empleados_finanzas, db.historial_nomina, db.nomina_ledger];
            if (db.periodos_nomina) tables.push(db.periodos_nomina);
            const closureMetrics = await db.transaction('rw', ...tables, async () => {
                const periodo = await obtenerPeriodoActual();
                if (!periodo) throw new Error("No hay periodo abierto para cerrar.");

                // 1. Obtener todos los empleados con finanzas
                const todos = await db.empleados_finanzas.toArray();
                const totalSueldoBase = todos.reduce((acc, e) => acc + (parseFloat(e.sueldoBase) || 0), 0);
                const totalDeudaPeriodo = todos.reduce((acc, e) => acc + (parseFloat(e.deudaAcumulada) || 0), 0);
                const netoAPagar = Math.max(0, totalSueldoBase - totalDeudaPeriodo);

                // 2. Cerrar Periodo en DB
                await db.periodos_nomina.update(periodo.id, {
                    fechaFin: new Date().toISOString(),
                    status: 'CERRADO',
                    totalDeuda: totalDeudaPeriodo,
                    totalSueldoBase,
                    netoAPagar
                });

                // 3. Resetear Deudas de Empleados (Clean Slate para la nueva semana)
                await db.empleados_finanzas.toCollection().modify({
                    deudaAcumulada: 0,
                    ultimoCierre: new Date().toISOString()
                });

                // 4. Crear Log de Auditoría
                await db.historial_nomina.add({
                    userId: 'SYSTEM',
                    fecha: new Date().toISOString(),
                    tipo: 'CIERRE_GLOBAL',
                    monto: netoAPagar,
                    detalle: `Cierre Periodo #${periodo.id}. Sueldo: $${totalSueldoBase} | Desc: $${totalDeudaPeriodo} | Neto: $${netoAPagar}`,
                    registradoPor: usuarioActivo?.id || 'ADMIN'
                });

                return { totalSueldoBase, totalDeuda: totalDeudaPeriodo, netoAPagar, periodoId: periodo.id };
            });

            return { success: true, message: 'Periodo cerrado y contadores reiniciados.', metrics: closureMetrics };
        } catch (error) {
            console.error("Error cerrando periodo:", error);
            return { success: false, message: error.message };
        }
    }, [usuarioActivo]);

    // 🆕 Obtener historial (Filtrado por Periodo Actual) [FIX BUG-4]
    const obtenerHistorial = useCallback(async (empleadoId) => {
        try {
            const currentPeriodoId = await _getPeriodoId();

            // Filter by employee AND current period
            const ledger = await db.nomina_ledger
                .where('[empleadoId+periodoId]')
                .equals([empleadoId, currentPeriodoId])
                .reverse()
                .sortBy('fecha');

            return ledger.map(entry => ({
                id: entry.historyId || `ledger-${entry.id}`,
                ledgerId: entry.id, // Fundamental para el UNDO
                fecha: entry.fecha,
                tipo: entry.subtipo || entry.tipo,
                monto: entry.monto,
                detalle: entry.detalle,
                status: entry.status // 'PENDIENTE', 'ANULADO', 'PAGADO'
            }));
        } catch (err) {
            console.warn('⚠️ obtenerHistorial (ledger) failed, falling back to historial_nomina:', err.message);
            // Fallback to legacy historial_nomina table
            const legacy = await db.historial_nomina
                .where('userId').equals(empleadoId)
                .reverse()
                .sortBy('fecha');
            return legacy.map(entry => ({
                id: entry.id,
                ledgerId: null,
                fecha: entry.fecha,
                tipo: entry.tipo,
                monto: entry.monto,
                detalle: entry.detalle,
                status: 'LEGACY'
            }));
        }
    }, []);

    // 🛡️ VALIDAR CAPACIDAD DE ENDEUDAMIENTO
    const validarCapacidadEndeudamiento = useCallback(async (empleadoId, montoNuevo) => {
        const finanzas = await db.empleados_finanzas.get(empleadoId);

        // Si no tiene registro, técnicamente su sueldo es 0, así que no puede endeudarse.
        // Pero para flexibilidad, si no existe el registro, asumimos que no hay config y retornamos false con mensaje.
        if (!finanzas) return { puede: false, mensaje: 'El empleado no tiene configuración financiera (Sueldo Base).' };

        const sueldo = parseFloat(finanzas.sueldoBase) || 0;
        const deudaActual = parseFloat(finanzas.deudaAcumulada) || 0;
        const nuevoTotal = deudaActual + montoNuevo;

        if (sueldo <= 0) {
            return { puede: false, mensaje: 'El empleado no tiene un sueldo base asignado para cubrir deudas.' };
        }

        if (nuevoTotal > sueldo) {
            const disponible = Math.max(0, sueldo - deudaActual);
            return {
                puede: false,
                mensaje: `El monto excede el sueldo disponible.`,
                detalles: { sueldo, deudaActual, disponible, nuevoTotal }
            };
        }

        return { puede: true, detalles: { sueldo, deudaActual } };
    }, []);

    return {
        registrarDeuda,
        procesarPagoNomina,
        obtenerFinanzas,
        actualizarConfiguracion,
        cerrarPeriodo, // Legacy (Individual)
        cerrarPeriodoGlobal, // 🆕 V2 (Global)
        anularMovimientoNomina,
        obtenerHistorial,
        obtenerPeriodoActual, // Exposed for UI
        validarCapacidadEndeudamiento // 🛡️ Exposed
    };
};
