import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client
export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false // Ghost doesn't need user sessions
        }
    })
    : null;

// Connection status check
if (!supabase) {
    console.warn('⚠️ Supabase not configured. Cloud Memory disabled. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
} else {
    console.log('✅ Supabase Client initialized for Ghost Cloud Memory');
}
