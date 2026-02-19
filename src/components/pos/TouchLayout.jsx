import React, { useRef, useEffect, Suspense, lazy } from 'react';
import {
    Trash2, Plus, Minus, Search, ShoppingCart,
    Package, LayoutGrid, CheckCircle2, ChevronRight, Clock, HelpCircle
} from 'lucide-react';

import Swal from 'sweetalert2';

// --- SUBCOMPONENTES ---
// 🚀 Lazy load heavy modals
const ModalPago = lazy(() => import('../ModalPago'));
import ModalPesaje from '../ModalPesaje';
import ModalJerarquia from '../ModalJerarquia';
import ModalEspera from './ModalEspera'; // Ajustar ruta si es necesario
import Ticket from '../Ticket';
import TicketSaldoFavor from '../TicketSaldoFavor';
import WelcomeScreen from './WelcomeScreen';


const TouchCategoryPills = ({ categorias, categoriaActiva, setCategoriaActiva }) => {
    return (
        <div className="flex gap-3 overflow-x-auto pb-4 pt-2 px-4 no-scrollbar">
            {categorias.map(cat => (
                <button
                    key={cat}
                    onClick={() => setCategoriaActiva(cat)}
                    className={`
            px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-all active:scale-95 shadow-sm
            ${categoriaActiva === cat
                            ? 'bg-blue-600 text-white shadow-blue-200'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}
          `}
                >
                    {cat}
                </button>
            ))}
        </div>
    );
};

const TouchProductCard = ({ producto, onSelect, tasa }) => {
    const precioUSD = parseFloat(producto.precio) || 0;
    const precioBS = precioUSD * tasa;
    const hasStock = producto.stock > 0 || producto.tipoUnidad === 'servicio';

    return (
        <button
            onClick={() => onSelect(producto)}
            className={`
        bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between
        h-40 relative group transition-all active:scale-95 text-left
        ${!hasStock ? 'opacity-60 grayscale' : 'hover:border-blue-400 hover:shadow-md'}
      `}
        >
            <div className="absolute top-3 right-3 text-slate-300 group-hover:text-blue-500">
                <Package size={20} />
            </div>

            <div>
                <h4 className="font-bold text-slate-800 leading-tight line-clamp-2 h-10 text-sm">
                    {producto.nombre}
                </h4>
                <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">
                    {producto.codigo}
                </p>
            </div>

            <div className="mt-2">
                <div className="text-xl font-black text-slate-900 font-numbers">
                    ${precioUSD.toFixed(2)}
                </div>
                <div className="text-xs font-bold text-slate-500 font-numbers">
                    Bs {Math.round(precioBS).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </div>

            {!hasStock && (
                <div className="absolute inset-x-0 bottom-0 bg-red-100 text-red-600 text-[10px] font-bold text-center py-1 rounded-b-2xl">
                    AGOTADO
                </div>
            )}
        </button>
    );
};

const TouchTicketItem = ({ item, idx, onAdd, onSub, onRemove, tasa }) => {
    const totalItem = item.precio * item.cantidad;

    return (
        <div className="bg-white rounded-xl p-3 mb-3 border border-slate-100 shadow-sm flex items-center gap-3">
            {/* INFO */}
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-800 text-sm truncate">{item.nombre}</h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                        ${item.precio.toFixed(2)}
                    </span>
                    {item.tipoUnidad === 'peso' && (
                        <span className="text-[10px] text-orange-500 font-bold">KG</span>
                    )}
                </div>
            </div>

            {/* CONTROLS */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => onSub(idx, item.cantidad - 1)}
                    className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center active:bg-slate-200 active:scale-95 transition-all"
                >
                    <Minus size={20} />
                </button>

                <div className="w-10 text-center">
                    <span className="text-lg font-black text-slate-900 font-numbers">
                        {item.cantidad}
                    </span>
                </div>

                <button
                    onClick={() => onAdd(idx, item.cantidad + 1)}
                    className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center active:bg-blue-200 active:scale-95 transition-all"
                >
                    <Plus size={20} />
                </button>
            </div>

            {/* DELETE */}
            <button
                onClick={() => onRemove(idx)}
                className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center ml-1 active:bg-red-100 active:scale-95 transition-all"
            >
                <Trash2 size={18} />
            </button>
        </div>
    );
};

export default function TouchLayout({
    cajaAbierta,
    modales,
    setModales,
    actions,
    ventaExitosa, // ✅ Prop añadida
    ticketData,   // ✅ Prop añadida
    busqueda,
    setBusqueda,
    categoriaActiva,
    setCategoriaActiva,
    categorias,
    carrito,
    isProcessing,
    filtrados,
    calculos,
    finalizarVenta,
    agregarAlCarrito,
    handleRecuperarTicket, // Necesario para modal espera
    ticketsEspera,          // Necesario para modal espera
    eliminarTicketEspera,    // Necesario para modal espera
    ticketRef,
    ticketSaldoRef,
    clientePreseleccionado, // 🆕
    onAbrir, // 🆕 Para abrir caja
    tasaReferencia, // 🆕
    multiplicadorPendiente, // 🆕
    handlePrintSaldo, // 🆕
    onCloseSuccess, // 🆕
    tasaInvalida,
    tasaStale,
    onRefreshTasa,
    handlers,
    children
}) {
    const {
        cerrarPago, cerrarEspera, cerrarPesaje, cerrarJerarquia, toggleAyuda,
        abrirEspera, abrirPago // ✅ Added openers
    } = handlers || {};

    const scrollRef = useRef(null);

    // Auto-scroll al final del ticket al agregar
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [carrito.length]);

    if (!cajaAbierta) {
        return <WelcomeScreen onAbrir={onAbrir} />;
    }

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden font-sans touch-mode">

            <div style={{ display: 'none' }}>
                {Ticket ? <Ticket ref={ticketRef} data={ticketData} /> : null}
                {TicketSaldoFavor ? <TicketSaldoFavor ref={ticketSaldoRef} data={ticketData} /> : null}
            </div>

            {ventaExitosa && (
                <div className="fixed inset-0 z-[100] bg-surface-dark/90 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="relative flex flex-col items-center">
                        {/* Logo Flotante */}
                        <img
                            src="logo_success.png?v=2"
                            alt="LISTO POS"
                            className="h-48 w-auto relative z-10 drop-shadow-2xl object-contain"
                        />

                        {/* Texto de Impacto */}
                        <div className="mt-8 flex flex-col items-center z-10">
                            <h2 className="text-5xl font-black text-content-inverse tracking-tighter text-center">
                                VENTA <span className="text-status-success">EXITOSA</span>
                            </h2>
                            <p className="text-content-secondary mt-2 font-mono">
                                TICKET #{ticketData?.numeroFactura || 'PROCESANDO'}
                            </p>

                            {/* 🖨️ BOTONES DE ACCIÓN FINAL (TOUCH OPTIMIZED) */}
                            <div className="flex gap-4 mt-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
                                {/* Estado de Cuenta */}
                                {(ticketData?.vueltoCredito || (ticketData?.deudaPendiente > 0)) && (
                                    <button
                                        onClick={handlePrintSaldo}
                                        className="bg-white hover:bg-slate-50 text-slate-800 font-bold py-4 px-8 rounded-2xl shadow-lg border-2 border-slate-200 flex items-center gap-2 transition-transform active:scale-95"
                                    >
                                        <Clock size={24} className="text-blue-600" />
                                        <span>SALDO</span>
                                    </button>
                                )}

                                {/* Botón de Cierre */}
                                <button
                                    onClick={onCloseSuccess}
                                    className="bg-primary hover:bg-primary-hover text-white font-black py-4 px-10 rounded-2xl shadow-lg shadow-primary/30 flex items-center gap-2 transition-transform active:scale-95 text-xl"
                                >
                                    LISTO
                                    <CheckCircle2 size={24} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODALES --- */}
            {/* --- MODALES --- */}
            {cajaAbierta && (
                <Suspense fallback={<div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
                    {modales.pesaje && <ModalPesaje producto={modales.pesaje} tasa={calculos.tasa} onConfirm={(d) => { agregarAlCarrito(modales.pesaje, d.peso, 'peso', d.precioTotal / d.peso); cerrarPesaje(); }} onClose={cerrarPesaje} />}
                    {modales.jerarquia && <ModalJerarquia producto={modales.jerarquia} onSelect={(f) => { agregarAlCarrito(modales.jerarquia, 1, f, modales.jerarquia.jerarquia[f].precio); cerrarJerarquia(); }} onClose={cerrarJerarquia} />}
                    {modales.pago && <ModalPago totalUSD={calculos.totalUSD} totalBS={calculos.totalBS} tasa={calculos.tasa} onPagar={finalizarVenta} initialClient={clientePreseleccionado} isTouch={true} onClose={cerrarPago} />}
                    {modales.espera && <ModalEspera tickets={ticketsEspera} onRecuperar={handleRecuperarTicket} onEliminar={eliminarTicketEspera} onClose={cerrarEspera} />}
                </Suspense>
            )}

            {/* === COLUMNA IZQUIERDA: TICKET (40%) === */}
            <div className="w-[40%] flex flex-col bg-white border-r border-slate-200 h-full shadow-xl z-20">
                {/* HEADER TICKET */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <ShoppingCart className="text-blue-600" /> Ticket Actual
                    </h2>
                    <button
                        onClick={actions.limpiar}
                        className="p-3 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                        disabled={carrito.length === 0}
                    >
                        <Trash2 size={24} />
                    </button>
                </div>

                {/* LISTA ITEMS */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30" ref={scrollRef}>
                    {carrito.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60">
                            <ShoppingCart size={64} />
                            <p className="mt-4 font-bold text-lg">Cesta Vacía</p>
                            <p className="text-sm">Toque productos para agregar</p>
                        </div>
                    ) : (
                        carrito.map((item, i) => (
                            <TouchTicketItem
                                key={`${item.id}-${i}`}
                                item={item}
                                idx={i}
                                onAdd={actions.cambiarCant}
                                onSub={actions.cambiarCant}
                                onRemove={actions.eliminarItem}
                                tasa={calculos.tasa}
                            />
                        ))
                    )}
                </div>

                {/* TOTALES & COBRAR */}
                <div className="p-5 border-t border-slate-200 bg-white">
                    <div className="flex justify-between items-end mb-4">
                        <div className="text-right flex-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total a Pagar</p>
                            <div className="text-4xl font-extrabold text-slate-900 font-numbers tracking-tight line-height-1">
                                ${calculos.totalUSD.toFixed(2)}
                            </div>
                            <p className="text-sm font-bold text-slate-500 font-numbers">
                                Bs {Math.round(calculos.totalBS).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    {/* ⚠️ P3: STALE RATE WARNING BANNER */}
                    {tasaStale && !tasaInvalida && (
                        <div className="mb-3 bg-amber-50 text-amber-700 px-4 py-2 rounded-2xl border border-amber-200 flex items-center justify-between text-xs font-bold">
                            <span>⚠️ Tasa &gt; 24h sin actualizar</span>
                            <button onClick={onRefreshTasa} className="underline">Actualizar</button>
                        </div>
                    )}

                    {/* 🚫 WARNING BANNER */}
                    {tasaInvalida && (
                        <div className="mb-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-2xl flex items-center gap-3 animate-pulse">
                            <span className="text-2xl">⚠️</span>
                            <p className="text-xs font-bold leading-tight">Configura la Tasa de Cambio para vender.</p>
                        </div>
                    )}

                    <button
                        onClick={actions.cobrar}
                        disabled={carrito.length === 0 || isProcessing || tasaInvalida}
                        className={`
                    w-full py-5 rounded-2xl text-xl font-black text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3
                    ${tasaInvalida
                                ? 'bg-red-400 cursor-not-allowed opacity-60' // Red disabled state
                                : carrito.length > 0 && !isProcessing
                                    ? 'bg-blue-600 shadow-blue-600/30 hover:bg-blue-700'
                                    : 'bg-slate-300 cursor-not-allowed'}
                `}
                    >
                        {tasaInvalida ? <div className="flex flex-col items-center leading-none"><span className="text-sm">BLOQUEADO</span><span className="text-[10px] opacity-80 font-normal">Tasa = 0</span></div> : <><CheckCircle2 size={28} /> COBRAR ORDEN</>}
                    </button>
                </div>
            </div>


            {/* === COLUMNA DERECHA: CATÁLOGO (60%) === */}
            <div className="w-[60%] flex flex-col h-full bg-slate-50/50 relative">

                {/* 🆕 BANNER MULTIPLICADOR */}
                {multiplicadorPendiente > 1 && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-2 rounded-full text-sm font-black shadow-xl animate-bounce z-50 ring-2 ring-white border-2 border-primary-light">
                        MODO MULTIPLICADOR: x{multiplicadorPendiente}
                    </div>
                )}

                {/* HEADER CATÁLOGO */}
                <div className="p-4 pb-0">
                    {/* BUSCADOR SIMPLE y PILLS */}
                    <div className="flex gap-4 mb-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                            <input
                                type="text"
                                placeholder="Buscar producto..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full !pl-16 pr-4 py-4 rounded-2xl border border-slate-200 shadow-sm text-lg font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-100"
                            />
                            {/* TASA INDICATOR */}
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-40">
                                <span className="text-[10px] font-black uppercase">REF:</span>
                                <span className="text-xs font-mono font-bold">{calculos.tasa.toFixed(2)}</span>
                            </div>
                        </div>
                        <button
                            onClick={toggleAyuda}
                            className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center active:scale-95 transition-all"
                            title="Ver Atajos de Teclado"
                        >
                            <HelpCircle size={24} />
                        </button>
                        <button
                            onClick={abrirEspera}
                            className={`p-4 rounded-2xl font-bold flex items-center gap-2 active:scale-95 transition-all
                                ${ticketsEspera.length > 0 ? 'bg-orange-100 text-orange-600 ring-2 ring-orange-200 animate-pulse' : 'bg-white text-slate-400 border border-slate-200'}
                            `}
                        >
                            <Clock size={24} /> {ticketsEspera.length > 0 && ticketsEspera.length}
                        </button>
                    </div>

                    <TouchCategoryPills
                        categorias={categorias}
                        categoriaActiva={categoriaActiva}
                        setCategoriaActiva={setCategoriaActiva}
                    />
                </div>

                {/* GRID PRODUCTOS */}
                <div className="flex-1 overflow-y-auto p-4 pt-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-20">
                        {filtrados.map(prod => (
                            <TouchProductCard
                                key={prod.id}
                                producto={prod}
                                onSelect={actions.prepararAgregar}
                                tasa={calculos.tasa}
                            />
                        ))}
                    </div>
                </div>
            </div>
            {children}
        </div>
    );
}
