import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Save, Shield, History, Key, User, X, LogOut, Store, Package, TrendingUp, Clock, Pencil } from 'lucide-react';
import { useEmployeeFinance } from '../../hooks/store/useEmployeeFinance';
import { useAuthStore } from '../../stores/useAuthStore';
import { useConfigStore } from '../../stores/useConfigStore';
import { useInventoryStore } from '../../stores/useInventoryStore';
import Swal from 'sweetalert2';
import { hashPin } from '../../utils/securityUtils';

export default function UserProfileModal({ onClose, initialTab = 'resumen' }) {
    const { usuario, actualizarUsuario, logout } = useAuthStore();
    const { obtenerFinanzas, obtenerHistorial } = useEmployeeFinance();

    const [activeTab, setActiveTab] = useState(initialTab);
    const [finanzas, setFinanzas] = useState(null);
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);

    // 🏪 Owner/Admin detection (Mi Negocio tab for ALL plans)
    const license = useConfigStore(state => state.license);
    const configuracion = useConfigStore(state => state.configuracion);
    const productos = useInventoryStore(state => state.productos);
    const esDueño = usuario?.roleId === 'ROL_DUENO' || usuario?.tipo === 'ADMIN' || usuario?.rol === 'admin' || usuario?.id === 1;

    const planNames = { bodega: '🏪 Bodega', abasto: '🛒 Abasto', minimarket: '🏪 Minimarket', listo: '🚀 Listo' };
    const planLabel = planNames[license?.plan] || '🏪 ' + (license?.plan || 'Bodega');
    const esPlanBodega = license?.plan === 'bodega';

    // Estado Cambio de PIN
    const [pinData, setPinData] = useState({
        currentPin: '',
        newPin: '',
        confirmPin: ''
    });

    useEffect(() => {
        if (usuario) cargarDatos();
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
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleChangePin = async () => {
        try {
            // 1. Validaciones Básicas
            if (!pinData.currentPin || !pinData.newPin || !pinData.confirmPin) {
                return Swal.fire('Error', 'Todos los campos son obligatorios', 'warning');
            }

            if (pinData.newPin !== pinData.confirmPin) {
                return Swal.fire('Error', 'El nuevo PIN no coincide con la confirmación', 'error');
            }

            if (pinData.newPin.length !== 6 || !/^\d{6}$/.test(pinData.newPin)) {
                return Swal.fire('Seguridad', 'El PIN debe tener exactamente 6 dígitos numéricos', 'warning');
            }

            // 2. Validar PIN Actual
            if (esDueño) {
                // Para dueños/admin: el PIN está en configuración (pinAdmin)
                const pinActual = String(configuracion?.pinAdmin || '123456');
                if (pinActual !== String(pinData.currentPin)) {
                    return Swal.fire('Error', 'El PIN actual es incorrecto', 'error');
                }
                // 3. Guardar en configuración
                const setConfiguracion = useConfigStore.getState().setConfiguracion;
                setConfiguracion({ pinAdmin: pinData.newPin });
            } else {
                // Para empleados: el PIN está en usuario (pinHash)
                const currentHash = await hashPin(pinData.currentPin);
                if (String(usuario.pinHash) !== String(currentHash)) {
                    return Swal.fire('Error', 'El PIN actual es incorrecto', 'error');
                }
            }

            // 4. Hash del nuevo PIN y guardar en usuario (login lee pinHash)
            const newHash = await hashPin(pinData.newPin);
            const factoryHash = await hashPin('123456');
            await actualizarUsuario(usuario.id, {
                pinHash: newHash,
                isFactoryAuth: newHash === factoryHash
            });

            Swal.fire({
                title: 'PIN Actualizado',
                text: 'Tu clave de acceso ha sido cambiada correctamente. Por seguridad, inicia sesión nuevamente.',
                icon: 'success',
                confirmButtonText: 'Entendido'
            }).then(() => {
                logout();
                window.location.reload();
            });

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo actualizar el PIN', 'error');
        }
    };

    if (!usuario) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                {/* HEADER */}
                <div className="bg-slate-900 text-white p-6 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg border-4 border-slate-800">
                            <span className="text-2xl font-bold">{usuario.nombre.substring(0, 2).toUpperCase()}</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black">{usuario.nombre}</h2>
                            <p className="text-indigo-300 font-medium flex items-center gap-2">
                                <span className="bg-indigo-500/20 px-2 py-0.5 rounded text-xs uppercase tracking-wider border border-indigo-500/30">
                                    {usuario.rol}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* TABS */}
                    <div className="flex gap-1 mt-8 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('resumen')}
                            className={`px-4 py-2 rounded-t-xl text-sm font-bold transition-all ${activeTab === 'resumen' ? 'bg-white text-slate-900' : 'text-slate-400 hover:bg-white/10'}`}
                        >
                            {esDueño ? 'Mi Negocio' : 'Resumen'}
                        </button>
                        {!esPlanBodega && (
                            <button
                                onClick={() => setActiveTab('finanzas')}
                                className={`px-4 py-2 rounded-t-xl text-sm font-bold transition-all ${activeTab === 'finanzas' ? 'bg-white text-slate-900' : 'text-slate-400 hover:bg-white/10'}`}
                            >
                                Mis Finanzas
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('seguridad')}
                            className={`px-4 py-2 rounded-t-xl text-sm font-bold transition-all ${activeTab === 'seguridad' ? 'bg-white text-slate-900' : 'text-slate-400 hover:bg-white/10'}`}
                        >
                            Seguridad
                        </button>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="p-6 bg-slate-50 flex-1 overflow-y-auto custom-scrollbar">

                    {/* TAB: RESUMEN */}
                    {activeTab === 'resumen' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">

                            {esDueño ? (
                                /* =============================== */
                                /* 🏪 TAB MI NEGOCIO (PLAN BODEGA) */
                                /* =============================== */
                                <>
                                    {/* Business Identity Card */}
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                                <Store size={24} className="text-emerald-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-black text-slate-800 truncate">{configuracion.nombre || 'Mi Bodega'}</h3>
                                                <p className="text-xs text-slate-400 truncate">{configuracion.rif || 'RIF no configurado'} • {configuracion.telefono || 'Sin teléfono'}</p>
                                            </div>
                                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider border border-emerald-200 whitespace-nowrap">
                                                {planLabel}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Tasa + Stats Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* TASA Card */}
                                        {(() => {
                                            const tasa = configuracion.tasa || 0;
                                            const hoursAgo = configuracion.fechaTasa
                                                ? (Date.now() - new Date(configuracion.fechaTasa).getTime()) / (1000 * 60 * 60)
                                                : 999;
                                            const freshColor = hoursAgo < 4 ? 'emerald' : hoursAgo < 12 ? 'amber' : 'red';
                                            const freshIcon = hoursAgo < 4 ? '🟢' : hoursAgo < 12 ? '🟡' : '🔴';
                                            const freshLabel = hoursAgo < 4 ? 'Vigente' : hoursAgo < 12 ? 'Desactualizada' : 'Vencida';
                                            return (
                                                <div className={`bg-${freshColor}-50 p-4 rounded-2xl border border-${freshColor}-100 shadow-sm`}>
                                                    <span className={`text-[10px] font-bold text-${freshColor}-500 uppercase tracking-widest block mb-2`}>Tasa de Cambio</span>
                                                    <span className="text-2xl font-black text-slate-700 block">
                                                        Bs {tasa.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-[10px] text-slate-500">{freshIcon} {freshLabel}</span>
                                                        {configuracion.fuenteTasa && (
                                                            <span className="text-[10px] bg-white px-2 py-0.5 rounded-full text-slate-400 border border-slate-100">{configuracion.fuenteTasa}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Products Count */}
                                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm">
                                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-2">Productos Activos</span>
                                            <span className="text-2xl font-black text-blue-700 block">{(productos || []).length}</span>
                                            <span className="text-[10px] text-blue-400 mt-2 block">En inventario</span>
                                        </div>

                                        {/* Session / Editable Name */}
                                        {esPlanBodega ? (
                                            /* 🏪 BODEGA: Card editable para nombre del dueño */
                                            <div
                                                onClick={async () => {
                                                    const { value } = await Swal.fire({
                                                        title: 'Tu Nombre',
                                                        input: 'text',
                                                        inputValue: usuario.nombre || '',
                                                        inputPlaceholder: 'Ej: José Pérez',
                                                        showCancelButton: true,
                                                        confirmButtonText: 'Guardar',
                                                        cancelButtonText: 'Cancelar',
                                                        inputValidator: (v) => !v?.trim() && 'Escribe un nombre',
                                                        customClass: { confirmButton: 'swal2-confirm-green' }
                                                    });
                                                    if (value) actualizarUsuario(usuario.id, { nombre: value.trim() });
                                                }}
                                                className="bg-violet-50 p-4 rounded-2xl border border-violet-100 shadow-sm cursor-pointer hover:border-violet-300 transition-all group"
                                            >
                                                <span className="text-[10px] font-bold text-violet-500 uppercase tracking-widest block mb-2">Tu Nombre</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-black text-violet-700 block truncate">{usuario.nombre}</span>
                                                    <Pencil size={14} className="text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                                </div>
                                                <span className="text-[10px] text-violet-400 mt-2 block">Toca para editar</span>
                                            </div>
                                        ) : (
                                            /* 📊 OTROS PLANES: Sesión Activa read-only */
                                            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 shadow-sm">
                                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-2">Sesión Activa</span>
                                                <span className="text-lg font-black text-indigo-700 block">{usuario.nombre}</span>
                                                <span className="text-[10px] bg-indigo-100 text-indigo-500 px-2 py-1 rounded-full uppercase font-bold inline-block mt-2">{usuario.rol}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Info */}
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Información del Sistema</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between py-1.5 border-b border-slate-50">
                                                <span className="text-slate-500">Moneda Base</span>
                                                <span className="font-bold text-slate-700">{configuracion.tipoTasa || 'USD'}</span>
                                            </div>
                                            <div className="flex justify-between py-1.5 border-b border-slate-50">
                                                <span className="text-slate-500">Redondeo</span>
                                                <span className="font-bold text-slate-700">
                                                    {configuracion.modoRedondeo === 'exacto' ? 'Exacto' : configuracion.modoRedondeo === 'entero' ? 'Entero' : configuracion.modoRedondeo === 'multiplo10' ? 'Múltiplo 10' : 'Múltiplo 5'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between py-1.5 border-b border-slate-50">
                                                <span className="text-slate-500">IVA</span>
                                                <span className="font-bold text-slate-700">{configuracion.porcentajeIva || 16}%</span>
                                            </div>
                                            <div className="flex justify-between py-1.5">
                                                <span className="text-slate-500">Auto-actualizar tasa</span>
                                                <span className={`font-bold ${configuracion.autoUpdateTasa ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    {configuracion.autoUpdateTasa ? 'Activo' : 'Desactivado'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* =============================== */
                                /* 💰 TAB RESUMEN ORIGINAL (LISTO) */
                                /* =============================== */
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Sueldo Base</span>
                                        <span className="text-2xl font-black text-slate-700 block">${(finanzas?.sueldoBase || 0).toFixed(2)}</span>
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full uppercase font-bold inline-block mt-2">{finanzas?.frecuenciaPago || 'Semanal'}</span>
                                    </div>

                                    <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 shadow-sm">
                                        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block mb-2">Deuda Actual</span>
                                        <span className="text-2xl font-black text-rose-600 block">${(finanzas?.deudaAcumulada || 0).toFixed(2)}</span>
                                        <span className="text-[10px] text-rose-400 mt-2 block">Descuentos pendientes</span>
                                    </div>

                                    {(() => {
                                        const sb = finanzas?.sueldoBase || 0;
                                        const da = finanzas?.deudaAcumulada || 0;
                                        const restante = sb - da;
                                        const esNegativo = restante < 0;

                                        return (
                                            <div className={`p-4 rounded-2xl border shadow-sm ${esNegativo ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                                <span className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${esNegativo ? 'text-orange-400' : 'text-emerald-500'}`}>
                                                    {esNegativo ? 'Saldo en Contra' : 'Neto a Cobrar'}
                                                </span>
                                                <span className={`text-2xl font-black block ${esNegativo ? 'text-orange-600' : 'text-emerald-600'}`}>
                                                    ${restante.toFixed(2)}
                                                </span>
                                                <span className={`text-[10px] mt-2 block ${esNegativo ? 'text-orange-400' : 'text-emerald-500'}`}>
                                                    {esNegativo ? 'Debes a caja' : 'Disponible estimado'}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}


                        </div>
                    )}

                    {/* TAB: FINANZAS (HISTORIAL) */}
                    {activeTab === 'finanzas' && (
                        <div className="animate-in slide-in-from-right-4 duration-300 h-full flex flex-col">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <History size={16} /> Movimientos Recientes
                            </h3>

                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex-1 shadow-sm">
                                <div className="overflow-y-auto h-96 custom-scrollbar p-0">
                                    {historial.length === 0 ? (
                                        <div className="p-12 text-center text-slate-400">
                                            <p>No tienes movimientos registrados en este periodo.</p>
                                        </div>
                                    ) : (
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                                                <tr className="text-xs font-bold text-slate-400 uppercase">
                                                    <th className="p-4">Fecha</th>
                                                    <th className="p-4">Detalle</th>
                                                    <th className="p-4 text-right">Monto</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {historial.map(mov => {
                                                    const isAnulado = mov.status === 'ANULADO';
                                                    return (
                                                        <tr key={mov.id} className={`hover:bg-slate-50 ${isAnulado ? 'opacity-50 grayscale' : ''}`}>
                                                            <td className="p-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                                                                {new Date(mov.fecha).toLocaleDateString()} <br />
                                                                <span className="text-slate-400">{new Date(mov.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="text-sm font-medium text-slate-700">{mov.detalle}</div>
                                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isAnulado ? 'bg-slate-200' : 'bg-slate-100 text-slate-500'}`}>
                                                                    {isAnulado ? 'ANULADO' : mov.tipo}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                <span className={`font-mono font-bold ${isAnulado ? 'line-through text-slate-400' : 'text-rose-600'}`}>
                                                                    -${parseFloat(mov.monto).toFixed(2)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: SEGURIDAD */}
                    {activeTab === 'seguridad' && (
                        <div className="animate-in slide-in-from-right-4 duration-300 max-w-md mx-auto py-8">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg">
                                <div className="text-center mb-6">
                                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Key size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">Cambiar PIN de Acceso</h3>
                                    <p className="text-xs text-slate-500 mt-1">Actualiza tu clave personal para mantener tu cuenta segura.</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">PIN Actual</label>
                                        <input
                                            type="password"
                                            placeholder="••••"
                                            maxLength={6}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xl font-bold tracking-widest outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={pinData.currentPin}
                                            onChange={e => setPinData({ ...pinData, currentPin: e.target.value })}
                                        />
                                    </div>

                                    <div className="h-px bg-slate-100 my-4"></div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Nuevo PIN</label>
                                        <input
                                            type="password"
                                            placeholder="••••"
                                            maxLength={6}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xl font-bold tracking-widest outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={pinData.newPin}
                                            onChange={e => setPinData({ ...pinData, newPin: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Confirmar Nuevo PIN</label>
                                        <input
                                            type="password"
                                            placeholder="••••"
                                            maxLength={6}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xl font-bold tracking-widest outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={pinData.confirmPin}
                                            onChange={e => setPinData({ ...pinData, confirmPin: e.target.value })}
                                        />
                                    </div>

                                    <button
                                        onClick={handleChangePin}
                                        className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all mt-4"
                                    >
                                        ACTUALIZAR PIN
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
