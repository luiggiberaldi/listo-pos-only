import { create } from 'zustand';
import { ghostMiddleware } from '../utils/ghost/ghostMiddleware';

// Sound System (Global Audio Context)
import { useConfigStore } from './useConfigStore';

// Sound System (Global Audio Context)
const playAudio = (type) => {
    // 1. VERIFICAR CONFIGURACIÓN GLOBAL (MUTE)
    try {
        const config = useConfigStore.getState().configuracion;
        if (config && (config.sonidoBeep === false || config.mutearSonidos === true)) {
            // console.log('🔇 [GlobalSound] MUTEADO por configuración');
            return;
        }
    } catch (e) { console.warn('Error reading config check', e); }

    console.log(`🔊 [GlobalSound] PLAYING: ${type}`);

    // Web Audio API logic (Premium)
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        // --- SONIDOS PREMIUM V2.0 ---

        if (type === 'BEEP' || type === 'SCAN') {
            // 📊 BEEP DE SCANNER PROFESIONAL: Doble tono armónico
            const playTone = (freq, time, vol = 0.08) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
                gain.gain.setValueAtTime(vol, ctx.currentTime + time);
                gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + time + 0.08);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + time);
                osc.stop(ctx.currentTime + time + 0.08);
            };
            playTone(1568, 0, 0.1);     // G6 - Tono principal
            playTone(2349.32, 0, 0.05); // D7 - Armónico para profundidad
            return;
        }

        if (type === 'SUCCESS' || type === 'CASH') {
            // 💎 VENTAS EXITOSAS: Secuencia de campanas y monedas
            // Campana Principal
            const mainBell = (freq, delay, vol = 0.22) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = freq;
                filter.Q.value = 12;
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
                gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
                gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + delay + 0.7);
                osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
                osc.start(ctx.currentTime + delay);
                osc.stop(ctx.currentTime + delay + 0.7);
            };
            // Monedas
            const coinDrop = () => {
                [0.38, 0.42, 0.47].forEach(delay => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = 2200 + Math.random() * 600;
                    gain.gain.setValueAtTime(0.025, ctx.currentTime + delay);
                    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + delay + 0.09);
                    osc.connect(gain); gain.connect(ctx.destination);
                    osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.09);
                });
            };

            mainBell(2093, 0, 0.24);
            mainBell(1661.22, 0.05, 0.20);
            mainBell(1318.51, 0.10, 0.16);
            coinDrop();
            return;
        }

        if (type === 'ERROR') {
            // ERROR CRÍTICO
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.4);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.4);
            return;
        }

        if (type === 'CLICK') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.05);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.05);
            return;
        }

        if (type === 'TRASH') {
            // 🗑️ PAPELERA: Tono descendente rápido (efecto de caída/eliminación)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            // De 150Hz a 50Hz (grave)
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.25);

            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, ctx.currentTime);
            filter.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.25);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start(); osc.stop(ctx.currentTime + 0.25);
            return;
        }

        // Fallback for others
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.1);

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
