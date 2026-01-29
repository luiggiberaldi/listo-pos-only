// ✅ SYSTEM IMPLEMENTATION - V. 3.3 (TREASURY OPENING FIX)
// Archivo: src/components/dashboard/TreasuryMonitor.jsx
// Auditoría: Inclusión de Fondo de Apertura en el arqueo total.

import React, { useMemo } from 'react';
import { calcularTesoreia, agruparMetodosNativos } from '../../utils/reportUtils';
import { Wallet, Banknote, ArrowRightLeft, DollarSign, Calculator, Lock, PieChart } from 'lucide-react';

export default function TreasuryMonitor({ ventas, tasa, balancesApertura = {} }) {

  const safeTasa = parseFloat(tasa) || 1;

  const { breakdown, totals } = useMemo(() => {
    // 1. Calcular Tesorería V4 (Incluye Apertura)
    const tesoreria = calcularTesoreia(ventas || [], balancesApertura);

    // 2. Extraer Aperturas para desglose
    const openUSD = parseFloat(balancesApertura.usdCash || 0);
    const openVES = parseFloat(balancesApertura.vesCash || 0);

    // 3. Generar desglose de métodos (Sólo Ventas del turno, para no duplicar apertura visualmente si ya se suma aparte)
    // Pero el usuario quiere ver "Fondo de Apertura" en la lista.

    // 3. Generar desglose de métodos (NATIVO: Sin distorsión por tasa)
    const { usd: rawUSD, bs: rawBS } = agruparMetodosNativos(ventas || []);

    // Inyectar Aperturas
    const mapUSD = [...rawUSD];
    const mapBS = [];

    if (openUSD > 0) mapUSD.unshift({ name: 'Fondo de Apertura', value: openUSD });
    if (openVES > 0) mapBS.push({ name: 'Fondo de Apertura', value: openVES });

    // Agregar lo generado nativamente
    mapBS.push(...rawBS);


    // 4. Totales Finales (Directo del Motor V4)
    const totalInUSD = tesoreria.usdCash + tesoreria.usdDigital + ((tesoreria.vesCash + tesoreria.vesDigital) / (safeTasa || 1));
    const totalInBS = ((tesoreria.usdCash + tesoreria.usdDigital) * safeTasa) + (tesoreria.vesCash + tesoreria.vesDigital);

    return {
      breakdown: { usd: mapUSD, bs: mapBS },
      totals: {
        // Subtotales por moneda (Cash + Digital)
        subtotalUSD: tesoreria.usdCash + tesoreria.usdDigital,
        subtotalBS: tesoreria.vesCash + tesoreria.vesDigital,
        appliedToWallet: tesoreria.appliedToWallet, // 🆕 Include in totals 
        totalInUSD,
        totalInBS
      }
    };
  }, [ventas, safeTasa, balancesApertura]);

  const formatCurrency = (val, currency) => {
    if (currency === 'Bs') {
      return `Bs ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0)}`;
    }
    return `$ ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0)}`;
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-subtle shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">

      {/* HEADER TIPO BALANCE */}
      <div className="bg-app-light dark:bg-app-dark px-6 py-4 border-b border-border-subtle flex justify-between items-center">
        <div>
          <h3 className="font-black text-content-main flex items-center gap-2 text-lg">
            <Calculator className="text-primary" size={20} />
            MONITOR DE TESORERÍA
          </h3>
          <p className="text-xs text-content-secondary font-medium mt-0.5">Arqueo de fondos en tiempo real</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-content-secondary uppercase tracking-widest">TASA DE CAMBIO</p>
          <p className="text-sm font-bold text-status-success font-mono">1 USD = {safeTasa.toFixed(2)} BS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border-subtle">

        {/* COLUMNA DIVISAS (USD) */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-subtle">
            <div className="p-2 bg-status-successBg text-status-success rounded-lg">
              <DollarSign size={24} />
            </div>
            <div>
              <h4 className="font-bold text-content-main">GAVETA DIVISAS</h4>
              <p className="text-xs text-content-secondary">Efectivo, Zelle, Binance</p>
            </div>
          </div>

          <div className="space-y-3 min-h-[120px]">
            {breakdown.usd.filter(m => m.name !== 'Crédito').length === 0 ? (
              <p className="text-sm text-content-secondary italic py-2">Sin fondos registrados.</p>
            ) : (
              breakdown.usd.filter(m => m.name !== 'Crédito').map((m, i) => (
                <div key={i} className={`flex justify-between items-center text-sm group hover:bg-app-light dark:hover:bg-app-dark p-2 rounded-lg transition-colors ${m.name === 'Fondo de Apertura' ? 'bg-status-successBg/30' : ''}`}>
                  <span className={`flex items-center gap-2 ${m.name === 'Fondo de Apertura' ? 'font-bold text-status-success' : 'text-content-secondary font-medium'}`}>
                    {m.name === 'Fondo de Apertura' && <Lock size={12} />}
                    {m.name}
                  </span>
                  <span className="font-mono font-bold text-content-main">{formatCurrency(m.value, '$')}</span>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 pt-4 border-t-2 border-border-subtle border-dashed">
            <div className="flex justify-between items-end">
              <span className="text-xs font-black text-content-secondary uppercase tracking-wider">Total Divisas (Neto)</span>
              <span className="text-2xl font-black text-status-success">{formatCurrency(totals.subtotalUSD, '$')}</span>
            </div>
          </div>
        </div>

        {/* COLUMNA BOLÍVARES (BS) */}
        <div className="p-6 bg-app-light/30 dark:bg-app-dark/20">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-subtle">
            <div className="p-2 bg-primary/20 text-primary rounded-lg">
              <Banknote size={24} />
            </div>
            <div>
              <h4 className="font-bold text-content-main">GAVETA BOLÍVARES</h4>
              <p className="text-xs text-content-secondary">Pago Móvil, Punto, Efectivo Bs</p>
            </div>
          </div>

          <div className="space-y-3 min-h-[120px]">
            {breakdown.bs.filter(m => m.name !== 'Crédito').length === 0 ? (
              <p className="text-sm text-content-secondary italic py-2">Sin ingresos en bolívares.</p>
            ) : (
              breakdown.bs.filter(m => m.name !== 'Crédito').map((m, i) => (
                <div key={i} className="flex justify-between items-center text-sm group hover:bg-app-light dark:hover:bg-app-dark p-2 rounded-lg transition-colors">
                  <span className="text-content-secondary font-medium group-hover:text-primary transition-colors">{m.name}</span>
                  <span className="font-mono font-bold text-content-main">{formatCurrency(m.value, 'Bs')}</span>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 pt-4 border-t-2 border-border-subtle border-dashed">
            <div className="flex justify-between items-end">
              <span className="text-xs font-black text-content-secondary uppercase tracking-wider">Total Bolívares (Neto)</span>
              <span className="text-2xl font-black text-primary">{formatCurrency(totals.subtotalBS, 'Bs')}</span>
            </div>
          </div>
        </div>

      </div>

      {/* SECCIÓN CUENTAS POR COBRAR (CRÉDITOS) */}
      {(() => {
        // 1. Total Créditos Generados (Bruto)
        const creditoUSD = breakdown.usd.find(m => m.name === 'Crédito')?.value || 0;
        const creditoBS = breakdown.bs.find(m => m.name === 'Crédito')?.value || 0;

        // 2. Abonos (Pagos de Deuda) - Reducen la Cuenta por Cobrar
        // Buscamos transacciones de COBRO_DEUDA en el mismo período (o deberíamos buscar histórico? 
        // Para Total Diario audita los movimientos DEL DÍA. 
        // Si el crédito fue HOY y el abono HOY, se netean. 
        // PASIVO: Si el crédito fue AYER y el abono HOY, el crédito no sale aquí (porque es venta vieja), pero el abono SÍ sale en caja.
        // Entonces, para mostrar "Cuentas por Cobrar DEL PERIODO", restamos.
        // Si se quiere mostrar "Deuda Total Acumulada del Cliente", necesitamos una consulta global, no local.
        // Asumiendo que "Total Diario" audita MOVIMIENTOS DEL DÍA:
        // "Crédito Generado Hoy" - "Abonos Hoy" = "Crédito Neto Pendiente de Hoy".

        const abonos = ventas?.filter(v => v.tipo === 'COBRO_DEUDA' && v.status === 'COMPLETADA') || [];
        let abonoUSD = 0;

        abonos.forEach(a => {
          // Sumamos el total del abono (convertido a USD referencia si es necesario, o directo)
          // Simplificación: Asumimos total en USD para restar a la deuda principal
          // Si el sistema es multimoneda exacto, deberíamos separar. 
          // Dado el contexto, usamos el total general del abono como reducción de deuda general.
          abonoUSD += (parseFloat(a.total) || 0);
        });

        // 🆕 2.1 Abonos Implicitos (Vuelto aplicado a Deuda en la misma venta)
        ventas?.forEach(v => {
          if (v.appliedToDebt > 0) {
            abonoUSD += parseFloat(v.appliedToDebt);
          }
        });

        // 3. Neto
        const netoUSD = Math.max(0, creditoUSD - abonoUSD);
        // Si hay un saldo negativo (Abono > Crédito Hoy), significa que pagaron deudas viejas. 
        // En ese caso, la "Cuenta por Cobrar generada hoy" es 0.

        if (creditoUSD > 0 || creditoBS > 0) {
          return (
            <div className="bg-purple-50 dark:bg-purple-900/10 border-t border-purple-100 dark:border-purple-900 p-4 flex justify-between items-center animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/40 text-purple-600 rounded-lg">
                  <Wallet size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-purple-800 dark:text-purple-300 text-sm">CUENTAS POR COBRAR</h4>
                  <p className="text-[10px] text-purple-600 dark:text-purple-400 opacity-80">
                    {abonoUSD > 0 ? `Generado $${creditoUSD} - Abonos $${abonoUSD}` : 'Ventas a crédito pendientes de cobro'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {netoUSD > 0 && <p className="font-black text-purple-700 dark:text-purple-300 text-lg">{formatCurrency(netoUSD, '$')}</p>}
                {/* BS se mantiene igual si no hubo lógica de abono mixto explícito */}
                {creditoBS > 0 && <p className="font-bold text-purple-600 dark:text-purple-400 text-sm">{formatCurrency(creditoBS, 'Bs')}</p>}
                {netoUSD === 0 && creditoBS === 0 && <p className="text-xs font-bold text-status-success">¡Cobrado Totalmente!</p>}
              </div>
            </div>
          )
        }
      })()}

      {/* 🆕 SECCIÓN SALDOS A FAVOR (MONEDERO) */}
      {(() => {
        const monedero = parseFloat(totals.appliedToWallet || 0);

        if (monedero > 0) {
          return (
            <div className="bg-orange-50 dark:bg-orange-900/10 border-t border-orange-100 dark:border-orange-900 p-4 flex justify-between items-center animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/40 text-orange-600 rounded-lg">
                  <PieChart size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-orange-800 dark:text-orange-300 text-sm">SALDOS A FAVOR (PASIVO)</h4>
                  <p className="text-[10px] text-orange-600 dark:text-orange-400 opacity-80">
                    Dinero en gaveta que pertenece a clientes (Monedero)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-orange-700 dark:text-orange-300 text-lg">{formatCurrency(monedero, '$')}</p>
              </div>
            </div>
          )
        }
      })()}

      {/* FOOTER CONSOLIDADO */}
      <div className="bg-app-light dark:bg-app-dark border-t border-border-subtle p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">

          <div className="flex items-center gap-4">
            <div className="p-3 bg-surface-light dark:bg-surface-dark rounded-full shadow-sm border border-border-subtle">
              <ArrowRightLeft size={20} className="text-content-secondary" />
            </div>
            <div>
              <p className="text-xs font-bold text-content-secondary uppercase tracking-widest">Patrimonio Consolidado</p>
              <p className="text-[10px] text-content-secondary/70">Suma total convertida a una sola moneda</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-12 text-right w-full sm:w-auto">
            <div>
              <p className="text-[10px] font-bold text-content-secondary uppercase mb-1">Expresado en Dólares</p>
              <p className="text-3xl font-black text-content-main tracking-tight">{formatCurrency(totals.totalInUSD, '$')}</p>
            </div>
            <div className="hidden sm:block border-l border-border-subtle h-10 my-auto"></div>
            <div>
              <p className="text-[10px] font-bold text-content-secondary uppercase mb-1">Expresado en Bolívares</p>
              <p className="text-3xl font-black text-content-main tracking-tight">{formatCurrency(totals.totalInBS, 'Bs')}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}