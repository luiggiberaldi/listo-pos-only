import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import Swal from 'sweetalert2';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

// Modales
import ModalProducto from '../components/ModalProducto';
import ModalAjusteStock from '../components/ModalAjusteStock';
import ModalKardex from '../components/ModalKardex';

// Subcomponentes
import InventarioStats from '../components/inventario/InventarioStats';
import InventarioHeader from '../components/inventario/InventarioHeader';
import ProductoRow from '../components/inventario/ProductoRow';

// ✅ INTEGRACIÓN DE SEGURIDAD FÉNIX
import { useSecureAction } from '../hooks/security/useSecureAction';
import { PERMISOS, useRBAC } from '../hooks/store/useRBAC';

// 🚀 NUEVO MOTOR DE PAGINACIÓN
import { useInventoryPagination } from '../hooks/ui/useInventoryPagination';

// ✅ UTILIDADES LOCALES (FASE 3)
import { generarEtiquetas } from '../components/inventario/PriceLabelGenerator';
import { BulkImportModal } from '../components/inventario/BulkImportModal';
import { LabelStudioModal } from '../components/inventario/LabelStudioModal';
import { PrintListsModal } from '../components/inventario/PrintListsModal'; // 🆕

export default function InventarioPage() {
    const {
        productos, agregarProducto, eliminarProducto, actualizarProducto,
        configuracion, movimientos, vaciarInventarioCompleto,
        categorias, usuario, crearCategoria, eliminarCategoria
    } = useStore();

    const { ejecutarAccionSegura } = useSecureAction();
    const { tienePermiso } = useRBAC(usuario);

    // PERMISOS
    const showCosts = tienePermiso(PERMISOS.INV_VER_COSTOS);
    const canSeeStats = tienePermiso(PERMISOS.REP_VER_DASHBOARD);
    const canManageAudit = tienePermiso(PERMISOS.ADMIN_AUDITORIA);

    // ESTADOS MODALES
    const [mostrarModal, setMostrarModal] = useState(false);
    const [mostrarImportModal, setMostrarImportModal] = useState(false);
    const [mostrarLabelStudio, setMostrarLabelStudio] = useState(false);
    const [mostrarPrintLists, setMostrarPrintLists] = useState(false); // 🆕
    const [productosParaEtiquetas, setProductosParaEtiquetas] = useState([]);
    const [productoAEditar, setProductoAEditar] = useState(null);
    const [mostrarKardex, setMostrarKardex] = useState(false);
    const [productoAjuste, setProductoAjuste] = useState(null);

    // En este diseño, mostrarCategorias se maneja localmente o se elimina si usas Tabs
    const [mostrarCategorias, setMostrarCategorias] = useState(false);

    const safeProductos = useMemo(() => Array.isArray(productos) ? productos : [], [productos]);

    const {
        datos: currentItems,
        totalPaginas,
        paginaActual,
        busqueda, setBusqueda,
        categoriaActiva, setCategoriaActiva,
        orden, setOrden,
        irAPagina, anteriorPagina, siguientePagina,
        totalItems
    } = useInventoryPagination(safeProductos, 50);

    const kpis = useMemo(() => {
        const lista = safeProductos;
        const totalProductos = lista.length;

        const { valorInventarioVenta, valorCostoInventario, stockBajo } = lista.reduce((acc, p) => {
            let precioRef = parseFloat(p.precio) || 0;
            if (p.tipoUnidad !== 'peso' && p.jerarquia?.unidad?.activo) {
                precioRef = parseFloat(p.jerarquia.unidad.precio) || 0;
            }

            const stock = parseFloat(p.stock) || 0;
            const costo = parseFloat(p.costo) || 0;
            const minStock = parseFloat(p.stockMinimo) || 5;

            acc.valorInventarioVenta += (precioRef * stock);
            acc.valorCostoInventario += (costo * stock);
            if (stock <= minStock) acc.stockBajo += 1;

            return acc;
        }, { valorInventarioVenta: 0, valorCostoInventario: 0, stockBajo: 0 });

        const gananciaProyectada = valorInventarioVenta - valorCostoInventario;

        return { totalProductos, valorInventarioVenta, valorCostoInventario, gananciaProyectada, stockBajo };
    }, [safeProductos]);

    // SELECCIÓN MÚLTIPLE (FASE 3 - REFINAMIENTO)
    const [selectedIds, setSelectedIds] = useState(new Set());

    const handleToggleSelect = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(new Set(currentItems.map(p => p.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    // 🖨️ HANDLERS UTILIDADES
    // 🖨️ HANDLERS UTILIDADES (FASE 4 REFACTOR: Separación Studio/Print)
    const handleOpenLabelStudio = () => {
        // Operación independiente: Si hay selección, usala. Si no, usa todo.
        const listaParaStudio = selectedIds.size > 0
            ? currentItems.filter(p => selectedIds.has(p.id))
            : currentItems;

        setProductosParaEtiquetas(listaParaStudio);
        setMostrarLabelStudio(true); // Solo abre modal
    };

    const handleOpenPrintLists = () => { // 🆕
        setMostrarPrintLists(true);
    };

    // Helper interno para ejecutar la impresión
    const executePrint = (productsToPrint) => {
        const savedConfig = JSON.parse(localStorage.getItem('listo_label_config')) || {};
        generarEtiquetas(productsToPrint, configuracion.tasa || 1, savedConfig);
    };

    // Imprimir desde Botón Individual (Directo, sin preguntar)
    const handlePrintSingle = (producto, context = null) => {
        let productToPrint = producto;

        // Si hay contexto de jerarquía (Ej: Bulto), creamos un "Producto Virtual" para la etiqueta
        if (context && context.unitId !== 'unidad') {
            productToPrint = {
                ...producto,
                precioVenta: context.overridePrice, // Usar el precio del bulto/paq
                _hierarchyLabel: `${context.label} x${context.factor}` // METADATA MÁGICA PARA EL GENERADOR
            };
        }

        executePrint([productToPrint]);
    };

    const actions = {
        // ... (existing actions)
        onEdit: (p) => { setProductoAEditar(p); setMostrarModal(true); },
        onDuplicate: (p) => {
            const copia = {
                ...p,
                nombre: p.nombre + ' (Copia)',
                codigo: '',
                id: null,
                stock: 0
            };
            setProductoAEditar(copia);
            setMostrarModal(true);
        },
        onDelete: (producto) => {
            Swal.fire({
                title: '¿Eliminar?',
                text: `Se borrará: ${producto.nombre}`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Sí, borrar'
            }).then((result) => {
                if (result.isConfirmed) eliminarProducto(producto.id);
            });
        },
        onAdjust: (p) => {
            setProductoAjuste(p)
        },
        onPrint: (p, ctx) => { // 🆕 Aceptamos contexto
            handlePrintSingle(p, ctx);
        }
    };

    // ... (modales helpers)

    // ... (modales helpers)

    const abrirModalCrear = () => {
        setProductoAEditar(null); setMostrarModal(true);
    };

    const guardarDesdeModal = (datos) => {
        if (productoAEditar && productoAEditar.id) {
            actualizarProducto(productoAEditar.id, datos);
        } else {
            agregarProducto(datos);
        }
        setMostrarModal(false);
    };

    const handleBorrarTodo = () => {
        Swal.fire({
            title: '¿VACIAR TODO EL INVENTARIO?',
            text: 'Esta acción borrará TODOS los productos y movimientos permanentemente. No se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Confirmación Final',
                    text: 'Para confirmar, escribe la palabra BORRAR a continuación:',
                    input: 'text',
                    inputPlaceholder: 'BORRAR',
                    inputAttributes: { autocapitalize: 'off' },
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    confirmButtonText: 'BORRAR TODO',
                    showLoaderOnConfirm: true,
                    preConfirm: (inputValue) => {
                        if (inputValue !== 'BORRAR') {
                            Swal.showValidationMessage('Debes escribir la palabra exacta: BORRAR')
                        }
                    }
                }).then((finalResult) => {
                    if (finalResult.isConfirmed) {
                        vaciarInventarioCompleto();
                        Swal.fire('¡Vaciado!', 'El inventario ha sido reiniciado a cero.', 'success');
                    }
                });
            }
        });
    };

    const handleCrearCategoria = async () => {
        const { value: nombre } = await Swal.fire({
            title: 'Nueva Categoría',
            input: 'text',
            inputLabel: 'Nombre de la categoría',
            inputPlaceholder: 'Ej: Lácteos',
            showCancelButton: true,
            confirmButtonColor: '#0f172a',
            inputValidator: (value) => {
                if (!value) return 'Debes escribir algo';
            }
        });

        if (nombre) {
            // Auto-Capitalize: "bebidas gaseosas" -> "Bebidas Gaseosas"
            const nombreCapitalizado = nombre.replace(/(?:^|\s|["'([{])+\S/g, match => match.toUpperCase());
            await crearCategoria(nombreCapitalizado);
            Swal.fire({ icon: 'success', title: 'Categoría creada', timer: 1500, showConfirmButton: false });
        }
    };

    const handleEliminarCategoria = async (nombre, e) => {
        Swal.fire({
            title: `¿Eliminar ${nombre}?`,
            text: "Los productos en esta categoría pasarán a 'General'.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const success = await eliminarCategoria(nombre);
                if (success) {
                    Swal.fire({ icon: 'success', title: 'Eliminada', timer: 1500, showConfirmButton: false });
                } else {
                    Swal.fire('Error', 'No se pudo eliminar (¿Es categoría protegida?)', 'error');
                }
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-6 animate-in fade-in duration-500 pb-20">
            <div className="max-w-[1600px] mx-auto">

                {/* MODALES */}
                {mostrarPrintLists && <PrintListsModal
                    isOpen={mostrarPrintLists}
                    onClose={() => setMostrarPrintLists(false)}
                    selectedIds={selectedIds}
                    allProducts={productos} // Pasamos TODO para que el modal pueda filtrar
                    onPrint={(lista, ctx) => executePrint(lista, ctx)} // Reusamos executePrint
                />}
                {mostrarLabelStudio && <LabelStudioModal isOpen={mostrarLabelStudio} onClose={() => setMostrarLabelStudio(false)} selectedProducts={productosParaEtiquetas} tasa={configuracion.tasa || 1} />}
                {mostrarModal && <ModalProducto productoEditar={productoAEditar} onClose={() => setMostrarModal(false)} onGuardar={guardarDesdeModal} configuracion={configuracion} />}
                {mostrarImportModal && <BulkImportModal isOpen={mostrarImportModal} onClose={() => setMostrarImportModal(false)} onImportCompleted={() => Swal.fire("Listo", "Inventario actualizado", "success")} />}
                {mostrarKardex && canManageAudit && <ModalKardex movimientos={movimientos} productos={productos} onClose={() => setMostrarKardex(false)} />}
                {productoAjuste && <ModalAjusteStock producto={productoAjuste} onClose={() => setProductoAjuste(null)} onConfirm={(d) => { actualizarProducto(d.id, d); Swal.fire({ title: '¡Ajustado!', icon: 'success', timer: 1500, showConfirmButton: false }); setProductoAjuste(null); }} />}

                {/* KPIS */}
                {canSeeStats && <InventarioStats kpis={kpis} />}

                {/* HEADER & FILTROS */}
                <InventarioHeader
                    busqueda={busqueda}
                    setBusqueda={setBusqueda}
                    filtroCategoria={categoriaActiva}
                    setFiltroCategoria={setCategoriaActiva}
                    mostrarCategorias={mostrarCategorias}
                    setMostrarCategorias={setMostrarCategorias}
                    categorias={categorias}
                    handleCrearCategoria={handleCrearCategoria}
                    handleEliminarCategoria={handleEliminarCategoria}
                    handleBorrarTodo={handleBorrarTodo}
                    setMostrarKardex={canManageAudit ? setMostrarKardex : null}
                    abrirModalCrear={abrirModalCrear}
                    tieneProductos={safeProductos.length > 0}
                    // 🆕 PROPS NUEVAS
                    onImportClick={() => setMostrarImportModal(true)}
                    onPrintAllClick={handleOpenPrintLists}
                    onOpenLabelStudio={handleOpenLabelStudio} // 🆕
                    selectedCount={selectedIds.size} // Pasamos cuenta
                />

                {/* TABLA MAESTRA */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col relative">

                    {/* CONTROL DE ORDENAMIENTO */}
                    {/* ... */}

                    <div className="overflow-x-auto flex-1 max-h-[70vh] custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-5 w-10 text-center">
                                        <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size > 0 && selectedIds.size === currentItems.length} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                    </th>
                                    <th className="px-4 py-5">Producto / SKU</th>
                                    <th className="px-6 py-5">Estado</th>
                                    <th className="px-6 py-5 w-48">Precio Venta</th>
                                    {showCosts && <><th className="px-6 py-5">Costo Ref</th><th className="px-6 py-5">Margen</th></>}
                                    <th className="px-6 py-5 w-72">Disponibilidad</th>
                                    <th className="px-6 py-5 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {currentItems.length === 0 ? (
                                    <tr><td colSpan={showCosts ? 7 : 6} className="p-20 text-center text-slate-400 italic bg-slate-50/30">No se encontraron productos para esta búsqueda.</td></tr>
                                ) : (
                                    currentItems.map((p) => (
                                        <ProductoRow
                                            key={p.id}
                                            p={p}
                                            actions={actions}
                                            configuracion={configuracion}
                                            showCosts={showCosts}
                                            // 🆕
                                            isSelected={selectedIds.has(p.id)}
                                            onToggleSelect={() => handleToggleSelect(p.id)}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINACIÓN */}
                    {totalItems > 0 && (
                        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-medium">
                                Mostrando <b className="text-slate-700 dark:text-white">{(paginaActual - 1) * 50 + 1}-{Math.min(paginaActual * 50, totalItems)}</b> de <b className="text-slate-700 dark:text-white">{totalItems}</b> items
                            </span>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={anteriorPagina}
                                    disabled={paginaActual === 1}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 hover:bg-slate-50 hover:border-slate-300 transition-all"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                <div className="hidden sm:flex gap-1">
                                    {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                                        let pNum = i + 1;
                                        if (totalPaginas > 5 && paginaActual > 3) pNum = paginaActual - 2 + i;
                                        if (pNum > totalPaginas) return null;

                                        return (
                                            <button
                                                key={pNum}
                                                onClick={() => irAPagina(pNum)}
                                                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${paginaActual === pNum ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}
                                            >
                                                {pNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={siguientePagina}
                                    disabled={paginaActual === totalPaginas}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 disabled:opacity-30 hover:bg-slate-50 hover:border-slate-300 transition-all"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}