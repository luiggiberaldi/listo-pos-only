import { create } from 'zustand';
import { ghostMiddleware } from '../utils/ghost/ghostMiddleware';

// Sound System (Global Audio Context)
const playAudio = (type) => {
    // Simple mapping, can be expanded
    const sounds = {
        BEEP: { freq: 880, type: 'sine', duration: 0.1 },
        TRASH: { freq: 150, type: 'sawtooth', duration: 0.3 },
        ERROR: { freq: 100, type: 'square', duration: 0.5 },
        SUCCESS: { freq: 1200, type: 'sine', duration: 0.5 },
        CASH: { freq: [800, 1200], type: 'sine', duration: 0.2 }, // Chime
    };

    // Web Audio API logic (Basic)
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const cfg = sounds[type] || sounds.BEEP;

        osc.type = cfg.type;
        osc.frequency.setValueAtTime(Array.isArray(cfg.freq) ? cfg.freq[0] : cfg.freq, ctx.currentTime);
        if (Array.isArray(cfg.freq)) {
            osc.frequency.linearRampToValueAtTime(cfg.freq[1], ctx.currentTime + cfg.duration);
        }

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + cfg.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + cfg.duration);
    } catch (e) { console.error("Sound Error", e); }
};

export const useUIStore = create(ghostMiddleware((set) => ({
    // GLOBAL PROCESSING STATE
    isProcessing: false,
    setIsProcessing: (val) => set({ isProcessing: val }),

    // SOUND SYSTEM
    playSound: (type) => playAudio(type),

    // SIDEBAR STATE
    isSidebarOpen: false,
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    closeSidebar: () => set({ isSidebarOpen: false }),
    openSidebar: () => set({ isSidebarOpen: true }),

    // MODAL STATE (General Purpose)
    activeModal: null, // string key or null
    modalData: null,
    openModal: (key, data = null) => set({ activeModal: key, modalData: data }),
    closeModal: () => set({ activeModal: null, modalData: null })
}), 'UIStore'));
