// ✅ usePosSearchStore.js — Cerebro de Búsqueda/Filtros
// Reemplaza el hook usePosSearch.js con un store Zustand.
// Los componentes (PosHeader, ProductGrid) se conectan directamente.

import { create } from 'zustand';
import { ghostMiddleware } from '../utils/ghost/ghostMiddleware';
import { useInventoryStore } from './useInventoryStore';

// --- DEBOUNCE INTERNALS ---
let _debounceTimer = null;
const DEBOUNCE_MS = 300;

export const usePosSearchStore = create(ghostMiddleware((set, get) => ({
    // --- STATE ---
    busqueda: '',
    debouncedBusqueda: '',
    categoriaActiva: 'Todo',
    selectedIndex: -1,
    filtrados: [],

    // --- SETTERS ---
    setBusqueda: (val) => {
        set({ busqueda: val });

        // Debounce: schedule filtrado after 300ms of inactivity
        clearTimeout(_debounceTimer);
        _debounceTimer = setTimeout(() => {
            set({ debouncedBusqueda: val, selectedIndex: -1 });
            get()._recalcFiltrados();
        }, DEBOUNCE_MS);
    },

    setCategoriaActiva: (cat) => {
        set({ categoriaActiva: cat, selectedIndex: -1 });
        get()._recalcFiltrados();
    },

    setSelectedIndex: (idx) => set({ selectedIndex: idx }),

    // --- INTERNAL: Recalculate filtered products ---
    _recalcFiltrados: () => {
        const { debouncedBusqueda, categoriaActiva } = get();
        const { productos, searchIndex } = useInventoryStore.getState();

        const term = debouncedBusqueda.toLowerCase();

        if (!term && categoriaActiva === 'Todo') {
            set({ filtrados: productos });
            return;
        }

        if (!searchIndex || searchIndex.length === 0) {
            set({ filtrados: productos });
            return;
        }

        const result = searchIndex
            .filter(item => {
                const matchesTerm = !term || item.str.includes(term);
                const matchesCat = categoriaActiva === 'Todo' || (item.original.categoria || 'General') === categoriaActiva;
                return matchesTerm && matchesCat;
            })
            .map(item => item.original);

        set({ filtrados: result });
    },

    // --- INIT: Sync with inventory when products change ---
    syncWithInventory: () => {
        const { productos } = useInventoryStore.getState();
        const { debouncedBusqueda, categoriaActiva } = get();

        if (!debouncedBusqueda && categoriaActiva === 'Todo') {
            set({ filtrados: productos });
        } else {
            get()._recalcFiltrados();
        }
    }
}), 'PosSearchStore'));

// --- REACTIVE SUBSCRIPTION ---
// When InventoryStore changes, re-sync filtrados
let _prevProductosRef = null;
useInventoryStore.subscribe((state) => {
    if (state.productos !== _prevProductosRef) {
        _prevProductosRef = state.productos;
        usePosSearchStore.getState().syncWithInventory();
    }
});
