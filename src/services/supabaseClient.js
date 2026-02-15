import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
// Default to build-time, but allow overwrite
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client (Singleton proxy)
export let supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false
        }
    })
    : null;

// Function to re-initialize with new keys
export const initSupabase = (url, key) => {
    console.log("🔄 Re-initializing Supabase Client...");
    if (url && key) {
        supabaseUrl = url;
        supabaseAnonKey = key;
        supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: false
            }
        });
        console.log('✅ Supabase Client re-initialized.');
    } else {
        console.warn('⚠️ InitSupabase called with missing keys.');
    }
};

// Connection status check
setTimeout(() => {
    if (!supabase) {
        console.log('ℹ️ Supabase pending initialization (waiting for secrets)...');
    } else {
        console.log('✅ Supabase Client ready (default env).');
    }
}, 1000);
