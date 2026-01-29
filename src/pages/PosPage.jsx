// ✅ SYSTEM IMPLEMENTATION - V. 5.1 (FISCAL CONNECTION)
// Archivo: src/pages/PosPage.jsx
// Objetivo: Conectar el botón de pago con el Generador de Correlativos Fiscales.

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import Swal from 'sweetalert2';

// --- LAYOUTS ---
import DesktopLayout from '../components/pos/DesktopLayout';
import TouchLayout from '../components/pos/TouchLayout';
import TicketSaldoFavor from '../components/TicketSaldoFavor';

// --- HOOKS ---
import { useCartCalculations } from '../hooks/pos/useCartCalculations';
import { useCajaEstado } from '../hooks/caja/useCajaEstado';
import { useSecureAction } from '../hooks/security/useSecureAction';
import { PERMISOS, useRBAC } from '../hooks/store/useRBAC';
import { usePosKeyboard } from '../hooks/ui/usePosKeyboard';
import { usePosModals } from '../hooks/ui/usePosModals';

// --- CUSTOM HOOKS (MODULAR) ---
import { usePosSearch } from '../hooks/pos/usePosSearch';
import { usePosActions } from '../hooks/pos/usePosActions';
import { useSaleFinalizer } from '../hooks/pos/useSaleFinalizer';

export default function PosPage() {
  const {
    productos, carrito, agregarAlCarrito, eliminarDelCarrito,
    cambiarCantidadCarrito, limpiarCarrito, registrarVenta,
    abrirCajaPOS, configuracion, playSound, usuario,
    isProcessing,
    ticketsEspera, guardarEnEspera, recuperarDeEspera, eliminarTicketEspera,
    generarCorrelativo, cambiarUnidadCarrito // 🆕
  } = useStore();

  const { isCajaAbierta } = useCajaEstado();
  const cajaAbierta = isCajaAbierta();
  const { ejecutarAccionSegura } = useSecureAction();
  const { tienePermiso } = useRBAC(usuario);

  const tieneAccesoPos = tienePermiso(PERMISOS.POS_ACCESO);

  // --- REFS ---
  const ticketRef = useRef();
  const ticketSaldoRef = useRef();
  const searchInputRef = useRef(null);
  const productRefs = useRef([]);

  // --- NAVEGACIÓN Y ESTADO ---
  const location = useLocation();
  const navigate = useNavigate();
  const [clientePreseleccionado, setClientePreseleccionado] = useState(null);

  // --- CÁLCULOS Y MODALES ---
  const calculos = useCartCalculations(carrito, configuracion);
  const tasaCaida = calculos.tasa === 1;

  const {
    modales, setModales, abrirPago, cerrarPago, abrirEspera, cerrarEspera,
    abrirPesaje, cerrarPesaje, abrirJerarquia, cerrarJerarquia
  } = usePosModals();

  // 🆕 PRE-SELECCION CLIENTE (Restored)
  useEffect(() => {
    if (location.state?.clienteSeleccionado) {
      setClientePreseleccionado(location.state.clienteSeleccionado);
      Swal.fire({
        toast: true, position: 'top-end', icon: 'info',
        title: `Cliente: ${location.state.clienteSeleccionado.nombre}`,
        text: 'Seleccionado para la venta', timer: 3000, showConfirmButton: false
      });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // --- HOOKS MODULARES ---
  const {
    busqueda, setBusqueda, categoriaActiva, setCategoriaActiva,
    categorias, filtrados, selectedIndex, setSelectedIndex
  } = usePosSearch(productos);

  const {
    actions, multiplicadorPendiente, setMultiplicadorPendiente
  } = usePosActions(
    { productos, carrito, agregarAlCarrito, eliminarDelCarrito, cambiarCantidadCarrito, limpiarCarrito, configuracion, playSound, cajaAbierta, isProcessing, guardarEnEspera, cambiarUnidadCarrito },
    { ejecutarAccionSegura, abrirPago, abrirPesaje, abrirJerarquia, setBusqueda, setSelectedIndex, searchInputRef }
  );

  const {
    ticketData, setTicketData, ventaExitosa, setVentaExitosa,
    finalizarVenta, handlePrint, handlePrintSaldo, handleRecuperarTicket
  } = useSaleFinalizer({
    carrito, calculos, registrarVenta, limpiarCarrito, playSound, generarCorrelativo, recuperarDeEspera, cerrarPago, cerrarEspera, searchInputRef, ticketRef, ticketSaldoRef
  });

  // 📡 [SCANNER ENGINE]: Monitoreo de búsqueda en tiempo real para agregado automático
  useEffect(() => {
    if (!busqueda || busqueda.length < 3) return;
    if (!cajaAbierta || isProcessing) return;

    // ⚖️ [SCALE ENGINE]: Soporte para Etiquetas de Peso Variable (EAN-13/14 Prefijo 21)
    if (busqueda.length >= 13 && busqueda.startsWith('21')) {
      let plu = '';
      let peso = 0;

      if (busqueda.length === 14) {
        // Estructura 14 digitos: 21 (2) + filler (1) + PLU (5) + Peso (5) + Check (1)
        // Ejemplo: 21 0 00001 00930 4
        plu = busqueda.substring(3, 8);
        peso = parseInt(busqueda.substring(8, 13)) / 1000;
      } else {
        // Estructura 13 digitos: 21 (2) + PLU (5) + Peso (5) + Check (1)
        plu = busqueda.substring(2, 7);
        peso = parseInt(busqueda.substring(7, 12)) / 1000;
      }

      // Buscar producto por PLU (normalizando ceros a la izquierda)
      const pluNormalizado = plu.replace(/^0+/, '') || '0';
      const producto = productos.find(p => {
        const pCodigoNormalizado = (p.codigo || '').replace(/^0+/, '') || '0';
        return pCodigoNormalizado === pluNormalizado || p.codigo === plu || p.codigo === `0${plu}`;
      });

      if (producto) {
        console.log("⚖️ [SCALE SCAN] Match:", producto.nombre, "| PLU:", plu, "| Peso:", peso, "kg");
        actions.autoAgregarPesado(producto, peso);
        return;
      }
    }

    const exactMatch = productos.find(p => p.codigo?.toLowerCase() === busqueda.toLowerCase());

    if (exactMatch) {
      console.log("🚀 [SCANNER] Match detectado:", exactMatch.nombre);
      setBusqueda(''); // 🛑 STOP LOOP (Early Clear)
      actions.prepararAgregar(exactMatch);
    }
  }, [busqueda, productos, cajaAbierta, isProcessing, actions, setBusqueda]);

  // --- HOOK DE TECLADO ---
  const { handleSearchInputKeyDown } = usePosKeyboard({
    cajaAbierta, tieneAccesoPos, isProcessing,
    modalesAbiertos: { ...modales, exito: ventaExitosa },
    carrito, busqueda, filtrados, productos,
    selectedIndex,
    setSelectedIndex, setBusqueda, setMultiplicador: setMultiplicadorPendiente,
    searchInputRef, productRefs, actions
  });


  // --- RENDER ---


  if (!tieneAccesoPos) return null;

  // 🖱️ SWITCHER DE MODO TÁCTIL O ESCRITORIO
  if (configuracion.modoTouch) {
    return (
      <TouchLayout
        cajaAbierta={cajaAbierta}
        abrirCajaPOS={abrirCajaPOS}
        ventaExitosa={ventaExitosa}
        ticketData={ticketData}
        modales={modales}
        setModales={setModales}
        actions={actions}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        categoriaActiva={categoriaActiva}
        setCategoriaActiva={setCategoriaActiva}
        categorias={categorias}
        tasa={calculos.tasa}
        tasaCaida={tasaCaida}
        tasaReferencia={configuracion.tasaReferencia || 0} // 🆕
        handleSearchInputKeyDown={handleSearchInputKeyDown}
        multiplicadorPendiente={multiplicadorPendiente}
        ticketsEspera={ticketsEspera}
        carrito={carrito}
        isProcessing={isProcessing}
        filtrados={filtrados}
        selectedIndex={selectedIndex}
        productRefs={productRefs}
        searchInputRef={searchInputRef}

        calculos={calculos}
        handleRecuperarTicket={handleRecuperarTicket}
        eliminarTicketEspera={eliminarTicketEspera}
        finalizarVenta={finalizarVenta}
        agregarAlCarrito={agregarAlCarrito}
        ticketRef={ticketRef}
        ticketSaldoRef={ticketSaldoRef}
        clientePreseleccionado={clientePreseleccionado} // 🆕
        handlePrintSaldo={handlePrintSaldo} // 🖨️ Manual Print
        onCloseSuccess={() => { setVentaExitosa(false); limpiarCarrito(); searchInputRef.current?.focus(); }} // Manual close handler
        permitirSinStock={configuracion?.permitirSinStock} // 🆕
      />
    );
  }

  return (
    <DesktopLayout
      cajaAbierta={cajaAbierta}
      abrirCajaPOS={abrirCajaPOS}
      ventaExitosa={ventaExitosa}
      ticketData={ticketData}
      modales={modales}
      setModales={setModales}
      actions={actions}
      busqueda={busqueda}
      setBusqueda={setBusqueda}
      categoriaActiva={categoriaActiva}
      setCategoriaActiva={setCategoriaActiva}
      categorias={categorias}
      tasa={calculos.tasa}
      tasaCaida={tasaCaida}
      tasaReferencia={configuracion.tasaReferencia || 0} // 🆕
      handleSearchInputKeyDown={handleSearchInputKeyDown}
      multiplicadorPendiente={multiplicadorPendiente}
      ticketsEspera={ticketsEspera}
      carrito={carrito}
      isProcessing={isProcessing}
      filtrados={filtrados}
      selectedIndex={selectedIndex}
      productRefs={productRefs}
      searchInputRef={searchInputRef}
      ticketRef={ticketRef}
      ticketSaldoRef={ticketSaldoRef}
      calculos={calculos}
      handleRecuperarTicket={handleRecuperarTicket}
      eliminarTicketEspera={eliminarTicketEspera}
      finalizarVenta={finalizarVenta}
      agregarAlCarrito={agregarAlCarrito}
      clientePreseleccionado={clientePreseleccionado} // 🆕
      handlePrintSaldo={handlePrintSaldo} // 🖨️ Manual Print
      onCloseSuccess={() => { setVentaExitosa(false); limpiarCarrito(); searchInputRef.current?.focus(); }} // Manual close handler
      permitirSinStock={configuracion?.permitirSinStock} // 🆕
    />
  );
}