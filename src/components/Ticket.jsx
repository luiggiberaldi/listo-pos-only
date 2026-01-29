// ✅ SYSTEM IMPLEMENTATION - V. 3.8 (FACTORY DEFAULTS: MODERN)
// Archivo: src/components/Ticket.jsx
// Autorizado por Auditor en Fase 4 (Visual Standard)
// Rastro: Defaults ajustados a la especificación visual 'Moderna'.

import React from 'react';
import { useStore } from '../context/StoreContext';

const Ticket = React.forwardRef(({ data, configOverride }, ref) => {
  const store = useStore();
  const configuracionGlobal = store?.configuracion || {};
  const clientesLista = store?.clientes || [];

  // Fusión de configuración
  const configuracion = { ...configuracionGlobal, ...configOverride };

  // 🎨 ACTIVOS CORPORATIVOS
  const CORPORATE_LOGO = 'logocabeceraticket.png';
  const CORPORATE_WATERMARK = 'logomarcadeagua.png';

  if (!data) return <div ref={ref}></div>;

  // Extracción de datos
  const items = Array.isArray(data.items) ? data.items : [];
  const total = Number(data.total) || 0;
  const subtotal = Number(data.subtotal) || 0;
  const impuesto = Number(data.totalImpuesto) || 0;

  const tasaVenta = Number(data.tasa) || Number(configuracion.tasa) || 1;
  const totalBS = Number(data.totalBS) || (total * tasaVenta);
  const ivaPorcentaje = data.ivaPorcentaje || configuracion.porcentajeIva || 16;
  const fecha = data.fecha || new Date().toISOString();
  const idVenta = data.idVenta || data.id || '----';

  let cliente = data.cliente;
  if (!cliente && data.clienteId) {
    cliente = (clientesLista || []).find(c => c.id == data.clienteId);
  }

  const nombreNegocio = configuracion.nombre || 'MI NEGOCIO';
  const rifNegocio = configuracion.rif || '';
  const dirNegocio = configuracion.direccion || '';
  const telNegocio = configuracion.telefono || '';

  const {
    // 💰 CONTROL DE MONEDA
    ticketCurrencyItems = 'usd',
    ticketCurrencyTotals = 'both',
    ticketMostrarTasa = true,

    ticketMostrarLogo = true,
    ticketDireccion = true,
    ticketRif = true,
    ticketHeaderMsg = '',
    ticketImpuestos = true,
    ticketCliente = true,
    ticketFooterMsg,
    ticketAncho = '80mm',
    ticketMostrarVendedor = true,

    // 📐 ESTILOS VISUALES (DEFAULTS DE FÁBRICA ACTUALIZADOS)
    ticketLogoWidth = 70,          // 70%
    ticketLogoContrast = 1.9,      // 1.9

    ticketWatermarkSize = 80,      // 80%
    ticketWatermarkOpacity = 0.1,  // 0.1
    ticketWatermarkY = 50,         // 50px (Bajada)

    ticketFontFamily = 'modern',   // MODERNA
    ticketFontSize = 14.5,         // 14.5px
    ticketLineHeight = 1.1,        // 1.1x
    ticketFontWeight = 'normal',

    ticketMarginX = 3,             // 3mm
    ticketMarginY = 1,             // 1mm
    ticketFeedCut = 30,            // 30px
    ticketSeparatorStyle = 'dashed',
    ticketTextOpacity = 1.0,
    ticketMostrarIGTF = false      // 🆕 IGTF Config
  } = configuracion;

  // ⚖️ LÓGICA DE CUMPLIMIENTO LEGAL
  const MENSAJE_LEGAL = 'DOCUMENTO NO VÁLIDO COMO FACTURA FISCAL';
  const MENSAJE_VIEJO = 'Conserve su factura para reclamos';

  let finalFooterMsg = ticketFooterMsg;
  if (!finalFooterMsg || finalFooterMsg.trim() === MENSAJE_VIEJO || finalFooterMsg.trim() === '') {
    finalFooterMsg = MENSAJE_LEGAL;
  }

  const finalLogo = configuracion.ticketLogoUrl || CORPORATE_LOGO;
  const finalWatermark = configuracion.ticketWatermarkUrl || CORPORATE_WATERMARK;

  // 🧮 MOTOR DE FORMATEO DE PRECIOS
  const renderPrice = (amountUSD, mode) => {
    const valUSD = Number(amountUSD) || 0;
    const valBS = valUSD * tasaVenta;

    const txtUSD = `$${valUSD.toFixed(2)}`;
    const txtBS = `Bs ${valBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (mode === 'bs') return <span>{txtBS}</span>;
    if (mode === 'both') {
      return (
        <div className="flex flex-col items-end leading-tight">
          <span>{txtUSD}</span>
          <span className="text-[0.85em] opacity-80">{txtBS}</span>
        </div>
      );
    }
    return <span>{txtUSD}</span>;
  };

  const fmtMoney = (amountUSD) => `$${(amountUSD || 0).toFixed(2)}`;

  const fontMap = {
    'classic': "'Courier New', Courier, monospace",
    'modern': "system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif",
    'condensed': "'Arial Narrow', 'Roboto Condensed', sans-serif-condensed, sans-serif"
  };

  const borderMap = {
    'dashed': '1px dashed black',
    'dotted': '2px dotted black',
    'solid': '1px solid black',
    'double': '3px double black'
  };

  return (
    <div
      ref={ref}
      className="bg-white text-black relative overflow-hidden print:shadow-none antialiased mx-auto"
      style={{
        width: ticketAncho,
        paddingLeft: `${ticketMarginX}mm`,
        paddingRight: `${ticketMarginX}mm`,
        paddingTop: `${ticketMarginY}mm`,
        paddingBottom: `${ticketFeedCut}px`,
        fontFamily: fontMap[ticketFontFamily] || fontMap['modern'],
        fontSize: `${ticketFontSize}px`,
        lineHeight: ticketLineHeight,
        fontWeight: ticketFontWeight,
        color: `rgba(0,0,0,${ticketTextOpacity})`
      }}
    >
      {/* 🌊 CAPA MARCA DE AGUA */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
        style={{ overflow: 'hidden' }}
      >
        {data.status === 'ANULADA' ? (
          <div style={{
            transform: 'rotate(-45deg)',
            fontSize: '25pt',
            fontWeight: '900',
            color: '#000',
            opacity: 0.15,
            border: '3px solid #000',
            padding: '5px 20px',
            borderRadius: '10px',
            letterSpacing: '5px'
          }}>
            ANULADA
          </div>
        ) : (
          <img
            src={finalWatermark}
            alt="Marca de Agua"
            style={{
              width: `${ticketWatermarkSize}%`,
              opacity: ticketWatermarkOpacity,
              transform: `translateY(${ticketWatermarkY}px)`,
              filter: 'grayscale(100%)',
              display: 'block'
            }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
      </div>

      {/* 📝 CAPA CONTENIDO */}
      <div className="relative z-10">

        {/* CABECERA */}
        <div className="text-center mb-2 pb-2" style={{ borderBottom: borderMap[ticketSeparatorStyle] }}>
          {ticketMostrarLogo ? (
            <img
              src={finalLogo}
              alt="Logo"
              className="mx-auto mb-2 grayscale block object-contain"
              style={{ width: `${ticketLogoWidth}%`, filter: `contrast(${ticketLogoContrast}) grayscale(100%)` }}
              onError={(e) => e.target.style.display = 'none'}
            />
          ) : (
            <div className="mb-2 font-black text-xl border-2 border-black inline-block p-1 px-2 rounded">
              {nombreNegocio[0] || 'L'}
            </div>
          )}

          <h2 className="text-[1.3em] font-bold uppercase leading-none mb-1">{nombreNegocio}</h2>

          <div style={{ fontSize: '0.9em' }}>
            {ticketRif && <p className="leading-tight">RIF: {rifNegocio}</p>}
            {ticketDireccion && <p className="leading-tight px-2 my-1">{dirNegocio}</p>}
            <p className="leading-tight">Tel: {telNegocio}</p>
          </div>

          {ticketHeaderMsg && (
            <p className="mt-2 font-medium pt-1 italic whitespace-pre-line" style={{ borderTop: borderMap[ticketSeparatorStyle] }}>{ticketHeaderMsg}</p>
          )}
        </div>

        {/* INFO VENTA */}
        <div className="mb-2 pb-2" style={{ borderBottom: borderMap[ticketSeparatorStyle], fontSize: '0.9em' }}>
          <div className="flex justify-between">
            <span className="font-bold">Ticket: #{idVenta}</span>
            <span>{new Date(fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p>{new Date(fecha).toLocaleDateString()}</p>

          {ticketMostrarVendedor && (data.usuario || data.vendedor) && (
            <p className="uppercase mt-1 text-[0.9em]">Atendido por: {data.usuario?.nombre || data.vendedor}</p>
          )}

          {ticketCliente && cliente && (
            <div className="mt-2 pt-1 border-t border-dashed border-black">
              <p className="font-bold truncate uppercase">{cliente.nombre}</p>
              <p>CI/RIF: {cliente.rif || cliente.cedula || 'N/A'}</p>
            </div>
          )}
        </div>

        {/* CONTENIDO DINÁMICO: VENTA vs ABONO */}
        {data.tipo === 'COBRO_DEUDA' ? (
          <div className="my-4 border-y-2 border-dashed border-black py-4">
            <h3 className="font-black uppercase text-center text-[1.1em] mb-4">COMPROBANTE DE ABONO</h3>

            <div className="flex justify-between items-end mb-2">
              <span className="font-bold uppercase text-[0.9em]">Monto Abonado:</span>
              <span className="font-black text-[1.5em]">${Number(data.total).toFixed(2)}</span>
            </div>
            <div className="text-right text-[0.9em] italic mb-4">
              (Bs {(Number(data.total) * tasaVenta).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </div>

            <div className="border border-black p-2 rounded">
              {(data.deudaRestante !== undefined) && (
                <div className="flex justify-between font-bold text-[1.1em]">
                  <span>SALDO RESTANTE:</span>
                  <span>${Number(data.deudaRestante).toFixed(2)}</span>
                </div>
              )}
              {(data.favorRestante !== undefined && Number(data.favorRestante) > 0) && (
                <div className="flex justify-between font-bold text-[1.1em] mt-1">
                  <span>SALDO A FAVOR:</span>
                  <span>${Number(data.favorRestante).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          // 🟩 OPCIÓN B: TICKET DE VENTA (TABLA + TOTALES)
          <>
            {/* TABLA PRODUCTOS */}
            <div className="mb-2">
              <table className="w-full text-left table-fixed">
                <thead>
                  <tr style={{ borderBottom: borderMap[ticketSeparatorStyle] }}>
                    <th className="py-1 w-[20%] font-bold">Cant.</th>
                    <th className="py-1 w-[50%] font-bold">Descrip.</th>
                    <th className="py-1 w-[30%] text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    let prefijo = '';
                    let cantidadVisual = item.cantidad;
                    if (item.tipoUnidad === 'peso') { prefijo = 'Kg'; cantidadVisual = item.cantidad?.toFixed(3); }

                    const precioFinal = item.importe || (item.precio * item.cantidad);

                    return (
                      <tr key={index}>
                        <td className="py-1 align-top whitespace-nowrap pr-1 font-normal">{cantidadVisual}{prefijo}</td>
                        <td className="py-1 align-top leading-tight font-normal truncate">{item.nombre}</td>
                        <td className="py-1 align-top text-right font-normal">
                          {renderPrice(precioFinal, ticketCurrencyItems)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* TOTALES */}
            <div className="pt-2 space-y-1" style={{ borderTop: borderMap[ticketSeparatorStyle] }}>
              {ticketImpuestos && (
                <>
                  <div className="flex justify-between" style={{ fontSize: '0.9em' }}><span>Subtotal:</span>{renderPrice(subtotal, ticketCurrencyItems)}</div>
                  {impuesto > 0 && (<div className="flex justify-between" style={{ fontSize: '0.9em' }}><span>IVA ({ivaPorcentaje}%):</span>{renderPrice(impuesto, ticketCurrencyItems)}</div>)}

                  {/* 🆕 IGTF LINE (Enhanced) */}
                  {(() => {
                    const igtfActivo = configuracion.igtfActivo || ticketMostrarIGTF;
                    let igtfDisplay = igtfActivo ? (Number(data.igtfTotal) || 0) : 0;

                    if (igtfDisplay === 0 && igtfActivo && Array.isArray(data.pagos)) {
                      const pagosDivisa = data.pagos.filter(p => {
                        const m = (p.metodo || p.nombre || '').toLowerCase();
                        return m.includes('efectivo') && (p.currency === 'USD' || m.includes('divisa'));
                      });
                      if (pagosDivisa.length > 0) {
                        igtfDisplay = pagosDivisa.reduce((acc, p) => acc + (Number(p.monto || p.amount || 0)), 0) * ((configuracion.igtfTasa || 3) / 100);
                      }
                    }

                    if (igtfActivo && igtfDisplay > 0) {
                      return (
                        <div className="flex justify-between font-bold" style={{ fontSize: '0.9em' }}>
                          <span>IGTF ({configuracion.igtfTasa || 3}%):</span>
                          {renderPrice(igtfDisplay, ticketCurrencyItems)}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div className="my-1" style={{ borderTop: borderMap[ticketSeparatorStyle] }}></div>
                </>
              )}
            </div>

            {/* GRAN TOTAL + PAGOS (Solo para Ventas) */}
            <div className="mt-2 pt-2 border-t-2 border-black space-y-1">
              {(() => {
                const igtfVal = Number(data.igtfTotal) || 0;
                const safeTotal = (Number(data.subtotal) || 0) + (Number(data.totalImpuesto) || 0) + igtfVal;
                // Use stored total if close to calculated, otherwise use calculated for safety
                const displayTotal = (Math.abs((Number(data.total) || 0) - safeTotal) < 0.05) ? (Number(data.total) || 0) : safeTotal;
                const displayTotalBS = displayTotal * tasaVenta;

                return (
                  <>
                    {(ticketCurrencyTotals === 'usd' || ticketCurrencyTotals === 'both') && (
                      <div className="flex justify-between font-black text-[1.1em]"><span>TOTAL USD:</span><span>${displayTotal.toFixed(2)}</span></div>
                    )}
                    {(ticketCurrencyTotals === 'bs' || ticketCurrencyTotals === 'both') && (
                      <div className="flex justify-between font-black text-[1.2em]"><span>TOTAL BS:</span><span>Bs {displayTotalBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    )}

                    {/* CREDIT / CHANGE INFO */}
                    {data.esCredito && data.deudaPendiente > 0 && (
                      <div className="mt-2 pt-2 border-t border-dashed border-black">
                        <div className="flex justify-between font-bold text-[1.1em]"><span>PAGADO:</span><span>${(displayTotal - data.deudaPendiente).toFixed(2)}</span></div>
                        <div className="flex justify-between font-black text-[1.2em] bg-black text-white px-1"><span>RESTANTE A CRÉDITO:</span><span>${Number(data.deudaPendiente).toFixed(2)}</span></div>
                      </div>
                    )}
                    {/* VUELTO */}
                    {(() => {
                      const changeTotal = (Number(data.distribucionVuelto?.usd) || 0) + (Number(data.distribucionVuelto?.bs) / tasaVenta || 0) + (Number(data.appliedToWallet) || 0);
                      if (changeTotal > 0) return <div className="mt-2 text-right border-t border-black pt-1 font-bold">SU VUELTO: ${changeTotal.toFixed(2)}</div>;
                    })()}
                  </>
                );
              })()}
            </div>
          </>
        )}

        <div className="mt-4 text-center">
          {ticketMostrarTasa && (<div className="italic font-normal mb-2" style={{ fontSize: '0.8em' }}>Tasa BCV: {tasaVenta} Bs/$</div>)}
          <p className="font-bold whitespace-pre-line uppercase" style={{ fontSize: '0.9em', borderTop: borderMap[ticketSeparatorStyle] }}>{finalFooterMsg}</p>
          <p className="font-bold uppercase text-gray-500 mt-4" style={{ fontSize: '0.7em' }}>Sistema Blindado por LISTO POS</p>
        </div>
      </div>
    </div>

  );
});

export default Ticket;