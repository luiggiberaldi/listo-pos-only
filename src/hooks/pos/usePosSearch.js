import { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { useDebounce } from '../ui/useDebounce';
import { useInventoryStore } from '../../stores/useInventoryStore';

export const usePosSearch = () => { // Removed 'productos' prop
    const [busqueda, setBusqueda] = useState('');
    const debouncedBusqueda = useDebounce(busqueda, 300);
    const [categoriaActiva, setCategoriaActiva] = useState('Todo');
    const [selectedIndex, setSelectedIndex] = useState(0);

    // 🚀 ATOMIC SUBSCRIPTION: We only get what we need
    const categorias = useInventoryStore(state => state.categorias);
    const productos = useInventoryStore(state => state.productos);
    const searchIndex = useInventoryStore(state => state.searchIndex);

    // 🚀 MEMOIZED SEARCH (Fixes "getSnapshot" infinite loop)
    const filtrados = useMemo(() => {
        const term = debouncedBusqueda.toLowerCase();
        if (!term && categoriaActiva === 'Todo') return productos;

        if (!searchIndex) return productos; // Safety check

        return searchIndex
            .filter(item => {
                const matchesTerm = !term || item.str.includes(term);
                const matchesCat = categoriaActiva === 'Todo' || (item.original.categoria || 'General') === categoriaActiva;
                return matchesTerm && matchesCat;
            })
            .map(item => item.original);
    }, [productos, searchIndex, debouncedBusqueda, categoriaActiva]);

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
