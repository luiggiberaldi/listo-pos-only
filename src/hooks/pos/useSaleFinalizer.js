import { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import Swal from 'sweetalert2';

export const useSaleFinalizer = ({
    carrito, calculos, registrarVenta, limpiarCarrito, prefereciasTicket, playSound, generarCorrelativo, recuperarDeEspera, cerrarPago, cerrarEspera, searchInputRef,
    ticketRef, ticketSaldoRef, // 🆕 Recibidos de PosPage
    setCarrito // 🆕 Needed to restore items
}) => {
    const [ticketData, setTicketData] = useState(null);
    const [ventaExitosa, setVentaExitosa] = useState(false);

    const handlePrint = useReactToPrint({
        contentRef: ticketRef,
        content: () => ticketRef.current,
        documentTitle: 'Ticket',
        onAfterPrint: () => { limpiarCarrito(); setTicketData(null); }
    });

    const handlePrintSaldo = useReactToPrint({
        contentRef: ticketSaldoRef,
        content: () => ticketSaldoRef.current,
        documentTitle: 'Ticket Saldo Favor'
    });

    const finalizarVenta = async (datosPago, imprimirTicket = false) => {
        cerrarPago();
        try {
            // 🛡️ FIX #4: Correlativo generation moved entirely to SalesService
            // to avoid wasting fiscal numbers with duplicate generation.

            const ventaFinal = {
                items: carrito,
                total: calculos.totalUSD,
                subtotal: calculos.subtotalBase,
                totalImpuesto: calculos.totalImpuesto,
                totalBS: calculos.totalBS,
                tasa: calculos.tasa,
                ivaPorcentaje: calculos.ivaGlobal,
                pagos: datosPago.metodos,
                cambio: datosPago.cambio,
                distribucionVuelto: datosPago.distribucionVuelto,
                esCredito: datosPago.esCredito || false,
                clienteId: datosPago.clienteId || null,
                clienteNombre: datosPago.clienteNombre || 'Consumidor Final',
                cliente: datosPago.cliente || null,
                deudaPendiente: datosPago.deudaPendiente || 0,
                fecha: new Date().toISOString(),
                esExento: calculos.totalImpuesto === 0,
                igtfTotal: datosPago.igtfTotal || 0,
                montoVueltoDigital: datosPago.montoVueltoDigital || 0,
                vueltoCredito: !!datosPago.vueltoCredito,
                montoSaldoFavor: datosPago.montoSaldoFavor || 0
            };

            if (ventaFinal.montoSaldoFavor > 0) {
                ventaFinal.pagos.push({
                    metodo: 'SALDO A FAVOR',
                    monto: ventaFinal.montoSaldoFavor,
                    tipo: 'WALLET',
                    currency: 'USD',
                    medium: 'INTERNAL'
                });
            }

            const ventaProcesada = await registrarVenta(ventaFinal);
            setVentaExitosa(true);
            if (playSound) playSound('CASH');

            // 👻 GHOST AUDITOR: Log successful sale
            try {
                const { emitSaleCompleted } = await import('../../services/ghost/ghostAuditInterceptors');
                emitSaleCompleted({
                    totalGeneral: ventaFinal.total,
                    items: ventaFinal.items,
                    pagos: ventaFinal.pagos,
                    moneda: 'USD',
                    clienteId: ventaFinal.clienteId,
                    tasa: ventaFinal.tasa,
                    saldoPendiente: ventaFinal.deudaPendiente,
                    vuelto: ventaFinal.cambio
                });
            } catch { /* Ghost audit is non-critical */ }

            setTimeout(() => {
                const procesarImpresion = async () => {
                    if (imprimirTicket) {
                        setTicketData(ventaProcesada || ventaFinal);
                        await new Promise(r => setTimeout(r, 100));
                        handlePrint();
                        await new Promise(r => setTimeout(r, 1000));
                    }
                    if (ventaFinal.vueltoCredito || ventaFinal.deudaPendiente > 0) {
                        setTicketData(ventaProcesada || ventaFinal);
                    }
                };
                procesarImpresion();

                const hasBalanceEvent = ventaFinal.vueltoCredito || ventaFinal.deudaPendiente > 0;
                if (!hasBalanceEvent) {
                    setTimeout(() => {
                        setVentaExitosa(false);
                        if (!imprimirTicket) limpiarCarrito();
                        searchInputRef.current?.focus();
                    }, 2500);
                }
            }, 50);

        } catch (err) {
            console.error("Venta fallida en UI:", err);
            Swal.fire('Error', err.message || 'No se pudo procesar la venta.', 'error');
        }
    };

    const handleRecuperarTicket = async (ticket) => {
        if (carrito.length > 0) {
            const r = await Swal.fire({ title: 'Cesta Ocupada', text: 'Se borrará la compra actual.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sobrescribir', confirmButtonColor: '#d33' });
            if (!r.isConfirmed) return;
        }
        if (ticket && ticket.items) {
            setCarrito(ticket.items);
        }
        await recuperarDeEspera(ticket);
        cerrarEspera();
    };

    return {
        ticketData, setTicketData,
        ventaExitosa, setVentaExitosa,
        ticketRef, ticketSaldoRef,
        finalizarVenta,
        handlePrint,
        handlePrintSaldo,
        handleRecuperarTicket
    };
};
