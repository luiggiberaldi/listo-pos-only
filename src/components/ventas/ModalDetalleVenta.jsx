import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
    X, Printer, User, Calendar, Hash, DollarSign,
    CreditCard, Banknote, ShoppingBag, Receipt, CheckCircle, ArrowDown
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import Ticket from '../Ticket';

export default function ModalDetalleVenta({ venta, onClose }) {
    const { clientes, configuracion } = useStore();
    const ticketRef = useRef();

    if (!venta) return null;

    // 1. Recuperar datos del cliente
    const cliente = clientes.find(c => c.id === venta.clienteId);
    const nombreCliente = cliente ? cliente.nombre : (venta.clienteNombre || 'Consumidor Final');
    const docCliente = cliente ? (cliente.documento || cliente.cedula) : 'N/A';

    // 2. Formateadores
    const fmtMoney = (val) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);
    const fmtBs = (val) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);

    // 3. Motor de Impresión Térmica
    const handlePrint = useReactToPrint({
        contentRef: ticketRef,
        content: () => ticketRef.current,
        documentTitle: `Ticket_${venta.idVenta || 'Reimpresion'}`,
        removeAfterPrint: true,
        onPrintError: (error) => console.error("Error impresión:", error)
    });

    // 4. Lógica de Visualización de Vuelto
    const renderVuelto = () => {
        const cambioTotal = parseFloat(venta.cambio || 0);
        const monedero = parseFloat(venta.appliedToWallet || 0);
        const abonoDeuda = parseFloat(venta.appliedToDebt || 0);
        const dist = venta.distribucionVuelto || {};

        const tieneCambio = cambioTotal > 0 || monedero > 0 || abonoDeuda > 0 || dist.usd > 0 || dist.bs > 0;
        if (!tieneCambio) return null;

        return (
            <div className="mt-4 pt-4 border-t border-white/10 group relative overflow-hidden rounded-xl bg-orange-500/10 p-3 space-y-2">
                <div className="flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="bg-orange-500/20 p-1.5 rounded-lg text-orange-400">
                            <ArrowDown size={14} />
                        </div>
                        <span className="font-bold text-orange-200 text-[10px] uppercase tracking-wider">Su Vuelto Total</span>
                    </div>
                    <span className="font-black font-numbers text-xl text-orange-400">
                        ${fmtMoney(cambioTotal + monedero + abonoDeuda)}
                    </span>
                </div>

                {/* Desglose de Distribución */}
                <div className="grid grid-cols-1 gap-1 pl-8">
                    {dist.usd > 0 && (
                        <div className="flex justify-between text-[11px]">
                            <span className="text-orange-200/60 uppercase">Efectivo Divisa</span>
                            <span className="font-bold text-orange-300 font-numbers">${fmtMoney(dist.usd)}</span>
                        </div>
                    )}
                    {dist.bs > 0 && (
                        <div className="flex justify-between text-[11px]">
                            <span className="text-orange-200/60 uppercase">Efectivo Bolívares</span>
                            <span className="font-bold text-orange-300 font-numbers">Bs {fmtBs(dist.bs)}</span>
                        </div>
                    )}
                    {monedero > 0 && (
                        <div className="flex justify-between text-[11px] bg-orange-400/20 px-2 py-0.5 rounded border border-orange-400/30">
                            <span className="text-orange-100 uppercase font-black">Abonado a Monedero</span>
                            <span className="font-black text-white font-numbers">${fmtMoney(monedero)}</span>
                        </div>
                    )}
                    {abonoDeuda > 0 && (
                        <div className="flex justify-between text-[11px] bg-green-400/20 px-2 py-0.5 rounded border border-green-400/30">
                            <span className="text-green-100 uppercase font-black">Abono a Deuda</span>
                            <span className="font-black text-white font-numbers">${fmtMoney(abonoDeuda)}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-4 animate-in fade-in duration-300">

            {/* 🖨️ TICKET OCULTO */}
            <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
                <div ref={ticketRef}>
                    <Ticket data={venta} />
                </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark w-full max-w-[420px] rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/20 ring-1 ring-black/5 relative">

                {/* DECORATIVE TOP GRADIENT */}
                <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 absolute top-0 left-0 z-20"></div>

                {/* HEADER PREMIUM */}
                <div className="bg-white/80 dark:bg-slate-900/80 p-6 pb-4 border-b border-slate-100 dark:border-slate-800 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex justify-between items-start mb-2">
                        {venta.esCredito ? (
                            <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-purple-100 dark:border-purple-800">
                                Crédito Pendiente
                            </div>
                        ) : (
                            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-blue-100 dark:border-blue-800">
                                Venta Finalizada
                            </div>
                        )}
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95">
                            <X size={18} />
                        </button>
                    </div>

                    <h3 className="font-black text-slate-800 dark:text-white text-2xl tracking-tight mb-1">
                        Ticket <span className="text-slate-400">#{venta.idVenta || venta.id.toString().slice(-6)}</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                        <Calendar size={12} className={venta.esCredito ? "text-purple-500" : "text-blue-500"} />
                        {new Date(venta.fecha).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        {new Date(venta.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase()}
                    </p>
                </div>

                {/* BODY SCROLLABLE */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 bg-slate-50/80 dark:bg-[#0B1120]">

                    {/* CLIENTE CARD (Mini) */}
                    <div className="flex items-center gap-4 py-3 border-b border-dashed border-slate-200 dark:border-slate-800">
                        <div className={`w-10 h-10 rounded-xl shadow-md text-white flex items-center justify-center ${venta.esCredito ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                            <User size={18} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Cliente Registrado</p>
                            <p className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{nombreCliente}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Documento</p>
                            <p className="text-xs font-mono font-medium text-slate-600 dark:text-slate-400">{docCliente}</p>
                        </div>
                    </div>

                    {/* PRODUCTOS (Simple List) */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Receipt size={14} className="text-slate-400" />
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumen de Compra</h4>
                        </div>

                        <div className="space-y-3">
                            {venta.items?.map((item, i) => (
                                <div key={i} className="flex justify-between items-start group">
                                    <div className="flex gap-3">
                                        <div className="bg-white dark:bg-slate-800 w-6 h-6 rounded flex items-center justify-center text-[10px] font-black text-slate-500 shadow-sm border border-slate-100 dark:border-slate-700 font-mono">
                                            {item.cantidad}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-tight group-hover:text-blue-600 transition-colors">
                                                {item.nombre}
                                            </p>
                                            {item.unidadVenta && <p className="text-[9px] text-slate-400 uppercase font-medium mt-0.5">{item.unidadVenta}</p>}
                                        </div>
                                    </div>
                                    <div className="font-black font-numbers text-sm text-slate-800 dark:text-white">
                                        ${fmtMoney(item.precio * item.cantidad)}
                                    </div>
                                </div>
                            ))}

                            {/* TAX BREAKDOWN (IVA & IGTF) */}
                            {(() => {
                                const impuesto = parseFloat(venta.totalImpuesto || 0);
                                const igtfVal = parseFloat(venta.igtfTotal || 0);

                                return (
                                    <>
                                        {impuesto > 0 && (
                                            <div className="flex justify-between items-start pt-2 mt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-9">
                                                    IVA ({venta.ivaPorcentaje || 16}%)
                                                </div>
                                                <div className="font-bold font-numbers text-xs text-slate-600 dark:text-slate-400">
                                                    ${fmtMoney(impuesto)}
                                                </div>
                                            </div>
                                        )}
                                        {igtfVal > 0 && (
                                            <div className="flex justify-between items-start pt-1">
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-9">
                                                    IGTF (3%)
                                                </div>
                                                <div className="font-bold font-numbers text-xs text-slate-600 dark:text-slate-400">
                                                    ${fmtMoney(igtfVal)}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    {/* DIVIDER */}
                    <div className="my-4 border-t-2 border-dashed border-slate-200 dark:border-slate-800 relative">
                        <div className="absolute -top-1.5 left-0 w-3 h-3 bg-slate-50 dark:bg-slate-950 rounded-full -translate-x-1.5"></div>
                        <div className="absolute -top-1.5 right-0 w-3 h-3 bg-slate-50 dark:bg-slate-950 rounded-full translate-x-1.5"></div>
                    </div>

                    {/* DETALLE PAGOS */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Método de Pago</span>
                        </div>

                        <div className="grid gap-2">
                            {/* LÓGICA INTELIGENTE DE VISUALIZACIÓN DE PAGOS */}
                            {(() => {
                                // Detectar si es Crédito Total (Venta Fiada al 100%)
                                const esCreditoTotal = venta.esCredito && (parseFloat(venta.deudaPendiente || 0) >= parseFloat(venta.total || 0) * 0.99);

                                // Si es Crédito Total O no hay pagos registrados ...
                                if (esCreditoTotal || (venta.esCredito && (!venta.pagos || venta.pagos.length === 0))) {
                                    return (
                                        <div className="flex justify-between items-center bg-purple-50 dark:bg-purple-900/20 px-3 py-2.5 rounded-xl border border-purple-100 dark:border-purple-800 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                                                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase">CRÉDITO CLIENTE</span>
                                            </div>
                                            <div className="text-xs font-black font-numbers text-purple-800 dark:text-purple-200">
                                                ${fmtMoney(venta.total)}
                                                <span className="block text-[9px] font-normal text-purple-400 text-right font-mono mt-0.5">Deuda Pendiente (100%)</span>
                                            </div>
                                        </div>
                                    );
                                }

                                // Si NO es Crédito Total, mostramos los pagos reales
                                const pagosParaRender = venta.pagos || venta.payments || venta.metodos || [];

                                return pagosParaRender.map((pago, i) => {
                                    const esBs = (pago.tipo === 'BS' || pago.currency === 'VES') || ['Bs', 'Pago Móvil', 'Punto', 'Tarjeta'].some(k => (pago.metodo || '').includes(k));
                                    let montoVisual = 0;

                                    if (esBs) {
                                        if (parseFloat(pago.montoBS) > 0) montoVisual = parseFloat(pago.montoBS);
                                        else if (pago.tipo === 'BS' || pago.currency === 'VES') montoVisual = parseFloat(pago.montoOriginal || pago.monto);
                                        else montoVisual = parseFloat(pago.monto) * (venta.tasa || 1);
                                    } else {
                                        montoVisual = parseFloat(pago.montoUSD || pago.monto);
                                    }

                                    return (
                                        <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-800 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${esBs ? 'bg-purple-500' : 'bg-green-500'}`}></div>
                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">{pago.metodo || pago.nombre || 'Pago'}</span>
                                            </div>
                                            <div className="text-xs font-black font-numbers text-slate-800 dark:text-white">
                                                {esBs ? 'Bs' : '$'} {esBs ? fmtBs(montoVisual) : fmtMoney(montoVisual)}
                                                {pago.referencia && <span className="block text-[9px] font-normal text-slate-400 text-right font-mono mt-0.5">#{pago.referencia.slice(-6)}</span>}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>

                    </div>
                </div>

                {/* FOOTER TOTAL (DARK CARD) */}
                <div className="p-4 bg-slate-50/80 dark:bg-[#0B1120]">
                    <div className={`text-white p-5 rounded-3xl relative overflow-hidden shadow-xl shadow-slate-300 dark:shadow-none ${venta.esCredito ? 'bg-[#1e1b4b]' : 'bg-[#0f172a]'}`}>

                        {/* Decorative Circles */}
                        <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl ${venta.esCredito ? 'bg-purple-500/20' : 'bg-blue-500/20'}`}></div>
                        <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl ${venta.esCredito ? 'bg-indigo-500/10' : 'bg-purple-500/10'}`}></div>

                        <div className="relative z-10 flex flex-col gap-1">
                            {/* Improved Labels for clarity */}
                            <div className="flex justify-between items-end border-b border-white/10 pb-2 mb-2">
                                <span className={`font-bold text-[10px] uppercase tracking-widest ${venta.esCredito ? 'text-purple-400' : 'text-blue-400'}`}>
                                    Total Factura
                                </span>
                                <span className="text-xl font-bold font-numbers">
                                    ${fmtMoney(venta.total)}
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className={`font-bold text-[10px] uppercase tracking-widest ${venta.esCredito ? 'text-purple-400' : 'text-blue-400'}`}>
                                    {(venta.pagos?.length > 0 || !venta.esCredito) ? 'Monto Recibido' : 'Deuda Generada'}
                                </span>
                                <div className="flex items-baseline gap-1">
                                    {(() => {
                                        // 🟢 LOGICA DE RECALCULO DE TOTAL
                                        const totalOriginal = parseFloat(venta.total || 0);
                                        let igtfDisplay = parseFloat(venta.igtfTotal || 0);
                                        const subtotal = parseFloat(venta.subtotal || 0);
                                        const impuestos = parseFloat(venta.totalImpuesto || 0);
                                        const totalCalculado = subtotal + impuestos + igtfDisplay;

                                        let finalTotal = (igtfDisplay > 0 && totalOriginal < totalCalculado - 0.01)
                                            ? totalCalculado
                                            : totalOriginal;

                                        // 🚀 ADJUSTMENT: Show exact debt if credit
                                        if (venta.esCredito) {
                                            finalTotal = parseFloat(venta.deudaPendiente || finalTotal);
                                        }

                                        return (
                                            <>
                                                <span className={`text-2xl font-black select-none ${venta.esCredito ? 'text-purple-500' : 'text-blue-500'}`}>$</span>
                                                <span className="text-5xl font-black tracking-tighter font-numbers shadow-black drop-shadow-lg">
                                                    {fmtMoney(finalTotal)}
                                                </span>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className="relative z-10 mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs opacity-70">
                                <span>1 USD  = {fmtBs(venta.tasa || 1)} Bs</span>
                                <span className="font-mono">Total Bs: {fmtBs((venta.esCredito ? (venta.deudaPendiente || venta.total) : (venta.total)) * (venta.tasa || 1))}</span>
                            </div>

                            {renderVuelto()}
                        </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={handlePrint}
                            className="flex-1 py-3 text-slate-600 dark:text-slate-400 font-bold text-sm bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl hover:border-blue-200 hover:text-blue-600 transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            <Printer size={16} /> Ticket
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-slate-200 dark:shadow-none flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
