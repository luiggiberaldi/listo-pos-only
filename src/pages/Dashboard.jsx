// ✅ SYSTEM IMPLEMENTATION - V. 3.3 (DASHBOARD FIX)
// Archivo: src/pages/Dashboard.jsx
// Auditoría: Inyección de Monto Inicial para corrección de Arqueo.

import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import {
  Activity, PackageX, Clock, AlertTriangle,
  Wallet, RefreshCw, ShoppingCart, Layers, CalendarRange, Search, ShieldAlert, Settings
} from 'lucide-react';
import Swal from 'sweetalert2';

// 🔴 LIMPIEZA: Solo importamos el hook V2.5
import { PERMISOS, useRBAC } from '../hooks/store/useRBAC';
// ✅ NUEVO: Importamos el estado de caja para obtener la apertura
import { useCajaEstado } from '../hooks/caja/useCajaEstado';
import { useConfigStore } from '../stores/useConfigStore'; // [NEW]
import { useUIStore } from '../stores/useUIStore'; // [NEW]
import { hasFeature, FEATURES } from '../config/planTiers'; // [NEW]

import DashboardStats from '../components/dashboard/DashboardStats';
import ModalGasto from '../components/finanzas/ModalGasto'; // [NEW]
import { agruparPorMetodo, calcularTesoreia } from '../utils/reportUtils';
import { timeProvider } from '../utils/TimeProvider';

const formatVencimiento = (fechaIso) => {
  if (!fechaIso) return 'N/A';
  try {
    const [year, month] = fechaIso.split('-');
    return `${month}/${year.slice(2)}`;
  } catch (e) { return fechaIso; }
};

export default function Dashboard() {
  const { ventas, productos, configuracion, guardarConfiguracion, usuario, isFactoryAuth, obtenerTasaBCV } = useStore();

  // ✅ Obtener estado de caja
  const { estado: cajaEstado, cortes } = useCajaEstado();
  const license = useConfigStore(state => state.license); // [NEW]

  const { tienePermiso } = useRBAC(usuario);
  const navigate = useNavigate();
  const [rango, setRango] = useState('hoy');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showGastoModal, setShowGastoModal] = useState(false);

  // 💱 P1: Freshness color for tasa badge
  const tasaFreshness = useMemo(() => {
    if (!configuracion.fechaTasa) return { color: 'border-red-300 text-red-600 bg-red-50 dark:bg-red-900/20', label: 'Sin fecha' };
    const hoursAgo = (Date.now() - new Date(configuracion.fechaTasa).getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 4) return { color: 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20', label: 'Vigente' };
    if (hoursAgo < 12) return { color: 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-900/20', label: 'Desactualizada' };
    return { color: 'border-red-300 text-red-600 bg-red-50 dark:bg-red-900/20', label: 'Vencida' };
  }, [configuracion.fechaTasa]);

  // 💱 P6: Onboarding wizard for tasa=0 (one-time)
  useEffect(() => {
    if (configuracion.tasa === 0 && !configuracion._tasaOnboardingDone) {
      Swal.fire({
        title: '💱 Configura tu Tasa',
        html: '<p style="margin-bottom:8px">Para vender necesitas configurar la tasa de cambio.</p><p style="font-size:12px;opacity:0.7">Selecciona tu moneda de referencia:</p>',
        showCancelButton: true,
        confirmButtonText: '🇺🇸 Obtener Dólar BCV',
        cancelButtonText: '🇪🇺 Obtener Euro BCV',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#3b82f6',
        background: '#0f172a',
        color: '#fff',
        allowOutsideClick: false
      }).then(result => {
        if (result.isConfirmed) {
          obtenerTasaBCV(true, 'USD');
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          obtenerTasaBCV(true, 'EUR');
        }
        guardarConfiguracion({ ...configuracion, _tasaOnboardingDone: true });
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ventasFiltradas = useMemo(() => {
    let inicio = timeProvider.now();
    let fin = timeProvider.now();
    inicio.setHours(0, 0, 0, 0);
    fin.setHours(23, 59, 59, 999);

    if (rango === 'semana') {
      const dia = inicio.getDay() || 7;
      inicio.setDate(inicio.getDate() - dia + 1);
    } else if (rango === 'mes') {
      inicio.setDate(1);
    } else if (rango === 'custom') {
      if (!customStart) return [];
      const [y1, m1, d1] = customStart.split('-');
      inicio = new Date(y1, m1 - 1, d1, 0, 0, 0);
      if (customEnd) {
        const [y2, m2, d2] = customEnd.split('-');
        fin = new Date(y2, m2 - 1, d2, 23, 59, 59);
      } else {
        fin = new Date(y1, m1 - 1, d1, 23, 59, 59);
      }
    }

    return (ventas || []).filter(v =>
      v.status === 'COMPLETADA' && new Date(v.fecha) >= inicio && new Date(v.fecha) <= fin
    );
  }, [ventas, rango, customStart, customEnd]);

  const balancesHoy = useMemo(() => {
    if (rango !== 'hoy') return {};
    const hoy = timeProvider.toISOString().split('T')[0];
    let totalOpen = { usdCash: 0, vesCash: 0, usdDigital: 0, vesDigital: 0 };

    // Sumar cierres de hoy
    (cortes || []).filter(c => c.fecha?.startsWith(hoy)).forEach(c => {
      const b = c.balancesApertura || {};
      totalOpen.usdCash += (parseFloat(b.usdCash) || 0);
      totalOpen.vesCash += (parseFloat(b.vesCash) || 0);
    });

    // Sumar activa si es de hoy
    if (cajaEstado?.isAbierta && cajaEstado?.fechaApertura?.startsWith(hoy)) {
      const b = cajaEstado.balancesApertura || {};
      totalOpen.usdCash += (parseFloat(b.usdCash) || 0);
      totalOpen.vesCash += (parseFloat(b.vesCash) || 0);
    }
    return totalOpen;
  }, [cajaEstado, cortes, rango]);

  const tesoreriaResumen = useMemo(() => {
    const tesoreriaV4 = calcularTesoreia(ventasFiltradas, balancesHoy);
    const totalUSD = tesoreriaV4.usdCash + tesoreriaV4.usdDigital;
    const totalBS_enUSD = configuracion.tasa > 0 ? (tesoreriaV4.vesCash + tesoreriaV4.vesDigital) / configuracion.tasa : 0;
    return totalUSD + totalBS_enUSD;
  }, [ventasFiltradas, configuracion.tasa, balancesHoy]);

  const inventarioValor = useMemo(() => {
    let costoTotal = 0;
    let ventaTotal = 0;
    productos.forEach(p => {
      const stock = parseFloat(p.stock) || 0;
      if (stock > 0) {
        costoTotal += stock * (parseFloat(p.costo) || 0);
        ventaTotal += stock * (parseFloat(p.precio) || 0);
      }
    });
    return { costo: costoTotal, venta: ventaTotal, gananciaPotencial: ventaTotal - costoTotal };
  }, [productos]);

  const alertas = useMemo(() => {
    const hoy = timeProvider.now();
    const prox = timeProvider.now(); prox.setDate(hoy.getDate() + 30);
    return {
      criticos: productos.filter(p => p.stock <= (parseFloat(p.stockMinimo) || 5) && p.stock > 0),
      agotados: productos.filter(p => p.stock <= 0),
      porVencer: productos.filter(p => p.fechaVencimiento && new Date(p.fechaVencimiento) <= prox).sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento))
    };
  }, [productos]);

  // 🏪 DASHBOARD TIERED: Bodega → Abasto → Minimarket
  const planId = license?.plan || 'bodega';
  const dashTier = planId === 'minimarket' ? 'full' : planId === 'abasto' ? 'mid' : 'lite';

  return (
    <div className="p-6 max-w-[1600px] mx-auto animate-in fade-in zoom-in duration-300 pb-24">
      {isFactoryAuth && (
        <div className="bg-status-danger text-white px-6 py-4 rounded-2xl shadow-xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4 border-4 border-status-dangerBg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-full animate-bounce mt-3"><ShieldAlert size={32} /></div>
            <div>
              <h3 className="font-black text-lg uppercase tracking-wider">⚠️ Riesgo de Seguridad</h3>
              <p className="text-sm text-white font-medium">Usando PIN de fábrica <strong>(123456)</strong>. Cámbiala en Configuración.</p>
            </div>
          </div>
          {license?.plan === 'bodega' ? (
            <button
              onClick={() => useUIStore.getState().openModal('userProfile', { tab: 'seguridad' })}
              className="bg-white text-status-danger px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-status-dangerBg transition-all shadow-md"
            >
              CAMBIAR PIN
            </button>
          ) : (
            <Link
              to="/configuracion"
              state={{ tab: 'seguridad', autoOpenPin: true }}
              className="bg-white text-status-danger px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-status-dangerBg transition-all shadow-md"
            >
              CAMBIAR PIN
            </Link>
          )}
        </div>
      )}

      {/* HEADER & FILTROS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-3xl font-black text-content-main flex items-center gap-3 tracking-tight uppercase">
            <Activity className="text-primary" size={32} /> INICIO
          </h1>
          {/* 💱 P1: BADGE TASA COMPACTO */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => navigate('/configuracion', { state: { tab: 'finanzas' } })}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary hover:border-primary transition-colors"
              title="Configurar Tasa de Cambio"
            >
              <Settings size={16} />
            </button>

            <span className={`px-3 py-1 rounded-lg text-sm font-black shadow-sm border ${tasaFreshness.color}`}>
              Bs {parseFloat(configuracion.tasa || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>

            <button
              onClick={() => obtenerTasaBCV(true)}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary hover:border-primary transition-colors"
              title="Actualizar Tasa"
            >
              <RefreshCw size={14} />
            </button>

            {/* BOTÓN GASTOS [RESTRICTED] */}
            {hasFeature(license?.plan || 'bodega', FEATURES.GASTOS) && (
              <button
                onClick={() => setShowGastoModal(true)}
                className="ml-2 px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-700 dark:from-amber-900/20 dark:to-orange-900/20 dark:text-amber-400 rounded-xl text-xs font-black border border-amber-200 dark:border-amber-800 transition-all flex items-center gap-2 shadow-sm hover:shadow-md transform active:scale-95"
                title="Registrar Gasto o Consumo"
              >
                <Wallet size={16} />
                GASTOS
              </button>
            )}
          </div>

        </div>

        {dashTier === 'full' && (
          <div className="flex flex-col items-end gap-2">
            <div className="bg-app-light dark:bg-app-dark p-1.5 rounded-xl flex shadow-inner">
              {['hoy', 'semana', 'mes', 'custom'].map((r) => (
                <button key={r} onClick={() => setRango(r)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${rango === r ? 'bg-surface-light dark:bg-surface-dark text-primary shadow-sm' : 'text-content-secondary hover:text-content-main'}`}>
                  {r === 'custom' && <CalendarRange size={14} />}
                  {r === 'hoy' ? 'Hoy' : r === 'semana' ? 'Esta Semana' : r === 'mes' ? 'Este Mes' : 'Filtro'}
                </button>
              ))}
            </div>
            {rango === 'custom' && (
              <div className="flex items-center gap-2 bg-surface-light dark:bg-surface-dark p-2 rounded-xl border border-border-subtle shadow-lg z-10">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="bg-app-light dark:bg-app-dark text-xs font-bold rounded-lg px-2 py-1.5 border-none outline-none" />
                <span className="text-content-secondary">-</span>
                <input type="date" value={customEnd} min={customStart} onChange={(e) => setCustomEnd(e.target.value)} className="bg-app-light dark:bg-app-dark text-xs font-bold rounded-lg px-2 py-1.5 border-none outline-none" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* 📊 CONTENIDO PRINCIPAL: LITE / MID / FULL */}
      {/* ═══════════════════════════════════════ */}

      {/* ── 🏪 BODEGA (LITE): Resumen + Accesos Rápidos ── */}
      {dashTier === 'lite' && (
        <>
          {/* 💰 TARJETA VENTAS DE HOY — Simple y directo */}
          <div className="mb-8 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 rounded-3xl p-8 shadow-xl border border-slate-700/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-[0.06]"><Wallet size={160} className="text-white transform rotate-12" /></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-primary/20 rounded-xl"><ShoppingCart size={20} className="text-primary" /></div>
                <div>
                  <h3 className="text-sm font-black text-white/60 uppercase tracking-widest">Ventas de Hoy</h3>
                  <p className="text-[10px] text-slate-500 font-bold">{ventasFiltradas.length} transacciones</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total en Divisas</p>
                  <p className="text-4xl font-black text-white font-mono tracking-tight">${tesoreriaResumen.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Equivalente Bs</p>
                  <p className="text-4xl font-black text-emerald-400 font-mono tracking-tight">Bs {(tesoreriaResumen * (configuracion.tasa || 0)).toLocaleString('es-VE', { maximumFractionDigits: 0 })}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 🚀 ACCESOS RÁPIDOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            <button onClick={() => navigate('/vender')} className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl shadow-md border border-border-subtle hover:bg-primary/5 hover:border-primary/30 transition-all group text-left">
              <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShoppingCart className="text-primary" size={24} />
              </div>
              <h3 className="text-lg font-black text-content-main mb-1">Punto de Venta</h3>
              <p className="text-xs text-content-secondary">Facturar y procesar clientes</p>
            </button>

            <button onClick={() => navigate('/inventario')} className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl shadow-md border border-border-subtle hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all group text-left">
              <div className="bg-emerald-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <PackageX className="text-emerald-600 dark:text-emerald-400" size={24} />
              </div>
              <h3 className="text-lg font-black text-content-main mb-1">Inventario</h3>
              <p className="text-xs text-content-secondary">Consultar precios y stock</p>
            </button>

            <button onClick={() => navigate('/configuracion')} className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl shadow-md border border-border-subtle hover:bg-slate-500/5 hover:border-slate-500/30 transition-all group text-left">
              <div className="bg-slate-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Settings className="text-slate-600 dark:text-slate-400" size={24} />
              </div>
              <h3 className="text-lg font-black text-content-main mb-1">Configuración</h3>
              <p className="text-xs text-content-secondary">Hardware y Preferencias</p>
            </button>
          </div>
        </>
      )}

      {/* ── 🏬 ABASTO (MID): Ventas + Inventario + Total Diario ── */}
      {dashTier === 'mid' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* TARJETA VENTAS (reutilizada del Full) */}
            <Link to="/total-diario" className="block group col-span-1 lg:col-span-2">
              <div className="h-full bg-surface-dark rounded-3xl p-8 shadow-xl relative overflow-hidden transition-all transform hover:scale-[1.01] border border-border-subtle flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Wallet size={180} className="text-white transform rotate-12" /></div>
                <div className="relative z-10">
                  <span className="bg-primary/20 text-primary-focus px-3 py-1 rounded-full text-[10px] font-black uppercase mb-3 inline-block">Caja Principal</span>
                  <h3 className="text-3xl font-black text-white mb-1">Ventas de Hoy</h3>
                  <p className="text-xs text-slate-500 font-bold">{ventasFiltradas.length} transacciones</p>
                </div>
                <div className="relative z-10 mt-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Divisas</p>
                      <p className="text-4xl font-black text-white font-mono tracking-tighter">${tesoreriaResumen.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">En Bolívares</p>
                      <p className="text-4xl font-black text-emerald-400 font-mono tracking-tighter">Bs {(tesoreriaResumen * configuracion.tasa).toLocaleString('es-VE', { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                  <p className="text-xs text-primary font-bold mt-4 opacity-80 flex items-center gap-1 group-hover:opacity-100 transition-opacity">
                    <Search size={12} /> Ver detalle Total Diario →
                  </p>
                </div>
              </div>
            </Link>

            {/* CAPITAL EN INVENTARIO */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-sm border border-border-subtle flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary-light/40 dark:bg-primary/20 text-primary rounded-2xl"><Layers size={24} /></div>
                <div><h4 className="font-black text-content-main uppercase text-sm">Capital en Inventario</h4></div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-content-secondary">Inversión (Costo)</span><span className="font-bold text-content-main">${inventarioValor.costo.toLocaleString()}</span></div>
                  <div className="w-full bg-app-light dark:bg-app-dark rounded-full h-2"><div className="bg-content-secondary h-2 rounded-full" style={{ width: '100%' }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-content-secondary">Valor Venta</span><span className="font-bold text-primary">${inventarioValor.venta.toLocaleString()}</span></div>
                  <div className="w-full bg-app-light dark:bg-app-dark rounded-full h-2"><div className="bg-primary h-2 rounded-full" style={{ width: '100%' }}></div></div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-border-subtle text-center">
                <p className="text-xs text-content-secondary uppercase font-bold">Ganancia Estimada</p>
                <p className="text-2xl font-black text-primary">+${inventarioValor.gananciaPotencial.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* ACCESOS RÁPIDOS COMPACTOS — Abasto */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <button onClick={() => navigate('/vender')} className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-border-subtle hover:border-primary/30 transition-all group text-left flex items-center gap-3">
              <div className="bg-primary/10 w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <ShoppingCart className="text-primary" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-content-main">Vender</h3>
                <p className="text-[10px] text-content-secondary">Punto de Venta</p>
              </div>
            </button>
            <button onClick={() => navigate('/inventario')} className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-border-subtle hover:border-emerald-500/30 transition-all group text-left flex items-center gap-3">
              <div className="bg-emerald-500/10 w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <PackageX className="text-emerald-600 dark:text-emerald-400" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-content-main">Inventario</h3>
                <p className="text-[10px] text-content-secondary">Stock y precios</p>
              </div>
            </button>
            <button onClick={() => navigate('/historial')} className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-border-subtle hover:border-blue-500/30 transition-all group text-left flex items-center gap-3">
              <div className="bg-blue-500/10 w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Clock className="text-blue-600 dark:text-blue-400" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-content-main">Historial</h3>
                <p className="text-[10px] text-content-secondary">Ventas pasadas</p>
              </div>
            </button>
            <button onClick={() => navigate('/configuracion')} className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-border-subtle hover:border-slate-500/30 transition-all group text-left flex items-center gap-3">
              <div className="bg-slate-500/10 w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Settings className="text-slate-600 dark:text-slate-400" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-content-main">Ajustes</h3>
                <p className="text-[10px] text-content-secondary">Preferencias</p>
              </div>
            </button>
          </div>
        </>
      )}

      {/* ── 🏢 MINIMARKET (FULL): Dashboard Completo ── */}
      {dashTier === 'full' && (
        <>
          <div className="mb-8">
            <DashboardStats ventas={ventasFiltradas} balancesApertura={balancesHoy} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            <Link to="/total-diario" className="block group col-span-1 lg:col-span-2">
              <div className="h-full bg-surface-dark rounded-3xl p-8 shadow-xl relative overflow-hidden transition-all transform hover:scale-[1.01] border border-border-subtle flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Wallet size={180} className="text-white transform rotate-12" /></div>
                <div className="relative z-10">
                  <span className="bg-primary/20 text-primary-focus px-3 py-1 rounded-full text-[10px] font-black uppercase mb-3 inline-block">Caja Principal</span>
                  <h3 className="text-3xl font-black text-white mb-1">Ventas de Hoy</h3>
                </div>
                <div className="relative z-10 mt-8 text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total en Divisas</p>
                  <p className="text-5xl font-black text-white font-mono tracking-tighter">${tesoreriaResumen.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-primary font-bold mt-2 opacity-80">≈ Bs {(tesoreriaResumen * configuracion.tasa).toLocaleString('es-VE', { maximumFractionDigits: 0 })}</p>
                </div>
              </div>
            </Link>

            <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-sm border border-border-subtle flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary-light/40 dark:bg-primary/20 text-primary rounded-2xl"><Layers size={24} /></div>
                <div><h4 className="font-black text-content-main uppercase text-sm">Capital en Inventario</h4></div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-content-secondary">Inversión (Costo)</span><span className="font-bold text-content-main">${inventarioValor.costo.toLocaleString()}</span></div>
                  <div className="w-full bg-app-light dark:bg-app-dark rounded-full h-2"><div className="bg-content-secondary h-2 rounded-full" style={{ width: '100%' }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-content-secondary">Valor Venta</span><span className="font-bold text-primary">${inventarioValor.venta.toLocaleString()}</span></div>
                  <div className="w-full bg-app-light dark:bg-app-dark rounded-full h-2"><div className="bg-primary h-2 rounded-full" style={{ width: '100%' }}></div></div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-border-subtle text-center">
                <p className="text-xs text-content-secondary uppercase font-bold">Ganancia Estimada</p>
                <p className="text-2xl font-black text-primary">+${inventarioValor.gananciaPotencial.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="space-y-6">
        <h3 className="text-lg font-bold text-content-main pl-1 border-l-4 border-status-warning uppercase flex items-center gap-2">
          <AlertTriangle size={20} className="text-status-warning" /> Avisos Pendientes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AlertCard title="POR VENCERSE" items={alertas.porVencer} icon={Clock} variant="warning" msgEmpty="Todo fresquito" type="date" />
          <AlertCard title="QUEDAN POCOS" items={alertas.criticos} icon={Activity} variant="warning" msgEmpty="Hay mercancía" />
          <AlertCard title="SE AGOTÓ" items={alertas.agotados} icon={PackageX} variant="danger" msgEmpty="Nada falta" />
        </div>
      </div>


      <ModalGasto
        isOpen={showGastoModal}
        onClose={() => setShowGastoModal(false)}
      />
    </div >
  );
}

const AlertCard = ({ title, items, icon: Icon, variant, msgEmpty, type = 'stock' }) => {
  const theme = {
    warning: 'bg-status-warningBg border-status-warning text-status-warning',
    danger: 'bg-status-dangerBg border-status-danger text-status-danger',
  }[variant] || 'bg-surface-light border-border-subtle';

  return (
    <div className={`rounded-3xl border p-6 ${theme} transition-all hover:shadow-lg group`}>
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-black text-xs uppercase flex items-center gap-2 tracking-wide"><Icon size={18} /> {title}</h4>
        <span className="bg-white/60 dark:bg-black/20 px-2.5 py-1 rounded-lg text-xs font-black">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="h-24 flex items-center justify-center opacity-50 font-bold text-xs">{msgEmpty}</div>
      ) : (
        <ul className="space-y-3 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
          {items.map(p => (
            <li key={p.id} className="text-xs flex justify-between font-medium items-center border-b border-black/5 dark:border-white/5 pb-2 last:border-0 last:pb-0">
              <span className="truncate max-w-[70%] font-semibold">{p.nombre}</span>
              <span className="font-black font-mono bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded text-[10px]">
                {type === 'date' ? formatVencimiento(p.fechaVencimiento) : `${p.stock} un.`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};