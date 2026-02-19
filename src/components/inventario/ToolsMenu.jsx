import React, { useState, useRef, useEffect } from 'react';
import {
    Settings,
    ChevronDown,
    FileSpreadsheet,
    Download,
    Upload,
    Printer,
    Tag,
    ShieldAlert,
    List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActionGuard } from '../security/ActionGuard';
import { PERMISSIONS } from '../../config/permissions';

export default function ToolsMenu({
    onImportClick,
    onExportCatalog,
    onImportCatalog,
    onOpenLabelStudio,
    onPrintAllClick,
    onResetDatabase,
    selectedCount = 0
}) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Animation variants
    const menuVariants = {
        hidden: { opacity: 0, y: -10, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.15, ease: 'out' } },
        exit: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.1 } }
    };

    return (
        <div className="relative z-50" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-3.5 rounded-xl border transition-all shadow-sm font-bold
          ${isOpen
                        ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-700 dark:border-slate-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'
                    }`}
            >
                <Settings size={20} className={isOpen ? 'text-blue-400' : 'text-slate-400'} />
                <span className="hidden sm:inline">Herramientas</span>
                <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={menuVariants}
                        className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden ring-1 ring-black/5"
                    >
                        <div className="p-1.5 flex flex-col gap-0.5" onClick={() => setIsOpen(false)}>

                            {/* SECCIÓN 1: DATOS EXTERNOS */}
                            <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Gestión de Datos</div>

                            <ActionGuard permission={PERMISSIONS.INVENTORY_MANAGE} onClick={onImportClick} actionName="Importar Excel">
                                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-colors text-sm font-medium text-left">
                                    <FileSpreadsheet size={18} />
                                    Importar Excel
                                </button>
                            </ActionGuard>

                            <button
                                onClick={onExportCatalog}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors text-sm font-medium text-left"
                            >
                                <Download size={18} />
                                Guardar Respaldo
                            </button>

                            <button
                                onClick={onImportCatalog}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-orange-50 text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:bg-orange-900/20 dark:hover:text-orange-400 transition-colors text-sm font-medium text-left"
                            >
                                <Upload size={18} />
                                Restaurar Respaldo
                            </button>

                            <div className="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2"></div>

                            {/* SECCIÓN 2: ETIQUETAS E IMPRESIÓN */}
                            <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Etiquetas</div>

                            <button
                                onClick={onOpenLabelStudio}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400 transition-colors text-sm font-medium text-left"
                            >
                                <Tag size={18} />
                                Diseñador de Etiquetas
                            </button>

                            <button
                                onClick={onPrintAllClick}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400 transition-colors text-sm font-medium text-left justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <List size={18} />
                                    <span>Listas de Impresión</span>
                                </div>
                                {selectedCount > 0 && (
                                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full dark:bg-indigo-900 dark:text-indigo-300">
                                        {selectedCount}
                                    </span>
                                )}
                            </button>

                            <div className="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2"></div>

                            {/* SECCIÓN 3: PELIGRO */}
                            <ActionGuard permission={PERMISSIONS.SETTINGS_DB_RESET} onClick={onResetDatabase} actionName="Vaciado de Emergencia">
                                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-500 hover:text-red-700 dark:hover:bg-red-900/20 transition-colors text-sm font-bold text-left">
                                    <ShieldAlert size={18} />
                                    Vaciado de Emergencia
                                </button>
                            </ActionGuard>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
