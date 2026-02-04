import { useState } from 'react';
import { ShiftService } from '../../services/pos/ShiftService';

/**
 * useShiftManager (Thin Controller)
 * 
 * Hook responsible for "Shift" Lifecycle:
 * - Opening the Box (Apertura)
 * - Closing the Box (Cierre Z)
 * 
 * Now refactored to use ShiftService.
 */
export const useShiftManager = (
    usuario,
    { abrirCaja, playSound } // Actions from useCajaEstado
) => {
    const [isShiftProcessing, setIsShiftProcessing] = useState(false);

    // A. APERTURA (Delegates to CajaEstadoProvider)
    const abrirCajaPOS = async (monto) => {
        if (abrirCaja) {
            const exito = await abrirCaja(monto, usuario);
            if (exito && playSound) playSound('CLICK');
        }
    };

    // B. CIERRE (Delegates to ShiftService)
    const cerrarCaja = async (datosInyectados = {}) => {
        if (isShiftProcessing) throw new Error("Operación de cierre en progreso...");
        try {
            setIsShiftProcessing(true);

            // Execute logic in Service
            const nuevoCorte = await ShiftService.cerrarCaja(usuario, datosInyectados, playSound);

            return nuevoCorte;

        } catch (error) {
            console.error("Error cierre:", error);
            throw error;
        } finally {
            setIsShiftProcessing(false);
        }
    };

    return {
        isShiftProcessing,
        abrirCajaPOS,
        cerrarCaja
    };
};
