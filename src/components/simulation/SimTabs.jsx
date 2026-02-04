import React from 'react';
import { Zap, Skull, Lock, Briefcase } from 'lucide-react';

export const SimTabs = ({ activeTab, setActiveTab }) => {
    return (
        <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 gap-2 overflow-x-auto">
            <button
                onClick={() => setActiveTab('sim')}
                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-black text-xs uppercase tracking-tighter flex items-center justify-center gap-2 transition-all ${activeTab === 'sim' ? 'bg-blue-600 text-white shadow-lg scale-[1.02]' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
                <Zap size={16} /> Simulación
            </button>
            <button
                onClick={() => setActiveTab('chaos')}
                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-black text-xs uppercase tracking-tighter flex items-center justify-center gap-2 transition-all ${activeTab === 'chaos' ? 'bg-red-600 text-white shadow-lg scale-[1.02]' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
                <Skull size={16} /> Stress
            </button>
            <button
                onClick={() => setActiveTab('rbac')}
                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-black text-xs uppercase tracking-tighter flex items-center justify-center gap-2 transition-all ${activeTab === 'rbac' ? 'bg-amber-600 text-white shadow-lg scale-[1.02]' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
                <Lock size={16} /> Seguridad
            </button>
            <button
                onClick={() => setActiveTab('finance')}
                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-black text-xs uppercase tracking-tighter flex items-center justify-center gap-2 transition-all ${activeTab === 'finance' ? 'bg-emerald-600 text-white shadow-lg scale-[1.02]' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
                <Briefcase size={16} /> Finanzas
            </button>
        </div>
    );
};
