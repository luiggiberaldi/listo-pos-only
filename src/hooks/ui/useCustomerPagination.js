import { useState, useMemo } from 'react';

export const useCustomerPagination = (todosLosClientes, itemsPorPagina = 20) => {
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL', 'DEBT', 'CREDIT'

  // 1. MOTOR DE FILTRADO
  const clientesFiltrados = useMemo(() => {
    if (!todosLosClientes) return [];
    let resultado = todosLosClientes;

    // A. Filtro por Estado (FÉNIX STANDARD: Uso directo de Deuda/Favor)
    if (filterMode === 'DEBT') {
      resultado = resultado.filter(c => (parseFloat(c.deuda) || 0) > 0.01);
    } else if (filterMode === 'CREDIT') {
      resultado = resultado.filter(c => (parseFloat(c.favor) || 0) > 0.01);
    }

    // B. Filtro por Búsqueda (Nombre, Cédula, Teléfono)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      resultado = resultado.filter(c =>
        (c.nombre || '').toLowerCase().includes(q) ||
        (c.documento || c.cedula || '').toLowerCase().includes(q) ||
        (c.telefono || '').toLowerCase().includes(q)
      );
    }

    // C. Ordenamiento (Alfabético por defecto)
    return [...resultado].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }, [todosLosClientes, busqueda, filterMode]);

  // 2. MOTOR DE PAGINACIÓN
  const totalItems = clientesFiltrados.length;
  const totalPaginas = Math.ceil(totalItems / itemsPorPagina) || 1;

  const datosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina;
    return clientesFiltrados.slice(inicio, inicio + itemsPorPagina);
  }, [clientesFiltrados, paginaActual, itemsPorPagina]);

  // 3. CONTROLADORES
  const irAPagina = (n) => setPaginaActual(Math.max(1, Math.min(n, totalPaginas)));

  return {
    datos: datosPaginados,
    totalItems,
    totalPaginas,
    paginaActual,
    busqueda, setBusqueda: (val) => { setBusqueda(val); setPaginaActual(1); },
    filterMode, setFilterMode: (val) => { setFilterMode(val); setPaginaActual(1); },
    irAPagina,
    siguientePagina: () => irAPagina(paginaActual + 1),
    anteriorPagina: () => irAPagina(paginaActual - 1)
  };
};