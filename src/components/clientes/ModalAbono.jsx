import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, CheckCircle, Wallet, AlertTriangle, ArrowRightLeft, Printer, Info } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import Swal from 'sweetalert2';
import { useReactToPrint } from 'react-to-print';
import Ticket from '../Ticket';

export default function ModalAbono({ cliente, onClose }) {
    const { registrarAbono, configuracion, metodosPago } = useStore();

    // Lista de pagos acumulados
    const [pagos, setPagos] = useState([]);

    // Lista de métodos disponibles (Dinámica)
    const [availableMethods, setAvailableMethods] = useState([]);

    // Estado del formulario de "Agregar Pago"
    const [metodo, setMetodo] = useState('Efectivo Divisa');
    const [montoArg, setMontoArg] = useState('');
    const [referencia, setReferencia] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // 🖨️ PRINTING STATE
    const [successTransaction, setSuccessTransaction] = useState(null);
    const ticketRef = useRef();
    const handlePrint = useReactToPrint({
        contentRef: ticketRef,
        onPrintError: (error) => console.error("Error impresión:", error)
    });

    // Derivados
    const tasa = configuracion?.tasa || 1;
    const deudaTotal = cliente.deuda || 0;

    // Cargar Métodos (Solo activos)
    useEffect(() => {
        const rawMethods = metodosPago || [];
        const activeMethods = rawMethods
            .filter(m => m.activo !== false)
            .map(m => typeof m === 'string' ? { nombre: m } : m);

        setAvailableMethods(activeMethods);

        if (activeMethods.length > 0) {
            setMetodo(prev => {
                const exists = activeMethods.find(m => m.nombre === prev);
                return exists ? prev : activeMethods[0].nombre;
            });
        }
    }, [metodosPago]);

    // Helpers de Moneda
    const getCurrencyInfo = (methodName) => {
        const m = methodName.toLowerCase();
        const methodConfig = availableMethods.find(am => am.nombre === methodName);
        if (methodConfig && methodConfig.tipo) {
            return methodConfig.tipo === 'BS' ? { code: 'VES', label: 'Bs' } : { code: 'USD', label: '$' };
        }
        // Fallback
        if (m.includes('bs') || m.includes('pago móvil') || m.includes('punto') || m.includes('biopago') || m.includes('transferencia')) {
            return { code: 'VES', label: 'Bs' };
        }
        return { code: 'USD', label: '$' };
    };

    const currentCurrency = getCurrencyInfo(metodo);

    // Helper para mostrar bimonetario (Base USD -> Muestra Bs)
    const formatBimonetary = (amountUSD) => {
        const bs = amountUSD * tasa;
        return (
            <div className="flex flex-col items-center">
                <span className="text-lg font-black">${amountUSD.toFixed(2)}</span>
                <span className="text-[10px] text-slate-400 font-bold">Bs {bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
        );
    };

    const handleAddPayment = () => {
        const val = parseFloat(montoArg);
        if (!val || val <= 0) return;

        const montoUSD = currentCurrency.code === 'VES' ? val / tasa : val;

        const nuevoPago = {
            id: Date.now(),
            metodo,
            monto: val, // Valor nominal (Bs si es VES, $ si es USD)
            montoUSD: montoUSD, // Valor normalizado a USD para cálculos internos de deuda
            referencia: referencia || '',
            ticker: currentCurrency.code,
            montoOriginal: val, // Valor visual original
            medium: metodo.toLowerCase().includes('efectivo') ? 'CASH' : 'DIGITAL',
            currency: currentCurrency.code
        };

        setPagos([...pagos, nuevoPago]);
        setMontoArg('');
        setReferencia('');
    };

    const handleRemovePayment = (id) => {
        setPagos(pagos.filter(p => p.id !== id));
    };

    const totalAbonado = pagos.reduce((acc, p) => acc + (p.montoUSD || p.monto), 0);
    const nuevoSaldo = deudaTotal - totalAbonado;

    const handleConfirmar = async (shouldPrint = false) => {
        if (pagos.length === 0) return;
        try {
            setIsProcessing(true);
            const result = await registrarAbono(cliente.id, pagos, totalAbonado);

            // ✅ SWITCH TO SUCCESS VIEW instead of closing
            setSuccessTransaction(result);

            if (shouldPrint) {
                // Auto-trigger print with a slight delay to ensure rendering
                setTimeout(() => {
                    handlePrint();
                }, 500);
            }

        } catch (error) {
            Swal.fire('Error', error.message || 'No se pudo registrar el abono', 'error');
            setIsProcessing(false);
        }
    };

    const handleFinish = () => {
        onClose();
    };

    // Cálculo de conversión en tiempo real para el input
    const valorInput = parseFloat(montoArg) || 0;
    const conversionInput = currentCurrency.code === 'VES'
        ? `≈ $${(valorInput / tasa).toFixed(2)}`
        : `≈ Bs ${(valorInput * tasa).toFixed(2)}`;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isProcessing && onClose()} />

            <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">

                {successTransaction ? (
                    // 🟢 VIEW: SUCCESS CONTENT
                    <div className="flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95">
                        <div className="mx-auto bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-4 rounded-full mb-4">
                            <CheckCircle size={40} className="stroke-[3]" />
                        </div>

                        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">¡Abono Exitoso!</h2>
                        <p className="text-sm text-slate-500 font-medium mb-6">
                            El pago ha sido registrado correctamente y el saldo del cliente actualizado.
                        </p>

                        <div className="space-y-3 w-full max-w-xs">
                            <button
                                onClick={() => handlePrint()}
                                className="w-full py-3 bg-[#6366f1] hover:bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
                            >
                                <Printer size={20} /> IMPRIMIR COMPROBANTE
                            </button>

                            <button
                                onClick={handleFinish}
                                className="w-full py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                Cerrar y Continuar
                            </button>
                        </div>
                    </div>
                ) : (
                    // 🔵 VIEW: FORM CONTENT
                    <>
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-white dark:bg-slate-900">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                    <Wallet className="text-[#6366f1]" /> REALIZAR ABONO
                                </h3>
                                <p className="text-sm text-slate-500 font-medium mt-1">
                                    Cliente: <span className="text-[#6366f1] font-bold">{cliente.nombre}</span>
                                </p>
                            </div>
                            <button onClick={onClose} disabled={isProcessing} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500"><X size={20} /></button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto space-y-6">

                            {/* 1. Estado de la Deuda Bimonetario */}
                            <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Deuda Total</p>
                                    {formatBimonetary(deudaTotal)}
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-[#6366f1] mb-1">Abonando</p>
                                    {formatBimonetary(totalAbonado)}
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                                        {nuevoSaldo >= 0 ? 'Restante' : 'A Monedero'}
                                    </p>
                                    <div className={`flex flex-col items-center ${nuevoSaldo < 0.001 ? 'text-emerald-500' : 'text-orange-500'}`}>
                                        <span className="text-lg font-black">${Math.abs(nuevoSaldo).toFixed(2)}</span>
                                        <span className="text-[10px] font-bold opacity-80">Bs {(Math.abs(nuevoSaldo) * tasa).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center -mt-2">
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 font-mono">
                                    Tasa Hoy: {tasa.toFixed(2)} Bs/$
                                </span>
                            </div>

                            {/* 2. Agregar Método (THEME INDIGO) */}
                            <div className="space-y-3 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Método de Pago</label>
                                        <select
                                            value={metodo}
                                            onChange={(e) => setMetodo(e.target.value)}
                                            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-[#6366f1] outline-none shadow-sm"
                                        >
                                            {availableMethods.map((m, idx) => {
                                                let emoji = '🔹';
                                                const n = m.nombre.toLowerCase();
                                                if (n.includes('efectivo')) emoji = (n.includes('bs') || m.tipo === 'BS') ? '🇻🇪' : '💵';
                                                else if (n.includes('pago móvil') || n.includes('pago movil')) emoji = '📱';
                                                else if (n.includes('punto') || n.includes('tarjeta')) emoji = '💳';
                                                else if (n.includes('zelle')) emoji = '🇺🇸';
                                                else if (n.includes('binance')) emoji = '🪙';
                                                else if (n.includes('biopago')) emoji = '👆';
                                                return <option key={idx} value={m.nombre}>{emoji} {m.nombre}</option>;
                                            })}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <label className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Monto ({currentCurrency.label})</label>
                                            <button
                                                onClick={() => Swal.fire({
                                                    title: 'Trucos de Conversión ⚡',
                                                    html: `
                                                        <div class="text-left text-sm space-y-3">
                                                            <p>Escribe el monto en <b>Dólares</b> y usa estos atajos al final para convertir a Bolívares:</p>
                                                            <ul class="list-disc pl-5 space-y-1">
                                                                <li><b>Tecla "D":</b> (Ej. <code>6.26d</code>) Ideal para Laptops.</li>
                                                                <li><b>Tecla "*":</b> (Ej. <code>6.26*</code>) Ideal para Teclado Numérico.</li>
                                                                <li><b>Símbolo "$":</b> (Ej. <code>6.26$</code>) Clásico.</li>
                                                            </ul>
                                                            <p class="mt-2 text-xs text-slate-400">El sistema aplicará la tasa del día automáticamente.</p>
                                                        </div>
                                                    `,
                                                    icon: 'info',
                                                    confirmButtonColor: '#6366f1'
                                                })}
                                                className="text-indigo-400 hover:text-indigo-600 transition-colors"
                                            >
                                                <Info size={14} />
                                            </button>
                                        </div>
                                        <div className="relative flex items-center">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={montoArg}
                                                onChange={(e) => {
                                                    let val = e.target.value;

                                                    // 1. Allow numbers, dots, commmas AND triggers ($, d, D, *)
                                                    if (!/^[0-9.,$dD*]*$/.test(val)) return;

                                                    // 2. Normalize comma to dot
                                                    val = val.replace(',', '.');

                                                    // 3. MAGIC CONVERSION: Check for trailing triggers
                                                    const lastChar = val.slice(-1);
                                                    if (['$', 'd', 'D', '*'].includes(lastChar)) {
                                                        const rawNum = parseFloat(val.slice(0, -1));
                                                        if (!isNaN(rawNum)) {
                                                            // Calculate: USD Amount * Rate
                                                            // Only convert if we are paying in VES, otherwise it's just the same amount
                                                            const converted = currentCurrency.code === 'VES'
                                                                ? (rawNum * tasa).toFixed(2)
                                                                : rawNum.toFixed(2);

                                                            setMontoArg(converted);
                                                            return;
                                                        }
                                                    }

                                                    // 4. Prevent multiple dots (normal validation)
                                                    const dots = val.match(/\./g);
                                                    if (dots && dots.length > 1) return;

                                                    setMontoArg(val);
                                                }}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddPayment()}
                                                placeholder="0.00"
                                                className="w-full p-2.5 pr-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-black text-right focus:ring-2 focus:ring-[#6366f1] outline-none shadow-sm"
                                            />
                                            <button
                                                onClick={() => {
                                                    const pendienteUSD = Math.max(0, deudaTotal - totalAbonado);
                                                    const val = currentCurrency.code === 'VES' ? (pendienteUSD * tasa) : pendienteUSD;
                                                    setMontoArg(val.toFixed(2));
                                                }}
                                                className="absolute right-2 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-[#6366f1] text-[10px] font-black rounded-lg hover:bg-indigo-200 transition-colors uppercase"
                                                title="Pagar saldo restante"
                                            >
                                                Todo
                                            </button>
                                        </div>
                                        {/* Conversión flotante debajo del input */}
                                        {valorInput > 0 && (
                                            <div className="flex justify-end mt-1 animate-in fade-in slide-in-from-top-1">
                                                <div className="bg-slate-800 dark:bg-slate-700 text-white text-[10px] px-2 py-1 rounded shadow-lg flex items-center gap-1.5 font-bold">
                                                    <ArrowRightLeft size={10} /> {conversionInput}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {(() => {
                                    const currentM = availableMethods.find(am => am.nombre === metodo);
                                    const needsRef = currentM?.requiereRef ?? !metodo.toLowerCase().includes('efectivo');
                                    if (needsRef) return (
                                        <div className="animate-in slide-in-from-top-2">
                                            <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase ml-1">Referencia / Comprobante</label>
                                            <input
                                                type="text"
                                                value={referencia}
                                                onChange={(e) => setReferencia(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddPayment()}
                                                placeholder="Nro. operación, banco, etc..."
                                                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-[#6366f1] outline-none shadow-sm"
                                            />
                                        </div>
                                    );
                                    return null;
                                })()}

                                <button
                                    onClick={handleAddPayment}
                                    disabled={!montoArg || parseFloat(montoArg) <= 0}
                                    className="w-full py-3 bg-[#6366f1] hover:bg-indigo-600 disabled:opacity-50 disabled:grayscale text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-md shadow-indigo-200 dark:shadow-none mt-2"
                                >
                                    <Plus size={18} /> AGREGAR AL RESUMEN
                                </button>
                            </div>

                            {/* 3. Lista de Pagos (Dinámica & Bimonetaria) */}
                            <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                {pagos.map(p => (
                                    <div key={p.id} className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm animate-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${p.ticker === 'VES' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-[#6366f1]'}`}>
                                                {p.ticker === 'VES' ? <span className="text-[10px] font-black">Bs</span> : <span className="text-[10px] font-black">$</span>}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{p.metodo}</p>
                                                {p.referencia && <p className="text-[10px] text-slate-400 font-mono">Ref: {p.referencia}</p>}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 text-right">
                                            <div className="flex flex-col items-end">
                                                {p.ticker === 'VES' ? (
                                                    <>
                                                        <span className="font-bold text-slate-800 dark:text-white text-sm">Bs {p.montoOriginal.toFixed(2)}</span>
                                                        <span className="text-[10px] text-[#6366f1] font-bold">≈ ${(p.montoUSD || (p.monto / tasa)).toFixed(2)}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="font-bold text-slate-800 dark:text-white text-sm">${p.monto.toFixed(2)}</span>
                                                        <span className="text-[10px] text-blue-600 font-bold">≈ Bs {(p.monto * tasa).toFixed(2)}</span>
                                                    </>
                                                )}
                                            </div>
                                            <button onClick={() => handleRemovePayment(p.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}

                                {pagos.length === 0 && (
                                    <div className="text-center py-6 text-slate-400 text-xs italic border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                                        No hay pagos agregados aún.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-b-2xl flex gap-3">
                            <button
                                onClick={() => handleConfirmar(false)}
                                disabled={pagos.length === 0 || isProcessing}
                                className="flex-1 py-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                            >
                                PROCESAR
                            </button>
                            <button
                                onClick={() => handleConfirmar(true)}
                                disabled={pagos.length === 0 || isProcessing}
                                className="flex-[2] py-4 bg-[#6366f1] hover:bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-black text-lg shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                {isProcessing ? 'PROCESANDO...' : 'IMPRIMIR Y PROCESAR'}
                                {!isProcessing && <Printer size={20} />}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* 🖨️ TICKET OCULTO (ALWAYS MOUNTED) */}
            <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
                <Ticket ref={ticketRef} data={successTransaction} configuracion={configuracion} />
            </div>
        </div>
    );
}
