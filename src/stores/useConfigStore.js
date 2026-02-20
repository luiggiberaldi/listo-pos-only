import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ghostMiddleware } from '../utils/ghost/ghostMiddleware';
import { db } from '../db';
import Swal from 'sweetalert2';
import { loadWithSchema } from '../utils/schemaUtils';
import { appConfigSchema } from '../schemas/dataSchemas';
import { parseMoney } from '../utils/mathUtils';

// DEFAULT CONFIG
const DEFAULTS = {
    nombre: 'LISTO POS',
    direccion: '...', rif: '...', telefono: '...',
    mensaje: 'Gracias por preferir LISTO POS. Tu negocio, resuelto.',
    tasa: 0, tipoTasa: 'USD', fechaTasa: null, fuenteTasa: null, autoUpdateTasa: false,
    tasaReferencia: 0,
    autoUpdateFrecuencia: 0,
    modoRedondeo: 'exacto', modoCaja: 'global',
    monedaBase: 'USD',
    porcentajeIva: 16, ivaActivo: false,
    igtfActivo: false, igtfTasa: 3.00,
    pinAdmin: '123456',
    pinEmpleado: '000000',
    modoOscuro: false, tamanoLetra: 'normal',
    logoSizeSidebar: 120,
    logoSizeLogin: 135,
    permitirSinStock: false,
    ticketMoneda: 'hibrido',
    ticketMostrarTasa: true,
    ticketMostrarLogo: true,
    ticketLogoUrl: null,
    ticketWatermarkUrl: null,
    ticketDireccion: true,
    ticketRif: true,
    ticketHeaderMsg: 'Bienvenido a tu tienda',
    ticketPrecioUnitario: true,
    ticketAgrupar: true,
    ticketImpuestos: true,
    ticketAhorro: true,
    ticketCliente: true,
    ticketFooterMsg: 'Conserve su factura para reclamos',
    ticketAncho: '80mm',
    ticketFontSize: 11,
    ticketLineHeight: 1.1,
    ticketFontFamily: 'monospace',
    ticketFontWeight: 'normal',
    ticketMarginX: 2,
    ticketMarginY: 2,
    ticketFeedCut: 20,
    ticketSeparatorStyle: 'dashed',
    ticketTextOpacity: 1.0,
    ticketLogoContrast: 1.0,
    ticketLogoWidth: 60,
    ticketWatermarkY: 0,
    ticketWatermarkSize: 70,
    ticketWatermarkOpacity: 0.1
};

export const useConfigStore = create(
    ghostMiddleware(persist(
        (set, get) => ({
            configuracion: DEFAULTS,

            // 🛡️ DEMO SHIELD STATE (read from Firebase via useLicenseGuard → localStorage)
            license: {
                quotaLimit: parseInt(localStorage.getItem('listo_quotaLimit')) || 100,
                isDemo: localStorage.getItem('listo_isDemo') === 'true',
                usageCount: 0,
                isQuotaBlocked: false,
                plan: localStorage.getItem('listo_plan') || 'bodega',
            },

            // 👻 GHOST NEURAL QUOTA (Safety Counter)
            ghostStats: {
                apiCount: 0,
                lastReset: new Date().toLocaleDateString(),
                isBlocked: false
            },

            // ACTIONS
            setConfiguracion: (newConfig) => set(state => {
                const merged = { ...state.configuracion, ...newConfig };
                return { configuracion: merged };
            }),

            // 🏪 PLAN TIER ACTION
            setPlan: (planId) => set(state => ({
                license: { ...state.license, plan: planId }
            })),

            // 🛡️ DEMO CONFIG ACTION
            setDemoConfig: (isDemo, quotaLimit) => set(state => ({
                license: { ...state.license, isDemo, quotaLimit }
            })),

            loadConfig: async () => {
                try {
                    // Try DB first (General override)
                    const dbConf = await db.config.get('general');

                    // Merge strategies: DEFAULTS -> localStorage (via persist) -> DB
                    // Zustand persist handles localStorage automatically. 
                    // We just need to apply DB overrides if any specific needed.
                    // For now, let's assume persist matches 'listo-config'.

                    // 🛡️ SYNC DEMO SHIELD
                    const { getLifetimeSales } = await import('../db');
                    const usageCount = await getLifetimeSales();
                    const { license } = get();

                    set({
                        license: {
                            ...license,
                            usageCount,
                            isQuotaBlocked: license.isDemo && usageCount >= license.quotaLimit
                        }
                    });

                } catch (e) {
                    console.error("Error loading config:", e);
                }
            },

            // TASA LOGIC
            obtenerTasaBCV: async (forzar = false, monedaOverride = null, redondeoOverride = null) => {
                const { configuracion, setConfiguracion } = get();
                if (!forzar && !configuracion.autoUpdateTasa) return false;

                const tipoMoneda = monedaOverride || configuracion.tipoTasa || 'USD';

                if (forzar) {
                    Swal.fire({
                        title: 'Sincronizando Tasa...',
                        text: `Conectando con fuentes oficiales (${tipoMoneda})...`,
                        allowOutsideClick: false,
                        didOpen: () => Swal.showLoading(),
                        background: '#1e293b', color: '#fff'
                    });
                }


                // Providers List (Hardcoded here for store simplicity)
                const proveedores = [
                    {
                        id: 'GOOGLE_SCRIPTS',
                        nombre: 'Google Cloud (BCV)',
                        url: 'https://script.google.com/macros/s/AKfycbxT9sKz_XWRWuQx_XP-BJ33T0hoAgJsLwhZA00v6nPt4Ij4jRjq-90mDGLVCsS6FXwW9Q/exec?token=Lvbp1994',
                        parser: (json, moneda) => moneda === 'EUR' ? (json.euro?.price || 0) : (json.bcv?.price || 0)
                    },
                    {
                        id: 'DOLAR_VZLA',
                        nombre: 'DolarVZLA API',
                        url: 'https://api.dolarvzla.com/public/exchange-rate',
                        parser: (json, moneda) => moneda === 'EUR' ? (json.current?.eur || 0) : (json.current?.usd || 0)
                    }
                ];

                let valFinal = null;
                let fuenteExitosa = null;
                for (const prov of proveedores) {
                    try {
                        const controller = new AbortController();
                        setTimeout(() => controller.abort(), 8000);
                        const res = await fetch(prov.url, { signal: controller.signal });
                        if (!res.ok) throw new Error("HTTP " + res.status);

                        const json = await res.json();
                        const val = prov.parser(json, tipoMoneda);

                        if (val > 0) {
                            valFinal = val;
                            fuenteExitosa = prov.nombre;
                            break;
                        }
                    } catch (e) { console.warn("Provider fail", prov.nombre); }
                }

                if (valFinal) {
                    // Update Logic
                    const rawTasa = parseMoney(valFinal);
                    const modoRedondeo = redondeoOverride || configuracion.modoRedondeo;

                    // Lógica del Dashboard ("Inicio"): Múltiplos de 5 enteros (HACIA ARRIBA)
                    let tasaFinal;

                    if (modoRedondeo === 'entero') {
                        tasaFinal = Math.ceil(rawTasa);
                    } else if (modoRedondeo === 'multiplo5' || modoRedondeo === 'm5') {
                        tasaFinal = Math.ceil(rawTasa / 5) * 5;
                    } else if (modoRedondeo === 'multiplo10') {
                        tasaFinal = Math.ceil(rawTasa / 10) * 10;
                    } else {
                        // 'exacto' (default)
                        tasaFinal = rawTasa;
                    }

                    setConfiguracion({
                        tasa: tasaFinal,
                        tipoTasa: tipoMoneda,
                        fechaTasa: new Date().toISOString(),
                        fuenteTasa: fuenteExitosa || 'BCV'
                    });

                    if (forzar) Swal.fire({ icon: 'success', title: 'Sincronizado', text: `${tasaFinal} Bs`, timer: 2000, showConfirmButton: false });
                    return tasaFinal;
                } else if (forzar) {
                    Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo obtener la tasa.' });
                }
                return null;
            },

            // LOGIC: Correlatives
            generarCorrelativo: async (tipo) => {
                return await db.transaction('rw', db.config, async () => {
                    const registro = await db.config.get('correlativos') || { key: 'correlativos', factura: 0, z: 0 };
                    const nuevoValor = (registro[tipo] || 0) + 1;
                    await db.config.put({ ...registro, [tipo]: nuevoValor });
                    return String(nuevoValor).padStart(6, '0');
                });
            },

            // 👻 GHOST ACTIONS
            incrementGhostUsage: () => {
                const { ghostStats } = get();
                const today = new Date().toLocaleDateString();

                let newCount = ghostStats.apiCount;
                if (ghostStats.lastReset !== today) {
                    newCount = 1;
                } else {
                    newCount += 1;
                }

                set({
                    ghostStats: {
                        apiCount: newCount,
                        lastReset: today,
                        isBlocked: newCount >= 18
                    }
                });
            }
        }),
        {
            name: 'listo-config', // Matches existing localStorage key!
            partialize: (state) => ({
                configuracion: state.configuracion,
                ghostStats: state.ghostStats
            }), // Persist config and ghost stats
        }
    ), 'ConfigStore')
);
