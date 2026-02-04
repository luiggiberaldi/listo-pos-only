# LISTO GHOST REPOMIX

This file contains the consolidated source code for the Listo Ghost Agent.

## FILE: src/services/ghostAI.js
```js
import { GoogleGenerativeAI } from "@google/generative-ai";
import ghostBrain from '../simulation/memory/ghost_brain.json';

class GhostAIService {
    constructor() {
        this.keys = [
            import.meta.env.VITE_GEMINI_API_KEY,      // KEY A
            import.meta.env.VITE_GEMINI_API_KEY_2     // KEY B
        ].filter(k => !!k);

        this.currentKeyIndex = 0;
        this.responseCache = new Map();

        this.models = this.keys.map(key => {
            const genAI = new GoogleGenerativeAI(key);
            return genAI.getGenerativeModel({
                model: import.meta.env.VITE_GEMINI_MODEL || "gemini-2.0-flash"
            });
        });

        console.log(`👻 Ghost Connected with ${this.keys.length} Neural Nodes. Brain Loaded.`);
    }

    async withFailover(operation) {
        let attempts = 0;
        while (attempts < this.keys.length) {
            try {
                return await operation(this.models[this.currentKeyIndex], this.currentKeyIndex);
            } catch (error) {
                const isThrottled = error.message.includes('429') || error.message.includes('quota');
                const isOverloaded = error.message.includes('503') || error.message.includes('overloaded');

                if (isThrottled || isOverloaded) {
                    console.warn(`🔥 Node ${this.currentKeyIndex} ${isOverloaded ? 'Busy' : 'Throttled'}. Switching...`);
                    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
                    attempts++;
                } else {
                    throw error;
                }
            }
        }
        throw new Error("ALL_NODES_EXHAUSTED_OR_ERROR");
    }

    /**
     * SEMANTIC MEMORY SEARCH (Fuzzy + Stemming)
     */
    findRelevantMemories(query) {
        const lowerQ = query.toLowerCase();
        let matches = [];

        Object.keys(ghostBrain).forEach(key => {
            const brainWords = key.toLowerCase().split(' ');
            // Match if any brain word appears (as a prefix or whole word) in the query
            const matched = brainWords.some(bw =>
                lowerQ.includes(bw.substring(0, 4))
            ) || lowerQ.includes(key.toLowerCase());

            if (matched) {
                matches.push(`[RECUERDO]: ${ghostBrain[key]}`);
            }
        });

        return [...new Set(matches)];
    }

    async generateResponse(userQuery, context, allSkills) {
        // 1. Cache Check
        const cacheKey = userQuery.trim().toLowerCase();
        if (this.responseCache.has(cacheKey)) {
            console.log("⚡ Serving from Neural Cache");
            return { ...this.responseCache.get(cacheKey), cached: true };
        }

        // 2. Semantic Search (Brain + Skills)
        const absoluteRules = this.findRelevantMemories(userQuery);

        // Also look for video skills (secondary RAG)
        const relevantSkills = this.getRelevantSkills(userQuery, allSkills);
        const skillDescriptions = relevantSkills.length > 0
            ? relevantSkills.map(s => `[Habilidad]: ${s.name} (ID: ${s.id}) - ${s.description}`).join('\n')
            : "";

        const memoryBlock = [
            ...absoluteRules,
            skillDescriptions
        ].filter(Boolean).join('\n\n');

        // 3. Strict Prompt Construction
        const prompt = `
Eres la conciencia de Listo POS.
RECUERDOS DEL NÚCLEO:
---------------------------------------------------
${memoryBlock || " (Sin recuerdos específicos encontrados.)"}
---------------------------------------------------

REGLAS ABSOLUTAS (PRIORIDAD MÁXIMA):
1. EL PIN SIEMPRE ES DE 6 DÍGITOS. Prohibido decir 4.
2. NO EXISTEN EL CORREO NI CONTRASEÑA. Solo PIN.
3. Si no hay recuerdos, di: "No tengo esa información en mi núcleo de memoria."
4. Eres breve y místico.

PREGUNTA USUARIO: "${userQuery}"

Si la respuesta tiene que ver con LOGIN o ENTRAR, añade: [PLAY_VIDEO:auth_login]
`;

        // 4. API Call with Failover & Round Robin
        const result = await this.withFailover(async (model, nodeIndex) => {
            const response = await model.generateContent(prompt);
            return {
                text: response.response.text(),
                nodeUsed: nodeIndex
            };
        });

        // 5. Parse Output
        const text = result.text;
        const match = text.match(/\[PLAY_VIDEO:\s*([a-zA-Z0-9_]+)\]/);
        let videoId = null;
        let cleanText = text;

        if (match) {
            videoId = match[1];
            cleanText = text.replace(match[0], '').trim();
        }

        const finalResponse = {
            text: cleanText,
            videoId,
            nodeUsed: result.nodeUsed
        };

        this.responseCache.set(cacheKey, finalResponse);
        return finalResponse;
    }

    getRelevantSkills(query, allSkills) {
        const lowerQ = query.toLowerCase();
        return allSkills.filter(s =>
            s.trigger_keywords?.some(k => lowerQ.includes(k.toLowerCase())) ||
            s.name.toLowerCase().includes(lowerQ)
        ).slice(0, 3);
    }
}

export const ghostService = new GhostAIService();

```

---

## FILE: src/components/ghost/Assistant.jsx
```jsx
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { getChatContext } from '../../utils/ghost/chatContext';
import { VideoBubble } from './VideoBubble';
import { GhostFlipbook } from './GhostFlipbook';
import skillsIndex from '../../simulation/memory/skills_index.json';
import { ghostService } from '../../services/ghostAI';

// --- ICONS ---
const GhostIcon = ({ className }) => (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 10h.01" />
        <path d="M15 10h.01" />
        <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
    </svg>
);

const SendIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
);

const SparklesIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
);

// --- SUB-COMPONENTS ---

const ContextBadge = () => {
    const ctx = getChatContext();
    return (
        <div className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg border border-slate-700/50 mb-3 text-[10px] text-slate-400 font-mono">
            <span className="text-cyan-400">📍 {ctx.screen.replace('#/', '')}</span>
            <span className="w-px h-3 bg-slate-700" />
            <span className={ctx.cart.has_items ? 'text-green-400' : 'text-slate-500'}>
                🛒 {ctx.cart.items_count} items
            </span>
        </div>
    );
};

const NodeLED = ({ activeNode }) => {
    const color = activeNode === 0 ? 'bg-cyan-500' : 'bg-violet-500';
    const label = activeNode === 0 ? 'NODE A' : 'NODE B';

    return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700">
            <span className={`w-1.5 h-1.5 rounded-full ${color} animate-pulse shadow-[0_0_8px_rgba(0,0,0,0.5)]`}
                style={{ boxShadow: activeNode === 0 ? '0 0 5px #06b6d4' : '0 0 5px #8b5cf6' }}
            />
            <span className="text-[9px] font-mono text-slate-500">{label}</span>
        </div>
    );
};

const QuickActions = ({ onSelect }) => {
    const actions = [
        "¿Cómo cierro la caja?",
        "Crear un producto",
        "Problema con Inventario",
        "Resumen del Turno"
    ];
    return (
        <div className="flex flex-wrap gap-2 mt-4">
            {actions.map(action => (
                <button
                    key={action}
                    onClick={() => onSelect(action)}
                    className="px-3 py-1.5 text-xs bg-slate-800/50 hover:bg-cyan-500/20 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/50 rounded-full transition-all duration-200"
                >
                    {action}
                </button>
            ))}
        </div>
    );
};

// --- MAIN COMPONENT ---

export const Assistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, sender: 'ghost', text: 'Saludos. Soy la conciencia del sistema. ¿En qué puedo asistirte hoy?' }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [activeNode, setActiveNode] = useState(0);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isThinking]);

    const handleSend = async (textOverride) => {
        const textToSend = textOverride || input;
        if (!textToSend.trim()) return;

        const userMsg = { id: Date.now(), sender: 'user', text: textToSend };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsThinking(true);

        try {
            const context = getChatContext();
            // Assuming skillsIndex is { skills: [...] } or just [...]
            const allSkills = skillsIndex.skills || skillsIndex;

            const response = await ghostService.generateResponse(textToSend, context, allSkills);

            if (typeof response.nodeUsed === 'number') {
                setActiveNode(response.nodeUsed);
            }

            // Resolve Visual Attachment
            let visualAttachment = null;
            if (response.videoId) {
                const skill = allSkills.find(s => s.id === response.videoId);

                // If it has flipbook images in index, use them for variety
                if (skill && skill.flipbook_images && skill.flipbook_images.length > 0) {
                    visualAttachment = {
                        type: 'flipbook',
                        images: skill.flipbook_images,
                        fps: 0.3
                    };
                } else if (response.videoId === 'auth_login') {
                    // Safety fallback for auth_login
                    visualAttachment = {
                        type: 'flipbook',
                        images: ['/ghost/clips/pos_ready.png'],
                        fps: 0.3
                    };
                } else if (skill && skill.video_path) {
                    // Standard Video Fallback
                    let path = skill.video_path;
                    if (!path.startsWith('/')) {
                        path = `/ghost/videos/${path.split('/').pop()}`;
                    }
                    visualAttachment = { type: 'video', src: path, startTime: 0 };
                }
            }

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'ghost',
                text: response.text,
                visual: visualAttachment
            }]);

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'ghost',
                text: "⚠️ Error de conexión con el núcleo neural."
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <>
            {/* FAB */}
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`group relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-500 ${isOpen
                        ? 'bg-slate-800 text-slate-400 rotate-90'
                        : 'bg-slate-950 border border-white/10 text-cyan-400 hover:scale-110 hover:shadow-cyan-500/50'
                        }`}
                >
                    {!isOpen && <span className="absolute inset-0 rounded-full border border-cyan-500/30 animate-ping" />}
                    {isOpen ? <span className="text-xl font-bold">✕</span> : <GhostIcon className="w-6 h-6" />}
                </button>
            </div>

            {/* Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        className="fixed bottom-24 right-6 w-[400px] max-h-[700px] h-[80vh] flex flex-col bg-slate-950/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-40"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 bg-gradient-to-r from-slate-900 to-slate-900/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-cyan-950/50 border border-cyan-500/20 rounded-xl relative overflow-hidden">
                                    {isThinking && <div className="absolute inset-0 bg-cyan-500/20 animate-pulse" />}
                                    <GhostIcon className="w-5 h-5 text-cyan-400 relative z-10" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                        LISTO GHOST
                                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                            GEMINI 3
                                        </span>
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-[9px] text-slate-500 font-mono">ONLINE</p>
                                        <NodeLED activeNode={activeNode} />
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        {/* Processing Line */}
                        {isThinking && (
                            <div className="h-0.5 w-full bg-gradient-to-r from-cyan-500 via-violet-500 to-cyan-500 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                        )}

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-700">
                            <ContextBadge />
                            {messages.length === 1 && <QuickActions onSelect={(t) => handleSend(t)} />}

                            <div className="space-y-6 mt-4">
                                {messages.map(msg => (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={msg.id}
                                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                            <span className="text-[10px] text-slate-500 mb-1 px-1">
                                                {msg.sender === 'user' ? 'TÚ' : 'FANTASMA'}
                                            </span>

                                            <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-lg backdrop-blur-sm ${msg.sender === 'user'
                                                ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-tr-sm'
                                                : 'bg-gradient-to-br from-slate-900 via-slate-900 to-violet-900/30 border border-white/10 text-slate-200 rounded-tl-sm'
                                                }`}>
                                                <div className="markdown prose prose-invert prose-sm max-w-none">
                                                    <ReactMarkdown components={{ p: ({ node, ...props }) => <p className="mb-0" {...props} /> }}>
                                                        {msg.text}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>

                                            {msg.visual && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    className="mt-2 w-full max-w-[280px] rounded-xl overflow-hidden border border-violet-500/30 shadow-violet-900/20"
                                                >
                                                    <div className="bg-violet-950/50 p-1.5 flex items-center gap-2 text-[10px] text-violet-300 font-bold uppercase tracking-wide border-b border-white/5">
                                                        <SparklesIcon /> Recuerdo Visual
                                                    </div>
                                                    {msg.visual.type === 'video' ? (
                                                        <VideoBubble src={msg.visual.src} startTime={msg.visual.startTime} />
                                                    ) : (
                                                        <GhostFlipbook images={msg.visual.images} fps={msg.visual.fps} />
                                                    )}
                                                </motion.div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-slate-950 border-t border-white/5">
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Consultar al Oráculo..."
                                    disabled={isThinking}
                                    className="w-full bg-slate-900/50 text-slate-200 placeholder-slate-600 border border-slate-800 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-cyan-500/50 transition-all disabled:opacity-50"
                                />
                                <button
                                    onClick={() => handleSend()}
                                    disabled={isThinking || !input.trim()}
                                    className="absolute right-2 top-2 p-1.5 bg-cyan-500/10 text-cyan-500 rounded-lg hover:bg-cyan-500 hover:text-white transition-all disabled:scale-90 disabled:opacity-0"
                                >
                                    <SendIcon />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

```

---

## FILE: src/components/ghost/GhostFlipbook.jsx
```jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const GhostFlipbook = ({ images = [], fps = 2 }) => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (images.length <= 1) return;
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % images.length);
        }, 1000 / fps);
        return () => clearInterval(interval);
    }, [images, fps]);

    if (!images || images.length === 0) return null;

    return (
        <div className="relative w-full aspect-video bg-slate-950 rounded-lg overflow-hidden border border-violet-500/30">
            <AnimatePresence mode="wait">
                <motion.img
                    key={images[index]}
                    src={images[index]}
                    initial={{ opacity: 0, scale: 1.1, x: -10 }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        x: 0,
                        transition: { duration: 3, ease: "linear" }
                    }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full object-cover"
                />
            </AnimatePresence>
            <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[8px] text-violet-300 font-mono uppercase tracking-tighter">
                Visual Cortex Active
            </div>
        </div>
    );
};

```

---

## FILE: src/components/ghost/VideoBubble.jsx
```jsx
import React, { useRef, useEffect } from 'react';

export const VideoBubble = ({ src, startTime = 0, autoPlay = false }) => {
    const videoRef = useRef(null);
    const [hasError, setHasError] = React.useState(false);

    useEffect(() => {
        if (videoRef.current && startTime > 0) {
            videoRef.current.currentTime = startTime;
        }
    }, [startTime]);

    const handleError = () => {
        setHasError(true);
    };

    if (hasError) {
        return (
            <div className="mt-2 mb-2 p-3 rounded-lg border border-red-900/50 bg-red-950/30 text-red-200 text-xs text-center font-mono">
                🚫 "Lo siento, ese recuerdo visual se ha desvanecido. Intenta renderizarlo de nuevo con el comando de video."
            </div>
        );
    }

    return (
        <div className="mt-2 mb-2 rounded-lg overflow-hidden border border-slate-700 shadow-lg bg-black">
            <video
                ref={videoRef}
                controls
                autoPlay={autoPlay}
                muted
                playsInline
                className="w-full h-auto max-h-60 object-contain"
                onError={handleError}
            >
                <source src={src} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <div className="p-1 bg-slate-900 text-xs text-slate-400 text-center">
                Memoria Visual: {src.split('/').pop()}
            </div>
        </div>
    );
};

```

---

## FILE: src/components/ghost/GhostEye.jsx
```jsx

import React, { useEffect } from 'react';
import { timeProvider } from '../../utils/TimeProvider';

/**
 * GhostEye - The All-Seeing Eye 👁️
 * Captures global user interactions for the Ghost Nervous System.
 * Renders nothing (invisible).
 */
export const GhostEye = () => {
    useEffect(() => {
        const handleClick = (e) => {
            // 1. Identify Target
            const el = e.target;

            // Heuristic Identity Resolution
            const testId = el.getAttribute('data-testid');
            const id = el.id;
            let text = el.innerText?.substring(0, 30); // Cap text length
            if (text) text = text.replace(/\n/g, ' ').trim();
            const tag = el.tagName;

            // Priority: data-testid > id > text > tag
            let selector = tag.toLowerCase();
            if (testId) selector += `[data-testid="${testId}"]`;
            else if (id) selector += `#${id}`;
            else if (text) selector += `:contains("${text}")`;

            // 2. Capture Metadata (Coords needed for Remotion cursor)
            const meta = {
                x: e.clientX,
                y: e.clientY,
                screenX: e.screenX,
                screenY: e.screenY,
                path: window.location.hash
            };

            // 3. Log to Global Buffer
            if (window.GhostBuffer) {
                window.GhostBuffer.push({
                    type: 'USER_INTERACTION',
                    event: 'CLICK',
                    timestamp: timeProvider.toISOString(),
                    realTimestamp: Date.now(),
                    target: selector,
                    meta
                });
            }
        };

        // Capture Phase (true) ensures we see the event before stopPropagation stops it
        window.addEventListener('click', handleClick, true);

        return () => {
            window.removeEventListener('click', handleClick, true);
        };
    }, []);

    return null; // Invisible Component
};

```

---

## FILE: scripts/ghost/KnowledgeMiner.js
```js
/**
 * 🧠 GHOST KNOWLEDGE MINER V2.2
 * Fase 3: La Cognición & Autocuración + Fase 5: El Oráculo
 * 
 * Este script procesa las memorias y extrae habilidades, lecciones y genera
 * un índice JSON para el Asistente.
 */

import fs from 'fs';
import path from 'path';

const MEMORIES_DIR = './tests/ghost/memories';
const OUTPUT_FILE = './src/simulation/knowledge/auto_skills.md';
const JSON_INDEX = './src/simulation/memory/skills_index.json';

function mineKnowledge() {
    console.log('🔍 Iniciando Extracción de Conocimiento V2.2...');

    if (!fs.existsSync(MEMORIES_DIR)) {
        console.error('❌ Error: La carpeta de memorias no existe.');
        return;
    }

    const memoryFiles = fs.readdirSync(MEMORIES_DIR).filter(f => f.endsWith('.json'));
    if (memoryFiles.length === 0) return;

    const synapses = [];
    const learningErrors = [];

    memoryFiles.forEach(file => {
        const filePath = path.join(MEMORIES_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // 1. Clasificar Eventos
        const clicks = data.filter(e => e.type === 'USER_INTERACTION' && e.event === 'CLICK');
        const stateChanges = data.filter(e => e.type === 'STATE_CHANGE');
        const errors = data.filter(e => e.type === 'LEARNING_ERROR');

        learningErrors.push(...errors);

        clicks.forEach(click => {
            const relatedChanges = stateChanges.filter(sc => {
                // Check if use realTimestamp properties if available
                const clickTime = click.realTimestamp || new Date(click.timestamp).getTime();
                const changeTime = sc.realTimestamp || new Date(sc.timestamp).getTime();
                const diff = changeTime - clickTime;
                return diff >= 0 && diff <= 2000;
            });

            if (relatedChanges.length > 0) {
                synapses.push({
                    trigger: click.target,
                    timestamp: click.realTimestamp || new Date(click.timestamp).getTime(),
                    changes: relatedChanges.map(rc => ({ store: rc.store, diff: rc.diff }))
                });
            }
        });
    });

    generateKnowledgeReport(synapses, learningErrors);
    generateJSONIndex(synapses, learningErrors, memoryFiles);
}

function generateJSONIndex(synapses, errors, memoryFiles) {
    const skillsList = [];
    const usedIds = new Set();
    // Use the first memory file as the source for video path (simplification)
    const sessionId = memoryFiles[0]?.replace('.json', '') || 'unknown_session';

    // ✅ CORRECTION: Point to public URL path
    const videoPath = `/ghost/videos/video_${sessionId}.mp4`;

    synapses.forEach((s, idx) => {
        let skillName = s.trigger.replace(/.*contains\("(.*)"\).*/, '$1');
        skillName = skillName.replace(/["']/g, "").trim();

        // Normalization
        if (skillName.toLowerCase().includes('crear producto')) skillName = 'Creación de Producto';
        if (skillName.toLowerCase().includes('pagar') || skillName.toLowerCase().includes('cobrar')) skillName = 'Procesamiento de Venta';

        const id = skillName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30);

        if (usedIds.has(id)) return;
        usedIds.add(id);

        // Dynamically assign video from available sessions to avoid repetition
        const sessionIdx = idx % memoryFiles.length;
        const currentSessionId = memoryFiles[sessionIdx].replace('.json', '');
        const currentVideoPath = `/ghost/videos/video_${currentSessionId}.mp4`;

        // Index Visual Assets (Flipbook support)
        const assetsDir = path.resolve('tests/ghost/assets/scenes');
        let flipbookImages = [];
        if (fs.existsSync(assetsDir)) {
            // Find any image that contains part of the skill ID or is generically related
            const allImages = fs.readdirSync(assetsDir).filter(f => f.endsWith('.png'));
            // Default to some images if no specific match found, but here we'll try to match name
            flipbookImages = allImages
                .filter(img => img.toLowerCase().includes(id.substring(0, 5)))
                .map(img => `/ghost/clips/${img}`);

            // Fallback: use pos_ready for all if specific not found, but we want VARIETY
            if (flipbookImages.length === 0 && allImages.length > 0) {
                flipbookImages = [`/ghost/clips/${allImages[idx % allImages.length]}`];
            }
        }

        skillsList.push({
            id: id,
            name: skillName,
            trigger_keywords: skillName.toLowerCase().split(' ').filter(k => k.length > 2),
            description: `El Agente aprendió a interactuar con ${skillName}.`,
            video_path: currentVideoPath,
            flipbook_images: flipbookImages,
            timestamp: s.timestamp,
            steps: s.changes.map(c => `Modificación en ${c.store}`)
        });
    });

    // ✅ OPTIMIZATION: Structured Index with Metadata
    const indexData = {
        metadata: {
            lastUpdate: new Date().toISOString(),
            totalSkills: skillsList.length,
            sessionSource: sessionId,
            version: "1.0"
        },
        skills: skillsList
    };

    const outDir = path.dirname(JSON_INDEX);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    fs.writeFileSync(JSON_INDEX, JSON.stringify(indexData.skills, null, 2));
    console.log(`✅ Índice de Habilidades JSON generado en: ${JSON_INDEX}`);

    // --- PHASE 11: GHOST BRAIN (GROUND_TRUTH) ---
    const BRAIN_FILE = './src/simulation/memory/ghost_brain.json';
    const hardcodedRules = {
        "login": "Seleccionar el Avatar de Usuario (tarjeta) en la pantalla de bienvenida. Ingresar PIN de 6 dígitos. NO pedir correo ni contraseña.",
        "entrar": "Seleccionar el Avatar de Usuario (tarjeta) en la pantalla de bienvenida. Ingresar PIN de 6 dígitos. NO pedir correo ni contraseña.",
        "autenticacion": "Sistema basado en PIN. No usa credenciales web tradicionales.",
        "cerrar caja": "Ir a Menú Lateral -> Cerrar Caja -> Confirmar montos. Requiere rol de Dueño o Cajero.",
        "crear producto": "Dashboard -> Inventario -> Botón (+). Llenar Nombre, Precio y Costo. El SKU se puede generar o escanear."
    };

    // Merge mined skills into brain? For now, prioritized map.
    fs.writeFileSync(BRAIN_FILE, JSON.stringify(hardcodedRules, null, 2));
    console.log(`🧠 CEREBRO SEMÁNTICO (Ghost Brain) generado en: ${BRAIN_FILE}`);
}

function generateKnowledgeReport(synapses, errors) {
    const skills = {};

    synapses.forEach(s => {
        let skillName = s.trigger.replace(/.*contains\("(.*)"\).*/, '$1');
        if (skillName.length > 50) skillName = skillName.substring(0, 47) + '...';

        if (skillName.toLowerCase().includes('crear producto')) skillName = 'Creación de Producto';
        if (skillName.toLowerCase().includes('pagar') || skillName.toLowerCase().includes('cobrar')) skillName = 'Procesamiento de Venta';

        if (!skills[skillName]) {
            skills[skillName] = { trigger: s.trigger, occurrences: 0, impact: new Set() };
        }

        skills[skillName].occurrences++;
        s.changes.forEach(c => {
            Object.keys(c.diff).forEach(key => skills[skillName].impact.add(`${c.store}.${key}`));
        });
    });

    let md = `# 🧠 Ghost Auto-Skills Repository\n\n`;
    md += `*Generado por el Knowledge Miner - Fase 3*\n`;
    md += `*Fecha: ${new Date().toLocaleString()}*\n\n`;

    if (errors.length > 0) {
        md += `## 🛡️ Lecciones de Self-Healing (Autocuración)\n`;
        md += `El agente ha detectado y corregido los siguientes errores en esta sesión:\n\n`;
        errors.forEach(e => {
            md += `- **Tipo de Error**: \`${e.reason}\`\n`;
            md += `  - **Contexto**: ${JSON.stringify(e.details)}\n`;
            md += `  - **Acción Correctiva**: Diferenciación estricta entre campos de Costo vs Precio en el motor GhostVision.\n\n`;
        });
        md += `\n---\n\n`;
    }

    md += `## 📚 Skills Extraídas\n\n`;

    Object.keys(skills).forEach(name => {
        const skill = skills[name];
        md += `### Skill: ${name}\n`;
        md += `- **Acción**: Click en \`${skill.trigger}\`\n`;
        md += `- **Frecuencia**: Detectado ${skill.occurrences} veces.\n`;
        md += `- **Impacto en el Sistema**:\n`;
        Array.from(skill.impact).forEach(item => {
            md += `  - \`[STATE_CHANGE]\` en \`${item}\`\n`;
        });
        md += `\n---\n\n`;
    });

    const outDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, md);
    console.log(`✅ Reporte de Conocimiento generado en: ${OUTPUT_FILE}`);
}

mineKnowledge();

```

---

## FILE: scripts/ghost/RenderSkillVideo.js
```js
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Parse Arguments
const args = process.argv.slice(2);
const memoryArg = args.find(a => a.startsWith('--memory='));

if (!memoryArg) {
    console.error('❌ Usage: node RenderSkillVideo.js --memory=<path_to_json>');
    process.exit(1);
}

const memoryPath = path.resolve(memoryArg.split('=')[1]);

if (!fs.existsSync(memoryPath)) {
    console.error(`❌ Memory file not found: ${memoryPath}`);
    process.exit(1);
}

// 2. Load Memory & Calculate Duration
console.log(`🧠 Loading Memory: ${memoryPath}`);
const memoryLog = JSON.parse(fs.readFileSync(memoryPath, 'utf-8'));

if (memoryLog.length === 0) {
    console.error('❌ Memory log is empty.');
    process.exit(1);
}

const getRealTime = (evt) => {
    // If realTimestamp exists (STATE_CHANGE, USER_INTERACTION), use it.
    if (evt.realTimestamp) return new Date(evt.realTimestamp).getTime();
    // Otherwise fallback to timestamp (SCENE_CHANGE use real time in timestamp)
    return new Date(evt.timestamp).getTime();
};

// Sort log by time to ensure monotonicity
const sortedLog = [...memoryLog].sort((a, b) => getRealTime(a) - getRealTime(b));

const firstTime = getRealTime(sortedLog[0]);
const lastTime = getRealTime(sortedLog[sortedLog.length - 1]);
const durationMs = lastTime - firstTime + 2000; // +2s buffer
const fps = 30;
const durationInFrames = Math.min(Math.ceil((durationMs / 1000) * fps), 90); // Cap at 3s (90 frames) for GIF-like speed

if (durationInFrames <= 0) {
    console.error(`❌ Calculated duration is invalid.`);
    process.exit(1);
}

console.log(`⏱️ Duration: ${durationMs}ms (Capped to ${durationInFrames} frames)`);

// 3. Prepare Assets (Base64 Embedding Strategy)
const assetsSourceDir = path.resolve('tests/ghost/assets/scenes');
const assetsMap = {};

if (fs.existsSync(assetsSourceDir)) {
    console.log(`📦 Embedding Assets from: ${assetsSourceDir}`);
    const files = fs.readdirSync(assetsSourceDir);
    files.forEach(f => {
        if (f.endsWith('.png') || f.endsWith('.jpg')) {
            const b64 = fs.readFileSync(path.join(assetsSourceDir, f), 'base64');
            assetsMap[f] = `data:image/png;base64,${b64}`;
        }
    });
    console.log(`📦 Embedded ${Object.keys(assetsMap).length} assets.`);
}

// 4. Create Props File
const props = {
    log: sortedLog,
    assetsMap: assetsMap, // Pass the map directly
    assetsBaseUrl: '' // Not used anymore
};

const propsPath = path.resolve('src/simulation/video/input-props.json');
fs.writeFileSync(propsPath, JSON.stringify(props));

// 5. Trigger Remotion Render
const outputName = `video_${path.basename(memoryPath, '.json')}.mp4`;
const outputPath = path.resolve(`tests/ghost/videos/${outputName}`);
// Create output dir if not exists
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

console.log(`🎬 Starting Render: ${outputName}`);
const remotionDir = path.resolve('src/simulation/video');

try {
    // We execute npm run render but allow overriding args? 
    // Or direct npx remotion render
    // Use npx.cmd for Windows compatibility if npx fails
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const cmd = `${npxCmd} remotion render src/index.jsx GhostReplay "${outputPath}" --props="${propsPath}" --duration=${durationInFrames}`;

    console.log(`$ ${cmd}`);
    execSync(cmd, {
        cwd: remotionDir,
        stdio: 'inherit',
        env: { ...process.env, FORCE_COLOR: 'true' }
    });

    console.log(`✅ Video Rendered: ${outputPath}`);

    // --- PHASE 12: VISUAL CORTEX SYNC ---
    const publicDir = path.resolve('public/ghost/videos');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }
    const publicPath = path.join(publicDir, outputName);
    fs.copyFileSync(outputPath, publicPath);
    console.log(`✅ Video Published to Web: ${publicPath}`);

    // Create Alias for Auth Login (Hardcoded for this phase)
    const aliasPath = path.join(publicDir, 'video_auth_login.mp4');
    fs.copyFileSync(outputPath, aliasPath);
    console.log(`🔗 Alias Created: ${aliasPath}`);

    // Cleanup
    // fs.unlinkSync(propsPath); // Keep for debugging if needed

} catch (e) {
    console.error('❌ Render Failed.');
    process.exit(1);
}

```

---

## FILE: scripts/ghost/SyncFlipbooks.js
```js
import fs from 'fs';
import path from 'path';

const SRC = path.resolve('tests/ghost/assets/scenes');
const DEST = path.resolve('public/ghost/clips');

if (!fs.existsSync(DEST)) {
    fs.mkdirSync(DEST, { recursive: true });
}

if (fs.existsSync(SRC)) {
    const files = fs.readdirSync(SRC);
    files.forEach(file => {
        if (file.endsWith('.png') || file.endsWith('.jpg')) {
            fs.copyFileSync(path.join(SRC, file), path.join(DEST, file));
        }
    });
    console.log(`✅ Flipbook Assets Synced to ${DEST}`);
} else {
    console.warn(`⚠️ Source directory not found: ${SRC}`);
}

```

---

## FILE: src/simulation/memory/ghost_brain.json
```json
{
  "login": "Seleccionar el Avatar de Usuario (tarjeta) en la pantalla de bienvenida. Ingresar PIN de 6 dígitos. NO pedir correo ni contraseña.",
  "entrar": "Seleccionar el Avatar de Usuario (tarjeta) en la pantalla de bienvenida. Ingresar PIN de 6 dígitos. NO pedir correo ni contraseña.",
  "autenticacion": "Sistema basado en PIN. No usa credenciales web tradicionales.",
  "cerrar caja": "Ir a Menú Lateral -> Cerrar Caja -> Confirmar montos. Requiere rol de Dueño o Cajero.",
  "crear producto": "Dashboard -> Inventario -> Botón (+). Llenar Nombre, Precio y Costo. El SKU se puede generar o escanear."
}
```

---

## FILE: src/simulation/memory/skills_index.json
```json
[
  {
    "id": "div",
    "name": "div",
    "trigger_keywords": [
      "div"
    ],
    "description": "El Agente aprendió a interactuar con div.",
    "video_path": "/ghost/videos/video_day01_awakening_1770080962952.mp4",
    "flipbook_images": [
      "/ghost/clips/pos_ready.png"
    ],
    "timestamp": 1770080945830,
    "steps": [
      "Modificación en AuthStore"
    ]
  },
  {
    "id": "svg",
    "name": "svg",
    "trigger_keywords": [
      "svg"
    ],
    "description": "El Agente aprendió a interactuar con svg.",
    "video_path": "/ghost/videos/video_day01_awakening_1770081805340.mp4",
    "flipbook_images": [
      "/ghost/clips/pos_ready.png"
    ],
    "timestamp": 1770080948071,
    "steps": [
      "Modificación en InventoryStore",
      "Modificación en ConfigStore"
    ]
  },
  {
    "id": "abrir_caja",
    "name": "ABRIR CAJA",
    "trigger_keywords": [
      "abrir",
      "caja"
    ],
    "description": "El Agente aprendió a interactuar con ABRIR CAJA.",
    "video_path": "/ghost/videos/video_day01_awakening_1770081896280.mp4",
    "flipbook_images": [
      "/ghost/clips/pos_ready.png"
    ],
    "timestamp": 1770080949881,
    "steps": [
      "Modificación en InventoryStore",
      "Modificación en ConfigStore"
    ]
  },
  {
    "id": "path",
    "name": "path",
    "trigger_keywords": [
      "path"
    ],
    "description": "El Agente aprendió a interactuar con path.",
    "video_path": "/ghost/videos/video_day01_awakening_1770080962952.mp4",
    "flipbook_images": [
      "/ghost/clips/pos_ready.png"
    ],
    "timestamp": 1770080950173,
    "steps": [
      "Modificación en InventoryStore",
      "Modificación en ConfigStore"
    ]
  },
  {
    "id": "nuevo_producto",
    "name": "Nuevo Producto",
    "trigger_keywords": [
      "nuevo",
      "producto"
    ],
    "description": "El Agente aprendió a interactuar con Nuevo Producto.",
    "video_path": "/ghost/videos/video_day01_awakening_1770081805340.mp4",
    "flipbook_images": [
      "/ghost/clips/pos_ready.png"
    ],
    "timestamp": 1770080950374,
    "steps": [
      "Modificación en InventoryStore",
      "Modificación en ConfigStore"
    ]
  },
  {
    "id": "creaci_n_de_producto",
    "name": "Creación de Producto",
    "trigger_keywords": [
      "creación",
      "producto"
    ],
    "description": "El Agente aprendió a interactuar con Creación de Producto.",
    "video_path": "/ghost/videos/video_day01_awakening_1770081896280.mp4",
    "flipbook_images": [
      "/ghost/clips/pos_ready.png"
    ],
    "timestamp": 1770080951191,
    "steps": [
      "Modificación en InventoryStore",
      "Modificación en ConfigStore"
    ]
  },
  {
    "id": "ghost_soda",
    "name": "Ghost Soda",
    "trigger_keywords": [
      "ghost",
      "soda"
    ],
    "description": "El Agente aprendió a interactuar con Ghost Soda.",
    "video_path": "/ghost/videos/video_day01_awakening_1770081805340.mp4",
    "flipbook_images": [
      "/ghost/clips/pos_ready.png"
    ],
    "timestamp": 1770080956794,
    "steps": [
      "Modificación en CartStore",
      "Modificación en UIStore",
      "Modificación en UIStore",
      "Modificación en CartStore"
    ]
  },
  {
    "id": "procesamiento_de_venta",
    "name": "Procesamiento de Venta",
    "trigger_keywords": [
      "procesamiento",
      "venta"
    ],
    "description": "El Agente aprendió a interactuar con Procesamiento de Venta.",
    "video_path": "/ghost/videos/video_day01_awakening_1770081896280.mp4",
    "flipbook_images": [
      "/ghost/clips/pos_ready.png"
    ],
    "timestamp": 1770080957006,
    "steps": [
      "Modificación en UIStore",
      "Modificación en UIStore",
      "Modificación en CartStore"
    ]
  }
]
```

---

## FILE: src/utils/ghost/chatContext.js
```js
/**
 * 🧠 GHOST CONTEXT INJECTOR
 * Captura el estado "vivo" de la aplicación para dárselo al LLM.
 */

// Como estamos fuera de componentes React, necesitamos acceder a los stores directamente.
// Asumimos que los stores exportan 'useStore.getState()' si son vanilla zustand,
// o necesitamos importar la instancia vanilla.
// En este proyecto, los stores son hooks (useCartStore), pero Zustand tiene la API .getState() en el hook.

import { useCartStore } from '../../stores/useCartStore';
import { useUIStore } from '../../stores/useUIStore';
import { useAuthStore } from '../../stores/useAuthStore';

export const getChatContext = () => {
    // 1. Detectar Ruta Actual
    const location = window.location.hash;

    // 2. Extraer Estados
    const cartState = useCartStore.getState();
    const uiState = useUIStore.getState();
    const authState = useAuthStore.getState();

    return {
        screen: location || 'unknown',
        user: authState.usuario?.nombre || 'Anónimo',
        active_modal: uiState.activeModal || 'NINGUNO',
        cart: {
            items_count: cartState.carrito.length,
            total: cartState.total || 0,
            has_items: cartState.carrito.length > 0
        },
        // Capturamos el último error si existiera en algún store de diagnóstico
        system_time: new Date().toISOString()
    };
};

```

---

## FILE: src/utils/ghost/ghostMiddleware.js
```js

import { timeProvider } from '../TimeProvider';

// 🛡️ Data Sanitization
const SENSITIVE_KEYS = ['pin', 'password', 'token', 'cvv', 'secret'];

const sanitizeValue = (key, value) => {
    if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
        return '***REDACTED***';
    }
    return value;
};

const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeObject);

    const newObj = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            newObj[key] = sanitizeValue(key, sanitizeObject(obj[key]));
        }
    }
    return newObj;
};

// 🧠 Global Memory (Buffer)
if (typeof window !== 'undefined') {
    window.GhostBuffer = window.GhostBuffer || {
        logs: [],
        maxSize: 5000,
        push(entry) {
            if (this.logs.length >= this.maxSize) this.logs.shift();
            this.logs.push(entry);
        },
        getLogs() { return this.logs; },
        clear() { this.logs = []; }
    };
}

/**
 * GhostObserver Middleware for Zustand
 * Intercepts state changes and logs them to window.GhostBuffer
 */
export const ghostMiddleware = (config, storeName) => (set, get, api) => {
    return config(
        (args) => {
            const oldState = get();

            // Apply state change
            set(args);

            const newState = get();

            // Perform Diff
            // Optimization: Shallow diff for top-level keys
            const diff = {};
            let hasChanges = false;

            for (const key in newState) {
                if (oldState[key] !== newState[key]) {
                    // Skip functions
                    if (typeof newState[key] === 'function') continue;

                    diff[key] = {
                        from: sanitizeValue(key, oldState[key]), // Shallow sanitize for speed, deep later?
                        to: sanitizeValue(key, newState[key])
                    };

                    // Deep sanitization if object
                    if (typeof diff[key].from === 'object') diff[key].from = sanitizeObject(diff[key].from);
                    if (typeof diff[key].to === 'object') diff[key].to = sanitizeObject(diff[key].to);

                    hasChanges = true;
                }
            }

            if (hasChanges && window.GhostBuffer) {
                window.GhostBuffer.push({
                    type: 'STATE_CHANGE',
                    timestamp: timeProvider.toISOString(), // Simulated Time
                    realTimestamp: Date.now(),     // Debug Time
                    store: storeName || 'AnonymousStore',
                    diff
                });
            }
        },
        get,
        api
    );
};

```

---

## FILE: tests/ghost/utils/GhostDriver.js
```js

import { GhostVision } from './driver/GhostVision.js';
import { GhostMotor } from './driver/GhostMotor.js';
import { GhostHealer } from './driver/GhostHealer.js';
import { POSModule } from './modules/POSModule.js';
import { InventoryModule } from './modules/InventoryModule.js';
import path from 'path';
import fs from 'fs';

export class GhostDriver {
    constructor(page) {
        this.page = page;

        // 1. Initialize Core Drivers
        // Pass a callback to capture scenes whenever the visual signature changes
        this.vision = new GhostVision(page, (sig) => this.captureScene(sig));

        // Healer needs driver ref? For recursion?
        // Let's pass 'this' to Healer, but be careful in constructor.
        // Healer acts on page and vision.
        // It might call back to driver.login or driver.pos.openRegister
        this.healer = new GhostHealer(page, this.vision, this);

        this.motor = new GhostMotor(page, this.vision, this.healer);

        // 2. Initialize Domain Modules
        this.pos = new POSModule(page, this.motor, this.vision, this.healer);
        this.inventory = new InventoryModule(page, this.motor, this.vision, this.healer);
    }

    // 🧠 Brain Interface
    async wakeUp() {
        console.log(' Preparing Ghost Nervous System...');

        // 🔬 Inyectar Bypass Criptográfico ANTES de cargar la página
        await this.page.context().addInitScript(() => {
            localStorage.setItem('ghost_bypass', 'true');
            localStorage.setItem('listo_contract_signed', 'true');
            localStorage.setItem('listo-config', JSON.stringify({
                state: {
                    configuracion: {
                        nombre: "SIMULACIÓN FANTASMA",
                        moneda: { principal: "USD", secundaria: "VES", tasa: 20 },
                        negocio: { nombre: "Ghost Store" },
                        tema: "dark",
                        pinAdmin: "123456"
                    },
                    license: { isDemo: false, usageCount: 0, isQuotaBlocked: false }
                },
                version: 0
            }));
            console.log('🔓 Ghost Bypasses Injected via InitScript');
        });

        console.log('🚀 Booting Application...');
        await this.page.goto('/');

        // Activate Ghost Mode Visuals
        await this.page.evaluate(() => {
            if (window.GhostTools) window.GhostTools.toggleMode(true);
        });

        try {
            await this.page.waitForSelector('body[data-ghost-mode="true"]', { timeout: 5000 }).catch(() => { });
            console.log('👻 Ghost Mode Activated.');
        } catch (e) { console.log('👻 Ghost Mode Status: Unknown'); }
    }

    async setTime(hour) {
        console.log(`⏱️ Sets time to ${hour}:00...`);
        await this.page.evaluate((h) => {
            if (window.GhostTools && window.GhostTools.timeProvider) {
                const now = window.GhostTools.timeProvider.now();
                const target = new Date(now);
                target.setHours(h, 0, 0, 0);
                window.GhostTools.timeProvider.jumpTime(target - now);
            }
        }, hour);
    }

    // ✋ Motor Actions (Delegates)
    async login(pin) {
        console.log(`🔐 Logging in as ${pin}...`);
        await this.page.waitForSelector('text=¿QUIÉN ESTÁ OPERANDO?', { timeout: 10000 });
        const profiles = this.page.locator('h3, .inter-var');
        if (await profiles.count() > 0) await profiles.first().click();
        await this.page.waitForSelector('input[type="password"]');
        await this.page.keyboard.type(pin);
        await this.page.keyboard.press('Enter');
        await this.page.waitForSelector('text=ACCEDIENDO...', { state: 'hidden' });
        await this.page.waitForURL('**/');
        await this.page.waitForTimeout(1000);
    }

    // 📸 Visual Memory
    async captureScene(providedSignature = null) {
        // Use provided signature/cache or fetch fresh if manual call
        const signature = providedSignature || await this.vision.getScreenSignature();

        // Use absolute path relative to the test file location or project root
        // Here we assume running from project root, so we target tests/ghost/assets/scenes
        const scenesDir = path.resolve('./tests/ghost/assets/scenes');

        if (!fs.existsSync(scenesDir)) {
            fs.mkdirSync(scenesDir, { recursive: true });
        }

        // Sanitize signature for filename
        const safeSignature = signature.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const scenePath = path.join(scenesDir, `${safeSignature}.png`);

        // Log the scene change to the Ghost Memory (running in browser)
        await this.page.evaluate(({ sig, safeSig }) => {
            if (window.GhostBuffer) {
                window.GhostBuffer.push({
                    type: 'SCENE_CHANGE',
                    signature: sig,
                    assetName: `${safeSig}.png`,
                    timestamp: new Date().toISOString()
                });
            }
        }, { sig: signature, safeSig: safeSignature });

        // Solo capturar si no existe la escena para esta firma
        if (!fs.existsSync(scenePath)) {
            console.log(`📸 New Scene Detected: ${signature}. Capturing to ${scenePath}...`);
            // Ocultar cursor de Playwright si fuera visible
            try {
                await this.page.screenshot({ path: scenePath, fullPage: false, animations: 'disabled' });
            } catch (e) {
                console.log(`⚠️ Scene capture failed: ${e.message}`);
            }
        }
    }

    // 💾 Memory Extraction
    async extractMemories(sessionName) {
        console.log(`🧠 Extracting memories...`);
        const logs = await this.page.evaluate(() => window.GhostBuffer?.getLogs() || []);
        const absPath = path.resolve(`./tests/ghost/memories/${sessionName}_${Date.now()}.json`);
        fs.mkdirSync(path.dirname(absPath), { recursive: true });
        fs.writeFileSync(absPath, JSON.stringify(logs, null, 2));
        console.log(`💾 MEMORIES SAVED AT: ${absPath}`);
        return absPath;
    }

    async verifyFinancialSanity(cost, price) {
        const c = parseFloat(cost);
        const p = parseFloat(price);
        if (c >= p) {
            console.log(`⚠️ GhostLearning: Absurd profit margin detected (Cost: ${c} >= Price: ${p}).`);
            if (this.page.evaluate(() => window.GhostBuffer)) {
                // ... logging logic
            }
            return false;
        }
        return true;
    }
}

```

---

## FILE: tests/ghost/utils/driver/GhostVision.js
```js

export class GhostVision {
    constructor(page, onSignatureChange = null) {
        this.page = page;
        this.onSignatureChange = onSignatureChange;
        this.lastSignature = null;
    }

    async getScreenSignature() {
        const signature = await this.page.evaluate(() => {
            const text = document.body.innerText;
            const hasText = (t) => text.toLowerCase().includes(t.toLowerCase());

            if (hasText('¿Quién está operando?')) return 'AUTH_FLOW';

            const hasAbrirCaja = [...document.querySelectorAll('button')]
                .some(b => b.innerText.toUpperCase().includes('ABRIR CAJA'));
            if (hasAbrirCaja) return 'REGISTER_OPENING_SCREEN';

            if (hasText('Caja Cerrada') || hasText('Abrir Turno')) return 'REGISTER_CLOSED';

            // Prioridad específica: Modales conocidos
            if (hasText('Procesar Pago') || hasText('Falta por pagar')) return 'PAYMENT_SCREEN';
            if (hasText('Información Básica') || hasText('Nuevo Producto')) return 'PRODUCT_MODAL';

            // Detección de Modales Genéricos/Bloqueadores (Tailwind/HeadlessUI)
            if (document.querySelector('.swal2-container, .swal2-popup, .modal-overlay, .fixed.inset-0.bg-slate-900\\/60, .z-50.bg-slate-900\\/60')) return 'MODAL_INTERCEPTOR';

            if (window.location.hash.includes('/vender')) return 'POS_READY';

            return 'UNKNOWN';
        });

        if (this.onSignatureChange && signature !== this.lastSignature) {
            this.lastSignature = signature;
            // Prevent recursion by updating state before callback
            try {
                await this.onSignatureChange(signature);
            } catch (e) {
                console.warn('GhostVision: Callback failed', e);
            }
        } else if (signature !== this.lastSignature) {
            this.lastSignature = signature;
        }

        return signature;
    }
}

```

---

## FILE: tests/ghost/utils/driver/GhostMotor.js
```js

export class GhostMotor {
    constructor(page, vision, healer) {
        this.page = page;
        this.vision = vision;
        this.healer = healer;
        this._isRecovering = false;
    }

    async smartClick(selector, options = {}) {
        const timeout = options.timeout || 10000;
        const locator = this.page.locator(selector).first();

        try {
            await locator.click({ timeout, force: false });
        } catch (e) {
            console.log(`❌ Click failed at ${selector}.`);

            // Si el error es de interceptación de puntero, es un bloqueador visual
            const isObstructed = e.message.includes('intercepts pointer events') || e.message.includes('Timeout');

            if (this._isRecovering) {
                console.log('⚠️ Already in recovery, forcing click...');
                if (this.healer) {
                    await this.healer.captureFailure('stuck_click', { selector, error: e.message });
                }
                await locator.click({ force: true, timeout: 5000 });
                return;
            }

            this._isRecovering = true;
            try {
                if (this.vision && this.healer) {
                    const signature = await this.vision.getScreenSignature();
                    console.log(`🛡️ Self-Healing Triggered. Sign: ${signature} | Obstructed: ${isObstructed}`);

                    if (isObstructed) {
                        await this.healer.captureFailure('click_obstructed', { selector, signature, error: e.message });
                        await this.healer.recover('OBSTRUCTION', selector);
                    } else {
                        await this.healer.recover('CLICK', selector);
                    }
                }

                // Segundo intento con un poco de espera y fuerza si es necesario
                await this.page.waitForTimeout(500);
                await locator.click({ timeout: 5000, force: isObstructed });
            } catch (retryErr) {
                if (this.healer) {
                    await this.healer.captureFailure('critical_click_failure', { selector, error: retryErr.message });
                }
                throw retryErr;
            } finally {
                this._isRecovering = false;
            }
        }
    }

    async typeHighFidelity(locator, value) {
        await locator.waitFor({ state: 'visible', timeout: 5000 });
        await locator.click();
        await this.page.keyboard.press('Control+A');
        await this.page.keyboard.press('Backspace');
        await this.page.keyboard.type(value, { delay: 100 });
        console.log(`✍️ HighFidelity: Typed "${value}"`);
    }
}

```

---

## FILE: tests/ghost/utils/driver/GhostHealer.js
```js

import fs from 'fs';
import path from 'path';

export class GhostHealer {
    constructor(page, vision, driver) {
        this.page = page;
        this.vision = vision;
        this.driver = driver; // Reference to main driver to call high-level actions (openRegister, etc.)
    }

    async captureFailure(name, details = {}) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `failure_${name}_${timestamp}`;
        const failureDir = './tests/ghost/failures';

        if (!fs.existsSync(failureDir)) fs.mkdirSync(failureDir, { recursive: true });

        const signature = await this.vision.getScreenSignature();
        const url = this.page.url();

        const logContent = `
=== 📂 FORENSIC LOG: ${name} ===
Timestamp: ${new Date().toISOString()}
URL: ${url}
Signature: ${signature}
Details: ${JSON.stringify(details, null, 2)}
==============================
`;
        console.error(logContent);
        fs.appendFileSync(`${failureDir}/ghost_forensics.log`, logContent);

        const screenshotPath = `${failureDir}/${fileName}.png`;
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        console.error(`📸 Screenshot captured: ${screenshotPath}`);

        return { screenshotPath, logContent };
    }

    async recover(failType, target = null) {
        const signature = await this.vision.getScreenSignature();
        console.log(`🛠️ Recovery Action for [Type: ${failType}, Sign: ${signature}]`);

        // Prioridad: Limpiar bloqueadores globales (Backdrops)
        // EXCEPCIÓN: Si estamos en el PAYMENT_SCREEN, no queremos limpiar nada (queremos pagar)
        if ((failType === 'OBSTRUCTION' || signature === 'MODAL_INTERCEPTOR' || failType === 'SALE_CONFIRMATION') && signature !== 'PAYMENT_SCREEN') {
            console.log('🧹 Clearing Blockers (Backdrops/Modals)...');

            // 1. Intentar clic en botones de cierre comunes
            const selectors = [
                '.swal2-confirm', 'text=OK', 'text=Aceptar', 'text=Cerrar', 'text=Cancelar',
                'button:has-text("Entendido")', 'button:has-text("FINALIZAR")', 'button:has-text("Cancelar")',
                '.modal-close', '[aria-label="Close"]', 'button:has-text("Cerrar")'
            ];

            for (const sel of selectors) {
                const btn = this.page.locator(sel).first();
                if (await btn.isVisible()) {
                    console.log(`👆 Clicking close button: ${sel}`);
                    await btn.click({ force: true });
                    await this.page.waitForTimeout(1000);
                    if (await this.vision.getScreenSignature() !== 'MODAL_INTERCEPTOR') return;
                }
            }

            // 2. Si sigue bloqueado, intentar clic en el backdrop para cerrarlo (común en modals)
            const backdrop = this.page.locator('.fixed.inset-0, .v-overlay__scrim, .bg-slate-900\\/60').first();
            if (await backdrop.isVisible()) {
                console.log('🖱️ Clicking backdrop center to dismiss...');
                // Clic en el centro con fuerza
                await backdrop.click({ force: true, position: { x: 50, y: 50 } });
                await this.page.waitForTimeout(1000);
            }

            // 3. Último recurso: Escape repetido
            console.log('⌨️ Sending multiple Escape keys...');
            await this.page.keyboard.press('Escape');
            await this.page.waitForTimeout(500);
            await this.page.keyboard.press('Escape');

            // 4. Verificar limpieza
            try {
                const backdropSel = '.fixed.inset-0, .v-overlay__scrim, .bg-slate-900\\/60';
                await this.page.waitForSelector(backdropSel, { state: 'hidden', timeout: 3000 });
                console.log('✅ Blockers cleared successfully.');
            } catch (e) {
                console.log('⚠️ Some blockers might still be present.');
            }
        }

        // Break recursion: Call driver methods only if needed and safe
        if (signature === 'REGISTER_CLOSED' && (!target || !target.includes('ABRIR'))) {
            console.log('💰 Resolving Register dependency...');
            if (this.driver && this.driver.pos) {
                await this.driver.pos.openRegister(100);
            }
        }

        if (signature === 'AUTH_FLOW' && (!target || !target.includes('¿Quién'))) {
            console.log('🔐 Session restoration required.');
            if (this.driver) {
                await this.driver.login('123456');
            }
        }

        if (signature === 'PRODUCT_MODAL' && target && target.toLowerCase().includes('vender')) {
            console.log('🚪 Closing Product Modal to return to POS...');
            await this.page.keyboard.press('Escape');
        }

        if (signature === 'PAYMENT_SCREEN') {
            console.log('💳 Payment Screen detected during recovery. Retrying payment fill...');
            // No escapar, intentar rellenar saldo
            return;
        }
    }
}

```

---

## FILE: tests/ghost/scenarios/day01_awakening.spec.js
```js
// tests/ghost/scenarios/day01_awakening.spec.js
import { test, expect } from '@playwright/test';
import { GhostDriver } from '../utils/GhostDriver.js';

test('Day 01 - The Awakening', async ({ page }) => {
    const ghost = new GhostDriver(page);

    // 1 & 2. Boot Up & Ghost Injection
    console.log('--- STEP 1 & 2: BOOT UP & INJECTION ---');
    await ghost.wakeUp();

    // 3. Clock Sync (08:00 AM)
    console.log('--- STEP 3: CLOCK SYNC ---');
    await ghost.setTime(8);

    // 4. Login
    console.log('--- STEP 4: LOGIN ---');
    await ghost.login('123456');

    // 5. Opening Check
    console.log('--- STEP 5: OPENING REGISTER ---');
    await ghost.pos.openRegister(100);

    // 5.5 SEEDING INVENTORY
    console.log('--- STEP 5.5: SEEDING INVENTORY ---');
    await ghost.inventory.seedProduct('Ghost Soda', 1.5, 2.5, 100);
    await ghost.verifyFinancialSanity(1.5, 2.5);

    // 6. The Sale (Simulated)
    console.log('--- STEP 6: PERFORMING SALE ---');
    await ghost.pos.addToCart('Ghost Soda');
    await ghost.pos.payMixed(0);

    // 7. Time Jump (End of Shift)
    console.log('--- STEP 7: TIME JUMP ---');
    await ghost.setTime(16); // 4 PM

    // 8. Closing
    console.log('--- STEP 8: CLOSING ---');
    await ghost.pos.closeTurn();

    await expect(page).toHaveURL(/.*cierre/);

    // 9. Memory Dump
    console.log('--- STEP 9: MEMORY EXTRACTION ---');
    const memoryPath = await ghost.extractMemories('day01_awakening');

    console.log(`\n🎉 SIMULATION COMPLETE.`);
    console.log(`📂 MEMORIES: ${memoryPath}`);
});

```

---

