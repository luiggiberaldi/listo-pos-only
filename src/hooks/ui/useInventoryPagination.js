import { useState, useMemo } from 'react';

export const useInventoryPagination = (todosLosProductos, itemsPorPagina = 20) => {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');
  const [paginaActual, setPaginaActual] = useState(1);
  const [orden, setOrden] = useState('nombre-asc'); // Opciones: nombre-asc, nombre-desc, stock-asc, stock-desc

  // 1. MOTOR DE FILTRADO
  const productosFiltrados = useMemo(() => {
    if (!todosLosProductos) return [];
    let resultado = todosLosProductos;

    // A. Filtro por Categoría
    if (categoriaActiva !== 'Todas' && categoriaActiva !== 'General') {
      resultado = resultado.filter(p => p.categoria === categoriaActiva);
    }

    // B. Filtro por Búsqueda (Buscador Inteligente)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      resultado = resultado.filter(p => 
        (p.nombre || '').toLowerCase().includes(q) || 
        (p.codigo || '').toLowerCase().includes(q)
      );
    }

    // C. Ordenamiento
    resultado = [...resultado].sort((a, b) => {
        if (orden === 'nombre-asc') return (a.nombre || '').localeCompare(b.nombre || '');
        if (orden === 'nombre-desc') return (b.nombre || '').localeCompare(a.nombre || '');
        if (orden === 'stock-asc') return (parseFloat(a.stock)||0) - (parseFloat(b.stock)||0);
        if (orden === 'stock-desc') return (parseFloat(b.stock)||0) - (parseFloat(a.stock)||0);
        return 0;
    });

    return resultado;
  }, [todosLosProductos, busqueda, categoriaActiva, orden]);

  // 2. MOTOR DE PAGINACIÓN (Slicing)
  const totalItems = productosFiltrados.length;
  const totalPaginas = Math.ceil(totalItems / itemsPorPagina) || 1;

  const datosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina;
    return productosFiltrados.slice(inicio, inicio + itemsPorPagina);
  }, [productosFiltrados, paginaActual, itemsPorPagina]);

  // 3. CONTROLADORES
  const irAPagina = (n) => {
    const target = Math.max(1, Math.min(n, totalPaginas));
    setPaginaActual(target);
  };

  const cambiarBusqueda = (val) => {
    setBusqueda(val);
    setPaginaActual(1); // Reset a pág 1 al buscar
  };

  const cambiarCategoria = (cat) => {
    setCategoriaActiva(cat);
    setPaginaActual(1); // Reset a pág 1 al cambiar categoría
  };

  return {
    datos: datosPaginados,
    totalItems,
    totalPaginas,
    paginaActual,
    busqueda,
    categoriaActiva,
    orden,
    setBusqueda: cambiarBusqueda,
    setCategoriaActiva: cambiarCategoria,
    setOrden,
    irAPagina,
    siguientePagina: () => irAPagina(paginaActual + 1),
    anteriorPagina: () => irAPagina(paginaActual - 1)
  };
};