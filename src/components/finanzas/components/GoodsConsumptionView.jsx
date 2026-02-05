import React, { useState, useMemo } from 'react';
import { X, Search, Store, User, DollarSign, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';
import ProductGrid from '../../pos/ProductGrid';
import { useInventory } from '../../../hooks/store/useInventory';
import { useFinanceIntegrator } from '../../../hooks/store/useFinanceIntegrator';
import { useStore } from '../../../context/StoreContext';
import { ActionGuard } from '../../security/ActionGuard';

export default function GoodsConsumptionView({ onClose }) {
    const { usuario, productos, configuracion, usuarios } = useStore();
    const { registrarConsumoInterno } = useInventory(usuario);
    const { registrarConsumoEmpleado } = useFinanceIntegrator();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [consumidorType, setConsumidorType] = useState('SYSTEM');
    const [targetEmployeeId, setTargetEmployeeId] = useState('');
    const [goodsData, setGoodsData] = useState({
        cantidad: 1,
        motivo: ''
    });

    const CHIPS = ['Proveedores', 'Servicios', 'Personal', 'Mantenimiento'];

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
            Swal.fire({ icon: 'success', title: 'Registro Exitoso', text: result.message, timer: 2000, showConfirmButton: false });
            onClose();
        } else {
            Swal.fire('Error', result.message || 'Hubo un problema registrando el consumo', 'error');
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/30">
            <div className="flex-1 overflow-auto custom-scrollbar p-8">
                {!selectedProduct ? (
                    <div className="flex flex-col min-h-[400px] h-full">
                        <div className="mb-6 relative max-w-lg mx-auto w-full group">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Busca por nombre o código..."
                                className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none shadow-sm font-bold transition-all placeholder:text-slate-300 group-hover:border-slate-300"
                                autoFocus
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors">
                                <Search size={20} />
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm p-1">
                            <ProductGrid
                                filtrados={filteredProducts}
                                onSelectProducto={(prod) => setSelectedProduct(prod)}
                                tasa={configuracion.tasa}
                                permitirSinStock={true}
                                compactMode={true}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="max-w-md mx-auto space-y-6 py-4 animate-in fade-in slide-in-from-right-8 duration-300">
                        {/* PRODUCT CARD */}
                        <div className="bg-white p-1 rounded-[2rem] border border-slate-200 shadow-lg relative overflow-hidden group hover:shadow-xl transition-all">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-10 -mt-10 opacity-50 pointer-events-none transition-transform group-hover:scale-110" />
                            <div className="flex items-center gap-5 p-5 relative z-10">
                                <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-4xl shadow-inner border border-slate-100">📦</div>
                                <div className="flex-1">
                                    <h3 className="font-black text-slate-800 text-lg leading-tight line-clamp-2 mb-1">{selectedProduct.nombre}</h3>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                        Stock: {selectedProduct.stock}
                                    </span>
                                </div>
                                <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-all">
                                    <X size={16} strokeWidth={3} />
                                </button>
                            </div>
                        </div>

                        {/* QUIÉN CONSUME */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">¿Quién consume?</label>
                            <div className="flex bg-slate-50 rounded-xl p-1 gap-1">
                                <button
                                    onClick={() => setConsumidorType('SYSTEM')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${consumidorType === 'SYSTEM' ? 'bg-white shadow text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Store size={14} /> Local / Dueño
                                </button>
                                <button
                                    onClick={() => setConsumidorType('EMPLOYEE')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${consumidorType === 'EMPLOYEE' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <User size={14} /> Empleado
                                </button>
                            </div>

                            {consumidorType === 'EMPLOYEE' && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <select
                                        value={targetEmployeeId}
                                        onChange={e => setTargetEmployeeId(e.target.value)}
                                        className="w-full p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-sm font-bold text-indigo-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    >
                                        <option value="">-- Seleccionar Empleado --</option>
                                        {usuarios
                                            ?.filter(u => u.activo && u.rol !== 'admin')
                                            ?.map(u => (
                                                <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>
                                            ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Cantidad a Descontar</label>
                            <div className="flex items-center justify-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm max-w-[200px] mx-auto">
                                <button
                                    onClick={() => setGoodsData({ ...goodsData, cantidad: Math.max(1, goodsData.cantidad - 1) })}
                                    className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all font-black text-xl active:scale-95"
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    value={goodsData.cantidad}
                                    onChange={e => setGoodsData({ ...goodsData, cantidad: parseFloat(e.target.value) || 0 })}
                                    className="flex-1 w-full bg-transparent border-none text-center text-slate-800 text-3xl font-black focus:ring-0 p-0"
                                />
                                <button
                                    onClick={() => setGoodsData({ ...goodsData, cantidad: goodsData.cantidad + 1 })}
                                    className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all font-black text-xl active:scale-95"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* INFO IMPACTO */}
                        <div className={`p-4 rounded-2xl flex gap-3 text-xs shadow-sm items-center ${consumidorType === 'EMPLOYEE' ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' : 'bg-amber-50 border border-amber-100 text-amber-700'}`}>
                            <div className="p-2 bg-white rounded-full shrink-0 shadow-sm">
                                <DollarSign size={18} className={consumidorType === 'EMPLOYEE' ? 'text-indigo-500' : 'text-amber-500'} />
                            </div>
                            <div>
                                <p className="font-bold opacity-90">{consumidorType === 'EMPLOYEE' ? 'CARGO A NÓMINA:' : 'GASTO COSTO:'}</p>
                                <p className="font-medium opacity-80 mt-0.5">
                                    {consumidorType === 'EMPLOYEE'
                                        ? `Se cobrará $${((selectedProduct.precio || 0) * goodsData.cantidad).toFixed(2)} al empleado.`
                                        : `Se registrará pérdida por valor de inventario (costo).`
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Motivo del Consumo</label>
                            <div className="flex flex-wrap gap-2 mb-1">
                                {CHIPS.map(chip => (
                                    <button
                                        key={chip}
                                        onClick={() => setGoodsData({ ...goodsData, motivo: chip + ': ' })}
                                        className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-400 transition-all active:scale-95"
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={goodsData.motivo}
                                onChange={e => setGoodsData({ ...goodsData, motivo: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none resize-none h-28 text-sm font-medium transition-all shadow-sm placeholder:text-slate-300"
                                placeholder={consumidorType === 'EMPLOYEE' ? "Ej: Almuerzo, Merienda..." : "Ej: Caducidad, Merma..."}
                                maxLength={200}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 w-full rounded-b-[2rem]">
                <button onClick={onClose} className="px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">Cancelar</button>

                {selectedProduct && (
                    <ActionGuard
                        permission={consumidorType === 'EMPLOYEE' ? 'POS_ACCESS' : 'SUPERVISOR_ACCESS'}
                        onClick={handleGoodsSubmit}
                    >
                        <button
                            disabled={isSubmitting}
                            className="px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-lg flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30"
                        >
                            {isSubmitting ? '...' : (
                                <>
                                    <CheckCircle2 size={16} strokeWidth={3} />
                                    {consumidorType === 'EMPLOYEE' ? 'Cargar a Cuenta' : 'Confirmar Baja'}
                                </>
                            )}
                        </button>
                    </ActionGuard>
                )}
            </div>
        </div>
    );
}
