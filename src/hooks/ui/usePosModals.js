import { useUIStore } from '../../stores/useUIStore';

/**
 * usePosModals.js
 * Gestión centralizada de los estados de modales del POS.
 * Ahora usa Zustand (useUIStore) para evitar re-renders masivos.
 */
export const usePosModals = () => {
    const { activeModal, modalData, openModal, closeModal } = useUIStore();

    // Mapping Zustand state to legacy "modales" object for compatibility
    const modales = {
        pago: activeModal === 'PAGO',
        espera: activeModal === 'ESPERA',
        ayuda: activeModal === 'AYUDA',
        exito: activeModal === 'EXITO', // Added for consistency
        pesaje: activeModal === 'PESAJE' ? modalData : null,
        jerarquia: activeModal === 'JERARQUIA' ? modalData : null
    };

    // --- HANDLERS SEMÁNTICOS ---

    const abrirPago = () => openModal('PAGO');
    const cerrarPago = () => closeModal();

    const abrirEspera = () => openModal('ESPERA');
    const cerrarEspera = () => closeModal();

    const abrirPesaje = (producto) => openModal('PESAJE', producto);
    const cerrarPesaje = () => closeModal();

    const abrirJerarquia = (producto) => openModal('JERARQUIA', producto);
    const cerrarJerarquia = () => closeModal();

    const toggleAyuda = () => {
        if (activeModal === 'AYUDA') closeModal();
        else openModal('AYUDA');
    };

    const cerrarTodo = () => closeModal();

    // setModales shim (not perfectly compatible if passing function, but we shouldn't use setModales anymore)
    const setModales = (updater) => {
        console.warn("⚠️ [DEPRECATED] setModales called in atomic architecture. Use specific handlers.");
    };

    return {
        modales,
        setModales,
        abrirPago,
        cerrarPago,
        abrirEspera,
        cerrarEspera,
        abrirPesaje,
        cerrarPesaje,
        abrirJerarquia,
        cerrarJerarquia,
        toggleAyuda,
        cerrarTodo
    };
};
