import React, { useState, useMemo, useRef } from 'react';
import { X, FileText, ArrowDownLeft, ArrowUpRight, Calendar, Wallet, Printer, ChevronDown, ChevronUp, Eye, ShoppingBag, Download, Filter, Search, AlertCircle, Settings } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import ModalAbono from './ModalAbono';
import Swal from 'sweetalert2';
import { useReactToPrint } from 'react-to-print';
import Ticket from '../Ticket';
import TicketSaldoFavor from '../TicketSaldoFavor';
import { generateAccountStatementPDF } from '../../utils/pdfGenerator'; // Static Import

export default function ModalHistorialCliente({ cliente: clienteProp, onClose }) {
    const { ventas, configuracion, registrarAbono, sanearCuentaCliente } = useStore();
    const [showAbono, setShowAbono] = useState(false);
    const [expandedRow, setExpandedRow] = useState(null);
    const [filterType, setFilterType] = useState('ALL');

    // 🔴 REACTIVE CLIENT DATA: Fetch from DB instead of using static prop
    const cliente = useLiveQuery(
        () => db.clientes.get(clienteProp.id),
        [clienteProp.id]
    ) || clienteProp; // Fallback to prop while loading

    const tasa = configuracion?.tasa || 1;

    // 🖨️ REIMPRESIÓN
    const ticketRef = useRef();
    const ticketSaldoRef = useRef();
    const [reprintData, setReprintData] = useState(null);

    const handlePrintTicket = useReactToPrint({ contentRef: ticketRef, content: () => ticketRef.current, documentTitle: 'Ticket Reimpresion' });
    const handlePrintSaldo = useReactToPrint({ contentRef: ticketSaldoRef, content: () => ticketSaldoRef.current, documentTitle: 'Ticket Saldo Favor' });

    // 1. RECONSTRUCCIÓN DEL HISTORIAL
    const historial = useMemo(() => {
        if (!cliente) return { data: [], stats: { totalCompradoCredito: 0, totalPagado: 0 } };

        // Filtramos ventas relevantes: Cualquier venta que tenga el clienteId
        const movimientos = ventas.filter(v =>
            v.clienteId === cliente.id &&
            v.status !== 'ANULADA'
        );

        const ordenados = movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        let saldoAcumulado = 0;

        let totalCompradoCredito = 0;
        let totalPagado = 0;

        const mapped = ordenados.map(mov => {
            const esPagoPuro = mov.tipo === 'ABONO' || mov.tipo === 'COBRO_DEUDA';

            const cargoVenta = (!esPagoPuro && mov.deudaPendiente) ? parseFloat(mov.deudaPendiente) : 0;
            const abonoVuelto = (parseFloat(mov.appliedToDebt) || 0) + (parseFloat(mov.appliedToWallet) || 0);
            const abonoTotal = esPagoPuro ? mov.total : abonoVuelto;

            const impactoNeto = cargoVenta - abonoTotal;
            saldoAcumulado += impactoNeto;

            if (esPagoPuro) totalPagado += mov.total;
            else {
                totalCompradoCredito += cargoVenta;
                totalPagado += abonoVuelto;
            }

            saldoAcumulado = Math.round((saldoAcumulado + Number.EPSILON) * 100) / 100;

            return {
                ...mov,
                cargoVenta,
                abonoTotal,
                impactoNeto,
                saldoMomento: saldoAcumulado,
                esAbono: abonoTotal > 0 && cargoVenta === 0,
                esHibrido: cargoVenta > 0 && abonoTotal > 0
            };
        }).reverse();

        return { data: mapped, stats: { totalCompradoCredito, totalPagado } };
    }, [ventas, cliente]);

    const { data: allRows, stats } = historial;

    const filteredRows = useMemo(() => {
        if (filterType === 'ALL') return allRows;
        if (filterType === 'DEBT') return allRows.filter(m => !m.esAbono);
        if (filterType === 'PAYMENT') return allRows.filter(m => m.esAbono);
        return allRows;
    }, [allRows, filterType]);

    const porcentajePagado = stats.totalCompradoCredito > 0
        ? Math.min(100, (stats.totalPagado / stats.totalCompradoCredito) * 100)
        : 100;

    const [activeTab, setActiveTab] = useState('ticket'); // 'ticket' | 'payment'

    const toggleRow = (id) => {
        if (expandedRow === id) {
            setExpandedRow(null);
        } else {
            setExpandedRow(id);
            setActiveTab('ticket');
        }
    };

    const handleReprint = async (mov) => {
        setReprintData(mov);
        await new Promise(r => setTimeout(r, 100));

        if (mov.esAbono || (mov.vueltoCredito && mov.cambio > 0)) {
            handlePrintSaldo();
        } else {
            handlePrintTicket();
        }
    };

    // ⚙️ SANEAR CUENTA (Admin Tool)
    const handleSanearCuenta = async (tipo) => {
        const isDebt = tipo === 'DEUDA';
        const monto = isDebt ? cliente.deuda : cliente.favor;

        if (!monto || monto <= 0) return;

        // 1. Security Gate
        const { value: password } = await Swal.fire({
            title: 'Acceso Administrativo',
            text: 'Ingrese PIN de Administrador para realizar este ajuste.',
            input: 'password',
            inputPlaceholder: 'PIN',
            showCancelButton: true,
            confirmButtonColor: '#6366f1'
        });

        if (!password) return;
        if (password !== (configuracion.pinAdmin || '0000')) {
            return Swal.fire('Acceso Denegado', 'PIN incorrecto', 'error');
        }

        // 2. Reason Selection
        const { value: motivo } = await Swal.fire({
            title: `Sanear ${isDebt ? 'Deuda' : 'Saldo'}`,
            input: 'select',
            inputOptions: {
                'ERROR': 'Error de Sistema / Carga',
                'CONDONACION': 'Condonación / Perdón de Deuda',
                'DEVOLUCION_MANUAL': 'Devolución Manual de Efectivo',
                'INCOBRABLE': 'Cuenta Incobrable',
                'ACUERDO': 'Acuerdo con Gerencia'
            },
            inputPlaceholder: 'Seleccione un motivo...',
            showCancelButton: true,
            confirmButtonText: 'EJECUTAR AJUSTE',
            confirmButtonColor: isDebt ? '#ef4444' : '#10b981'
        });

        if (!motivo) return;

        try {
            // ✅ MOVED: Start loading ONLY when we are sure we are proceeding
            Swal.fire({ title: 'Procesando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

            // 3. Execute Transaction via the NEW core function
            await sanearCuentaCliente(cliente.id, tipo, `AJUSTE: ${motivo}`);

            Swal.fire('Cuenta Saneada', `El saldo de ${tipo.toLowerCase()} ha sido ajustado a $0.00`, 'success');

        } catch (error) {
            console.error(error);
            Swal.fire('Error', error.message, 'error');
        }
    };

    const handleDownloadPDF = () => {
        try {
            Swal.fire({
                title: 'Preparando...',
                text: 'Procesando datos del cliente',
                didOpen: () => Swal.showLoading(),
                allowOutsideClick: false,
                timer: 500 // Pequeño delay visual
            });

            // Sort Chronological for PDF (Oldest First)
            const chronologicalRows = [...allRows].reverse();

            setTimeout(() => {
                generateAccountStatementPDF(cliente, chronologicalRows, stats, configuracion)
                    .then(() => {
                        // El generador gestiona la UI de "Éxito/Abrir"
                        // Solo cerramos si quedó el loading pegado (backup)
                        if (Swal.isVisible() && Swal.getTitle()?.textContent === 'Preparando...') {
                            Swal.close();
                        }
                    })
                    .catch(err => {
                        console.error('PDF Error:', err);
                        Swal.fire('Error', 'No se pudo generar el documento: ' + err.message, 'error');
                    });
            }, 500);

        } catch (error) {
            console.error("General PDF Error:", error);
            Swal.fire('Error', 'No se pudo iniciar la descarga: ' + error.message, 'error');
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">

            {showAbono && (
                <ModalAbono
                    cliente={cliente}
                    onClose={() => setShowAbono(false)}
                />
            )}

            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

                {/* HEADER LIMPIO */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1">
                            Estado de Cuenta
                        </h2>
                        <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wide">Cliente</span>
                            {cliente.nombre}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleDownloadPDF}
                            className="flex items-center gap-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white px-4 py-2 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 font-bold text-sm"
                        >
                            <Download size={18} />
                            <span>DESCARGAR PDF</span>
                        </button>
                        <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-slate-600"><X size={20} /></button>
                    </div>
                </div>

                {/* 1. SECCIÓN KPI: TARJETAS (NUEVO DISEÑO) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 bg-slate-50/50 dark:bg-slate-950/30">

                    {/* CARD: SALDO QUADRANTS */}
                    <div className="md:col-span-5 grid grid-cols-2 gap-4">
                        {/* DEUDA */}
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Deuda (Fiado)</p>
                                    <button
                                        onClick={() => handleSanearCuenta('DEUDA')}
                                        className="text-slate-900 dark:text-slate-100 hover:text-black transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                                        title="Sanear Deuda"
                                    >
                                        <Settings size={14} />
                                    </button>
                                </div>
                                <div className="text-3xl font-black text-red-600 dark:text-red-400 font-numbers">${(cliente.deuda || 0).toFixed(2)}</div>
                                <p className="text-[10px] font-medium text-slate-400 mt-1">
                                    ≈ Bs {((cliente.deuda || 0) * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="absolute -right-4 -top-4 text-red-50 dark:text-red-900/10 transform rotate-12 group-hover:scale-110 transition-transform pointer-events-none">
                                <AlertCircle size={80} />
                            </div>
                        </div>

                        {/* FAVOR */}
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Monedero</p>
                                    <button
                                        onClick={() => handleSanearCuenta('FAVOR')}
                                        className="text-slate-900 dark:text-slate-100 hover:text-black transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                                        title="Sanear Saldo"
                                    >
                                        <Settings size={14} />
                                    </button>
                                </div>
                                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-numbers">${(cliente.favor || 0).toFixed(2)}</div>
                                <p className="text-[10px] font-medium text-slate-400 mt-1">
                                    Disponible
                                </p>
                            </div>
                            <div className="absolute -right-4 -top-4 text-emerald-50 dark:text-emerald-900/10 transform rotate-12 group-hover:scale-110 transition-transform pointer-events-none">
                                <Wallet size={80} />
                            </div>
                        </div>
                    </div>

                    {/* CARD: SALUD */}
                    <div className="md:col-span-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-center">
                        <div className="flex justify-between items-end mb-2">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Salud Crediticia</p>
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${porcentajePagado >= 90 ? 'bg-emerald-100 text-emerald-700' : porcentajePagado >= 50 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                {porcentajePagado.toFixed(0)}% PAGADO
                            </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                            <div
                                className={`h-full transition-all duration-1000 ease-out ${porcentajePagado < 50 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                                style={{ width: `${porcentajePagado}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            Histórico: Comprado <span className="font-bold text-slate-600 dark:text-slate-300">${stats.totalCompradoCredito.toFixed(2)}</span> · Pagado <span className="font-bold text-slate-600 dark:text-slate-300">${stats.totalPagado.toFixed(2)}</span>
                        </p>
                    </div>

                    {/* CARD: ACTION */}
                    <div className="md:col-span-3 flex items-center justify-end">
                        <button
                            onClick={() => setShowAbono(true)}
                            disabled={(cliente.deuda || 0) <= 0.01}
                            className="w-full h-full bg-[#6366f1] hover:bg-[#4f46e5] hover:shadow-indigo-500/20 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white rounded-2xl font-bold flex flex-col items-center justify-center gap-2 shadow-xl shadow-indigo-500/30 transition-all active:scale-95 group"
                        >
                            <Wallet size={24} className="group-hover:-translate-y-1 transition-transform" />
                            <span>REGISTRAR ABONO</span>
                        </button>
                    </div>
                </div>

                {/* 2. TABS NAV (NUEVO DISEÑO) */}
                <div className="px-6 border-b border-slate-100 dark:border-slate-800 flex gap-8">
                    <button
                        onClick={() => setFilterType('ALL')}
                        className={`py-4 text-sm font-bold border-b-2 transition-all ${filterType === 'ALL' ? 'border-slate-800 text-slate-800 dark:border-white dark:text-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Todos los Movimientos
                    </button>
                    <button
                        onClick={() => setFilterType('DEBT')}
                        className={`py-4 text-sm font-bold border-b-2 transition-all ${filterType === 'DEBT' ? 'border-[#6366f1] text-[#6366f1]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Solo Deudas
                    </button>
                    <button
                        onClick={() => setFilterType('PAYMENT')}
                        className={`py-4 text-sm font-bold border-b-2 transition-all ${filterType === 'PAYMENT' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Solo Pagos
                    </button>
                </div>

                {/* TABLA MINIMALISTA */}
                <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white dark:bg-slate-900 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-left w-[50px]"></th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">Fecha</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">Transacción</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-right">Monto</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-right">Saldo</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-24 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-300 opacity-50">
                                            <Search size={64} strokeWidth={1} />
                                            <p className="mt-4 font-medium text-sm">No se encontraron movimientos</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((mov) => (
                                    <React.Fragment key={mov.id}>
                                        <tr className={`group transition-all ${expandedRow === mov.id ? 'bg-slate-50/80 dark:bg-slate-800/30' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'}`}>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => toggleRow(mov.id)}
                                                    className={`p-1 rounded-md transition-colors ${expandedRow === mov.id ? 'bg-slate-200 text-slate-600' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'}`}
                                                >
                                                    {expandedRow === mov.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                                                        {new Date(mov.fecha).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {new Date(mov.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${mov.esAbono ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                                    <div>
                                                        <p className="font-bold text-xs text-slate-700 dark:text-slate-300">
                                                            {mov.esAbono ? 'PAGO RECIBIDO' : 'VENTA A CRÉDITO'}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wide">
                                                            #{mov.idVenta || mov.id}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    {mov.cargoVenta > 0 && (
                                                        <span className="font-black font-numbers text-sm text-red-500">
                                                            +${mov.cargoVenta.toFixed(2)}
                                                        </span>
                                                    )}
                                                    {mov.abonoTotal > 0 && (
                                                        <span className="font-black font-numbers text-sm text-emerald-600">
                                                            -${mov.abonoTotal.toFixed(2)}
                                                        </span>
                                                    )}
                                                    {mov.cargoVenta === 0 && mov.abonoTotal === 0 && (
                                                        <span className="font-bold text-xs text-slate-400">
                                                            CONTADO
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-slate-400 font-bold">
                                                        ≈ Bs {((mov.impactoNeto || mov.total) * (mov.tasa || tasa)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-bold font-numbers text-slate-500 dark:text-slate-400 text-xs">
                                                        ${mov.saldoMomento.toFixed(2)}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400/70 font-medium">
                                                        Bs {(mov.saldoMomento * (mov.tasa || tasa)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleReprint(mov)}
                                                    className="text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                                    title="Reimprimir"
                                                >
                                                    <Printer size={16} />
                                                </button>
                                            </td>
                                        </tr>

                                        {expandedRow === mov.id && (
                                            <tr className="bg-slate-50/80 dark:bg-slate-800/30">
                                                <td colSpan="6" className="px-6 pb-6 pt-0">
                                                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 ml-10 shadow-sm">

                                                        {/* --- SUB-TABS NAVIGATION --- */}
                                                        <div className="flex border-b border-slate-100 dark:border-slate-800 mb-4">
                                                            <button
                                                                onClick={() => setActiveTab('ticket')}
                                                                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${activeTab === 'ticket' ? 'bg-slate-50 dark:bg-slate-800 text-indigo-600 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                                            >
                                                                <ShoppingBag size={12} />
                                                                Ticket Digital
                                                            </button>
                                                            <button
                                                                onClick={() => setActiveTab('payment')}
                                                                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${activeTab === 'payment' ? 'bg-slate-50 dark:bg-slate-800 text-emerald-600 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                                            >
                                                                <Wallet size={12} />
                                                                Detalle Pagos
                                                            </button>
                                                        </div>

                                                        {/* --- TAB CONTENT --- */}
                                                        <div>
                                                            {activeTab === 'ticket' && (
                                                                <>
                                                                    {(mov.items && mov.items.length > 0) ? (
                                                                        <table className="w-full text-left">
                                                                            <thead className="text-[9px] uppercase font-black text-slate-300 border-b border-slate-50 dark:border-slate-800 mb-2 block w-full pb-1">
                                                                                <tr className="flex w-full">
                                                                                    <th className="w-10">Cant</th>
                                                                                    <th className="flex-1">Producto</th>
                                                                                    <th className="text-right w-20">Total</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="block max-h-40 overflow-auto custom-scrollbar">
                                                                                {mov.items.map((item, idx) => (
                                                                                    <tr key={idx} className="flex w-full border-b border-slate-50 last:border-0 dark:border-slate-800 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors rounded px-1">
                                                                                        <td className="w-10 text-xs font-bold text-slate-500 flex items-center">{item.cantidad}×</td>
                                                                                        <td className="flex-1 text-xs text-slate-700 dark:text-slate-300 flex items-center">{item.nombre}</td>
                                                                                        <td className="w-20 text-xs text-right font-medium text-slate-500 flex flex-col items-end justify-center">
                                                                                            <span>${(item.precio * item.cantidad).toFixed(2)}</span>
                                                                                            <span className="text-[10px] text-slate-400">
                                                                                                Bs {((item.precio * item.cantidad) * (mov.tasa || tasa || 0)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                            </span>
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    ) : (
                                                                        <div className="text-center py-4 text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                                            No existen artículos asociados a este movimiento.
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}

                                                            {activeTab === 'payment' && (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {(mov.pagos || mov.payments || []).map((p, idx) => {
                                                                        const montoSafe = parseFloat(p.amount || p.monto || 0);
                                                                        return (
                                                                            <div key={idx} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                                                                <span className="text-[10px] font-bold text-slate-500 uppercase">{p.method || p.metodo}</span>
                                                                                <span className="text-xs font-black text-slate-800 dark:text-white">
                                                                                    {(p.currency === 'VES' || p.currency === 'BS' || p.tipo === 'BS') ? `Bs ${parseFloat(p.originalAmount || p.amount || p.monto).toFixed(2)}` : `$${montoSafe.toFixed(2)}`}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {(!mov.pagos && !mov.payments) && <span className="text-xs text-slate-400 italic">Sin detalle técnico.</span>}
                                                                </div>
                                                            )}
                                                        </div>

                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 🖨️ TICKETS OCULTOS PARA IMPRESIÓN */}
                <div style={{ display: 'none' }}>
                    <Ticket ref={ticketRef} data={reprintData} />
                    <TicketSaldoFavor ref={ticketSaldoRef} data={reprintData} />
                </div>
            </div>
        </div >
    );
}