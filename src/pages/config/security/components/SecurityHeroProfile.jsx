import { ShieldCheck, User, CheckCircle2, Crown, Terminal, KeyRound, Pencil } from 'lucide-react';

export default function SecurityHeroProfile({ currentUser, onManageAccess, onUpdateName, readOnly }) {
    const isOwner = currentUser?.roleId === 'ROL_DUENO' || currentUser?.tipo === 'ADMIN';

    return (
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl p-8 border border-white/10 relative z-10 group">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 p-12 opacity-20 pointer-events-none transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform duration-700 ease-out">
                <ShieldCheck size={240} className="text-primary-light/30" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -translate-x-full group-hover:translate-x-full ease-in-out pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="relative group/avatar">
                    <div className="w-28 h-28 rounded-3xl bg-white/10 flex items-center justify-center border-2 border-white/20 shadow-xl backdrop-blur-sm group-hover/avatar:border-primary-light transition-colors duration-300">
                        <User size={48} className="text-slate-300 group-hover/avatar:text-white transition-colors" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-status-success w-10 h-10 rounded-xl rotate-3 flex items-center justify-center border-4 border-slate-900 shadow-lg scale-100 group-hover/avatar:scale-110 group-hover/avatar:rotate-0 transition-all">
                        <CheckCircle2 size={18} className="text-white" />
                    </div>
                </div>

                <div className="flex-1 text-center md:text-left space-y-3">
                    <div>
                        <div className="flex items-center justify-center md:justify-start gap-3">
                            <h2 className="text-4xl font-bold tracking-tight text-white">{currentUser?.nombre}</h2>
                            <button
                                onClick={onUpdateName}
                                disabled={readOnly}
                                className="p-2 rounded-full bg-white/5 hover:bg-white/20 text-indigo-300 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                title="Cambiar Nombre"
                            >
                                <Pencil size={18} />
                            </button>
                        </div>
                        <p className="text-indigo-200 font-medium text-lg">Panel de Control de Seguridad</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <span className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 border shadow-lg backdrop-blur-md ${isOwner ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-primary/20 border-primary/50 text-indigo-300'}`}>
                            {isOwner ? <Crown size={14} /> : <Terminal size={14} />}
                            {isOwner ? 'CONTROL TOTAL' : (currentUser?.rol || 'Empleado')}
                        </span>
                        <span className="text-slate-400 text-xs font-mono bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">ID: {currentUser?.id}</span>
                    </div>
                </div>

                <button
                    onClick={onManageAccess}
                    disabled={readOnly}
                    className="group relative px-8 py-5 bg-gradient-to-r from-primary to-primary-hover text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-primary/30 hover:shadow-primary/50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shrink-0 border border-white/10"
                >
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="p-2 bg-white/20 rounded-lg group-hover:rotate-12 transition-transform">
                            <KeyRound size={20} />
                        </div>
                        <div className="text-left">
                            <div className="text-[10px] font-medium text-indigo-200 tracking-wider">CREDENCIALES</div>
                            <div className="text-base">GESTIONAR ACCESO</div>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );
}