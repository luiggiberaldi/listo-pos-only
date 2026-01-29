import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export const useCart = ({ configuracion, playSound }) => {
    // Estado local del carrito
    const [carrito, setCarrito] = useState(() => {
        try { return JSON.parse(localStorage.getItem('listo-carrito') || '[]'); } catch { return []; }
    });

    // Persistencia
    useEffect(() => { localStorage.setItem('listo-carrito', JSON.stringify(carrito)); }, [carrito]);

    // Agregar Item
    const agregarAlCarrito = (producto, cantidad = 1, unidad = 'unidad', precioOverride = null) => {
        const precioFinal = precioOverride !== null ? precioOverride : producto.precio;
        const permitirSinStock = configuracion?.permitirSinStock;
        const stockActual = parseFloat(producto.stock) || 0;

        // 🧠 CÁLCULO DE FACTOR INICIAL 
        let factor = 1;
        if (unidad === 'bulto') factor = parseFloat(producto.jerarquia?.bulto?.contenido || 1);
        else if (unidad === 'paquete') factor = parseFloat(producto.jerarquia?.paquete?.contenido || 1);

        setCarrito(prevCarrito => {
            // 1. Identificar si existe la línea original
            const indiceExistente = prevCarrito.findIndex(item => item.id === producto.id && (item.unidadVenta || 'unidad') === unidad);
            const cantidadActualEnLinea = indiceExistente >= 0 ? prevCarrito[indiceExistente].cantidad : 0;

            // 2. Proyección de cantidad en Unidades Base (para evaluar conversión)
            const cantidadNuevaTotal = cantidadActualEnLinea + cantidad;

            // 🚀 AUTO-CONVERSIÓN (Sólo si estamos en modo unidad y el producto tiene jerarquía)
            let unidadDestino = unidad;
            let cantidadDestino = cantidadNuevaTotal;
            let precioDestino = precioFinal;
            let seTransformo = false;
            let factorDestino = factor;
            let borrarLineaOriginal = false;

            if (unidad === 'unidad') {
                const bulto = producto.jerarquia?.bulto;
                const paquete = producto.jerarquia?.paquete;

                // A. Intentar convertir a BULTO
                if (bulto?.activo && bulto.seVende !== false && bulto.contenido > 1) {
                    const cont = parseFloat(bulto.contenido);
                    // Si llegamos exactamente al contenido o lo pasamos (y es múltiplo o el usuario quiere forzar)
                    // La regla del usuario: "al agregar 20 unidades se convierta en bulto".
                    // Asumiremos que si alcanza el umbral, se convierte.
                    if (Math.abs(cantidadNuevaTotal - cont) < 0.01 || cantidadNuevaTotal > cont) {
                        // Verificamos si es divisible exacto O si queremos convertir float.
                        // Para evitar 1.05 Bultos accidentalmente, quizás solo convertimos si es >= cont.
                        // El usuario dijo "se convertia en bulto". Hacemos la conversión matemática.
                        unidadDestino = 'bulto';
                        cantidadDestino = cantidadNuevaTotal / cont;
                        precioDestino = parseFloat(bulto.precio);
                        factorDestino = cont;
                        seTransformo = true;
                        borrarLineaOriginal = true; // La línea de unidades desaparecerá (o se restará si hiciéramos split, pero aquí convertimos TOOD)
                    }
                }

                // B. Intentar convertir a PAQUETE (Si no se convirtió a bulto y aplica)
                if (!seTransformo && paquete?.activo && paquete.seVende !== false && paquete.contenido > 1) {
                    const cont = parseFloat(paquete.contenido);
                    if (Math.abs(cantidadNuevaTotal - cont) < 0.01 || cantidadNuevaTotal > cont) {
                        unidadDestino = 'paquete';
                        cantidadDestino = cantidadNuevaTotal / cont;
                        precioDestino = parseFloat(paquete.precio);
                        factorDestino = cont;
                        seTransformo = true;
                        borrarLineaOriginal = true;
                    }
                }
            }

            // 📢 Feedback Visual de Transformación
            if (seTransformo) {
                const Toast = Swal.mixin({ toast: true, position: 'top', showConfirmButton: false, timer: 2000 });
                Toast.fire({
                    icon: 'success',
                    title: `✨ ¡Transformado a ${unidadDestino.toUpperCase()}!`,
                    background: '#f0fdf4', // emerald-50
                    color: '#166534' // emerald-800
                });
                if (playSound) playSound('BEEP');
            }

            // 3. Validación de Stock Global (Sumando todas las líneas de este producto)
            // Calculamos lo que ya existe EXCLUYENDO la línea que estamos editando/borrando
            const itemsOtros = prevCarrito.filter((_, i) => i !== indiceExistente && _.id === producto.id);
            let consumoOtros = 0;
            itemsOtros.forEach(i => {
                let f = 1;
                if (i.unidadVenta === 'bulto') f = parseFloat(i.jerarquia?.bulto?.contenido || 1);
                else if (i.unidadVenta === 'paquete') f = parseFloat(i.jerarquia?.paquete?.contenido || 1);
                consumoOtros += (i.cantidad * f);
            });

            // Consumo de lo que vamos a insertar/actualizar
            // Si hubo transformación, usamos cantidadDestino * factorDestino (que debería ser igual a cantidadNuevaTotal * 1)
            // Si NO hubo transformación, usamos cantidadDestino * factor (unidad original)
            const consumoNuevoOperacion = seTransformo ? (cantidadDestino * factorDestino) : (cantidad * factor);

            // OJO: Si se transformó, 'cantidadDestino' es el TOTAL acumulado.
            // Si NO se transformó, estamos en modo "append" normal? No, arriba calculamos cantidadNuevaTotal = actual + nueva.
            // Pero useCart original hacía `itemExistente.cantidad + cantidad`.
            // Aquí ya calculamos el destino total. 
            // `consumoTotalProyectado` debe ser (Consumo de Otros) + (Consumo Total de Esta Línea Transformada o No).

            let consumoTotalProyectado = 0;
            if (seTransformo || indiceExistente === -1) {
                // Si es nuevo item o transformado (que reemplaza al anterior), el consumo es el total destino
                consumoTotalProyectado = consumoOtros + (cantidadDestino * factorDestino);
            } else {
                // Si es item existente sin transformar, `cantidadDestino` (que es `cantidadNuevaTotal`) tiene el total.
                consumoTotalProyectado = consumoOtros + (cantidadDestino * factorDestino);
            }

            // 🛑 Lógica de Stock (Reutilizada y Simplificada)
            if (producto.tipoUnidad !== 'peso') {
                if (consumoTotalProyectado > stockActual) {
                    if (!permitirSinStock) {
                        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: '¡No hay Stock!', timer: 3000, showConfirmButton: false });
                        return prevCarrito; // Cancelar operación
                    } else {
                        Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Stock Negativo', timer: 2000, showConfirmButton: false });
                    }
                }
            }

            // 4. Construcción del Nuevo Carrito
            let nuevoCarrito = [...prevCarrito];

            // Si hubo transformación, necesitamos borrar la línea original (si existía)
            if (seTransformo && indiceExistente >= 0) {
                nuevoCarrito = nuevoCarrito.filter((_, i) => i !== indiceExistente);
            }

            // Ahora buscamos si ya existe una línea con la `unidadDestino` (ej. ya había bultos y ahora creamos otro más)
            const indiceDestino = nuevoCarrito.findIndex(item => item.id === producto.id && (item.unidadVenta || 'unidad') === unidadDestino);

            if (indiceDestino >= 0) {
                // Actualizamos la línea existente del destino
                // CUIDADO: Si se transformó, `cantidadDestino` YA ES EL TOTAL.
                // Si ya había bultos (ej. 1), y transformamos 20 unidades en 1 bulto.
                // Deberíamos sumar?
                // `cantidadDestino` viene de `cantidadNuevaTotal` (unidades) / factor.
                // Esto representa TODO lo que había en la línea de unidades + lo nuevo.
                // Pero NO incluye lo que ya había en la línea de bultos.
                // Así que sumamos.

                const itemDest = nuevoCarrito[indiceDestino];
                const nuevaCantFinal = itemDest.cantidad + cantidadDestino;

                // Update
                nuevoCarrito[indiceDestino] = { ...itemDest, cantidad: nuevaCantFinal };
            } else {
                // Creamos la nueva línea
                if (!seTransformo && indiceExistente >= 0) {
                    // Caso normal: Actualizar línea existente (mismo tipo)
                    nuevoCarrito[indiceExistente] = { ...nuevoCarrito[indiceExistente], cantidad: cantidadDestino };
                } else {
                    // Caso: Nuevo item o Item Transformado que no tenía destino previo
                    nuevoCarrito.push({
                        ...producto,
                        cantidad: cantidadDestino,
                        precio: precioDestino,
                        unidadVenta: unidadDestino
                    });
                }
            }

            return nuevoCarrito;
        });
    };

    // Cambiar Cantidad (Sin Auto-Convert para evitar UX confusa al editar manualmente)
    const cambiarCantidadCarrito = (idx, nuevaCant) => {
        if (nuevaCant <= 0) { eliminarDelCarrito(idx); return; }

        setCarrito(prev => prev.map((it, i) => {
            if (i !== idx) return it;

            // ... (Resto de validación de stock original)
            const permitirSinStock = configuracion?.permitirSinStock;
            const stockActual = parseFloat(it.stock) || 0;

            let factor = 1;
            if (it.unidadVenta === 'bulto') factor = parseFloat(it.jerarquia?.bulto?.contenido || 1);
            else if (it.unidadVenta === 'paquete') factor = parseFloat(it.jerarquia?.paquete?.contenido || 1);

            const otrosItems = prev.filter((otros, index) => index !== idx && otros.id === it.id);
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
        }));
    };

    const eliminarDelCarrito = (idx) => {
        setCarrito(prev => prev.filter((_, i) => i !== idx));
        if (playSound) playSound('TRASH');
    };

    const limpiarCarrito = () => {
        setCarrito([]);
        if (playSound) playSound('TRASH');
    };

    const cambiarUnidadCarrito = (idx, nuevaUnidad) => {
        setCarrito(prev => {
            const item = prev[idx];
            if (!item) return prev; // Safety check

            // Determinar nuevo precio y factor
            let nuevoPrecio = item.precio;
            let nuevoFactor = 1;

            if (nuevaUnidad === 'bulto') {
                nuevoPrecio = parseFloat(item.jerarquia?.bulto?.precio || 0);
                nuevoFactor = parseFloat(item.jerarquia?.bulto?.contenido || 1);
            } else if (nuevaUnidad === 'paquete') {
                nuevoPrecio = parseFloat(item.jerarquia?.paquete?.precio || 0);
                nuevoFactor = parseFloat(item.jerarquia?.paquete?.contenido || 1);
            } else { // Unidad
                nuevoPrecio = parseFloat(item.jerarquia?.unidad?.precio || item.precio);
                nuevoFactor = 1;
            }

            // 🛑 Validación Stock
            const permitirSinStock = configuracion?.permitirSinStock;
            const stockActual = parseFloat(item.stock) || 0;

            // Consumo de OTROS items
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
                    return prev;
                } else {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Stock Negativo', timer: 2000, showConfirmButton: false });
                }
            }

            // Lógica de Fusión (Merge)
            const nuevoCarrito = [...prev];
            // 1. Quitamos el item original
            // OJO: Si ya existe un item con la nueva unidad, lo fusionamos.
            const indiceDestino = nuevoCarrito.findIndex((it, i) => i !== idx && it.id === item.id && (it.unidadVenta || 'unidad') === nuevaUnidad);

            if (indiceDestino >= 0) {
                // Fusión
                const itemDest = nuevoCarrito[indiceDestino];
                const itemOriginal = nuevoCarrito[idx];

                // Actualizamos destino
                nuevoCarrito[indiceDestino] = {
                    ...itemDest,
                    cantidad: itemDest.cantidad + itemOriginal.cantidad
                };

                // Eliminamos el original (usamos filter para evitar problemas de índices cambiantes si indiceDestino < idx)
                // Mejor: Marcarlo null y filtrar
                nuevoCarrito[idx] = null;
                return nuevoCarrito.filter(Boolean);
            } else {
                // Transformación In-Place (No existe otro igual)
                nuevoCarrito[idx] = {
                    ...item,
                    unidadVenta: nuevaUnidad,
                    precio: nuevoPrecio
                };
                return nuevoCarrito;
            }
        });
    };

    const cargarItemsAlCarrito = (items) => {
        limpiarCarrito();
        const itemsRecuperados = items.map(i => ({
            ...i,
            cantidad: parseFloat(i.cantidad) || 1,
            precio: parseFloat(i.precio) || 0,
        }));
        setTimeout(() => { setCarrito(itemsRecuperados); }, 0);
    };

    return {
        carrito,
        setCarrito, // Expuesto por si otros hooks necesitan resetearlo
        agregarAlCarrito,
        cambiarCantidadCarrito,
        eliminarDelCarrito,
        limpiarCarrito,
        cargarItemsAlCarrito,
        cambiarUnidadCarrito // 🆕
    };
};
