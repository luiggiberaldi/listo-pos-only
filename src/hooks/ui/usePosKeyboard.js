// ✅ SYSTEM IMPLEMENTATION - V. 1.0 (KEYBOARD CONTROLLER)
// Archivo: src/hooks/ui/usePosKeyboard.js
// Responsabilidad: Gestión centralizada de atajos de teclado para el POS.

import { useEffect } from 'react';
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
            actions.agregarAlCarrito(productoEncontrado, pesoCalculado, 'peso', productoEncontrado.precio);

            if (actions.playSound) actions.playSound('BEEP');

            const Toast = Swal.mixin({ toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000 });
            Toast.fire({ icon: 'success', title: `${pesoCalculado.toFixed(3)} Kg encontrados`, text: productoEncontrado.nombre });
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

      const isTyping = document.activeElement === searchInputRef.current;

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

      // --- COMANDOS DE CARRITO (+ / - / Del) ---
      if (!isTyping && carrito.length > 0) {
        const idx = carrito.length - 1;
        const item = carrito[idx];

        if (e.key === '+' || e.key === 'Add') {
          e.preventDefault();
          actions.cambiarCant(idx, item.cantidad + (item.tipoUnidad === 'peso' ? 0.05 : 1));
        }
        if (e.key === '-' || e.key === 'Subtract') {
          e.preventDefault();
          actions.cambiarCant(idx, item.cantidad - (item.tipoUnidad === 'peso' ? 0.05 : 1));
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          actions.eliminarItem(idx);
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
  }, [cajaAbierta, tieneAccesoPos, isProcessing, modalesAbiertos, carrito, busqueda]);


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
        if (item.tipoUnidad === 'peso') return;

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

    // C. NAVEGACIÓN GRID (Flechas)
    if (filtrados.length === 0) return;

    // Detección de columnas responsive (Aprox)
    const width = window.innerWidth;
    let cols = 2;
    if (width >= 1280) cols = 5;
    else if (width >= 1024) cols = 4;
    else if (width >= 768) cols = 3;

    const total = filtrados.length;
    let nextIndex = selectedIndex;

    if (e.key === 'ArrowRight') { e.preventDefault(); nextIndex = (selectedIndex + 1) % total; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); nextIndex = (selectedIndex - 1 + total) % total; }
    if (e.key === 'ArrowDown') { e.preventDefault(); nextIndex = Math.min(selectedIndex + cols, total - 1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); nextIndex = Math.max(selectedIndex - cols, 0); }

    if (nextIndex !== selectedIndex) {
      setSelectedIndex(nextIndex);
      // 🚀 PERFORMANCE: Scrolling is now handled efficiently by the Virtualized Grid in the View (ProductGrid)
      // productRefs.current[nextIndex]?.scrollIntoView(...) -> REMOVED
    }

    // D. SELECCIÓN (Enter)
    if (e.key === 'Enter') {
      e.preventDefault();

      // 1. Prioridad: Match exacto con el texto ingresado (Scanner Speed)
      const exactMatch = filtrados.find(p => p.codigo?.toLowerCase() === busqueda.toLowerCase());
      if (exactMatch) {
        actions.prepararAgregar(exactMatch);
        return;
      }

      // 2. Fallback: Selección por índice visual
      const productoIndex = filtrados[selectedIndex];
      if (productoIndex) actions.prepararAgregar(productoIndex);
    }
  };

  return { handleSearchInputKeyDown };
};