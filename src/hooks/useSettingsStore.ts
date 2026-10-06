// ============================================================
// Store Settings & Payment Gateway Configuration
// + Supabase two-way sync for live contact & business settings
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

export interface StoreSettings {
  // Contact & Business Info
  businessPhone: string;
  businessWhatsApp: string;
  businessEmail: string;
  businessAddress: string;
  businessHours: string;

  // Payment Gateway Configuration
  paymentGatewayEnabled: boolean;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  isTestMode: boolean;
}

interface SettingsStore {
  settings: StoreSettings;
  updateSettings: (updates: Partial<StoreSettings>) => void;
  resetSettings: () => void;
  fetchSettings: () => Promise<void>;
  subscribeToSettings: () => () => void;
}

export const defaultSettings: StoreSettings = {
  businessPhone: '8374634989',
  businessWhatsApp: '8374634989',
  businessEmail: 'info@sudhaswagruha.com',
  businessAddress: 'Plot 18, Traditional Foods Lane, Benz Circle, Vijayawada, Andhra Pradesh - 520010',
  businessHours: '9:00 AM - 9:00 PM (All Days)',
  paymentGatewayEnabled: false, // Default disabled as requested: direct to WhatsApp
  razorpayKeyId: '',
  razorpayKeySecret: '',
  isTestMode: true,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,

      // ─── Fetch from Supabase Cloud ────────────────────────────────
      fetchSettings: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const { data, error } = await supabase
            .from('store_settings')
            .select('value')
            .eq('key', 'store_contact')
            .maybeSingle();

          if (!error && data?.value) {
            set((state) => ({
              settings: { ...state.settings, ...(data.value as Partial<StoreSettings>) },
            }));
          }
        } catch (err) {
          console.warn('Store settings sync notice:', err);
        }
      },

      // ─── Realtime Listener for Store Settings ────────────────────
      subscribeToSettings: () => {
        if (!isSupabaseConfigured()) return () => {};
        try {
          const channel = supabase
            .channel('store_settings_realtime')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'store_settings' },
              (payload) => {
                const newRow = payload.new as any;
                if (newRow?.key === 'store_contact' && newRow.value) {
                  set((state) => ({
                    settings: { ...state.settings, ...(newRow.value as Partial<StoreSettings>) },
                  }));
                }
              }
            )
            .subscribe();

          return () => {
            supabase.removeChannel(channel);
          };
        } catch (e) {
          console.warn('Store settings realtime notice:', e);
          return () => {};
        }
      },

      // ─── Update Settings (Local + Cloud Sync) ─────────────────────
      updateSettings: (updates) => {
        const next = { ...get().settings, ...updates };
        set({ settings: next });

        if (isSupabaseConfigured()) {
          supabase
            .from('store_settings')
            .upsert({
              key: 'store_contact',
              value: next,
              updated_at: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error) console.warn('Supabase store settings update notice:', error.message);
              else console.log('Synced store settings to Supabase cloud DB');
            });
        }
      },

      resetSettings: () => {
        set({ settings: defaultSettings });
        if (isSupabaseConfigured()) {
          supabase
            .from('store_settings')
            .upsert({
              key: 'store_contact',
              value: defaultSettings,
              updated_at: new Date().toISOString(),
            })
            .then(() => {});
        }
      },
    }),
    {
      name: 'ssf-settings',
    }
  )
);
