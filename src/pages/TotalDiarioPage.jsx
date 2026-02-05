// ✅ SYSTEM IMPLEMENTATION - V. 3.1 (TOTAL DIARIO FIX)
// Archivo: src/pages/TotalDiarioPage.jsx
// Auditoría: Inyección de Fondos de Apertura para cuadre total.

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { ArrowLeft, Calendar, ShieldCheck, CalendarRange, Search, ShieldAlert } from 'lucide-react';
import TreasuryMonitor from '../components/dashboard/TreasuryMonitor';

import FiscalDailySummary from '../components/dashboard/FiscalDailySummary';
import { PERMISOS, useRBAC } from '../hooks/store/useRBAC';
// ✅ IMPORTAR ESTADO DE CAJA
import { useCajaEstado } from '../hooks/caja/useCajaEstado';
import { timeProvider } from '../utils/TimeProvider';

import { useFinance } from '../hooks/store/useFinance'; // [NEW]

export default function TotalDiarioPage() {
  const { ventas, configuracion, usuario } = useStore();
  const { getReporteGastos } = useFinance(); // [NEW]

  // ✅ Obtener apertura
  const { estado: cajaEstado, cortes } = useCajaEstado();

  const { tienePermiso } = useRBAC(usuario);
  const puedeVerTotal = tienePermiso(PERMISOS.REP_VER_TOTAL_DIARIO);

  const [rango, setRango] = useState('hoy');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [gastos, setGastos] = useState([]); // [NEW]

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

  // 🔄 EFECTO: Cargar Gastos cuando cambia el rango
  React.useEffect(() => {
    const fetchGastos = async () => {
      let inicio = timeProvider.now();
      let fin = timeProvider.now();
      inicio.setHours(0, 0, 0, 0);
      fin.setHours(23, 59, 59, 999);

      if (rango === 'semana') {
        const diaSemana = inicio.getDay() || 7;
        inicio.setDate(inicio.getDate() - diaSemana + 1);
      } else if (rango === 'mes') {
        inicio.setDate(1);
      } else if (rango === 'custom') {
        if (!customStart) { setGastos([]); return; }
        const [y1, m1, d1] = customStart.split('-');
        inicio = new Date(y1, m1 - 1, d1, 0, 0, 0);

        if (customEnd) {
          const [y2, m2, d2] = customEnd.split('-');
          fin = new Date(y2, m2 - 1, d2, 23, 59, 59);
        } else {
          fin = new Date(y1, m1 - 1, d1, 23, 59, 59);
        }
      }

      try {
        const data = await getReporteGastos(inicio.toISOString(), fin.toISOString());
        setGastos(data);
      } catch (err) {
        console.error("Error cargando gastos:", err);
      }
    };

    fetchGastos();
  }, [rango, customStart, customEnd]);

  if (!puedeVerTotal) {
    return (
      <div className="h-screen w-full bg-app-light dark:bg-app-dark flex items-center justify-center p-6 animate-in fade-in">
        <div className="max-w-md w-full bg-surface-light dark:bg-surface-dark rounded-3xl p-10 border border-border-subtle shadow-xl">
          <div className="w-20 h-20 bg-status-dangerBg dark:bg-red-900/20 text-status-danger rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={40} />
          </div>
          <h2 className="text-xl font-black text-content-main mb-2 uppercase">Tesorería Restringida</h2>
          <p className="text-content-secondary text-sm mb-8">
            No tienes autorización para auditar los totales diarios del sistema.
          </p>
          <Link to="/" className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
            <ArrowLeft size={18} /> Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  const ventasFiltradas = useMemo(() => {
    let inicio = timeProvider.now();
    let fin = timeProvider.now();

    inicio.setHours(0, 0, 0, 0);
    fin.setHours(23, 59, 59, 999);

    if (rango === 'hoy') {
      // Default
    } else if (rango === 'semana') {
      const diaSemana = inicio.getDay() || 7;
      inicio.setDate(inicio.getDate() - diaSemana + 1);
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

    return ventas.filter(v => {
      if (v.tipo === 'ANULADO') return false;
      if (v.status === 'ANULADA') return false;

      const fechaVenta = new Date(v.fecha);
      return fechaVenta >= inicio && fechaVenta <= fin;
    });
  }, [ventas, rango, customStart, customEnd]);

  return (
    <div className="min-h-screen bg-app-light dark:bg-app-dark p-6 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Link
              to="/"
              className="p-3 bg-surface-light dark:bg-surface-dark border border-border-subtle rounded-xl hover:bg-surface-hover transition-colors shadow-sm group"
            >
              <ArrowLeft size={20} className="text-content-secondary group-hover:text-primary" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-content-main flex items-center gap-2">
                Total Diario <ShieldCheck size={20} className="text-status-success" />
              </h1>
              <p className="text-sm text-content-secondary font-medium">Auditoría detallada de flujos de caja</p>
            </div>
          </div>

          {/* CONTROLES */}
          <div className="flex flex-col items-end gap-2">
            <div className="bg-surface-light dark:bg-surface-dark p-1.5 rounded-xl flex shadow-sm border border-border-subtle">
              {['hoy', 'semana', 'mes', 'custom'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRango(r)}
                  className={`
                    px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2
                    ${rango === r
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-content-secondary hover:text-content-main'}
                  `}
                >
                  {r === 'hoy' && <Calendar size={14} />}
                  {r === 'custom' && <CalendarRange size={14} />}
                  {r === 'hoy' ? 'Hoy' : r === 'semana' ? 'Semana' : r === 'mes' ? 'Mes' : 'Personalizado'}
                </button>
              ))}
            </div>

            {rango === 'custom' && (
              <div className="flex items-center gap-2 bg-surface-light dark:bg-surface-dark p-2 rounded-xl border border-border-subtle animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-content-secondary uppercase ml-1">Desde</span>
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="bg-app-light dark:bg-app-dark text-content-main text-xs font-bold rounded-lg px-2 py-1.5 border-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-content-secondary uppercase ml-1">Hasta</span>
                  <input type="date" value={customEnd} min={customStart} onChange={(e) => setCustomEnd(e.target.value)} className="bg-app-light dark:bg-app-dark text-content-main text-xs font-bold rounded-lg px-2 py-1.5 border-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="h-full flex items-end">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg mb-0.5"><Search size={14} /></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ✅ AUDITORIA FISCAL (NUEVO) */}
        <FiscalDailySummary ventas={ventasFiltradas} gastos={gastos} config={configuracion} />

        <TreasuryMonitor
          ventas={ventasFiltradas}
          gastos={gastos}
          tasa={configuracion.tasa}
          balancesApertura={balancesHoy}
        />

        <div className="mt-8 text-center">
          <p className="text-xs text-content-secondary">
            {rango === 'custom' ? 'Mostrando resultados del rango de fechas seleccionado.' : 'Este reporte incluye el fondo de apertura y ventas registradas.'}
          </p>
        </div>

      </div>
    </div>
  );
}