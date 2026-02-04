import { db } from '../../db';
import { supabase } from '../supabaseClient';

export class GhostMemoryService {
    constructor() {
        this.systemId = this.getSystemId();
    }

    getSystemId() {
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
        if (!supabase || this.systemId === "ID_PENDING") return;

        try {
            const { error } = await supabase
                .from('ghost_neural_memory')
                .insert({
                    system_id: this.systemId,
                    role: role,
                    content: content,
                    metadata: { source: 'POS', v: '6.0' }
                });

            if (error) throw error;
        } catch (e) {
            console.warn("☁️ Cloud Memory Save Failed", e);
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
            let history = chatHistory.reverse(); // Chronological order

            // Clean stale context on greeting
            if (history.length > 0) {
                const lastMsg = history[history.length - 1];
                if (lastMsg.role === 'user' && /^(hola|hi|hey|buenos días|buenas tardes|buenas noches)$/i.test(lastMsg.content)) {
                    // If it's just a greeting and we have history, maybe clear it? 
                    // The original logic checked if history was short. 
                    // For now, let's keep it simple: return raw history, let orchestrator decide to clear?
                    // Actually, let's replicate the original "Greeting Cleanup" logic here or in wrapper.
                    // Original: if greeting and history.length <= 1 (after add).
                    // We'll leave advanced cleanup to the caller or implement a clear method.
                }
            }
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

            // Cloud
            if (supabase && this.systemId !== "ID_PENDING") {
                console.log("🗑️ Clearing Cloud Memories...");
                await supabase
                    .from('ghost_neural_memory')
                    .delete()
                    .eq('system_id', this.systemId);
            }
        } catch (e) {
            console.error("Memory Clear Failed", e);
        }
    }

    async syncCloudMemory() {
        if (!supabase || this.systemId === "ID_PENDING") return;

        try {
            console.log("☁️ Ghost is recalling Cloud Memories...");

            const { data: cloudMsgs, error } = await supabase
                .from('ghost_neural_memory')
                .select('*')
                .eq('system_id', this.systemId)
                .order('timestamp', { ascending: false })
                .limit(20);

            if (error) throw error;

            if (cloudMsgs && cloudMsgs.length > 0) {
                cloudMsgs.reverse(); // Chronological

                const localCount = await db.ghost_history.count();
                if (localCount < cloudMsgs.length) {
                    console.log("☁️ Merging cloud memories into local consciousness...");
                    for (const m of cloudMsgs) {
                        const exists = await db.ghost_history.where('content').equals(m.content).first();
                        if (!exists) {
                            await db.ghost_history.add({
                                role: m.role,
                                content: m.content,
                                timestamp: new Date(m.timestamp).getTime(),
                                fromCloud: true
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("☁️ Cloud Memory Sync Failed", e);
        }
    }

    subscribeToRealtimeUpdates(onNewMessage) {
        if (!supabase || this.systemId === "ID_PENDING") {
            console.warn("⚡ Realtime disabled: Missing Supabase or System ID");
            return null;
        }

        console.log("⚡ Ghost Realtime Sync ACTIVE - Listening for new messages...");

        const channel = supabase
            .channel('ghost_neural_memory_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'ghost_neural_memory',
                    filter: `system_id=eq.${this.systemId}`
                },
                async (payload) => {
                    const newMsg = payload.new;
                    console.log("⚡ Realtime message received:", newMsg);

                    // Add to local Dexie if not already there
                    const exists = await db.ghost_history.where('content').equals(newMsg.content).first();
                    if (!exists) {
                        await db.ghost_history.add({
                            role: newMsg.role,
                            content: newMsg.content,
                            timestamp: new Date(newMsg.timestamp).getTime(),
                            fromCloud: true
                        });

                        // Notify UI
                        if (onNewMessage) {
                            onNewMessage({
                                id: newMsg.id,
                                role: newMsg.role,
                                text: newMsg.content
                            });
                        }
                    }
                }
            )
            .subscribe();

        return channel;
    }
}

export const ghostMemory = new GhostMemoryService();
