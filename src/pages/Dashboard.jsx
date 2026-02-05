// ✅ SYSTEM IMPLEMENTATION - V. 3.3 (DASHBOARD FIX)
// Archivo: src/pages/Dashboard.jsx
// Auditoría: Inyección de Monto Inicial para corrección de Arqueo.

import React, { useState, useMemo } from 'react';
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

  const { tienePermiso } = useRBAC(usuario);
  const navigate = useNavigate();

  const canSeeFinance = tienePermiso(PERMISOS.REP_VER_DASHBOARD);



  const [rango, setRango] = useState('hoy');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showRateConfig, setShowRateConfig] = useState(false);
  const [showGastoModal, setShowGastoModal] = useState(false); // [NEW]
  const handleManualTasa = async () => {
    const { value: nuevaTasa } = await Swal.fire({
      title: 'Tasa Personalizada',
      text: 'Introduce el valor manual',
      input: 'number',
      inputValue: configuracion.tasa,
      inputAttributes: { step: 'any', min: '0' },
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      confirmButtonColor: '#10b981'
    });

    if (nuevaTasa) {
      guardarConfiguracion({ ...configuracion, tasa: parseFloat(nuevaTasa) });
      Swal.fire({ icon: 'success', title: `Tasa Manual: Bs ${nuevaTasa}`, timer: 1000, showConfirmButton: false });
    }
  };

  const handleDolar = async () => {
    await obtenerTasaBCV(true, 'USD');
  };

  const handleEuro = async () => {
    await obtenerTasaBCV(true, 'EUR');
  };

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

  if (!canSeeFinance) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in duration-500">
        {isFactoryAuth && (
          <div className="w-full max-w-md bg-status-warningBg text-status-warning border-l-4 border-status-warning px-4 py-3 rounded shadow-md mb-6 flex items-center justify-center gap-3 animate-pulse">
            <ShieldAlert size={20} className="shrink-0 text-status-warning" />
            <span className="text-xs font-bold text-left">PIN DE FÁBRICA ACTIVA (123456).<br />Notifique al Dueño.</span>
          </div>
        )}
        <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl shadow-xl max-w-md w-full border border-border-subtle">
          <div className="bg-primary-light/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Activity className="text-primary" size={40} />
          </div>
          <h1 className="text-2xl font-black text-content-main mb-2">¡Hola, {usuario?.nombre}!</h1>
          <p className="text-content-secondary mb-8">Sistema listo para facturación.</p>
          <button onClick={() => navigate('/vender')} className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all transform hover:scale-105 shadow-lg shadow-primary/30">
            <ShoppingCart size={24} /> ABRIR CAJA
          </button>
        </div>
      </div>
    );
  }

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
          <Link
            to="/configuracion"
            state={{ tab: 'seguridad', autoOpenPin: true }}
            className="bg-white text-status-danger px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-status-dangerBg transition-all shadow-md"
          >
            CAMBIAR PIN
          </Link>
        </div>
      )}

      {/* HEADER & FILTROS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-3xl font-black text-content-main flex items-center gap-3 tracking-tight uppercase">
            <Activity className="text-primary" size={32} /> INICIO
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-bold text-content-secondary">Tasa:</span>

            <button
              onClick={handleDolar}
              className="px-3 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-black border border-green-200 transition-colors flex items-center gap-1"
              title="Obtener Dólar BCV"
            >
              🇺🇸 USD
            </button>

            <button
              onClick={handleEuro}
              className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-black border border-blue-200 transition-colors flex items-center gap-1"
              title="Obtener Euro BCV"
            >
              🇪🇺 EUR
            </button>

            <button
              onClick={handleManualTasa}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 transition-colors"
              title="Editar tasa manualmente"
            >
              ✏️ Manual
            </button>

            <button
              onClick={() => setShowRateConfig(!showRateConfig)}
              className={`p-1.5 rounded-lg transition-colors border ${showRateConfig ? 'bg-primary text-white border-primary' : 'bg-white text-slate-400 border-slate-200 hover:text-primary hover:border-primary'}`}
              title="Configuración de Tasa"
            >
              <Settings size={16} />
            </button>

            <span className="ml-2 px-3 py-1 bg-surface-light dark:bg-surface-dark border border-border-subtle rounded-lg text-sm font-black text-content-main shadow-sm">
              Bs {parseFloat(configuracion.tasa || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>

            {/* BOTÓN GASTOS [NEW] */}
            <button
              onClick={() => setShowGastoModal(true)}
              className="ml-2 px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-700 dark:from-amber-900/20 dark:to-orange-900/20 dark:text-amber-400 rounded-xl text-xs font-black border border-amber-200 dark:border-amber-800 transition-all flex items-center gap-2 shadow-sm hover:shadow-md transform active:scale-95"
              title="Registrar Gasto o Consumo"
            >
              <Wallet size={16} />
              GASTOS
            </button>
          </div>

          {/* ⚙️ PANEL DE CONFIGURACIÓN DE TASA */}
          {showRateConfig && (
            <div className="mt-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-md animate-in slide-in-from-top-2 fade-in relative z-20">
              <div className="flex flex-col gap-4">

                {/* ROUNDING */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Modo de Redondeo</label>
                  <div className="flex gap-2">
                    {['exacto', 'entero', 'm5'].map(mode => (
                      <button
                        key={mode}
                        onClick={() => guardarConfiguracion({ ...configuracion, modoRedondeo: mode })}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all 
                             ${configuracion.modoRedondeo === mode
                            ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                            : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                          }`}
                      >
                        {mode === 'exacto' ? 'Exacto' : mode === 'entero' ? 'Sin Decimal' : 'Múltiplo 5'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AUTO UPDATE */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Actualización Automática</p>
                    <p className="text-[10px] text-slate-500">Se actualiza cada 5 minutos si hay internet.</p>
                  </div>
                  <button
                    onClick={() => {
                      const newValue = !configuracion.autoUpdateTasa;
                      guardarConfiguracion({
                        ...configuracion,
                        autoUpdateTasa: newValue,
                        autoUpdateFrecuencia: newValue ? 300000 : 0 // 5 minutos o apagado
                      });
                      if (newValue && navigator.onLine) obtenerTasaBCV(false);
                    }}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${configuracion.autoUpdateTasa ? 'bg-green-500' : 'bg-slate-300'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${configuracion.autoUpdateTasa ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>

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
      </div>

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
              {/* Mostramos el Tesoreria Resumen que ya incluye apertura si es 'hoy' */}
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