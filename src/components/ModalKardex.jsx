import React, { useState, useMemo } from 'react';
import {
    X, Search, Filter, Trash2,
    CheckSquare, Square, Box, ArrowRight,
    TrendingUp, TrendingDown, AlertCircle,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useStore } from '../context/StoreContext';

// --- UTILS UI ---
const getSafeType = (val) => {
    try {
        if (!val) return 'DESCONOCIDO';
        return String(val).toUpperCase();
    } catch (e) { return 'ERROR'; }
};

export default function ModalKardex({ movimientos = [], productos = [], onClose }) {
    const { eliminarMovimientos, eliminarMovimiento } = useStore();

    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [fechaFiltro, setFechaFiltro] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [productoSeleccionado, setProductoSeleccionado] = useState('todos');
    const [usuarioFiltro, setUsuarioFiltro] = useState('todos');
    const [seleccionados, setSeleccionados] = useState([]);

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const ITEMS_POR_PAGINA = 10;

    // 1. Limpieza y Ordenamiento de Datos
    const listaMovimientos = useMemo(() => {
        if (!Array.isArray(movimientos)) return [];
        return movimientos.filter(m => m).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }, [movimientos]);

    // 2. Generación de Opciones de Filtro (Incluyendo Eliminados)
    const opcionesFiltro = useMemo(() => {
        // A. Productos Activos
        const activeProds = Array.isArray(productos)
            ? productos.map(p => ({
                id: p.id,
                nombre: p.nombre || 'Sin Nombre',
                deleted: false
            }))
            : [];

        const activeIds = new Set(activeProds.map(p => Number(p.id)));

        // B. Productos Eliminados (Encontrados en Logs pero no en Productos)
        // Buscamos IDs únicos en los movimientos que no estén en la lista activa
        const deletedProdsMap = new Map();

        listaMovimientos.forEach(m => {
            // Solo nos interesan logs con productId válido
            const mId = Number(m.productId);
            if (!isNaN(mId) && mId > 0 && !activeIds.has(mId)) {
                if (!deletedProdsMap.has(mId)) {
                    deletedProdsMap.set(mId, {
                        id: m.productId, // Usamos el ID del log (presumiblemente el mismo)
                        nombre: `${m.producto} (Eliminado)`,
                        deleted: true
                    });
                }
            }
        });

        // C. Fusionar y Ordenar
        const allProds = [...activeProds, ...deletedProdsMap.values()]
            // Eliminar duplicados de ID puros si existieran (paranoid check)
            .filter((v, i, a) => a.findIndex(t => Number(t.id) === Number(v.id)) === i)
            .sort((a, b) => a.nombre.localeCompare(b.nombre));

        const users = listaMovimientos.map(m => m.usuarioNombre || m.usuario || 'Sistema');

        return {
            productos: allProds,
            usuarios: [...new Set(users)].sort()
        };
    }, [productos, listaMovimientos]);

    // Resetear página al cambiar filtros
    React.useEffect(() => {
        setPaginaActual(1);
    }, [busqueda, fechaFiltro, filtroTipo, productoSeleccionado, usuarioFiltro]);

    // 3. Motor de Filtrado
    const movimientosFiltrados = useMemo(() => {
        return listaMovimientos.filter(mov => {
            try {
                // Filtro Producto (ID BASED)
                if (productoSeleccionado !== 'todos') {
                    // Convert selected ID to number for consistent comparison
                    const selectedId = Number(productoSeleccionado);
                    const movId = Number(mov.productId);

                    // Primary Match: ID
                    const matchId = !isNaN(movId) && movId === selectedId;

                    // Fallback Match: Name (for legacy logs without ID)
                    // We need to find the name of the selected product to compare against legacy logs
                    let matchName = false;
                    if (!matchId && (!mov.productId || isNaN(movId))) {
                        // Find in either active or deleted filter options (from Opción 3 logic)
                        const selectedProd = opcionesFiltro.productos.find(p => Number(p.id) === selectedId);

                        if (selectedProd) {
                            // Strip " (Eliminado)" suffix if present to match historical log name
                            const rawName = selectedProd.deleted
                                ? selectedProd.nombre.replace(' (Eliminado)', '')
                                : selectedProd.nombre;

                            if (mov.producto === rawName) {
                                matchName = true;
                            }
                        }
                    }

                    if (!matchId && !matchName) return false;
                }

                // Filtro Usuario
                const uActual = mov.usuarioNombre || mov.usuario || 'Sistema';
                if (usuarioFiltro !== 'todos' && uActual !== usuarioFiltro) return false;

                // Filtro Fecha
                if (fechaFiltro) {
                    const d = new Date(mov.fecha);
                    if (isNaN(d.getTime())) return false;
                    if (d.toISOString().split('T')[0] !== fechaFiltro) return false;
                }

                // Filtro Búsqueda Texto
                const texto = ((mov.producto || '') + ' ' + (mov.detalle || '') + ' ' + (mov.referencia || '')).toLowerCase();
                if (busqueda && !texto.includes(busqueda.toLowerCase())) return false;

                // Filtro Tipo (Entrada/Salida)
                const tipo = getSafeType(mov.tipo);
                if (filtroTipo === 'entrada') return tipo.includes('ENTRADA') || tipo.includes('DEVOLUCION');
                if (filtroTipo === 'salida') return tipo.includes('SALIDA') || tipo.includes('VENTA');

                return true;
            } catch (e) { return false; }
        });
    }, [listaMovimientos, productoSeleccionado, usuarioFiltro, fechaFiltro, busqueda, filtroTipo, productos, opcionesFiltro]);

    // 4. Datos Paginados
    const { paginados, totalPaginas, totalRegistros } = useMemo(() => {
        const total = movimientosFiltrados.length;
        const totalPags = Math.ceil(total / ITEMS_POR_PAGINA);
        const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
        const fin = inicio + ITEMS_POR_PAGINA;

        return {
            paginados: movimientosFiltrados.slice(inicio, fin),
            totalPaginas: totalPags,
            totalRegistros: total
        };
    }, [movimientosFiltrados, paginaActual]);

    // Acciones

    const toggleSeleccion = (id) => {
        setSeleccionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleEliminar = (ids) => {
        const lista = Array.isArray(ids) ? ids : [ids];
        Swal.fire({
            title: '¿Eliminar registros?',
            text: "Esta acción solo borra el historial, no afecta el stock actual.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#DC2626', // status.error
            confirmButtonText: 'Sí, borrar auditoría'
        }).then((r) => {
            if (r.isConfirmed) {
                if (Array.isArray(ids)) eliminarMovimientos(ids);
                else eliminarMovimiento(ids);
                setSeleccionados([]);
            }
        });
    };

    // 211: Popover LOGIC REMOVED -> Replaced by SweetAlert Details
    // 211: Improved Detailed View (Smart Parsing)
    const handleShowDetails = (mov) => {
        const cant = parseFloat(mov.cantidad);
        const stockF = parseFloat(mov.stockFinal);
        const tipoRaw = getSafeType(mov.tipo);

        // 🧠 Logic: Direction & Friendly Names
        const esSalida = tipoRaw.includes('SALIDA') || tipoRaw.includes('VENTA') || tipoRaw.includes('CONSUMO') || tipoRaw.includes('MERMA');
        const esNomina = tipoRaw.includes('CONSUMO') && (mov.detalle || '').toLowerCase().includes('nomina');

        // Smart Title Map
        let friendlyTitle = tipoRaw;
        if (esNomina) friendlyTitle = 'CONSUMO DE NÓMINA';
        else if (tipoRaw === 'CONSUMO_INTERNO') friendlyTitle = 'CONSUMO INTERNO / MERMA';
        else if (tipoRaw === 'VENTA_POS') friendlyTitle = 'VENTA POS';

        // 🕵️‍♂️ Payroll Extraction: "Consumo Nomina (Juan): Motivo"
        let empleadoAfectado = null;
        let motivoLimpio = mov.detalle;

        if (esNomina) {
            const match = mov.detalle?.match(/Consumo Nomina \((.*?)\):/i) || mov.detalle?.match(/Consumo Nomina: (.*)/i);
            // Si tiene parentesis, es el nuevo formato. Si no, es legacy (asumimos el motivo es todo)
            if (mov.detalle?.includes('(') && mov.detalle?.includes(')')) {
                const nameMatch = mov.detalle.match(/\((.*?)\)/);
                if (nameMatch) empleadoAfectado = nameMatch[1];
            } else {
                // Legacy support (older logs don't have name in parens)
                // We might infer it's generic
            }
        }

        Swal.fire({
            title: `<div class="flex flex-col items-center gap-1">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ficha de Movimiento</span>
                        <div class="flex items-center gap-2 text-xl font-black text-slate-800 tracking-tight">
                             ${friendlyTitle.replace(/_/g, ' ')}
                        </div>
                    </div>`,
            html: `
                <div class="flex flex-col gap-3 text-left p-1 select-text">
                    
                    <!-- 1. HEADER: PRODUCTO & CANTIDAD -->
                    <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm relative overflow-hidden">
                        <div class="absolute top-0 left-0 w-1 h-full ${esSalida ? 'bg-rose-500' : 'bg-emerald-500'}"></div>
                        <div class="pl-2">
                             <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Producto</div>
                             <div class="font-black text-slate-800 text-base leading-tight">${mov.producto}</div>
                        </div>
                         <div class="text-right">
                             <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Cantidad</div>
                             <div class="font-black text-3xl ${esSalida ? 'text-rose-600' : 'text-emerald-600'}">
                                ${esSalida ? '-' : '+'}${cant.toFixed(2)}
                             </div>
                             <div class="text-[9px] font-bold text-slate-400 mt-1 bg-white px-2 py-0.5 rounded border border-slate-100 inline-block">
                                Stock Post: ${stockF.toFixed(2)}
                             </div>
                        </div>
                    </div>

                    <!-- 2. EMPLEADO AFECTADO (Si aplica) -->
                    ${empleadoAfectado ? `
                    <div class="bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex items-center gap-3 animate-in zoom-in duration-300">
                        <div class="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                        <div>
                            <div class="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Se descontó a:</div>
                            <div class="font-black text-indigo-900 text-sm">${empleadoAfectado}</div>
                        </div>
                    </div>
                    ` : ''}

                    <!-- 3. METADATA GRID -->
                    <div class="grid grid-cols-2 gap-3">
                         <div class="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                            <span class="text-[9px] font-black text-slate-400 uppercase">📅 Fecha</span>
                            <div class="font-bold text-slate-700 text-xs mt-0.5">${new Date(mov.fecha).toLocaleDateString()}</div>
                            <div class="font-mono text-[9px] text-slate-400 font-bold">${new Date(mov.fecha).toLocaleTimeString()}</div>
                         </div>
                         <div class="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                            <span class="text-[9px] font-black text-slate-400 uppercase">👤 Registrado Por</span>
                            <div class="font-bold text-slate-700 text-xs mt-0.5 flex items-center gap-1">
                                 ${mov.usuarioNombre || mov.usuario || 'Sistema'}
                            </div>
                         </div>
                    </div>

                    <!-- 4. DETALLE / MOTIVO -->
                     <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-sm relative">
                        <div class="text-[9px] font-black text-slate-400 uppercase mb-2 border-b border-slate-50 pb-1">📝 Motivo / Detalle</div>
                        <div class="font-medium text-slate-600 text-sm leading-relaxed whitespace-pre-line italic">
                            "${mov.detalle || 'Sin detalle registrado'}"
                        </div>
                     </div>
                     
                     <!-- 5. FOOTER -->
                     <div class="text-[9px] text-slate-300 font-mono text-center pt-2 flex justify-between px-2">
                        <span>LID: ${mov.id || '#'}</span>
                        <span>${mov.referencia || 'SIN REF'}</span>
                     </div>
                </div>
            `,
            confirmButtonText: 'Cerrar Ficha',
            confirmButtonColor: '#1e293b',
            width: '400px',
            padding: '0 0 1.5rem 0',
            customClass: {
                title: 'pt-6 px-6 pb-2',
                htmlContainer: 'px-5'
            }
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200" onClick={onClose}>
            {/* Popover Bubble Layer REMOVED - Using SweetAlert for details now */}

            <div className="bg-surface-card dark:bg-slate-900 w-full max-w-7xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>

                {/* HEADER */}
                < div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900" >
                    <div>
                        <h2 className="text-xl font-black text-brand-secondary dark:text-white flex items-center gap-2">
                            <Box className="text-brand-primary" /> KARDEX INTELIGENTE 3.0
                        </h2>
                        <p className="text-slate-400 text-xs font-bold tracking-wide">Auditoría & Trazabilidad Estructural</p>
                    </div>
                    <div className="flex gap-2">
                        {seleccionados.length > 0 && (
                            <button onClick={() => handleEliminar(seleccionados)} className="bg-red-50 text-status-error px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-red-100 transition-colors">
                                <Trash2 size={16} /> BORRAR ({seleccionados.length})
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-600"><X size={24} /></button>
                    </div>
                </div >

                {/* BARRA DE HERRAMIENTAS */}
                < div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 items-center" >

                    {/* Buscador */}
                    < div className="relative flex-1 min-w-[180px]" >
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-brand-primary transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                            placeholder="Producto, referencia..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                        />
                    </div >

                    {/* Selector Producto */}
                    < select
                        className="py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black outline-none cursor-pointer text-slate-800 dark:text-slate-200 focus:border-brand-primary max-w-[180px]"
                        value={productoSeleccionado}
                        onChange={e => setProductoSeleccionado(e.target.value)}
                    >
                        <option value="todos">📦 Todos los Productos</option>
                        {
                            opcionesFiltro.productos.map((p) => (
                                <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))
                        }
                    </select >

                    {/* Selector Usuario */}
                    < select
                        className="py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black outline-none cursor-pointer text-slate-800 dark:text-slate-200 focus:border-brand-primary"
                        value={usuarioFiltro}
                        onChange={e => setUsuarioFiltro(e.target.value)}
                    >
                        <option value="todos">👤 Todos los Usuarios</option>
                        {opcionesFiltro.usuarios.map((n, i) => <option key={i} value={n}>{n}</option>)}
                    </select >

                    {/* Selector Fecha */}
                    < input
                        type="date"
                        className="py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black outline-none text-slate-800 dark:text-slate-200 focus:border-brand-primary"
                        value={fechaFiltro}
                        onChange={e => setFechaFiltro(e.target.value)}
                    />

                    {/* Toggle Tipo */}
                    < div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700" >
                        {
                            ['todos', 'entrada', 'salida'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setFiltroTipo(t)}
                                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${filtroTipo === t ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-700 hover:bg-white dark:hover:bg-slate-700'}`}
                                >
                                    {t}
                                </button>
                            ))
                        }
                    </div >
                </div >

                {/* TABLA DE DATOS */}
                < div className="flex-1 overflow-auto bg-white dark:bg-slate-900" >
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black border-b border-slate-300 dark:border-slate-700 sticky top-0 z-10 text-[11px] uppercase tracking-widest">
                            <tr>
                                <th className="p-4 w-10 text-center">
                                    <button onClick={() => seleccionados.length === movimientosFiltrados.length ? setSeleccionados([]) : setSeleccionados(movimientosFiltrados.map(m => m.id))}>
                                        {seleccionados.length > 0 && seleccionados.length === movimientosFiltrados.length ? <CheckSquare size={18} className="text-brand-primary" /> : <Square size={18} />}
                                    </button>
                                </th>
                                <th className="p-4">Movimiento</th>
                                <th className="p-4">Fecha / Hora</th>
                                <th className="p-4">Producto</th>
                                <th className="p-4 text-center">Cant.</th>
                                <th className="p-4 text-right">Saldo</th>
                                <th className="p-4">Detalle & Ref</th>
                                <th className="p-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {paginados.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-10 text-center text-slate-400 italic">
                                        No se encontraron movimientos con los filtros actuales.
                                    </td>
                                </tr>
                            ) : (
                                paginados.map((mov, idx) => (
                                    <KardexRow
                                        key={mov.id || idx}
                                        mov={mov}
                                        isSelected={seleccionados.includes(mov.id)}
                                        onToggle={() => toggleSeleccion(mov.id)}
                                        onDelete={() => handleEliminar(mov.id)}
                                        onShowDetails={() => handleShowDetails(mov)}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div >

                {/* PAGINATION FOOTER */}
                {
                    totalRegistros > 0 && (
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/30">
                            <span className="text-xs font-bold text-slate-500">
                                Mostrando {((paginaActual - 1) * ITEMS_POR_PAGINA) + 1} - {Math.min(paginaActual * ITEMS_POR_PAGINA, totalRegistros)} de {totalRegistros} registros
                            </span>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPaginaActual(1)}
                                    disabled={paginaActual === 1}
                                    className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                    title="Primera Página"
                                >
                                    <ChevronsLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                                    disabled={paginaActual === 1}
                                    className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                    title="Anterior"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                <div className="px-4 py-1 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 mx-2">
                                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                                        Página {paginaActual} / {totalPaginas}
                                    </span>
                                </div>

                                <button
                                    onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                                    disabled={paginaActual === totalPaginas}
                                    className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                    title="Siguiente"
                                >
                                    <ChevronRight size={16} />
                                </button>
                                <button
                                    onClick={() => setPaginaActual(totalPaginas)}
                                    disabled={paginaActual === totalPaginas}
                                    className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                    title="Última Página"
                                >
                                    <ChevronsRight size={16} />
                                </button>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
}

// --- SUBCOMPONENTE: FILA DE KARDEX ---
const KardexRow = ({ mov, isSelected, onToggle, onDelete, onShowDetails }) => {
    try {
        const tipo = getSafeType(mov.tipo);

        // Lógica Semántica
        const esEntrada = tipo.includes('ENTRADA') || tipo.includes('DEVOLUCION') || tipo.includes('COMPRA');
        const esVenta = tipo.includes('VENTA');
        const esAjuste = tipo.includes('AJUSTE');
        const esEliminacion = tipo.includes('ELIMINADO');
        const esConsumo = tipo.includes('CONSUMO');
        const esGasto = tipo.includes('GASTO');

        // Configuración Visual del Badge - Prioridad de Matching
        let badgeConfig = { color: 'bg-slate-100 text-slate-600', icon: Filter, label: 'OTRO' };

        // 🛠️ Casos Específicos (Prioridad Alta)
        if (tipo === 'GASTO_CAJA') {
            badgeConfig = { color: 'bg-purple-100 text-purple-700 border border-purple-200', icon: TrendingDown, label: 'GASTO' };
        } else if (tipo === 'GASTO_REVERTIDO') {
            badgeConfig = { color: 'bg-purple-50 text-purple-500 border border-purple-100', icon: TrendingUp, label: 'GASTO REVERTIDO' };
        } else if (tipo === 'CONSUMO_INTERNO') {
            badgeConfig = { color: 'bg-orange-100 text-orange-700 border border-orange-200', icon: TrendingDown, label: 'CONSUMO INTERNO' };
        } else if (tipo === 'COBRO_DEUDA') {
            badgeConfig = { color: 'bg-cyan-100 text-cyan-700 border border-cyan-200', icon: TrendingUp, label: 'COBRO DEUDA' };
        } else if (tipo === 'AJUSTE_ADMINISTRATIVO') {
            badgeConfig = { color: 'bg-amber-100 text-amber-700 border border-amber-200', icon: AlertCircle, label: 'AJUSTE ADMIN' };
        } else if (tipo === 'CORTE_Z') {
            badgeConfig = { color: 'bg-slate-700 text-white border border-slate-600', icon: Filter, label: 'CORTE Z' };

            // 🏪 Casos Generales (Prioridad Media)
        } else if (esVenta) {
            badgeConfig = { color: 'bg-red-100 text-red-700 border border-red-200', icon: TrendingDown, label: 'VENTA' };
        } else if (esEntrada && tipo.includes('DEVOLUCION')) {
            badgeConfig = { color: 'bg-indigo-100 text-indigo-700 border border-indigo-200', icon: TrendingUp, label: 'DEVOLUCIÓN' };
        } else if (esEntrada && tipo.includes('COMPRA')) {
            badgeConfig = { color: 'bg-emerald-100 text-emerald-700 border border-emerald-200', icon: TrendingUp, label: 'COMPRA' };
        } else if (esEntrada) {
            badgeConfig = { color: 'bg-emerald-100 text-emerald-700 border border-emerald-200', icon: TrendingUp, label: 'ENTRADA' };
        } else if (esConsumo) {
            badgeConfig = { color: 'bg-orange-100 text-orange-700 border border-orange-200', icon: TrendingDown, label: 'CONSUMO' };
        } else if (esGasto) {
            badgeConfig = { color: 'bg-purple-100 text-purple-700 border border-purple-200', icon: TrendingDown, label: 'GASTO' };
        } else if (esAjuste) {
            badgeConfig = { color: 'bg-amber-100 text-amber-700 border border-amber-200', icon: AlertCircle, label: 'AJUSTE' };
        } else if (esEliminacion) {
            badgeConfig = { color: 'bg-slate-900 text-white border border-slate-800', icon: Trash2, label: 'ELIMINADO' };
        }

        // Cálculo de Stock Anterior (Inverso) para mostrar flujo
        const cantidad = parseFloat(mov.cantidad);
        const stockFinal = parseFloat(mov.stockFinal);
        const stockPrevio = esEntrada ? (stockFinal - cantidad) : (stockFinal + cantidad);

        return (
            <tr
                className={`hover:bg-blue-50/30 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group border-b border-slate-100 dark:border-slate-800/50 ${isSelected ? 'bg-blue-100/50 dark:bg-blue-900/20' : 'bg-white dark:bg-slate-900'}`}
                onClick={onToggle}
            >
                <td className="p-4 text-center">
                    <button onClick={(e) => { e.stopPropagation(); onToggle() }} className="text-slate-300 group-hover:text-brand-primary transition-colors">
                        {isSelected ? <CheckSquare size={18} className="text-brand-primary" /> : <Square size={18} />}
                    </button>
                </td>

                {/* TIPO (Badge) */}
                <td className="p-4">
                    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg w-fit ${badgeConfig.color}`}>
                        <badgeConfig.icon size={14} strokeWidth={3} />
                        <span className="text-[10px] font-black">{badgeConfig.label}</span>
                    </div>
                </td>

                {/* FECHA */}
                <td className="p-4">
                    <div className="flex flex-col">
                        <span className="font-black text-slate-800 dark:text-slate-200 text-[11px]">
                            {new Date(mov.fecha).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold font-mono">
                            {new Date(mov.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </td>

                {/* PRODUCTO */}
                <td className="p-4 font-black text-slate-900 dark:text-white text-sm tracking-tight">
                    {mov.producto}
                </td>

                {/* CANTIDAD */}
                {/* CANTIDAD (SMART KARDEX 2.0) */}
                <td className={`p-4 text-center font-black text-sm font-numbers ${esEntrada ? 'text-emerald-600' : 'text-red-600'}`}>
                    <div className="flex flex-col items-center">
                        <span>
                            {esEntrada ? '+' : '-'}{
                                mov.meta?.cantidadOriginal
                                    ? parseFloat(mov.meta.cantidadOriginal).toFixed(2)
                                    : (isNaN(cantidad) ? '0.00' : cantidad.toFixed(2))
                            }
                        </span>
                        {mov.meta?.unidad && (
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                {mov.meta.unidad}
                            </span>
                        )}
                        {/* Subtitle with conversion if meta exists */}
                        {mov.meta?.factor && (
                            <span className="text-[9px] text-slate-300 font-mono mt-0.5">
                                ({(isNaN(cantidad) ? 0 : cantidad).toFixed(2)} Base @ x{mov.meta.factor})
                            </span>
                        )}
                    </div>
                </td>

                {/* STOCK (Flujo) */}
                <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2 text-xs font-mono">
                        <span className="text-slate-400 font-bold">{stockPrevio.toFixed(2)}</span>
                        <ArrowRight size={10} className="text-slate-400" />
                        <span className="font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            {stockFinal.toFixed(2)}
                        </span>
                    </div>
                </td>

                {/* DETALLE Y REF (CLICK HERE FOR DETAILS) */}
                <td className="p-4" onClick={(e) => { e.stopPropagation(); onShowDetails(); }}>
                    <div className="flex flex-col gap-0.5 cursor-pointer hover:bg-slate-50 p-1 -m-1 rounded-lg transition-colors group/detail">
                        <span className="text-[11px] text-slate-800 dark:text-slate-300 font-bold truncate max-w-[200px]" title={mov.detalle}>
                            {mov.detalle}
                        </span>

                        {/* More visual cue for clickability */}
                        <div className="flex items-center gap-1">
                            {mov.referencia && (
                                <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                                    {mov.referencia.toString().slice(-12)}
                                </span>
                            )}
                            <span className="text-[9px] text-slate-400 font-medium opacity-0 group-hover/detail:opacity-100 transition-opacity flex items-center gap-0.5">
                                <Search size={10} /> Ver Todo
                            </span>
                        </div>

                        <span className="text-[9px] text-slate-600 dark:text-slate-400 font-black mt-0.5">
                            Por: {mov.usuarioNombre || mov.usuario || 'Sistema'}
                        </span>
                    </div>
                </td>

                {/* ACCIONES */}
                <td className="p-4 text-center">
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete() }}
                        className="text-slate-300 hover:text-status-error p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Eliminar registro"
                    >
                        <Trash2 size={16} />
                    </button>
                </td>
            </tr>
        );
    } catch (e) { return null; }
};