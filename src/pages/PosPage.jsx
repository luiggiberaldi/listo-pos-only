// ✅ REFACTORED - V. 6.0 (ZUSTAND ARCHITECTURE)
// Archivo: src/pages/PosPage.jsx
// Antes: 325 líneas, 40+ props. Ahora: ~100 líneas, solo orquestación mínima.
// Hijos se conectan directamente a stores. PosPage solo hydrata, scanner, keyboard.

import React, { useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

// --- STORES ---
import { useCartStore } from '../stores/useCartStore';
import { useInventoryStore } from '../stores/useInventoryStore';
import { useConfigStore } from '../stores/useConfigStore';
import { useUIStore } from '../stores/useUIStore';
import { usePosSearchStore } from '../stores/usePosSearchStore';
import { usePosActionsStore } from '../stores/usePosActionsStore';
import { usePosCalcStore } from '../stores/usePosCalcStore';
import { useTicketStore } from '../stores/useTicketStore';

// --- AUTH ---
import { useAuthContext } from '../context/AuthContext';

// --- HOOKS ---
import { useSalesProcessor } from '../hooks/store/useSalesProcessor';
import { useInventory } from '../hooks/store/useInventory';
import { useCajaEstado } from '../hooks/caja/useCajaEstado';
import { useSecureAction } from '../hooks/security/useSecureAction';
import { PERMISOS, useRBAC } from '../hooks/store/useRBAC';
import { usePosKeyboard } from '../hooks/ui/usePosKeyboard';
import { useSaleFinalizer } from '../hooks/pos/useSaleFinalizer';
import { useDemoShieldNotifications } from '../hooks/useDemoShieldNotifications';

// --- LAYOUTS ---
import DesktopLayout from '../components/pos/DesktopLayout';
import TouchLayout from '../components/pos/TouchLayout';
import ShortcutGuide from '../components/pos/ShortcutGuide';

export default function PosPage() {
  // 🛡️ DEMO SHIELD MONITOR
  useDemoShieldNotifications();

  // --- AUTH & PERMISSIONS ---
  const { usuario } = useAuthContext();
  const { tienePermiso } = useRBAC(usuario);
  const tieneAccesoPos = tienePermiso(PERMISOS.POS_ACCESO);

  // --- REFS ---
  const ticketRef = useRef();
  const ticketSaldoRef = useRef();
  const searchInputRef = useRef(null);
  const productRefs = useRef([]);

  // --- NAVIGATION ---
  const location = useLocation();
  const navigate = useNavigate();

  // 🚀 HYDRATION: Ensure Stores are populated on mount
  useEffect(() => {
    useInventoryStore.getState().loadProductos();
    useConfigStore.getState().loadConfig();
    // Trigger initial calc
    setTimeout(() => usePosCalcStore.getState()._recalc(), 100);
  }, []);

  // --- CAJA ---
  const cajaMethods = useCajaEstado();
  const { isCajaAbierta, abrirCaja } = cajaMethods;
  const cajaAbierta = isCajaAbierta();
  const { ejecutarAccionSegura } = useSecureAction();

  // --- INJECT REFS INTO ACTIONS STORE (once) ---
  useEffect(() => {
    usePosActionsStore.getState().setRefs({
      searchInputRef,
      ejecutarAccionSegura,
      cajaAbiertaFn: () => isCajaAbierta(),
    });
  }, [ejecutarAccionSegura, isCajaAbierta]);

  // --- SALES PROCESSOR (legacy hook, still needed for registrarVenta) ---
  const configuracion = useConfigStore(s => s.configuracion);
  const carrito = useCartStore(s => s.carrito);
  const generarCorrelativo = useConfigStore(s => s.generarCorrelativo);
  const playSound = useUIStore(s => s.playSound);
  const { transaccionVenta, transaccionAnulacion } = useInventory(usuario, configuracion, () => { });
  const { registrarVenta } = useSalesProcessor(
    usuario, configuracion,
    { transaccionVenta, transaccionAnulacion, playSound, generarCorrelativo },
    cajaMethods, carrito,
    (newCart) => useCartStore.getState().setCarrito(newCart)
  );

  const _subtotalBase = usePosCalcStore(s => s.subtotalBase);
  const _totalImpuesto = usePosCalcStore(s => s.totalImpuesto);
  const _totalUSD = usePosCalcStore(s => s.totalUSD);
  const _totalBS = usePosCalcStore(s => s.totalBS);
  const _carritoBS = usePosCalcStore(s => s.carritoBS);
  const _tasa = usePosCalcStore(s => s.tasa);
  const _ivaGlobal = usePosCalcStore(s => s.ivaGlobal);
  const calculos = React.useMemo(() => ({
    subtotalBase: _subtotalBase, totalImpuesto: _totalImpuesto,
    totalUSD: _totalUSD, totalBS: _totalBS,
    carritoBS: _carritoBS, tasa: _tasa, ivaGlobal: _ivaGlobal
  }), [_subtotalBase, _totalImpuesto, _totalUSD, _totalBS, _carritoBS, _tasa, _ivaGlobal]);
  const ticketsEspera = useTicketStore(s => s.ticketsEspera);
  const recuperarDeEspera = useTicketStore(s => s.recuperarDeEspera);
  const activeModal = useUIStore(s => s.activeModal);
  const cerrarPago = useCallback(() => useUIStore.getState().closeModal(), []);
  const cerrarEspera = cerrarPago;
  const limpiarCarrito = useCartStore(s => s.limpiarCarrito);

  const {
    finalizarVenta, handlePrint, handlePrintSaldo, handleRecuperarTicket
  } = useSaleFinalizer({
    carrito, calculos, registrarVenta, limpiarCarrito, playSound,
    generarCorrelativo, recuperarDeEspera, cerrarPago, cerrarEspera,
    searchInputRef, ticketRef, ticketSaldoRef,
    setCarrito: (items) => useCartStore.getState().setCarrito(items)
  });

  // Store finalizarVenta and handleRecuperarTicket in the actions store for DesktopLayout/TouchLayout
  useEffect(() => {
    // We use Object.assign to avoid triggering a full re-render on the store
    Object.assign(usePosActionsStore.getState(), { finalizarVenta, handlePrintSaldo, handleRecuperarTicket });
  }, [finalizarVenta, handlePrintSaldo, handleRecuperarTicket]);

  // 🆕 PRE-SELECCION CLIENTE
  useEffect(() => {
    if (location.state?.clienteSeleccionado) {
      Swal.fire({
        toast: true, position: 'top-end', icon: 'info',
        title: `Cliente: ${location.state.clienteSeleccionado.nombre}`,
        text: 'Seleccionado para la venta', timer: 3000, showConfirmButton: false
      });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // 📡 SCANNER ENGINE
  const busqueda = usePosSearchStore(s => s.busqueda);
  const productos = useInventoryStore(s => s.productos);
  const isProcessing = useUIStore(s => s.isProcessing);
  // Actions are stable store references — read once, no selector subscription needed
  const actionsRef = useRef(usePosActionsStore.getState());

  useEffect(() => {
    if (!busqueda || busqueda.length < 3) return;
    if (!cajaAbierta || isProcessing) return;

    const actions = usePosActionsStore.getState();

    // ⚖️ SCALE ENGINE: Weight Variable Labels (EAN-13/14 Prefix 21)
    if (busqueda.length >= 13 && busqueda.startsWith('21')) {
      let plu = '';
      let peso = 0;
      if (busqueda.length === 14) {
        plu = busqueda.substring(3, 8);
        peso = parseInt(busqueda.substring(8, 13)) / 1000;
      } else {
        plu = busqueda.substring(2, 7);
        peso = parseInt(busqueda.substring(7, 12)) / 1000;
      }
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
      usePosSearchStore.getState().setBusqueda('');
      actions.prepararAgregar(exactMatch);
    }
  }, [busqueda, productos, cajaAbierta, isProcessing]);

  // --- KEYBOARD ---
  const filtrados = usePosSearchStore(s => s.filtrados);
  const selectedIndex = usePosSearchStore(s => s.selectedIndex);
  const ventaExitosa = usePosActionsStore(s => s.ventaExitosa);
  const multiplicadorPendiente = usePosActionsStore(s => s.multiplicadorPendiente);

  const modalesAbiertos = React.useMemo(() => ({
    pago: activeModal === 'PAGO', espera: activeModal === 'ESPERA',
    ayuda: activeModal === 'AYUDA', exito: ventaExitosa,
    pesaje: activeModal === 'PESAJE', jerarquia: activeModal === 'JERARQUIA'
  }), [activeModal, ventaExitosa]);

  const keyboardActions = React.useMemo(() => ({
    ...usePosActionsStore.getState(),
  }), []); // stable — store actions don't change identity

  const { handleSearchInputKeyDown, cartSelectedIndex, focusCartItem } = usePosKeyboard({
    cajaAbierta, tieneAccesoPos, isProcessing,
    modalesAbiertos,
    carrito, busqueda, filtrados, productos,
    selectedIndex,
    setSelectedIndex: usePosSearchStore.getState().setSelectedIndex,
    setBusqueda: usePosSearchStore.getState().setBusqueda,
    setMultiplicador: usePosActionsStore.getState().setMultiplicadorPendiente,
    searchInputRef, productRefs, actions: keyboardActions
  });

  // --- RENDER ---
  if (!tieneAccesoPos) return null;

  const guideComponent = <ShortcutGuide isOpen={activeModal === 'AYUDA'} onClose={() => useUIStore.getState().closeModal()} />;

  if (configuracion.modoTouch) {
    return (
      <TouchLayout
        ticketRef={ticketRef}
        ticketSaldoRef={ticketSaldoRef}
        searchInputRef={searchInputRef}
      >
        {guideComponent}
      </TouchLayout>
    );
  }

  return (
    <DesktopLayout
      searchInputRef={searchInputRef}
      productRefs={productRefs}
      ticketRef={ticketRef}
      ticketSaldoRef={ticketSaldoRef}
      handleSearchInputKeyDown={handleSearchInputKeyDown}
      cartSelectedIndex={cartSelectedIndex}
      focusCartItem={focusCartItem}
    >
      {guideComponent}
    </DesktopLayout>
  );
}