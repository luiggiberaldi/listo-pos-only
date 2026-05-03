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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-slate-50 rounded-3xl shadow-2xl shadow-black/30 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-white/10" onClick={e => e.stopPropagation()}>

                {/* HEADER */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 pb-0 relative overflow-hidden">
                    {/* Decorative blurs */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/15 rounded-full blur-[60px] pointer-events-none" />

                    <button onClick={onClose} className="absolute top-4 right-4 z-10 text-slate-400 hover:text-white transition-all bg-white/5 hover:bg-white/15 p-2 rounded-xl backdrop-blur-sm border border-white/5 hover:border-white/20">
                        <X size={18} />
                    </button>

                    <div className="flex items-center gap-4 relative">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 border-2 border-white/10">
                            <span className="text-xl font-black tracking-tight">{usuario.nombre.substring(0, 2).toUpperCase()}</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">{usuario.nombre}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-400/20 text-indigo-300">
                                    {usuario.rol}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* TABS */}
                    <div className="flex gap-1 mt-6 relative">
                        <button
                            onClick={() => setActiveTab('resumen')}
                            className={`px-5 py-2.5 rounded-t-xl text-sm font-bold transition-all relative ${activeTab === 'resumen'
                                ? 'bg-slate-50 text-slate-900 shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {esDueño ? 'Mi Negocio' : 'Resumen'}
                        </button>
                        {!esPlanBodega && !esDueño && (
                            <button
                                onClick={() => setActiveTab('finanzas')}
                                className={`px-5 py-2.5 rounded-t-xl text-sm font-bold transition-all ${activeTab === 'finanzas'
                                    ? 'bg-slate-50 text-slate-900 shadow-sm'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                Mis Finanzas
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('seguridad')}
                            className={`px-5 py-2.5 rounded-t-xl text-sm font-bold transition-all ${activeTab === 'seguridad'
                                ? 'bg-slate-50 text-slate-900 shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            Seguridad
                        </button>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="p-6 bg-slate-50 flex-1 overflow-y-auto custom-scrollbar">

                    {/* TAB: RESUMEN */}
                    {activeTab === 'resumen' && (
                        <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">

                            {esDueño ? (
                                /* =============================== */
                                /* 🏪 TAB MI NEGOCIO (PLAN BODEGA) */
                                /* =============================== */
                                <>
                                    {/* Business Identity Card */}
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl flex items-center justify-center shadow-sm border border-emerald-200/50">
                                                <Store size={22} className="text-emerald-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-black text-slate-800 truncate tracking-tight">{configuracion.nombre || 'Mi Bodega'}</h3>
                                                <p className="text-xs text-slate-400 truncate font-medium">{configuracion.rif || 'RIF no configurado'} • {configuracion.telefono || 'Sin teléfono'}</p>
                                            </div>
                                            <span className="bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider border border-emerald-200/80 whitespace-nowrap shadow-sm">
                                                {planLabel}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Tasa + Stats Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {/* TASA Card */}
                                        {(() => {
                                            const tasa = configuracion.tasa || 0;
                                            const hoursAgo = configuracion.fechaTasa
                                                ? (Date.now() - new Date(configuracion.fechaTasa).getTime()) / (1000 * 60 * 60)
                                                : 999;
                                            const isVigente = hoursAgo < 4;
                                            const isWarning = hoursAgo >= 4 && hoursAgo < 12;
                                            const freshLabel = isVigente ? 'Vigente' : isWarning ? 'Desactualizada' : 'Vencida';
                                            const dotColor = isVigente ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : 'bg-red-500';
                                            return (
                                                <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 rounded-2xl border border-emerald-100/80 shadow-sm hover:shadow-md transition-all group">
                                                    <span className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest block mb-1.5">Tasa de Cambio</span>
                                                    <span className="text-2xl font-black text-slate-800 block tracking-tight">
                                                        Bs {tasa.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-2.5">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${isVigente ? 'animate-pulse' : ''}`} />
                                                        <span className="text-[10px] text-slate-500 font-semibold">{freshLabel}</span>
                                                        {configuracion.fuenteTasa && (
                                                            <span className="text-[10px] bg-white/80 px-2 py-0.5 rounded-md text-slate-400 border border-slate-100 font-medium">{configuracion.fuenteTasa}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Products Count */}
                                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 rounded-2xl border border-blue-100/80 shadow-sm hover:shadow-md transition-all">
                                            <span className="text-[10px] font-black text-blue-600/70 uppercase tracking-widest block mb-1.5">Productos Activos</span>
                                            <span className="text-2xl font-black text-slate-800 block tracking-tight">{(productos || []).length}</span>
                                            <span className="text-[10px] text-slate-400 mt-2.5 block font-semibold">En inventario</span>
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
                                                        inputPlaceholder: 'Ej: Jose Perez',
                                                        showCancelButton: true,
                                                        confirmButtonText: 'Guardar',
                                                        cancelButtonText: 'Cancelar',
                                                        inputValidator: (v) => !v?.trim() && 'Escribe un nombre',
                                                        customClass: { confirmButton: 'swal2-confirm-green' }
                                                    });
                                                    if (value) actualizarUsuario(usuario.id, { nombre: value.trim() });
                                                }}
                                                className="bg-gradient-to-br from-violet-50 to-purple-50/50 p-4 rounded-2xl border border-violet-100/80 shadow-sm cursor-pointer hover:shadow-md hover:border-violet-200 transition-all group"
                                            >
                                                <span className="text-[10px] font-black text-violet-600/70 uppercase tracking-widest block mb-1.5">Tu Nombre</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-black text-slate-800 block truncate tracking-tight">{usuario.nombre}</span>
                                                    <Pencil size={13} className="text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                                </div>
                                                <span className="text-[10px] text-slate-400 mt-2.5 block font-semibold">Toca para editar</span>
                                            </div>
                                        ) : (
                                            /* 📊 OTROS PLANES: Sesion Activa read-only */
                                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 p-4 rounded-2xl border border-indigo-100/80 shadow-sm">
                                                <span className="text-[10px] font-black text-indigo-600/70 uppercase tracking-widest block mb-1.5">Sesion Activa</span>
                                                <span className="text-lg font-black text-slate-800 block tracking-tight">{usuario.nombre}</span>
                                                <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-md uppercase font-bold inline-block mt-2.5">{usuario.rol}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Info */}
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Informacion del Sistema</h4>
                                        <div className="space-y-0.5">
                                            {[
                                                { label: 'Moneda Base', value: configuracion.tipoTasa || 'USD' },
                                                { label: 'Redondeo', value: configuracion.modoRedondeo === 'exacto' ? 'Exacto' : configuracion.modoRedondeo === 'entero' ? 'Entero' : configuracion.modoRedondeo === 'multiplo10' ? 'Multiplo 10' : 'Multiplo 5' },
                                                { label: 'IVA', value: `${configuracion.porcentajeIva || 16}%` },
                                                { label: 'Auto-actualizar tasa', value: configuracion.autoUpdateTasa ? 'Activo' : 'Desactivado', highlight: configuracion.autoUpdateTasa },
                                            ].map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center py-2.5 px-1 rounded-lg hover:bg-slate-50/80 transition-colors">
                                                    <span className="text-sm text-slate-500 font-medium">{item.label}</span>
                                                    <span className={`text-sm font-bold ${item.highlight === true ? 'text-emerald-600' : item.highlight === false ? 'text-slate-400' : 'text-slate-700'}`}>
                                                        {item.value}
                                                    </span>
                                                </div>
                                            ))}
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
