import { dbMaster } from '../../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../db';
import { supabase } from '../supabaseClient';
import { useAuthStore } from '../../stores/useAuthStore'; // 🔐 Added to get current user

export class GhostMemoryService {
    constructor() {
        this.systemId = this.getSystemId();
        this.sessionStart = Date.now();
        this.sessionId = null; // Will start on first message
        this.currentUserId = null; // Track who owns the session
        this.sessionLogs = []; // Buffer for current session
        this.uploadTimer = null;
    }

    getSystemId() {
        // ... (Existing ID Logic)
        const isElectron = window.electronAPI && window.electronAPI.getMachineId;
        if (isElectron) {
            const cachedId = localStorage.getItem('sys_machine_id_cache');
            if (cachedId) return cachedId;

            window.electronAPI.getMachineId().then(id => {
                localStorage.setItem('sys_machine_id_cache', id);
                this.systemId = id;
            });
            return "ID_PENDING";
        }

        let currentId = localStorage.getItem('sys_installation_id');
        if (!currentId) {
            currentId = crypto.randomUUID();
            localStorage.setItem('sys_installation_id', currentId);
        }
        return currentId;
    }

    /**
     * Add message to Local and Cloud memory
     */
    async addMessage(role, content) {
        const authState = useAuthStore.getState();
        const usuario = authState?.usuario || {};
        const userId = usuario.id || 'anonymous';
        const userName = usuario.nombre || 'Desconocido';

        // 🔄 Session Rotation: If a different user types, start a new session!
        if (this.currentUserId !== null && this.currentUserId !== userId) {
            console.log("🔄 Ghost: User changed, rotating session memory");
            // Flush pending logs before rotation
            if (this.sessionLogs.length > 0) {
                await this._flushToFirestore();
            }
            this.sessionId = null;
            this.sessionLogs = [];
            this.sessionStart = Date.now();
        }
        this.currentUserId = userId;

        // 1. Local Persistence (Fast)
        await db.ghost_history.add({
            sessionId: this.sessionId || 'pending',
            userId: userId,
            role: role,
            content: content,
            timestamp: Date.now()
        });

        // 2. Cloud Persistence (Async)
        await this._saveToCloud(role, content, userId, userName);
    }

    async _saveToCloud(role, content, userId, userName) {
        if (this.systemId === "ID_PENDING") return;

        // Init Session ID if new
        if (!this.sessionId) {
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            // 🔑 Master Update: Include User ID in the Session ID so they don't mix!
            this.sessionId = `${this.systemId}_U${userId}_${this.sessionStart}`;
        }

        // 1. Supabase (Neural Memory for Context - UNCHANGED)
        if (supabase) {
            try {
                await supabase.from('ghost_neural_memory').insert({
                    system_id: this.systemId,
                    role: role,
                    content: content,
                    metadata: { source: 'POS', v: '6.0', user_id: userId, user_name: userName }
                });
            } catch (e) {
                console.warn("☁️ Cloud Memory Save Failed", e);
            }
        }

        // 2. Firebase Firestore (Telemetry - OPTION 3: COMPACT BATCHING)
        // We update a SINGLE document for the whole session instead of creating new ones constantly.
        if (dbMaster) {
            try {
                // A. Add to Local Buffer
                const logEntry = {
                    role,
                    content,
                    timestamp: new Date().toISOString(),
                };
                this.sessionLogs.push(logEntry);

                // B. Debounce Update (Wait 5s to group rapidfire messages)
                if (this.uploadTimer) clearTimeout(this.uploadTimer);

                this.uploadTimer = setTimeout(() => {
                    this._flushToFirestore();
                }, 5000);

            } catch (e) {
                console.warn("📡 Telemetry Buffer Failed", e);
            }
        }
    }

    async _flushToFirestore() {
        if (!dbMaster || this.sessionLogs.length === 0 || !this.sessionId) return;

        const logsToFlush = [...this.sessionLogs]; // Snapshot before attempting

        try {
            const docRef = doc(dbMaster, 'ghost_compact_sessions', this.sessionId);

            const authState = useAuthStore.getState();
            const userName = authState?.usuario?.nombre || 'Desconocido';

            await setDoc(docRef, {
                systemId: this.systemId,
                userId: this.currentUserId,
                userName: userName,
                startTime: this.sessionStart,
                lastUpdate: new Date().toISOString(),
                logCount: this.sessionLogs.length,
                logs: this.sessionLogs
            }, { merge: true });

            // Only clear flushed logs after successful write
            this.sessionLogs = this.sessionLogs.slice(logsToFlush.length);
        } catch (error) {
            console.error("📡 Firestore Batch Failed — logs retained for retry", error);
            // Logs are NOT cleared, will be retried on next flush
        }
    }

    /**
     * Retrieve recent history for context (Isolated per user)
     */
    async getHistory(limit = 10) {
        const authState = useAuthStore.getState();
        const userId = authState?.usuario?.id || 'anonymous';

        try {
            // En IDB no podemos hacer un .where('userId').equals() seguido de .orderBy('timestamp').reverse()
            // sin tener un compound index [userId+timestamp].
            // Para mantener compatibilidad con la DB actual, obtenemos todo y filtramos en JS.
            let chatHistory = await db.ghost_history
                .orderBy('timestamp')
                .reverse()
                .toArray();

            // Filter by current User
            chatHistory = chatHistory.filter(h => h.userId === userId || (!h.userId && userId === 1));

            // Apply limit and reverse to chronological order
            let history = chatHistory.slice(0, limit).reverse();
            return history;
        } catch (e) {
            console.warn("Memory Fail", e);
            return [];
        }
    }

    async clearMemory() {
        const authState = useAuthStore.getState();
        const userId = authState?.usuario?.id || 'anonymous';

        try {
            // Local: Borrar SOLO los del usuario actual
            await db.ghost_history.filter(h => h.userId === userId || (!h.userId && userId === 1)).delete();
            this.sessionLogs = [];
            this.sessionId = null; // Reset session

            // Cloud logic...
            if (supabase && this.systemId !== "ID_PENDING") {
                await supabase
                    .from('ghost_neural_memory')
                    .delete()
                    .eq('system_id', this.systemId);
            }
        } catch (e) {
            console.error("Memory Clear Failed", e);
        }
    }

    // ... (Keep existing syncCloudMemory and subscribeToRealtimeUpdates if needed, or remove if unused)
    // For brevity/focus on stability, I'll keep the class clean, assuming syncCloudMemory/subscribe are used elsewhere or can be re-added.
    // Given the previous file had them, I should probably keep them to avoid breaking features, but Option 3 focuses on Telemetry.
    // I will include them to be safe.

    async syncCloudMemory() {
        // ... (standard sync logic)
        if (!supabase || this.systemId === "ID_PENDING") return;
        try {
            const { data: cloudMsgs, error } = await supabase
                .from('ghost_neural_memory')
                .select('*')
                .eq('system_id', this.systemId)
                .order('timestamp', { ascending: false })
                .limit(20);
            if (error) throw error;
            if (cloudMsgs && cloudMsgs.length > 0) {
                cloudMsgs.reverse();
                const localCount = await db.ghost_history.count();
                if (localCount < cloudMsgs.length) {
                    for (const m of cloudMsgs) {
                        const exists = await db.ghost_history.where('content').equals(m.content).first();
                        if (!exists) {
                            await db.ghost_history.add({
                                role: m.role, content: m.content, timestamp: new Date(m.timestamp).getTime(), fromCloud: true
                            });
                        }
                    }
                }
            }
        } catch (e) { console.warn("Cloud Sync Fail", e); }
    }

    subscribeToRealtimeUpdates(onNewMessage) {
        if (!supabase || this.systemId === "ID_PENDING") return null;
        const channel = supabase
            .channel('ghost_neural_memory_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ghost_neural_memory', filter: `system_id=eq.${this.systemId}` },
                async (payload) => {
                    const newMsg = payload.new;
                    const exists = await db.ghost_history.where('content').equals(newMsg.content).first();
                    if (!exists) {
                        await db.ghost_history.add({
                            role: newMsg.role, content: newMsg.content, timestamp: new Date(newMsg.timestamp).getTime(), fromCloud: true
                        });
                        if (onNewMessage) onNewMessage({ id: newMsg.id, role: newMsg.role, text: newMsg.content });
                    }
                }
            ).subscribe();
        return channel;
    }
}

export const ghostMemory = new GhostMemoryService();
