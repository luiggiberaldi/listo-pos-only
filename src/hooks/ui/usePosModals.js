import { useState } from 'react';

/**
 * usePosModals.js
 * Gestión centralizada de los estados de modales del POS.
 * Desacopla la lógica de visualización del componente principal.
 */
export const usePosModals = () => {
    const [modales, setModales] = useState({
        pago: false,
        espera: false,
        pesaje: null,    // Contendrá el producto a pesar
        jerarquia: null  // Contendrá el producto con jerarquía
    });

    // --- HANDLERS SEMÁNTICOS ---

    const abrirPago = () => setModales(prev => ({ ...prev, pago: true }));
    const cerrarPago = () => setModales(prev => ({ ...prev, pago: false }));

    const abrirEspera = () => setModales(prev => ({ ...prev, espera: true }));
    const cerrarEspera = () => setModales(prev => ({ ...prev, espera: false }));

    const abrirPesaje = (producto) => setModales(prev => ({ ...prev, pesaje: producto }));
    const cerrarPesaje = () => setModales(prev => ({ ...prev, pesaje: null }));

    const abrirJerarquia = (producto) => setModales(prev => ({ ...prev, jerarquia: producto }));
    const cerrarJerarquia = () => setModales(prev => ({ ...prev, jerarquia: null }));

    const cerrarTodo = () => setModales({
        pago: false,
        espera: false,
        pesaje: null,
        jerarquia: null
    });

    return {
        modales,
        setModales, // Mantenido por compatibilidad si es necesario, pero preferir handlers
        abrirPago,
        cerrarPago,
        abrirEspera,
        cerrarEspera,
        abrirPesaje,
        cerrarPesaje,
        abrirJerarquia,
        cerrarJerarquia,
        cerrarTodo
    };
};
