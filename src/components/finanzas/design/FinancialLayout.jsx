import React from 'react';
import { motion } from 'framer-motion';

export default function FinancialLayout({ icon: Icon, title, subtitle, color = 'indigo', children, sidePanel }) {
    return (
        <div className="flex h-full w-full bg-slate-50/50 backdrop-blur-xl rounded-[2.5rem] overflow-hidden relative border border-white/40 shadow-2xl">

            {/* 1. LEFT: Main Input Area (60%) */}
            <div className="w-[60%] flex flex-col relative z-10 bg-white/80 backdrop-blur-md h-full shadow-xl">
                {/* Header */}
                <div className="p-8 pb-4 shrink-0 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-2xl bg-${color}-500 text-white shadow-lg shadow-${color}-500/30`}>
                                <Icon size={24} strokeWidth={2.5} />
                            </div>
                            <h2 className={`text-3xl font-black text-slate-800 tracking-tight`}>{title}</h2>
                        </div>
                        <p className="text-slate-400 font-medium mt-1 ml-1 text-sm">{subtitle}</p>
                    </div>
                </div>

                {/* Main Content (Inputs) */}
                <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
                    {children}
                </div>
            </div>

            {/* 2. RIGHT: Context & Quick Actions (40%) */}
            <div className="w-[40%] bg-slate-100/50 relative flex flex-col p-6 h-full border-l border-white/50">
                {/* Decorative Background Blob */}
                <div className={`absolute top-0 right-0 w-96 h-96 bg-${color}-500/5 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20`} />
                <div className={`absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none -ml-20 -mb-20`} />

                <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
                    {sidePanel}
                </div>
            </div>
        </div>
    );
}
