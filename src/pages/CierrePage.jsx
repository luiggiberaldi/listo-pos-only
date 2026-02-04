// ✅ SYSTEM IMPLEMENTATION - V. 6.2 (DATA SOURCE FIX)
// Archivo: src/pages/CierrePage.jsx
// Objetivo: Pasar TODAS las ventas (incluyendo anuladas) a la tabla para permitir el reciclaje.

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useStore } from '../context/StoreContext';
import { useConfigContext } from '../context/ConfigContext';
import {
    PieChart, Lock, TrendingUp, MonitorPlay, History, AlertTriangle
} from 'lucide-react';
import Swal from 'sweetalert2';
import { calcularKPIs, generarReporteZ, agruparPorMetodo } from '../utils/reportUtils';
import CierreSalesTable from '../components/cierre/CierreSalesTable';
import ZCutHistory from '../components/cierre/ZCutHistory';
import ReporteZUniversal from '../components/cierre/ReporteZUniversal';
import { useSecureAction } from '../hooks/security/useSecureAction';
import { PERMISOS, useRBAC } from '../hooks/store/useRBAC';
import { timeProvider } from '../utils/TimeProvider';
import { db } from '../db';

export default function CierrePage() {
    const { ventas, cerrarCaja, configuracion, usuario, estado, generarCorrelativo } = useStore();
    const { tienePermiso } = useRBAC(usuario);
    const { ejecutarAccionSegura } = useSecureAction();

    const [activeTab, setActiveTab] = useState('turno');
    const [corteParaImprimir, setCorteParaImprimir] = useState(null);
    const ticketRef = useRef();

    const handlePrint = useReactToPrint({
        contentRef: ticketRef,
        content: () => ticketRef.current,
        documentTitle: `Cierre_Z_${timeProvider.toISOString()}`,
        onAfterPrint: () => setCorteParaImprimir(null)
    });

    useEffect(() => {
        if (corteParaImprimir) handlePrint();
    }, [corteParaImprimir]);

    // 1. OBTENEMOS TODO (VÁLIDAS Y ANULADAS)
    const ventasSesionTotal = useMemo(() => {
        return ventas
            .filter(v => !v.corteId) // ✅ Fix: Handles null AND undefined (Abonos missing prop)
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }, [ventas]);

    // 2. SEPARAMOS LAS LISTAS (Para cálculos internos)
    const ventasValidas = useMemo(() => ventasSesionTotal.filter(v => v.status !== 'ANULADA'), [ventasSesionTotal]);
    const ventasAnuladas = useMemo(() => ventasSesionTotal.filter(v => v.status === 'ANULADA'), [ventasSesionTotal]);

    const resumen = useMemo(() => {
        const taxRate = configuracion?.porcentajeIva !== undefined ? parseFloat(configuracion.porcentajeIva) : 16;
        const kpis = calcularKPIs(ventasValidas, taxRate); // ✅ Pass dynamic Tax Rate
        // ✅ Fix: Base Inicial Correcta
        const base = parseFloat(estado?.balancesApertura?.usdCash || estado?.montoInicial || 0);

        // 💰 REPAIR: Calculate Real Money In (Excluding Credit)
        const metodos = agruparPorMetodo(ventasValidas);
        const ingresoReal = metodos.reduce((acc, m) => m.name === 'Crédito' ? acc : acc + m.value, 0);

        return { ...kpis, apertura: base, ingresoReal };
    }, [ventasValidas, estado, configuracion]);

    const handleCerrarCajaSeguro = () => {
        if (ventasSesionTotal.length === 0) return Swal.fire('Caja Fría', 'No hay movimientos.', 'info');
        if (!tienePermiso(PERMISOS.CAJA_CERRAR)) return;

        ejecutarAccionSegura({
            permiso: PERMISOS.CAJA_CERRAR,
            nombreAccion: 'Cierre Fiscal (Z)',
            accion: () => {
                Swal.fire({
                    title: '¿Cerrar Turno?',
                    html: `
                        <div class="space-y-3">
                            <p class="text-slate-600 dark:text-slate-400">Se generará el reporte Z y se reiniciarán los contadores.</p>
                            <label class="flex items-center justify-center gap-2 cursor-pointer p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-blue-400 transition-all group">
                                <input type="checkbox" id="no-print-checkbox" class="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500">
                                <span class="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition-colors">No imprimir comprobante</span>
                            </label>
                        </div>
                    `,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Sí, cerrar',
                    cancelButtonText: 'Cancelar',
                    preConfirm: () => {
                        return {
                            noPrint: document.getElementById('no-print-checkbox').checked
                        }
                    }
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        const noPrint = result.value.noPrint;

                        // 1. Obtener ID correlativo
                        const numeroZ = await generarCorrelativo('z');
                        const nuevoIdCorte = `Z-${numeroZ.toString().padStart(6, '0')}`;

                        // 2. Generar Reporte Z
                        const reporteBase = generarReporteZ(ventasValidas, estado, usuario, configuracion);

                        // RANGOS FACTURAS
                        const primeraVenta = ventasSesionTotal.length > 0 ? ventasSesionTotal[ventasSesionTotal.length - 1] : null;
                        const ultimaVenta = ventasSesionTotal.length > 0 ? ventasSesionTotal[0] : null;

                        const getRef = (v) => {
                            if (!v) return '---';
                            if (v.numeroFactura) return v.numeroFactura;
                            if (v.referencia && v.referencia.includes('#')) return v.referencia.split('#')[1];
                            return String(v.idVenta || v.id).slice(-6);
                        };

                        const datosTicket = {
                            ...reporteBase,
                            id: nuevoIdCorte,
                            corteRef: nuevoIdCorte,
                            tasa: configuracion.tasa,
                            totalUSD: resumen.totalVentas,
                            totalBS: resumen.totalVentasBS,
                            rangoFacturas: {
                                desde: getRef(primeraVenta),
                                hasta: getRef(ultimaVenta)
                            }
                        };

                        // 3. Persistencia y Renderizado Condicional
                        if (!noPrint) {
                            setCorteParaImprimir(datosTicket);
                        }

                        await cerrarCaja(datosTicket);

                        // SELLADO DE VENTAS
                        if (db && db.ventas) {
                            try {
                                const idsParaActualizar = ventasSesionTotal.map(v => v.id);
                                await db.ventas.bulkUpdate(
                                    idsParaActualizar.map(id => ({ key: id, changes: { corteId: nuevoIdCorte } }))
                                ).catch(async () => {
                                    await Promise.all(ventasSesionTotal.map(v => db.ventas.update(v.id, { corteId: nuevoIdCorte })));
                                });
                            } catch (error) {
                                console.error("🔥 Error crítico sellando ventas en DB:", error);
                            }
                        }

                        Swal.fire({
                            icon: 'success',
                            title: `¡Cierre ${nuevoIdCorte} Exitoso!`,
                            text: noPrint ? 'Turno cerrado (Sin impresión).' : 'Turno cerrado y auditoría guardada.',
                            timer: 2000,
                            showConfirmButton: false
                        });
                    }
                });
            }
        });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
            <div style={{ display: 'none' }}>
                <ReporteZUniversal ref={ticketRef} corte={corteParaImprimir} formato="ticket" />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-content-main flex items-center gap-2">
                        <PieChart className="text-primary" size={32} /> CONTROL DE CAJA
                    </h1>
                    <p className="text-content-secondary font-medium">Gestión de turnos y arqueo fiscal</p>
                </div>

                <div className="flex bg-app-light dark:bg-app-dark p-1 rounded-xl border border-border-subtle">
                    <button onClick={() => setActiveTab('turno')} className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'turno' ? 'bg-surface-light dark:bg-surface-dark text-primary shadow-sm' : 'text-content-secondary hover:text-content-main'}`}>
                        <MonitorPlay size={16} /> Turno Actual
                    </button>
                    <button onClick={() => setActiveTab('historial')} className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'historial' ? 'bg-surface-light dark:bg-surface-dark text-primary shadow-sm' : 'text-content-secondary hover:text-content-main'}`}>
                        <History size={16} /> Historial Z
                    </button>
                </div>
            </div>

            {activeTab === 'turno' ? (
                <div className="space-y-6">
                    {/* 🛠️ BARRA DE ESTADO Y ACCIONES (NUEVO DISEÑO COMPACTO) */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-top-2">

                        {/* Estado: Base y Anulaciones */}
                        <div className="flex items-center gap-6 divide-x divide-slate-200 dark:divide-slate-700">
                            <div className="flex items-center gap-3 pl-2">
                                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500">
                                    <Lock size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Base Inicial</p>
                                    <p className="text-xl font-bold text-slate-700 dark:text-slate-200 font-numbers">${resumen.apertura.toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pl-6">
                                <div className={`p-2 rounded-lg ${ventasAnuladas.length > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'}`}>
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Anulaciones</p>
                                    <p className={`text-xl font-bold font-numbers ${ventasAnuladas.length > 0 ? 'text-red-600' : 'text-slate-700 dark:text-slate-200'}`}>
                                        {ventasAnuladas.length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Botón de Acción Principal */}
                        <button
                            onClick={handleCerrarCajaSeguro}
                            disabled={ventasSesionTotal.length === 0}
                            className="bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Lock size={18} /> CERRAR TURNO
                        </button>
                    </div>

                    {/* 📊 TARJETAS PRINCIPALES (3 GRANDES) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 💰 1. TOTAL RECAUDADO */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-l-4 border-l-blue-600 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Total Recaudado (Caja)</p>
                                    <h3 className="text-4xl font-black text-slate-800 dark:text-white font-numbers tracking-tight">
                                        ${resumen.ingresoReal.toFixed(2)}
                                    </h3>
                                    {/* IVA removed from here to avoid confusion with Fiscal Total */}
                                    <p className="text-xs text-slate-400 mt-1 font-medium">Dinero real en caja + bancos</p>
                                </div>
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <TrendingUp size={24} />
                                </div>
                            </div>
                        </div>

                        {/* 🏛️ 2. VENTAS BRUTAS (FISCAL) */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Ventas Brutas (Fiscal)</p>
                                    <h3 className="text-3xl font-black text-slate-700 dark:text-slate-200 font-numbers tracking-tight">
                                        ${resumen.totalVentas.toFixed(2)}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded">
                                            IVA: ${resumen.totalImpuesto.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-100 text-slate-400 rounded-xl">
                                    <History size={24} />
                                </div>
                            </div>
                        </div>

                        {/* 📈 3. INGRESO NETO (GANANCIA) */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-emerald-100 break-words shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">Ingreso Neto (Base)</p>
                                    <h3 className="text-3xl font-black text-emerald-600 font-numbers tracking-tight">
                                        ${resumen.ventaNeta.toFixed(2)}
                                    </h3>
                                    <p className="text-xs text-emerald-600/60 mt-2 font-medium">Ventas sin impuestos</p>
                                </div>
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                    <TrendingUp size={24} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 🟢 CORRECCIÓN AQUÍ: Pasamos ventasSesionTotal en lugar de ventasValidas */}
                    <CierreSalesTable ventasActivas={ventasSesionTotal} />
                </div>
            ) : (
                <ZCutHistory />
            )}
        </div>
    );
}