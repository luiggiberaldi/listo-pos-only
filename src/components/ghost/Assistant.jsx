import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { getChatContext } from '../../utils/ghost/chatContext';
import { ghostService } from '../../services/ghostAI';
import { useLocation } from 'react-router-dom';
import { db } from '../../db';

// --- ICONS (Minimalist & Technical) ---
const GhostIcon = ({ className }) => (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
        <circle cx="9" cy="10" r="1" />
        <circle cx="15" cy="10" r="1" />
    </svg>
);

const SendIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
);

// --- SUB-COMPONENTS ---

const SystemContext = () => {
    const ctx = getChatContext();
    return (
        <div className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-slate-200 shadow-sm mb-4 text-[10px] font-mono tracking-tight uppercase text-slate-600">
            <span className="font-bold text-slate-800">VISTA: {ctx.screen.replace('#/', '') || 'INICIO'}</span>
            <span className="w-px h-3 bg-slate-300" />
            <span className={ctx.cart.has_items ? 'text-emerald-700 font-extrabold' : 'text-slate-400'}>
                CARRITO: {ctx.cart.items_count}
            </span>
        </div>
    );
};

const NodeStatus = ({ provider }) => {
    const getStatusColor = () => {
        if (provider === 'OPENROUTER') return 'bg-orange-400';
        if (provider === 'GROQ') return 'bg-emerald-400';
        if (provider === 'CACHE') return 'bg-cyan-400';
        return 'bg-blue-400';
    };

    const getStatusLabel = () => {
        if (provider === 'OPENROUTER') return 'EXTERNO';
        if (provider === 'CACHE') return 'MEMORIA';
        return 'NUBE';
    };

    return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/20 border border-white/10 backdrop-blur-sm shadow-sm" title={`Proveedor: ${provider || 'DESCONOCIDO'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor()} shadow-sm`} />
            <span className="text-[10px] font-bold text-white tracking-wide">{getStatusLabel()}</span>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const Assistant = ({ variant = 'floating' }) => {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, role: 'ghost', text: 'Hola. Soy tu asistente Ghost. ¿En qué te puedo ayudar hoy?' }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [currentProvider, setCurrentProvider] = useState('LOCAL');
    const messagesEndRef = useRef(null);
    const lastMessageRef = useRef({ text: '', timestamp: 0 });

    const isSalesView = location.pathname === '/' || location.pathname === '/vender';

    // 🔄 SYNC HISTORY ON MOUNT
    useEffect(() => {
        const loadHistory = async () => {
            // 1. Sync Cloud Memory (Background)
            ghostService.syncCloudMemory().then(() => {
                // Refresh local after cloud sync
                db.ghost_history.orderBy('timestamp').reverse().limit(15).toArray().then(arr => {
                    if (arr.length > 0) {
                        setMessages(arr.reverse().map(m => ({ id: m.id, role: m.role, text: m.content })));
                    }
                });
            });

            // 2. Initial Local Load (Fast)
            const localArr = await db.ghost_history.orderBy('timestamp').reverse().limit(15).toArray();
            if (localArr.length > 0) {
                setMessages(localArr.reverse().map(m => ({ id: m.id, role: m.role, text: m.content })));
            }
        };

        loadHistory();

        // 3. Subscribe to Realtime Updates
        const channel = ghostService.subscribeToRealtimeUpdates((newMsg) => {
            console.log("⚡ UI received realtime message:", newMsg);
            setMessages(prev => [...prev, newMsg]);
        });

        // Cleanup: Unsubscribe on unmount
        return () => {
            if (channel) {
                channel.unsubscribe();
                console.log("⚡ Realtime subscription closed");
            }
        };
    }, []);

    useEffect(() => {
        if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isThinking, isOpen]);

    const handleSend = async (textOverride) => {
        const textToSend = textOverride || input;
        if (!textToSend.trim()) return;

        // 🛡️ DUPLICATE DETECTION
        const now = Date.now();
        if (lastMessageRef.current.text === textToSend && now - lastMessageRef.current.timestamp < 500) {
            return;
        }
        lastMessageRef.current = { text: textToSend, timestamp: now };

        const userMsg = { id: Date.now(), role: 'user', text: textToSend };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsThinking(true);

        try {
            const response = await ghostService.generateResponse(textToSend);

            if (response.provider) setCurrentProvider(response.provider);

            let cleanText = response.text || "";

            console.log(`%c🧠 AI RESPONSE FROM: ${response.model} (${response.provider})`, 'background: #222; color: #bada55; font-size: 12px; padding: 4px; border-radius: 4px;');

            if (typeof cleanText === 'string' && cleanText.length > 0) {
                const textTagMatch = cleanText.match(/\[TEXT\]\s*(.+)/s);
                if (textTagMatch) {
                    cleanText = textTagMatch[1].trim();
                } else {
                    const jsonPattern = /^\s*\{[^}]+\}\s*/;
                    cleanText = cleanText.replace(jsonPattern, '').trim();
                }
                if (cleanText.startsWith('}') || cleanText.startsWith(']')) {
                    cleanText = cleanText.substring(1).trim();
                }
            }

            if (!cleanText || cleanText.length < 2 || /^[{}[\]\s]*$/.test(cleanText)) {
                cleanText = "🤔 No entendí bien. ¿Podrías repetirlo?";
            }

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'ghost',
                text: cleanText
            }]);

        } catch (error) {
            console.error("❌ Ghost Error:", error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'ghost',
                text: "⚠️ Tuve un problema técnico momentáneo. Intenta de nuevo."
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleClearConversation = async () => {
        try {
            // Clear local IndexedDB
            await db.ghost_history.clear();

            // Clear cloud memory
            await ghostService.clearCloudMemory();

            // Reset to initial state
            setMessages([
                { id: Date.now(), role: 'ghost', text: 'Conversación limpiada. ¿En qué te puedo ayudar?' }
            ]);
        } catch (error) {
            console.error('Error clearing conversation:', error);
            setMessages(prev => [...prev, {
                id: Date.now(),
                role: 'ghost',
                text: '⚠️ No pude limpiar la conversación completamente. Intenta de nuevo.'
            }]);
        }
    };

    // Si es variante FLOTANTE y estamos en Venta, no renderizamos la solapa (para que solo se vea la del encabezado de la Cesta)
    if (variant === 'floating' && isSalesView) return (
        <AnimatePresence>
            {isOpen && renderChatWindow()}
        </AnimatePresence>
    );

    function renderChatWindow() {
        return (
            <motion.div
                drag
                dragMomentum={false}
                dragElastic={0}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                className="fixed bottom-[110px] right-6 w-[360px] h-[600px] flex flex-col bg-white rounded-2xl shadow-2xl shadow-slate-900/20 overflow-hidden z-[10000] ring-1 ring-slate-200"
            >
                <div className="px-4 py-3 bg-indigo-600 flex justify-between items-center cursor-grab active:cursor-grabbing shrink-0 shadow-md z-10">
                    <div className="flex items-center gap-2 text-white">
                        <img src="/ghost_header.png" alt="Ghost" className="h-9 w-auto object-contain drop-shadow-sm" />
                        <span className="text-white font-black tracking-tight text-lg drop-shadow-md">Listo Ghost</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <NodeStatus provider={currentProvider} />
                        <button
                            onClick={handleClearConversation}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                            title="Borrar conversación"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                        </button>
                        <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm">
                            <span className="text-sm font-bold opacity-100">✕</span>
                        </button>
                    </div>
                </div>

                {isThinking && (
                    <div className="h-[2px] w-full bg-indigo-900 overflow-hidden">
                        <div className="h-full bg-indigo-400 animate-progress-indeterminate origin-left" />
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 bg-app-light scrollbar-hide">
                    <SystemContext />
                    <div className="space-y-4">
                        {messages.map(msg => (
                            <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm shadow-indigo-200' : msg.role === 'system' ? 'bg-amber-50 text-amber-900 border border-amber-200 text-xs italic mx-auto w-full text-center font-medium' : 'bg-white text-slate-900 border border-slate-200 rounded-tl-sm shadow-slate-200/50 font-medium'}`}>
                                    <div className="prose prose-sm max-w-none prose-p:my-0 prose-ul:my-1 prose-strong:text-current">
                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-200">
                    <div className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') handleSend(); }}
                            placeholder="Escribe tu consulta..."
                            className="w-full bg-white border border-slate-300 rounded-xl py-3 pl-4 pr-12 text-[14px] text-slate-900 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium shadow-sm"
                        />
                        <button onClick={() => handleSend()} className="absolute right-2 top-2 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <SendIcon />
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <>
            {variant === 'inline' ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="ml-auto w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-all group border border-indigo-200/50 dark:border-indigo-500/30 shadow-sm"
                    title="Abrir Asistente Ghost"
                >
                    <img src="/ghost.png" alt="G" className="w-5 h-5 object-contain group-hover:scale-110 transition-transform" />
                </button>
            ) : (
                /* TAB LATERAL DERECHA (SOLAPA) - Aparece en todas las páginas excepto Ventas */
                <motion.div
                    initial={{ x: 10 }}
                    animate={{ x: isOpen ? 100 : 0 }}
                    className="fixed right-0 top-[180px] z-[9999]"
                >
                    <button
                        onClick={() => setIsOpen(true)}
                        className="bg-white border-2 border-r-0 border-indigo-100 shadow-xl rounded-l-2xl py-6 px-1.5 flex flex-col items-center gap-3 group hover:bg-indigo-50 transition-all active:scale-95"
                        title="Abrir Asistente Ghost"
                    >
                        <img
                            src="/ghost.png"
                            alt="Ghost"
                            className="w-8 h-8 object-contain drop-shadow-sm group-hover:scale-110 transition-transform brightness-100"
                        />
                        <div className="flex flex-col gap-1 items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
                            <div className="[writing-mode:vertical-lr] text-[10px] font-black text-indigo-400 tracking-widest uppercase opacity-70 group-hover:opacity-100 transition-opacity">
                                GHOST AI
                            </div>
                        </div>
                    </button>
                </motion.div>
            )}

            <AnimatePresence>
                {isOpen && renderChatWindow()}
            </AnimatePresence>
        </>
    );
};
