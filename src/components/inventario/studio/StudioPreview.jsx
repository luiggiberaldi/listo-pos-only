import React from 'react';
import { Printer } from 'lucide-react';

export const StudioPreview = ({ previewUrl }) => {
    return (
        <div className="flex-1 bg-slate-800/90 flex flex-col items-center justify-center relative p-8">
            {previewUrl ? (
                <div className="w-full h-full bg-white shadow-2xl rounded-sm overflow-hidden border-4 border-slate-700">
                    <iframe
                        src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                        className="w-full h-full"
                        title="PDF Preview"
                    />
                </div>
            ) : (
                <div className="text-white flex flex-col items-center animate-pulse">
                    <Printer size={48} className="mb-4 opacity-50" />
                    <span className="text-lg font-bold">Generando Preview...</span>
                </div>
            )}

            <div className="absolute bottom-4 bg-black/70 px-4 py-2 rounded-full text-white text-xs font-medium backdrop-blur-md">
                PREVISUALIZACIÓN DE DISEÑO (DATOS DE EJEMPLO)
            </div>
        </div>
    );
};
