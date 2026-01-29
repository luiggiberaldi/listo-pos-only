import { useCallback } from 'react';

/**
 * 🎵 SISTEMA DE SONIDO OMEGA (Zero Dependencies)
 * Genera sonidos sintéticos usando la Web Audio API.
 * Garantiza supervivencia en entornos sin internet.
 */
export const useSoundSystem = (configuracion) => {

  const play = useCallback((type) => {
    // 1. MUTE SWITCH: Respetamos la configuración del usuario
    if (configuracion && (configuracion.sonidoBeep === false || configuracion.mutearSonidos === true)) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();

      // --- GENERADOR DE FRECUENCIAS ---

      if (type === 'SCAN') {
        // BEEP DE SCANNER: Agudo, corto, metálico.
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
        return;
      }

      if (type === 'SUCCESS' || type === 'CASH') {
        // ÉXITO: Acorde ascendente (Do Mayor).
        const playNote = (freq, time) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
          gain.gain.setValueAtTime(0.1, ctx.currentTime + time);
          gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + time + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + time);
          osc.stop(ctx.currentTime + time + 0.3);
        };
        playNote(523.25, 0);    // C5
        playNote(659.25, 0.1);  // E5
        playNote(783.99, 0.2);  // G5
        playNote(1046.50, 0.3); // C6
        return;
      }

      if (type === 'WARNING') {
        // ADVERTENCIA (Atención): Dos tonos alternados.
        const playBeep = (freq, time) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
          gain.gain.setValueAtTime(0.1, ctx.currentTime + time);
          gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + time + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + time);
          osc.stop(ctx.currentTime + time + 0.2);
        };
        playBeep(880, 0);   // A5
        playBeep(440, 0.2); // A4
        return;
      }

      if (type === 'ERROR') {
        // ERROR CRÍTICO: Tono bajo y disonante.
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        return;
      }

      if (type === 'TRASH' || type === 'DELETE') {
        // BORRAR: Pop corto.
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
        return;
      }

      if (type === 'CLICK') {
        // CLICK: Impulso sutil.
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
        return;
      }

    } catch (error) {
      console.warn("Sound Engine Error:", error);
    }
  }, [configuracion]);

  return { play };
};