import React, { useState, useEffect } from 'react';
import { User, UserPlus, X, Search, UserCheck, AlertCircle, Lock } from 'lucide-react';
import Swal from 'sweetalert2';

export default function ClienteSelector({
    clienteSeleccionado,
    setClienteSeleccionado,
    clientes,
    agregarCliente,
    modo,
    proyeccion,
    isTouch = false,
    isLocked = false,
    isCompact = false, // 🆕 New prop for Zero-Scroll
    isErrorMode = false, // 🛡️ NEW: Highlights selector when client is missing
    clientSearchTrigger = 0, // 🚀 Trigger for Shortcut
    onFinishSelection // 🚀 Callback to jump after selection
}) {
    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [mostrarResultados, setMostrarResultados] = useState(false);
    const [creandoCliente, setCreandoCliente] = useState(false);
    const [formCliente, setFormCliente] = useState({ nombre: '', cedula: '', telefono: '' });

    // 🚀 Reactive effect: Only open search on explicit shortcut click
    useEffect(() => {
        if (clientSearchTrigger > 0) {
            setMostrarResultados(true);
            // 🎯 Foco al buscador tras la activación del atajo
            setTimeout(() => {
                const searchInput = document.querySelector('[data-client-search-input]');
                if (searchInput) searchInput.focus();
            }, 100);
        }
    }, [clientSearchTrigger]);

    const handleSelect = (id) => {
        setClienteSeleccionado(id);
        setBusquedaCliente('');
        setMostrarResultados(false);
        if (onFinishSelection) onFinishSelection();
    };

    const clientesFiltrados = clientes.filter(c =>
        c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
        (c.documento && c.documento.includes(busquedaCliente))
    ).slice(0, 5);

    const clienteActivo = clientes.find(c => c.id === clienteSeleccionado);

    const guardarClienteRapido = async () => {
        try {
            if (!formCliente.nombre || !formCliente.telefono) throw new Error('Nombre y Teléfono obligatorios');

            const nuevo = await agregarCliente({
                nombre: formCliente.nombre,
                documento: formCliente.cedula,
                telefono: formCliente.telefono || ''
            });

            setCreandoCliente(false);
            setClienteSeleccionado(nuevo.id); // ✅ Now synchronous after await
            setFormCliente({ nombre: '', cedula: '', telefono: '' });

            Swal.fire({ icon: 'success', title: 'Cliente Creado', toast: true, position: 'bottom-start', showConfirmButton: false, timer: 1500 });

            if (onFinishSelection) onFinishSelection(); // 🚀 Auto-advance
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    };

    // 🎨 COMPACT VIEW: SLEEK TAG
    if (isCompact && !creandoCliente) {
        return (
            <div className="px-1 animate-in fade-in duration-300">
                {!clienteActivo ? (
                    <div className="relative group">
                        <button
                            onClick={() => setMostrarResultados(true)}
                            className={`w-full flex items-center gap-3 px-4 ${isTouch ? 'py-4' : 'py-3'} bg-white border ${isErrorMode ? 'border-red-600 ring-4 ring-red-500/10 animate-pulse' : 'border-slate-200'} rounded-2xl text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm group-hover:shadow-md`}
                        >
                            <Search size={isTouch ? 20 : 16} />
                            <span className={`${isTouch ? 'text-sm' : 'text-xs'} font-bold uppercase tracking-wider`}>Seleccionar Cliente</span>
                        </button>

                        {mostrarResultados && (
                            <div className="absolute top-0 left-0 w-full z-50 animate-in slide-in-from-top-1">
                                <div className="bg-white border-2 border-blue-500 shadow-2xl rounded-2xl overflow-hidden min-h-[160px]">
                                    <div className="flex items-center gap-2 p-3 bg-blue-50 border-b border-blue-100">
                                        <Search size={16} className="text-blue-500" />
                                        <input
                                            autoFocus
                                            data-client-search-input // 🚀 Anchor for shortcut focus
                                            className="flex-1 bg-transparent outline-none font-bold text-sm text-blue-900"
                                            placeholder="Nombre o Cédula..."
                                            value={busquedaCliente}
                                            onChange={e => setBusquedaCliente(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    const first = clientesFiltrados[0];
                                                    if (first) handleSelect(first.id);
                                                }
                                                if (e.key === 'Escape') setMostrarResultados(false);
                                            }}
                                            onBlur={() => setTimeout(() => setMostrarResultados(false), 200)}
                                        />
                                        <button onClick={() => setMostrarResultados(false)} className="p-1 hover:bg-blue-100 rounded-lg text-blue-400"><X size={16} /></button>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        {clientesFiltrados.length === 0 ? (
                                            <div className="p-4 text-center">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">No se encontraron resultados</p>
                                            </div>
                                        ) : (
                                            clientesFiltrados.map(c => (
                                                <div key={c.id} onClick={() => handleSelect(c.id)} className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-0 transition-colors">
                                                    <p className="font-bold text-sm text-slate-700">{c.nombre}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono italic">{c.documento}</p>
                                                </div>
                                            ))
                                        )}

                                        {/* ➕ Persistent "Create New" Action */}
                                        <div className="sticky bottom-0 bg-blue-50 border-t border-blue-100 p-2">
                                            <button
                                                onClick={() => setCreandoCliente(true)}
                                                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-black text-blue-600 hover:bg-blue-100 rounded-xl transition-all border border-blue-200 shadow-sm"
                                            >
                                                <UserPlus size={14} />
                                                <span>AÑADIR NUEVO CLIENTE</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                        <div className={`flex-1 flex items-center gap-3 px-3 py-2 bg-blue-600 text-white rounded-2xl shadow-md border-b-4 border-blue-800 active:translate-y-0.5 transition-all group`}>
                            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-white text-xs border border-white/30">
                                {clienteActivo.nombre.substring(0, 1).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-[11px] uppercase tracking-tighter truncate leading-none mb-0.5">{clienteActivo.nombre}</p>
                                <p className="text-[9px] font-bold text-blue-100/70 font-mono tracking-widest">{clienteActivo.documento}</p>
                            </div>
                            {!isLocked && (
                                <button onClick={() => setClienteSeleccionado('')} className="p-1.5 hover:bg-red-500 rounded-lg transition-colors text-white/50 hover:text-white">
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Status Quick-Capsules (Mini view of debt/credit) */}
                        <div className="flex flex-col gap-1">
                            {((proyeccion ? proyeccion.deuda : clienteActivo.deuda) || 0) > 0 && (
                                <div className="px-2 py-0.5 bg-red-100 text-red-600 rounded-lg text-[10px] font-black font-numbers border border-red-200">
                                    -${((proyeccion ? proyeccion.deuda : clienteActivo.deuda) || 0).toFixed(0)}
                                </div>
                            )}
                            {((proyeccion ? proyeccion.favor : clienteActivo.favor) || 0) > 0 && (
                                <div className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-black font-numbers border border-emerald-200">
                                    +${((proyeccion ? proyeccion.favor : clienteActivo.favor) || 0).toFixed(0)}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- STANDARD FULL VIEW ---
    return (
        <div className={`transition-all duration-300 p-4 rounded-2xl border ${modo === 'credito' ? 'bg-white border-orange-200 shadow-md ring-4 ring-orange-50' : 'border-transparent opacity-70 hover:opacity-100'}`}>
            <div className="flex justify-between items-center mb-3">
                <label className={`text-xs font-bold uppercase flex items-center gap-1 ${modo === 'credito' ? 'text-orange-600' : 'text-slate-400'}`}>
                    {modo === 'credito' && <User size={14} />} Cliente {modo === 'credito' ? '(Requerido)' : '(Opcional)'}
                </label>
                {!creandoCliente && !clienteActivo && (
                    <button onClick={() => setCreandoCliente(true)} className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1">
                        <UserPlus size={12} /> Nuevo
                    </button>
                )}
            </div>

            {!creandoCliente ? (
                clienteActivo ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-3 relative shadow-sm group animate-in zoom-in-95">
                        {!isLocked ? (
                            <button onClick={() => setClienteSeleccionado('')} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1"><X size={16} /></button>
                        ) : (
                            <div className="absolute top-2 right-2 text-slate-300 opacity-50"><Lock size={14} /></div>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500">
                                {clienteActivo.nombre.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-bold text-sm text-slate-800">{clienteActivo.nombre}</p>
                                <p className="text-xs text-slate-400 font-mono">{clienteActivo.documento}</p>
                            </div>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                            {/* QUADRANTS DISPLAY */}
                            <div className="flex gap-4 w-full justify-between">
                                <div className="flex flex-col items-start bg-red-50 px-2 py-1 rounded border border-red-100 flex-1 relative overflow-hidden transition-all duration-300">
                                    <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider mb-0.5">Deuda (Fiado)</span>
                                    <div className="flex items-baseline gap-2">
                                        {/* SI HAY PROYECCIÓN Y CAMBIA EL VALOR */}
                                        {proyeccion && proyeccion.deuda !== clienteActivo.deuda && (
                                            <span className="text-[10px] text-red-300 line-through decoration-red-300 opacity-60">
                                                ${(clienteActivo.deuda || 0).toFixed(2)}
                                            </span>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <span className={`font-black font-numbers text-sm transition-all duration-300 ${(proyeccion ? proyeccion.deuda : (clienteActivo.deuda || 0)) > 0
                                                ? 'text-red-600 scale-110 origin-left'
                                                : 'text-slate-300'
                                                }`}>
                                                ${((proyeccion ? proyeccion.deuda : clienteActivo.deuda) || 0).toFixed(2)}
                                            </span>
                                            {/* INDICADOR VISUAL DE CAMBIO */}
                                            {proyeccion && proyeccion.deuda < clienteActivo.deuda && (
                                                <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded-full font-bold animate-pulse">⬇</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end bg-emerald-50 px-2 py-1 rounded border border-emerald-100 flex-1 relative overflow-hidden transition-all duration-300">
                                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-0.5">Monedero</span>
                                    <div className="flex items-baseline gap-2 flex-row-reverse">
                                        {/* SI HAY PROYECCIÓN Y CAMBIA EL VALOR */}
                                        {proyeccion && proyeccion.favor !== clienteActivo.favor && (
                                            <span className="text-[10px] text-emerald-300 line-through decoration-emerald-300 opacity-60">
                                                ${(clienteActivo.favor || 0).toFixed(2)}
                                            </span>
                                        )}
                                        <div className="flex items-center gap-1 flex-row-reverse">
                                            <span className={`font-black font-numbers text-sm transition-all duration-300 ${(proyeccion ? proyeccion.favor : (clienteActivo.favor || 0)) > 0
                                                ? 'text-emerald-600 scale-110 origin-right'
                                                : 'text-slate-300'
                                                }`}>
                                                ${((proyeccion ? proyeccion.favor : clienteActivo.favor) || 0).toFixed(2)}
                                            </span>
                                            {/* INDICADOR VISUAL DE CAMBIO */}
                                            {proyeccion && proyeccion.favor > clienteActivo.favor && (
                                                <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1 rounded-full font-bold animate-pulse">⬆</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        <Search className={`absolute ${isTouch ? 'left-4 top-4 text-slate-400/80' : 'left-3 top-3 text-slate-400'}`} size={isTouch ? 24 : 16} strokeWidth={isTouch ? 2.5 : 2} />
                        <input
                            className={`w-full border rounded-xl outline-none focus:ring-2 transition-all font-bold ${isTouch
                                ? '!pl-12 pr-4 py-4 text-base placeholder:text-slate-400 shadow-sm'
                                : '!pl-10 pr-4 py-2.5 text-sm'
                                } ${modo === 'credito' ? 'border-orange-300 focus:ring-orange-200' : 'border-slate-200 focus:ring-blue-500'}`}
                            placeholder={isTouch ? "Buscar..." : "Buscar por nombre o ID..."}
                            value={busquedaCliente}
                            onChange={e => { setBusquedaCliente(e.target.value); setMostrarResultados(true); }}
                            onFocus={() => setMostrarResultados(true)}
                        />
                        {mostrarResultados && busquedaCliente && (
                            <div className="absolute top-full left-0 w-full bg-white border border-slate-200 shadow-xl rounded-xl mt-1 z-20 max-h-48 overflow-y-auto">
                                {clientesFiltrados.length === 0 ? (
                                    <div className="p-3 text-xs text-slate-400 text-center">No encontrado. <button onClick={() => setCreandoCliente(true)} className="text-blue-500 underline">Crear nuevo</button></div>
                                ) : (
                                    clientesFiltrados.map(c => (
                                        <div key={c.id} onClick={() => { setClienteSeleccionado(c.id); setBusquedaCliente(''); setMostrarResultados(false); }} className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0 transition-colors">
                                            <p className="font-bold text-sm text-slate-700">{c.nombre}</p>
                                            <p className="text-xs text-slate-400 font-mono">{c.documento}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )
            ) : (
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 animate-in fade-in">
                    <h4 className="text-xs font-black text-blue-600 uppercase mb-2">Nuevo Cliente Rápido</h4>
                    <input className="w-full p-2 border border-blue-200 rounded-lg mb-2 text-sm focus:border-blue-500 outline-none" placeholder="Nombre Completo" value={formCliente.nombre} onChange={e => setFormCliente({ ...formCliente, nombre: e.target.value })} autoFocus />
                    <input className="w-full p-2 border border-blue-200 rounded-lg mb-2 text-sm focus:border-blue-500 outline-none" placeholder="Cédula / ID" value={formCliente.cedula} onChange={e => setFormCliente({ ...formCliente, cedula: e.target.value })} />
                    <input className="w-full p-2 border border-blue-200 rounded-lg mb-2 text-sm focus:border-blue-500 outline-none" placeholder="Teléfono (Requerido)" value={formCliente.telefono} onChange={e => setFormCliente({ ...formCliente, telefono: e.target.value })} />
                    <div className="flex gap-2">
                        <button onClick={guardarClienteRapido} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-lg text-xs font-bold transition-colors">Guardar</button>
                        <button onClick={() => setCreandoCliente(false)} className="flex-1 bg-white hover:bg-slate-100 text-slate-600 py-1.5 rounded-lg text-xs font-bold transition-colors">Cancelar</button>
                    </div>
                </div>
            )
            }
        </div >
    );
}