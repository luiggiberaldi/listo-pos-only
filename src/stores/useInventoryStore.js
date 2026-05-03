import { create } from 'zustand';
import { ghostMiddleware } from '../utils/ghost/ghostMiddleware';
import { db } from '../db';
// [MJ-4] Removed unused useLiveQuery import

export const useInventoryStore = create(ghostMiddleware((set, get) => ({
    productos: [],
    categorias: ['Todo'],

    // Index for fast search
    searchIndex: [],

    setProductos: (productos) => {
        // Skip index rebuild if products haven't changed
        if (get().productos.length === productos.length && get().productos[0]?.id === productos[0]?.id) {
            return; // Same dataset, skip expensive index rebuild
        }

        const cats = ['Todo', ...new Set(productos.map(p => p.categoria || 'General'))];

        // 🚀 INDEXED SEARCH GENERATION
        // Pre-calculate search strings: "CODE NAME CATEGORY" normalized
        const index = productos.map(p => ({
            id: p.id,
            str: `${p.codigo || ''} ${p.nombre || ''} ${p.categoria || ''}`.toLowerCase(),
            original: p
        }));

        set({ productos, categorias: cats, searchIndex: index });
    },

    loadProductos: async () => {
        try {
            const items = await db.productos.toArray();
            get().setProductos(items);
        } catch (e) {
            console.error("Error loading products:", e);
        }
    },

    // Optimized Search Action
    searchProductos: (term, categoria) => {
        const state = get();
        if (!term && categoria === 'Todas') return state.productos;

        const termLower = term.toLowerCase();

        // Use the pre-computed index
        return state.searchIndex
            .filter(item => {
                const matchesTerm = !term || item.str.includes(termLower);
                const matchesCat = categoria === 'Todo' || (item.original.categoria || 'General') === categoria;
                return matchesTerm && matchesCat;
            })
            .map(item => item.original);
    }
}), 'InventoryStore'));
