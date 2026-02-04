import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Printer, RotateCcw, Search, Eye, Calendar } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { useEmployeeFinance } from '../../../hooks/store/useEmployeeFinance';
import { useFinanceIntegrator } from '../../../hooks/store/useFinanceIntegrator'; // 🛡️ Synergy Hook
import { ActionGuard } from '../../../components/security/ActionGuard';
import EmployeeDetail from './components/EmployeeDetail'; // 🆕 Componente Detalle
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Swal from 'sweetalert2';
import { AnimatePresence, motion } from 'framer-motion';

export default function PayrollPage() {
    const { usuarios } = useStore();
    // Keep individual methods for reading data, but use Integrator for actions
    const { obtenerFinanzas, cerrarPeriodo, obtenerPeriodoActual } = useEmployeeFinance();
    const { cerrarSemanaConPago } = useFinanceIntegrator(); // 🛡️

    const [empleadosData, setEmpleadosData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [periodoActual, setPeriodoActual] = useState(null);

    // Estado Modal Detalles
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    useEffect(() => {
        cargarDatosGlobales();
    }, [usuarios, selectedEmployee]); // Recargar si cerramos modal (para ver updates)

    const cargarDatosGlobales = async () => {
        // setLoading(true); // Evitar parpadeo excesivo
        const p = await obtenerPeriodoActual();
        setPeriodoActual(p);

        const empleadosActivos = usuarios.filter(u => u.activo && u.rol !== 'admin'); // Excluir admin/dueño si se desea

        const dataPromises = empleadosActivos.map(async (emp) => {
            const finanzas = await obtenerFinanzas(emp.id);
            return {
                ...emp,
                finanzas
            };
        });

        const results = await Promise.all(dataPromises);
        setEmpleadosData(results);
        if (loading) setLoading(false);
    };

    const filteredEmployees = useMemo(() => {
        if (!searchTerm) return empleadosData;
        const lower = searchTerm.toLowerCase();
        return empleadosData.filter(e =>
            e.nombre.toLowerCase().includes(lower) ||
            e.rol.toLowerCase().includes(lower)
        );
    }, [empleadosData, searchTerm]);

    // --- ACCIONES DE REPORTE ---

    const handlePrintReport = () => {
        const doc = new jsPDF();

        // Header
        const periodoStr = periodoActual ? `Periodo #${periodoActual.id} (${new Date(periodoActual.fechaInicio).toLocaleDateString()})` : 'Periodo Actual';

        doc.setFontSize(18);
        doc.text("Reporte de Nómina y Descuentos", 14, 20);
        doc.setFontSize(10);
        doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 28);
        doc.text(periodoStr, 14, 34);

        // Tabla
        const tableBody = filteredEmployees.map(emp => [
            emp.nombre,
            emp.rol,
            `$${(emp.finanzas.sueldoBase || 0).toFixed(2)}`,
            `$${(emp.finanzas.deudaAcumulada || 0).toFixed(2)}`,
            `$${Math.max(0, (emp.finanzas.sueldoBase || 0) - (emp.finanzas.deudaAcumulada || 0)).toFixed(2)}`,
            "__________________" // Firma
        ]);

        doc.autoTable({
            startY: 40,
            head: [['Empleado', 'Cargo', 'Sueldo Base', 'Descuentos', 'Neto a Pagar', 'Firma Recibido']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] }, // Indigo color
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 25 },
                2: { halign: 'right' },
                3: { halign: 'right', textColor: [220, 38, 38] },
                4: { halign: 'right', fontStyle: 'bold' },
                5: { cellWidth: 40 }
            }
        });

        // Totales Totales
        const totalDescuentos = filteredEmployees.reduce((ac, el) => ac + (el.finanzas.deudaAcumulada || 0), 0);
        const finalY = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(12);
        doc.text(`Total Descuentos Periodo: $${totalDescuentos.toFixed(2)}`, 14, finalY);

        doc.save(`Nomina_Semana_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // 🆕 CIERRE GLOBAL (Finance 2.0)
    const handleCloseGlobal = async () => {
        const result = await Swal.fire({
            title: '¿Cerrar Periodo Global?',
            html: `<p>Esta acción:</p>
                   <ul style="text-align:left; font-size:0.9em; margin-top:10px;">
                    <li>✅ Finalizará la semana actual de nómina.</li>
                    <li>✅ Archivará todos los movimientos en el ledger.</li>
                    <li>✅ <strong>Reiniciará a $0</strong> la deuda de TODOS los empleados.</li>
                   </ul>
                   <p style="margin-top:10px; font-weight:bold; color:red;">⚠️ Esta acción es irreversible.</p>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Sí, Cerrar Semana',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            // 🛡️ Integrator Call
            const res = await cerrarSemanaConPago();

            if (res.success) {
                // TODO: En Fase 4, mostrar Resumen con opción a imprimir comprobante de egreso global
                Swal.fire({
                    title: 'Semana Cerrada',
                    text: 'Se ha cerrado el periodo y se ha generado el reporte de gasto.',
                    icon: 'success',
                    timer: 2000
                });
                cargarDatosGlobales();
            } else {
                Swal.fire('Error', res.message, 'error');
            }
        }
    };

    // --- ACCIONES DE GESTIÓN ---

    const handleViewDetail = (emp) => {
        setSelectedEmployee(emp);
    };

    const handleClosePeriod = async (emp) => {
        const result = await Swal.fire({
            title: '¿Cerrar Periodo?',
            text: `Se reseteará la deuda de ${emp.nombre} a $0.00. Esta acción es irreversible.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            confirmButtonText: 'Sí, Cerrar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            const res = await cerrarPeriodo(emp.id);
            if (res.success) {
                Swal.fire('Cerrado', 'Deuda reiniciada correctamente', 'success');
                cargarDatosGlobales();
                if (selectedEmployee?.id === emp.id) setSelectedEmployee(null); // Cerrar modal si estaba abierto
            }
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header Page */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Reporte de Nómina</h1>
                    <p className="text-slate-500 font-medium">
                        {periodoActual ? `Periodo Abierto: ${new Date(periodoActual.fechaInicio).toLocaleDateString()}` : 'Cargando periodo...'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <ActionGuard permission="OWNER_ACCESS" onClick={handleCloseGlobal}>
                        <button
                            className="bg-white border-2 border-rose-100 hover:bg-rose-50 text-rose-600 px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"
                        >
                            <Calendar size={20} />
                            <span>Cerrar Semana</span>
                        </button>
                    </ActionGuard>

                    <button
                        onClick={handlePrintReport}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                    >
                        <Printer size={20} />
                        <span>Imprimir Reporte</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar empleado..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-black text-slate-400 uppercase tracking-wider">
                                <th className="p-5">Empleado</th>
                                <th className="p-5 hidden sm:table-cell">Cargo</th>
                                <th className="p-5 text-right">Sueldo Base</th>
                                <th className="p-5 text-right text-rose-500">Descuentos</th>
                                <th className="p-5 text-right">Neto Est.</th>
                                <th className="p-5 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-slate-400 font-bold">Cargando datos...</td>
                                </tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-slate-400 font-bold">No se encontraron empleados activos.</td>
                                </tr>
                            ) : filteredEmployees.map((emp) => {
                                const deuda = emp.finanzas.deudaAcumulada || 0;
                                const sueldo = emp.finanzas.sueldoBase || 0;
                                const neto = Math.max(0, sueldo - deuda);

                                return (
                                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="p-5">
                                            <div className="font-bold text-slate-700">{emp.nombre}</div>
                                        </td>
                                        <td className="p-5 hidden sm:table-cell text-sm text-slate-500 font-medium">
                                            {emp.rol}
                                        </td>
                                        <td className="p-5 text-right font-mono text-slate-600">
                                            ${sueldo.toFixed(2)}
                                        </td>
                                        <td className="p-5 text-right font-mono font-bold text-rose-500">
                                            {deuda > 0 ? `-$${deuda.toFixed(2)}` : '$0.00'}
                                        </td>
                                        <td className="p-5 text-right font-mono font-bold text-emerald-600">
                                            ${neto.toFixed(2)}
                                        </td>
                                        <td className="p-5 flex justify-center gap-2">
                                            <button
                                                onClick={() => handleViewDetail(emp)}
                                                className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Ver Detalle"
                                            >
                                                <Eye size={18} />
                                            </button>

                                            <ActionGuard permission="OWNER_ACCESS" onClick={() => handleClosePeriod(emp)}>
                                                <button
                                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Cerrar Periodo (Reset Deuda)"
                                                >
                                                    <RotateCcw size={18} />
                                                </button>
                                            </ActionGuard>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DETALLE (Integrado) */}
            <AnimatePresence>
                {selectedEmployee && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedEmployee(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-2xl"
                        >
                            <EmployeeDetail usuario={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
