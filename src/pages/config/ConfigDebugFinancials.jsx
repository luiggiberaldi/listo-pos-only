import React from 'react';
import { useDebugFinancials } from '../../hooks/testing/useDebugFinancials';
import { Save } from 'lucide-react';

export default function ConfigDebugFinancials() {
    const { ejecutarDiagnostico, isRunning, logs } = useDebugFinancials();

    return (
        <div className="p-4 bg-gray-900 text-white rounded-lg">
            <h2 className="text-xl font-bold mb-4">🔬 Diagnóstico Financiero (Anti-Stale)</h2>

            <button
                onClick={ejecutarDiagnostico}
                disabled={isRunning}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 mb-4 disabled:opacity-50"
            >
                <Save size={18} />
                {isRunning ? 'Ejecutando...' : 'Correr Diagnóstico'}
            </button>

            <div className="bg-black p-4 rounded h-64 overflow-y-auto font-mono text-xs border border-gray-700">
                {logs.length === 0 ? <span className="text-gray-500">Esperando ejecución...</span> : logs.map((l, i) => (
                    <div key={i} className="mb-1 border-b border-gray-800 pb-1">{l}</div>
                ))}
            </div>
        </div>
    );
}
