import { create } from 'zustand';
import { ghostMiddleware } from '../utils/ghost/ghostMiddleware';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks'; // We can't use hooks inside Zustand stores directly.
// We have to subscribe to DB changes elsewhere or manual sync.
// For Phase 3 Performance, manual sync or specific subscription is better than auto-refreshing on every byte change.

export const useInventoryStore = create(ghostMiddleware((set, get) => ({
    productos: [],
    categorias: ['Todo'],

    // Index for fast search
    searchIndex: [],

    setProductos: (productos) => {
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
        if (!term && categoria === 'Todo') return state.productos;

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
