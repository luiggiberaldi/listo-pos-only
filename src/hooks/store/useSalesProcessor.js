import { useState } from 'react';
import Swal from 'sweetalert2';
import { SalesService } from '../../services/pos/SalesService';

export const useSalesProcessor = (
    usuario,
    configuracion,
    { transaccionVenta, transaccionAnulacion, playSound, generarCorrelativo },
    { actualizarBalances }, // De useCajaEstado (Ahora solo necesitamos actualizarBalances)
    carrito,
    setCarrito
) => {
    const [isProcessing, setIsProcessing] = useState(false);

    // C. ANULACIÓN
    const anularVenta = async (id, motivo) => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            await SalesService.anularVenta(id, motivo, usuario, transaccionAnulacion, actualizarBalances);
            if (playSound) playSound('TRASH');
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Fallo al anular venta', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // D. REGISTRAR VENTA
    const registrarVenta = async (ventaFinal) => {
        try {
            setIsProcessing(true);

            // Llama al Servicio (Puro JS)
            const nuevaVenta = await SalesService.registrarVenta(
                ventaFinal,
                usuario,
                configuracion,
                transaccionVenta,
                actualizarBalances,
                generarCorrelativo
            );

            // UI Orchestration
            if (setCarrito) setCarrito([]);
            if (playSound) playSound('CASH_REGISTER');

            // Persistence Verify (Debug)
            if (typeof window !== 'undefined') window.__LAST_VENTA_SAVED = nuevaVenta;

            return nuevaVenta;

        } catch (error) {
            console.error("Error Transaction:", error);
            if (playSound) playSound('ERROR');

            // DEMO SHIELD HANDLING
            if (error.message === 'DEMO_LIMIT_REACHED') {
                await Swal.fire({
                    title: 'PERIODO FINALIZADO',
                    html: `
                        <div class="text-left space-y-2">
                            <p>Has alcanzado el límite de ventas de prueba.</p>
                            <p class="text-sm text-slate-400">Para continuar facturando, activa tu licencia full.</p>
                        </div>
                    `,
                    icon: 'error',
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#0f172a'
                });
                window.location.reload();
            } else {
                Swal.fire('Error', error.message, 'error');
            }
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    // E. REGISTRAR ABONO
    const registrarAbono = async (clienteId, metodosPago = [], totalAbono = 0, referencia = '') => {
        try {
            setIsProcessing(true);
            const result = await SalesService.registrarAbono(
                clienteId,
                metodosPago,
                totalAbono,
                referencia,
                usuario,
                configuracion,
                actualizarBalances,
                generarCorrelativo
            );

            if (playSound) playSound('SUCCESS');
            return result;

        } catch (error) {
            console.error("Error Abono:", error);
            if (playSound) playSound('ERROR');
            Swal.fire('Error', error.message, 'error');
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    // F. SANEAR CUENTA
    const sanearCuentaCliente = async (clienteId, tipo, motivo = 'Ajuste Manual') => {
        try {
            setIsProcessing(true);
            const result = await SalesService.sanearCuentaCliente(
                clienteId,
                tipo,
                motivo,
                usuario,
                generarCorrelativo
            );

            if (playSound) playSound('SUCCESS');
            return result;
        } catch (error) {
            console.error("Error Saneamiento:", error);
            if (playSound) playSound('ERROR');
            Swal.fire('Error', error.message, 'error');
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        isProcessing,
        registrarVenta,
        anularVenta,
        registrarAbono,
        sanearCuentaCliente
    };
};
