import { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { PERMISOS } from '../store/useRBAC';

export const usePosActions = (
    { productos, carrito, agregarAlCarrito, eliminarDelCarrito, cambiarCantidadCarrito, limpiarCarrito, configuracion, playSound, cajaAbierta, isProcessing, buscarEnEspera, guardarEnEspera, cambiarUnidadCarrito },
    { ejecutarAccionSegura, abrirPago, abrirPesaje, abrirJerarquia, toggleAyuda, setBusqueda, setSelectedIndex, searchInputRef }
) => {
    const [multiplicadorPendiente, setMultiplicadorPendiente] = useState(1);

    const actions = useMemo(() => ({
        limpiar: () => {
            if (carrito.length === 0 || isProcessing) return;
            ejecutarAccionSegura({
                permiso: PERMISOS.POS_VOID_TICKET,
                nombreAccion: 'Vaciar Cesta Completa',
                accion: () => {
                    Swal.fire({
                        title: '¿Vaciar Cesta?', text: 'Se eliminarán todos los productos.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, vaciar'
                    }).then((r) => { if (r.isConfirmed) limpiarCarrito(); });
                }
            });
        },
        cobrar: () => {
            if (carrito.length === 0 || isProcessing) return;

            if (configuracion && !configuracion.permitirSinStock) {
                const consumos = {};
                for (const item of carrito) {
                    const id = item.id;
                    if (item.tipoUnidad === 'peso') continue;
                    let factor = 1;
                    if (item.unitType === 'bulto' || item.unidadVenta === 'bulto') {
                        factor = parseFloat(item.jerarquia?.bulto?.contenido || 1);
                        if (item.jerarquia?.paquete?.activo) factor *= parseFloat(item.jerarquia?.paquete?.contenido || 1);
                    } else if (item.unitType === 'paquete' || item.unidadVenta === 'paquete') {
                        factor = parseFloat(item.jerarquia?.paquete?.contenido || 1);
                    }
                    if (!consumos[id]) consumos[id] = { req: 0, avail: parseFloat(item.stock || 0), name: item.nombre };
                    consumos[id].req += item.cantidad * factor;
                }
                for (const id in consumos) {
                    const c = consumos[id];
                    if (c.req > c.avail + 0.001) {
                        Swal.fire('Stock Insuficiente', `${c.name} (Falta ${(c.req - c.avail).toFixed(2)} Unds)`, 'error');
                        return;
                    }
                }
            }
            abrirPago();
        },
        espera: async (totalUSD) => {
            if (carrito.length === 0) return;
            const { value: nota } = await Swal.fire({ title: 'Poner en Espera', input: 'text', inputPlaceholder: 'Nota opcional...', showCancelButton: true, confirmButtonText: 'Guardar', confirmButtonColor: '#f97316' });

            if (nota !== undefined) {
                // 🏗️ CONSTRUCT FULL TICKET OBJECT (Fixes "Missing Data")
                const ticketCompleto = {
                    id: Date.now(), // Generate ID
                    fecha: new Date().toISOString(),
                    items: [...carrito], // Clone items
                    totalSnapshot: totalUSD,
                    tasaSnapshot: configuracion?.tasa || 0,
                    nota: nota || '',
                    cliente: null, // Basic version
                    usuarioNombre: 'Cajero' // Placeholder until context is injected
                };

                guardarEnEspera(ticketCompleto);
                limpiarCarrito(); // Ensure we clear after saving
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Ticket en Espera', timer: 2000, showConfirmButton: false });
            }
        },
        cambiarCant: (idx, cant) => {
            if (isProcessing) return;
            const item = carrito[idx];
            if (!item) return;
            const minQty = item.tipoUnidad === 'peso' ? 0.005 : 1;
            let cantidadSegura = Math.max(cant, minQty);
            if (item.tipoUnidad === 'peso') cantidadSegura = Math.round(cantidadSegura * 1000) / 1000;
            else cantidadSegura = Math.floor(cantidadSegura);
            cambiarCantidadCarrito(idx, cantidadSegura);
        },
        eliminarItem: (idx) => {
            if (isProcessing) return;
            const item = carrito[idx];
            ejecutarAccionSegura({
                permiso: PERMISOS.POS_VOID_ITEM,
                nombreAccion: `Quitar ${item.nombre}`,
                accion: () => {
                    eliminarDelCarrito(idx);
                    if (playSound) playSound('TRASH');
                }
            });
        },
        prepararAgregar: (producto) => {
            if (!cajaAbierta || isProcessing) return;
            const cantidadFinal = multiplicadorPendiente;
            if (multiplicadorPendiente !== 1) setMultiplicadorPendiente(1);

            if (producto.tipoUnidad === 'peso') {
                setBusqueda('');
                abrirPesaje(producto);
                searchInputRef.current?.blur();
                return;
            }

            const pref = producto.defaultScannedUnit;
            let autoAdd = false;
            let unitType = 'unidad';
            let finalPrice = 0;

            if (pref === 'UND' && producto.jerarquia?.unidad?.activo && producto.jerarquia.unidad.seVende !== false) {
                autoAdd = true; unitType = 'unidad'; finalPrice = parseFloat(producto.jerarquia.unidad.precio);
            } else if (pref === 'PAQ' && producto.jerarquia?.paquete?.activo && producto.jerarquia.paquete.seVende !== false) {
                autoAdd = true; unitType = 'paquete'; finalPrice = parseFloat(producto.jerarquia.paquete.precio);
            } else if (pref === 'BUL' && producto.jerarquia?.bulto?.activo && producto.jerarquia.bulto.seVende !== false) {
                autoAdd = true; unitType = 'bulto'; finalPrice = parseFloat(producto.jerarquia.bulto.precio);
            }

            if (!autoAdd) {
                const validOptions = [];
                if (producto.jerarquia?.unidad?.activo && producto.jerarquia.unidad.seVende !== false) validOptions.push({ type: 'unidad', price: producto.jerarquia.unidad.precio });
                if (producto.jerarquia?.paquete?.activo && producto.jerarquia.paquete.seVende !== false) validOptions.push({ type: 'paquete', price: producto.jerarquia.paquete.precio });
                if (producto.jerarquia?.bulto?.activo && producto.jerarquia.bulto.seVende !== false) validOptions.push({ type: 'bulto', price: producto.jerarquia.bulto.precio });
                if (validOptions.length === 1) {
                    autoAdd = true; unitType = validOptions[0].type; finalPrice = parseFloat(validOptions[0].price);
                }
            }

            if (autoAdd && !isNaN(finalPrice) && finalPrice > 0) {
                if (playSound) playSound('SCAN');
                setBusqueda('');
                agregarAlCarrito(producto, cantidadFinal, unitType, finalPrice);
                setSelectedIndex(0);
                setTimeout(() => { if (searchInputRef.current) searchInputRef.current.blur(); }, 10);
                return;
            }

            if (!autoAdd && (producto?.jerarquia?.bulto?.activo || producto?.jerarquia?.paquete?.activo)) {
                setBusqueda('');
                abrirJerarquia(producto);
                searchInputRef.current?.blur();
                return;
            }

            const precioBase = (!isNaN(parseFloat(producto.precio)) && parseFloat(producto.precio) > 0) ? parseFloat(producto.precio) : 0;
            if (playSound) playSound('SCAN');
            agregarAlCarrito(producto, cantidadFinal, 'unidad', precioBase);
            setBusqueda(''); setSelectedIndex(0);
            setTimeout(() => { if (searchInputRef.current) searchInputRef.current.blur(); }, 10);
        },
        ventaRapida: (montoBs, aplicaIva) => {
            const tasa = configuracion.tasa || 1;
            const precioBaseUSD = parseFloat((montoBs / tasa).toFixed(6));
            const nombreProd = aplicaIva ? 'VARIOS (GRAVADO)' : 'VARIOS (EXENTO)';
            const productoRapido = { id: `QUICK-${Date.now()}`, nombre: nombreProd, tipoUnidad: 'unidad', stock: 999999, codigo: 'QUICK', aplicaIva: aplicaIva, exento: !aplicaIva };
            if (playSound) playSound('SCAN');
            agregarAlCarrito(productoRapido, multiplicadorPendiente, 'unidad', precioBaseUSD);
            setMultiplicadorPendiente(1); setBusqueda(''); setSelectedIndex(0);
            setTimeout(() => searchInputRef.current?.blur(), 10);
        },
        playSound,
        agregarAlCarrito,
        eliminarDelCarrito,
        cambiarUnidad: cambiarUnidadCarrito,
        autoAgregarPesado: (producto, peso) => {
            if (!cajaAbierta || isProcessing) return;
            // Limpia el buscador y agrega directamente
            setBusqueda('');
            if (playSound) playSound('SCAN');
            agregarAlCarrito(producto, peso, 'peso', parseFloat(producto.precio));
            setSelectedIndex(0);
            setTimeout(() => { if (searchInputRef.current) searchInputRef.current.blur(); }, 10);
        },
        toggleAyuda
    }), [carrito, isProcessing, configuracion, cajaAbierta, multiplicadorPendiente, searchInputRef, playSound, agregarAlCarrito, eliminarDelCarrito, cambiarCantidadCarrito, cambiarUnidadCarrito, limpiarCarrito, ejecutarAccionSegura, abrirPago, abrirPesaje, abrirJerarquia, toggleAyuda, setBusqueda, setSelectedIndex, buscarEnEspera, guardarEnEspera]);

    // 📡 [SCANNER ENGINE]
    useEffect(() => {
        const checkScanner = async () => {
            // Necesitamos acceder a 'busqueda' de alguna forma o pasarla como prop.
            // Aquí 'setBusqueda' es una función, no el valor.
            // Re-estructuraremos para que usePosActions reciba el valor de busqueda también.
        };
    }, []);

    return { actions, multiplicadorPendiente, setMultiplicadorPendiente };
};
