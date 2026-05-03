import React from 'react';
import { motion } from 'framer-motion';

// [V1] Color map for dynamic gradients — Tailwind can't generate dynamic classes
const COLOR_MAP = {
    indigo: {
        iconBg: 'bg-indigo-500',
        iconShadow: 'shadow-indigo-500/30',
        blob1: 'bg-indigo-500/8',
        blob2: 'bg-violet-500/5',
        headerAccent: 'from-indigo-50/80 to-transparent'
    },
    emerald: {
        iconBg: 'bg-emerald-500',
        iconShadow: 'shadow-emerald-500/30',
        blob1: 'bg-emerald-500/8',
        blob2: 'bg-teal-500/5',
        headerAccent: 'from-emerald-50/80 to-transparent'
    },
    rose: {
        iconBg: 'bg-rose-500',
        iconShadow: 'shadow-rose-500/30',
        blob1: 'bg-rose-500/8',
        blob2: 'bg-pink-500/5',
        headerAccent: 'from-rose-50/80 to-transparent'
    }
};

export default function FinancialLayout({ icon: Icon, title, subtitle, color = 'indigo', children, sidePanel }) {
    const theme = COLOR_MAP[color] || COLOR_MAP.indigo;

    return (
        <div className="flex h-full w-full bg-slate-50/50 backdrop-blur-xl rounded-[2.5rem] overflow-hidden relative border border-white/40 shadow-2xl">

            {/* 1. LEFT: Main Input Area (60%) */}
            <div className="w-full md:w-[60%] flex flex-col relative z-10 bg-white/80 backdrop-blur-md h-full shadow-xl">
                {/* [V1] Subtle gradient accent behind header */}
                <div className={`absolute top-0 left-0 right-0 h-40 bg-gradient-to-b ${theme.headerAccent} pointer-events-none`} />

                {/* Header */}
                <div className="p-4 lg:p-6 xl:p-8 pb-4 shrink-0 flex items-center justify-between relative z-10">
                    <div>
                        <div className="flex items-center gap-3">
                            <motion.div
                                initial={{ scale: 0.8, rotate: -10 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className={`p-3 rounded-2xl ${theme.iconBg} text-white shadow-lg ${theme.iconShadow}`}
                            >
                                <Icon size={24} strokeWidth={2.5} />
                            </motion.div>
                            <h2 className="text-xl lg:text-2xl xl:text-3xl font-black text-slate-800 tracking-tight">{title}</h2>
                        </div>
                        <p className="text-slate-400 font-medium mt-1 ml-1 text-sm">{subtitle}</p>
                    </div>
                </div>

                {/* Main Content (Inputs) */}
                <div className="flex-1 overflow-y-auto px-4 lg:px-6 xl:px-8 py-4 custom-scrollbar relative z-10">
                    {children}
                </div>
            </div>

            {/* 2. RIGHT: Context & Quick Actions (40%) — hidden on small screens */}
            <div className="hidden md:flex w-[40%] bg-slate-100/50 relative flex-col p-6 h-full border-l border-white/50">
                {/* [V1] Dynamic decorative blobs based on color */}
                <div className={`absolute top-0 right-0 w-96 h-96 ${theme.blob1} rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20`} />
                <div className={`absolute bottom-0 left-0 w-64 h-64 ${theme.blob2} rounded-full blur-[80px] pointer-events-none -ml-20 -mb-20`} />

                <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
                    {sidePanel}
                </div>
            </div>
        </div>
    );
}
