// ============================================================
// ⏱️ SIM TIMEKEEPER — Control de Tiempo Simulado
// ============================================================
// Acelera el reloj para simular días en segundos.
// Integra con TimeProvider del POS para que todas las fechas
// generadas por el sistema sean coherentes con la simulación.

/**
 * Estado reactivo del reloj simulado.
 * Se usa como módulo singleton — no es un hook React.
 */
class SimTimekeeper {
    constructor() {
        this.fechaActual = new Date();
        this.horaActual = 6; // Empieza a las 6 AM
        this.minutoActual = 0;
        this.diaInicio = null;
        this.diasSimulados = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.velocidad = 3; // Segundos reales por día simulado
        this._listeners = new Set();
        this._timerId = null;
    }

    /**
     * Registra un listener que se llama cada vez que cambia el estado.
     * Retorna función para desuscribirse.
     */
    subscribe(listener) {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }

    _notify() {
        const state = this.getState();
        for (const fn of this._listeners) {
            try { fn(state); } catch (e) { /* silenciar errores de listeners */ }
        }
    }

    getState() {
        return {
            fechaActual: new Date(this.fechaActual),
            horaActual: this.horaActual,
            minutoActual: this.minutoActual,
            diasSimulados: this.diasSimulados,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            velocidad: this.velocidad,
            fechaFormateada: this._formatFecha(),
            horaFormateada: this._formatHora(),
            diaSemana: this._getDiaSemana(),
            diaDelMes: this.fechaActual.getDate(),
        };
    }

    _formatFecha() {
        return this.fechaActual.toLocaleDateString('es-VE', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        });
    }

    _formatHora() {
        const h = String(this.horaActual).padStart(2, '0');
        const m = String(this.minutoActual).padStart(2, '0');
        return `${h}:${m}`;
    }

    _getDiaSemana() {
        return this.fechaActual.getDay(); // 0=Dom, 1=Lun...6=Sáb
    }

    /**
     * Genera un ISO timestamp coherente con la hora simulada.
     * Útil para logs/ventas que necesitan una fecha realista.
     */
    generarTimestamp(horaOverride = null, minutoOverride = null) {
        const d = new Date(this.fechaActual);
        d.setHours(horaOverride ?? this.horaActual);
        d.setMinutes(minutoOverride ?? this.minutoActual);
        d.setSeconds(Math.floor(Math.random() * 60));
        d.setMilliseconds(Math.floor(Math.random() * 1000));
        return d.toISOString();
    }

    /**
     * Configura la fecha de inicio de la simulación.
     */
    configurar({ fechaInicio, velocidad }) {
        if (fechaInicio) {
            this.fechaActual = new Date(fechaInicio);
            this.diaInicio = new Date(fechaInicio);
        }
        if (velocidad) this.velocidad = velocidad;
        this.diasSimulados = 0;
        this.horaActual = 6;
        this.minutoActual = 0;
        this._notify();
    }

    /**
     * Avanza la hora simulada dentro del día.
     * Retorna true si todavía es horario laboral (6-22h).
     */
    avanzarHora() {
        this.minutoActual += 15; // Avanza 15 minutos
        if (this.minutoActual >= 60) {
            this.minutoActual = 0;
            this.horaActual++;
        }
        this._notify();
        return this.horaActual < 22; // Abierto hasta las 10 PM
    }

    /**
     * Avanza al siguiente día. Resetea hora a 6 AM.
     */
    siguienteDia() {
        this.fechaActual.setDate(this.fechaActual.getDate() + 1);
        this.horaActual = 6;
        this.minutoActual = 0;
        this.diasSimulados++;
        this._notify();
    }

    /**
     * Verifica si el día actual es feriado venezolano o fin de semana.
     */
    esDiaEspecial() {
        const dow = this._getDiaSemana();
        const mes = this.fechaActual.getMonth() + 1;
        const dia = this.fechaActual.getDate();

        // Fin de semana
        if (dow === 0) return 'DOMINGO';
        if (dow === 6) return 'SABADO';

        // Feriados VE principales
        const feriados = [
            [1, 1], [2, 12], [2, 13], // Año nuevo, Carnaval
            [3, 19], // San José
            [4, 17], [4, 18], // Semana Santa aprox
            [4, 19], // 19 de Abril
            [5, 1], // Día del Trabajador
            [6, 24], // Batalla de Carabobo
            [7, 5], // Independencia
            [7, 24], // Simón Bolívar
            [10, 12], // Resistencia Indígena
            [12, 24], [12, 25], [12, 31] // Navidad / Fin de año
        ];

        for (const [m, d] of feriados) {
            if (mes === m && dia === d) return 'FERIADO';
        }

        // Quincena (1-5 y 15-20 del mes)
        if ((dia >= 1 && dia <= 5) || (dia >= 15 && dia <= 20)) return 'QUINCENA';

        return null;
    }

    /**
     * Determina el tipo de día para el perfil de simulación.
     */
    getTipoDia() {
        const especial = this.esDiaEspecial();
        if (especial === 'FERIADO') return 'FERIADO';
        if (especial === 'DOMINGO') return 'LENTO';
        if (especial === 'SABADO') return 'FIN_DE_SEMANA';
        if (especial === 'QUINCENA') return 'QUINCENA';
        return Math.random() < 0.15 ? 'PICO' : 'NORMAL'; // 15% chance de pico aleatorio
    }

    pausar() {
        this.isPaused = true;
        this._notify();
    }

    reanudar() {
        this.isPaused = false;
        this._notify();
    }

    detener() {
        this.isRunning = false;
        this.isPaused = false;
        if (this._timerId) {
            clearTimeout(this._timerId);
            this._timerId = null;
        }
        this._notify();
    }

    iniciar() {
        this.isRunning = true;
        this.isPaused = false;
        this._notify();
    }

    /**
     * Espera un delay proporcional a la velocidad.
     * Si la velocidad = 3s/día y el día tiene ~64 slots de 15min (6AM-10PM),
     * cada slot dura ~47ms. Mínimo 20ms para no bloquear UI.
     */
    async esperarSlot() {
        const slotsPerDay = 64; // 16 horas * 4 slots/hora
        const msPerSlot = Math.max(20, (this.velocidad * 1000) / slotsPerDay);
        await new Promise(resolve => setTimeout(resolve, msPerSlot));
    }

    /**
     * Espera a que se despausa (si está pausado).
     */
    async esperarSiPausado() {
        while (this.isPaused && this.isRunning) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
}

// Singleton
export const simTimekeeper = new SimTimekeeper();
