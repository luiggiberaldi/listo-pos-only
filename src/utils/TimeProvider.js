// src/utils/TimeProvider.js
const GHOST_STORAGE_KEY = 'LISTO_GHOST_TIME_OFFSET';

class TimeProvider {
  constructor() {
    this.offset = 0;
    this.loadOffset();
  }

  loadOffset() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(GHOST_STORAGE_KEY);
        this.offset = saved ? parseInt(saved, 10) : 0;
      } else {
        this.offset = 0;
      }
      if (isNaN(this.offset)) this.offset = 0;
    } catch (e) {
      console.warn('Error loading time offset', e);
      this.offset = 0;
    }
  }

  saveOffset() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(GHOST_STORAGE_KEY, this.offset.toString());
    }
  }

  /**
   * Returns a Date object representing the current "simulated" time.
   * @returns {Date}
   */
  now() {
    return new Date(Date.now() + this.offset);
  }

  /**
   * Returns the current "simulated" timestamp in milliseconds.
   * @returns {number}
   */
  timestamp() {
    return Date.now() + this.offset;
  }

  /**
   * Replacement for new Date(args).
   * If value is provided, behaves like new Date(value).
   * If value is undefined, behaves like new Date() but adjusted for simulation.
   * @param {string|number|Date} [value]
   * @returns {Date}
   */
  date(value) {
    if (value !== undefined && value !== null) return new Date(value);
    return this.now();
  }

  toISOString() {
    return this.now().toISOString();
  }

  today() {
    const d = this.now();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  jumpTime(ms) {
    this.offset += ms;
    this.saveOffset();
    console.log(`[TimeProvider] Jumped ${ms}ms. New simulated time: ${this.now().toLocaleString()}`);
  }

  resetTime() {
    this.offset = 0;
    this.saveOffset();
    console.log(`[TimeProvider] Time reset to real now: ${this.now().toLocaleString()}`);
  }
}

export const timeProvider = new TimeProvider();
