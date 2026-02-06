import React, { useState, useEffect } from 'react';
import { DollarSign, Save, CreditCard, History, AlertCircle, UserX, RotateCcw, X } from 'lucide-react';
import { useEmployeeFinance } from '../../../../hooks/store/useEmployeeFinance';
import { useFinanceIntegrator } from '../../../../hooks/store/useFinanceIntegrator';
import { useStore } from '../../../../context/StoreContext';
import { ActionGuard } from '../../../../components/security/ActionGuard';
import Swal from 'sweetalert2';

export default function EmployeeDetail({ usuario, onClose }) {
    const { obtenerFinanzas, actualizarConfiguracion, procesarPagoNomina, obtenerHistorial } = useEmployeeFinance();
    const { revertirMovimiento } = useFinanceIntegrator();
    const { configuracion, actualizarUsuario } = useStore(); // ✅ Added actualizarUsuario

    const [finanzas, setFinanzas] = useState(null);
    const [historial, setHistorial] = useState([]); // 📜 Historial
    const [loading, setLoading] = useState(true);
    const [configMode, setConfigMode] = useState(false);

    // Form para configuración
    const [formData, setFormData] = useState({
        sueldoBase: 0,
        frecuenciaPago: 'Semanal',
        allowSelfConsume: false // 🛡️ New Permission
    });

    useEffect(() => {
        cargarDatos();
    }, [usuario]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [data, hist] = await Promise.all([
                obtenerFinanzas(usuario.id),
                obtenerHistorial(usuario.id)
            ]);

            setFinanzas(data);
            setHistorial(hist || []);
            setFormData({
                sueldoBase: data.sueldoBase || 0,
                frecuenciaPago: data.frecuenciaPago || 'Semanal',
                allowSelfConsume: usuario.allowSelfConsume || false // 📥 Load from User Prop
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        // ✅ Actualizar estado local inmediatamente
        setFinanzas(prev => ({
            ...prev,
            sueldoBase: formData.sueldoBase,
            frecuenciaPago: formData.frecuenciaPago
        }));

        // 1. Guardar Finanzas (Sueldo)
        await actualizarConfiguracion(usuario.id, {
            sueldoBase: formData.sueldoBase,
            frecuenciaPago: formData.frecuenciaPago
        });

        // 2. Guardar Permisos (Usuario)
        if (actualizarUsuario) {
            await actualizarUsuario(usuario.id, { allowSelfConsume: formData.allowSelfConsume });
        }

        setConfigMode(false);
        cargarDatos(); // Recargar desde DB para sincronizar
        Swal.fire('Guardado', 'Configuración de nómina actualizada', 'success');
    };

    const handlePagarNomina = async () => {
        if (!finanzas) return;

        const sueldo = parseFloat(finanzas.sueldoBase) || 0;
        const deuda = parseFloat(finanzas.deudaAcumulada) || 0;
        const neto = sueldo - deuda;

        // 🛡️ LÓGICA BLINDADA: Si no hay sueldo, ofrecemos configurarlo en lugar de bloquear.
        if (sueldo <= 0) {
            const { isConfirmed } = await Swal.fire({
                title: 'Sueldo No Configurado',
                text: 'Este empleado no tiene un sueldo base definido. ¿Deseas configurarlo ahora?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, Configurar',
                confirmButtonColor: '#4f46e5', // Indigo
                cancelButtonText: 'Cancelar'
            });

            if (isConfirmed) {
                setConfigMode(true);
            }
            return;
        }

        const confirm = await Swal.fire({
            title: '¿Procesar Nómina?',
            html: `
            <div style="text-align:left; font-size: 0.9em;">
                <p><strong>Sueldo Base:</strong> $${sueldo.toFixed(2)}</p>
                <p style="color:red"><strong>- Deudas/Adelantos:</strong> $${deuda.toFixed(2)}</p>
                <hr style="margin: 10px 0;">
                <p style="font-size: 1.2em"><strong>NETO A PAGAR:</strong> $${neto.toFixed(2)}</p>
            </div>
          `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, Pagar y Cerrar',
            confirmButtonColor: '#10B981'
        });

        if (confirm.isConfirmed) {
            const result = await procesarPagoNomina(usuario.id, neto, deuda, `Pago de ${formData.frecuenciaPago}`);
            if (result.success) {
                Swal.fire('Pagado', 'La nómina ha sido procesada y la deuda reseteada.', 'success');
                cargarDatos();
            } else {
                Swal.fire('Error', result.message, 'error');
            }
        }
    };

    const handleRevertir = async (mov) => {
        if (!mov.ledgerId) return;

        const { isConfirmed } = await Swal.fire({
            title: '¿Revertir Movimiento?',
            text: `Se anulará el registro de "${mov.detalle}". Si fue un consumo, el artículo volverá al inventario.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, Revertir',
            confirmButtonColor: '#ef4444',
            cancelButtonText: 'No, cancelar'
        });

        if (isConfirmed) {
            const result = await revertirMovimiento(mov.ledgerId);
            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Movimiento Revertido',
                    text: result.message,
                    timer: 2000,
                    showConfirmButton: false
                });
                cargarDatos();
            } else {
                Swal.fire('Error', result.message, 'error');
            }
        }
    };

    if (!usuario) return null;
    if (loading) return <div className="p-8 text-center text-slate-400">Cargando datos financieros...</div>;

    return (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 p-6 max-w-2xl mx-auto">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-xl font-black text-slate-800">{usuario.nombre}</h2>
                    <p className="text-sm text-slate-500 font-medium">{usuario.rol}</p>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>

            {/* TARJETAS RESUMEN */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                {/* 1. SUELDO BASE */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sueldo Base</span>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xl font-black text-slate-700">${(finanzas?.sueldoBase || 0).toFixed(2)}</span>
                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full uppercase font-bold">{finanzas?.frecuenciaPago || 'Semanal'}</span>
                    </div>

                    {/* BOTÓN EDITAR (Bloqueado si hay deuda) */}
                    {(finanzas?.deudaAcumulada || 0) > 0 ? (
                        <button
                            onClick={() => Swal.fire('Acción Bloqueada', 'No puedes cambiar el sueldo mientras exista una deuda pendiente. Liquida la nómina primero.', 'warning')}
                            className="absolute top-3 right-3 text-slate-300 hover:text-slate-400 cursor-not-allowed"
                            title="Pagos pendientes activos"
                        >
                            <UserX size={14} />
                        </button>
                    ) : (
                        <button
                            onClick={() => setConfigMode(!configMode)}
                            className="absolute top-3 right-3 text-[10px] text-indigo-600 font-bold hover:underline"
                        >
                            {configMode ? 'Cancelar' : 'Editar'}
                        </button>
                    )}
                </div>

                {/* 2. DEUDA ACUMULADA */}
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Deuda Acumulada</span>
                    <div className="mt-1">
                        <span className="text-xl font-black text-rose-600">${(finanzas?.deudaAcumulada || 0).toFixed(2)}</span>
                    </div>
                    <p className="text-[9px] text-rose-400 mt-1">Se descuenta del pago</p>
                </div>

                {/* 3. RESTANTE (NETO) */}
                {(() => {
                    const sb = finanzas?.sueldoBase || 0;
                    const da = finanzas?.deudaAcumulada || 0;
                    const restante = sb - da;
                    const esNegativo = restante < 0;

                    return (
                        <div className={`p-3 rounded-xl border ${esNegativo ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${esNegativo ? 'text-orange-400' : 'text-emerald-400'}`}>
                                {esNegativo ? 'Saldo Negativo' : 'Restante a Pagar'}
                            </span>
                            <div className="mt-1">
                                <span className={`text-xl font-black ${esNegativo ? 'text-orange-600' : 'text-emerald-600'}`}>
                                    ${restante.toFixed(2)}
                                </span>
                            </div>
                            <p className={`text-[9px] mt-1 ${esNegativo ? 'text-orange-400' : 'text-emerald-500'}`}>
                                {esNegativo ? 'Debe dinero a caja' : 'Disponible para nómina'}
                            </p>
                        </div>
                    );
                })()}
            </div>

            {/* 📜 HISTORIAL DE TRANSACCIONES */}
            <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <History size={14} /> Historial del Periodo
                </h3>

                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-inner">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {historial.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm italic">
                                No hay movimientos registrados en este periodo.
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-200/50">
                                {historial.map(mov => {
                                    // Lógica visual: Consumos/Adelantos son rojo (aumentan deuda). Pagos son verde (reducen deuda).
                                    // En este ledger actual, casi todo es aumento de deuda (tipo: DEBT).
                                    const isAnulado = mov.status === 'ANULADO';
                                    const tipoStr = mov.tipo?.replace(/_/g, ' ') || 'MOVIMIENTO';

                                    return (
                                        <li key={mov.id} className={`p-4 hover:bg-white transition-colors flex justify-between items-center gap-4 group ${isAnulado ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wide ${isAnulado ? 'bg-slate-200 text-slate-500' : (mov.tipo === 'ADELANTO' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}`}>
                                                        {isAnulado ? 'ANULADO' : tipoStr}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-500 transition-colors">
                                                        {new Date(mov.fecha).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium text-slate-700 truncate" title={mov.detalle}>
                                                    {mov.detalle}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right whitespace-nowrap">
                                                    <span className={`font-mono font-black text-sm ${isAnulado ? 'text-slate-400 line-through' : 'text-rose-600'}`}>
                                                        {`-$${parseFloat(mov.monto).toFixed(2)}`}
                                                    </span>
                                                </div>

                                                {/* UNDO BUTTON */}
                                                {!isAnulado && mov.ledgerId && (
                                                    <ActionGuard permission="SUPERVISOR_ACCESS">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleRevertir(mov); }}
                                                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            title="Revertir este movimiento"
                                                        >
                                                            <RotateCcw size={14} strokeWidth={3} />
                                                        </button>
                                                    </ActionGuard>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {/* MODO EDICIÓN */}
            {configMode && (
                <div className="mb-8 bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex gap-4 items-end animate-in fade-in slide-in-from-top-2">
                    <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-bold text-indigo-400 uppercase">Sueldo</label>
                        <input
                            type="number"
                            value={formData.sueldoBase}
                            onChange={e => setFormData({ ...formData, sueldoBase: parseFloat(e.target.value) })}
                            className="w-full p-2 rounded-lg border border-indigo-200 text-sm font-bold"
                        />
                    </div>
                    <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-bold text-indigo-400 uppercase">Frecuencia</label>
                        <select
                            value={formData.frecuenciaPago}
                            onChange={e => setFormData({ ...formData, frecuenciaPago: e.target.value })}
                            className="w-full p-2 rounded-lg border border-indigo-200 text-sm font-bold"
                        >
                            <option value="Semanal">Semanal</option>
                            <option value="Quincenal">Quincenal</option>
                            <option value="Mensual">Mensual</option>
                        </select>
                    </div>
                </div>
            )}

            {/* 🛡️ ZONA DE SEGURIDAD (PERMISOS EXTRA) */}
            {configMode && (
                <div className="mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-4 delay-75">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <DollarSign size={12} /> Permisos Financieros
                    </h4>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                        <div>
                            <p className="text-xs font-bold text-slate-700">Autoconsumo Permitido</p>
                            <p className="text-[10px] text-slate-400">Permitir registrar sus propios consumos en caja.</p>
                        </div>
                        <button
                            onClick={() => setFormData(prev => ({ ...prev, allowSelfConsume: !prev.allowSelfConsume }))}
                            className={`w-11 h-6 rounded-full transition-colors relative ${formData.allowSelfConsume ? 'bg-emerald-500' : 'bg-slate-200'}`}
                        >
                            <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${formData.allowSelfConsume ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
            )}

            {/* BOTÓN GUARDAR CONFIGURACIÓN */}
            {configMode && (
                <div className="flex justify-end mb-6">
                    <button onClick={handleSaveConfig} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-bold text-xs shadow-lg shadow-indigo-500/20">
                        <Save size={16} /> GUARDAR CAMBIOS
                    </button>
                </div>
            )}

            {/* ACCIONES */}
            <div className="border-t border-slate-100 pt-6 flex justify-end">
                <button
                    onClick={handlePagarNomina}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/30 flex items-center gap-2 active:scale-95 transition-all"
                >
                    <DollarSign size={20} strokeWidth={2.5} />
                    <span>PAGAR NÓMINA</span>
                </button>
            </div>
        </div>
    );
}
