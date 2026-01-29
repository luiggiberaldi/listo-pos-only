// ✅ SYSTEM IMPLEMENTATION - V. 6.7 (REASON REQUIRED)
// Archivo: src/components/cierre/CierreSalesTable.jsx
// Objetivo: Exigir MOTIVO obligatorio para anular una venta.

import React, { useState } from 'react';
import { Eye, Trash2, RefreshCw, Ban } from 'lucide-react';
import ModalDetalleVenta from '../ventas/ModalDetalleVenta';
import { useStore } from '../../context/StoreContext';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

// Importaciones de Seguridad
import { useSecureAction } from '../../hooks/security/useSecureAction';
import { PERMISOS } from '../../hooks/store/useRBAC';

export default function CierreSalesTable({ ventasActivas }) {
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  const { limpiarCarrito, agregarAlCarrito, anularVenta, configuracion } = useStore();

  const navigate = useNavigate();
  const { ejecutarAccionSegura } = useSecureAction();

  // 🔴 ANULAR VENTA (AHORA CON MOTIVO OBLIGATORIO)
  const handleAnular = (venta) => {
    ejecutarAccionSegura({
      permiso: PERMISOS.POS_VOID_TICKET,
      nombreAccion: 'Anular Venta',
      accion: () => {
        Swal.fire({
          title: '¿Anular Venta?',
          text: "Escriba el motivo de la anulación para proceder:",
          icon: 'warning',
          input: 'text', // 👈 Campo de texto
          inputPlaceholder: 'Ej: Cliente se arrepintió, Error en cobro...',
          showCancelButton: true,
          confirmButtonColor: '#ef4444',
          confirmButtonText: 'Confirmar Anulación',
          cancelButtonText: 'Cancelar',
          inputValidator: (value) => { // 👈 Validación: No deja pasar si está vacío
            if (!value) {
              return '¡Debe escribir un motivo obligatoriamente!';
            }
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            const motivo = result.value; // Capturamos el texto escrito
            try {
              // Pasamos el motivo a la función (por si tu backend lo registra)
              await anularVenta(venta.id, motivo);
              Swal.fire('Anulada', 'Venta anulada correctamente.', 'success');
            } catch (error) {
              console.error(error);
              Swal.fire('Error', 'No se pudo anular.', 'error');
            }
          }
        });
      }
    });
  };

  // 🔄 RECICLAR VENTA
  const handleReciclar = (venta) => {
    Swal.fire({
      title: '¿Reciclar venta?',
      text: "Se cargarán los productos en la Caja para cobrarlos de nuevo.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, Reciclar',
      confirmButtonColor: '#3b82f6',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        limpiarCarrito();

        if (venta.items && Array.isArray(venta.items)) {
          venta.items.forEach(item => {
            const precio = parseFloat(item.precio);
            const cantidad = parseFloat(item.cantidad);
            agregarAlCarrito(item, cantidad, item.unidadVenta || 'unidad', precio);
          });
        }

        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cargado en Caja', showConfirmButton: false, timer: 1500 });
        navigate('/vender');
      }
    });
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm animate-in fade-in duration-500">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
            Movimientos del Turno
          </h3>
          <span className="text-xs font-bold text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded-lg shadow-sm">
            {ventasActivas.length} Registros
          </span>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 shadow-sm">
              <tr className="text-xs uppercase text-slate-500 font-bold">
                <th className="p-4 pl-6">Ref / ID</th>
                <th className="p-4">Hora</th>
                <th className="p-4">Método</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {ventasActivas.map((venta) => {
                const esAnulada = venta.status === 'ANULADA';

                return (
                  <tr key={venta.id} className={`transition-all ${esAnulada
                    ? 'bg-slate-100/50 dark:bg-slate-900/80 grayscale-[0.8] opacity-80 hover:opacity-100'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}>
                    <td className="p-4 pl-6 font-mono text-xs text-slate-500 relative">
                      {esAnulada && <div className="absolute top-1/2 left-4 right-4 h-px bg-slate-400/50 pointer-events-none"></div>}
                      <span className={`font-bold ${esAnulada ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {venta.numeroFactura || String(venta.id).slice(-6)}
                      </span>
                    </td>
                    <td className={`p-4 ${esAnulada ? 'text-slate-400 italic' : 'text-slate-600 dark:text-slate-400'}`}>
                      {new Date(venta.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {(venta.pagos || venta.payments || []).map((p, i) => (
                          <span key={i} className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${esAnulada
                            ? 'bg-slate-200 text-slate-400 line-through decoration-slate-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                            }`}>
                            {p.metodo || p.method}
                          </span>
                        ))}
                        {venta.esCredito && (
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${esAnulada
                            ? 'bg-slate-200 text-slate-400 line-through decoration-slate-400 opacity-50'
                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                            }`}>
                            Crédito
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`p-4 text-right font-black font-numbers ${esAnulada ? 'text-slate-400 line-through decoration-2 decoration-slate-300' : 'text-slate-800 dark:text-white'
                      }`}>
                      {(() => {
                        const totalOriginal = parseFloat(venta.total || 0);
                        const igtfDisplay = parseFloat(venta.igtfTotal || 0);
                        const totalFinal = (igtfDisplay > 0) ? (totalOriginal + igtfDisplay) : totalOriginal;
                        return `$${totalFinal.toFixed(2)}`;
                      })()}
                    </td>
                    <td className="p-4 text-center">
                      {esAnulada ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-600 text-[10px] font-bold border border-red-200 animate-pulse">
                          <Ban size={10} /> ANULADA
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          APROBADA
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">

                        {/* OPCIONES VENTA VÁLIDA */}
                        {!esAnulada && (
                          <>
                            <button
                              onClick={() => setVentaSeleccionada(venta)}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                              title="Ver Detalles"
                            >
                              <Eye size={18} />
                            </button>

                            <button
                              onClick={() => handleAnular(venta)}
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                              title="Anular Venta"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}

                        {/* OPCIÓN VENTA ANULADA (RECICLAR) */}
                        {esAnulada && (
                          <button
                            onClick={() => handleReciclar(venta)}
                            className="group flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 hover:bg-blue-50 hover:border-blue-300 text-blue-500 rounded-lg transition-all shadow-sm active:scale-95"
                            title="Reciclar Venta"
                          >
                            <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                            <span className="text-xs font-bold">RECICLAR</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {ventaSeleccionada && (
        <ModalDetalleVenta
          venta={ventaSeleccionada}
          onClose={() => setVentaSeleccionada(null)}
        />
      )}
    </>
  );
}