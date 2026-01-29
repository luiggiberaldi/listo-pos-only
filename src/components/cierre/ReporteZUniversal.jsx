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

export default React.forwardRef(({ corte, formato = 'ticket' }, ref) => {
  const { configuracion } = useStore();

  if (!corte) return <div ref={ref}></div>;

  const safeNum = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

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

  // Correction: The above maps to 'final' which might include carried over balance.
  // For the "B. BANCOS / DIGITAL" section, we usually want the Flow (Entradas) of this shift.
  // Let's use 'entradas' if available.

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

  // Auditoría
  const auditoria = corte.auditoria || { ventasAnuladas: 0 };
  const numTransacciones = safeNum(corte.transacciones);

  // Formateadores
  const fmtUSD = (n) => `$${safeNum(n).toFixed(2)}`;
  const fmtBS = (n) => `Bs ${safeNum(n).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;

  const Divider = () => <div className="border-b border-black border-dashed my-2 w-full"></div>;
  const SectionTitle = ({ title }) => (
    <h3 className="font-black text-sm uppercase mb-2 text-center bg-black text-white py-1 mt-4">{title}</h3>
  );

  const Row = ({ label, val, bold = false, size = 'text-xs' }) => (
    <div className={`flex justify-between ${size} ${bold ? 'font-black' : 'font-medium'} mb-1`}>
      <span>{label}</span>
      <span>{val}</span>
    </div>
  );

  return (
    <div ref={ref} className="bg-white text-black font-mono w-[80mm] p-4 mx-auto leading-tight selection:bg-none">
      <style>{PRINT_STYLES}</style>

      {/* HEADER */}
      <div className="text-center mb-4">
        <h1 className="font-black text-xl uppercase tracking-wider">{configuracion.nombreEmpresa || 'COMERCIO'}</h1>
        <p className="text-xs">{configuracion.direccion || 'Dirección Fiscal'}</p>
        <p className="text-xs font-bold">RIF: {configuracion.rif || 'J-00000000-0'}</p>
      </div>

      <div className="text-center mb-4 border-y-2 border-black py-2">
        <h2 className="text-xl font-black uppercase">REPORTE Z</h2>
        <p className="text-xs font-bold">CORTE Nº {corte.corteRef || '---'}</p>
      </div>

      <div className="mb-4 text-xs">
        <Row label="FECHA:" val={fechaCierre.toLocaleDateString()} />
        <Row label="HORA:" val={fechaCierre.toLocaleTimeString()} />
        <Row label="CAJERO:" val={(corte.usuarioCierre?.nombre || 'ADMIN').toUpperCase()} />
      </div>

      {/* A. RESUMEN */}
      <SectionTitle title="A. RESUMEN DE VENTAS" />
      <div className="mb-2">
        <Row label="VENTA TOTAL (USD):" val={fmtUSD(totalVentaUSD)} bold size="text-sm" />
        <Row label="VENTA TOTAL (BS):" val={fmtBS(totalVentaBS)} />
        <div className="text-right mt-1">
          <span className="text-[10px] border border-black px-1">TASA: {fmtBS(tasa)}</span>
        </div>
      </div>

      {/* B. ARQUEO FÍSICO */}
      <SectionTitle title="B. ARQUEO CAJA (FÍSICO)" />
      <div className="mb-2">
        <p className="text-xs font-black underline mb-1">DÓLARES FÍSICOS ($)</p>
        <Row label="FONDO DE CAJA:" val={fmtUSD(tesoreria.usd.inicial)} />
        <Row label="(+) EFECTIVO ENTRADA:" val={fmtUSD(tesoreria.usd.entradas || tesoreria.usd.recibido)} />
        <Row label="(-) VUELTOS SALIDA:" val={`-${fmtUSD(tesoreria.usd.salidas || tesoreria.usd.vueltos)}`} />
        <div className="border-t border-black mt-1 pt-1">
          <Row label="TOTAL EN GAVETA:" val={fmtUSD(tesoreria.usd.final || tesoreria.usd.total)} bold size="text-sm" />
        </div>
      </div>
      <div className="mb-2 mt-3">
        <p className="text-xs font-black underline mb-1">BOLÍVARES FÍSICOS (Bs)</p>
        {/* FIX: Mostrar Fondo en Bs */}
        <Row label="FONDO DE CAJA:" val={fmtBS(tesoreria.bs.inicial)} />
        <Row label="(+) EFECTIVO ENTRADA:" val={fmtBS(tesoreria.bs.entradas || tesoreria.bs.recibido)} />
        <Row label="(-) VUELTOS SALIDA:" val={`-${fmtBS(tesoreria.bs.salidas || tesoreria.bs.vueltos)}`} />
        <div className="border-t border-black mt-1 pt-1">
          <Row label="TOTAL EN GAVETA:" val={fmtBS(tesoreria.bs.final || tesoreria.bs.total)} bold size="text-sm" />
        </div>
      </div>

      {/* C. BANCOS */}
      <SectionTitle title="C. BANCOS / DIGITAL" />
      <div className="mb-2">
        <Row label="DIGITAL USD (ZELLE/BIN):" val={fmtUSD(bancos.usd.total)} />
        <Row label="DIGITAL BS (PM/PUNTO):" val={fmtBS(bancos.bs.total)} />
      </div>

      {/* E. CRÉDITOS (NUEVO) */}
      {(corte.ventasCredito > 0) && (
        <>
          <SectionTitle title="E. CRÉDITOS OTORGADOS" />
          <div className="mb-2">
            <Row label="CUENTAS POR COBRAR:" val={fmtUSD(corte.ventasCredito)} bold />
            <p className="text-[10px] italic text-center text-black/60">* No ingresa a caja (Venta Fiada)</p>
          </div>
        </>
      )}

      {/* D. DESGLOSE FISCAL (NUEVO) */}
      <SectionTitle title="D. INFORMACIÓN FISCAL" />
      <div className="mb-2">
        <Row label="VENTAS EXENTAS (E):" val={fmtUSD(fiscal.ventasExentas)} />
        <Row label="BASE IMPONIBLE (G):" val={fmtUSD(fiscal.baseImponible)} />
        <Row label="ALÍCUOTA IVA (16%):" val={fmtUSD(fiscal.iva)} />
        <Row label="IGTF (3%):" val={fmtUSD(fiscal.igtf)} />

        <Divider />
        <Divider />
        <Row label="TOTAL OPERACIÓN:" val={fmtUSD(safeNum(fiscal.baseImponible) + safeNum(fiscal.iva) + safeNum(fiscal.igtf))} bold />
      </div>

      <div className="border border-black p-2 mt-4 text-center">
        <p className="text-[10px] font-bold uppercase mb-1">RANGO DE FACTURACIÓN</p>
        <div className="flex justify-between text-xs font-mono">
          <span>DESDE: {rango.desde}</span>
          <span>HASTA: {rango.hasta}</span>
        </div>
      </div>

      <div className="mb-6 mt-4 text-[10px]">
        <p className="font-bold mb-1">AUDITORÍA SEGURIDAD:</p>
        <Row label="TRANSACCIONES:" val={numTransacciones} />
        <Row label="ANULACIONES:" val={safeNum(auditoria.ventasAnuladas)} />
      </div>

      <div className="text-center mt-6">
        <p className="font-black text-sm uppercase">*** FIN DEL REPORTE ***</p>
        <p className="text-[10px] font-mono break-all">{String(corte.id || '').slice(-10)}</p>
      </div>
    </div>
  );
});