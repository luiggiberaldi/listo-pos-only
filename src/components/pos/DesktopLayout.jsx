// ✅ REFACTORED - V. 6.0 (ZUSTAND DIRECT CONNECTION)
// Archivo: src/components/pos/DesktopLayout.jsx
// Antes: 40+ props passthrough. Ahora: hijos se conectan directamente a stores.

import React, { useCallback, Suspense, lazy } from 'react';
import { Trash2, Clock, HelpCircle } from 'lucide-react';
import Ticket from '../Ticket';
import TicketSaldoFavor from '../TicketSaldoFavor';

import PosHeader from './PosHeader';
import ProductGrid from './ProductGrid';
import CartSidebar from './CartSidebar';
import ModalEspera from './ModalEspera';
import WelcomeScreen from './WelcomeScreen';

// Stores
import { useCartStore } from '../../stores/useCartStore';
import { useUIStore } from '../../stores/useUIStore';
import { usePosCalcStore } from '../../stores/usePosCalcStore';
import { usePosActionsStore } from '../../stores/usePosActionsStore';
import { usePosSearchStore } from '../../stores/usePosSearchStore';
import { useConfigStore } from '../../stores/useConfigStore';
import { useTicketStore } from '../../stores/useTicketStore';
import { useCajaEstado } from '../../hooks/caja/useCajaEstado';

// Lazy load heavy modals
const ModalPago = lazy(() => import('../ModalPago'));
const ModalPesaje = lazy(() => import('../ModalPesaje'));
const ModalJerarquia = lazy(() => import('../ModalJerarquia'));

export default function DesktopLayout({
    // Only imperative refs and keyboard handlers remain as props
    searchInputRef,
    productRefs,
    ticketRef,
    ticketSaldoRef,
    handleSearchInputKeyDown,
    cartSelectedIndex,
    focusCartItem,
    children
}) {
    // 🧠 DIRECT STORE CONNECTION
    const carrito = useCartStore(s => s.carrito);
    const agregarAlCarrito = useCartStore(s => s.agregarAlCarrito);
    const limpiarCarrito = useCartStore(s => s.limpiarCarrito);

    const isProcessing = useUIStore(s => s.isProcessing);
    const activeModal = useUIStore(s => s.activeModal);
    const modalData = useUIStore(s => s.modalData);
    const closeModal = useUIStore(s => s.closeModal);

    const totalUSD = usePosCalcStore(s => s.totalUSD);
    const totalBS = usePosCalcStore(s => s.totalBS);
    const totalImpuesto = usePosCalcStore(s => s.totalImpuesto);
    const tasa = usePosCalcStore(s => s.tasa);
    const tasaInvalida = usePosCalcStore(s => s.tasaInvalida);
    const tasaStale = usePosCalcStore(s => s.tasaStale);

    const ventaExitosa = usePosActionsStore(s => s.ventaExitosa);
    const setVentaExitosa = usePosActionsStore(s => s.setVentaExitosa);
    const ticketData = usePosActionsStore(s => s.ticketData);
    const multiplicadorPendiente = usePosActionsStore(s => s.multiplicadorPendiente);

    const ticketsEspera = useTicketStore(s => s.ticketsEspera);
    const eliminarTicketEspera = useTicketStore(s => s.eliminarTicketEspera);

    const obtenerTasaBCV = useConfigStore(s => s.obtenerTasaBCV);
    const clientePreseleccionado = null; // Managed via location state in PosPage, passed if needed

    const { isCajaAbierta } = useCajaEstado();
    const cajaAbierta = isCajaAbierta();

    // Handlers
    const onRefreshTasa = useCallback(() => obtenerTasaBCV(true), [obtenerTasaBCV]);
    const onCloseSuccess = useCallback(() => {
        setVentaExitosa(false);
        limpiarCarrito();
        searchInputRef.current?.focus();
    }, [setVentaExitosa, limpiarCarrito, searchInputRef]);

    const handleRecuperarTicket = usePosActionsStore.getState().handleRecuperarTicket;
    const handlePrintSaldo = usePosActionsStore.getState().handlePrintSaldo;

    // Actions from stores
    const limpiar = usePosActionsStore(s => s.limpiar);
    const toggleAyuda = usePosActionsStore(s => s.toggleAyuda);
    const espera = usePosActionsStore(s => s.espera);

    return (
        <div className="flex h-screen bg-app-light dark:bg-app-dark overflow-hidden font-sans relative">

            {ventaExitosa && (
                <div className="fixed inset-0 z-[100] bg-surface-dark/90 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="relative flex flex-col items-center">
                        <img
                            src="logo_success.png?v=2"
                            alt="LISTO POS"
                            className="h-48 w-auto relative z-10 drop-shadow-2xl object-contain"
                        />
                        <div className="mt-8 flex flex-col items-center z-10">
                            <h2 className="text-5xl font-black text-content-inverse tracking-tighter text-center">
                                VENTA <span className="text-status-success">EXITOSA</span>
                            </h2>
                            <p className="text-content-secondary mt-2 font-mono">
                                TICKET #{ticketData?.numeroFactura || 'PROCESANDO'}
                            </p>
                            <div className="flex gap-4 mt-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
                                {(ticketData?.vueltoCredito || (ticketData?.deudaPendiente > 0)) && (
                                    <button
                                        onClick={handlePrintSaldo}
                                        className="bg-white hover:bg-slate-50 text-slate-800 font-bold py-3 px-6 rounded-xl shadow-lg border-2 border-slate-200 flex items-center gap-2 transition-transform active:scale-95"
                                    >
                                        <Clock size={20} className="text-blue-600" />
                                        IMPRIMIR ESTADO DE CUENTA
                                    </button>
                                )}
                                <button
                                    onClick={onCloseSuccess}
                                    className="bg-primary hover:bg-primary-hover text-white font-black py-3 px-8 rounded-xl shadow-lg shadow-primary/30 flex items-center gap-2 transition-transform active:scale-95"
                                >
                                    LISTO (ENTER)
                                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded ml-2">↵</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {cajaAbierta && (
                <Suspense fallback={<div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
                    {activeModal === 'PESAJE' && modalData && <ModalPesaje producto={modalData} tasa={tasa} onConfirm={(d) => { agregarAlCarrito(modalData, d.peso, 'peso', d.precioTotal / d.peso); closeModal(); }} onClose={closeModal} />}
                    {activeModal === 'JERARQUIA' && modalData && <ModalJerarquia producto={modalData} onSelect={(f) => { agregarAlCarrito(modalData, 1, f, modalData.jerarquia[f].precio); closeModal(); }} onClose={closeModal} />}
                    {activeModal === 'PAGO' && <ModalPago totalUSD={totalUSD} totalBS={totalBS} totalImpuesto={totalImpuesto} tasa={tasa} onPagar={usePosActionsStore.getState().finalizarVenta} initialClient={clientePreseleccionado} onClose={closeModal} />}
                    {activeModal === 'ESPERA' && <ModalEspera tickets={ticketsEspera} onRecuperar={handleRecuperarTicket} onEliminar={eliminarTicketEspera} onClose={closeModal} />}
                </Suspense>
            )}

            <div style={{ display: 'none' }}>
                {Ticket ? <Ticket ref={ticketRef} data={ticketData} /> : null}
                {TicketSaldoFavor ? <TicketSaldoFavor ref={ticketSaldoRef} data={ticketData} /> : null}
            </div>

            <div className="flex-1 flex flex-col min-w-0 border-r border-border-subtle relative bg-surface-light dark:bg-surface-dark">
                {!cajaAbierta ? (
                    <WelcomeScreen />
                ) : (
                    <>
                        <div className="relative">
                            <PosHeader
                                ref={searchInputRef}
                                onKeyDown={handleSearchInputKeyDown}
                            />
                            {multiplicadorPendiente > 1 && (
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-black shadow-lg animate-bounce z-50">
                                    MODO MULTIPLICADOR: x{multiplicadorPendiente}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between px-4 pb-2 gap-2">
                            <div className="flex items-center gap-2">
                                <button onClick={() => useUIStore.getState().openModal('ESPERA')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-status-warningBg text-status-warning hover:bg-status-warningBg/80 border border-status-warning" title="Ver Tickets en Espera">
                                    <Clock size={14} /> ESPERA {ticketsEspera.length > 0 && <span className="bg-status-warning text-black px-1.5 rounded-full text-[9px]">{ticketsEspera.length}</span>}
                                </button>
                                <button onClick={toggleAyuda} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30" title="Ver Atajos de Teclado">
                                    <HelpCircle size={14} /> AYUDA (?)
                                </button>
                            </div>
                            <button onClick={limpiar} disabled={carrito.length === 0 || isProcessing} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${carrito.length > 0 && !isProcessing ? 'bg-status-dangerBg text-status-danger hover:bg-status-dangerBg/80 cursor-pointer' : 'bg-app-light text-content-secondary cursor-not-allowed'}`} title="Vaciar Cesta Completa">
                                <Trash2 size={14} /> VACIAR CESTA (F4)
                            </button>
                        </div>

                        {/* ⚠️ STALE RATE WARNING BANNER */}
                        {tasaStale && !tasaInvalida && (
                            <div className="mx-4 mb-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs font-bold animate-in fade-in">
                                <span>⚠️ La tasa tiene más de 24h sin actualizarse</span>
                                <button onClick={onRefreshTasa} className="underline hover:text-amber-900 dark:hover:text-amber-300 transition-colors">Actualizar Ahora</button>
                            </div>
                        )}

                        {/* 🚫 EXCHANGE RATE WARNING BANNER */}
                        {tasaInvalida && (
                            <div className="mx-4 mb-3 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-pulse">
                                <span className="text-2xl">⚠️</span>
                                <div className="flex-1">
                                    <p className="font-bold text-sm">VENTAS BLOQUEADAS</p>
                                    <p className="text-xs opacity-90">La tasa de cambio no está configurada. Dirígete a Configuración para establecerla.</p>
                                </div>
                            </div>
                        )}

                        <ProductGrid
                            setRef={useCallback((el, idx) => { if (productRefs.current) productRefs.current[idx] = el; }, [productRefs])}
                        />
                    </>
                )}
            </div>

            <CartSidebar
                cartSelectedIndex={cartSelectedIndex}
                focusCartItem={focusCartItem}
            />
            {children}
        </div>
    );
}
