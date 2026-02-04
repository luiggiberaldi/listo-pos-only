import { useState, useMemo, useEffect, useRef } from 'react';

/**
 * Custom hook for CartSidebar logic.
 * Encapsulates state, scroll behavior, and business rules for quantity adjustments.
 */
export function useCartSidebar({ carrito, onChangeQty, isProcessing }) {
    const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'list'
    const [searchTerm, setSearchTerm] = useState('');
    const scrollContainerRef = useRef(null);

    // --- Business Rules Helpers ---
    const getMinQty = (tipoUnidad) => (tipoUnidad === 'peso' ? 0.005 : 1);
    const getStep = (tipoUnidad) => (tipoUnidad === 'peso' ? 0.05 : 1);

    // --- Filter Logic ---
    const filteredCart = useMemo(() => {
        if (!searchTerm) return carrito;
        const term = searchTerm.toLowerCase();
        return carrito.filter(item => item.nombre.toLowerCase().includes(term));
    }, [carrito, searchTerm]);

    // --- Smart View Logic (Zero-UI) ---
    // Switches view mode automatically based on item count
    useEffect(() => {
        if (carrito.length > 4) {
            if (viewMode !== 'list') setViewMode('list');
        } else {
            if (viewMode !== 'cards') setViewMode('cards');
        }
    }, [carrito.length, viewMode]);

    // --- Auto-Scroll Logic ---
    // Keeps the last item visible when cart changes
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [carrito.length, viewMode]);

    // --- Actions / Handlers ---

    const handleQtyChangeSafe = (index, item, delta) => {
        if (isProcessing) return;

        const min = getMinQty(item.tipoUnidad);
        const nuevaCantidad = item.cantidad + delta;

        if (nuevaCantidad < min) return;

        // Business Rule: Precision handling for 'peso' vs integer units
        const cantidadFinal = item.tipoUnidad === 'peso'
            ? Math.round(nuevaCantidad * 1000) / 1000
            : Math.floor(nuevaCantidad);

        onChangeQty(index, cantidadFinal);
    };

    const handleInputChangeSafe = (index, item, valueStr) => {
        if (isProcessing) return;

        const min = getMinQty(item.tipoUnidad);
        let val = parseFloat(valueStr);

        if (isNaN(val)) val = min;
        if (val < min) val = min;

        onChangeQty(index, val);
    };

    return {
        viewMode,
        searchTerm,
        setSearchTerm,
        scrollContainerRef,
        filteredCart,
        handleQtyChangeSafe,
        handleInputChangeSafe,
        getStep,
        getMinQty
    };
}
