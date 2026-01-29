// ✅ SYSTEM IMPLEMENTATION - V. 12.0 (FISCAL MODULE)
// Archivo: src/components/cierre/ReporteZUniversal.jsx
// Objetivo: Agregar desglose de impuestos (Base, IVA, Exento) y rango de facturación.

import React from 'react';
import { useStore } from '../../context/StoreContext';

const PRINT_STYLES = `
  @media print {
    @page { margin: 0; size: auto; }
    body { 
      margin: 0; 
      padding: 0; 
      -webkit-print-color-adjust: exact; 
      print-color-adjust: exact;
    }
  }
`;

export default React.forwardRef(({ corte, formato = 'ticket', paperWidth = '80mm' }, ref) => {
  const { configuracion } = useStore();

  if (!corte) return <div ref={ref}></div>;

  const safeNum = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  const is58mm = paperWidth === '58mm';
  // Ajustes dinámicos según ancho de papel
  const containerClass = is58mm ? 'w-[58mm] p-2' : 'w-[80mm] p-4';
  const baseTextSize = is58mm ? 'text-[9px]' : 'text-xs';
  const titleSize = is58mm ? 'text-lg' : 'text-xl';
  const smallText = is58mm ? 'text-[8px]' : 'text-[10px]';

  const fechaCierre = corte.fecha ? new Date(corte.fecha) : new Date();
  const tasa = safeNum(configuracion.tasa) || 1;

  // --- DATOS FÍSICOS & DIGITALES ---
  const rawTesoreria = corte.tesoreriaDetallada || {};

  const tesoreria = {
    usd: rawTesoreria.usdCash || rawTesoreria.usd || {},
    bs: rawTesoreria.vesCash || rawTesoreria.bs || {}
  };

  // ✅ MAPPING V4 TO UI: Digital is now part of Tesoreria, but UI expects 'bancos' structure
  const bancos = {
    usd: { total: tesoreria.usd.final || rawTesoreria.usdDigital?.final || rawTesoreria.usdDigital?.entradas || 0 }, // Digital usually accumulates to final
    bs: { total: tesoreria.bs.final || rawTesoreria.vesDigital?.final || rawTesoreria.vesDigital?.entradas || 0 }
  };

  const digitalUSD = rawTesoreria.usdDigital?.entradas || rawTesoreria.usdDigital?.recibido || 0;
  const digitalBS = rawTesoreria.vesDigital?.entradas || rawTesoreria.vesDigital?.recibido || 0;

  // Override the bank display to use strictly the flow of this shift
  bancos.usd.total = digitalUSD;
  bancos.bs.total = digitalBS;

  // --- DATOS FISCALES (NUEVO) ---
  const fiscal = corte.fiscal || {
    ventasExentas: 0,
    baseImponible: 0,
    iva: 0,
    igtf: 0
  };
  const rango = corte.rangoFacturas || { desde: '---', hasta: '---' };

  // Totales Ventas Globales
  const totalVentaUSD = safeNum(corte.totalUSD || corte.totalVentas);
  const totalVentaBS = safeNum(corte.totalBS);

  // Gastos (Compatibilidad V3)
  const gastosUSD = safeNum(corte.gastosUSD || corte.totalGastosCaja);
  const gastosBS = safeNum(corte.gastosBS); // Si existe

  // Auditoría
  const auditoria = corte.auditoria || { ventasAnuladas: 0 };
  const numTransacciones = safeNum(corte.transacciones);

  // Formateadores
  const fmtUSD = (n) => `$${safeNum(n).toFixed(2)}`;
  const fmtBS = (n) => `Bs ${safeNum(n).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;

  const Divider = () => <div className="border-b border-black border-dashed my-2 w-full"></div>;
  const SectionTitle = ({ title }) => (
    <h3 className={`font-black uppercase mb-2 text-center bg-black text-white py-1 mt-4 ${baseTextSize}`}>{title}</h3>
  );

  const Row = ({ label, val, bold = false, size }) => (
    <div className={`flex justify-between ${size || baseTextSize} ${bold ? 'font-black' : 'font-medium'} mb-1`}>
      <span>{label}</span>
      <span>{val}</span>
    </div>
  );

  return (
    <div ref={ref} className={`bg-white text-black font-mono mx-auto leading-tight selection:bg-none ${containerClass}`}>
      <style>{PRINT_STYLES}</style>

      {/* HEADER */}
      <div className="text-center mb-4">
        <h1 className={`font-black uppercase tracking-wider ${titleSize}`}>{configuracion.nombreEmpresa || 'COMERCIO'}</h1>
        <p className={baseTextSize}>{configuracion.direccion || 'Dirección Fiscal'}</p>
        <p className={`${baseTextSize} font-bold`}>RIF: {configuracion.rif || 'J-00000000-0'}</p>
      </div>

      <div className="text-center mb-4 border-y-2 border-black py-2">
        <h2 className={`${titleSize} font-black uppercase`}>REPORTE Z</h2>
        <p className={`${baseTextSize} font-bold`}>CORTE Nº {corte.corteRef || '---'}</p>
      </div>

      <div className={`mb-4 ${baseTextSize}`}>
        <Row label="FECHA:" val={fechaCierre.toLocaleDateString()} size={baseTextSize} />
        <Row label="HORA:" val={fechaCierre.toLocaleTimeString()} size={baseTextSize} />
        <Row label="CAJERO:" val={(corte.usuarioCierre?.nombre || 'ADMIN').toUpperCase()} size={baseTextSize} />
      </div>

      {/* A. RESUMEN */}
      <SectionTitle title="A. RESUMEN DE VENTAS" />
      <div className="mb-2">
        <Row label="VENTA TOTAL (USD):" val={fmtUSD(totalVentaUSD)} bold size={baseTextSize} />
        <Row label="VENTA TOTAL (BS):" val={fmtBS(totalVentaBS)} size={baseTextSize} />
        <div className="text-right mt-1">
          <span className={`${smallText} border border-black px-1`}>TASA: {fmtBS(tasa)}</span>
        </div>
      </div>

      {/* B. ARQUEO FÍSICO */}
      <SectionTitle title="B. ARQUEO CAJA (FÍSICO)" />
      <div className="mb-2">
        <p className={`${baseTextSize} font-black underline mb-1`}>DÓLARES FÍSICOS ($)</p>
        <Row label="FONDO DE CAJA:" val={fmtUSD(tesoreria.usd.inicial)} size={baseTextSize} />
        <Row label="(+) EFECTIVO ENTRADA:" val={fmtUSD(tesoreria.usd.entradas || tesoreria.usd.recibido)} size={baseTextSize} />
        <Row label="(-) VUELTOS SALIDA:" val={`-${fmtUSD(tesoreria.usd.salidas || tesoreria.usd.vueltos)}`} size={baseTextSize} />
        {gastosUSD > 0 && <Row label="(-) GASTOS CAJA:" val={`-${fmtUSD(gastosUSD)}`} size={baseTextSize} />}
        <div className="border-t border-black mt-1 pt-1">
          {/* FÓRMULA CORREGIDA: Inicial + Entradas - Salidas(Vueltos) - Gastos */}
          <Row
            label="TOTAL EN GAVETA:"
            val={fmtUSD((tesoreria.usd.inicial || 0) + (tesoreria.usd.entradas || 0) - (tesoreria.usd.salidas || 0) - gastosUSD)}
            bold size={baseTextSize}
          />
        </div>
      </div>
      <div className="mb-2 mt-3">
        <p className={`${baseTextSize} font-black underline mb-1`}>BOLÍVARES FÍSICOS (Bs)</p>
        <Row label="FONDO DE CAJA:" val={fmtBS(tesoreria.bs.inicial)} size={baseTextSize} />
        <Row label="(+) EFECTIVO ENTRADA:" val={fmtBS(tesoreria.bs.entradas || tesoreria.bs.recibido)} size={baseTextSize} />
        <Row label="(-) VUELTOS SALIDA:" val={`-${fmtBS(tesoreria.bs.salidas || tesoreria.bs.vueltos)}`} size={baseTextSize} />
        {gastosBS > 0 && <Row label="(-) GASTOS CAJA:" val={`-${fmtBS(gastosBS)}`} size={baseTextSize} />}
        <div className="border-t border-black mt-1 pt-1">
          {/* FÓRMULA CORREGIDA: Inicial + Entradas - Salidas(Vueltos) - Gastos */}
          <Row
            label="TOTAL EN GAVETA:"
            val={fmtBS((tesoreria.bs.inicial || 0) + (tesoreria.bs.entradas || 0) - (tesoreria.bs.salidas || 0) - gastosBS)}
            bold size={baseTextSize}
          />
        </div>
      </div>

      {/* C. BANCOS */}
      <SectionTitle title="C. BANCOS / DIGITAL" />
      <div className="mb-2">
        <Row label="DIGITAL USD (ZELLE/BIN):" val={fmtUSD(bancos.usd.total)} size={baseTextSize} />
        <Row label="DIGITAL BS (PM/PUNTO):" val={fmtBS(bancos.bs.total)} size={baseTextSize} />
      </div>

      {/* E. CRÉDITOS (NUEVO) */}
      {(corte.ventasCredito > 0) && (
        <>
          <SectionTitle title="E. CRÉDITOS OTORGADOS" />
          <div className="mb-2">
            <Row label="CUENTAS POR COBRAR:" val={fmtUSD(corte.ventasCredito)} bold size={baseTextSize} />
            <p className={`${smallText} italic text-center text-black/60`}>* No ingresa a caja (Venta Fiada)</p>
          </div>
        </>
      )}

      {/* F. GASTOS Y CONSUMOS (NUEVO) */}
      <SectionTitle title="F. GASTOS Y CONSUMOS" />
      <div className="mb-2">
        <Row label="GASTOS CAJA (DINERO):" val={fmtUSD(corte.totalGastosCaja || 0)} size={baseTextSize} />
        <Row label="CONSUMO INTERNO (COSTO):" val={fmtUSD(corte.totalConsumoInterno || 0)} size={baseTextSize} />
        <p className={`${smallText} italic text-center text-black/60`}>* Ajuste aplicado a Caja y Stock resp.</p>
      </div>

      {/* D. DESGLOSE FISCAL (NUEVO) */}
      <SectionTitle title="D. INFORMACIÓN FISCAL" />
      <div className="mb-2">
        <Row label="VENTAS EXENTAS (E):" val={fmtUSD(fiscal.ventasExentas)} size={baseTextSize} />
        <Row label="BASE IMPONIBLE (G):" val={fmtUSD(fiscal.baseImponible)} size={baseTextSize} />
        <Row label="ALÍCUOTA IVA (16%):" val={fmtUSD(fiscal.iva)} size={baseTextSize} />
        <Row label="IGTF (3%):" val={fmtUSD(fiscal.igtf)} size={baseTextSize} />

        <Divider />
        <Divider />
        <Row label="TOTAL OPERACIÓN:" val={fmtUSD(safeNum(fiscal.baseImponible) + safeNum(fiscal.iva) + safeNum(fiscal.igtf) + safeNum(fiscal.ventasExentas))} bold size={baseTextSize} />
      </div>

      <div className="border border-black p-2 mt-4 text-center">
        <p className={`${smallText} font-bold uppercase mb-1`}>RANGO DE FACTURACIÓN</p>
        <div className={`flex justify-between font-mono ${smallText}`}>
          <span>DESDE: {rango.desde}</span>
          <span>HASTA: {rango.hasta}</span>
        </div>
      </div>

      <div className={`mb-6 mt-4 ${smallText}`}>
        <p className="font-bold mb-1">AUDITORÍA SEGURIDAD:</p>
        <Row label="TRANSACCIONES:" val={numTransacciones} size={smallText} />
        <Row label="ANULACIONES:" val={safeNum(auditoria.ventasAnuladas)} size={smallText} />
      </div>

      <div className="text-center mt-6">
        <p className={`font-black uppercase ${baseTextSize}`}>*** FIN DEL REPORTE ***</p>
        <p className={`${smallText} font-mono break-all`}>{String(corte.id || '').slice(-10)}</p>
      </div>
    </div>
  );
});