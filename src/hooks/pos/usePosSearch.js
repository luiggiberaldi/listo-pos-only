import { useState, useMemo, useEffect } from 'react';
import { useDebounce } from '../ui/useDebounce';

export const usePosSearch = (productos) => {
    const [busqueda, setBusqueda] = useState('');
    const debouncedBusqueda = useDebounce(busqueda, 300);
    const [categoriaActiva, setCategoriaActiva] = useState('Todo');
    const [selectedIndex, setSelectedIndex] = useState(0);

    // 🚀 OPTIMIZATION: Memoized Filtering
    const filtrados = useMemo(() => productos.filter(p => {
        if (!debouncedBusqueda && categoriaActiva === 'Todo') return false;

        // 🛡️ [REPAIR] Null check for Name/Code to avoid toLowerCase() crashes
        const term = debouncedBusqueda.toLowerCase();
        const nombre = (p.nombre || '').toLowerCase();
        const codigo = (p.codigo || '').toLowerCase();

        const textoMatch = !debouncedBusqueda ||
            nombre.includes(term) ||
            codigo.includes(term);

        const catMatch = categoriaActiva === 'Todo' || (p.categoria || 'General') === categoriaActiva;
        return textoMatch && catMatch;
    }), [productos, debouncedBusqueda, categoriaActiva]);

    const categorias = useMemo(() => ['Todo', ...new Set(productos.map(p => p.categoria || 'General'))], [productos]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [debouncedBusqueda, categoriaActiva]);

    return {
        busqueda, setBusqueda,
        debouncedBusqueda,
        categoriaActiva, setCategoriaActiva,
        categorias,
        filtrados,
        selectedIndex, setSelectedIndex
    };
};
