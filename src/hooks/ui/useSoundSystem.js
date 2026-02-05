import { useCallback } from 'react';

/**
 * 🎵 SISTEMA DE SONIDO OMEGA V2.0 (Zero Dependencies)
 * Genera sonidos sintéticos usando la Web Audio API.
 * Garantiza supervivencia en entornos sin internet.
 */
export const useSoundSystem = (configuracion) => {

  const play = useCallback((type) => {
    // DEBUG: Ver configuración actual
    console.log('🔊 Sound System Config:', configuracion);
    console.log('🔊 sonidoBeep:', configuracion?.sonidoBeep);
    console.log('🔊 mutearSonidos:', configuracion?.mutearSonidos);

    // 1. MUTE SWITCH: Respetamos la configuración del usuario
    if (configuracion && (configuracion.sonidoBeep === false || configuracion.mutearSonidos === true)) {
      console.log('🔇 SONIDOS MUTEADOS');
      return;
    }

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();

      // --- GENERADOR DE FRECUENCIAS ---

      if (type === 'SCAN' || type === 'BEEP') {
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
        // 💎 CAJA REGISTRADORA ULTRA-PREMIUM V2.0

        // Campana Principal con filtro de banda
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

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.7);
        };

        // Armónicos metálicos para brillo
        const shimmer = (baseFreq, delay) => {
          [1, 1.5, 2, 2.5, 3].forEach((mult, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = baseFreq * mult;
            const vol = 0.04 / (i + 1);
            gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + delay + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.5);
          });
        };

        // Cajón mecánico mejorado
        const mechanicalSlide = () => {
          const noise = ctx.createBufferSource();
          const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.45, ctx.sampleRate);
          const data = buffer.getChannelData(0);

          for (let i = 0; i < data.length; i++) {
            const decay = 1 - (i / data.length);
            data[i] = (Math.random() * 2 - 1) * 0.018 * decay;
          }
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(320, ctx.currentTime + 0.2);
          filter.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.55);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.16, ctx.currentTime + 0.2);
          gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.6);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          noise.start(ctx.currentTime + 0.2);
        };

        // Monedas cayendo
        const coinDrop = () => {
          [0.38, 0.42, 0.47].forEach(delay => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 2200 + Math.random() * 600;
            gain.gain.setValueAtTime(0.025, ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + delay + 0.09);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.09);
          });
        };

        // SECUENCIA ORQUESTADA
        mainBell(2093, 0, 0.24);        // C7 - Campana ultra-aguda
        mainBell(1661.22, 0.05, 0.20);  // G#6 - Segunda campana
        mainBell(1318.51, 0.10, 0.16);  // E6 - Tercera campana
        shimmer(2093, 0);                // Brillo metálico
        mechanicalSlide();               // Cajón deslizándose
        coinDrop();                      // Monedas cayendo

        return;
      }

      if (type === 'WARNING') {
        // ⚠️ ADVERTENCIA PROFESIONAL: Triple beep ascendente
        const playBeep = (freq, time, duration = 0.15) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + time);
          gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + time + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + time);
          osc.stop(ctx.currentTime + time + duration);
        };
        playBeep(740, 0, 0.12);    // F#5 - Primera alerta
        playBeep(880, 0.15, 0.12); // A5 - Segunda alerta
        playBeep(1046.5, 0.3, 0.2); // C6 - Alerta final más larga
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
        // 🗑️ BORRAR: Pop descendente con swoosh
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
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