// ============================================================
// Store Settings & Payment Gateway Configuration
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
}

export const defaultSettings: StoreSettings = {
  businessPhone: '8374634989',
  businessWhatsApp: '8374634989',
  businessEmail: 'info@sudhaswagruha.com',
  businessAddress: 'Plot 18, Traditional Foods Lane, Benz Circle, Vijayawada, Andhra Pradesh - 520010',
  businessHours: '9:00 AM - 9:00 PM (All Days)',
  paymentGatewayEnabled: false, // Default disabled as requested: payment method removed, placed directly to WhatsApp
  razorpayKeyId: '',
  razorpayKeySecret: '',
  isTestMode: true,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: 'ssf-settings',
    }
  )
);
