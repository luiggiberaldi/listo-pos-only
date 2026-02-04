// ✅ SYSTEM IMPLEMENTATION - V. 3.5 (ENHANCED WAITING LIST)
// Archivo: src/components/pos/ModalEspera.jsx

import React, { useState } from 'react';
import { X, Clock, User, FileText, Trash2, ArrowRightCircle, Eye, EyeOff } from 'lucide-react';

export default function ModalEspera({ tickets, onRecuperar, onEliminar, onClose }) {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="fixed inset-0 bg-surface-dark/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-surface-light dark:bg-surface-dark w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-border-subtle">

        <div className="bg-app-light dark:bg-app-dark p-5 border-b border-border-subtle flex justify-between items-center">
          <h2 className="text-xl font-black text-content-main flex items-center gap-2">
            <Clock className="text-status-warning" /> Tickets en Espera
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-hover dark:hover:bg-surface-hover rounded-full transition-colors text-content-secondary hover:text-content-main"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-app-light dark:bg-app-dark">
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-content-secondary opacity-60">
              <Clock size={48} className="mb-2" />
              <p className="font-bold">No hay compras estacionadas</p>
            </div>
          ) : (
            tickets.map((t, idx) => {
              const isExpanded = expandedId === t.id;
              const totalBs = (t.totalSnapshot || 0) * (t.tasaSnapshot || 0);
              const fechaValida = !isNaN(new Date(t.fecha).getTime());

              return (
                <div key={t.id || idx} className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-subtle shadow-sm overflow-hidden transition-all">

                  {/* CABECERA DEL TICKET */}
                  <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold bg-status-warningBg text-status-warning px-2 py-0.5 rounded border border-status-warning/20 flex items-center gap-1">
                          <Clock size={10} /> {fechaValida ? new Date(t.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sin Fecha'}
                        </span>
                        <span className="text-xs text-content-secondary font-medium flex items-center gap-1">
                          <User size={12} /> {t.usuarioNombre || 'Desconocido'}
                        </span>
                      </div>

                      {t.cliente && (
                        <p className="text-sm font-bold text-content-main mb-1">Cliente: {t.cliente.nombre}</p>
                      )}

                      {t.nota && (
                        <p className="text-xs text-content-secondary italic bg-app-light dark:bg-app-dark p-1.5 rounded border border-border-subtle inline-block mb-1">
                          <FileText size={10} className="inline mr-1" /> "{t.nota}"
                        </p>
                      )}

                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="font-black text-lg text-content-main">${(t.totalSnapshot || 0).toFixed(2)}</span>
                        <span className="text-xs font-bold text-content-secondary">/</span>
                        <span className="font-bold text-sm text-content-secondary">Bs {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                        <span className="text-[9px] text-content-secondary ml-1">(Tasa: {t.tasaSnapshot || '0.00'})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => toggleExpand(t.id)}
                        className={`p-2 rounded-lg border transition-all flex items-center gap-1 text-xs font-bold ${isExpanded ? 'bg-primary-light text-primary border-primary-light' : 'bg-surface-light dark:bg-surface-dark text-content-secondary border-border-subtle hover:bg-app-light'}`}
                      >
                        {isExpanded ? <EyeOff size={16} /> : <Eye size={16} />}
                        <span className="hidden sm:inline">{isExpanded ? 'Ocultar' : 'Ver Items'}</span>
                      </button>

                      <button
                        onClick={() => onEliminar(t.id)}
                        className="p-2 text-content-secondary hover:text-status-danger hover:bg-status-dangerBg rounded-lg transition-colors border border-transparent hover:border-status-dangerBg"
                        title="Descartar"
                      >
                        <Trash2 size={18} />
                      </button>

                      <button
                        onClick={() => onRecuperar(t)}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg hover:shadow-primary/30 transition-all active:scale-95"
                      >
                        RECUPERAR <ArrowRightCircle size={16} />
                      </button>
                    </div>
                  </div>

                  {/* DETALLE EXPANDIBLE */}
                  {isExpanded && (
                    <div className="bg-app-light dark:bg-app-dark border-t border-border-subtle p-4 animate-in slide-in-from-top-2">
                      <table className="w-full text-xs text-left">
                        <thead className="text-content-secondary font-bold uppercase border-b border-border-subtle">
                          <tr>
                            <th className="pb-2">Cant</th>
                            <th className="pb-2">Producto</th>
                            <th className="pb-2 text-right">Precio</th>
                            <th className="pb-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                          {(t.items || []).map((item, idx) => (
                            <tr key={idx} className="text-content-main">
                              <td className="py-2 font-mono font-bold">{item.cantidad}</td>
                              <td className="py-2">{item.nombre}</td>
                              <td className="py-2 text-right">
                                <div>${item.precio.toFixed(2)}</div>
                                <div className="text-[10px] text-content-secondary">Bs {(item.precio * (t.tasaSnapshot || 0)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                              </td>
                              <td className="py-2 text-right font-bold">
                                <div>${(item.cantidad * item.precio).toFixed(2)}</div>
                                <div className="text-[10px] text-primary/70">Bs {((item.cantidad * item.precio) * (t.tasaSnapshot || 0)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}