import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import Swal from 'sweetalert2';

export const useTicketManager = (usuario, configuracion, carrito, setCarrito, playSound) => {
    // Live Query: Tickets en espera
    const ticketsEspera = useLiveQuery(() => db.tickets_espera.toArray(), []) || [];

    const guardarEnEspera = async (nota, clienteSeleccionado, totalActual) => {
        if (carrito.length === 0) return;
        try {
            await db.tickets_espera.add({
                fecha: new Date().toISOString(),
                usuarioId: usuario?.id || 'sys',
                usuarioNombre: usuario?.nombre || 'Sistema',
                items: carrito,
                cliente: clienteSeleccionado ? { id: clienteSeleccionado.id, nombre: clienteSeleccionado.nombre } : null,
                nota: nota || '',
                totalSnapshot: totalActual,
                tasaSnapshot: configuracion.tasa
            });
            setCarrito([]);
            if (playSound) playSound('SUCCESS');
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Ticket Guardado', timer: 2000, showConfirmButton: false });
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo guardar el ticket.', 'error');
        }
    };

    const eliminarTicketEspera = async (id) => { await db.tickets_espera.delete(id); };

    const recuperarDeEspera = async (ticket) => {
        // Lógica de recuperación (sin cambios mayores, solo validación de stock/precio)
        const itemsActualizados = [];
        const reportesCambio = [];
        const tasaActual = configuracion.tasa;

        if (Math.abs(ticket.tasaSnapshot - tasaActual) > 0.01) {
            reportesCambio.push(`📉 Tasa cambió: Bs ${ticket.tasaSnapshot} -> Bs ${tasaActual}`);
        }

        for (const item of ticket.items) {
            const prodActual = await db.productos.get(item.id);
            if (!prodActual) {
                reportesCambio.push(`❌ Producto eliminado: ${item.nombre}`);
                continue;
            }
            itemsActualizados.push({ ...item, precio: parseFloat(prodActual.precio), stock: prodActual.stock });
        }

        if (reportesCambio.length > 0) {
            await Swal.fire({
                title: 'Actualización de Datos',
                html: `<ul class="text-left text-sm list-disc pl-4">${reportesCambio.map(r => `<li>${r}</li>`).join('')}</ul>`,
                icon: 'info'
            });
        }
        setCarrito(itemsActualizados);
        await db.tickets_espera.delete(ticket.id);
        return { cliente: ticket.cliente };
    };

    return {
        ticketsEspera,
        guardarEnEspera,
        recuperarDeEspera,
        eliminarTicketEspera
    };
};
