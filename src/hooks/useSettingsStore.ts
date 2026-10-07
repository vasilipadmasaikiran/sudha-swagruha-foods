// ============================================================
// Store Settings & Payment Gateway & SMTP Configuration
// + Supabase two-way sync for live contact & business settings
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

export interface NotificationEventToggles {
  orderConfirmed: boolean;
  orderDispatched: boolean;
  trackingUpdated: boolean;
  productRemoved: boolean;
  partialRefundInitiated: boolean;
  fullOrderCancelled: boolean;
  fullRefundInitiated: boolean;
  refundCompleted: boolean;
  refundFailed: boolean;
}

export const defaultNotificationEvents: NotificationEventToggles = {
  orderConfirmed: true,
  orderDispatched: true,
  trackingUpdated: true,
  productRemoved: true,
  partialRefundInitiated: true,
  fullOrderCancelled: true,
  fullRefundInitiated: true,
  refundCompleted: true,
  refundFailed: false,
};

export interface SmsSettings {
  enabled: boolean;
  provider: 'fast2sms' | 'twilio' | 'msg91' | 'webhook';
  apiUrl?: string;
  apiKey: string;
  apiSecret?: string;
  senderId: string;
  accountSid?: string;
  testMobileNumber?: string;
  events: NotificationEventToggles;
}

export interface SmtpSettings {
  enabled: boolean;
  provider: 'smtp' | 'resend' | 'gmail' | 'webhook';
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string; // App Password or API Key
  senderName: string;
  senderEmail: string;
  adminNotificationEmail: string;
  notifyAdminOnNewOrder: boolean;
  resendApiKey?: string;
  webhookUrl?: string;
  events?: NotificationEventToggles;
}

export interface StoreSettings {
  // Business Branding & Identity (Requirement 14 & 15)
  businessName: string;
  websiteTitle: string;
  tagline: string;
  logoUrl: string;
  footerText: string;

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

  // SMTP & Email Notification Settings
  smtp: SmtpSettings;

  // SMS Notification Settings (Requirements 20-25)
  sms: SmsSettings;

  // Business GST & Tax Configuration (Issues #2, #5, #8)
  tax: TaxSettings;
}

export interface TaxSettings {
  gstEnabled: boolean;
  gstRate: number; // percentage e.g. 18.00, 12.00, 5.00
  hsnCode?: string;
  gstNumber?: string;
}

export const defaultTaxSettings: TaxSettings = {
  gstEnabled: true,
  gstRate: 18,
  hsnCode: '21069099',
  gstNumber: '37AAAAA0000A1Z5',
};

interface SettingsStore {
  settings: StoreSettings;
  updateSettings: (updates: Partial<StoreSettings>) => void;
  updateSmtpSettings: (updates: Partial<SmtpSettings>) => void;
  updateSmsSettings: (updates: Partial<SmsSettings>) => void;
  updateTaxSettings: (updates: Partial<TaxSettings>) => void;
  resetSettings: () => void;
  fetchSettings: () => Promise<void>;
  subscribeToSettings: () => () => void;
}

export const defaultSmsSettings: SmsSettings = {
  enabled: false,
  provider: 'fast2sms',
  apiUrl: '',
  apiKey: '',
  apiSecret: '',
  senderId: 'SWAGRU',
  accountSid: '',
  testMobileNumber: '8374634989',
  events: { ...defaultNotificationEvents },
};

export const defaultSmtpSettings: SmtpSettings = {
  enabled: true,
  provider: 'resend',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  username: 'info@sudhaswagruhafoods.com',
  password: '',
  senderName: 'Sudha Swagruha Foods',
  senderEmail: 'info@sudhaswagruhafoods.com',
  adminNotificationEmail: 'vasilisaikiran@gmail.com',
  notifyAdminOnNewOrder: true,
  resendApiKey: '',
  webhookUrl: '',
  events: { ...defaultNotificationEvents },
};

export const defaultSettings: StoreSettings = {
  businessName: 'Sudha Swagruha Foods',
  websiteTitle: 'Sudha Swagruha Foods • Authentic Andhra Delicacies',
  tagline: 'Authentic Andhra Homemade Pickles, Podis & Traditional Sweets',
  logoUrl: (import.meta.env.BASE_URL || '/') + 'logo/logo.jpg',
  footerText: 'Authentic Traditional Delicacies prepared with Amma Chethi Prema.',
  businessPhone: '8374634989',
  businessWhatsApp: '8374634989',
  businessEmail: 'info@sudhaswagruhafoods.com',
  businessAddress: 'Plot 18, Traditional Foods Lane, Benz Circle, Vijayawada, Andhra Pradesh - 520010',
  businessHours: '9:00 AM - 9:00 PM (All Days)',
  paymentGatewayEnabled: false,
  razorpayKeyId: '',
  razorpayKeySecret: '',
  isTestMode: true,
  smtp: defaultSmtpSettings,
  sms: defaultSmsSettings,
  tax: defaultTaxSettings,
};

const syncDocTitle = (settings: StoreSettings) => {
  if (typeof document !== 'undefined') {
    document.title = settings.websiteTitle || settings.businessName || 'Sudha Swagruha Foods';
  }
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
            const remoteVal = data.value as Partial<StoreSettings>;
            set((state) => {
              const merged: StoreSettings = {
                ...state.settings,
                ...remoteVal,
                businessName: remoteVal.businessName || state.settings.businessName || defaultSettings.businessName,
                websiteTitle: remoteVal.websiteTitle || state.settings.websiteTitle || defaultSettings.websiteTitle,
                tagline: remoteVal.tagline || state.settings.tagline || defaultSettings.tagline,
                logoUrl: remoteVal.logoUrl || state.settings.logoUrl || defaultSettings.logoUrl,
                footerText: remoteVal.footerText || state.settings.footerText || defaultSettings.footerText,
                tax: {
                  ...defaultTaxSettings,
                  ...(state.settings.tax || {}),
                  ...(remoteVal.tax || {}),
                },
                smtp: {
                  ...defaultSmtpSettings,
                  ...(state.settings.smtp || {}),
                  ...(remoteVal.smtp || {}),
                },
                sms: {
                  ...defaultSmsSettings,
                  ...(state.settings.sms || {}),
                  ...(remoteVal.sms || {}),
                  events: {
                    ...defaultNotificationEvents,
                    ...(state.settings.sms?.events || {}),
                    ...(remoteVal.sms?.events || {}),
                  },
                },
              };
              syncDocTitle(merged);
              return { settings: merged };
            });
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
                  const remoteVal = newRow.value as Partial<StoreSettings>;
                  set((state) => {
                    const merged: StoreSettings = {
                      ...state.settings,
                      ...remoteVal,
                      businessName: remoteVal.businessName || state.settings.businessName || defaultSettings.businessName,
                      websiteTitle: remoteVal.websiteTitle || state.settings.websiteTitle || defaultSettings.websiteTitle,
                      tagline: remoteVal.tagline || state.settings.tagline || defaultSettings.tagline,
                      logoUrl: remoteVal.logoUrl || state.settings.logoUrl || defaultSettings.logoUrl,
                      footerText: remoteVal.footerText || state.settings.footerText || defaultSettings.footerText,
                      tax: {
                        ...defaultTaxSettings,
                        ...(state.settings.tax || {}),
                        ...(remoteVal.tax || {}),
                      },
                      smtp: {
                        ...defaultSmtpSettings,
                        ...(state.settings.smtp || {}),
                        ...(remoteVal.smtp || {}),
                      },
                      sms: {
                        ...defaultSmsSettings,
                        ...(state.settings.sms || {}),
                        ...(remoteVal.sms || {}),
                        events: {
                          ...defaultNotificationEvents,
                          ...(state.settings.sms?.events || {}),
                          ...(remoteVal.sms?.events || {}),
                        },
                      },
                    };
                    syncDocTitle(merged);
                    return { settings: merged };
                  });
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
        const next: StoreSettings = { ...get().settings, ...updates };
        set({ settings: next });
        syncDocTitle(next);

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

      // ─── Update Tax / GST Settings Specifically (Issues #2, #5, #8) ───
      updateTaxSettings: (taxUpdates) => {
        const current = get().settings;
        const nextTax: TaxSettings = { ...(current.tax || defaultTaxSettings), ...taxUpdates };
        const nextSettings: StoreSettings = { ...current, tax: nextTax };
        set({ settings: nextSettings });

        if (isSupabaseConfigured()) {
          supabase
            .from('store_settings')
            .upsert({
              key: 'store_contact',
              value: nextSettings,
              updated_at: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error) console.warn('Supabase Tax settings update notice:', error.message);
              else console.log('Synced GST Tax settings to Supabase cloud DB');
            });
        }
      },

      // ─── Update SMTP Settings Specifically ────────────────────────
      updateSmtpSettings: (smtpUpdates) => {
        const current = get().settings;
        const nextSmtp: SmtpSettings = { ...(current.smtp || defaultSmtpSettings), ...smtpUpdates };
        const nextSettings: StoreSettings = { ...current, smtp: nextSmtp };
        set({ settings: nextSettings });

        if (isSupabaseConfigured()) {
          supabase
            .from('store_settings')
            .upsert({
              key: 'store_contact',
              value: nextSettings,
              updated_at: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error) console.warn('Supabase SMTP settings update notice:', error.message);
              else console.log('Synced SMTP settings to Supabase cloud DB');
            });
        }
      },

      // ─── Update SMS Settings Specifically (Requirements 20-25) ─────
      updateSmsSettings: (smsUpdates) => {
        const current = get().settings;
        const nextSms: SmsSettings = {
          ...(current.sms || defaultSmsSettings),
          ...smsUpdates,
          events: {
            ...(current.sms?.events || defaultNotificationEvents),
            ...(smsUpdates.events || {}),
          },
        };
        const nextSettings: StoreSettings = { ...current, sms: nextSms };
        set({ settings: nextSettings });

        if (isSupabaseConfigured()) {
          supabase
            .from('store_settings')
            .upsert({
              key: 'store_contact',
              value: nextSettings,
              updated_at: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error) console.warn('Supabase SMS settings update notice:', error.message);
              else console.log('Synced SMS settings to Supabase cloud DB');
            });
        }
      },

      resetSettings: () => {
        set({ settings: defaultSettings });
        syncDocTitle(defaultSettings);
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
