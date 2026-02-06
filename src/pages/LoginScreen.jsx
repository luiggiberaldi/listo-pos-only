// ✅ SYSTEM IMPLEMENTATION - V. 6.2 (MODULARIZED)
// Archivo: src/pages/LoginScreen.jsx
// Objetivo: Orchestrator principal de la pantalla de login.
// REQUIERE: npm install framer-motion

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { motion } from 'framer-motion';
import { Keyboard, MessageSquare } from 'lucide-react';
import { dbMaster } from '../services/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import Swal from 'sweetalert2';

// 🟢 NEW MODULAR COMPONENTS
import UserCard from '../components/login/UserCard';
import LoginPinModal from '../components/login/LoginPinModal';
import LoginFeedbackModal from '../components/login/LoginFeedbackModal';
import LegalModal from '../components/auth/LegalModal';

const PIN_LENGTH = 6;

export default function LoginScreen() {
    const navigate = useNavigate();
    const {
        usuarios, login, getSystemID, configuracion
    } = useStore();

    // State
    const [selectedUser, setSelectedUser] = useState(null);
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [secretClicks, setSecretClicks] = useState(0);

    // Feedback State
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [feedbackData, setFeedbackData] = useState({ title: '', message: '' });
    const [sendingFeedback, setSendingFeedback] = useState(false);
    const [legalModalState, setLegalModalState] = useState({ isOpen: false, docType: null });

    // Notification Bubbles State
    const [userMessages, setUserMessages] = useState({});

    // Ref para el input invisible (se pasa al modal)
    const codeInputRef = useRef(null);

    // Filter active users
    const activeUsers = (usuarios || []).filter(u => u.activo !== false);

    // --- BUZZER LISTENER ---
    useEffect(() => {
        if (!dbMaster) return;
        const q = query(collection(dbMaster, "sugerencias"), where("archivado", "==", false));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const counts = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.usuario?.uid) {
                    counts[data.usuario.uid] = (counts[data.usuario.uid] || 0) + 1;
                }
            });
            setUserMessages(counts);
        }, (err) => console.error("Error listening to hints:", err));
        return () => unsubscribe();
    }, []);

    // --- KEYBOARD SHORTCUTS ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            // 🟢 BLOCK SHORTCUTS IF FEEDBACK MODAL IS OPEN
            if (isFeedbackOpen) return;

            if (!selectedUser) {
                // Selector 1-9
                const num = parseInt(e.key);
                if (!isNaN(num) && num > 0 && num <= activeUsers.length) {
                    handleUserClick(activeUsers[num - 1]);
                }
            } else {
                // ESC to exit modal
                if (e.key === 'Escape') handleCloseModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedUser, activeUsers, isFeedbackOpen]);

    // --- HANDLERS ---
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

    const handlePinSubmit = async (e) => {
        if (e) e.preventDefault();
        if (pin.length !== PIN_LENGTH || isProcessing) return;

        setIsProcessing(true);
        await new Promise(r => setTimeout(r, 400)); // UX Pause

        try {
            const exito = await login(pin, selectedUser?.id);
            if (!exito) throw new Error('PIN Incorrecto');
            navigate('/', { replace: true });
        } catch (err) {
            setError(true);
            setPin('');
            setIsProcessing(false);
            setTimeout(() => setError(false), 600);
            setTimeout(() => codeInputRef.current?.focus(), 100);
        }
    };

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
                usuario: {
                    uid: selectedUser?.id || 'anon', // Though usually sent from non-logged state? 
                    // Ah wait, the FAB is available always.
                    // But we don't have a logged in user yet.
                    // So 'usuario' might be undefined if we use FAB from Login.
                    // Let's keep it consistent with previous logic.
                    nombre: 'Desde LoginScreen'
                },
                fecha: serverTimestamp(),
                leido: false,
                version: 'v6.2'
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

    const handleLogoClick = () => {
        if (secretClicks > 0) setSecretClicks(0);
    };

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
                        <UserCard
                            key={u.id}
                            user={u}
                            index={idx}
                            onClick={() => handleUserClick(u)}
                            messageCount={userMessages[u.id] || 0}
                        />
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

            </div>

            {/* MODALS */}
            <LoginPinModal
                isOpen={!!selectedUser}
                onClose={handleCloseModal}
                selectedUser={selectedUser}
                pin={pin}
                setPin={setPin}
                handlePinSubmit={handlePinSubmit}
                isProcessing={isProcessing}
                error={error}
                codeInputRef={codeInputRef}
            />

            <LoginFeedbackModal
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
                feedbackData={feedbackData}
                setFeedbackData={setFeedbackData}
                handleSendFeedback={handleSendFeedback}
                sendingFeedback={sendingFeedback}
            />

            {/* 📜 LEGAL FOOTER (Bottom of Screen) */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 1 } }}
                className="fixed bottom-4 left-0 right-0 flex justify-center gap-6 z-30 pointer-events-none"
            >
                <div className="pointer-events-auto flex items-center gap-6 bg-black/20 backdrop-blur-sm px-6 py-2 rounded-full border border-white/5 hover:bg-black/40 transition-colors">
                    <button
                        onClick={() => setLegalModalState({ isOpen: true, docType: 'EULA' })}
                        className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-[0.2em] transition-colors outline-none cursor-pointer"
                    >
                        Documento Legal
                    </button>
                    <span className="w-px h-3 bg-slate-600" />
                    <button
                        onClick={() => setLegalModalState({ isOpen: true, docType: 'PRIVACY' })}
                        className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-[0.2em] transition-colors outline-none cursor-pointer"
                    >
                        Términos
                    </button>
                </div>
            </motion.div>

            {/* 🟢 LEGAL MODAL */}
            <LegalModal
                isOpen={legalModalState.isOpen}
                docType={legalModalState.docType}
                onClose={() => setLegalModalState(prev => ({ ...prev, isOpen: false }))}
            />

        </div>
    );
}
