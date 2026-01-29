// ✅ SYSTEM IMPLEMENTATION - V. 6.0 (MODULAR ARCHITECTURE)
// Archivo: src/hooks/store/usePOS.js
// Objetivo: Hook principal de orquestación.

import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useCajaEstado } from '../caja/useCajaEstado';
import { useCart } from './useCart';
import { useTicketManager } from './useTicketManager';
import { useSalesProcessor } from './useSalesProcessor'; // ♻️ RESTORED
import { useShiftManager } from './useShiftManager'; // 🆕 Module Import

export const usePOS = (
    usuario,
    configuracion,
    helpers, // { transaccionVenta, transaccionAnulacion, playSound, generarCorrelativo }
    contextos // { clientes, setClientes, actualizarSaldoCliente } - (Legacy/Unused but kept for signature compat)
) => {
    // 1. Live Queries (Lecturas globales)
    const ventas = useLiveQuery(() => db.ventas.toArray(), []) || [];
    const cortes = useLiveQuery(() => db.logs.where('tipo').equals('CORTE_Z').toArray(), []) || [];

    // 2. Estado de Caja (Contexto Global)
    const cajaEstado = useCajaEstado(); // { abrirCaja, cerrarSesionCaja, actualizarBalances, ... }

    // 3. Sub-Hooks (Módulos)

    // Módulo A: Carrito
    const {
        carrito, setCarrito, agregarAlCarrito, cambiarCantidadCarrito,
        eliminarDelCarrito, limpiarCarrito, cargarItemsAlCarrito, cambiarUnidadCarrito
    } = useCart({
        configuracion,
        playSound: helpers.playSound
    });

    // Módulo B: Tickets en Espera
    const {
        ticketsEspera, guardarEnEspera, recuperarDeEspera, eliminarTicketEspera
    } = useTicketManager(
        usuario,
        configuracion,
        carrito,
        setCarrito,
        helpers.playSound
    );

    // Módulo C: Procesador de Ventas (Transacciones)
    const {
        isProcessing: isSalesProcessing, registrarVenta, anularVenta, registrarAbono, sanearCuentaCliente
    } = useSalesProcessor(
        usuario,
        configuracion,
        helpers, // Pasa { playSound, transaccionVenta, ... }
        cajaEstado, // Pasa { abrirCaja, cerrarSesionCaja, actualizarBalances }
        carrito,
        setCarrito
    );

    // Módulo D: Gestión de Turnos (Apertura/Cierre)
    const {
        isShiftProcessing, abrirCajaPOS, cerrarCaja
    } = useShiftManager(
        usuario,
        { ...cajaEstado, playSound: helpers.playSound }
    );

    // 🔄 LIVE SYNC: Sincronización en tiempo real del Carrito
    // Detecta cambios en Inventario (Precio, Stock, Nombre) y actualiza la cesta automáticamente.
    const productos = helpers.productos || [];

    useEffect(() => {
        if (carrito.length === 0) return;

        try {
            let cambioDetectado = false;

            const nuevoCarrito = carrito.map(item => {
                const p = productos.find(prod => prod.id === item.id);
                if (!p) return item;

                // Guard Clauss for Data Integrity
                if (!p.jerarquia) throw new Error(`Producto ${p.nombre} corrupto (No jerarquía)`);

                // Recalcular Precio Esperado según Jerarquía Actual
                let precioEsperado = parseFloat(p.precio);

                if (item.unidadVenta === 'bulto') {
                    precioEsperado = parseFloat(p.jerarquia?.bulto?.precio || 0);
                } else if (item.unidadVenta === 'paquete') {
                    precioEsperado = parseFloat(p.jerarquia?.paquete?.precio || 0);
                } else if (item.unidadVenta === 'unidad' && p.jerarquia?.unidad?.activo) {
                    precioEsperado = parseFloat(p.jerarquia?.unidad?.precio || p.precio);
                } else if (item.tipoUnidad === 'peso') {
                    precioEsperado = parseFloat(p.precio);
                }

                // Datos actuales para comparación
                const stockActual = parseFloat(p.stock) || 0;
                const precioActualCarrito = parseFloat(item.precio) || 0;

                // Detectar Discrepancias
                const diffPrecio = Math.abs(precioActualCarrito - precioEsperado) > 0.001;
                const diffStock = Math.abs((parseFloat(item.stock) || 0) - stockActual) > 0.001;
                const diffNombre = item.nombre !== p.nombre;
                const diffJerarquiaVal = JSON.stringify(item.jerarquia) !== JSON.stringify(p.jerarquia);

                if (diffPrecio || diffStock || diffNombre || diffJerarquiaVal) {
                    cambioDetectado = true;
                    return {
                        ...item,
                        nombre: p.nombre,
                        imagen: p.imagen,
                        stock: stockActual,
                        precio: precioEsperado,
                        jerarquia: p.jerarquia,
                    };
                }
                return item;
            });

            if (cambioDetectado) {
                console.log("♻️ [POS] Sincronizando cesta con cambios de inventario...");
                setCarrito(nuevoCarrito);
            }
        } catch (error) {
            console.error("🔥 [CRASH-GUARD] Error crítico en sincronización de cesta:", error);
            // FAIL-SAFE: Reiniciar Cesta para evitar bloqueo
            setCarrito([]);
            if (helpers.playSound) helpers.playSound('ERROR');
        }

    }, [productos, carrito, setCarrito]);

    // Combined Processing State
    const isProcessing = isSalesProcessing || isShiftProcessing;

    return {
        // State & Data
        carrito,
        ventas,
        cortes,
        isProcessing,
        ticketsEspera,

        // Cart Actions
        agregarAlCarrito,
        cambiarCantidadCarrito,
        eliminarDelCarrito,
        limpiarCarrito,
        cargarItemsAlCarrito,
        cambiarUnidadCarrito,

        // Transaction Actions
        registrarVenta,
        anularVenta,
        registrarAbono,
        sanearCuentaCliente,

        // Cash Control Actions
        abrirCajaPOS,
        cerrarCaja,
        eliminarCorte: () => { }, // Placeholder

        // Ticket Actions
        guardarEnEspera,
        recuperarDeEspera,
        eliminarTicketEspera
    };
};