import React, { useRef } from 'react';
import { ShieldCheck, FileText, ScrollText } from 'lucide-react';
import { FULL_CONTRACT } from './LegalConstants';

export default function ContractViewer({ onScrollEnd, hasScrolledToEnd, onContinue }) {
    const scrollContainerRef = useRef(null);

    const handleScroll = () => {
        const container = scrollContainerRef.current;
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
            if (isAtBottom) {
                onScrollEnd();
            }
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="h-1 bg-slate-800 shrink-0">
                <div className={`h-full transition-all duration-500 ${hasScrolledToEnd ? 'bg-emerald-500 w-full' : 'bg-amber-500 w-1/2'}`} />
            </div>

            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-8 bg-slate-900/50 scroll-smooth"
            >
                <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-10 shadow-2xl">
                    <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-800">
                        <FileText size={24} className="text-slate-500" />
                        <div>
                            <h2 className="text-lg font-bold text-white">Documentos Legales Unificados (v1.1)</h2>
                            <p className="text-xs text-slate-500">Desplácese hacia abajo para habilitar el siguiente paso</p>
                        </div>
                    </div>
                    <pre className="whitespace-pre-wrap font-mono text-sm text-slate-300 leading-relaxed">
                        {FULL_CONTRACT}
                    </pre>
                </div>
            </div>

            {/* Footer Acción */}
            <div className="bg-slate-900 border-t border-slate-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 text-sm">
                    {hasScrolledToEnd ? (
                        <span className="text-emerald-400 flex items-center gap-2">
                            <ShieldCheck size={18} />
                            ✓ Lectura completada
                        </span>
                    ) : (
                        <span className="text-amber-500 flex items-center gap-2 animate-pulse">
                            <ScrollText size={18} />
                            Desplácese hasta el final para continuar...
                        </span>
                    )}
                </div>

                <button
                    onClick={onContinue}
                    disabled={!hasScrolledToEnd}
                    className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${hasScrolledToEnd
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30 active:scale-[0.98]'
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        }`}
                >
                    Continuar <span className="text-lg">→</span>
                </button>
            </div>
        </div>
    );
}
