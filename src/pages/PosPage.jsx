// ✅ SYSTEM IMPLEMENTATION - V. 5.1 (FISCAL CONNECTION)
// Archivo: src/pages/PosPage.jsx
// Objetivo: Conectar el botón de pago con el Generador de Correlativos Fiscales.

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// import { useStore } from '../context/StoreContext'; // 🗑️ DEPRECATED
import { useCartStore } from '../stores/useCartStore';
import { useInventoryStore } from '../stores/useInventoryStore';
import { useConfigStore } from '../stores/useConfigStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useTicketStore } from '../stores/useTicketStore';
import { useUIStore } from '../stores/useUIStore';
import { useAuthContext } from '../context/AuthContext';

import { useSalesProcessor } from '../hooks/store/useSalesProcessor';
import { useInventory } from '../hooks/store/useInventory';
import Swal from 'sweetalert2';

// --- LAYOUTS ---
import DesktopLayout from '../components/pos/DesktopLayout';
import TouchLayout from '../components/pos/TouchLayout';
import TicketSaldoFavor from '../components/TicketSaldoFavor';
import ShortcutGuide from '../components/pos/ShortcutGuide';

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
import { useDemoShieldNotifications } from '../hooks/useDemoShieldNotifications';

export default function PosPage() {
  // 🛡️ DEMO SHIELD MONITOR
  useDemoShieldNotifications();

  // ⚡ ATOMIC STATE SUBSCRIPTION (Zustand)
  const productos = useInventoryStore(state => state.productos);

  const carrito = useCartStore(state => state.carrito);
  const { agregarAlCarrito, eliminarDelCarrito, cambiarCantidadCarrito, limpiarCarrito, cambiarUnidadCarrito } = useCartStore();

  const configuracion = useConfigStore(state => state.configuracion);
  const generarCorrelativo = useConfigStore(state => state.generarCorrelativo);

  const { usuario } = useAuthContext(); // ⚡ LEGACY AUTH BRIDGE
  // const usuario = useAuthStore(state => state.usuario); 

  // 🚀 HYDRATION: Ensure Stores are populated on mount
  useEffect(() => {
    useInventoryStore.getState().loadProductos();
    useConfigStore.getState().loadConfig();
  }, []);

  const { ticketsEspera, guardarEnEspera, recuperarDeEspera, eliminarTicketEspera } = useTicketStore();

  const { playSound, isProcessing } = useUIStore();

  // 🏗️ LEGACY HOOK INSTANTIATION (Bridge to ZUSTAND)
  // We instantiate logic hooks using data from ZUSTAND instead of Context
  const { transaccionVenta, transaccionAnulacion } = useInventory(usuario, configuracion, () => { });
  const cajaMethods = useCajaEstado();

  const { registrarVenta } = useSalesProcessor(
    usuario,
    configuracion,
    { transaccionVenta, transaccionAnulacion, playSound, generarCorrelativo },
    cajaMethods,
    carrito,
    (newCart) => useCartStore.getState().setCarrito(newCart) // Adapter for setCarrito
  );

  const { isCajaAbierta, abrirCaja } = useCajaEstado();
  const cajaAbierta = isCajaAbierta();
  const abrirCajaPOS = abrirCaja; // Alias for backward compatibility
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
    abrirPesaje, cerrarPesaje, abrirJerarquia, cerrarJerarquia, toggleAyuda
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
  } = usePosSearch();

  const {
    actions, multiplicadorPendiente, setMultiplicadorPendiente
  } = usePosActions(
    { productos, carrito, agregarAlCarrito, eliminarDelCarrito, cambiarCantidadCarrito, limpiarCarrito, configuracion, playSound, cajaAbierta, isProcessing, guardarEnEspera, cambiarUnidadCarrito },
    { ejecutarAccionSegura, abrirPago, abrirPesaje, abrirJerarquia, toggleAyuda, setBusqueda, setSelectedIndex, searchInputRef }
  );

  const {
    ticketData, setTicketData, ventaExitosa, setVentaExitosa,
    finalizarVenta, handlePrint, handlePrintSaldo, handleRecuperarTicket
  } = useSaleFinalizer({
    carrito, calculos, registrarVenta, limpiarCarrito, playSound, generarCorrelativo, recuperarDeEspera, cerrarPago, cerrarEspera, searchInputRef, ticketRef, ticketSaldoRef,
    setCarrito: (items) => useCartStore.getState().setCarrito(items)
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
        actions.autoAgregarPesado(producto, peso);
        return;
      }
    }

    const exactMatch = productos.find(p => p.codigo?.toLowerCase() === busqueda.toLowerCase());

    if (exactMatch) {
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

  // 🏮 SHORTCUT GUIDE (Global para ambos modos)
  const guideComponent = <ShortcutGuide isOpen={modales.ayuda} onClose={toggleAyuda} />;

  // 🖖️ SWITCHER DE MODO TÁCTIL O ESCRITORIO
  if (configuracion.modoTouch) {
    return (
      <TouchLayout
        cajaAbierta={cajaAbierta}
        abrirCajaPOS={abrirCajaPOS}
        ventaExitosa={ventaExitosa}
        ticketData={ticketData}
        modales={modales}
        setModales={setModales} // ⚠️ DEPRECATED
        // ✅ ATOMIC HANDLERS
        handlers={{
          abrirPago, cerrarPago,
          abrirEspera, cerrarEspera,
          abrirPesaje, cerrarPesaje,
          abrirJerarquia, cerrarJerarquia,
          toggleAyuda
        }}
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
      >
        {guideComponent}
      </TouchLayout>
    );
  }

  return (
    <DesktopLayout
      cajaAbierta={cajaAbierta}
      abrirCajaPOS={abrirCajaPOS}
      ventaExitosa={ventaExitosa}
      ticketData={ticketData}
      modales={modales}
      setModales={setModales} // ⚠️ DEPRECATED
      // ✅ ATOMIC HANDLERS (New Architecture)
      handlers={{
        abrirPago, cerrarPago,
        abrirEspera, cerrarEspera,
        abrirPesaje, cerrarPesaje,
        abrirJerarquia, cerrarJerarquia,
        toggleAyuda
      }}
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
      onCloseSuccess={useCallback(() => { setVentaExitosa(false); limpiarCarrito(); searchInputRef.current?.focus(); }, [setVentaExitosa, limpiarCarrito])} // Manual close handler
      permitirSinStock={configuracion?.permitirSinStock} // 🆕
    >
      {guideComponent}
    </DesktopLayout>
  );
}