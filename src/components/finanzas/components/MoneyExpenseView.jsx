import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, AlertCircle, Banknote, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { useFinance } from '../../../hooks/store/useFinance';
import { useFinanceIntegrator } from '../../../hooks/store/useFinanceIntegrator';
import { useStore } from '../../../context/StoreContext';
import { ActionGuard } from '../../security/ActionGuard';

export default function MoneyExpenseView({ onClose }) {
    const { usuario, configuracion, usuarios } = useStore();
    const { registrarGasto } = useFinance();
    const { registrarAdelantoSueldo } = useFinanceIntegrator();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [moneyData, setMoneyData] = useState({
        monto: '',
        moneda: 'USD',
        medio: 'CASH',
        motivo: '',
        esAdelanto: false
    });
    const [targetEmployeeId, setTargetEmployeeId] = useState('');

    const CHIPS = ['Proveedores', 'Servicios', 'Personal', 'Mantenimiento'];

    const handleMoneySubmit = async () => {
        if (!moneyData.monto || parseFloat(moneyData.monto) <= 0) {
            Swal.fire('Error', 'Debes ingresar un monto válido', 'warning');
            return;
        }

        let result;
        if (moneyData.esAdelanto) {
            if (!targetEmployeeId) {
                Swal.fire('Error', 'Selecciona al empleado', 'warning');
                return;
            }
            if (moneyData.motivo.length < 5) moneyData.motivo = "Adelanto de Nómina";
            setIsSubmitting(true);
            result = await registrarAdelantoSueldo(targetEmployeeId, parseFloat(moneyData.monto), moneyData.motivo, moneyData.moneda);
        } else {
            if (moneyData.motivo.length < 5) {
                Swal.fire('Error', 'El motivo debe ser más detallado', 'warning');
                return;
            }
            setIsSubmitting(true);
            result = await registrarGasto({
                monto: parseFloat(moneyData.monto),
                moneda: moneyData.moneda,
                medio: moneyData.medio,
                motivo: moneyData.motivo,
                usuario
            });
        }

        setIsSubmitting(false);
        if (result.success) {
            Swal.fire({ icon: 'success', title: 'Operación Exitosa', text: result.message || 'Registro completado', timer: 2000, showConfirmButton: false });
            onClose();
        } else {
            console.error("❌ Error en MoneyExpenseView:", result);
            Swal.fire('Error', result.message || "Error desconocido", 'error');
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
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
                            {/* Conversion Feedback */}
                            {moneyData.moneda === 'VES' && moneyData.monto && (
                                <div className="pt-1 animate-in fade-in slide-in-from-left-2">
                                    <span className="text-[10px] font-black text-blue-500 flex items-center gap-1">
                                        <DollarSign size={10} strokeWidth={3} />
                                        Aprox. ${(parseFloat(moneyData.monto) / (configuracion.tasa || 1)).toFixed(2)} USD
                                    </span>
                                </div>
                            )}
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

                    {/* ADELANTO TOGGLE */}
                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-3">
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => setMoneyData({ ...moneyData, esAdelanto: !moneyData.esAdelanto })}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${moneyData.esAdelanto ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white text-slate-300 border border-slate-200'}`}>
                                    <Banknote size={20} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h4 className={`text-sm font-black ${moneyData.esAdelanto ? 'text-indigo-900' : 'text-slate-500'}`}>¿Es Adelanto de Nómina?</h4>
                                    <p className="text-[10px] text-slate-400 font-medium">Se descontará de la caja y sumará a la deuda del empleado</p>
                                </div>
                            </div>
                            <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${moneyData.esAdelanto ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${moneyData.esAdelanto ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                        </div>

                        <AnimatePresence>
                            {moneyData.esAdelanto && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="pt-2">
                                        <select
                                            value={targetEmployeeId}
                                            onChange={e => setTargetEmployeeId(e.target.value)}
                                            className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-sm font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                                        >
                                            <option value="">-- Seleccionar Empleado --</option>
                                            {usuarios
                                                .filter(u => u.activo && u.rol !== 'admin')
                                                .map(u => (
                                                    <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>
                                                ))}
                                        </select>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Motivo del Gasto</label>
                        <div className="flex flex-wrap gap-2 mb-1">
                            {CHIPS.map(chip => (
                                <button
                                    key={chip}
                                    onClick={() => setMoneyData({ ...moneyData, motivo: chip + ': ' })}
                                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-400 transition-all active:scale-95"
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>
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
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 w-full rounded-b-[2rem]">
                <button onClick={onClose} className="px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">Cancelar</button>

                <ActionGuard
                    permission="SUPERVISOR_ACCESS"
                    onClick={handleMoneySubmit}
                >
                    <button
                        disabled={isSubmitting}
                        className="px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-lg flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30"
                    >
                        {isSubmitting ? '...' : (
                            <>
                                <CheckCircle2 size={16} strokeWidth={3} />
                                Confirmar Salida
                            </>
                        )}
                    </button>
                </ActionGuard>
            </div>
        </div>
    );
}
