import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ghostMiddleware } from '../utils/ghost/ghostMiddleware';
import Swal from 'sweetalert2';
import { useConfigStore } from './useConfigStore';

export const useCartStore = create(
    ghostMiddleware(persist(
        (set, get) => ({
            carrito: [],

            limpiarCarrito: () => {
                set({ carrito: [] });
                // playSound logic should be triggered by UI component or subscriber, not here ideally.
                // But for migration speed, we can assume the UI handles sound on success.
            },

            eliminarDelCarrito: (idx) => {
                set((state) => ({
                    carrito: state.carrito.filter((_, i) => i !== idx)
                }));
            },

            agregarAlCarrito: (producto, cantidad = 1, unidad = 'unidad', precioOverride = null) => {
                const state = get();
                const config = useConfigStore.getState().configuracion; // 💉 Dependency Injection

                const precioFinal = precioOverride !== null ? precioOverride : producto.precio;
                const permitirSinStock = config?.permitirSinStock;
                const stockActual = parseFloat(producto.stock) || 0;

                let factor = 1;
                if (unidad === 'bulto') factor = parseFloat(producto.jerarquia?.bulto?.contenido || 1);
                else if (unidad === 'paquete') factor = parseFloat(producto.jerarquia?.paquete?.contenido || 1);

                // 1. Snapshot Current State
                const prevCarrito = state.carrito;
                const indiceExistente = prevCarrito.findIndex(item => item.id === producto.id && (item.unidadVenta || 'unidad') === unidad);
                const cantidadActualEnLinea = indiceExistente >= 0 ? prevCarrito[indiceExistente].cantidad : 0;
                const cantidadNuevaTotal = cantidadActualEnLinea + cantidad;

                // 🚀 AUTO-CONVERSIÓN LOGIC
                let unidadDestino = unidad;
                let cantidadDestino = cantidadNuevaTotal;
                let precioDestino = precioFinal;
                let seTransformo = false;
                let factorDestino = factor;

                if (unidad === 'unidad') {
                    const bulto = producto.jerarquia?.bulto;
                    const paquete = producto.jerarquia?.paquete;

                    if (bulto?.activo && bulto.seVende !== false && bulto.contenido > 1) {
                        const cont = parseFloat(bulto.contenido);
                        if (Math.abs(cantidadNuevaTotal - cont) < 0.01 || cantidadNuevaTotal > cont) {
                            unidadDestino = 'bulto';
                            cantidadDestino = cantidadNuevaTotal / cont;
                            precioDestino = parseFloat(bulto.precio);
                            factorDestino = cont;
                            seTransformo = true;
                        }
                    }

                    if (!seTransformo && paquete?.activo && paquete.seVende !== false && paquete.contenido > 1) {
                        const cont = parseFloat(paquete.contenido);
                        if (Math.abs(cantidadNuevaTotal - cont) < 0.01 || cantidadNuevaTotal > cont) {
                            unidadDestino = 'paquete';
                            cantidadDestino = cantidadNuevaTotal / cont;
                            precioDestino = parseFloat(paquete.precio);
                            factorDestino = cont;
                            seTransformo = true;
                        }
                    }
                }

                // 3. Validation
                const itemsOtros = prevCarrito.filter((_, i) => i !== indiceExistente && _.id === producto.id);
                let consumoOtros = 0;
                itemsOtros.forEach(i => {
                    let f = 1;
                    if (i.unidadVenta === 'bulto') f = parseFloat(i.jerarquia?.bulto?.contenido || 1);
                    else if (i.unidadVenta === 'paquete') f = parseFloat(i.jerarquia?.paquete?.contenido || 1);
                    consumoOtros += (i.cantidad * f);
                });

                // Calculate total consumption
                const consumoNuevoOperacion = seTransformo ? (cantidadDestino * factorDestino) : (cantidad * factor); // Logic check: cantidadDestino here is TOTAL, but wait.
                // If seTransformo: cantidadDestino = (Total Units) / Factor. 
                // So (cantidadDestino * Factor) = Total Units.
                // The consumption of this line IS the Total Units.
                // Consumption of OTHER lines is added to this.

                let consumoTotalProyectado = consumoOtros;
                // Logic fix from useCart.js analysis:
                // 'cantidadNuevaTotal' was used to derive 'cantidadDestino'.
                // So 'cantidadDestino' represents the OLD + NEW amount for this line.
                // Thus we just add it to 'consumoOtros'.
                consumoTotalProyectado += (cantidadDestino * factorDestino);

                if (producto.tipoUnidad !== 'peso') {
                    if (consumoTotalProyectado > stockActual) {
                        if (!permitirSinStock) {
                            Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: '¡No hay Stock!', timer: 3000, showConfirmButton: false });
                            return; // Abort
                        } else {
                            Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Stock Negativo', timer: 2000, showConfirmButton: false });
                        }
                    }
                }

                // 4. Construct New Cart
                let nuevoCarrito = [...prevCarrito];

                if (seTransformo && indiceExistente >= 0) {
                    nuevoCarrito = nuevoCarrito.filter((_, i) => i !== indiceExistente);
                }

                const indiceDestino = nuevoCarrito.findIndex(item => item.id === producto.id && (item.unidadVenta || 'unidad') === unidadDestino);

                if (indiceDestino >= 0) {
                    const itemDest = nuevoCarrito[indiceDestino];

                    // 🐛 FIX: Exponential Quantity Bug (Double Counting)
                    // If NO transformation happened, 'cantidadDestino' is ALREADY the Total (Old + New).
                    // So we should just SET it.
                    // If transformation happened, 'cantidadDestino' is the converted New Total for this line,
                    // but since we might be merging into a DIFFERENT existing line (e.g. Unit -> Existing Box), we ADD.

                    const nuevaCantFinal = seTransformo ? (itemDest.cantidad + cantidadDestino) : cantidadDestino;
                    nuevoCarrito[indiceDestino] = { ...itemDest, cantidad: nuevaCantFinal };
                } else {
                    if (!seTransformo && indiceExistente >= 0) {
                        // Update existing line logic (Should be covered by indiceDestino >= 0 ideally, but just in case)
                        nuevoCarrito[indiceExistente] = { ...nuevoCarrito[indiceExistente], cantidad: cantidadDestino };
                    } else {
                        // New Line
                        nuevoCarrito.push({
                            ...producto,
                            cantidad: cantidadDestino,
                            precio: precioDestino,
                            unidadVenta: unidadDestino
                        });
                    }
                }

                set({ carrito: nuevoCarrito });

                if (seTransformo) {
                    const Toast = Swal.mixin({ toast: true, position: 'top', showConfirmButton: false, timer: 2000 });
                    Toast.fire({
                        icon: 'success',
                        title: `✨ ¡Transformado a ${unidadDestino.toUpperCase()}!`,
                        background: '#f0fdf4',
                        color: '#166534'
                    });
                }
            },

            cambiarCantidadCarrito: (idx, nuevaCant) => {
                if (nuevaCant <= 0) {
                    get().eliminarDelCarrito(idx);
                    return;
                }

                const state = get();
                const config = useConfigStore.getState().configuracion;

                const newCart = state.carrito.map((it, i) => {
                    if (i !== idx) return it;

                    const permitirSinStock = config?.permitirSinStock;
                    const stockActual = parseFloat(it.stock) || 0;

                    let factor = 1;
                    if (it.unidadVenta === 'bulto') factor = parseFloat(it.jerarquia?.bulto?.contenido || 1);
                    else if (it.unidadVenta === 'paquete') factor = parseFloat(it.jerarquia?.paquete?.contenido || 1);

                    const otrosItems = state.carrito.filter((_, index) => index !== idx && _.id === it.id);
                    let consumoOtros = 0;
                    otrosItems.forEach(o => {
                        let f = 1;
                        if (o.unidadVenta === 'bulto') f = parseFloat(o.jerarquia?.bulto?.contenido || 1);
                        else if (o.unidadVenta === 'paquete') f = parseFloat(o.jerarquia?.paquete?.contenido || 1);
                        consumoOtros += (o.cantidad * f);
                    });

                    const nuevoConsumoEsteItem = nuevaCant * factor;
                    const totalProyectado = consumoOtros + nuevoConsumoEsteItem;

                    if (it.tipoUnidad !== 'peso' && totalProyectado > stockActual) {
                        if (!permitirSinStock) {
                            const restanteParaEsteItem = stockActual - consumoOtros;
                            const maximoPermitido = Math.floor(restanteParaEsteItem / factor);
                            Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Stock Insuficiente', text: `Máximo: ${maximoPermitido}`, timer: 3000, showConfirmButton: false });
                            return { ...it, cantidad: maximoPermitido };
                        } else {
                            Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Stock Negativo', timer: 2000, showConfirmButton: false });
                        }
                    }

                    return { ...it, cantidad: nuevaCant };
                });

                set({ carrito: newCart });
            },

            // ♻️ PORTED LOGIC: CAMBIAR UNIDAD
            cambiarUnidadCarrito: (idx, nuevaUnidad) => {
                set(state => {
                    const prev = state.carrito;
                    const item = prev[idx];
                    if (!item) return { carrito: prev };

                    let nuevoPrecio = item.precio;
                    let nuevoFactor = 1;

                    if (nuevaUnidad === 'bulto') {
                        nuevoPrecio = parseFloat(item.jerarquia?.bulto?.precio || 0);
                        nuevoFactor = parseFloat(item.jerarquia?.bulto?.contenido || 1);
                    } else if (nuevaUnidad === 'paquete') {
                        nuevoPrecio = parseFloat(item.jerarquia?.paquete?.precio || 0);
                        nuevoFactor = parseFloat(item.jerarquia?.paquete?.contenido || 1);
                    } else {
                        nuevoPrecio = parseFloat(item.jerarquia?.unidad?.precio || item.precio);
                        nuevoFactor = 1;
                    }

                    // Validation
                    const config = useConfigStore.getState().configuracion;
                    const permitirSinStock = config?.permitirSinStock;
                    const stockActual = parseFloat(item.stock) || 0;

                    const otrosItems = prev.filter((_, i) => i !== idx && _.id === item.id);
                    let consumoOtros = 0;
                    otrosItems.forEach(o => {
                        let f = 1;
                        if (o.unidadVenta === 'bulto') f = parseFloat(o.jerarquia?.bulto?.contenido || 1);
                        else if (o.unidadVenta === 'paquete') f = parseFloat(o.jerarquia?.paquete?.contenido || 1);
                        consumoOtros += (o.cantidad * f);
                    });

                    const consumoNuevo = item.cantidad * nuevoFactor;

                    if (item.tipoUnidad !== 'peso' && (consumoOtros + consumoNuevo) > stockActual) {
                        if (!permitirSinStock) {
                            Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Stock Insuficiente', text: 'No puedes cambiar a una unidad mayor.', timer: 3000, showConfirmButton: false });
                            return { carrito: prev };
                        } else {
                            Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Stock Negativo', timer: 2000, showConfirmButton: false });
                        }
                    }

                    const nuevoCarrito = [...prev];
                    const indiceDestino = nuevoCarrito.findIndex((it, i) => i !== idx && it.id === item.id && (it.unidadVenta || 'unidad') === nuevaUnidad);

                    if (indiceDestino >= 0) {
                        const itemDest = nuevoCarrito[indiceDestino];
                        const itemOriginal = nuevoCarrito[idx];
                        nuevoCarrito[indiceDestino] = {
                            ...itemDest,
                            cantidad: itemDest.cantidad + itemOriginal.cantidad
                        };
                        nuevoCarrito[idx] = null;
                        return { carrito: nuevoCarrito.filter(Boolean) };
                    } else {
                        nuevoCarrito[idx] = {
                            ...item,
                            unidadVenta: nuevaUnidad,
                            precio: nuevoPrecio
                        };
                        return { carrito: nuevoCarrito };
                    }
                });
            },

            cargarItemsAlCarrito: (items) => {
                const itemsRecuperados = items.map(i => ({
                    ...i,
                    cantidad: parseFloat(i.cantidad) || 1,
                    precio: parseFloat(i.precio) || 0,
                }));
                // Defer slightly to avoid render loop? No, setState is fine.
                set({ carrito: itemsRecuperados });
            },

            setCarrito: (newCarrito) => set({ carrito: newCarrito })
        }),
        {
            name: 'listo-carrito-storage', // name of the item in the storage (must be unique)
        }
    ), 'CartStore')
);
