import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full text-center">
                {/* 404 Animation */}
                <div className="relative mb-8">
                    <div className="text-[180px] font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-600 leading-none select-none">
                        404
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
                    </div>
                </div>

                {/* Message */}
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                    Página No Encontrada
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                    Lo sentimos, la página que buscas no existe o ha sido movida. Verifica la URL o regresa al inicio.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button
                        onClick={() => navigate('/')}
                        className="px-8 py-4 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-3"
                    >
                        <Home size={20} />
                        Ir al Inicio
                    </button>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-300 flex items-center gap-3"
                    >
                        <ArrowLeft size={20} />
                        Volver Atrás
                    </button>
                </div>

                {/* Quick Links */}
                <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 font-medium">
                        Enlaces Útiles
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <button
                            onClick={() => navigate('/vender')}
                            className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Caja
                        </button>
                        <button
                            onClick={() => navigate('/inventario')}
                            className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Inventario
                        </button>
                        <button
                            onClick={() => navigate('/clientes')}
                            className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Clientes
                        </button>
                        <button
                            onClick={() => navigate('/reportes')}
                            className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Reportes
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-xs text-slate-400 dark:text-slate-600">
                    <p>Si crees que esto es un error, contacta al administrador del sistema.</p>
                </div>
            </div>
        </div>
    );
}
