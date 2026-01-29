import React, { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';
import { generarPreviewURL } from './PriceLabelGenerator';
import Swal from 'sweetalert2';

// Sub-components
import { StudioSidebar } from './studio/StudioSidebar';
import { StudioPreview } from './studio/StudioPreview';

const DEFAULTS_BY_PAPER = {
    '58mm': {
        fontSize: 30, fontSizeSecondary: 10, tituloSize: 14, footerFontSize: 4,
        hierarchyScale: 0.5, hierarchyY: -5,
        titleY: -2, priceY: 1, secondaryPriceY: 1, footerY: -1,
        marginX: 0.5, marginY: 0.5
    },
    '80mm': {
        fontSize: 36, fontSizeSecondary: 11, tituloSize: 15, footerFontSize: 4,
        hierarchyScale: 0.6, hierarchyY: -7,
        titleY: -3, priceY: 0, secondaryPriceY: 2, footerY: -1,
        marginX: 1, marginY: 0.5
    },
    'letter': { /* Pendiente */ }
};

export const LabelStudioModal = ({ isOpen, onClose, selectedProducts = [], tasa = 1 }) => {
    // 1. Configuración por Defecto (Persistent)
    const [profiles, setProfiles] = useState(() => {
        const saved = localStorage.getItem('listo_label_profiles');
        return saved ? JSON.parse(saved) : { '58mm': {}, '80mm': {}, 'letter': {} };
    });

    const [config, setConfig] = useState(() => {
        // Cargar config global antigua como fallback
        const oldSaved = localStorage.getItem('listo_label_config');
        const oldParsed = oldSaved ? JSON.parse(oldSaved) : {};

        // Determinar perfil inicial
        const initialPapel = oldParsed.papel || '58mm';
        const activeProfile = profiles ? profiles[initialPapel] : {};
        const defaults = DEFAULTS_BY_PAPER[initialPapel] || DEFAULTS_BY_PAPER['58mm'];

        return {
            papel: initialPapel,
            moneda: 'mix',
            showDate: true,
            showCode: true,
            showBorder: true,
            fontFamily: 'helvetica',
            designTemplate: 'modern',
            ...defaults, // Cargar defaults específicos del papel
            ...oldParsed, // Migrar config vieja si existe
            ...activeProfile, // Sobrescribir con perfil específico si existe
            _simulateHierarchy: false
        };
    });

    // 2. Estado para Datos de Prueba
    const [mockData, setMockData] = useState({ nombre: "HARINA PAN", precio: 1.50, codigo: "COD-TEST-001" });
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        const currentPaper = config.papel || '58mm';
        setProfiles(prev => {
            const newProfiles = { ...prev, [currentPaper]: config };
            localStorage.setItem('listo_label_profiles', JSON.stringify(newProfiles));
            localStorage.setItem('listo_label_config', JSON.stringify(config));
            return newProfiles;
        });
    }, [config]);

    // Generar Preview (MOCK DINÁMICO)
    useEffect(() => {
        const mockProduct = [{
            nombre: mockData.nombre.toUpperCase(),
            precioVenta: config._simulateHierarchy ? 30.00 : parseFloat(mockData.precio),
            precio: parseFloat(mockData.precio),
            codigo: mockData.codigo,
            id: "mock-1",
            _hierarchyLabel: config._simulateHierarchy ? 'BULTO x20' : null
        }];

        const url = generarPreviewURL(mockProduct, tasa, config);
        setPreviewUrl(url);
        return () => { if (url) URL.revokeObjectURL(url); };
    }, [config, tasa, mockData]);

    if (!isOpen) return null;

    const handlePaperChange = (newFormat) => {
        const targetProfile = profiles[newFormat] || {};
        const defaults = DEFAULTS_BY_PAPER[newFormat] || DEFAULTS_BY_PAPER['58mm'];

        setConfig({
            papel: newFormat,
            moneda: 'mix',
            showDate: true,
            showCode: true,
            showBorder: true,
            fontFamily: 'helvetica',
            designTemplate: 'modern',
            ...defaults, // Aplicar defaults nuevos
            ...targetProfile, // Restaurar guardados si existen
            _simulateHierarchy: false
        });
    };

    const handleSaveAndClose = () => {
        Swal.fire({
            title: 'Diseño Guardado',
            text: 'Tu configuración de etiquetas está lista para usar.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-2xl shadow-2xl border border-white/10 flex flex-col h-[90vh] overflow-hidden">

                {/* HEAD */}
                <div className="p-6 border-b border-border-subtle dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                            <span className="p-2 bg-indigo-600 rounded-lg text-white"><Settings size={20} /></span>
                            Diseñador de Etiquetas
                        </h2>
                        <p className="text-xs text-slate-500 font-medium ml-12 mt-1">
                            Configuración Visual • Personaliza tus etiquetas de precio
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                {/* BODY (Modularized) */}
                <div className="flex-1 flex overflow-hidden">
                    <StudioSidebar
                        config={config}
                        setConfig={setConfig}
                        mockData={mockData}
                        setMockData={setMockData}
                        handlePaperChange={handlePaperChange}
                    />
                    <StudioPreview previewUrl={previewUrl} />
                </div>

                {/* FOOTER */}
                <div className="p-6 border-t border-border-subtle dark:border-white/5 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                    <button onClick={onClose} className="px-6 py-3 font-bold text-sm text-slate-500 hover:bg-black/5 rounded-xl transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSaveAndClose}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/30 flex items-center gap-2"
                    >
                        <Settings size={18} /> GUARDAR DISEÑO
                    </button>
                </div>
            </div>
        </div>
    );
};
