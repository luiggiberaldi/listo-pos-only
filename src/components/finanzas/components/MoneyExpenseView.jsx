import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, AlertCircle, Banknote, User, Clock, FileText, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { useFinance } from '../../../hooks/store/useFinance';
import { useFinanceIntegrator } from '../../../hooks/store/useFinanceIntegrator';
import { useEmployeeFinance } from '../../../hooks/store/useEmployeeFinance'; // ✅ Import
import { useStore } from '../../../context/StoreContext';
import FinancialLayout from '../design/FinancialLayout';
import BigCurrencyInput from '../design/BigCurrencyInput';
import HoldToConfirmButton from '../design/HoldToConfirmButton';

export default function MoneyExpenseView({ onClose }) {
    const { usuario, configuracion, usuarios } = useStore();
    const { registrarGasto, revertirGasto } = useFinance();
    const { registrarAdelantoSueldo } = useFinanceIntegrator();
    const { validarCapacidadEndeudamiento } = useEmployeeFinance(); // ✅ Destructure

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [moneyData, setMoneyData] = useState({
        monto: '',
        moneda: 'USD',
        medio: 'CASH',
        motivo: '',
        esAdelanto: false
    });
    const [targetEmployeeId, setTargetEmployeeId] = useState('');

    // 📊 Live query: últimos gastos de hoy
    const gastosRecientes = useLiveQuery(async () => {
        const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
        const fin = new Date(); fin.setHours(23, 59, 59, 999);
        const logs = await db.logs
            .where('fecha')
            .between(inicio.toISOString(), fin.toISOString())
            .and(l => l.tipo === 'GASTO_CAJA')
            .reverse()
            .toArray();
        return logs.slice(0, 5); // últimos 5
    }, []) || [];

    // 🗑️ Handle Revert
    const handleDeleteGasto = async (gasto) => {
        const result = await Swal.fire({
            title: '¿Eliminar Gasto?',
            text: `Se devolverá el dinero a la caja (${gasto.referencia} ${parseFloat(gasto.cantidad).toFixed(2)}). Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                // Pedir motivo opcional? Por rapidez usamos "Corrección de Usuario"
                const res = await revertirGasto(gasto.id, `Eliminado por usuario: ${usuario?.nombre}`);
                if (res.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Eliminado',
                        text: 'El dinero ha regresado a la gaveta.',
                        timer: 1500,
                        showConfirmButton: false
                    });
                } else {
                    throw new Error(res.message);
                }
            } catch (error) {
                Swal.fire('Error', error.message || 'No se pudo eliminar', 'error');
            }
        }
    };

    const CHIPS = ['Proveedores', 'Servicios', 'Personal', 'Mantenimiento', 'Limpieza', 'Varios'];

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

            // 🛡️ VERIFICAR LIMITE DE SUELDO
            const montoAdv = parseFloat(moneyData.monto);
            const validacion = await validarCapacidadEndeudamiento(targetEmployeeId, montoAdv);

            if (!validacion.puede) {
                const { sueldo, deudaActual, disponible } = validacion.detalles || {};

                await Swal.fire({
                    title: 'Límite Excedido',
                    html: `
                        <div class="text-left text-sm space-y-2">
                            <p>${validacion.mensaje}</p>
                            <hr />
                            <p><strong>Sueldo Base:</strong> $${sueldo?.toFixed(2)}</p>
                            <p><strong>Deuda Actual:</strong> $${deudaActual?.toFixed(2)}</p>
                            <p class="text-emerald-600"><strong>Disponible:</strong> $${disponible?.toFixed(2)}</p>
                            <p class="text-rose-600 font-bold mt-2">Monto Solicitado: $${montoAdv.toFixed(2)}</p>
                        </div>
                    `,
                    icon: 'error',
                    confirmButtonText: 'Entendido'
                });
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
            const audio = new Audio('/sounds/cash_register.mp3'); // Optional FX
            audio.volume = 0.5;
            audio.play().catch(e => { });

            Swal.fire({ icon: 'success', title: 'Operación Exitosa', text: result.message || 'Registro completado', timer: 1500, showConfirmButton: false });
            onClose();
        } else {
            console.error("❌ Error en MoneyExpenseView:", result);
            Swal.fire('Error', result.message || "Error desconocido", 'error');
        }
    };

    // --- SIDE PANEL CONTENT ---
    const SidePanel = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* 1. EMPLOYEE SELECTOR (If Adelanto) OR RECENT ACTIVITY */}
            {moneyData.esAdelanto ? (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Empleado Solicitante</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {usuarios
                            .filter(u => u.activo && u.rol !== 'admin')
                            .map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => setTargetEmployeeId(u.id)}
                                    className={`p-3 rounded-xl flex items-center gap-3 transition-all text-left ${targetEmployeeId == u.id ? 'bg-indigo-50 border border-indigo-200 shadow-sm' : 'hover:bg-slate-50 border border-transparent'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${targetEmployeeId == u.id ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                        {u.nombre.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-xs font-bold truncate ${targetEmployeeId == u.id ? 'text-indigo-900' : 'text-slate-700'}`}>{u.nombre}</p>
                                        <p className="text-[10px] text-slate-400">{u.rol}</p>
                                    </div>
                                </button>
                            ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 max-h-52 overflow-y-auto">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Clock size={12} /> Historial de Hoy
                    </h3>
                    {gastosRecientes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-6 opacity-60">
                            <Clock size={28} className="text-slate-300 mb-2" />
                            <p className="text-xs font-medium text-slate-400">Sin gastos registrados hoy</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {gastosRecientes.map((g, i) => {
                                const moneda = g.meta?.moneda || g.referencia || 'USD';
                                const simbolo = moneda === 'VES' || moneda === 'BS' ? 'Bs' : '$';
                                const monto = parseFloat(g.cantidad) || 0;
                                // Tiempo relativo
                                const mins = Math.round((Date.now() - new Date(g.fecha).getTime()) / 60000);
                                const tiempoLabel = mins < 1 ? 'ahora' : mins < 60 ? `hace ${mins}m` : `hace ${Math.floor(mins / 60)}h`;
                                return (
                                    <div key={g.id || i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group">
                                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center flex-shrink-0">
                                            <DollarSign size={14} strokeWidth={3} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-700 truncate">{g.detalle || 'Gasto'}</p>
                                            <p className="text-[10px] text-slate-400">
                                                {tiempoLabel} • <span className="text-slate-300">{moneda}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-rose-600 flex-shrink-0">
                                                -{simbolo}{monto.toFixed(2)}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteGasto(g)}
                                                className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                                                title="Revertir este gasto"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* 2. QUICK MOTIVES */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Motivos Frecuentes</h3>
                <div className="flex flex-wrap gap-2">
                    {CHIPS.map(chip => (
                        <button
                            key={chip}
                            onClick={() => setMoneyData({ ...moneyData, motivo: chip + ': ' })}
                            className="px-3 py-2 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-400 transition-all active:scale-95 shadow-sm"
                        >
                            {chip}
                        </button>
                    ))}
                </div>
            </div>

            {/* 3. CONFIRMATION FOOTER */}
            <div className="mt-auto pt-6">
                <HoldToConfirmButton
                    onConfirm={handleMoneySubmit}
                    label="MANTENER PARA RETIRAR"
                    color="indigo"
                    disabled={
                        !moneyData.monto ||
                        parseFloat(moneyData.monto) <= 0 ||
                        moneyData.motivo.length < 3 ||
                        (moneyData.esAdelanto && !targetEmployeeId)
                    }
                />
                <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">Esta acción afectará la caja inmediatamente</p>
            </div>
        </div>
    );

    return (
        <FinancialLayout
            icon={moneyData.esAdelanto ? User : DollarSign}
            title={moneyData.esAdelanto ? "Adelanto de Nómina" : "Salida de Efectivo"}
            subtitle={moneyData.esAdelanto ? "Préstamo personal descontable" : "Pagos a proveedores o servicios"}
            color="indigo"
            sidePanel={<SidePanel />}
        >
            <div className="space-y-8 max-w-xl mx-auto">
                {/* 1. INPUT GIGANTE */}
                <BigCurrencyInput
                    value={moneyData.monto}
                    onChange={v => setMoneyData({ ...moneyData, monto: v })}
                    currency={moneyData.moneda}
                    onCurrencyChange={c => setMoneyData({ ...moneyData, moneda: c })}
                    conversionRate={configuracion.tasa}
                />

                {/* 2. TOGGLE ADELANTO */}
                <div
                    onClick={() => setMoneyData({ ...moneyData, esAdelanto: !moneyData.esAdelanto })}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-center gap-4 group ${moneyData.esAdelanto ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${moneyData.esAdelanto ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <Banknote size={24} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                        <h4 className={`text-sm font-black ${moneyData.esAdelanto ? 'text-indigo-900' : 'text-slate-600'}`}>¿Es Adelanto de Nómina?</h4>
                        <p className="text-xs text-slate-400">Se descontará del pago del empleado.</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${moneyData.esAdelanto ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
                        {moneyData.esAdelanto && <motion.div layoutId="check" className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                </div>

                {/* 3. INPUT MOTIVO */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Concepto / Detalle</label>
                    <textarea
                        value={moneyData.motivo}
                        onChange={e => setMoneyData({ ...moneyData, motivo: e.target.value })}
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-slate-700 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none h-32 text-lg placeholder:text-slate-300"
                        placeholder="Ej: Pago de agua potable..."
                    />
                </div>
            </div>
        </FinancialLayout>
    );
}
