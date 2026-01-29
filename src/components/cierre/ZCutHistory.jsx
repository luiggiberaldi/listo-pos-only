import React, { useMemo, useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Printer, Calendar, Search, AlertCircle, FileText, TrendingUp, DollarSign } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import ReporteZUniversal from './ReporteZUniversal';
import Swal from 'sweetalert2';
import { useStore } from '../../context/StoreContext';

/**
 * Normaliza un objeto de corte histórico para garantizar que tenga la estructura
 * exacta que espera ReporteZUniversal (igual que CierrePage).
 * Recupera o calcula IGTF si falta.
 */
const normalizarCorteParaTicket = (corteRaw, taxRate = 16) => {
    if (!corteRaw) return null;

    // 1. Datos básicos
    const id = corteRaw.id;
    const fecha = corteRaw.fecha;
    const totalUSD = parseFloat(corteRaw.totalUSD || 0);

    // 2. Recuperar la estructura Fiscal
    let fiscal = corteRaw.fiscal || {
        ventasExentas: 0,
        baseImponible: 0,
        iva: 0,
        igtf: 0
    };

    // 3. RECONSTRUCCIÓN DE IGTF (Si es un corte antiguo o incompleto)
    // Si igtf es 0, intentamos calcularlo basado en las ventas guardadas
    if ((!fiscal.igtf || fiscal.igtf === 0) && Array.isArray(corteRaw.ventas)) {
        let igtfCalculado = 0;
        let baseImponibleRecalculada = 0;
        let ivaRecalculado = 0;
        let exentoRecalculado = 0;

        corteRaw.ventas.forEach(v => {
            const totalVenta = parseFloat(v.total || 0);

            // Reconstrucción de Impuestos Base (IVA vs Exento)
            // Solo si el fiscal original parece vacío o inválido
            if (v.status !== 'ANULADA') {
                if (v.esExento) {
                    exentoRecalculado += totalVenta;
                } else {
                    const divisor = 1 + (taxRate / 100);
                    const base = totalVenta / divisor;
                    baseImponibleRecalculada += base;
                    ivaRecalculado += (totalVenta - base);
                }
            }

            // Cálculo IGTF
            let igtfVenta = parseFloat(v.igtfTotal || 0);

            // Si la venta no tiene igtfTotal guardado (Legacy), lo estimamos por pagos
            if (igtfVenta === 0 && Array.isArray(v.pagos)) {
                // Filtrar pagos en Divisa Efectivo
                const pagosDivisa = v.pagos.filter(p => {
                    const m = (p.metodo || p.nombre || '').toLowerCase();
                    const isCash = m.includes('efectivo') || m.includes('cash');
                    const isUSD = p.tipo === 'DIVISA' || p.currency === 'USD' || m.includes('divisa') || m.includes('dolar');
                    return isCash && isUSD;
                });

                if (pagosDivisa.length > 0) {
                    const montoDivisa = pagosDivisa.reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);
                    igtfVenta = montoDivisa * 0.03;
                }
            }
            igtfCalculado += igtfVenta;
        });

        // Aplicamos los valores calculados al objeto fiscal final
        fiscal = {
            ...fiscal,
            ventasExentas: fiscal.ventasExentas || exentoRecalculado,
            baseImponible: fiscal.baseImponible || baseImponibleRecalculada,
            iva: fiscal.iva || ivaRecalculado,
            igtf: fiscal.igtf || igtfCalculado
        };
    }

    // 4. Retornar objeto estandarizado
    return {
        ...corteRaw,
        fiscal, // Objeto fiscal garantizado con IGTF
        totalUSD, // Asegurar número
    };
};

export default function ZCutHistory() {
    const { configuracion } = useStore(); // Get Config
    const [searchTerm, setSearchTerm] = useState('');
    const [corteSeleccionado, setCorteSeleccionado] = useState(null);
    const printRef = useRef();

    // Consultar DB
    const historialRaw = useLiveQuery(() => db.cortes.limit(50).reverse().toArray()) || [];

    // Procesar datos (Memoizado para performance)
    const historialProcesado = useMemo(() => {
        const currentTaxRate = configuracion?.porcentajeIva !== undefined ? parseFloat(configuracion.porcentajeIva) : 16;
        return historialRaw.map(corte => normalizarCorteParaTicket(corte, currentTaxRate));
    }, [historialRaw, configuracion]);

    // Filtrado
    const cortesFiltrados = useMemo(() => {
        if (!searchTerm) return historialProcesado;
        const lower = searchTerm.toLowerCase();
        return historialProcesado.filter(c =>
            String(c.id).includes(lower) ||
            (c.fecha && c.fecha.includes(lower))
        );
    }, [historialProcesado, searchTerm]);


    // Manejador de Impresión
    const handlePrintRequest = (corte) => {
        setCorteSeleccionado(corte);
    };

    const printFn = useReactToPrint({
        contentRef: printRef,
        content: () => printRef.current,
        onAfterPrint: () => setCorteSeleccionado(null),
        documentTitle: `Corte-Z-${corteSeleccionado?.id || 'Historico'}`
    });

    React.useEffect(() => {
        if (corteSeleccionado) {
            printFn();
        }
    }, [corteSeleccionado, printFn]);


    // --- RENDER ---
    return (
        <div className="space-y-6">

            {/* Header / Buscador */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border-subtle">
                <div className="w-full md:w-1/3 relative">
                    <Search className="absolute left-3 top-3 text-content-tertiary" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por #ID o Fecha..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border-DEFAULT bg-app-light dark:bg-app-dark focus:ring-2 focus:ring-primary outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="text-sm text-content-secondary font-medium">
                    Mostrando últimos {cortesFiltrados.length} cierres
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-subtle overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border-subtle bg-app-light dark:bg-app-dark text-xs font-bold text-content-secondary uppercase tracking-wider">
                                <th className="p-4 rounded-tl-xl">ID Cierre</th>
                                <th className="p-4">Fecha / Hora</th>
                                <th className="p-4 text-center">Transacciones</th>
                                <th className="p-4 text-right">Venta Total ($)</th>
                                <th className="p-4 text-center">Estado</th>
                                <th className="p-4 text-right rounded-tr-xl">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {cortesFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-content-tertiary">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText size={48} className="opacity-20" />
                                            <p>No se encontraron cierres almacenados</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                cortesFiltrados.map((corte) => {
                                    // Cálculo visual para la columna "Venta Total"
                                    // Sumamos IGTF si y solo si está activo
                                    const igtfAmount = parseFloat(corte.fiscal?.igtf || 0);
                                    const totalVisual = corte.totalUSD + igtfAmount;

                                    return (
                                        <tr key={corte.id} className="hover:bg-app-light dark:hover:bg-app-dark/50 transition-colors group">
                                            <td className="p-4 font-bold text-content-main font-numbers">
                                                #{String(corte.id).padStart(6, '0')}
                                            </td>
                                            <td className="p-4 text-sm text-content-secondary">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} />
                                                    {new Date(corte.fecha).toLocaleDateString()}
                                                    <span className="opacity-50">|</span>
                                                    {new Date(corte.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center font-medium">
                                                {corte.transacciones || corte.ventas?.length || 0}
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-lg font-black font-numbers text-sm border border-emerald-100 dark:border-emerald-800">
                                                    ${totalVisual.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                                    <AlertCircle size={12} /> CERRADO
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => handlePrintRequest(corte)}
                                                    className="bg-white dark:bg-surface-dark border border-border-DEFAULT hover:border-primary hover:text-primary text-content-secondary p-2 rounded-lg transition-all shadow-sm active:scale-95"
                                                    title="Reimprimir Z"
                                                >
                                                    <Printer size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* COMPONENTE OCULTO PARA IMPRESIÓN - Estilo CierrePage */}
            <div style={{ display: 'none' }}>
                <ReporteZUniversal ref={printRef} corte={corteSeleccionado} formato="ticket" />
            </div>

        </div>
    );
}