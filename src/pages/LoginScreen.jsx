// ✅ SYSTEM IMPLEMENTATION - V. 6.1 (NETFLIX UX + ADMIN TOOLS)
// Archivo: src/pages/LoginScreen.jsx
// Objetivo: Pantalla de Login inmersiva con selección de perfiles y navegación por teclado.
// REQUIERE: npm install framer-motion

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, X, Keyboard, AlertCircle, ShieldAlert, Crown, MessageSquare, Send, Loader2 } from 'lucide-react'; // 🟢 Added Icons
// import { Logo } from '../components/Logo'; // Eliminado
import { verifySecurityCode } from '../utils/securityUtils'; // 🟢 Restored
import { db } from '../db'; // 🟢 Restored (Dexie)
import { dbMaster } from '../services/firebase'; // 🟢 Added dbMaster (Firestore)
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; // 🟢 Firestore
import Swal from 'sweetalert2';

// --- CONSTANTES ---
const PIN_LENGTH = 6;
const AVATAR_COLORS = [
    'from-blue-500 to-cyan-500',
    'from-[#6366F1] to-[#A855F7]', // Replaced Emerald with Indigo->Purple
    'from-orange-500 to-amber-500',
    'from-purple-500 to-pink-500',
    'from-indigo-500 to-violet-500',
    'from-rose-500 to-red-500'
];

import ModalRecoveryCode from '../components/auth/ModalRecoveryCode'; // 🟢 NEW IMPORT
import LegalModal from '../components/auth/LegalModal'; // 🟢 PROFESSIONAL LEGAL MODAL

import { CardBody, CardContainer, CardItem } from '../components/ui/3d-card';

export default function LoginScreen() {
    const navigate = useNavigate();
    const {
        usuarios, login, adminResetUserPin, SUPER_ADMIN_ID,
        tempPukCode, confirmarLecturaPuk, validarCodigoRescate, validarTokenSoporte, getSystemID, // 🟢 PUK EXPORTS
        configuracion // 🟢 Config for Business Name
    } = useStore();
    const [selectedUser, setSelectedUser] = useState(null);
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // 🟢 Legal Modal State
    const [legalModalState, setLegalModalState] = useState({ isOpen: false, docType: null });

    // 🟢 Feedback State
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [feedbackData, setFeedbackData] = useState({ title: '', message: '' });
    const [sendingFeedback, setSendingFeedback] = useState(false);

    // 🟢 Secret Menu State
    const [secretClicks, setSecretClicks] = useState(0);

    // Ref para el input invisible
    const codeInputRef = useRef(null);

    // --- FEEDBACK HANDLER ---
    const handleSendFeedback = async (e) => {
        e.preventDefault();
        if (!feedbackData.title.trim() || !feedbackData.message.trim()) return;

        setSendingFeedback(true);
        try {
            if (!dbMaster) throw new Error("Sin conexión a Master");

            await addDoc(collection(dbMaster, "sugerencias"), {
                hardwareId: getSystemID(),
                nombreNegocio: configuracion?.nombre || 'NO_CONFIGURADO',
                ...feedbackData,
                fecha: serverTimestamp(),
                leido: false,
                version: 'v6.1'
            });

            Swal.fire({
                icon: 'success',
                title: '¡Mensaje Enviado!',
                text: 'Gracias por ayudarnos a mejorar.',
                timer: 2000,
                showConfirmButton: false
            });
            setIsFeedbackOpen(false);
            setFeedbackData({ title: '', message: '' });

        } catch (error) {
            console.error("Error enviando feedback:", error);
            Swal.fire('Error', 'No se pudo enviar el mensaje. Revisa tu conexión.', 'error');
        } finally {
            setSendingFeedback(false);
        }
    };

    // Filtrar solo usuarios activos
    const activeUsers = (usuarios || []).filter(u => u.activo !== false);

    // --- ATAJOS DE TECLADO ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!selectedUser) {
                // Selector 1-9
                const num = parseInt(e.key);
                if (!isNaN(num) && num > 0 && num <= activeUsers.length) {
                    handleUserClick(activeUsers[num - 1]);
                }
            } else {
                // ESC para salir
                if (e.key === 'Escape') handleCloseModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedUser, activeUsers]);

    // --- ENFOQUE AUTOMÁTICO ROBUSTO ---
    useEffect(() => {
        if (selectedUser) {
            // Intentar enfocar múltiples veces para asegurar (por animaciones)
            const focusInput = () => codeInputRef.current?.focus();
            focusInput();

            const t1 = setTimeout(focusInput, 100);
            const t2 = setTimeout(focusInput, 300);

            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
    }, [selectedUser]);

    // --- LÓGICA DE LOGIN ---
    const handlePinSubmit = async (e) => {
        if (e) e.preventDefault();
        if (pin.length !== PIN_LENGTH || isProcessing) return;

        setIsProcessing(true);
        await new Promise(r => setTimeout(r, 400)); // UX Pause

        try {
            const exito = await login(pin, selectedUser?.id);
            if (!exito) throw new Error('PIN Incorrecto');
            // ✅ Navegación explícita después de login exitoso
            navigate('/', { replace: true });
        } catch (err) {
            setError(true);
            setPin('');
            setIsProcessing(false);
            setTimeout(() => setError(false), 600);
            setTimeout(() => codeInputRef.current?.focus(), 100);
        }
    };

    const handleCloseModal = () => {
        setSelectedUser(null);
        setPin('');
        setError(false);
    };

    const handleUserClick = (u) => {
        setSelectedUser(u);
        setError(false);
        setPin('');
    };

    // --- HERRAMIENTAS DE EMERGENCIA ELIMINADAS (ADIÓS PUK) ---
    // Todo reset de PIN ahora se gestiona desde Listo Master
    const handleLogoClick = () => {
        // Placeholder por si queremos agregar algo en el futuro
        // Actualmente solo resetea el contador estético del logo
        if (secretClicks > 0) setSecretClicks(0);
    };

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-app-dark text-content-inverse font-sans selection:bg-primary/30 overflow-hidden relative">



            {/* BACKGROUND */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px]" />
                <div className="absolute -bottom-[20%] -right-[10%] w-[800px] h-[800px] bg-primary-light/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">

                {/* HEADER */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16 relative">
                    <div onClick={handleLogoClick} className="cursor-pointer select-none active:scale-95 transition-transform inline-block relative">
                        {/* 🟢 LOGO: SIZE ADJUSTED (h-36) */}
                        {/* 🟢 LOGO: Listo POS Power Icon */}
                        <img src="listo-pos-logo.png" alt="LISTO POS" className="h-36 mx-auto mb-6 object-contain" />
                        {secretClicks > 2 && (
                            <div className="absolute -right-6 top-0 bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold animate-bounce">{7 - secretClicks}</div>
                        )}
                    </div>
                    <h1 className="text-3xl font-light tracking-[0.2em] text-content-secondary">¿QUIÉN ESTÁ <strong className="text-content-inverse font-bold">OPERANDO</strong>?</h1>
                </motion.div>

                {/* GRID */}
                <motion.div
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 max-w-5xl"
                    initial="hidden" animate="show"
                    variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
                >
                    {activeUsers.map((u, idx) => (
                        <UserCard key={u.id} user={u} index={idx} onClick={() => handleUserClick(u)} />
                    ))}

                    {/* Reset Card */}
                    <motion.button
                        variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => window.location.reload()}
                        className="flex flex-col items-center justify-center gap-4 group opacity-40 hover:opacity-100 transition-opacity"
                    >
                        <div className="w-32 h-32 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center group-hover:border-slate-500 transition-colors">
                            <Keyboard size={32} className="text-slate-600 group-hover:text-slate-400" />
                        </div>
                        <span className="text-xs font-bold text-content-secondary uppercase tracking-widest group-hover:text-primary">RECARGAR</span>
                    </motion.button>
                </motion.div>

                {/* --- LEGAL FOOTER --- */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="absolute bottom-6 left-0 w-full flex justify-center gap-6"
                >
                    <button onClick={() => setLegalModalState({ isOpen: true, docType: 'EULA' })} className="text-[10px] font-bold text-slate-600 hover:text-slate-400 uppercase tracking-[0.2em] transition-colors outline-none">
                        Documento Legal
                    </button>
                    <span className="w-px h-3 bg-slate-800" />
                    <button onClick={() => setLegalModalState({ isOpen: true, docType: 'PRIVACY' })} className="text-[10px] font-bold text-slate-600 hover:text-slate-400 uppercase tracking-[0.2em] transition-colors outline-none">
                        Términos y Condiciones
                    </button>
                </motion.div>
            </div>

            {/* 🟢 LEGAL MODAL */}
            <LegalModal
                isOpen={legalModalState.isOpen}
                docType={legalModalState.docType}
                onClose={() => setLegalModalState(prev => ({ ...prev, isOpen: false }))}
            />

            {/* 🟢 FEEDBACK FAB */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsFeedbackOpen(true)}
                className="absolute bottom-6 right-6 bg-slate-800/50 backdrop-blur-md p-3 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all z-40 shadow-xl group"
                title="Enviar Sugerencia"
            >
                <MessageSquare size={24} />
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Sugerencias
                </span>
            </motion.button>

            {/* 🟢 FEEDBACK MODAL */}
            <AnimatePresence>
                {isFeedbackOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={(e) => e.target === e.currentTarget && setIsFeedbackOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-slate-900/90 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <MessageSquare className="text-blue-400" size={20} />
                                    Buzón de Sugerencias
                                </h3>
                                <button onClick={() => setIsFeedbackOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSendFeedback} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Asunto</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="Ej: Nueva función, Reporte de error..."
                                        value={feedbackData.title}
                                        onChange={e => setFeedbackData({ ...feedbackData, title: e.target.value })}
                                        maxLength={50}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tu Mensaje</label>
                                    <textarea
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-32"
                                        placeholder="Describe tu idea detalladamente..."
                                        value={feedbackData.message}
                                        onChange={e => setFeedbackData({ ...feedbackData, message: e.target.value })}
                                        maxLength={500}
                                    />
                                    <div className="text-right text-[10px] text-slate-600 mt-1">
                                        {feedbackData.message.length}/500
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={sendingFeedback || !feedbackData.title.trim() || !feedbackData.message.trim()}
                                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/20"
                                >
                                    {sendingFeedback ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                    {sendingFeedback ? 'Enviando...' : 'Enviar Feedback'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODAL PIN */}
            <AnimatePresence>
                {selectedUser && (
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
                        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-surface-dark border border-border-subtle p-8 rounded-3xl shadow-2xl max-w-sm w-full relative overflow-visible"
                        >
                            {/* 🟢 CLOSE BUTTON: Z-Index alto para poder clickear */}
                            <button
                                onClick={handleCloseModal}
                                className="absolute -top-12 right-0 text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full hover:bg-white/20 z-50"
                                tabIndex={-1}
                            >
                                <X size={20} />
                            </button>

                            <div className="flex flex-col items-center">
                                <Avatar user={selectedUser} size="large" className="mb-6 shadow-2xl ring-4 ring-slate-800" />
                                <h2 className="text-2xl font-bold text-white mb-1">{selectedUser.nombre}</h2>
                                <p className="text-primary text-xs font-black uppercase tracking-widest mb-8 bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                                    {selectedUser.rol || 'EMPLEADO'}
                                </p>

                                <form onSubmit={handlePinSubmit} className="w-full relative">
                                    {/* 🟢 INPUT: Transparente pero funcional. onBlur forza el foco para no perder teclado. */}
                                    <input
                                        ref={codeInputRef}
                                        type="password"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        maxLength={PIN_LENGTH}
                                        value={pin}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            setPin(val);
                                            if (val.length === PIN_LENGTH) {
                                                // No auto-submit inmediato para permitir ver el último punto
                                            }
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit(e)}
                                        onBlur={(e) => {
                                            // 🟢 UX FIX: Si clican fuera del input (pero dentro del modal), re-enfocar.
                                            // Salvo que estemos procesando o cerrando.
                                            if (!isProcessing && selectedUser) {
                                                e.target.focus();
                                            }
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10"
                                        autoFocus
                                    />

                                    {/* PUNTOS VISUALES */}
                                    <motion.div
                                        animate={error ? { x: [-10, 10, -10, 10, 0], color: '#ef4444' } : { x: 0, color: '#ffffff' }}
                                        className="flex justify-center gap-4 mb-8 pointer-events-none"
                                    >
                                        {[...Array(PIN_LENGTH)].map((_, i) => (
                                            <div
                                                key={i}
                                                className={`w-3 h-3 rounded-full transition-all duration-200 ${i < pin.length
                                                    ? (error ? 'bg-status-danger scale-125' : 'bg-content-inverse scale-125 shadow-[0_0_12px_rgba(255,255,255,0.5)]')
                                                    : 'bg-content-secondary border border-border-subtle'
                                                    }`}
                                            />
                                        ))}
                                    </motion.div>

                                    {/* 🟢 BUTTON: Z-Index 20 para estar SOBRE el input invisible */}
                                    <style>{`
                                        .btn-ingresar {
                                            width: 100%;
                                            height: 60px;
                                            border-radius: 16px;
                                            cursor: pointer;
                                            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                                            /* Base State - BRIGHTER NOW 🔵 */
                                            background: linear-gradient(135deg, rgba(46, 142, 255, 0.6) 0%, rgba(46, 142, 255, 0.2) 100%);
                                            border: 2px solid rgba(46, 142, 255, 0.5); /* Thicker border */
                                            box-shadow: 0 0 15px rgba(46, 142, 255, 0.3); /* Permanent Glow */
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            position: relative;
                                            z-index: 20;
                                            overflow: hidden;
                                        }
                                        
                                        /* HOVER: SUPER GLOW 🌟⚡ */
                                        .btn-ingresar:hover:not(:disabled),
                                        .btn-ingresar:focus:not(:disabled) {
                                            background: linear-gradient(135deg, #2e8eff 0%, rgba(46, 142, 255, 0.8) 100%);
                                            border-color: #60a5fa;
                                            box-shadow: 0 0 35px rgba(46, 142, 255, 0.8), 0 0 10px rgba(255, 255, 255, 0.4);
                                            transform: translateY(-2px) scale(1.02);
                                        }

                                        .btn-ingresar:active:not(:disabled) {
                                            transform: translateY(1px);
                                            box-shadow: 0 0 20px rgba(46, 142, 255, 0.6);
                                        }

                                        /* DISABLED: Waiting Mode (No red cursor 🚫) */
                                        .btn-ingresar:disabled {
                                            opacity: 0.6;
                                            cursor: default; /* Friendly cursor */
                                            background: rgba(46, 142, 255, 0.15);
                                            border-color: rgba(46, 142, 255, 0.15);
                                            box-shadow: none;
                                            /* Breathing effect while waiting */
                                            animation: breathe 3s infinite ease-in-out;
                                        }
                                        
                                        @keyframes breathe {
                                            0%, 100% { border-color: rgba(46, 142, 255, 0.2); }
                                            50% { border-color: rgba(46, 142, 255, 0.5); box-shadow: 0 0 10px rgba(46, 142, 255, 0.1); }
                                        }

                                        /* INNER DARK CORE */
                                        .btn-ingresar-inner {
                                            width: calc(100% - 6px);
                                            height: calc(100% - 6px);
                                            border-radius: 13px;
                                            background-color: #020617; /* Extra Dark */
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            gap: 12px;
                                            color: #e0f2fe; /* Light Blue Text */
                                            font-weight: 800;
                                            letter-spacing: 2px;
                                            font-size: 14px;
                                            position: relative;
                                            z-index: 2;
                                            transition: background-color 0.3s;
                                        }

                                        .btn-ingresar:hover:not(:disabled) .btn-ingresar-inner {
                                            background-color: #0f172a; 
                                        }

                                        .btn-ingresar-inner svg {
                                            width: 20px;
                                            height: 20px;
                                            stroke-width: 3px;
                                            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                                            filter: drop-shadow(0 0 2px rgba(255,255,255,0.5));
                                        }

                                        .btn-ingresar:hover:not(:disabled) .btn-ingresar-inner svg {
                                            transform: translateX(6px) scale(1.1);
                                            color: #60a5fa;
                                            filter: drop-shadow(0 0 5px #60a5fa);
                                        }
                                    `}</style>

                                    <button
                                        type="submit"
                                        disabled={isProcessing || pin.length < PIN_LENGTH}
                                        className="btn-ingresar group"
                                        onClick={(e) => {
                                            // Click manual en botón: enviamos el form
                                            // Handle implicit submit via type="submit"
                                        }}
                                    >
                                        <div className="btn-ingresar-inner">
                                            {isProcessing ? (
                                                <span className="animate-pulse">ACCEDIENDO...</span>
                                            ) : (
                                                <>INGRESAR <ArrowRight /></>
                                            )}
                                        </div>
                                    </button>

                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute -bottom-16 left-0 w-full"
                                        >
                                            <div className="bg-slate-950 border border-red-500 text-red-500 text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-xl">
                                                <AlertCircle size={18} />
                                                <span>CREDENCIALES INCORRECTAS</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </form>

                                <div className="mt-8 flex justify-center">
                                    <p className="text-xs text-slate-400 flex items-center gap-2 font-medium">
                                        <Lock size={12} /> Presiona <strong className="text-white bg-slate-700 px-1.5 rounded text-[10px] tracking-wider border border-slate-600">ESC</strong> para cambiar de usuario
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// --- SUBCOMPONENTES ---

// 📝 TITLE CASE UTILITY
const toTitleCase = (str) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

// 🎨 ROLE-BASED GRADIENT MAPPER
const getRoleGradient = (rol) => {
    const normalizedRole = rol?.toLowerCase() || '';

    // 👑 Admin/Owner: Indigo → Purple
    if (['admin', 'dueño', 'dueno', 'superadmin'].includes(normalizedRole)) {
        return {
            gradient: 'from-[#6366F1] to-[#A855F7]',
            shadow: 'shadow-indigo-500/30'
        };
    }

    // 💼 Manager/Supervisor: Rose → Pink
    if (['encargado', 'supervisor', 'gerente', 'manager'].includes(normalizedRole)) {
        return {
            gradient: 'from-[#F43F5E] to-[#EC4899]',
            shadow: 'shadow-rose-500/30'
        };
    }

    // 💵 Cashier/Operator: Emerald → Teal
    if (['cajero', 'operador', 'vendedor', 'cashier'].includes(normalizedRole)) {
        return {
            gradient: 'from-[#10B981] to-[#14B8A6]',
            shadow: 'shadow-emerald-500/30'
        };
    }

    // ⚙️ Custom/Other: Slate → Blue
    return {
        gradient: 'from-[#475569] to-[#2563EB]',
        shadow: 'shadow-slate-500/30'
    };
};

const UserCard = ({ user, index, onClick }) => {
    const roleColors = getRoleGradient(user.rol);

    return (
        <motion.div
            variants={{ hidden: { opacity: 0, scale: 0.8 }, show: { opacity: 1, scale: 1 } }}
            whileTap={{ scale: 0.95 }}
            className="relative outline-none focus:outline-none focus:ring-0"
        >
            <div onClick={onClick} className="cursor-pointer">
                <CardContainer className="inter-var py-0">
                    <CardBody className="relative group/card w-auto h-auto rounded-xl p-0 border-transparent bg-transparent">



                        <CardItem translateZ="100" rotateX={10} rotateZ={-5} className="w-full flex justify-center">
                            <div className="relative">
                                <style>{`
                                    @keyframes rotBGimg {
                                        from { transform: rotate(0deg); }
                                        to { transform: rotate(360deg); }
                                    }
                                `}</style>

                                {/* Fake thickness layers */}
                                <div className="absolute inset-0 bg-black/40 rounded-3xl translate-y-4 translate-x-4 blur-xl" />
                                <div className="absolute inset-0 bg-primary/20 rounded-3xl translate-y-2 translate-x-1" />

                                {/* 👑 ADMIN CROWN (Case Insensitive) */}
                                {['admin', 'dueño', 'dueno', 'superadmin'].includes(user.rol?.toLowerCase()) && (
                                    <div className="absolute -top-3 -left-3 z-50 animate-bounce duration-1000">
                                        <div className="bg-gradient-to-br from-yellow-300 to-amber-500 p-1.5 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.6)] border border-yellow-100/50">
                                            <Crown size={20} className="text-yellow-900 fill-yellow-100" strokeWidth={2.5} />
                                        </div>
                                    </div>
                                )}

                                {['admin', 'dueño', 'dueno', 'superadmin'].includes(user.rol?.toLowerCase()) ? (
                                    <div className="relative z-10 p-[4px] rounded-2xl overflow-hidden flex justify-center items-center shadow-[0_0_20px_rgba(0,183,255,0.4)]">
                                        {/* RGB ANIMATED BACKGROUND (Original) */}
                                        <div style={{
                                            position: 'absolute',
                                            width: '200%',
                                            height: '200%',
                                            backgroundImage: 'linear-gradient(180deg, rgb(0, 183, 255), rgb(255, 48, 255))',
                                            animation: 'rotBGimg 3s linear infinite',
                                        }} />

                                        {/* Avatar Content (with background to cover center) */}
                                        <div className="relative z-20 bg-slate-900 rounded-2xl">
                                            <Avatar user={user} className="relative z-10 transition-all duration-300 shadow-none ring-0" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`relative z-10 p-[4px] rounded-2xl overflow-hidden flex justify-center items-center bg-gradient-to-br ${roleColors.gradient} shadow-lg ${roleColors.shadow} transition-all duration-300`}>
                                        <div className="relative z-20 bg-slate-900 rounded-2xl">
                                            <Avatar user={user} className="relative z-10 transition-all duration-300 shadow-none ring-0" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardItem>

                        {/* 3. TEXT (Floating below) */}
                        <CardItem translateZ="60" className="text-center w-full mt-8 group-hover/card:text-primary transition-colors space-y-1">
                            <h3 className="text-lg font-bold text-content-inverse drop-shadow-md">{toTitleCase(user.nombre) || 'Usuario'}</h3>
                            {user.rol && <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-content-secondary group-hover/card:text-primary/70">{user.rol}</span>}
                        </CardItem>

                    </CardBody>
                </CardContainer>
            </div>
        </motion.div>
    );
};

const Avatar = ({ user, size = 'normal', className = '' }) => {

    const isLarge = size === 'large';

    // Generar índice basado en el ID (Soporta UUIDs)
    const getHashIndex = (id) => {
        if (!id) return 0;
        const str = String(id);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash);
    };

    const colorIndex = getHashIndex(user.id) % AVATAR_COLORS.length;
    const gradient = AVATAR_COLORS[colorIndex];

    return (
        <div className={`
      ${isLarge ? 'w-24 h-24 text-3xl' : 'w-32 h-32 md:w-40 md:h-40 text-5xl'} 
      rounded-2xl bg-gradient-to-br ${gradient} 
      flex items-center justify-center font-black text-white 
      overflow-hidden relative transform transition-transform ${className}
    `}>
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
            {user.foto ? (
                <img src={user.foto} alt={user.nombre} className="w-full h-full object-cover" />
            ) : (
                <span className="drop-shadow-lg">{user.nombre?.charAt(0).toUpperCase() || 'U'}</span>
            )}
        </div>
    );
};
