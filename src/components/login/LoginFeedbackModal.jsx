import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';

export default function LoginFeedbackModal({
    isOpen,
    onClose,
    feedbackData,
    setFeedbackData,
    handleSendFeedback,
    sendingFeedback
}) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={(e) => e.target === e.currentTarget && onClose()}
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
                            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
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
    );
}
