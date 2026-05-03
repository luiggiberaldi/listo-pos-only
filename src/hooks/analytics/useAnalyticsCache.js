/**
 * useAnalyticsCache.js
 * Lightweight Zustand store that holds the last computed historical analytics result.
 * Prevents multiple mounts of useUnifiedAnalytics from running the expensive
 * full-history scan simultaneously.
 *
 * Usage:
 *   const { historical, setHistorical, isStale } = useAnalyticsCache();
 */
import { create } from 'zustand';

const CACHE_TTL_MS = 300_000; // 5-minute TTL for historical data

export const useAnalyticsCache = create((set, get) => ({
    // ── Historical totals cache ──────────────────────────────────
    historical: null,          // { total, ganancia } | null = not computed yet
    historicalAt: 0,           // timestamp of last computation

    // ── Pending flag: prevents duplicate concurrent scans ────────
    scanning: false,

    /** Returns true if cache is missing or older than TTL */
    isStale: () => {
        const { historical, historicalAt } = get();
        return !historical || Date.now() - historicalAt > CACHE_TTL_MS;
    },

    /** Store a freshly computed historical result */
    setHistorical: (data) => set({
        historical: data,
        historicalAt: Date.now(),
        scanning: false,
    }),

    /** Mark that a scan is in-flight so other instances don't start their own */
    beginScan: () => set({ scanning: true }),

    /** Force-invalidate (e.g. after a sale is recorded) */
    invalidate: () => set({ historical: null, historicalAt: 0 }),
}));
