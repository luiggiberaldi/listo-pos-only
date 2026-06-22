import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({
    options = [],
    value,
    onChange,
    disabled = false,
    className = "",
    placeholder = "Seleccionar...",
    icon: Icon = null,
    iconSize = 16,
    optionsClassName = "",
    dropdownWidth = "w-full"
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Normalize options: support both strings/numbers and objects
    const normalizedOptions = options.map(opt => {
        if (typeof opt === 'object' && opt !== null) {
            return opt;
        }
        return { value: opt, label: String(opt) };
    });

    const selectedOption = normalizedOptions.find(opt => opt.value === value);

    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleToggle = (e) => {
        e.preventDefault();
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    const handleSelect = (val, e) => {
        e.preventDefault();
        if (onChange) {
            onChange(val);
        }
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="relative w-full">
            <button
                type="button"
                disabled={disabled}
                onClick={handleToggle}
                className={`w-full flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-all text-left outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            >
                <div className="flex items-center gap-2 truncate flex-1">
                    {Icon && <Icon size={iconSize} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />}
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown 
                    size={14} 
                    className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 flex-shrink-0 ml-1.5 ${isOpen ? 'rotate-180' : 'rotate-0'}`} 
                />
            </button>

            {isOpen && (
                <div className={`absolute left-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-[999] overflow-hidden max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-100 ${dropdownWidth} ${optionsClassName}`}>
                    <div className="py-1">
                        {normalizedOptions.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 italic text-center">
                                Sin opciones
                            </div>
                        ) : (
                            normalizedOptions.map((opt) => {
                                const isSelected = opt.value === value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={(e) => handleSelect(opt.value, e)}
                                        className={`w-full text-left px-3 py-2.5 text-xs font-bold transition-colors flex items-center justify-between ${
                                            isSelected
                                                ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-black'
                                                : 'text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                        }`}
                                    >
                                        <span className="truncate">{opt.label}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
