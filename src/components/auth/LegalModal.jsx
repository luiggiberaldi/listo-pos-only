import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { X, FileText, ShieldCheck, Loader2 } from 'lucide-react';

export default function LegalModal({ isOpen, onClose, docType }) {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !docType) return;

        const fetchDoc = async () => {
            setLoading(true);
            try {
                // Map types to files
                const fileMap = {
                    'EULA': '/legal/EULA.md',
                    'PRIVACY': '/legal/POLITICA_PRIVACIDAD.md'
                };

                const response = await fetch(fileMap[docType]);
                if (!response.ok) throw new Error('Documento no encontrado');
                const text = await response.text();
                setContent(text);
            } catch (error) {
                setContent(`# Error\nNo se pudo cargar el documento legal.\n\n_Detalles: ${error.message}_`);
            } finally {
                setLoading(false);
            }
        };

        fetchDoc();
    }, [isOpen, docType]);

    const titleMap = {
        'EULA': 'Licencia de Uso de Software',
        'PRIVACY': 'Política de Privacidad y Términos'
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
                    exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    className="fixed inset-0 z-[70] bg-slate-950/80 flex items-center justify-center p-4"
                    onClick={(e) => e.target === e.currentTarget && onClose()}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* HEADER */}
                        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                                    {docType === 'EULA' ? <FileText size={24} /> : <ShieldCheck size={24} />}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{titleMap[docType] || 'Documento Legal'}</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-wider uppercase">V. 2026.1 - OFICIAL</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* CONTENT */}
                        <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-slate-950 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 text-slate-600 dark:text-slate-300">
                            {loading ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                                    <Loader2 size={48} className="animate-spin text-indigo-500" />
                                    <p className="animate-pulse text-sm font-medium">Cargando documento...</p>
                                </div>
                            ) : (
                                <article className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-li:text-slate-600 dark:prose-li:text-slate-300">
                                    <ReactMarkdown>{content}</ReactMarkdown>
                                </article>
                            )}
                        </div>

                        {/* FOOTER */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:opacity-90 transition-opacity text-sm shadow-lg"
                            >
                                Entendido
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
