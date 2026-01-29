import React from 'react';
import { Trash2, Clock } from 'lucide-react';
import Ticket from '../Ticket';
import TicketSaldoFavor from '../TicketSaldoFavor';
// File structure:
// src/pages/PosPage.jsx -> uses ../components/Ticket
// src/components/pos/DesktopLayout.jsx -> needs ../../components/Ticket? Or just ../Ticket if it's in components root.
// Ticket is in src/components/Ticket.jsx (based on import Ticket from '../components/Ticket' in PosPage)
// So from src/components/pos/DesktopLayout.jsx:
// ../Ticket goes to src/components/Ticket ? No, generic 'components' folder.
// src/components/pos/ is the folder. ../ goes to src/components/. So ../Ticket is correct.

import PosHeader from './PosHeader'; // In same folder (components/pos)
import ProductGrid from './ProductGrid';
import CartSidebar from './CartSidebar';
import ModalEspera from './ModalEspera';
import WelcomeScreen from './WelcomeScreen';

// Modals are in src/components/
import ModalPago from '../ModalPago';
import ModalPesaje from '../ModalPesaje';
import ModalJerarquia from '../ModalJerarquia';

export default function DesktopLayout({
    cajaAbierta,
    abrirCajaPOS,
    ventaExitosa,
    ticketData,
    modales,
    setModales,
    actions,
    busqueda,
    setBusqueda,
    categoriaActiva,
    setCategoriaActiva,
    categorias,
    tasa,
    tasaCaida,
    tasaReferencia, // 🆕
    handleSearchInputKeyDown,
    multiplicadorPendiente,
    ticketsEspera,
    carrito,
    isProcessing,
    filtrados,
    selectedIndex,
    productRefs,
    searchInputRef,

    ticketRef,
    ticketSaldoRef,
    calculos,
    handleRecuperarTicket,
    eliminarTicketEspera,
    finalizarVenta,
    agregarAlCarrito,
    clientePreseleccionado, // 🆕
    handlePrintSaldo, // 🖨️
    onCloseSuccess, // ❌
    permitirSinStock // 🆕
}) {
    return (
        <div className="flex h-screen bg-app-light dark:bg-app-dark overflow-hidden font-sans relative">


            {ventaExitosa && (
                <div className="fixed inset-0 z-[100] bg-surface-dark/90 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="relative flex flex-col items-center">
                        {/* Logo Flotante */}
                        <img
                            src="logodark.png"
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

                            {/* 🖨️ BOTONES DE ACCIÓN FINAL */}
                            <div className="flex gap-4 mt-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
                                {/* Estado de Cuenta (Opcional) */}
                                {(ticketData?.vueltoCredito || (ticketData?.deudaPendiente > 0)) && (
                                    <button
                                        onClick={handlePrintSaldo}
                                        className="bg-white hover:bg-slate-50 text-slate-800 font-bold py-3 px-6 rounded-xl shadow-lg border-2 border-slate-200 flex items-center gap-2 transition-transform active:scale-95"
                                    >
                                        <Clock size={20} className="text-blue-600" />
                                        IMPRIMIR ESTADO DE CUENTA
                                    </button>
                                )}

                                {/* Botón de Cierre */}
                                {onCloseSuccess && (
                                    <button
                                        onClick={onCloseSuccess}
                                        className="bg-primary hover:bg-primary-hover text-white font-black py-3 px-8 rounded-xl shadow-lg shadow-primary/30 flex items-center gap-2 transition-transform active:scale-95"
                                    >
                                        LISTO (ENTER)
                                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded ml-2">↵</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {cajaAbierta && (
                <>
                    {modales.pesaje && <ModalPesaje producto={modales.pesaje} tasa={calculos.tasa} onConfirm={(d) => { agregarAlCarrito(modales.pesaje, d.peso, 'peso', d.precioTotal / d.peso); setModales(m => ({ ...m, pesaje: null })); }} onClose={() => setModales(m => ({ ...m, pesaje: null }))} />}
                    {modales.jerarquia && <ModalJerarquia producto={modales.jerarquia} onSelect={(f) => { agregarAlCarrito(modales.jerarquia, 1, f, modales.jerarquia.jerarquia[f].precio); setModales(m => ({ ...m, jerarquia: null })); }} onClose={() => setModales(m => ({ ...m, jerarquia: null }))} />}
                    {modales.pago && <ModalPago totalUSD={calculos.totalUSD} totalBS={calculos.totalBS} totalImpuesto={calculos.totalImpuesto} tasa={calculos.tasa} onPagar={finalizarVenta} initialClient={clientePreseleccionado} onClose={() => setModales(m => ({ ...m, pago: false }))} />}
                    {modales.espera && <ModalEspera tickets={ticketsEspera} onRecuperar={handleRecuperarTicket} onEliminar={eliminarTicketEspera} onClose={() => setModales(m => ({ ...m, espera: false }))} />}
                </>
            )}

            <div style={{ display: 'none' }}>
                {Ticket ? <Ticket ref={ticketRef} data={ticketData} /> : null}
                {TicketSaldoFavor ? <TicketSaldoFavor ref={ticketSaldoRef} data={ticketData} /> : null}
            </div>

            <div className="flex-1 flex flex-col min-w-0 border-r border-border-subtle relative bg-surface-light dark:bg-surface-dark">
                {!cajaAbierta ? (
                    <WelcomeScreen onAbrir={abrirCajaPOS} />
                ) : (
                    <>
                        <div className="relative">
                            <PosHeader
                                ref={searchInputRef}
                                busqueda={busqueda}
                                setBusqueda={setBusqueda}
                                categorias={categorias}
                                categoriaActiva={categoriaActiva}
                                setCategoriaActiva={setCategoriaActiva}
                                tasa={calculos.tasa}
                                tasaCaida={tasaCaida}
                                tasaReferencia={tasaReferencia} // 🆕
                                onKeyDown={handleSearchInputKeyDown}
                            />
                            {multiplicadorPendiente > 1 && (
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-black shadow-lg animate-bounce z-50">
                                    MODO MULTIPLICADOR: x{multiplicadorPendiente}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between px-4 pb-2 gap-2">
                            <button onClick={() => setModales(m => ({ ...m, espera: true }))} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-status-warningBg text-status-warning hover:bg-status-warningBg/80 border border-status-warning" title="Ver Tickets en Espera">
                                <Clock size={14} /> ESPERA {ticketsEspera.length > 0 && <span className="bg-status-warning text-black px-1.5 rounded-full text-[9px]">{ticketsEspera.length}</span>}
                            </button>
                            <button onClick={actions.limpiar} disabled={carrito.length === 0 || isProcessing} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${carrito.length > 0 && !isProcessing ? 'bg-status-dangerBg text-status-danger hover:bg-status-dangerBg/80 cursor-pointer' : 'bg-app-light text-content-secondary cursor-not-allowed'}`} title="Vaciar Cesta Completa">
                                <Trash2 size={14} /> VACIAR CESTA (F4)
                            </button>
                        </div>
                        <ProductGrid
                            filtrados={filtrados}
                            selectedIndex={selectedIndex}
                            setRef={(el, idx) => productRefs.current[idx] = el}
                            onSelectProducto={actions.prepararAgregar}
                            tasa={calculos.tasa}
                            permitirSinStock={permitirSinStock} // 🆕
                        />
                    </>
                )}
            </div>

            <CartSidebar
                carrito={carrito}
                calculos={calculos}
                onRemoveItem={actions.eliminarItem}
                onChangeQty={actions.cambiarCant}
                onChangeUnit={actions.cambiarUnidad} // 🆕
                onCheckout={actions.cobrar}
                onHold={actions.espera}
                isProcessing={isProcessing}
                className={`transition-all duration-500 ${!cajaAbierta ? 'opacity-30 grayscale pointer-events-none filter blur-[1px]' : ''}`}
            />
        </div>
    );
}
