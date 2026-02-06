import { dbMaster } from '../../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../db';
import { supabase } from '../supabaseClient';

export class GhostMemoryService {
    constructor() {
        this.systemId = this.getSystemId();
        this.sessionStart = Date.now();
        this.sessionId = null; // Will start on first message
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
        // 1. Local Persistence (Fast)
        await db.ghost_history.add({
            role: role,
            content: content,
            timestamp: Date.now()
        });

        // 2. Cloud Persistence (Async)
        await this._saveToCloud(role, content);
    }

    async _saveToCloud(role, content) {
        if (this.systemId === "ID_PENDING") return;

        // Init Session ID if new
        if (!this.sessionId) {
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            this.sessionId = `${this.systemId}_${this.sessionStart}`;
        }

        // 1. Supabase (Neural Memory for Context - UNCHANGED)
        if (supabase) {
            try {
                await supabase.from('ghost_neural_memory').insert({
                    system_id: this.systemId,
                    role: role,
                    content: content,
                    metadata: { source: 'POS', v: '6.0' }
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
        if (!dbMaster || this.sessionLogs.length === 0) return;

        try {
            // Overwrite/Update the Session Document with the full array
            // This counts as 1 WRITE per batch, saving massive costs.
            const docRef = doc(dbMaster, 'ghost_compact_sessions', this.sessionId);

            await setDoc(docRef, {
                systemId: this.systemId,
                startTime: this.sessionStart,
                lastUpdate: new Date().toISOString(),
                logCount: this.sessionLogs.length,
                logs: this.sessionLogs // store array directly
            }, { merge: true });

            // console.log("📡 Telemetry Compacted (Option 3):", this.sessionLogs.length);
        } catch (error) {
            console.error("📡 Firestore Batch Failed", error);
        }
    }

    /**
     * Retrieve recent history for context
     */
    async getHistory(limit = 10) {
        try {
            let chatHistory = await db.ghost_history
                .orderBy('timestamp')
                .reverse()
                .limit(limit)
                .toArray();
            let history = chatHistory.reverse();
            return history;
        } catch (e) {
            console.warn("Memory Fail", e);
            return [];
        }
    }

    async clearMemory() {
        try {
            // Local
            await db.ghost_history.clear();
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
