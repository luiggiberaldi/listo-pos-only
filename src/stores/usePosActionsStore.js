// ✅ usePosActionsStore.js — Cerebro de Acciones del POS
// Reemplaza el hook usePosActions.js con un store Zustand.
// Todos los "verbos" (cobrar, limpiar, agregar, etc.) viven aquí.
// Los botones llaman directamente: usePosActionsStore.getState().cobrar()

import { create } from 'zustand';
import { ghostMiddleware } from '../utils/ghost/ghostMiddleware';
import Swal from 'sweetalert2';
import { PERMISOS } from '../hooks/store/useRBAC';
import { useCartStore } from './useCartStore';
import { useUIStore } from './useUIStore';
import { useConfigStore } from './useConfigStore';
import { usePosSearchStore } from './usePosSearchStore';
import { usePosCalcStore } from './usePosCalcStore';
import { useTicketStore } from './useTicketStore';

export const usePosActionsStore = create(ghostMiddleware((set, get) => ({
    // --- LOCAL STATE ---
    multiplicadorPendiente: 1,
    setMultiplicadorPendiente: (val) => set({ multiplicadorPendiente: val }),

    // Sale success state (UI-related but tied to actions)
    ventaExitosa: false,
    setVentaExitosa: (val) => set({ ventaExitosa: val }),
    ticketData: null,
    setTicketData: (val) => set({ ticketData: val }),

    // --- INJECTED REFS (set once on mount from PosPage) ---
    _refs: {
        searchInputRef: null,
        ejecutarAccionSegura: null,
        cajaAbiertaFn: null,
    },
    setRefs: (refs) => set({ _refs: { ...get()._refs, ...refs } }),

    // --- ACTIONS ---
    limpiar: () => {
        const carrito = useCartStore.getState().carrito;
        const { isProcessing } = useUIStore.getState();
        const { _refs } = get();
        if (carrito.length === 0 || isProcessing) return;

        _refs.ejecutarAccionSegura?.({
            permiso: PERMISOS.POS_VOID_TICKET,
            nombreAccion: 'Vaciar Cesta Completa',
            accion: () => {
                Swal.fire({
                    title: '¿Vaciar Cesta?', text: 'Se eliminarán todos los productos.',
                    icon: 'warning', showCancelButton: true,
                    confirmButtonColor: '#d33', confirmButtonText: 'Sí, vaciar'
                }).then((r) => { if (r.isConfirmed) useCartStore.getState().limpiarCarrito(); });
            }
        });
    },

    cobrar: () => {
        const carrito = useCartStore.getState().carrito;
        const { isProcessing } = useUIStore.getState();
        const configuracion = useConfigStore.getState().configuracion;
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
        useUIStore.getState().openModal('PAGO');
    },

    espera: async (totalUSD) => {
        const carrito = useCartStore.getState().carrito;
        const configuracion = useConfigStore.getState().configuracion;
        if (carrito.length === 0) return;

        const { value: nota } = await Swal.fire({
            title: 'Poner en Espera', input: 'text',
            inputPlaceholder: 'Nota opcional...',
            showCancelButton: true, confirmButtonText: 'Guardar', confirmButtonColor: '#f97316'
        });

        if (nota !== undefined) {
            const ticketCompleto = {
                id: Date.now(),
                fecha: new Date().toISOString(),
                items: [...carrito],
                totalSnapshot: totalUSD,
                tasaSnapshot: configuracion?.tasa || 0,
                nota: nota || '',
                cliente: null,
                usuarioNombre: 'Cajero'
            };

            useTicketStore.getState().guardarEnEspera(ticketCompleto);
            useCartStore.getState().limpiarCarrito();
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Ticket en Espera', timer: 2000, showConfirmButton: false });
        }
    },

    cambiarCant: (idx, cant) => {
        const { isProcessing } = useUIStore.getState();
        if (isProcessing) return;
        const carrito = useCartStore.getState().carrito;
        const item = carrito[idx];
        if (!item) return;
        const minQty = item.tipoUnidad === 'peso' ? 0.005 : 1;
        let cantidadSegura = Math.max(cant, minQty);
        if (item.tipoUnidad === 'peso') cantidadSegura = Math.round(cantidadSegura * 1000) / 1000;
        else cantidadSegura = Math.floor(cantidadSegura);
        useCartStore.getState().cambiarCantidadCarrito(idx, cantidadSegura);
    },

    eliminarItem: (idx) => {
        const { isProcessing } = useUIStore.getState();
        if (isProcessing) return;
        const carrito = useCartStore.getState().carrito;
        const item = carrito[idx];
        const { _refs } = get();

        _refs.ejecutarAccionSegura?.({
            permiso: PERMISOS.POS_VOID_ITEM,
            nombreAccion: `Quitar ${item.nombre}`,
            accion: () => {
                useCartStore.getState().eliminarDelCarrito(idx);
                useUIStore.getState().playSound('TRASH');
            }
        });
    },

    prepararAgregar: (producto) => {
        const { isProcessing } = useUIStore.getState();
        const { _refs, multiplicadorPendiente } = get();
        const cajaAbierta = _refs.cajaAbiertaFn?.() ?? false;
        if (!cajaAbierta || isProcessing) return;

        const cantidadFinal = multiplicadorPendiente;
        if (multiplicadorPendiente !== 1) set({ multiplicadorPendiente: 1 });

        const playSound = useUIStore.getState().playSound;
        const agregarAlCarrito = useCartStore.getState().agregarAlCarrito;
        const { setBusqueda, setSelectedIndex } = usePosSearchStore.getState();

        if (producto.tipoUnidad === 'peso') {
            setBusqueda('');
            useUIStore.getState().openModal('PESAJE', producto);
            _refs.searchInputRef?.current?.blur();
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
            playSound('SCAN');
            setBusqueda('');
            agregarAlCarrito(producto, cantidadFinal, unitType, finalPrice);
            setSelectedIndex(0);
            setTimeout(() => { if (_refs.searchInputRef?.current) _refs.searchInputRef.current.blur(); }, 10);
            return;
        }

        if (!autoAdd && (producto?.jerarquia?.bulto?.activo || producto?.jerarquia?.paquete?.activo)) {
            setBusqueda('');
            useUIStore.getState().openModal('JERARQUIA', producto);
            _refs.searchInputRef?.current?.blur();
            return;
        }

        const precioBase = (!isNaN(parseFloat(producto.precio)) && parseFloat(producto.precio) > 0) ? parseFloat(producto.precio) : 0;
        playSound('SCAN');
        agregarAlCarrito(producto, cantidadFinal, 'unidad', precioBase);
        setBusqueda(''); setSelectedIndex(0);
        setTimeout(() => { if (_refs.searchInputRef?.current) _refs.searchInputRef.current.blur(); }, 10);
    },

    ventaRapida: (montoBs, aplicaIva) => {
        const configuracion = useConfigStore.getState().configuracion;
        const tasa = configuracion.tasa || 1;
        const precioBaseUSD = parseFloat((montoBs / tasa).toFixed(6));
        const ivaEfectivo = configuracion.ivaActivo ? aplicaIva : false;
        const nombreProd = ivaEfectivo ? 'VARIOS (GRAVADO)' : 'VARIOS (EXENTO)';
        const productoRapido = { id: `QUICK-${Date.now()}`, nombre: nombreProd, tipoUnidad: 'unidad', stock: 999999, codigo: 'QUICK', aplicaIva: ivaEfectivo, exento: !ivaEfectivo };

        const { multiplicadorPendiente, _refs } = get();
        useUIStore.getState().playSound('SCAN');
        useCartStore.getState().agregarAlCarrito(productoRapido, multiplicadorPendiente, 'unidad', precioBaseUSD);
        set({ multiplicadorPendiente: 1 });
        usePosSearchStore.getState().setBusqueda('');
        usePosSearchStore.getState().setSelectedIndex(0);
        setTimeout(() => _refs.searchInputRef?.current?.blur(), 10);
    },

    autoAgregarPesado: (producto, peso) => {
        const { isProcessing } = useUIStore.getState();
        const { _refs } = get();
        const cajaAbierta = _refs.cajaAbiertaFn?.() ?? false;
        if (!cajaAbierta || isProcessing) return;

        usePosSearchStore.getState().setBusqueda('');
        useUIStore.getState().playSound('SCAN');
        useCartStore.getState().agregarAlCarrito(producto, peso, 'peso', parseFloat(producto.precio));
        usePosSearchStore.getState().setSelectedIndex(0);
        setTimeout(() => { if (_refs.searchInputRef?.current) _refs.searchInputRef.current.blur(); }, 10);
    },

    // --- BRIDGE HELPERS (for components that still use actions.playSound etc.) ---
    playSound: (type) => useUIStore.getState().playSound(type),
    agregarAlCarrito: (...args) => useCartStore.getState().agregarAlCarrito(...args),
    eliminarDelCarrito: (...args) => useCartStore.getState().eliminarDelCarrito(...args),
    cambiarUnidad: (...args) => useCartStore.getState().cambiarUnidadCarrito(...args),
    toggleAyuda: () => {
        const { activeModal } = useUIStore.getState();
        if (activeModal === 'AYUDA') useUIStore.getState().closeModal();
        else useUIStore.getState().openModal('AYUDA');
    }

}), 'PosActionsStore'));
