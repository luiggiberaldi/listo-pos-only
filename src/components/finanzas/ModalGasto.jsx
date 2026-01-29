import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Package, DollarSign, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { useFinance } from '../../hooks/store/useFinance';
import { useInventory } from '../../hooks/store/useInventory';
import { useStore } from '../../context/StoreContext';
import { ActionGuard } from '../security/ActionGuard';
import ProductGrid from '../pos/ProductGrid';
import Swal from 'sweetalert2';

export default function ModalGasto({ isOpen, onClose }) {
    const { usuario, productos, configuracion } = useStore();
    const { registrarGasto } = useFinance();
    const { registrarConsumoInterno } = useInventory(usuario);

    const [mode, setMode] = useState('MONEY'); // 'MONEY' | 'GOODS'
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Estado Dinero
    const [moneyData, setMoneyData] = useState({
        monto: '',
        moneda: 'USD',
        medio: 'CASH',
        motivo: ''
    });

    // Estado Mercancía
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [goodsData, setGoodsData] = useState({
        cantidad: 1,
        motivo: ''
    });

    const activeColor = mode === 'MONEY' ? 'indigo' : 'emerald';
    const activeColorHex = mode === 'MONEY' ? '#4F46E5' : '#10B981';

    useEffect(() => {
        if (!isOpen) {
            setMoneyData({ monto: '', moneda: 'USD', medio: 'CASH', motivo: '' });
            setGoodsData({ cantidad: 1, motivo: '' });
            setSelectedProduct(null);
            setSearchTerm('');
            setMode('MONEY');
        }
    }, [isOpen]);

    // Filtrado de productos para el grid
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

    const handleMoneySubmit = async () => {
        if (!moneyData.monto || parseFloat(moneyData.monto) <= 0) {
            Swal.fire('Error', 'Debes ingresar un monto válido', 'warning');
            return;
        }
        if (moneyData.motivo.length < 5) {
            Swal.fire('Error', 'El motivo debe ser más detallado (mín. 5 letras)', 'warning');
            return;
        }

        setIsSubmitting(true);
        const result = await registrarGasto({
            monto: parseFloat(moneyData.monto),
            moneda: moneyData.moneda,
            medio: moneyData.medio,
            motivo: moneyData.motivo,
            usuario
        });
        setIsSubmitting(false);

        if (result.success) {
            Swal.fire({ icon: 'success', title: 'Gasto Registrado', text: 'Se ha descontado de la caja correctamente.', timer: 2000, showConfirmButton: false });
            onClose();
        } else {
            Swal.fire('Error', result.message, 'error');
        }
    };

    const handleGoodsSubmit = async () => {
        if (!selectedProduct) {
            Swal.fire('Error', 'Selecciona un producto', 'warning');
            return;
        }
        if (goodsData.motivo.length < 5) {
            Swal.fire('Error', 'El motivo del consumo es obligatorio', 'warning');
            return;
        }

        setIsSubmitting(true);
        const result = await registrarConsumoInterno({
            id: selectedProduct.id,
            unidadVenta: 'unidad',
            cantidad: parseFloat(goodsData.cantidad)
        }, goodsData.motivo, usuario);
        setIsSubmitting(false);

        if (result.success) {
            Swal.fire({ icon: 'success', title: 'Consumo Registrado', text: 'El inventario ha sido ajustado.', timer: 2000, showConfirmButton: false });
            onClose();
        } else {
            Swal.fire('Error', 'Hubo un problema registrando el consumo', 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-all">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: "spring", duration: 0.4 }}
                    className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-white/50 ring-1 ring-slate-900/5"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                                <div className={`p-2.5 rounded-2xl text-white shadow-lg shadow-${activeColor}-500/30 transition-colors duration-300 bg-${activeColor}-600`}>
                                    <FileText size={24} strokeWidth={2.5} />
                                </div>
                                <span>Registro de Salidas</span>
                            </h2>
                            <p className="text-slate-500 text-sm font-medium mt-1 ml-1 opacity-80">Gestión contable de egresos</p>
                        </div>
                        <button onClick={onClose} className="p-2.5 hover:bg-slate-50 rounded-full text-slate-400 hover:text-rose-500 transition-all active:scale-95">
                            <X size={24} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-100 bg-slate-50/50 p-1.5 gap-2">
                        {[
                            { id: 'MONEY', label: 'Salida de Dinero', icon: DollarSign, color: 'indigo' },
                            { id: 'GOODS', label: 'Consumo de Mercancía', icon: Package, color: 'emerald' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setMode(tab.id)}
                                className={`flex-1 p-3.5 text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all rounded-xl relative overflow-hidden group ${mode === tab.id
                                    ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                                    : 'text-slate-400 hover:bg-white/60 hover:text-slate-600'
                                    }`}
                            >
                                <tab.icon
                                    size={18}
                                    className={`transition-colors duration-300 ${mode === tab.id ? `text-${tab.color}-600` : 'group-hover:text-slate-500'}`}
                                    strokeWidth={2.5}
                                />
                                {tab.label}
                                {mode === tab.id && (
                                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-${tab.color}-500 rounded-b-xl`} />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-8 overflow-y-auto flex-1 custom-scrollbar bg-slate-50/30">
                        {mode === 'MONEY' ? (
                            <div className="max-w-lg mx-auto space-y-8 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Monto a Retirar</label>
                                        <div className="relative group">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold group-focus-within:text-indigo-500 transition-colors">
                                                {moneyData.moneda === 'USD' ? '$' : 'Bs'}
                                            </span>
                                            <input
                                                type="number"
                                                value={moneyData.monto}
                                                onChange={e => setMoneyData({ ...moneyData, monto: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-5 py-4 text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-2xl font-black transition-all shadow-sm placeholder:text-slate-200"
                                                placeholder="0.00"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Moneda</label>
                                        <div className="flex bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm h-[66px]">
                                            {['USD', 'VES'].map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => setMoneyData({ ...moneyData, moneda: m })}
                                                    className={`flex-1 rounded-xl text-xs font-black transition-all duration-300 ${moneyData.moneda === m
                                                        ? (m === 'USD' ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-blue-600 text-white shadow-blue-200') + ' shadow-md transform scale-100'
                                                        : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    {m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Motivo del Gasto</label>
                                    <textarea
                                        value={moneyData.motivo}
                                        onChange={e => setMoneyData({ ...moneyData, motivo: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none h-32 text-sm font-medium transition-all shadow-sm placeholder:text-slate-300"
                                        placeholder="Describe detalladamente el motivo..."
                                        maxLength={200}
                                    />
                                    <div className="flex justify-end">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${moneyData.motivo.length > 180 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                                            {moneyData.motivo.length}/200
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 text-amber-700 text-xs shadow-sm items-center">
                                    <div className="p-2 bg-white rounded-full shrink-0 shadow-sm text-amber-500">
                                        <AlertCircle size={18} />
                                    </div>
                                    <p className="font-medium leading-relaxed opacity-90">Esta acción descuenta saldo real. <strong>Conserva el comprobante</strong>.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col">
                                {!selectedProduct ? (
                                    <div className="flex-1 flex flex-col min-h-[400px]">
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
                                                <SearchIcon />
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
                                    <div className="max-w-md mx-auto space-y-8 py-4 animate-in fade-in slide-in-from-right-8 duration-300">
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

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Motivo del Consumo</label>
                                            <textarea
                                                value={goodsData.motivo}
                                                onChange={e => setGoodsData({ ...goodsData, motivo: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none resize-none h-28 text-sm font-medium transition-all shadow-sm placeholder:text-slate-300"
                                                placeholder="Ej: Merma, uso interno, caducidad..."
                                                maxLength={200}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer Clean */}
                    <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 w-full rounded-b-[2rem]">
                        <button onClick={onClose} className="px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">Cancelar</button>

                        {(mode === 'MONEY' || (mode === 'GOODS' && selectedProduct)) && (
                            <ActionGuard
                                permission="SUPERVISOR_ACCESS"
                                onClick={mode === 'MONEY' ? handleMoneySubmit : handleGoodsSubmit}
                            >
                                <button
                                    disabled={isSubmitting}
                                    className={`px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-lg flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${mode === 'MONEY'
                                        ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'
                                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30'
                                        }`}
                                >
                                    {isSubmitting ? '...' : (
                                        <>
                                            <CheckCircle2 size={16} strokeWidth={3} />
                                            {mode === 'MONEY' ? 'Confirmar Salida' : 'Confirmar Baja'}
                                        </>
                                    )}
                                </button>
                            </ActionGuard>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

// Icono auxiliar
const SearchIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
);
