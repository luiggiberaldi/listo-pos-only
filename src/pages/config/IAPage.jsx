import { useState } from 'react';
import { Brain, Database, BarChart3 } from 'lucide-react';
import KnowledgeBaseManager from './KnowledgeBaseManager';
import GhostAnalytics from './GhostAnalytics';

export default function IAPage() {
    const [activeTab, setActiveTab] = useState('knowledge');

    const tabs = [
        { id: 'knowledge', label: 'Base de Conocimiento', icon: Database },
        { id: 'analytics', label: 'Análisis de Ghost', icon: BarChart3 }
    ];

    return (
        <div className="h-full flex flex-col">
            {/* Header with Tabs */}
            <div className="bg-white border-b border-slate-200 px-8 pt-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                        <Brain className="text-white" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Inteligencia Artificial</h1>
                        <p className="text-slate-500">Sistema de conocimiento y análisis de Ghost AI</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    px-6 py-3 font-medium rounded-t-lg transition-all flex items-center gap-2
                                    ${activeTab === tab.id
                                        ? 'bg-purple-500 text-white shadow-lg'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }
                                `}
                            >
                                <Icon size={20} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-slate-50">
                {activeTab === 'knowledge' && <KnowledgeBaseManager />}
                {activeTab === 'analytics' && <GhostAnalytics />}
            </div>
        </div>
    );
}
