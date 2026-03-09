// 🏪 PlanGate — Wrapper que bloquea acceso a features según el plan activo
// Archivo: src/components/security/PlanGate.jsx

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useConfigStore } from '../../stores/useConfigStore';
import { hasFeature, getPlan, getRequiredFeature } from '../../config/planTiers';
import { Lock, ArrowUp } from 'lucide-react';

/**
 * PlanGate — Envuelve una ruta y verifica que el plan activo tenga acceso.
 * Si no tiene acceso, muestra un mensaje de upgrade o redirige.
 *
 * Soporta dos formas de uso:
 *   1. Por feature:    <PlanGate requiredFeature="kardex">
 *   2. Por permiso:    <PlanGate requiredPermission={PERMISOS.CLI_VER}>
 *      (La feature se resuelve automáticamente desde PLAN_REQUIREMENTS via getRequiredFeature)
 *
 * @param {string}           [requiredFeature]    - Feature key de planTiers.js (prioridad)
 * @param {string}           [requiredPermission] - Permiso RBAC cuya feature se resuelve
 * @param {React.ReactNode}  children             - Componente a renderizar si tiene acceso
 * @param {boolean}          [redirect=false]     - Si true, redirige silenciosamente a /vender
 */
export default function PlanGate({ requiredFeature, requiredPermission, children, redirect = false }) {
    const { license } = useConfigStore();
    const currentPlan = license?.plan || 'bodega';

    // [FIX M5] Resolver feature: primero la explícita, luego la derivada del permiso RBAC
    const featureKey = requiredFeature || getRequiredFeature(requiredPermission);

    // Si no hay feature que verificar, permitir paso (no bloquear sin motivo)
    if (!featureKey || hasFeature(currentPlan, featureKey)) {
        return children;
    }

    if (redirect) {
        return <Navigate to="/vender" replace />;
    }

    // Mostrar pantalla de upgrade
    const plan = getPlan(currentPlan);

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
            <div className="relative max-w-lg w-full bg-surface-light rounded-[2rem] p-12 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-border-subtle overflow-hidden text-center group">

                {/* Background Decoration */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100/30 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                <div className="relative z-10 space-y-8">
                    {/* Icon */}
                    <div className="mx-auto w-24 h-24 rounded-3xl bg-amber-50 flex items-center justify-center mb-6 shadow-sm group-hover:scale-105 transition-transform duration-500">
                        <Lock size={40} className="text-amber-500" strokeWidth={1.5} />
                    </div>

                    {/* Content */}
                    <div>
                        <h2 className="text-3xl font-black text-content-main mb-4 tracking-tight">
                            Función Limitada
                        </h2>
                        <p className="text-base text-content-secondary leading-relaxed max-w-xs mx-auto">
                            Tu plan actual <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-surface-light ${plan.color} shadow-sm`}>
                                {plan.icon} {plan.label}
                            </span> no tiene acceso a este módulo avanzado.
                        </p>
                    </div>

                    {/* CTA Box */}
                    <div className="bg-app-light rounded-2xl p-6 border border-border-subtle">
                        <p className="text-[10px] text-content-secondary uppercase font-black tracking-[0.3em] mb-3">
                            RECOMENDACIÓN
                        </p>
                        <p className="text-sm text-content-main font-medium mb-4">
                            Actualiza a <span className="text-primary font-bold">Minimarket</span> o <span className="text-primary font-bold">Abasto</span> para desbloquear.
                        </p>

                        <div className="flex items-center justify-center gap-4">
                            <button
                                onClick={() => window.history.back()}
                                className="px-6 py-2.5 rounded-xl text-xs font-bold text-content-secondary hover:bg-app-light transition-all flex items-center gap-2"
                            >
                                <ArrowUp size={14} className="rotate-[-90deg]" /> CANCELAR
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
