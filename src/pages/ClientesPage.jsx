import React, { useState } from 'react'; // Eliminado useMemo ya que el hook lo maneja
import { useStore } from '../context/StoreContext';
import { useCustomerPagination } from '../hooks/ui/useCustomerPagination'; // ✅ HOOK IMPORTADO
import {
  Users, Search, Plus, Edit2, Trash2, Phone, MapPin,
  UserCheck, AlertCircle, FileText, Wallet, ShoppingBag,
  ChevronLeft, ChevronRight, Filter // Iconos nuevos para paginación
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// ⚡ PERFORMANCE: Swal lazy-loaded
let _swal = null;
const getSwal = async () => {
  if (!_swal) _swal = (await import('sweetalert2')).default;
  return _swal;
};

// Módulos de Crédito
import ModalAbono from '../components/clientes/ModalAbono';
import ModalHistorialCliente from '../components/clientes/ModalHistorialCliente';
import ModalClienteForm from '../components/clientes/ModalClienteForm';

// ✅ SEGURIDAD
import { ActionGuard } from '../components/security/ActionGuard';
import { PERMISOS } from '../hooks/store/useRBAC';

export default function ClientesPage() {
  const { clientes, agregarCliente, editarCliente, eliminarCliente, configuracion, selectClienteForPos } = useStore();
  const navigate = useNavigate();

  const handleVender = (cliente) => {
    // Si la tienda soporta selección global, lo usamos. Si no, pasamos state en navigation
    navigate('/vender', { state: { clienteSeleccionado: cliente } });
  };

  // ===========================================================================
  // ⚡ INTEGRACIÓN DE PAGINACIÓN DE ALTO RENDIMIENTO (HOOK)
  // ===========================================================================
  const {
    datos: clientesPaginados, // Los datos a renderizar (slice actual)
    paginaActual,
    totalPaginas,
    totalItems,
    busqueda,
    setBusqueda,
    filterMode,
    setFilterMode,
    siguientePagina,
    anteriorPagina,
    irAPagina
  } = useCustomerPagination(clientes, 10); // 10 items por página para mejor UX vertical

  // Estados UI (Modales)
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);

  // Estados de Negocio (Módulos Nuevos)
  const [clienteAbonar, setClienteAbonar] = useState(null);
  const [clienteHistorial, setClienteHistorial] = useState(null);

  // Manejadores CRUD
  const handleGuardar = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const datos = Object.fromEntries(formData);
    const Swal = await getSwal();

    try {
      if (clienteEditando) {
        editarCliente(clienteEditando.id, datos);
        Swal.fire({ icon: 'success', title: 'Actualizado', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      } else {
        agregarCliente(datos);
        Swal.fire({ icon: 'success', title: 'Registrado', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      }
      setModalFormOpen(false);
      setClienteEditando(null);
    } catch (err) { Swal.fire('Error', err.message, 'error'); }
  };

  const handleEliminar = async (id) => {
    const Swal = await getSwal();
    Swal.fire({
      title: '¿Eliminar?', text: "Se borrará permanentemente.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#DC2626', confirmButtonText: 'Sí, eliminar'
    }).then(r => {
      if (r.isConfirmed) {
        try { eliminarCliente(id); Swal.fire('Eliminado', '', 'success'); }
        catch (e) { Swal.fire('Bloqueado', e.message, 'warning'); }
      }
    });
  };

  const abrirFormulario = (c = null) => { setClienteEditando(c); setModalFormOpen(true); };

  // Componente de Saldo Quadrants
  const QuadrantsBadge = ({ deuda, favor }) => {
    const d = parseFloat(deuda || 0);
    const f = parseFloat(favor || 0);

    return (
      <div className="flex flex-col gap-1 items-start">
        {d > 0.01 && (
          <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold border border-red-100 uppercase tracking-tighter w-full">
            <AlertCircle size={10} /> Deuda: ${d.toFixed(2)}
          </span>
        )}
        {f > 0.01 && (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-100 uppercase tracking-tighter w-full">
            <UserCheck size={10} /> Favor: ${f.toFixed(2)}
          </span>
        )}
        {d <= 0.01 && f <= 0.01 && (
          <span className="text-slate-400 font-medium text-[10px] bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">Solvente</span>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">

      {/* --- MODALES --- */}
      {clienteAbonar && (
        <ModalAbono cliente={clienteAbonar} onClose={() => setClienteAbonar(null)} />
      )}
      {clienteHistorial && (
        <ModalHistorialCliente cliente={clienteHistorial} onClose={() => setClienteHistorial(null)} />
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-content-main dark:text-white flex items-center gap-2">
            <Users className="text-primary" size={32} /> CLIENTES
          </h1>
          <p className="text-slate-500 font-medium">
            Gestión de cartera ({totalItems} registros)
          </p>
        </div>
        <button onClick={() => abrirFormulario()} className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/30 transition-all transform hover:scale-105">
          <Plus size={20} /> NUEVO CLIENTE
        </button>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Barra de Búsqueda */}
        <div className="flex-1 bg-surface-card dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 focus-within:ring-2 ring-primary/20 transition-all">
          <Search className="text-slate-400" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, documento o teléfono..."
            className="bg-transparent w-full outline-none text-slate-700 dark:text-slate-200 font-medium"
          />
        </div>

        {/* Filters Group (Segmented Control) */}
        <div className="flex items-center p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterMode === 'ALL'
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterMode('DEBT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${filterMode === 'DEBT'
              ? 'bg-red-50 text-red-600 border border-red-100 shadow-sm'
              : 'text-slate-500 hover:bg-red-50/50 hover:text-red-500'
              }`}
          >
            <AlertCircle size={14} /> Deudores
          </button>
          <button
            onClick={() => setFilterMode('CREDIT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${filterMode === 'CREDIT'
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm'
              : 'text-slate-500 hover:bg-emerald-50/50 hover:text-emerald-500'
              }`}
          >
            <UserCheck size={14} /> Saldo a Favor
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-surface-card dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-full min-h-[400px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-xs tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-4">Cliente / ID</th>
                <th className="p-4">Contacto</th>
                <th className="p-4">Estado Cuenta</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {clientesPaginados.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400 italic">No se encontraron clientes que coincidan con la búsqueda.</td></tr>
              ) : (
                clientesPaginados.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
                          {c.nombre.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white">{c.nombre}</p>
                          <p className="text-xs text-slate-500 font-mono flex items-center gap-1"><FileText size={10} /> {c.documento || c.cedula}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
                        {c.telefono && <div className="flex items-center gap-2"><Phone size={12} className="text-slate-400" /> {c.telefono}</div>}
                        {c.direccion && <div className="flex items-center gap-2 text-xs text-slate-400"><MapPin size={12} /> <span className="truncate max-w-[150px]">{c.direccion}</span></div>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 items-start">
                        <QuadrantsBadge deuda={c.deuda} favor={c.favor} />
                        {(c.deuda > 0) && (
                          <span className="text-[10px] font-bold text-slate-400 pl-1">
                            ≈ Bs {(c.deuda * configuracion.tasa).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Acciones */}
                        <button onClick={() => handleVender(c)} className="p-2 text-white bg-[#6366f1] hover:bg-[#4f46e5] rounded-lg transition-colors shadow-sm" title="Vender a Cliente">
                          <ShoppingBag size={18} />
                        </button>
                        {c.deuda > 0.01 && (
                          <ActionGuard permission={PERMISOS.CLI_CREDITO} onClick={() => setClienteAbonar(c)} actionName="Dar Crédito">
                            <button className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors" title="Realizar Abono">
                              <Wallet size={18} />
                            </button>
                          </ActionGuard>
                        )}
                        <button onClick={() => setClienteHistorial(c)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors" title="Ver Estado de Cuenta">
                          <FileText size={18} />
                        </button>
                        <button onClick={() => abrirFormulario(c)} className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"><Edit2 size={18} /></button>
                        <button onClick={() => handleEliminar(c.id)} className="p-2 text-slate-400 hover:text-status-error hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* --- PAGINATION FOOTER --- */}
        {totalPaginas > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <div className="text-xs font-bold text-slate-400">
              Página {paginaActual} de {totalPaginas}
            </div>
            <div className="flex gap-2">
              <button
                onClick={anteriorPagina}
                disabled={paginaActual === 1}
                className="p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg disabled:opacity-50 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={siguientePagina}
                disabled={paginaActual === totalPaginas}
                className="p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg disabled:opacity-50 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* NUEVO MODAL PREMIUM */}
      <ModalClienteForm
        isOpen={modalFormOpen}
        onClose={() => setModalFormOpen(false)}
        cliente={clienteEditando}
        onGuardar={handleGuardar}
      />
    </div>
  );
}