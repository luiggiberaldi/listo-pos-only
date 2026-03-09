import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, AlertCircle, Banknote, User, Clock, FileText, Trash2, Wallet, Smartphone, CreditCard, Sparkles, TrendingDown, Wrench, SprayCan, Users, ShoppingBag, MoreHorizontal } from 'lucide-react';
import Swal from 'sweetalert2';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { useFinance } from '../../../hooks/store/useFinance';
import { useFinanceIntegrator } from '../../../hooks/store/useFinanceIntegrator';
import { useEmployeeFinance } from '../../../hooks/store/useEmployeeFinance';
import { useRBAC } from '../../../hooks/store/useRBAC';
import { PERMISSIONS } from '../../../config/permissions';
import { useStore } from '../../../context/StoreContext';
import { useConfigStore } from '../../../stores/useConfigStore';
import { hasFeature, FEATURES, getPlan } from '../../../config/planTiers';
import FinancialLayout from '../design/FinancialLayout';
import BigCurrencyInput from '../design/BigCurrencyInput';
import HoldToConfirmButton from '../design/HoldToConfirmButton';

// [FIX BUG-5] Helper: Get local day boundaries as ISO strings
const getLocalDayBounds = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { inicio: start.toISOString(), fin: end.toISOString() };
};

// [V3] Category icons for visual distinction
const CATEGORY_CONFIG = {
    'PROVEEDORES': { icon: ShoppingBag, color: 'text-status-warning', bg: 'bg-status-warningBg' },
    'SERVICIOS': { icon: CreditCard, color: 'text-primary', bg: 'bg-primary-light' },
    'PERSONAL': { icon: Users, color: 'text-violet-500', bg: 'bg-violet-50' },
    'MANTENIMIENTO': { icon: Wrench, color: 'text-status-warning', bg: 'bg-status-warningBg' },
    'LIMPIEZA': { icon: SprayCan, color: 'text-teal-500', bg: 'bg-teal-50' },
    'VARIOS': { icon: MoreHorizontal, color: 'text-content-secondary', bg: 'bg-app-light' },
    'GENERAL': { icon: DollarSign, color: 'text-status-danger', bg: 'bg-status-dangerBg' },
};

// [V3] Color-code amounts by magnitude
const getAmountColor = (amount) => {
    if (amount <= 5) return 'text-status-success';
    if (amount <= 20) return 'text-status-warning';
    return 'text-status-danger';
};

export default function MoneyExpenseView({ onClose }) {
    const { usuario, configuracion, usuarios } = useStore();
    const { registrarGasto, revertirGasto } = useFinance();
    const { registrarAdelantoSueldo } = useFinanceIntegrator();
    const { validarCapacidadEndeudamiento } = useEmployeeFinance();

    const { hasPermission } = useRBAC(usuario);
    const canDoAdelantos = hasPermission(PERMISSIONS.NOMINA_AJUSTES);
    const canRevertGastos = hasPermission(PERMISSIONS.NOMINA_AJUSTES);

    const { license } = useConfigStore();
    const planId = license?.plan || 'bodega';
    const hasEmployeeFeatures = hasFeature(planId, FEATURES.EMPLEADOS_BASICO) || hasFeature(planId, FEATURES.ROLES);
    const planConfig = getPlan(planId);
    const maxEmpleados = planConfig.maxEmpleados ?? 0;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [moneyData, setMoneyData] = useState({
        monto: '',
        moneda: 'USD',
        medio: 'CASH',
        motivo: '',
        categoria: '',
        esAdelanto: false
    });
    const [targetEmployeeId, setTargetEmployeeId] = useState('');

    // Live query: últimos gastos de hoy
    const gastosRecientes = useLiveQuery(async () => {
        const { inicio, fin } = getLocalDayBounds();
        const logs = await db.logs
            .where('fecha')
            .between(inicio, fin)
            .and(l => l.tipo === 'GASTO_CAJA')
            .reverse()
            .toArray();
        return logs.slice(0, 5);
    }, []) || [];

    // Handle Revert
    const handleDeleteGasto = async (gasto) => {
        if (!canRevertGastos) {
            Swal.fire('Acceso Denegado', 'No tienes permiso para revertir gastos.', 'error');
            return;
        }

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
                const res = await revertirGasto(gasto.id, `Eliminado por usuario: ${usuario?.nombre}`);
                if (res.success) {
                    Swal.fire({ icon: 'success', title: 'Eliminado', text: 'El dinero ha regresado a la gaveta.', timer: 1500, showConfirmButton: false });
                } else throw new Error(res.message);
            } catch (error) {
                Swal.fire('Error', error.message || 'No se pudo eliminar', 'error');
            }
        }
    };

    // Chips (filter by plan)
    const ALL_CHIPS = [
        { id: 'PROVEEDORES', label: 'Proveedores', icon: ShoppingBag },
        { id: 'SERVICIOS', label: 'Servicios', icon: CreditCard },
        { id: 'PERSONAL', label: 'Personal', icon: Users },
        { id: 'MANTENIMIENTO', label: 'Mantenim.', icon: Wrench },
        { id: 'LIMPIEZA', label: 'Limpieza', icon: SprayCan },
        { id: 'VARIOS', label: 'Varios', icon: MoreHorizontal }
    ];
    const CHIPS = hasEmployeeFeatures ? ALL_CHIPS : ALL_CHIPS.filter(c => c.id !== 'PERSONAL');

    // [V4] Medios de pago — Efectivo, Transferencia, Pago Móvil
    const MEDIOS = [
        { id: 'CASH', label: 'Efectivo', icon: Wallet },
        { id: 'TRANSFER', label: 'Transferencia', icon: CreditCard },
        { id: 'PAGO_MOVIL', label: 'Pago Móvil', icon: Smartphone }
    ];

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

            let montoAdv = parseFloat(moneyData.monto);
            if (moneyData.moneda === 'VES' || moneyData.moneda === 'BS') {
                const tasa = parseFloat(configuracion?.tasa) || 1;
                montoAdv = tasa > 0 ? montoAdv / tasa : montoAdv;
            }
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

            let motivoFinal = moneyData.motivo;
            if (motivoFinal.length < 3) motivoFinal = "Adelanto de Nómina";
            setIsSubmitting(true);
            result = await registrarAdelantoSueldo(targetEmployeeId, parseFloat(moneyData.monto), motivoFinal, moneyData.moneda);
        } else {
            if (moneyData.motivo.length < 3) {
                Swal.fire('Error', 'El motivo debe ser más detallado', 'warning');
                return;
            }
            setIsSubmitting(true);
            result = await registrarGasto({
                monto: parseFloat(moneyData.monto),
                moneda: moneyData.moneda,
                medio: moneyData.medio,
                motivo: moneyData.motivo,
                categoria: moneyData.categoria || 'GENERAL',
                usuario
            });
        }

        setIsSubmitting(false);
        if (result.success) {
            try {
                const audio = new Audio('/sounds/cash_register.mp3');
                audio.volume = 0.5;
                audio.play().catch(() => { });
            } catch (e) { }

            Swal.fire({ icon: 'success', title: 'Operación Exitosa', text: result.message || 'Registro completado', timer: 1500, showConfirmButton: false });
            onClose();
        } else {
            Swal.fire('Error', result.message || "Error desconocido", 'error');
        }
    };

    // Side Panel
    const sidePanel = (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Employee Selector or Recent Activity */}
            {moneyData.esAdelanto ? (
                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-border-subtle dark:border-slate-700">
                    <h3 className="text-xs font-bold text-content-secondary uppercase tracking-widest mb-3">Empleado Solicitante</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {usuarios
                            .filter(u => u.activo && u.rol !== 'admin')
                            .map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => setTargetEmployeeId(u.id)}
                                    className={`p-3 rounded-xl flex items-center gap-3 transition-all text-left ${targetEmployeeId == u.id ? 'bg-primary-light border border-primary/30 shadow-sm' : 'hover:bg-app-light border border-transparent'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${targetEmployeeId == u.id ? 'bg-primary text-content-inverse' : 'bg-slate-200 text-content-secondary'}`}>
                                        {u.nombre.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-xs font-bold truncate ${targetEmployeeId == u.id ? 'text-primary' : 'text-content-main dark:text-content-inverse'}`}>{u.nombre}</p>
                                        <p className="text-[10px] text-content-secondary">{u.rol}</p>
                                    </div>
                                </button>
                            ))}
                    </div>
                </div>
            ) : (
                <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-border-subtle dark:border-slate-700 max-h-52 overflow-y-auto">
                    <h3 className="text-xs font-bold text-content-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Clock size={12} /> Historial de Hoy
                    </h3>
                    {gastosRecientes.length === 0 ? (
                        /* [V8] Better empty state */
                        <div className="flex flex-col items-center justify-center text-center py-8">
                            <div className="w-14 h-14 bg-status-successBg rounded-2xl flex items-center justify-center mb-3">
                                <Sparkles size={24} className="text-status-success" />
                            </div>
                            <p className="text-xs font-bold text-content-secondary">¡Día limpio!</p>
                            <p className="text-[10px] text-content-secondary mt-1">Sin gastos registrados hoy</p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {gastosRecientes.map((g, i) => {
                                const moneda = g.meta?.moneda || g.referencia || 'USD';
                                const simbolo = moneda === 'VES' || moneda === 'BS' ? 'Bs' : '$';
                                const monto = parseFloat(g.cantidad) || 0;
                                const mins = Math.round((Date.now() - new Date(g.fecha).getTime()) / 60000);
                                const tiempoLabel = mins < 1 ? 'ahora' : mins < 60 ? `hace ${mins}m` : `hace ${Math.floor(mins / 60)}h`;

                                // [V3] Category-based icon
                                const categoria = g.meta?.categoria || 'GENERAL';
                                const catConfig = CATEGORY_CONFIG[categoria] || CATEGORY_CONFIG.GENERAL;
                                const CatIcon = catConfig.icon;

                                return (
                                    <motion.div
                                        key={g.id || i}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-app-light dark:hover:bg-app-dark transition-colors group"
                                    >
                                        {/* [V3] Category icon */}
                                        <div className={`w-8 h-8 rounded-lg ${catConfig.bg} ${catConfig.color} flex items-center justify-center flex-shrink-0`}>
                                            <CatIcon size={14} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-content-main dark:text-content-inverse truncate">{g.detalle || 'Gasto'}</p>
                                            <p className="text-[10px] text-content-secondary">
                                                {tiempoLabel} • <span className="text-content-secondary/50">{moneda}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* [V3] Color-coded amount */}
                                            <span className={`text-xs font-black flex-shrink-0 ${getAmountColor(monto)}`}>
                                                -{simbolo}{monto.toFixed(2)}
                                            </span>
                                            {canRevertGastos && (
                                                <button
                                                    onClick={() => handleDeleteGasto(g)}
                                                    className="p-1.5 rounded-lg text-content-secondary/50 hover:text-status-danger hover:bg-status-dangerBg opacity-0 group-hover:opacity-100 transition-all"
                                                    title="Revertir este gasto"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Category Chips */}
            <div>
                <h3 className="text-xs font-bold text-content-secondary uppercase tracking-widest mb-3">Categoría de Gasto</h3>
                <div className="grid grid-cols-3 gap-2">
                    {CHIPS.map(chip => {
                        const isActive = moneyData.categoria === chip.id;
                        const ChipIcon = chip.icon;
                        return (
                            <button
                                key={chip.id}
                                onClick={() => {
                                    const currentMotivo = moneyData.motivo.trim();
                                    // Smart append — if user typed custom text, prepend category
                                    const chipLabels = CHIPS.map(c => c.label);
                                    const hasChipPrefix = chipLabels.some(l => currentMotivo.startsWith(l + ':'));
                                    const newMotivo = !currentMotivo || hasChipPrefix
                                        ? `${chip.label}: `
                                        : `${chip.label}: ${currentMotivo}`;
                                    setMoneyData({ ...moneyData, motivo: newMotivo, categoria: chip.id });
                                }}
                                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all duration-200 ${isActive
                                    ? 'bg-primary-light border-primary/30 text-primary ring-2 ring-primary/20 scale-105'
                                    : 'bg-surface-light dark:bg-surface-dark border-border-subtle text-content-secondary hover:border-primary/20 hover:text-content-main'
                                    }`}
                            >
                                <ChipIcon size={16} strokeWidth={2} />
                                <span className="text-[9px] font-bold uppercase tracking-wider">{chip.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Confirm Button */}
            <div className="mt-auto pt-4">
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
                <p className="text-center text-[10px] text-content-secondary mt-3 font-medium">Esta acción afectará la caja inmediatamente</p>
            </div>
        </div>
    );

    return (
        <FinancialLayout
            icon={moneyData.esAdelanto ? User : DollarSign}
            title={moneyData.esAdelanto ? "Adelanto de Nómina" : "Salida de Efectivo"}
            subtitle={moneyData.esAdelanto ? "Préstamo personal descontable" : "Pagos a proveedores o servicios"}
            color="indigo"
            sidePanel={sidePanel}
        >
            <div className="space-y-6 md:space-y-8 max-w-xl mx-auto">
                {/* 1. BIG INPUT */}
                <BigCurrencyInput
                    value={moneyData.monto}
                    onChange={v => setMoneyData({ ...moneyData, monto: v })}
                    currency={moneyData.moneda}
                    onCurrencyChange={c => setMoneyData({ ...moneyData, moneda: c })}
                    conversionRate={configuracion.tasa}
                />



                {/* TOGGLE ADELANTO */}
                {hasEmployeeFeatures && canDoAdelantos && (
                    <div
                        onClick={() => setMoneyData({ ...moneyData, esAdelanto: !moneyData.esAdelanto })}
                        className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-center gap-4 group ${moneyData.esAdelanto ? 'bg-primary-light border-primary/30 ring-2 ring-primary/20' : 'bg-surface-light dark:bg-surface-dark border-border-subtle hover:border-primary/20'}`}
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${moneyData.esAdelanto ? 'bg-primary text-content-inverse' : 'bg-app-light text-content-secondary'}`}>
                            <Banknote size={24} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                            <h4 className={`text-sm font-black ${moneyData.esAdelanto ? 'text-primary' : 'text-content-main dark:text-content-inverse'}`}>¿Es Adelanto de Nómina?</h4>
                            <p className="text-xs text-content-secondary">Se descontará del pago del empleado.</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${moneyData.esAdelanto ? 'border-primary bg-primary' : 'border-slate-300'}`}>
                            {moneyData.esAdelanto && <motion.div layoutId="check" className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                    </div>
                )}

                {/* MOTIVO INPUT */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-content-secondary uppercase tracking-widest pl-1">Concepto / Detalle</label>
                    <textarea
                        value={moneyData.motivo}
                        onChange={e => setMoneyData({ ...moneyData, motivo: e.target.value })}
                        className="w-full bg-app-light dark:bg-app-dark border-none rounded-2xl p-4 text-content-main dark:text-content-inverse font-medium focus:bg-surface-light focus:ring-2 focus:ring-primary/10 transition-all resize-none h-28 md:h-32 text-base md:text-lg placeholder:text-content-secondary/40"
                        placeholder="Ej: Pago de agua potable..."
                    />
                </div>
            </div>
        </FinancialLayout>
    );
}
