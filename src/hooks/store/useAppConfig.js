import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { safeSave } from '../../utils/storageUtils';
import { loadWithSchema } from '../../utils/schemaUtils';
import { appConfigSchema } from '../../schemas/dataSchemas';
import { parseMoney } from '../../utils/mathUtils';

export const useAppConfig = () => {
    const [devMode, setDevMode] = useState(false);

    const [configuracion, setConfiguracion] = useState(() => {
        const defaults = {
            nombre: 'LISTO POS',
            direccion: '...', rif: '...', telefono: '...',
            mensaje: 'Gracias por preferir LISTO POS. Tu negocio, resuelto.',
            // ✅ Inicializamos con tipoTasa
            tasa: 0, tipoTasa: 'USD', fechaTasa: null, autoUpdateTasa: false,
            tasaReferencia: 0, // 🆕 Para alertas de tasa baja
            autoUpdateFrecuencia: 0,
            modoRedondeo: 'exacto', modoCaja: 'global',
            monedaBase: 'USD',
            porcentajeIva: 16,
            igtfActivo: false, igtfTasa: 3.00, // 🆕 IGTF
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
        return { ...defaults, ...loadWithSchema('listo-config', appConfigSchema, {}) };
    });

    const configRef = useRef(configuracion);
    useEffect(() => { configRef.current = configuracion; }, [configuracion]);

    useEffect(() => {
        // 🚫 MODO NOCTURNO DESACTIVADO POR PETICIÓN DE USUARIO
        document.documentElement.classList.remove('dark');

        // 👆 MODO TÁCTIL (Touch Mode)
        if (configuracion.modoTouch) {
            document.documentElement.classList.add('touch-mode');
        } else {
            document.documentElement.classList.remove('touch-mode');
        }

        localStorage.setItem('listo-config', JSON.stringify(configuracion));
    }, [configuracion]);

    const guardarConfiguracion = (d) => setConfiguracion(d);

    const calcularTasaFinal = (valorCrudo, modo) => {
        const valor = parseFloat(valorCrudo);
        if (isNaN(valor)) return 0;

        switch (modo) {
            case 'entero': return Math.ceil(valor);
            case 'm5': return Math.ceil(valor / 5) * 5;
            case 'exacto':
            default: return valor;
        }
    };

    // 🚀 SISTEMA DE REDUNDANCIA: ROUND ROBIN DE PROVEEDORES
    // Mantenemos la lista en una variable que persistirá durante la sesión (o podrías moverla a localStorage)
    const [proveedores, setProveedores] = useState([
        {
            id: 'GOOGLE_SCRIPTS',
            nombre: 'Google Cloud (BCV)',
            url: 'https://script.google.com/macros/s/AKfycbxT9sKz_XWRWuQx_XP-BJ33T0hoAgJsLwhZA00v6nPt4Ij4jRjq-90mDGLVCsS6FXwW9Q/exec?token=Lvbp1994',
            parser: (json, moneda) => {
                if (moneda === 'EUR') return json.euro?.price || 0;
                return json.bcv?.price || 0;
            }
        },
        {
            id: 'DOLAR_VZLA',
            nombre: 'DolarVZLA API',
            url: 'https://api.dolarvzla.com/public/exchange-rate',
            parser: (json, moneda) => {
                if (moneda === 'EUR') return json.current?.eur || 0;
                return json.current?.usd || 0;
            }
        }
    ]);

    // 🔄 FUNCIÓN MAESTRA CON REDUNDANCIA
    const obtenerTasaBCV = async (forzar = false, modoOverride = null, tipoOverride = null) => {
        const currentConfig = configRef.current;
        if (!forzar && !currentConfig.autoUpdateTasa) return false;

        const modoUsar = modoOverride || currentConfig.modoRedondeo;
        const tipoMoneda = tipoOverride || currentConfig.tipoTasa || 'USD';

        if (forzar) {
            Swal.fire({
                title: 'Sincronizando Tasa...',
                text: `Conectando con fuentes oficiales (${tipoMoneda})...`,
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                },
                background: '#1e293b',
                color: '#fff'
            });
        }

        console.log(`📡 [TASA] Iniciando búsqueda para ${tipoMoneda} con sistema de redundancia...`);

        // Clonamos la lista actual para poder rotarla si falla
        let listaIntentos = [...proveedores];
        let exito = false;
        let valorFinal = null;

        for (let i = 0; i < listaIntentos.length; i++) {
            const prov = listaIntentos[i];
            try {
                console.log(`🔄 Intentando con: ${prov.nombre}...`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos de timeout

                const response = await fetch(prov.url, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const json = await response.json();
                const rawValue = prov.parser(json, tipoMoneda);

                if (rawValue > 0) {
                    console.log(`✅ Éxito con ${prov.nombre}: ${rawValue}`);

                    // Actualizar tasa de referencia para alertas
                    let rawRef = parseMoney(rawValue);
                    if (rawRef > 0) {
                        setConfiguracion(prev => ({ ...prev, tasaReferencia: parseFloat(rawRef.toFixed(2)) }));
                    }

                    valorFinal = await procesarYGuardarTasa(rawValue, modoUsar, currentConfig, forzar, prov.nombre, tipoMoneda);
                    exito = true;
                    break; // Salimos del loop si hubo éxito
                } else {
                    throw new Error("Valor extraído es 0 o inválido");
                }

            } catch (error) {
                console.warn(`❌ Error en ${prov.nombre}:`, error.message);

                // 🔄 ROUND ROBIN: Si falla y no es el último, movemos este al final de la cola real
                if (i === 0 && listaIntentos.length > 1) {
                    setProveedores(prev => {
                        const nuevaLista = [...prev];
                        const fallido = nuevaLista.shift();
                        nuevaLista.push(fallido);
                        return nuevaLista;
                    });
                }
            }
        }

        if (!exito && forzar) {
            Swal.fire({
                icon: 'error',
                title: 'Falla Multicanal',
                text: 'Ninguna de las fuentes de tasa en línea respondió. Verifica tu internet.',
                background: '#1e293b',
                color: '#fff'
            });
        }

        return valorFinal;
    };


    const procesarYGuardarTasa = (rawValue, modoUsar, currentConfig, forzar, origenNombre, tipoGuardar) => {
        let rawTasa = parseMoney(rawValue);
        if (rawTasa > 0) rawTasa = parseFloat(rawTasa.toFixed(2));

        console.log(`💰 Tasa ${tipoGuardar} obtenida:`, rawTasa);

        if (rawTasa > 0) {
            const tasaFinal = calcularTasaFinal(rawTasa, modoUsar);

            // ✅ Guardamos SIEMPRE si forzamos o si cambia el tipo de moneda
            const cambiaTipo = currentConfig.tipoTasa !== tipoGuardar;
            const cambiaValor = Math.abs(tasaFinal - currentConfig.tasa) > 0.001;

            if (forzar || cambiaValor || cambiaTipo) {
                setConfiguracion(prev => ({
                    ...prev,
                    tasa: tasaFinal,
                    tipoTasa: tipoGuardar, // <--- ESTO EVITA QUE SE DEVUELVA A DOLAR
                    modoRedondeo: modoUsar,
                    fechaTasa: new Date().toISOString()
                }));

                if (forzar) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Sincronizado',
                        text: `${origenNombre}: ${tasaFinal} Bs`,
                        timer: 2000,
                        showConfirmButton: false
                    });
                } else {
                    const Toast = Swal.mixin({ toast: true, position: 'bottom-end', showConfirmButton: false, timer: 4000 });
                    Toast.fire({ icon: 'info', title: 'Tasa Actualizada', text: `${tasaFinal} Bs (${tipoGuardar})` });
                }
                return tasaFinal;
            }
            return tasaFinal;
        }
        return null;
    };

    useEffect(() => {
        const intentarActualizar = () => {
            if (configuracion.autoUpdateTasa && navigator.onLine) {
                obtenerTasaBCV(false);
            }
        };

        // Intento inicial
        intentarActualizar();

        // Intervalo periódico
        let intervalId = null;
        const frecuencia = parseInt(configuracion.autoUpdateFrecuencia) || 0;
        if (frecuencia > 0 && configuracion.autoUpdateTasa) {
            intervalId = setInterval(intentarActualizar, frecuencia);
        }

        // Listener de reconexión
        const handleOnline = () => {
            console.log("🌐 [NET] Conexión detectada. Verificando tasa...");
            intentarActualizar();
        };
        window.addEventListener('online', handleOnline);

        return () => {
            if (intervalId) clearInterval(intervalId);
            window.removeEventListener('online', handleOnline);
        };
    }, [configuracion.autoUpdateFrecuencia, configuracion.autoUpdateTasa]);

    return { configuracion, guardarConfiguracion, devMode, setDevMode, obtenerTasaBCV };
};