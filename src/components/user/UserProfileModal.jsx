import React, { useState, useEffect } from 'react';
import { DollarSign, Save, Shield, History, Key, User, X, LogOut } from 'lucide-react';
import { useEmployeeFinance } from '../../hooks/store/useEmployeeFinance';
import { useAuthStore } from '../../stores/useAuthStore';
import Swal from 'sweetalert2';

export default function UserProfileModal({ onClose }) {
    const { usuario, actualizarUsuario, logout } = useAuthStore();
    const { obtenerFinanzas, obtenerHistorial } = useEmployeeFinance();

    const [activeTab, setActiveTab] = useState('resumen'); // resumen, seguridad, finanzas
    const [finanzas, setFinanzas] = useState(null);
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);

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

            if (pinData.newPin.length < 4) {
                return Swal.fire('Seguridad', 'El PIN debe tener al menos 4 dígitos', 'warning');
            }

            // 2. Validar PIN Actual (Comparando con usuario en sesión)
            // NOTA: En un entorno real esto debería ser via API hash, aqui comparamos directo con store local
            if (String(usuario.pin) !== String(pinData.currentPin)) {
                return Swal.fire('Error', 'El PIN actual es incorrecto', 'error');
            }

            // 3. Ejecutar Cambio
            await actualizarUsuario(usuario.id, { pin: pinData.newPin });

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
                            Resumen
                        </button>
                        <button
                            onClick={() => setActiveTab('finanzas')}
                            className={`px-4 py-2 rounded-t-xl text-sm font-bold transition-all ${activeTab === 'finanzas' ? 'bg-white text-slate-900' : 'text-slate-400 hover:bg-white/10'}`}
                        >
                            Mis Finanzas
                        </button>
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

                            {/* FINANCE CARDS */}
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

                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-4">
                                <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-blue-900 text-sm">Información de Cuenta</h4>
                                    <p className="text-xs text-blue-700 mt-1">
                                        ID de Sistema: <span className="font-mono font-bold">{usuario.id}</span>
                                    </p>
                                    <p className="text-xs text-blue-700">
                                        Fecha Registro: <span className="font-mono">{new Date(usuario.fechaRegistro).toLocaleDateString()}</span>
                                    </p>
                                </div>
                            </div>
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
