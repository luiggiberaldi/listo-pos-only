import React, { useState, useRef, useEffect } from 'react';
import { Tag, Plus, Check, ChevronDown, Search } from 'lucide-react';
import Swal from 'sweetalert2';
import { useStore } from '../../context/StoreContext';

/**
 * Selector de Categoría Inteligente
 * Permite buscar, seleccionar y crear categorías al vuelo.
 */
export default function SmartCategorySelector({
    value,
    onChange,
    categories = [],
    onQuickCreate
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // Filtrar categorías
    const filteredCategories = categories.filter(c =>
        c?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Cerrar al hacer clic fuera
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    // Manejar selección
    const handleSelect = (catNombre) => {
        onChange(catNombre);
        setIsOpen(false);
        setSearchTerm('');
    };

    // Manejar creación rápida
    const handleCreate = async () => {
        if (onQuickCreate) {
            const newCat = await onQuickCreate(searchTerm);
            if (newCat) handleSelect(newCat);
        }
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div
                className="w-full relative group cursor-pointer"
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) setTimeout(() => inputRef.current?.focus(), 100);
                }}
            >
                {/* ICONO */}
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isOpen ? 'text-blue-500' : 'text-slate-400'}`}>
                    <Tag size={18} />
                </div>

                {/* DISPLAY VALUE (O Placeholder) */}
                <div className={`w-full pl-12 pr-10 py-3 rounded-xl border transition-all flex items-center
                    ${isOpen
                        ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-slate-900'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-blue-300'
                    }`}
                >
                    <span className={`font-bold ${value ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>
                        {value || 'Seleccionar Categoría'}
                    </span>
                </div>

                {/* ARROW */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {/* DROPDOWN MENU */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                    {/* SEARCH INPUT */}
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:text-blue-700 transition-colors placeholder:text-slate-400"
                                placeholder="Buscar o crear..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    {/* LIST */}
                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                        {/* Opción CREAR si hay texto y no existe */}
                        {searchTerm && !categories.some(c => c.nombre.toLowerCase() === searchTerm.toLowerCase()) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCreate();
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors group mb-1"
                            >
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                    <Plus size={16} />
                                </div>
                                <div className="flex-1">
                                    <span className="text-sm font-bold block">Crear "{searchTerm}"</span>
                                    <span className="text-[10px] opacity-70">Nueva Categoría</span>
                                </div>
                            </button>
                        )}

                        {/* LISTA FILTRADA */}
                        {filteredCategories.length > 0 ? (
                            filteredCategories.map(cat => (
                                <button
                                    key={cat.id || cat.nombre}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(cat.nombre);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                                        ${value === cat.nombre
                                            ? 'bg-blue-50 dark:bg-slate-800'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    <div className={`w-2 h-8 rounded-full ${value === cat.nombre ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                    <span className={`text-sm font-bold flex-1 ${value === cat.nombre ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                        {cat.nombre}
                                    </span>
                                    {value === cat.nombre && <Check size={16} className="text-blue-500" />}
                                </button>
                            ))
                        ) : (
                            !searchTerm && (
                                <div className="text-center py-8 text-slate-400 text-xs">
                                    No hay categorías
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
