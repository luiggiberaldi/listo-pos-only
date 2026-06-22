// ✅ SYSTEM IMPLEMENTATION - V. 1.0 (KEYBOARD CONTROLLER)
// Archivo: src/hooks/ui/usePosKeyboard.js
// Responsabilidad: Gestión centralizada de atajos de teclado para el POS.

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

export const usePosKeyboard = ({
  cajaAbierta,
  tieneAccesoPos,
  isProcessing,
  modalesAbiertos, // { pago, espera, pesar, jerarquia, exito, ayuda }
  carrito,
  busqueda,
  filtrados,
  productos, // 🆕 Full Product List for Scale PLU Lookup
  selectedIndex,
  setSelectedIndex,
  setBusqueda,
  setMultiplicador,
  searchInputRef,
  productRefs,
  actions // { limpiar, cobrar, cambiarCant, eliminarItem, prepararAgregar, playSound }
}) => {

  // --- NAVEGACIÓN DE CESTA (Clic y Flechas) ---
  const [cartSelectedIndex, setCartSelectedIndex] = useState(0);

  // Auto-seleccionar el último item al agregar al carrito
  useEffect(() => {
    if (carrito.length > 0) {
      setCartSelectedIndex(carrito.length - 1);
    } else {
      setCartSelectedIndex(0);
    }
  }, [carrito.length]);

  // --- ⚖️ ALGORITMO DE BALANZA (EAN-13 PESO VARIABLE) ---
  useEffect(() => {
    if (!busqueda || !cajaAbierta || isProcessing || !productos) return;

    // Regla 1: Longitud Validada (12-13 dígitos) y Numérico
    if (busqueda.length >= 12 && busqueda.length <= 13 && /^\d+$/.test(busqueda)) {

      // Regla 2: Prefijo '20' (Estándar Venezuela/Latam)
      if (busqueda.startsWith('20')) {

        // A. Extraer PLU (Posición 2-6: 4 chars) "20[AAAA]..."
        const pluStr = busqueda.substring(2, 6);

        // B. Extraer Peso (Posición 6-11: 5 chars) "...[BBBBB]C"
        const pesoStr = busqueda.substring(6, 11);

        // C. Calcular Peso (Divisor 1000)
        const pesoCalculado = parseFloat(pesoStr) / 1000;

        if (pesoCalculado > 0) {
          // D. Búsqueda Inteligente (Smart Match)
          // Busca '0105' (como está en el código) O '105' (entero)
          const productoEncontrado = productos.find(p =>
            p.codigo === pluStr ||
            p.codigo === parseInt(pluStr).toString()
          );

          if (productoEncontrado) {
            console.log(`⚖️ [SCALE SCANNER] PLU: ${pluStr} -> ${productoEncontrado.nombre} | Peso: ${pesoCalculado} Kg`);

            // Limpiar input ANTES de procesar para evitar doble lectura
            setBusqueda('');

            // ACCIÓN: Agregar con Peso (Forzamos tipoUnidad 'peso' para lógica de precio)
            // Nota: El precio base se toma del producto, agregarAlCarrito calculará el total.
            actions.agregarAlCarrito(productoEncontrado, pesoCalculado, productoEncontrado.tipoUnidad || 'peso', productoEncontrado.precio);

            if (actions.playSound) actions.playSound('BEEP');

            const Toast = Swal.mixin({ toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000 });
            const sufijo = productoEncontrado.tipoUnidad === 'litro' ? 'Lt' : 'Kg';
            Toast.fire({ icon: 'success', title: `${pesoCalculado.toFixed(3)} ${sufijo} encontrados`, text: productoEncontrado.nombre });
            return;
          }
        }
      }
    }
  }, [busqueda, productos, cajaAbierta, isProcessing, actions, setBusqueda]);

  // --- ATAJOS GLOBALES (F-Keys y Navegación Carrito) ---
  useEffect(() => {
    const handleGlobalKeys = (e) => {
      // 1. Bloqueos de Seguridad
      if (!cajaAbierta || !tieneAccesoPos || isProcessing) return;

      // 2. Bloqueo por Modales (Si hay un modal, el teclado global se apaga)
      if (Object.values(modalesAbiertos).some(isOpen => isOpen)) return;

      const isTyping = document.activeElement && (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.isContentEditable
      );

      // --- COMANDOS DE FUNCIÓN ---
      if (e.key === 'F2' || (e.key === 'Enter' && !isTyping)) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (e.key === 'F4') { e.preventDefault(); actions.limpiar(); }
      if (e.key === 'F9') { e.preventDefault(); actions.cobrar(); }
      if (e.key === 'F6') { e.preventDefault(); actions.espera(); }

      // --- COMANDOS DE CARRITO (+ / - / Del / Flechas) ---
      if (!isTyping && carrito.length > 0) {
        // Asegurar que el índice seleccionado sea válido
        const idx = Math.max(0, Math.min(cartSelectedIndex, carrito.length - 1));
        const item = carrito[idx];

        if (!item) return;

        // Flechas para navegar la cesta
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setCartSelectedIndex(Math.max(0, idx - 1));
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setCartSelectedIndex(Math.min(carrito.length - 1, idx + 1));
          return;
        }

        // Acciones sobre el item seleccionado
        if (e.key === '+' || e.key === 'Add') {
          e.preventDefault();
          actions.cambiarCant(idx, item.cantidad + ((item.tipoUnidad === 'peso' || item.tipoUnidad === 'litro') ? 0.05 : 1));
        }
        if (e.key === '-' || e.key === 'Subtract') {
          e.preventDefault();
          actions.cambiarCant(idx, item.cantidad - ((item.tipoUnidad === 'peso' || item.tipoUnidad === 'litro') ? 0.05 : 1));
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          actions.eliminarItem(idx);
          if (carrito.length <= 1) {
            searchInputRef.current?.focus(); // Volver al inicio si se vacía
          } else {
            setCartSelectedIndex(Math.max(0, idx - 1)); // Seleccionar el anterior
          }
          return;
        }

        // Salir del carrito
        if (e.key === 'Enter') {
          e.preventDefault();
          searchInputRef.current?.focus(); // Vuelve al buscador
          return;
        }

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          // Al pulsar izquierda desde el carrito, volvemos a la cuadrícula de productos
          // Si no hay ninguno seleccionado, seleccionamos el primero
          if (selectedIndex === -1) {
            setSelectedIndex(0);
          }
          // Para que el grid reciba eventos, debe estar en modo typing o al menos no en carrito exclusivamente.
          // Una forma de "activar" el grid es que no se intercepte como carrito, pero carrito siempre se intercepta si !isTyping.
          // Para romper esto, basta devolver el foco al input pero manteniendo el selectedIndex
          searchInputRef.current?.focus();
          return;
        }
      }

      // --- AYUDA (?) ---
      if (e.key === '?' || e.key === 'Help') {
        e.preventDefault();
        actions.toggleAyuda();
      }

      // --- ESCAPE (Limpiar búsqueda) ---
      if (e.key === 'Escape') {
        if (modalesAbiertos.ayuda) {
          actions.toggleAyuda();
          return;
        }
        if (isTyping) {
          if (busqueda) setBusqueda('');
          else searchInputRef.current.blur();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [cajaAbierta, tieneAccesoPos, isProcessing, modalesAbiertos, carrito, busqueda, cartSelectedIndex, selectedIndex, setSelectedIndex, actions]);

  // --- ATAJOS DE BÚSQUEDA (Input Focus) ---
  const handleSearchInputKeyDown = (e) => {
    if (!cajaAbierta || isProcessing) return;

    // A. MULTIPLICADOR (*) o TRANSFORMADOR (Empty)
    if (e.key === '*') {
      e.preventDefault();

      // 1. TRANSFORMADOR: Si no hay números en búsqueda, transformamos el último item
      if (!busqueda) {
        if (carrito.length === 0) return;
        const idx = carrito.length - 1;
        const item = carrito[idx];
        if (item.tipoUnidad === 'peso' || item.tipoUnidad === 'litro') return;

        // Lógica de ciclo de Jerarquía
        const current = item.unidadVenta || 'unidad';
        const bulto = item.jerarquia?.bulto;
        const paq = item.jerarquia?.paquete;

        let next = 'unidad';
        let nextLabel = 'UNIDAD';

        // Ciclo: Unidad -> Paquete -> Bulto -> Unidad
        if (current === 'unidad') {
          if (paq?.activo && paq.seVende !== false) { next = 'paquete'; nextLabel = 'PAQUETE'; }
          else if (bulto?.activo && bulto.seVende !== false) { next = 'bulto'; nextLabel = 'BULTO'; }
        } else if (current === 'paquete') {
          if (bulto?.activo && bulto.seVende !== false) { next = 'bulto'; nextLabel = 'BULTO'; }
          else { next = 'unidad'; nextLabel = 'UNIDAD'; }
        } else {
          next = 'unidad'; nextLabel = 'UNIDAD';
        }

        if (next === current) return; // No hay cambios posibles

        // Calcular equivalencia: MANTENER CANTIDAD NOMINAL (Corrección de error de escaneo)
        // Ej: 1 Unidad -> 1 Bulto (no 0.05 Bultos)
        const nextQty = item.cantidad;

        // Ejecutar transformación (Atomic Swap)
        if (actions.agregarAlCarrito && actions.eliminarItem) {
          actions.eliminarItem(idx);

          // Precio correcto para la nueva unidad
          let nextPrice = parseFloat(item.precio); // fallback
          if (next === 'bulto') nextPrice = parseFloat(bulto.precio);
          else if (next === 'paquete') nextPrice = parseFloat(paq.precio);
          else nextPrice = parseFloat(item.jerarquia.unidad.precio); // unidad base

          actions.agregarAlCarrito(item, nextQty, next, nextPrice);

          if (actions.playSound) actions.playSound('BEEP');

          const Toast = Swal.mixin({ toast: true, position: 'bottom', showConfirmButton: false, timer: 1000 });
          Toast.fire({ icon: 'success', title: `Cambiado a: ${nextLabel}` });
        }
        return;
      }

      // 2. MULTIPLICADOR (Si hay texto)
      const cant = parseInt(busqueda);
      if (!isNaN(cant) && cant > 0) {
        setMultiplicador(cant);
        setBusqueda('');
        if (actions.playSound) actions.playSound('BEEP');
        const Toast = Swal.mixin({ toast: true, position: 'top', showConfirmButton: false, timer: 1500 });
        Toast.fire({ icon: 'info', title: `Multiplicador Activado: x${cant}` });
      }
      return;
    }

    // B. VENTA RÁPIDA (+ / -)
    const esTeclaMas = e.key === '+' || e.key === 'Add';
    const esTeclaMenos = e.key === '-' || e.key === 'Subtract';

    if ((esTeclaMas || esTeclaMenos) && busqueda !== '') {
      const montoBs = parseFloat(busqueda);
      if (!isNaN(montoBs) && montoBs > 0) {
        e.preventDefault();
        actions.ventaRapida(montoBs, esTeclaMenos); // Menos = Gravado
        return;
      }
    }

    // C. SELECCIÓN (Enter) — debe ir ANTES de la navegación grid
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtrados.length === 0) return;

      // 1. Scanner Speed: Match exacto por código (Lector de código de barras) -> directo a cesta
      if (busqueda && selectedIndex === -1) {
        const exactMatch = filtrados.find(p => p.codigo?.toLowerCase() === busqueda.toLowerCase());
        if (exactMatch) {
          actions.prepararAgregar(exactMatch);
          return;
        }
      }

      // 2. Si ya navegó con flechas o ya marcó uno previamente -> despachar a cesta
      if (selectedIndex !== -1) {
        const productoSeleccionado = filtrados[selectedIndex];
        if (productoSeleccionado) {
          actions.prepararAgregar(productoSeleccionado);
          return;
        }
      }

      // 3. Primer Enter tras buscar texto: Solo selecciona (resalta) el primer producto
      setSelectedIndex(0);
      return;
    }

    // D. NAVEGACIÓN GRID (Flechas)
    if (filtrados.length === 0) return;

    const width = window.innerWidth;
    let cols = 2;
    if (width >= 1536) cols = 5;
    else if (width >= 1280) cols = 4;
    else if (width >= 768) cols = 3;

    const total = filtrados.length;
    let nextIndex = selectedIndex;

    // Si aún no hemos entrado al grid (foco en buscador, selectedIndex === -1)
    if (selectedIndex === -1) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(0);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (carrito.length > 0) {
          searchInputRef.current?.blur(); // Quita el foco del buscador para activar la cesta
        }
      }
      return;
    }

    // Lógica normal de grid si ya estamos adentro
    if (e.key === 'ArrowRight') { e.preventDefault(); nextIndex = (selectedIndex + 1) % total; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); nextIndex = (selectedIndex - 1 + total) % total; }
    if (e.key === 'ArrowDown') { e.preventDefault(); nextIndex = Math.min(selectedIndex + cols, total - 1); }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (selectedIndex < cols) {
        nextIndex = -1;
      } else {
        nextIndex = Math.max(selectedIndex - cols, 0);
      }
    }

    if (nextIndex !== selectedIndex) {
      setSelectedIndex(nextIndex);
    }
  };

  return {
    handleSearchInputKeyDown,
    cartSelectedIndex,
    focusCartItem: (idx) => {
      setCartSelectedIndex(idx);
      searchInputRef.current?.blur(); // IMPORTANTE: Forza quitar el foco del buscador para que + y - funcionen en la cesta
    }
  };
};