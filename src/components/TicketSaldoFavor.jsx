import React from 'react';
import { useStore } from '../context/StoreContext';

const TicketSaldoFavor = React.forwardRef(({ data, configOverride }, ref) => {
    const store = useStore();
    const configuracionGlobal = store?.configuracion || {};

    // Fusión de configuración
    const configuracion = { ...configuracionGlobal, ...configOverride };

    // 🎨 ACTIVOS CORPORATIVOS
    const {
        ticketAncho = '80mm',
        ticketMarginX = 3,
        ticketMarginY = 1,
        ticketFontFamily = 'modern',
        ticketFontSize = 14.5,
        nombreNegocio = 'Mi Negocio'
    } = configuracion;

    const { cliente, idVenta, fecha } = data || {};

    if (!data) return <div ref={ref}></div>;

    const fontMap = {
        'classic': "'Courier New', Courier, monospace",
        'modern': "system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif",
        'condensed': "'Arial Narrow', 'Roboto Condensed', sans-serif-condensed, sans-serif"
    };

    const isFavor = data.vueltoCredito;
    const isDeuda = !isFavor && (data.deudaPendiente > 0);

    if (!isFavor && !isDeuda) return <div ref={ref}></div>;

    const monto = isFavor ? (Number(data.montoVueltoDigital) || 0) : (Number(data.deudaPendiente) || 0);

    // Configuración por tipo
    const titulo = isFavor ? 'SALDO A FAVOR' : 'ESTADO DE CUENTA';
    const subtitulo = isFavor ? 'VALE DE CLIENTE' : 'REPORTE DE DEUDA';
    const mensajeAdvertencia = isFavor
        ? '⚠️ Sin este ticket físico NO se procesará el canje ni se entregará dinero.'
        : '⚠️ Por favor cancele su deuda lo más pronto posible para seguir disfrutando del crédito.';

    return (
        <div
            ref={ref}
            className="bg-white text-black relative overflow-hidden print:shadow-none antialiased mx-auto"
            style={{
                width: ticketAncho,
                paddingLeft: `${ticketMarginX}mm`,
                paddingRight: `${ticketMarginX}mm`,
                paddingTop: `${ticketMarginY}mm`,
                paddingBottom: '20px',
                fontFamily: fontMap[ticketFontFamily] || fontMap['modern'],
                fontSize: `${ticketFontSize}px`,
                lineHeight: 1.2
            }}
        >
            {/* HEADER */}
            <div className="text-center mb-4 pb-2 border-b-2 border-dashed border-black">
                <h2 className="text-[1.1em] font-bold uppercase leading-none mb-1">{nombreNegocio}</h2>
                <p className="text-[0.8em] font-medium">{titulo}</p>
            </div>

            {/* INFO */}
            <div className="mb-4">
                <p className="text-[0.9em]">Fecha: {new Date(fecha).toLocaleDateString()} {new Date(fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <p className="text-[0.9em]">Ref Origen: #{idVenta}</p>
                <div className="mt-2 border border-black p-2 rounded">
                    <p className="text-[0.8em] uppercase font-bold text-gray-500">CLIENTE</p>
                    <p className="font-black text-[1.1em] uppercase">{cliente?.nombre || 'CLIENTE GENERAL'}</p>
                    <p className="text-[0.9em]">CI/RIF: {cliente?.cedula || cliente?.documento || cliente?.rif || 'N/A'}</p>
                </div>
            </div>

            {/* MONTO BIG */}
            <div className={`text-center py-4 border-y-2 border-black my-4 ${isDeuda ? 'bg-gray-100' : ''}`}>
                <p className="text-[0.9em] font-bold uppercase mb-1">{subtitulo}</p>
                <p className="text-[2em] font-black leading-none">${monto.toFixed(2)}</p>
                <p className="text-[0.8em] italic mt-1">
                    (Bs {(monto * (configuracion.tasa || 1)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                </p>
            </div>

            {/* LEGAL WARNING */}
            <div className="mt-4 text-justify px-1">
                <p className="font-black uppercase text-center mb-2" style={{ fontSize: '0.85em' }}>⚠️ NOTA IMPORTANTE ⚠️</p>
                <p className="text-[0.8em] font-bold text-center border-2 border-black p-2 rounded">
                    {mensajeAdvertencia}
                </p>
                {isFavor && (
                    <ul className="list-disc pl-4 space-y-1 mt-2" style={{ fontSize: '0.8em' }}>
                        <li>Este saldo es válido únicamente para cambio por mercancía o efectivo en este establecimiento.</li>
                        <li>No reembolsable en caso de pérdida o deterioro legible.</li>
                    </ul>
                )}
            </div>

            {/* FOOTER */}
            <div className="mt-6 text-center pt-2 border-t border-dashed border-black">
                <p className="font-mono text-[0.8em]">Firma Conforme</p>
                <div className="h-8"></div>
                <p className="font-bold text-[0.7em] uppercase">Sistema Blindado por LISTO POS</p>
            </div>
        </div>
    );
});

export default TicketSaldoFavor;
