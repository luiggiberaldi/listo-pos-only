import React, { useState, useEffect, useMemo } from 'react';
import { FileText, RotateCcw, Search, Eye, Calendar } from 'lucide-react';
import { useStore } from '../../../context/StoreContext';
import { useEmployeeFinance } from '../../../hooks/store/useEmployeeFinance';
import { useFinanceIntegrator } from '../../../hooks/store/useFinanceIntegrator'; // 🛡️ Synergy Hook
import { ActionGuard } from '../../../components/security/ActionGuard';
import { PERMISSIONS } from '../../../config/permissions'; // [FIX PERM-1]
import EmployeeDetail from './components/EmployeeDetail'; // 🆕 Componente Detalle

import Swal from 'sweetalert2';
import { AnimatePresence, motion } from 'framer-motion';

export default function PayrollPage() {
    const { usuarios, usuario } = useStore(); // [FIX ARQ-1] Added usuario
    // Keep individual methods for reading data, but use Integrator for actions
    const { obtenerFinanzas, cerrarPeriodo, obtenerPeriodoActual } = useEmployeeFinance(usuario); // [FIX ARQ-1]
    const { cerrarSemanaConPago } = useFinanceIntegrator(); // 🛡️

    const [empleadosData, setEmpleadosData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [periodoActual, setPeriodoActual] = useState(null);

    // Estado Modal Detalles
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    // [FIX M6] Removido selectedEmployee de deps para evitar recargas innecesarias
    useEffect(() => {
        cargarDatosGlobales();
    }, [usuarios]); // Solo recargar cuando la lista de usuarios cambia

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
                    <h1 className="text-3xl font-black text-content-main dark:text-content-inverse tracking-tight">Reporte de Nómina</h1>
                    <p className="text-content-secondary font-medium">
                        {periodoActual ? `Periodo Abierto: ${new Date(periodoActual.fechaInicio).toLocaleDateString()}` : 'Cargando periodo...'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <ActionGuard permission={PERMISSIONS.NOMINA_CIERRE} onClick={handleCloseGlobal}>
                        <button
                            className="bg-surface-light dark:bg-surface-dark border-2 border-status-dangerBg hover:bg-status-dangerBg text-status-danger px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"
                        >
                            <Calendar size={20} />
                            <span>Cerrar Semana</span>
                        </button>
                    </ActionGuard>


                </div>
            </div>

            {/* Filters */}
            <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-border-subtle dark:border-slate-700 flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-secondary" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar empleado..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-app-light dark:bg-app-dark rounded-xl border border-border-subtle dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary/20 font-medium text-content-main dark:text-content-inverse"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-3xl shadow-xl overflow-hidden border border-border-subtle dark:border-slate-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-app-light/50 dark:bg-app-dark/50 border-b border-border-subtle dark:border-slate-700 text-xs font-black text-content-secondary uppercase tracking-wider">
                                <th className="p-5">Empleado</th>
                                <th className="p-5 hidden sm:table-cell">Cargo</th>
                                <th className="p-5 text-right">Sueldo Base</th>
                                <th className="p-5 text-right text-status-danger">Descuentos</th>
                                <th className="p-5 text-right">Neto Est.</th>
                                <th className="p-5 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle dark:divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-content-secondary font-bold">Cargando datos...</td>
                                </tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-content-secondary font-bold">No se encontraron empleados activos.</td>
                                </tr>
                            ) : filteredEmployees.map((emp) => {
                                const deuda = emp.finanzas.deudaAcumulada || 0;
                                const sueldo = emp.finanzas.sueldoBase || 0;
                                const neto = sueldo - deuda;

                                return (
                                    <tr key={emp.id} className="hover:bg-app-light/80 dark:hover:bg-app-dark/50 transition-colors group">
                                        <td className="p-5">
                                            <div className="font-bold text-content-main dark:text-content-inverse">{emp.nombre}</div>
                                        </td>
                                        <td className="p-5 hidden sm:table-cell text-sm text-content-secondary font-medium">
                                            {emp.rol}
                                        </td>
                                        <td className="p-5 text-right font-mono text-content-main dark:text-content-inverse">
                                            ${sueldo.toFixed(2)}
                                        </td>
                                        <td className="p-5 text-right font-mono font-bold text-status-danger">
                                            {deuda > 0 ? `-$${deuda.toFixed(2)}` : '$0.00'}
                                        </td>
                                        {/* [FIX M2] Mostrar neto negativo consistentemente */}
                                        <td className={`p-5 text-right font-mono font-bold ${neto < 0 ? 'text-status-danger' : 'text-status-success'}`}>
                                            {neto < 0 ? `-$${Math.abs(neto).toFixed(2)} (Debe)` : `$${neto.toFixed(2)}`}
                                        </td>
                                        <td className="p-5 flex justify-center gap-2">
                                            <button
                                                onClick={() => handleViewDetail(emp)}
                                                className="p-2 text-primary hover:bg-primary-light rounded-lg transition-colors"
                                                title="Ver Detalle"
                                            >
                                                <Eye size={18} />
                                            </button>

                                            <ActionGuard permission={PERMISSIONS.NOMINA_CIERRE} onClick={() => handleClosePeriod(emp)}>
                                                <button
                                                    className="p-2 text-content-secondary hover:text-status-danger hover:bg-status-dangerBg rounded-lg transition-colors"
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-dark/60 backdrop-blur-md" onClick={() => setSelectedEmployee(null)}>
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
