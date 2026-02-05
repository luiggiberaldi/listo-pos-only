import React, { useState, useMemo } from 'react';
import { X, Search, Store, User, DollarSign, Package } from 'lucide-react';
import Swal from 'sweetalert2';
import ProductGrid from '../../pos/ProductGrid';
import { useInventory } from '../../../hooks/store/useInventory';
import { useFinanceIntegrator } from '../../../hooks/store/useFinanceIntegrator';
import { useEmployeeFinance } from '../../../hooks/store/useEmployeeFinance'; // ✅ Import
import { useStore } from '../../../context/StoreContext';
import { ActionGuard } from '../../security/ActionGuard';
import FinancialLayout from '../design/FinancialLayout';
import HoldToConfirmButton from '../design/HoldToConfirmButton';

export default function GoodsConsumptionView({ onClose }) {
    const { usuario, productos, configuracion, usuarios } = useStore();
    const { registrarConsumoInterno } = useInventory(usuario);
    const { registrarConsumoEmpleado } = useFinanceIntegrator();
    const { validarCapacidadEndeudamiento } = useEmployeeFinance(); // ✅ Destructure

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [consumidorType, setConsumidorType] = useState('SYSTEM');
    const [targetEmployeeId, setTargetEmployeeId] = useState('');
    const [goodsData, setGoodsData] = useState({
        cantidad: 1,
        motivo: ''
    });

    const CHIPS = ['Caducidad', 'Merma', 'Degustación', 'Consumo Propio', 'Error de Inventario'];

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

    const handleGoodsSubmit = async () => {
        if (!selectedProduct) {
            Swal.fire('Error', 'Selecciona un producto', 'warning');
            return;
        }
        if (consumidorType === 'EMPLOYEE' && !targetEmployeeId) {
            Swal.fire('Error', 'Debes seleccionar qué empleado consume.', 'warning');
            return;
        }

        // 🛡️ SECURITY CHECK: SELF CLAIM
        if (consumidorType === 'EMPLOYEE' && targetEmployeeId === usuario?.id) {
            if (!usuario.allowSelfConsume) {
                Swal.fire({
                    icon: 'error',
                    title: 'Acceso Denegado',
                    text: 'No tienes permisos para registrar tu propio consumo. Solicita a un supervisor.'
                });
                return;
            }
        }

        if (goodsData.motivo.length < 5) {
            Swal.fire('Error', 'El motivo del consumo es obligatorio', 'warning');
            return;
        }

        // 🛡️ VALIDAR LIMITE DE SUELDO
        if (consumidorType === 'EMPLOYEE') {
            const costoTotalEstimado = (selectedProduct.precio || 0) * goodsData.cantidad;
            const validacion = await validarCapacidadEndeudamiento(targetEmployeeId, costoTotalEstimado);

            if (!validacion.puede) {
                const { sueldo, deudaActual, disponible } = validacion.detalles || {};
                await Swal.fire({
                    title: 'Crédito Insuficiente',
                    html: `
                        <div class="text-left text-sm space-y-2">
                            <p>${validacion.mensaje}</p>
                            <hr />
                            <p><strong>Sueldo Base:</strong> $${sueldo?.toFixed(2)}</p>
                            <p><strong>Deuda Actual:</strong> $${deudaActual?.toFixed(2)}</p>
                            <p class="text-emerald-600"><strong>Disponible:</strong> $${disponible?.toFixed(2)}</p>
                            <p class="text-rose-600 font-bold mt-2">Costo Consumo: $${costoTotalEstimado.toFixed(2)}</p>
                        </div>
                    `,
                    icon: 'error',
                    confirmButtonText: 'Entendido'
                });
                return;
            }
        }

        setIsSubmitting(true);
        let result = { success: false, message: '' };
        try {
            if (consumidorType === 'EMPLOYEE') {
                result = await registrarConsumoEmpleado(targetEmployeeId, selectedProduct, goodsData.cantidad, goodsData.motivo);
            } else {
                const resInv = await registrarConsumoInterno({
                    id: selectedProduct.id,
                    unidadVenta: 'unidad',
                    cantidad: parseFloat(goodsData.cantidad)
                }, goodsData.motivo, usuario);
                result = { success: resInv.success, message: resInv.success ? 'Inventario ajustado.' : 'Error en inventario' };
            }
        } catch (error) {
            result = { success: false, message: error.message };
        }

        setIsSubmitting(false);
        if (result.success) {
            Swal.fire({ icon: 'success', title: 'Registro Exitoso', text: result.message, timer: 1500, showConfirmButton: false });
            onClose();
        } else {
            Swal.fire('Error', result.message || 'Hubo un problema registrando el consumo', 'error');
        }
    };

    // --- SIDE PANEL: CONTEXT & CONFIRM ---
    const SidePanel = () => (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
            {selectedProduct ? (
                <div className="space-y-6 flex-1 flex flex-col">
                    {/* 1. PRODUCT PREVIEW */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100 flex gap-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 opacity-50" />
                        <div className="w-16 h-16 bg-emerald-50 rounded-xl flex items-center justify-center text-3xl shadow-inner shrink-0 relative z-10">📦</div>
                        <div className="relative z-10 flex-1 min-w-0">
                            <h3 className="font-black text-slate-800 leading-tight mb-1 truncate" title={selectedProduct.nombre}>{selectedProduct.nombre}</h3>
                            <p className="text-xs text-slate-400 font-bold">Stock Actual: {selectedProduct.stock}</p>
                        </div>
                        <button onClick={() => setSelectedProduct(null)} className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors z-20">
                            <X size={14} />
                        </button>
                    </div>

                    {/* 2. QUANTITY BIG INPUT */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Cantidad</label>
                        <div className="flex items-center justify-center gap-2">
                            <input
                                type="number"
                                value={goodsData.cantidad}
                                onChange={e => setGoodsData({ ...goodsData, cantidad: parseFloat(e.target.value) })}
                                className="w-full bg-white rounded-xl py-3 text-center text-3xl font-black text-emerald-800 border border-emerald-100 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                            />
                        </div>
                    </div>

                    {/* 3. CONSUMER TYPE */}
                    <div className="space-y-2">
                        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                            <button onClick={() => setConsumidorType('SYSTEM')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${consumidorType === 'SYSTEM' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Local</button>
                            <button onClick={() => setConsumidorType('EMPLOYEE')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${consumidorType === 'EMPLOYEE' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Empleado</button>
                        </div>
                    </div>

                    {consumidorType === 'EMPLOYEE' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <select
                                value={targetEmployeeId}
                                onChange={e => setTargetEmployeeId(e.target.value)}
                                className="w-full p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-800 outline-none"
                            >
                                <option value="">-- Seleccionar --</option>
                                {usuarios.filter(u => u.activo && u.rol !== 'admin').map(u => (
                                    <option key={u.id} value={u.id}>{u.nombre}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* INFO COST */}
                    <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Total Estimado</p>
                        <p className="text-lg font-black text-slate-700">${((selectedProduct.precio || 0) * goodsData.cantidad).toFixed(2)}</p>
                    </div>

                    {/* FOOTER ACTION */}
                    <div className="mt-auto pt-4">
                        <ActionGuard permission={consumidorType === 'EMPLOYEE' ? 'POS_ACCESS' : 'SUPERVISOR_ACCESS'} onClick={handleGoodsSubmit}>
                            <HoldToConfirmButton
                                onConfirm={handleGoodsSubmit}
                                label="MANTENER PARA CONFIRMAR"
                                color="emerald"
                                disabled={!selectedProduct || goodsData.motivo.length < 5}
                            />
                        </ActionGuard>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 p-6 space-y-4">
                    <Package size={64} className="text-slate-300" />
                    <p className="font-bold text-slate-400 text-sm">Selecciona un producto de la izquierda para ver opciones.</p>
                </div>
            )}
        </div>
    );

    return (
        <FinancialLayout
            icon={Package}
            title="Consumo de Inventario"
            subtitle="Registrar mermas, consumo propio o errores"
            color="emerald"
            sidePanel={<SidePanel />}
        >
            {/* LEFT: PRODUCT SEARCH GRID */}
            <div className="flex flex-col h-full">
                <div className="mb-4 relative group">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar producto..."
                        className="w-full bg-slate-50 border border-transparent rounded-2xl pl-12 pr-4 py-4 text-slate-700 font-bold focus:bg-white focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-400"
                        autoFocus
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors">
                        <Search size={20} />
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0 -mx-2 px-2 pb-4 overflow-hidden">
                    <ProductGrid
                        filtrados={filteredProducts}
                        onSelectProducto={(prod) => setSelectedProduct(prod)}
                        tasa={configuracion.tasa}
                        permitirSinStock={true}
                        compactMode={true}
                    />
                </div>

                {/* MOTIVE INPUT (Always visible) */}
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Motivo del Movimiento</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {CHIPS.map(chip => (
                            <button
                                key={chip}
                                onClick={() => setGoodsData({ ...goodsData, motivo: chip + ': ' })}
                                className="px-2 py-1 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all active:scale-95"
                            >
                                {chip}
                            </button>
                        ))}
                    </div>
                    <textarea
                        value={goodsData.motivo}
                        onChange={e => setGoodsData({ ...goodsData, motivo: e.target.value })}
                        className="w-full bg-slate-50/50 border border-transparent rounded-xl p-3 text-sm font-medium focus:bg-white focus:border-emerald-200 outline-none resize-none h-20 placeholder:text-slate-300"
                        placeholder="Describe el motivo..."
                    />
                </div>
            </div>
        </FinancialLayout>
    );
}
