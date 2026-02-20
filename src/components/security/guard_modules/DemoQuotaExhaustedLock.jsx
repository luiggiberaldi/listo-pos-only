import React, { useState } from 'react';
import { ShieldAlert, Send, Check, Store, ShoppingCart, Building2, Monitor, Package, Receipt, Scale, BookOpen, Tag, BarChart3, Users, Wallet, CalendarClock, LayoutDashboard, Brain, Shield, SlidersHorizontal } from 'lucide-react';
import { dbMaster } from '../../../services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const PLANS = [
    {
        id: 'bodega',
        Icon: Store,
        name: 'Bodega',
        price: 50,
        cajas: '1 Caja',
        features: [
            { icon: Monitor, label: 'Punto de Venta' },
            { icon: Package, label: 'Inventario Completo' },
            { icon: Receipt, label: 'Cierre Z Diario' },
            { icon: Scale, label: 'Pesaje por Kg' },
            { icon: BookOpen, label: 'Fiado y Cuentas' },
            { icon: Tag, label: 'Categorías' },
            { icon: Wallet, label: 'Control de Gastos' },
            { icon: Users, label: 'Directorio de Clientes' },
        ],
        accent: '#f59e0b',
        accentRgb: '245,158,11',
    },
    {
        id: 'abasto',
        Icon: ShoppingCart,
        name: 'Abasto',
        price: 100,
        cajas: '2 Cajas',
        popular: true,
        includes: 'Todo lo de Bodega más:',
        features: [
            { icon: BarChart3, label: 'Kardex de Inventario' },
            { icon: Receipt, label: 'Total Diario Detallado' },
            { icon: Monitor, label: 'Multi-Caja (2 POS)' },
            { icon: CalendarClock, label: 'Control de Vencimientos' },
            { icon: Wallet, label: 'Métodos de Pago Desglosados' },
        ],
        accent: '#06b6d4',
        accentRgb: '6,182,212',
    },
    {
        id: 'minimarket',
        Icon: Building2,
        name: 'Minimarket',
        price: 200,
        cajas: 'Cajas Ilimitadas',
        includes: 'Todo lo de Abasto más:',
        features: [
            { icon: LayoutDashboard, label: 'Dashboard Ejecutivo' },
            { icon: BarChart3, label: 'Reportes Avanzados' },
            { icon: Shield, label: 'Auditoría Completa' },
            { icon: Brain, label: 'Ghost AI Analytics' },
            { icon: Users, label: 'Roles y Permisos' },
            { icon: SlidersHorizontal, label: 'Configuración Avanzada' },
            { icon: Tag, label: 'Etiquetas Personalizadas' },
        ],
        accent: '#8b5cf6',
        accentRgb: '139,92,246',
    }
];

export function DemoQuotaExhaustedLock({ license, machineId }) {
    const [selectedPlan, setSelectedPlan] = useState('bodega');
    const [isSoliciting, setIsSoliciting] = useState(false);
    const [solicitudEnviada, setSolicitudEnviada] = useState(false);
    const [error, setError] = useState(null);

    const handleSolicitarActivacion = async () => {
        if (!machineId || !selectedPlan) return;
        setIsSoliciting(true);
        setError(null);

        try {
            const terminalRef = doc(dbMaster, 'terminales', machineId);
            await updateDoc(terminalRef, {
                _needsActivation: true,
                _activationRequestedAt: serverTimestamp(),
                _lastUsageCount: license.usageCount,
                _requestedPlan: selectedPlan
            });

            setSolicitudEnviada(true);
            setTimeout(() => setSolicitudEnviada(false), 6000);

        } catch (err) {
            console.error("Error al solicitar activación:", err);
            setError("No se pudo enviar la solicitud. Verifica tu conexión a internet.");
        } finally {
            setIsSoliciting(false);
        }
    };

    const activePlan = PLANS.find(p => p.id === selectedPlan);

    return (
        <div className="h-screen w-screen bg-[#111622] flex items-center justify-center p-4 z-[60] fixed inset-0 font-sans overflow-y-auto">
            {/* Subtle glow */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[150px] -mr-96 -mt-96 pointer-events-none"></div>

            <div className="max-w-3xl w-full bg-[#161b28] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 flex flex-col items-center text-center">

                {/* Icon */}
                <div className="w-14 h-14 bg-[#1e2332] rounded-2xl flex items-center justify-center mb-4 border border-slate-800">
                    <ShieldAlert className="w-7 h-7 text-amber-500" strokeWidth={1.5} />
                </div>

                {/* Title */}
                <h2 className="text-2xl font-black text-white mb-1 tracking-tight">
                    ¡Gracias por usar <span className="text-amber-500">LISTO</span>!
                </h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
                    PERIODO DE DEMOSTRACIÓN COMPLETADO
                </p>

                {/* Stats Row */}
                <div className="w-full grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-[#111520] border border-slate-800/60 rounded-xl p-3 text-center">
                        <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Ventas Realizadas</span>
                        <span className="text-2xl font-black text-emerald-400">{license.usageCount || license.quotaLimit}</span>
                    </div>
                    <div className="bg-[#111520] border border-slate-800/60 rounded-xl p-3 text-center flex flex-col justify-center">
                        <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tus Datos</span>
                        <span className="text-sm font-black text-emerald-400 uppercase tracking-wider">Conservados ✓</span>
                    </div>
                </div>

                {/* PLAN SELECTION LABEL */}
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 self-start">
                    Elige tu licencia permanente
                </p>

                {/* PLAN CARDS */}
                <div className="w-full grid grid-cols-3 gap-3 mb-5">
                    {PLANS.map(plan => {
                        const isSelected = selectedPlan === plan.id;
                        const PlanIcon = plan.Icon;
                        return (
                            <button
                                key={plan.id}
                                onClick={() => setSelectedPlan(plan.id)}
                                className="relative rounded-2xl p-4 transition-all duration-200 text-left outline-none cursor-pointer border-2"
                                style={{
                                    background: isSelected ? `rgba(${plan.accentRgb}, 0.08)` : 'rgba(17, 21, 32, 0.8)',
                                    borderColor: isSelected ? plan.accent : 'rgba(51, 65, 85, 0.3)',
                                    boxShadow: isSelected ? `0 0 20px rgba(${plan.accentRgb}, 0.1)` : 'none',
                                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                }}
                            >
                                {/* Popular badge */}
                                {plan.popular && (
                                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-white text-[8px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full"
                                        style={{ background: plan.accent }}>
                                        Popular
                                    </div>
                                )}

                                {/* Selected check */}
                                {isSelected && (
                                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                                        style={{ background: plan.accent }}>
                                        <Check size={12} className="text-white" strokeWidth={3} />
                                    </div>
                                )}

                                {/* Icon + Name */}
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 border"
                                    style={{
                                        background: `rgba(${plan.accentRgb}, 0.1)`,
                                        borderColor: `rgba(${plan.accentRgb}, 0.25)`
                                    }}>
                                    <PlanIcon size={20} style={{ color: plan.accent }} strokeWidth={1.5} />
                                </div>

                                <h3 className="text-sm font-black tracking-tight mb-0.5"
                                    style={{ color: isSelected ? plan.accent : '#e2e8f0' }}>
                                    {plan.name}
                                </h3>
                                <p className="text-[10px] text-slate-500 font-bold mb-3">{plan.cajas}</p>

                                {/* Price */}
                                <div className="mb-3">
                                    <span className="text-2xl font-black" style={{ color: isSelected ? plan.accent : '#f8fafc' }}>
                                        ${plan.price}
                                    </span>
                                    <span className="text-[9px] text-slate-500 font-bold ml-1">PAGO ÚNICO</span>
                                </div>

                                {/* Includes badge */}
                                {plan.includes && (
                                    <p className="text-[9px] font-bold text-slate-400 mb-1.5 italic">{plan.includes}</p>
                                )}

                                {/* Features */}
                                <ul className="space-y-1.5">
                                    {plan.features.map((f, i) => {
                                        const FIcon = f.icon;
                                        return (
                                            <li key={i} className="text-[10px] text-slate-400 flex items-center gap-2">
                                                <FIcon size={11} style={{ color: isSelected ? plan.accent : '#64748b', flexShrink: 0 }} strokeWidth={2} />
                                                <span>{f.label}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </button>
                        );
                    })}
                </div>

                {/* Call to Action */}
                <div className="flex flex-col w-full gap-3">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-2 px-4 rounded-lg">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleSolicitarActivacion}
                        disabled={isSoliciting || solicitudEnviada}
                        className={`w-full font-black py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 uppercase tracking-[0.15em] text-sm ${solicitudEnviada
                            ? 'bg-[#1a202c] border border-emerald-500/30 text-emerald-400 cursor-default'
                            : 'bg-[#10b981] hover:bg-[#059669] text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98]'
                            }`}
                    >
                        {isSoliciting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Procesando...
                            </>
                        ) : solicitudEnviada ? (
                            `✔️ Solicitud Enviada — ${activePlan?.name}`
                        ) : (
                            <>
                                <Send size={18} strokeWidth={2.5} />
                                Solicitar {activePlan?.name} — ${activePlan?.price}
                            </>
                        )}
                    </button>

                    {/* Terminal ID */}
                    <div className="bg-[#111520] border border-slate-800/50 rounded-xl py-2.5 px-5 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Terminal ID</span>
                        <span className="text-xs font-mono text-slate-400 tracking-wider">
                            {machineId ? `${machineId.substring(0, 16)}...` : 'N/A'}
                        </span>
                    </div>
                </div>

                <p className="text-slate-600 text-[9px] mt-5 uppercase tracking-[0.2em] font-bold">
                    Listo POS • Tu negocio, resuelto
                </p>
            </div>
        </div>
    );
}
