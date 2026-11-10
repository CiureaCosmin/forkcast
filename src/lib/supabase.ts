import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/types/database';

// Read statically: Expo inlines `process.env.EXPO_PUBLIC_*` only when written out in full.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/**
 * Whether this build talks to Supabase. Without the two variables the app runs on the device
 * only, with the sample data and the fixed people (local mode).
 */
export function isBackendConfigured(): boolean {
  return !!url && !!key;
}

let client: SupabaseClient<Database> | undefined;

/**
 * The Supabase client, created on first use. Not at import time: the web build is rendered on a
 * server first, where there's no browser storage for the session.
 */
export function supabase(): SupabaseClient<Database> {
  if (!url || !key) throw new Error('Supabase is not configured');
  if (!client) {
    client = createClient<Database>(url, key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        // Browsers coordinate tabs with their own lock; native has one process.
        ...(Platform.OS === 'web' ? {} : { lock: processLock }),
      },
    });
    if (Platform.OS !== 'web') {
      // Browsers refresh the session when the tab is in focus; native apps have to say when
      // they're in the foreground.
      AppState.addEventListener('change', (appState) => {
        if (appState === 'active') client?.auth.startAutoRefresh();
        else client?.auth.stopAutoRefresh();
      });
      client.auth.startAutoRefresh();
    }
  }
  return client;
}
