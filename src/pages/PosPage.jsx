// ✅ SYSTEM IMPLEMENTATION - V. 5.1 (FISCAL CONNECTION)
// Archivo: src/pages/PosPage.jsx
// Objetivo: Conectar el botón de pago con el Generador de Correlativos Fiscales.

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { useReactToPrint } from 'react-to-print';
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
import { useDebounce } from '../hooks/ui/useDebounce'; // 🟢 IMPORT

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

  // --- ESTADOS UI ---
  const [busqueda, setBusqueda] = useState('');
  const debouncedBusqueda = useDebounce(busqueda, 300); // ⚡ Debounce Input
  const [categoriaActiva, setCategoriaActiva] = useState('Todo');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 🆕 PRE-SELECCION CLIENTE
  const location = useLocation();
  const navigate = useNavigate();
  const [clientePreseleccionado, setClientePreseleccionado] = useState(null);

  useEffect(() => {
    if (location.state?.clienteSeleccionado) {
      setClientePreseleccionado(location.state.clienteSeleccionado);
      // abrirPago(); // ❌ REMOVED: User wants to stay in sales screen first

      // Show brief toast/notification that client is selected?
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: `Cliente: ${location.state.clienteSeleccionado.nombre}`,
        text: 'Seleccionado para la venta',
        timer: 3000,
        showConfirmButton: false
      });

      // Limpiar state para no reabrir al recargar
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]); // Safe dep array

  // --- ESTADOS MODALES (Refactorizado) ---
  const {
    modales,
    setModales,
    abrirPago, cerrarPago,
    abrirEspera, cerrarEspera,
    abrirPesaje, cerrarPesaje,
    abrirJerarquia, cerrarJerarquia
  } = usePosModals();

  // 🆕 TICKET REF
  const ticketSaldoRef = useRef(null);

  // --- ESTADOS UX ---
  const [multiplicadorPendiente, setMultiplicadorPendiente] = useState(1);
  const [ticketData, setTicketData] = useState(null);
  const [ventaExitosa, setVentaExitosa] = useState(false);

  // --- REFS ---
  const ticketRef = useRef();
  const searchInputRef = useRef(null);
  const productRefs = useRef([]);

  // --- CÁLCULOS ---
  const calculos = useCartCalculations(carrito, configuracion);
  const tasaCaida = calculos.tasa === 1;

  // 🚀 OPTIMIZATION: Memoized Filtering
  const filtrados = useMemo(() => productos.filter(p => {
    if (!debouncedBusqueda && categoriaActiva === 'Todo') return false;

    // Check text match using DEBOUNCED value
    const textoMatch = !debouncedBusqueda ||
      p.nombre.toLowerCase().includes(debouncedBusqueda.toLowerCase()) ||
      p.codigo.toLowerCase().includes(debouncedBusqueda.toLowerCase());

    const catMatch = categoriaActiva === 'Todo' || (p.categoria || 'General') === categoriaActiva;
    return textoMatch && catMatch;
  }), [productos, debouncedBusqueda, categoriaActiva]);

  const categorias = useMemo(() => ['Todo', ...new Set(productos.map(p => p.categoria || 'General'))], [productos]);

  useEffect(() => { setSelectedIndex(0); }, [debouncedBusqueda, categoriaActiva]);

  // --- ACCIONES DE NEGOCIO ---
  const actions = {
    limpiar: () => {
      if (carrito.length === 0 || isProcessing) return;
      ejecutarAccionSegura({
        permiso: PERMISOS.POS_VOID_TICKET,
        nombreAccion: 'Vaciar Cesta Completa',
        accion: () => {
          Swal.fire({
            title: '¿Vaciar Cesta?', text: 'Se eliminarán todos los productos.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, vaciar'
          }).then((r) => { if (r.isConfirmed) limpiarCarrito(); });
        }
      });
    },
    cobrar: () => {
      if (carrito.length === 0 || isProcessing) return;

      // 🛡️ VALIDACIÓN PREVIA DE STOCK (Fase 1: Antes de abrir modal)
      if (configuracion && !configuracion.permitirSinStock) {
        const consumos = {};

        for (const item of carrito) {
          const id = item.id;
          if (item.tipoUnidad === 'peso') continue;

          let factor = 1;
          if (item.unidadVenta === 'bulto') {
            factor = parseFloat(item.jerarquia?.bulto?.contenido || 1);
            if (item.jerarquia?.paquete?.activo) factor *= parseFloat(item.jerarquia?.paquete?.contenido || 1);
          } else if (item.unidadVenta === 'paquete') {
            factor = parseFloat(item.jerarquia?.paquete?.contenido || 1);
          }

          if (!consumos[id]) consumos[id] = { req: 0, avail: parseFloat(item.stock || 0), name: item.nombre };
          consumos[id].req += item.cantidad * factor;
        }

        for (const id in consumos) {
          const c = consumos[id];
          if (c.req > c.avail + 0.001) {
            const diff = c.req - c.avail;
            Swal.fire('Stock Insuficiente', `${c.name} (Falta ${diff.toFixed(2)} Unds)`, 'error');
            return; // 🛑 BLOCK
          }
        }
      }

      abrirPago();
    },
    espera: async () => {
      if (carrito.length === 0) return;
      const { value: nota } = await Swal.fire({ title: 'Poner en Espera', input: 'text', inputPlaceholder: 'Nota opcional...', showCancelButton: true, confirmButtonText: 'Guardar', confirmButtonColor: '#f97316' });
      if (nota !== undefined) guardarEnEspera(nota, null, calculos.totalUSD);
    },
    cambiarCant: (idx, cant) => {
      if (isProcessing) return;
      const item = carrito[idx];
      if (!item) return;
      const minQty = item.tipoUnidad === 'peso' ? 0.005 : 1;
      let cantidadSegura = Math.max(cant, minQty);
      if (item.tipoUnidad === 'peso') cantidadSegura = Math.round(cantidadSegura * 1000) / 1000;
      else cantidadSegura = Math.floor(cantidadSegura);
      cambiarCantidadCarrito(idx, cantidadSegura);
    },
    eliminarItem: (idx) => {
      if (isProcessing) return;
      const item = carrito[idx];
      ejecutarAccionSegura({
        permiso: PERMISOS.POS_VOID_ITEM,
        nombreAccion: `Quitar ${item.nombre}`,
        accion: () => { eliminarDelCarrito(idx); }
      });
    },
    prepararAgregar: (producto) => {
      if (!cajaAbierta || isProcessing) return;
      const cantidadFinal = multiplicadorPendiente;
      if (multiplicadorPendiente !== 1) setMultiplicadorPendiente(1);

      // ⚖️ PESAJE (Siempre interrumpe si es balanza)
      if (producto.tipoUnidad === 'peso') {
        setBusqueda('');
        abrirPesaje(producto);
        searchInputRef.current?.blur();
        return;
      }

      // 🧠 SMART SCAN: PREFERENCIA DEL USUARIO
      const pref = producto.defaultScannedUnit; // 'ASK', 'UND', 'PAQ', 'BUL'

      let autoAdd = false;
      let unitType = 'unidad';
      let finalPrice = 0;

      // 1. Chequeo de Preferencia Explícita
      if (pref === 'UND' && producto.jerarquia?.unidad?.activo && producto.jerarquia.unidad.seVende !== false) {
        autoAdd = true;
        unitType = 'unidad';
        finalPrice = parseFloat(producto.jerarquia.unidad.precio);
      } else if (pref === 'PAQ' && producto.jerarquia?.paquete?.activo && producto.jerarquia.paquete.seVende !== false) {
        autoAdd = true;
        unitType = 'paquete';
        finalPrice = parseFloat(producto.jerarquia.paquete.precio);
      } else if (pref === 'BUL' && producto.jerarquia?.bulto?.activo && producto.jerarquia.bulto.seVende !== false) {
        autoAdd = true;
        unitType = 'bulto';
        finalPrice = parseFloat(producto.jerarquia.bulto.precio);
      }

      // 2. Chequeo de Opción Única (Si no hay preferencia explícita o es ASK)
      if (!autoAdd) {
        const validOptions = [];
        if (producto.jerarquia?.unidad?.activo && producto.jerarquia.unidad.seVende !== false) validOptions.push({ type: 'unidad', price: producto.jerarquia.unidad.precio });
        if (producto.jerarquia?.paquete?.activo && producto.jerarquia.paquete.seVende !== false) validOptions.push({ type: 'paquete', price: producto.jerarquia.paquete.precio });
        if (producto.jerarquia?.bulto?.activo && producto.jerarquia.bulto.seVende !== false) validOptions.push({ type: 'bulto', price: producto.jerarquia.bulto.precio });

        if (validOptions.length === 1) {
          autoAdd = true;
          unitType = validOptions[0].type;
          finalPrice = parseFloat(validOptions[0].price);
        }
      }

      // Si hay preferencia válida y precio correcto, agregamos directo
      if (autoAdd && !isNaN(finalPrice) && finalPrice > 0) {
        setBusqueda('');
        agregarAlCarrito(producto, cantidadFinal, unitType, finalPrice);
        setSelectedIndex(0);
        setTimeout(() => { if (searchInputRef.current) searchInputRef.current.blur(); }, 10);
        return;
      }

      // 📦 JERARQUÍA (Modal) - Solo si no hubo AutoAdd (y hay múltiples opciones)
      if (!autoAdd && (producto?.jerarquia?.bulto?.activo || producto?.jerarquia?.paquete?.activo)) {
        setBusqueda('');
        abrirJerarquia(producto);
        searchInputRef.current?.blur();
        return;
      }

      const precioBase = (!isNaN(parseFloat(producto.precio)) && parseFloat(producto.precio) > 0) ? parseFloat(producto.precio) : 0;
      agregarAlCarrito(producto, cantidadFinal, 'unidad', precioBase);

      setBusqueda(''); setSelectedIndex(0);
      setTimeout(() => { if (searchInputRef.current) searchInputRef.current.blur(); }, 10);
    },
    ventaRapida: (montoBs, aplicaIva) => {
      const tasa = configuracion.tasa || 1;
      const precioBaseUSD = parseFloat((montoBs / tasa).toFixed(6));
      const nombreProd = aplicaIva ? 'VARIOS (GRAVADO)' : 'VARIOS (EXENTO)';
      const productoRapido = { id: `QUICK-${Date.now()}`, nombre: nombreProd, tipoUnidad: 'unidad', stock: 999999, codigo: 'QUICK', aplicaIva: aplicaIva, exento: !aplicaIva };

      agregarAlCarrito(productoRapido, multiplicadorPendiente, 'unidad', precioBaseUSD);
      setMultiplicadorPendiente(1); setBusqueda(''); setSelectedIndex(0);
      setTimeout(() => searchInputRef.current?.blur(), 10);
    },
    playSound,
    agregarAlCarrito, // 🆕 Added for usePosKeyboard
    eliminarDelCarrito, // 🆕 Added for usePosKeyboard
    cambiarUnidad: cambiarUnidadCarrito // 🆕 Added for CartSidebar
  };

  // 📡 [SCANNER ENGINE]: Monitoreo de búsqueda en tiempo real para agregado automático
  useEffect(() => {
    if (!busqueda || busqueda.length < 3) return;
    if (!cajaAbierta || isProcessing) return;

    const exactMatch = productos.find(p => p.codigo?.toLowerCase() === busqueda.toLowerCase());

    if (exactMatch) {
      console.log("🚀 [SCANNER] Match detectado:", exactMatch.nombre);
      setBusqueda(''); // 🛑 STOP LOOP (Early Clear)
      actions.prepararAgregar(exactMatch);
    }
  }, [busqueda, productos, cajaAbierta, isProcessing, actions]);

  // --- HOOK DE TECLADO ---
  const { handleSearchInputKeyDown } = usePosKeyboard({
    cajaAbierta, tieneAccesoPos, isProcessing,
    modalesAbiertos: { ...modales, exito: ventaExitosa },
    carrito, busqueda, filtrados, productos, // 🆕 PASS FULL PRODUCTS LIST
    selectedIndex,
    setSelectedIndex, setBusqueda, setMultiplicador: setMultiplicadorPendiente,
    searchInputRef, productRefs, actions
  });

  // --- 🔴 FINALIZACIÓN DE VENTA (MODIFICADO) 🔴 ---
  const finalizarVenta = async (datosPago, imprimirTicket = false) => {
    cerrarPago(); // 🟢 USED HANDLER

    try {
      // 1. GENERAMOS EL NÚMERO FISCAL (000001, 000002...)
      let numeroFiscal = null;
      if (generarCorrelativo) {
        numeroFiscal = await generarCorrelativo('factura');
      } else {
        // Fallback de emergencia si no carga la función
        numeroFiscal = Date.now().toString().slice(-6);
      }

      // 2. CONSTRUIMOS LA VENTA CON EL ID CORRECTO
      const ventaFinal = {
        items: carrito,
        total: calculos.totalUSD,
        subtotal: calculos.subtotalBase,
        totalImpuesto: calculos.totalImpuesto,
        totalBS: calculos.totalBS,
        tasa: calculos.tasa,
        ivaPorcentaje: calculos.ivaGlobal,
        pagos: datosPago.metodos,
        cambio: datosPago.cambio,
        distribucionVuelto: datosPago.distribucionVuelto,
        esCredito: datosPago.esCredito || false,
        clienteId: datosPago.clienteId || null,
        clienteNombre: datosPago.clienteNombre || 'Consumidor Final', // ✅ NOMBRE EXPLICITO
        cliente: datosPago.cliente || null,                           // ✅ OBJETO CLIENTE
        deudaPendiente: datosPago.deudaPendiente || 0,
        fecha: new Date().toISOString(),

        // 🛑 AQUI INYECTAMOS EL NÚMERO SECUENCIAL
        idVenta: numeroFiscal, // "000001"
        numeroFactura: numeroFiscal, // Respaldo explícito
        referencia: `Factura #${numeroFiscal}`,
        esExento: calculos.totalImpuesto === 0, // 🟢 FIX: Bandera para Cierre de Caja
        igtfTotal: datosPago.igtfTotal || 0, // 🆕 IGTF PERSISTENCE FIX
        // 🔄 FIX BALANCE UPDATES 🔄
        montoVueltoDigital: datosPago.montoVueltoDigital || 0,
        vueltoCredito: !!datosPago.vueltoCredito,
        montoSaldoFavor: datosPago.montoSaldoFavor || 0
      };

      // 💉 INYECTAR PAGO CON SALDO A FAVOR (Para que salga en el ticket y se procese)
      if (ventaFinal.montoSaldoFavor > 0) {
        ventaFinal.pagos.push({
          metodo: 'SALDO A FAVOR',
          monto: ventaFinal.montoSaldoFavor,
          tipo: 'WALLET',
          currency: 'USD',
          medium: 'INTERNAL' // 🟢 Clave para que usePOS no lo sume a caja
        });
      }

      // 3. GUARDAMOS EN BASE DE DATOS
      const ventaProcesada = await registrarVenta(ventaFinal);

      // 4. ÉXITO VISUAL
      setVentaExitosa(true);
      if (playSound) playSound('CASH');

      // 🆕 CLEAR PRESELECTED CLIENT
      setClientePreseleccionado(null);

      setTimeout(() => {
        // Lógica de Impresión Secuencial
        const procesarImpresion = async () => {
          if (imprimirTicket) {
            setTicketData(ventaProcesada || ventaFinal);
            // 🕒 Esperar renderizado React
            await new Promise(r => setTimeout(r, 100));
            handlePrint();
            // 🕒 Esperar diálogo de impresión
            await new Promise(r => setTimeout(r, 1000));
          }

          if (ventaFinal.vueltoCredito || ventaFinal.deudaPendiente > 0) {
            setTicketData(ventaProcesada || ventaFinal);
            // 🛑 NO AUTO PRINT - User request manual print
            // await new Promise(r => setTimeout(r, 100));
            // handlePrintSaldo();
          }

          if (!imprimirTicket && !ventaFinal.vueltoCredito) {
            // Solo limpiar si no hay operaciones pendientes (pero ahora esperamos manual)
          }
        };

        procesarImpresion();

        // 🧠 SMART TIMEOUT: If there's a balance event, keep screen open longer (or indefinitely until user closes)
        const hasBalanceEvent = ventaFinal.vueltoCredito || ventaFinal.deudaPendiente > 0;

        if (!hasBalanceEvent) {
          setTimeout(() => {
            setVentaExitosa(false);
            if (!imprimirTicket) limpiarCarrito(); // Logic simplified
            searchInputRef.current?.focus();
          }, 2500);
        } else {
          // Keep open logic will be handled by UI (Manual close)
          // But we ensure we don't clear cart immediately
        }

      }, 50);

    } catch (err) {
      console.error("Venta fallida en UI:", err);
      Swal.fire('Error', err.message || 'No se pudo procesar la venta.', 'error');
    }
  };

  const handlePrint = useReactToPrint({ contentRef: ticketRef, content: () => ticketRef.current, documentTitle: 'Ticket', onAfterPrint: () => { limpiarCarrito(); setTicketData(null); } });
  const handlePrintSaldo = useReactToPrint({ contentRef: ticketSaldoRef, content: () => ticketSaldoRef.current, documentTitle: 'Ticket Saldo Favor' });

  const handleRecuperarTicket = async (ticket) => {
    if (carrito.length > 0) {
      const r = await Swal.fire({ title: 'Cesta Ocupada', text: 'Se borrará la compra actual.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sobrescribir', confirmButtonColor: '#d33' });
      if (!r.isConfirmed) return;
    }
    await recuperarDeEspera(ticket);
    cerrarEspera(); // 🟢 USED HANDLER
  };

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