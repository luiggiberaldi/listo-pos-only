import React, { useState, useMemo } from 'react';
import { Package } from 'lucide-react';
import Swal from 'sweetalert2';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { useInventory } from '../../../hooks/store/useInventory';
import { useFinanceIntegrator } from '../../../hooks/store/useFinanceIntegrator';
import { useEmployeeFinance } from '../../../hooks/store/useEmployeeFinance';
import { useRBAC } from '../../../hooks/store/useRBAC';
import { PERMISSIONS } from '../../../config/permissions';
import { useStore } from '../../../context/StoreContext';
import { useConfigStore } from '../../../stores/useConfigStore';
import { hasFeature, FEATURES, getPlan } from '../../../config/planTiers';
import FinancialLayout from '../design/FinancialLayout';
import HoldToConfirmButton from '../design/HoldToConfirmButton';

// Sub-components
import ConsumerToggle from './consumption/ConsumerToggle';
import ConsumptionHistory from './consumption/ConsumptionHistory';
import ConsumptionCart from './consumption/ConsumptionCart';
import ProductGrid from './consumption/ProductGrid';

export default function GoodsConsumptionView({ onClose }) {
    const { usuario, productos, usuarios } = useStore();
    const { registrarConsumoInterno, revertirConsumoInterno } = useInventory(usuario);
    const { registrarConsumoEmpleado } = useFinanceIntegrator();
    const { validarCapacidadEndeudamiento } = useEmployeeFinance();

    // 🔒 RBAC
    const { hasPermission } = useRBAC(usuario);
    const canDoEmpleadoConsumo = hasPermission(PERMISSIONS.NOMINA_CONSUMO_EMPLEADO);

    // 🏪 PLAN GATING
    const { license } = useConfigStore();
    const planId = license?.plan || 'bodega';
    const hasEmployeeFeatures = hasFeature(planId, FEATURES.EMPLEADOS_BASICO) || hasFeature(planId, FEATURES.ROLES);
    const planConfig = getPlan(planId);
    const maxEmpleados = planConfig.maxEmpleados ?? 0;

    // State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [consumidorType, setConsumidorType] = useState('SYSTEM'); // 'SYSTEM' | 'EMPLOYEE' | 'VACA'
    const [targetEmployeeId, setTargetEmployeeId] = useState('');
    const [vacaSelectedIds, setVacaSelectedIds] = useState([]);
    const [cart, setCart] = useState([]);
    const [globalMotivo, setGlobalMotivo] = useState('');

    const CHIPS = ['Caducidad', 'Merma', 'Degustación', 'Consumo Propio', 'Error de Inventario'];

    // Employee financial data (credit badges)
    const employeeFinanzas = useLiveQuery(async () => {
        try {
            const all = await db.empleados_finanzas?.toArray();
            if (!all) return {};
            const map = {};
            all.forEach(f => { map[f.userId] = f; });
            return map;
        } catch { return {}; }
    }, []) || {};

    // Defensive maxEmpleados guard
    const safeMaxEmpleados = (typeof maxEmpleados === 'number' && maxEmpleados > 0 && isFinite(maxEmpleados)) ? maxEmpleados : undefined;

    // Active employees
    const activeEmployees = useMemo(() => {
        return (usuarios || [])
            .filter(u => u.activo && u.rol !== 'admin')
            .slice(0, safeMaxEmpleados);
    }, [usuarios, safeMaxEmpleados]);

    // Consumos de Hoy (local timezone)
    const consumosRecientes = useLiveQuery(async () => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        return db.logs
            .where('fecha')
            .between(startOfDay.toISOString(), endOfDay.toISOString())
            .and(log => log.tipo === 'CONSUMO')
            .reverse()
            .limit(20)
            .toArray();
    }, []) || [];

    // 🗑️ Handle Revert
    const handleDeleteConsumo = async (log) => {
        const result = await Swal.fire({
            title: '¿Revertir consumo?',
            text: `${log.producto} — Cantidad: ${log.cantidad}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, revertir',
            confirmButtonColor: '#ef4444',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const res = await revertirConsumoInterno(log.id);
                if (res.success) {
                    Swal.fire({ icon: 'success', title: 'Revertido', text: `${log.producto} devuelto al inventario.`, timer: 2000, showConfirmButton: false });
                } else {
                    Swal.fire('Error', res.message || 'No se pudo revertir.', 'error');
                }
            } catch (error) {
                console.error("Error revirtiendo consumo:", error);
                Swal.fire('Error', 'Error al revertir consumo.', 'error');
            }
        }
    };

    // 🔍 Product Filter
    const filteredProducts = useMemo(() => {
        if (!productos) return [];
        if (!searchTerm) return [...productos].sort((a, b) => b.stock - a.stock).slice(0, 30);
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
                const maxQty = product.stock || 0;
                if (existing.cantidad >= maxQty) {
                    Swal.fire('Stock Máximo', `Solo hay ${maxQty} unidades de ${product.nombre}.`, 'info');
                    return prev;
                }
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
            if (!existing) return prev;
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

    // 💰 Cart Totals
    const cartTotal = useMemo(() => cart.reduce((total, item) => total + (item.product.precio || 0) * item.cantidad, 0), [cart]);
    const cartCount = useMemo(() => cart.reduce((acc, item) => acc + item.cantidad, 0), [cart]);

    // 🚀 SUBMIT PROCESS
    const handleBatchSubmit = async () => {
        if (cart.length === 0) { Swal.fire('Carrito Vacío', 'Agrega productos antes de confirmar.', 'warning'); return; }
        if (globalMotivo.length < 3) { Swal.fire('Motivo Requerido', 'Indica un motivo general para este consumo.', 'warning'); return; }
        if (consumidorType === 'EMPLOYEE' && !targetEmployeeId) { Swal.fire('Empleado Requerido', 'Selecciona quién consume los productos.', 'warning'); return; }
        if (consumidorType === 'VACA' && vacaSelectedIds.length < 2) { Swal.fire('Selección Incompleta', 'La vaca necesita al menos 2 empleados.', 'warning'); return; }

        // Validate active employees
        if (consumidorType === 'EMPLOYEE') {
            if (!activeEmployees.find(u => u.id === targetEmployeeId)) {
                Swal.fire('Empleado No Disponible', 'El empleado seleccionado ya no está activo.', 'error');
                setTargetEmployeeId(''); return;
            }
        }
        if (consumidorType === 'VACA') {
            const invalidIds = vacaSelectedIds.filter(id => !activeEmployees.find(u => u.id === id));
            if (invalidIds.length > 0) {
                Swal.fire('Empleado No Disponible', 'Algunos empleados seleccionados ya no están activos.', 'error');
                setVacaSelectedIds(prev => prev.filter(id => !invalidIds.includes(id))); return;
            }
        }

        // Stock check
        const sinStock = cart.filter(item => {
            const prod = productos?.find(p => p.id === item.product.id);
            return !prod || (prod.stock || 0) < item.cantidad;
        });
        if (sinStock.length > 0) {
            const nombres = sinStock.map(i => `${i.product.nombre} (pide ${i.cantidad}, hay ${productos?.find(p => p.id === i.product.id)?.stock || 0})`).join('\n');
            Swal.fire('Stock Insuficiente', `Los siguientes productos no tienen stock suficiente:\n${nombres}`, 'warning');
            return;
        }

        // Self-claim check
        if (consumidorType === 'EMPLOYEE' && targetEmployeeId === usuario?.id) {
            if (usuario.rol !== 'admin' && usuario.rol !== 'owner') {
                Swal.fire('Acceso Denegado', 'No puedes registrar tu propio consumo.', 'error'); return;
            }
        }

        // Credit validation (single employee)
        if (consumidorType === 'EMPLOYEE') {
            const validacion = await validarCapacidadEndeudamiento(targetEmployeeId, cartTotal);
            if (!validacion.puede) {
                const { disponible } = validacion.detalles || {};
                await Swal.fire({
                    title: 'Crédito Insuficiente',
                    html: `<div class="text-left text-sm space-y-2"><p>${validacion.mensaje}</p><hr/><p><strong>Disponible:</strong> $${disponible?.toFixed(2)}</p><p class="text-rose-600 font-bold">Total: $${cartTotal.toFixed(2)}</p></div>`,
                    icon: 'error'
                });
                return;
            }
        }

        // Credit validation (Vaca — per participant)
        if (consumidorType === 'VACA') {
            const montoPerPerson = cartTotal / vacaSelectedIds.length;
            const sinCredito = [];
            for (const empId of vacaSelectedIds) {
                const v = await validarCapacidadEndeudamiento(empId, montoPerPerson);
                if (!v.puede) {
                    const emp = activeEmployees.find(u => u.id === empId);
                    sinCredito.push(emp?.nombre || empId);
                }
            }
            if (sinCredito.length > 0) {
                await Swal.fire({
                    title: 'Crédito Insuficiente',
                    html: `No hay crédito suficiente ($${(cartTotal / vacaSelectedIds.length).toFixed(2)} c/u):<br><br><b>${sinCredito.join(', ')}</b>`,
                    icon: 'error'
                });
                return;
            }
        }

        // ✅ Process
        setIsSubmitting(true);
        let successCount = 0, failCount = 0;

        if (consumidorType === 'VACA') {
            const motivoVaca = `${globalMotivo} (Vaca x${vacaSelectedIds.length})`;
            const montoPerPerson = cartTotal / vacaSelectedIds.length;

            // 1. Stock descuento (1x)
            for (const item of cart) {
                try {
                    const r = await registrarConsumoInterno({ id: item.product.id, unidadVenta: 'unidad', cantidad: item.cantidad }, motivoVaca, usuario);
                    if (r.success) successCount++; else failCount++;
                } catch { failCount++; }
            }

            // 2. Deuda proporcional (Nx)
            const itemNames = cart.map(i => `${i.product.nombre}(x${i.cantidad})`).join(', ');
            for (const empId of vacaSelectedIds) {
                try {
                    // [FIX] Build table list — periodos_nomina may not exist
                    const txTables = [db.empleados_finanzas, db.historial_nomina, db.nomina_ledger];
                    if (db.periodos_nomina) txTables.push(db.periodos_nomina);
                    await db.transaction('rw', ...txTables, async () => {
                        let fin = await db.empleados_finanzas.get(empId);
                        if (!fin) fin = { userId: empId, sueldoBase: 0, deudaAcumulada: 0, favor: 0 };
                        fin.deudaAcumulada = (fin.deudaAcumulada || 0) + montoPerPerson;
                        await db.empleados_finanzas.put(fin);
                        const histId = await db.historial_nomina.add({
                            userId: empId, fecha: new Date().toISOString(), tipo: 'CONSUMO_PRODUCTO',
                            monto: montoPerPerson, detalle: `Vaca (${vacaSelectedIds.length}p): ${itemNames} - ${motivoVaca}`,
                            registradoPor: usuario?.id || 'SISTEMA'
                        });
                        // [FIX] Get periodoId so obtenerHistorial can find this entry
                        let currentPeriodoId;
                        try {
                            if (db.periodos_nomina) {
                                const abierto = await db.periodos_nomina.where('status').equals('ABIERTO').first();
                                currentPeriodoId = abierto?.id || `auto-${Date.now()}`;
                            } else {
                                currentPeriodoId = `auto-${Date.now()}`;
                            }
                        } catch { currentPeriodoId = `auto-${Date.now()}`; }
                        await db.nomina_ledger.add({
                            empleadoId: empId, tipo: 'DEUDA', subtipo: 'CONSUMO_PRODUCTO', monto: montoPerPerson,
                            fecha: new Date().toISOString(),
                            detalle: `Vaca: $${cartTotal.toFixed(2)} ÷ ${vacaSelectedIds.length} = $${montoPerPerson.toFixed(2)} | ${itemNames}`,
                            periodoId: currentPeriodoId,
                            status: 'PENDIENTE',
                            metadata: { tipo: 'VACA', participantes: vacaSelectedIds.length, totalOriginal: cartTotal },
                            historyId: histId,
                            registradoPor: usuario?.id || 'SISTEMA'
                        });
                    });
                } catch (error) {
                    console.error(`Error deuda vaca (${empId}):`, error);
                    failCount++;
                }
            }
        } else {
            for (const item of cart) {
                try {
                    const motivoFinal = `${globalMotivo} (Lote)`;
                    const r = consumidorType === 'EMPLOYEE'
                        ? await registrarConsumoEmpleado(targetEmployeeId, item.product, item.cantidad, motivoFinal)
                        : await registrarConsumoInterno({ id: item.product.id, unidadVenta: 'unidad', cantidad: item.cantidad }, motivoFinal, usuario);
                    if (r.success) successCount++; else failCount++;
                } catch { failCount++; }
            }
        }

        setIsSubmitting(false);

        if (failCount === 0) {
            const extra = consumidorType === 'VACA' ? ` Dividido entre ${vacaSelectedIds.length} ($${(cartTotal / vacaSelectedIds.length).toFixed(2)} c/u).` : '';
            Swal.fire({ icon: 'success', title: consumidorType === 'VACA' ? '🐄 Vaca Procesada' : 'Consumo Procesado', text: `${successCount} items OK.${extra}`, timer: 3000, showConfirmButton: false });
            setCart([]); setGlobalMotivo(''); setSearchTerm(''); setVacaSelectedIds([]);
        } else {
            Swal.fire({ icon: 'warning', title: 'Proceso Parcial', text: `Éxito: ${successCount} | Fallos: ${failCount}` });
        }
    };

    // === SIDE PANEL ===
    const sidePanel = (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Header + Consumer Selector — compact */}
            <div className="shrink-0 space-y-3 mb-3">
                <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carrito de Salida</h3>
                    {cartCount > 0 && (
                        <div className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            {cartCount} items
                        </div>
                    )}
                </div>

                <ConsumerToggle
                    consumidorType={consumidorType} setConsumidorType={setConsumidorType}
                    targetEmployeeId={targetEmployeeId} setTargetEmployeeId={setTargetEmployeeId}
                    vacaSelectedIds={vacaSelectedIds} setVacaSelectedIds={setVacaSelectedIds}
                    activeEmployees={activeEmployees} employeeFinanzas={employeeFinanzas}
                    cartTotal={cartTotal}
                    hasEmployeeFeatures={hasEmployeeFeatures} canDoEmpleadoConsumo={canDoEmpleadoConsumo}
                />
            </div>

            {/* History — collapsible, closed by default */}
            <ConsumptionHistory
                consumosRecientes={consumosRecientes}
                usuarios={usuarios}
                canDoEmpleadoConsumo={canDoEmpleadoConsumo}
                onDeleteConsumo={handleDeleteConsumo}
            />

            {/* Cart List — gets ALL remaining space */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
                <ConsumptionCart cart={cart} onAddToCart={handleAddToCart} onRemoveOne={handleRemoveOne} />
            </div>

            {/* Footer — compact */}
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 shrink-0">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                    <span className="text-xl font-black text-slate-800">${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                    {CHIPS.map(chip => (
                        <button
                            key={chip}
                            onClick={() => setGlobalMotivo(chip)}
                            className={`text-[9px] px-1.5 py-0.5 rounded-md border transition-all font-bold uppercase ${globalMotivo === chip
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
                <HoldToConfirmButton
                    onConfirm={handleBatchSubmit}
                    label={isSubmitting ? "PROCESANDO..." : `CONFIRMAR (${cartCount})`}
                    color="emerald"
                    disabled={cart.length === 0 || isSubmitting || !globalMotivo || (consumidorType === 'EMPLOYEE' && !targetEmployeeId) || (consumidorType === 'VACA' && vacaSelectedIds.length < 2)}
                />
            </div>
        </div>
    );

    return (
        <FinancialLayout
            icon={Package}
            title="Consumo de Inventario"
            subtitle={hasEmployeeFeatures ? "Registra mermas, uso interno o consumo de empleados." : "Registra mermas y uso interno."}
            color="emerald"
            sidePanel={sidePanel}
        >
            <ProductGrid
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filteredProducts={filteredProducts}
                cart={cart}
                onAddToCart={handleAddToCart}
            />
        </FinancialLayout>
    );
}
