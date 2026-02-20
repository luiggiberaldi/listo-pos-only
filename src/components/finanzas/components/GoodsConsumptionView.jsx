import React, { useState, useMemo } from 'react';
import { Search, Store, User, Package, Trash2, ShoppingCart, Plus, Minus, Clock, FileText } from 'lucide-react';
import Swal from 'sweetalert2';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { useInventory } from '../../../hooks/store/useInventory';
import { useFinanceIntegrator } from '../../../hooks/store/useFinanceIntegrator';
import { useEmployeeFinance } from '../../../hooks/store/useEmployeeFinance';
import { useStore } from '../../../context/StoreContext';
import { useConfigStore } from '../../../stores/useConfigStore';
import { hasFeature, FEATURES, getPlan } from '../../../config/planTiers';
import FinancialLayout from '../design/FinancialLayout';
import HoldToConfirmButton from '../design/HoldToConfirmButton';

export default function GoodsConsumptionView({ onClose }) {
    const { usuario, productos, usuarios } = useStore();
    const { registrarConsumoInterno, revertirConsumoInterno } = useInventory(usuario);
    const { registrarConsumoEmpleado } = useFinanceIntegrator();
    const { validarCapacidadEndeudamiento } = useEmployeeFinance();

    // 🏪 PLAN GATING: Employee features
    const { license } = useConfigStore();
    const planId = license?.plan || 'bodega';
    const hasEmployeeFeatures = hasFeature(planId, FEATURES.EMPLEADOS_BASICO) || hasFeature(planId, FEATURES.ROLES);
    const planConfig = getPlan(planId);
    const maxEmpleados = planConfig.maxEmpleados ?? 0;
    const isBasicEmployeePlan = hasFeature(planId, FEATURES.EMPLEADOS_BASICO) && !hasFeature(planId, FEATURES.ROLES);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [consumidorType, setConsumidorType] = useState('SYSTEM'); // 'SYSTEM' (Local) | 'EMPLOYEE'
    const [targetEmployeeId, setTargetEmployeeId] = useState('');

    // 🔴 LIVE QUERY: Consumos de Hoy
    const consumosRecientes = useLiveQuery(async () => {
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
        const logs = await db.logs
            .where('fecha')
            .between(startOfDay.toISOString(), endOfDay.toISOString())
            .and(l => l.tipo === 'CONSUMO_INTERNO')
            .reverse()
            .toArray();
        return logs.slice(0, 5);
    }, []) || [];

    // 🗑️ Handle Revert
    const handleDeleteConsumo = async (log) => {
        const result = await Swal.fire({
            title: '¿Revertir Consumo?',
            text: `Se devolverá ${log.cantidad} ${log.producto} al inventario.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Sí, restaurar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const res = await revertirConsumoInterno(log.id, `Eliminado por usuario: ${usuario?.nombre}`, usuario);
                if (res.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Restaurado',
                        text: 'El producto ha vuelto al inventario.',
                        timer: 1500,
                        showConfirmButton: false
                    });
                }
            } catch (error) {
                Swal.fire('Error', error.message || 'No se pudo revertir', 'error');
            }
        }
    };

    // 🛒 CART STATE
    const [cart, setCart] = useState([]); // [{ product, cantidad, motivo }]
    const [globalMotivo, setGlobalMotivo] = useState(''); // Motivo general para todos (opcional si se quiere individual)

    // Chips de motivos comunes
    const CHIPS = ['Caducidad', 'Merma', 'Degustación', 'Consumo Propio', 'Error de Inventario'];

    // 🔍 PRODUCT FILTER
    const filteredProducts = useMemo(() => {
        if (!productos) return [];
        if (!searchTerm) {
            return [...productos].sort((a, b) => b.stock - a.stock).slice(0, 30);
        }
        const lower = searchTerm.toLowerCase();
        return productos.filter(p =>
            p.nombre.toLowerCase().includes(lower) ||
            (p.codigo && p.codigo.includes(lower))
        ).slice(0, 30);
    }, [productos, searchTerm]);

    // ➕ ADD TO CART
    const handleAddToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, cantidad: item.cantidad + 1 }
                        : item
                );
            }
            return [...prev, { product, cantidad: 1 }];
        });
    };

    // ➖ REMOVE / DECREMENT
    const handleRemoveOne = (productId) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === productId);
            if (existing.cantidad > 1) {
                return prev.map(item =>
                    item.product.id === productId
                        ? { ...item, cantidad: item.cantidad - 1 }
                        : item
                );
            }
            return prev.filter(item => item.product.id !== productId);
        });
    };

    // 💰 CART TOTALS
    const cartTotal = useMemo(() => {
        return cart.reduce((total, item) => total + (item.product.precio || 0) * item.cantidad, 0);
    }, [cart]);

    const cartCount = useMemo(() => {
        return cart.reduce((acc, item) => acc + item.cantidad, 0);
    }, [cart]);


    // 🚀 SUBMIT PROCESS
    const handleBatchSubmit = async () => {
        if (cart.length === 0) {
            Swal.fire('Carrito Vacío', 'Agrega productos antes de confirmar.', 'warning');
            return;
        }

        if (globalMotivo.length < 3) {
            Swal.fire('Motivo Requerido', 'Indica un motivo general para este consumo.', 'warning');
            return;
        }

        if (consumidorType === 'EMPLOYEE' && !targetEmployeeId) {
            Swal.fire('Empleado Requerido', 'Selecciona quién consume los productos.', 'warning');
            return;
        }

        // [FIX M4] Pre-validar stock de TODO el carrito antes de procesar
        const sinStock = cart.filter(item => {
            const prod = productos?.find(p => p.id === item.product.id);
            return !prod || (prod.stock || 0) < item.cantidad;
        });
        if (sinStock.length > 0) {
            const nombres = sinStock.map(i => `${i.product.nombre} (pide ${i.cantidad}, hay ${productos?.find(p => p.id === i.product.id)?.stock || 0})`).join('\n');
            Swal.fire('Stock Insuficiente', `Los siguientes productos no tienen stock suficiente:\n${nombres}`, 'warning');
            return;
        }

        // 🛡️ SECURITY CHECK: SELF CLAIM
        if (consumidorType === 'EMPLOYEE' && targetEmployeeId === usuario?.id) {
            if (!usuario.allowSelfConsume) {
                Swal.fire('Acceso Denegado', 'No puedes registrar tu propio consumo. Pide a otro supervisor.', 'error');
                return;
            }
        }

        // 🛡️ VALIDAR LIMITE DE SUELDO (BATCH TOTAL)
        if (consumidorType === 'EMPLOYEE') {
            const validacion = await validarCapacidadEndeudamiento(targetEmployeeId, cartTotal);
            if (!validacion.puede) {
                const { disponible } = validacion.detalles || {};
                await Swal.fire({
                    title: 'Crédito Insuficiente',
                    html: `
                        <div class="text-left text-sm space-y-2">
                            <p>${validacion.mensaje}</p>
                            <hr />
                            <p><strong>Disponible:</strong> $${disponible?.toFixed(2)}</p>
                            <p class="text-rose-600 font-bold">Total Carrito: $${cartTotal.toFixed(2)}</p>
                            <p class="text-xs text-gray-500 mt-2">Elimina items para ajustar al presupuesto.</p>
                        </div>
                    `,
                    icon: 'error'
                });
                return;
            }
        }

        // ✅ START PROCESSING
        setIsSubmitting(true);
        let successCount = 0;
        let failCount = 0;

        // Process Loop
        for (const item of cart) {
            try {
                let result;
                const motivoFinal = `${globalMotivo} (Lote)`;

                if (consumidorType === 'EMPLOYEE') {
                    result = await registrarConsumoEmpleado(targetEmployeeId, item.product, item.cantidad, motivoFinal);
                } else {
                    // Local Consumption
                    result = await registrarConsumoInterno({
                        id: item.product.id,
                        unidadVenta: 'unidad',
                        cantidad: item.cantidad
                    }, motivoFinal, usuario);
                }

                if (result.success) successCount++;
                else failCount++;

            } catch (error) {
                console.error("Error en batch item:", error);
                failCount++;
            }
        }

        setIsSubmitting(false);

        if (failCount === 0) {
            Swal.fire({
                icon: 'success',
                title: 'Consumo Procesado',
                text: `Se registraron ${successCount} items correctamente.`,
                timer: 2000,
                showConfirmButton: false
            });
            setCart([]);
            setGlobalMotivo('');
            setSearchTerm('');
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'Proceso Parcial',
                text: `Exito: ${successCount} | Fallos: ${failCount}. Revisa el inventario.`,
            });
        }
    };

    // [FIX m3] Memoizar SidePanel para evitar re-mount en cada render
    const sidePanel = useMemo(() => (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
            {/* 1. Header & Consumer Selector */}
            <div className="shrink-0 space-y-4 mb-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carrito de Salida</h3>
                    <div className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {cartCount} items
                    </div>
                </div>

                {/* Consumer type toggle — only show if plan has employee features */}
                {hasEmployeeFeatures && (
                    <div className="bg-slate-50 p-1 rounded-xl flex border border-slate-200">
                        <button
                            onClick={() => setConsumidorType('SYSTEM')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${consumidorType === 'SYSTEM' ? "bg-white text-emerald-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
                                }`}
                        >
                            <Store size={14} />
                            Uso Local
                        </button>
                        <button
                            onClick={() => setConsumidorType('EMPLOYEE')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${consumidorType === 'EMPLOYEE' ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
                                }`}
                        >
                            <User size={14} />
                            Empleado
                            {isBasicEmployeePlan && <span className="text-[9px] bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded-full font-black">Máx {maxEmpleados}</span>}
                        </button>
                    </div>
                )}

                {consumidorType === 'EMPLOYEE' && (
                    <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                        <select
                            value={targetEmployeeId}
                            onChange={(e) => setTargetEmployeeId(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 font-medium"
                        >
                            <option value="">-- Seleccionar Empleado --</option>
                            {usuarios
                                .filter(u => u.activo && u.rol !== 'admin')
                                .slice(0, maxEmpleados === Infinity ? undefined : maxEmpleados)
                                .map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.nombre}
                                    </option>
                                ))}
                        </select>
                        {isBasicEmployeePlan && (
                            <p className="text-[10px] text-slate-400 mt-1 pl-1">Plan Abasto: hasta {maxEmpleados} empleados. Actualiza a Minimarket para equipos más grandes.</p>
                        )}
                    </div>
                )}
            </div>



            {/* 🆕 HISTORY SECTION */}
            <div className="shrink-0 mb-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 max-h-40 overflow-y-auto custom-scrollbar">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Clock size={10} /> Consumos Recientes
                </h3>
                {consumosRecientes.length === 0 ? (
                    <p className="text-[10px] text-slate-300 text-center py-2">Sin movimientos hoy</p>
                ) : (
                    <div className="space-y-1.5">
                        {consumosRecientes.map((log) => (
                            <div key={log.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 group">
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold text-slate-700 truncate">{log.producto}</p>
                                    <p className="text-[9px] text-slate-400 truncate">
                                        {log.detalle || 'Consumo'} • <span className="text-emerald-600 font-bold">-{parseFloat(log.cantidad).toFixed(2)}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDeleteConsumo(log)}
                                    className="ml-2 p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                    title="Devolver al Inventario"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 2. Cart List (Scrollable) */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar min-h-0">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 opacity-60">
                        <ShoppingCart size={32} />
                        <p className="text-xs font-medium text-center px-6">Selecciona productos de la izquierda para agregarlos</p>
                    </div>
                ) : (
                    cart.map(item => (
                        <div key={item.product.id} className="bg-white p-2 rounded-xl border border-slate-100 flex items-center gap-3 shadow-sm group">
                            <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center font-bold text-slate-400 text-[10px]">
                                {item.product.nombre.substring(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-slate-700 truncate">{item.product.nombre}</h4>
                                <p className="text-[10px] text-slate-400">${item.product.precio?.toFixed(2)} c/u</p>
                            </div>

                            {/* QTY CONTROLS */}
                            <div className="flex items-center bg-slate-50 rounded-lg border border-slate-100">
                                <button onClick={() => handleRemoveOne(item.product.id)} className="w-6 h-6 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 rounded text-slate-400">
                                    {item.cantidad === 1 ? <Trash2 size={10} /> : <Minus size={10} />}
                                </button>
                                <span className="text-xs font-bold w-4 text-center text-slate-600">{item.cantidad}</span>
                                <button onClick={() => handleAddToCart(item.product)} className="w-6 h-6 flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-500 rounded text-slate-400">
                                    <Plus size={10} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 3. Footer Actions */}
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 shrink-0">
                {/* Total */}
                <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-slate-400 uppercase">Total Estimado</span>
                    <span className="text-2xl font-black text-slate-800">${cartTotal.toFixed(2)}</span>
                </div>

                {/* Motivo */}
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                        {CHIPS.map(chip => (
                            <button
                                key={chip}
                                onClick={() => setGlobalMotivo(chip)}
                                className={`text-[10px] px-2 py-1 rounded-md border transition-all font-bold uppercase ${globalMotivo === chip
                                    ? "bg-slate-800 border-slate-800 text-white"
                                    : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                                    }`}
                            >
                                {chip}
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        placeholder="Motivo del consumo..."
                        value={globalMotivo}
                        onChange={e => setGlobalMotivo(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-lg p-2 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400 text-slate-700"
                    />
                </div>

                {/* Submit Button */}
                <HoldToConfirmButton
                    onConfirm={handleBatchSubmit}
                    label={isSubmitting ? "PROCESANDO..." : `CONFIRMAR (${cartCount})`}
                    color="emerald"
                    disabled={cart.length === 0 || isSubmitting || !globalMotivo || (consumidorType === 'EMPLOYEE' && !targetEmployeeId)}
                />
            </div>
        </div >
    ), [consumidorType, targetEmployeeId, consumosRecientes, cart, cartCount, cartTotal, globalMotivo, isSubmitting, usuarios, CHIPS]);

    return (
        <FinancialLayout
            icon={Package}
            title="Consumo de Inventario"
            subtitle={hasEmployeeFeatures ? "Registra mermas, uso interno o consumo de empleados." : "Registra mermas y uso interno."}
            color="emerald"
            sidePanel={sidePanel}
        >
            <div className="h-full flex flex-col">
                {/* Search Bar */}
                <div className="relative mb-6 shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar producto por nombre o código..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        autoFocus
                        className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-slate-700 font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-400 shadow-inner"
                    />
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredProducts.map(product => {
                            const inCart = cart.find(i => i.product.id === product.id);
                            return (
                                <button
                                    key={product.id}
                                    onClick={() => handleAddToCart(product)}
                                    className={`relative group p-4 rounded-2xl border text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col gap-2 ${inCart
                                        ? "bg-emerald-50 border-emerald-200 shadow-md ring-1 ring-emerald-500/20"
                                        : "bg-white border-slate-100 hover:border-emerald-200"
                                        }`}
                                >
                                    <div className="flex justify-between items-start w-full">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase transition-colors ${inCart ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600'}`}>
                                            {product.nombre.substring(0, 2)}
                                        </div>
                                        {inCart && (
                                            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-in zoom-in">
                                                x{inCart.cantidad}
                                            </span>
                                        )}
                                    </div>

                                    <div className="w-full">
                                        <h4 className={`text-sm font-bold line-clamp-2 leading-tight ${inCart ? 'text-emerald-900' : 'text-slate-700'}`}>{product.nombre}</h4>
                                        <div className="mt-2 flex justify-between items-end">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{product.stock} UNDS</span>
                                            <span className="text-emerald-600 font-black text-sm">${product.precio?.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    {filteredProducts.length === 0 && (
                        <div className="h-40 flex flex-col items-center justify-center text-slate-300">
                            <Package size={48} className="mb-2 opacity-50" />
                            <p className="font-bold">No se encontraron productos</p>
                        </div>
                    )}
                </div>
            </div>
        </FinancialLayout>
    );
}
