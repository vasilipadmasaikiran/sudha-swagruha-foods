// ============================================================
// Store Settings & Payment Gateway & SMTP Configuration
// + Supabase two-way sync for live contact & business settings
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { logAdminAction } from '@/services/auditLogger';
import { type ShippingSettings, defaultShippingSettings } from '@/services/shippingService';
import {
  type WebsiteAppearanceSettings,
  defaultAppearanceSettings,
  type CustomerAuthSettings,
  defaultCustomerAuthSettings,
  type WebsiteContentSettings,
  defaultWebsiteContentSettings,
} from '@/services/websiteSettingsTypes';

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

  // Physical Business Coordinates (Issues #4 & #22)
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;

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

  // Central Authoritative Shipping & Delivery Settings
  shipping: ShippingSettings;

  // Website Appearance & Live Theme Settings
  appearance: WebsiteAppearanceSettings;

  // Customer Authentication Settings (OTP, Google, Guest)
  customerAuth: CustomerAuthSettings;

  // Website Content Management Settings (Hero, policies, text)
  content: WebsiteContentSettings;
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
  updateShippingSettings: (updates: Partial<ShippingSettings>) => void;
  updateAppearanceSettings: (updates: Partial<WebsiteAppearanceSettings>) => void;
  updateCustomerAuthSettings: (updates: Partial<CustomerAuthSettings>) => void;
  updateContentSettings: (updates: Partial<WebsiteContentSettings>) => void;
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
  addressLine1: 'Plot 18, Traditional Foods Lane',
  addressLine2: 'Benz Circle',
  city: 'Vijayawada',
  state: 'Andhra Pradesh',
  postalCode: '520010',
  country: 'India',
  businessHours: '9:00 AM - 9:00 PM (All Days)',
  paymentGatewayEnabled: false,
  razorpayKeyId: '',
  razorpayKeySecret: '',
  isTestMode: true,
  smtp: defaultSmtpSettings,
  sms: defaultSmsSettings,
  tax: defaultTaxSettings,
  shipping: defaultShippingSettings,
  appearance: defaultAppearanceSettings,
  customerAuth: defaultCustomerAuthSettings,
  content: defaultWebsiteContentSettings,
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
                shipping: {
                  ...defaultShippingSettings,
                  ...(state.settings.shipping || {}),
                  ...(remoteVal.shipping || {}),
                },
                appearance: {
                  ...defaultAppearanceSettings,
                  ...(state.settings.appearance || {}),
                  ...(remoteVal.appearance || {}),
                },
                customerAuth: {
                  ...defaultCustomerAuthSettings,
                  ...(state.settings.customerAuth || {}),
                  ...(remoteVal.customerAuth || {}),
                },
                content: {
                  ...defaultWebsiteContentSettings,
                  ...(state.settings.content || {}),
                  ...(remoteVal.content || {}),
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
                      shipping: {
                        ...defaultShippingSettings,
                        ...(state.settings.shipping || {}),
                        ...(remoteVal.shipping || {}),
                      },
                      appearance: {
                        ...defaultAppearanceSettings,
                        ...(state.settings.appearance || {}),
                        ...(remoteVal.appearance || {}),
                      },
                      customerAuth: {
                        ...defaultCustomerAuthSettings,
                        ...(state.settings.customerAuth || {}),
                        ...(remoteVal.customerAuth || {}),
                      },
                      content: {
                        ...defaultWebsiteContentSettings,
                        ...(state.settings.content || {}),
                        ...(remoteVal.content || {}),
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
        const prev = get().settings;
        const next: StoreSettings = { ...prev, ...updates };
        set({ settings: next });
        syncDocTitle(next);

        // Audit Logging: BUSINESS_ADDRESS_UPDATED if address changed
        if (
          updates.businessAddress !== undefined &&
          updates.businessAddress !== prev.businessAddress
        ) {
          logAdminAction('Admin', 'ROOT_ADMIN', 'BUSINESS_ADDRESS_UPDATED', 'SETTINGS', 'business_address', {
            previousValue: prev.businessAddress,
            newValue: next.businessAddress,
            addressLine1: next.addressLine1,
            city: next.city,
            state: next.state,
            postalCode: next.postalCode,
          }).catch((e) => console.warn('Audit log notice:', e));
        }

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

      // ─── Update Tax / GST Settings Specifically (Issues #3 & #17-20) ───
      updateTaxSettings: (taxUpdates) => {
        const current = get().settings;
        const prevTax = current.tax || defaultTaxSettings;
        const nextTax: TaxSettings = { ...prevTax, ...taxUpdates };
        const nextSettings: StoreSettings = { ...current, tax: nextTax };
        set({ settings: nextSettings });

        // Audit Logging: GST_CONFIGURATION_UPDATED
        logAdminAction('Admin', 'ROOT_ADMIN', 'GST_CONFIGURATION_UPDATED', 'SETTINGS', 'tax_gst', {
          previousGstEnabled: prevTax.gstEnabled,
          newGstEnabled: nextTax.gstEnabled,
          previousGstRate: prevTax.gstRate,
          newGstRate: nextTax.gstRate,
          gstNumber: nextTax.gstNumber,
          hsnCode: nextTax.hsnCode,
        }).catch((e) => console.warn('Audit log notice:', e));

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

      // ─── Update Central Shipping Settings ──────────────────────────
      updateShippingSettings: (shippingUpdates) => {
        const current = get().settings;
        const nextShipping: ShippingSettings = {
          ...(current.shipping || defaultShippingSettings),
          ...shippingUpdates,
        };
        const nextSettings: StoreSettings = { ...current, shipping: nextShipping };
        set({ settings: nextSettings });

        logAdminAction('Admin', 'ROOT_ADMIN', 'SHIPPING_CONFIGURATION_UPDATED', 'SETTINGS', 'shipping_delivery', {
          enabled: nextShipping.enabled,
          defaultCharge: nextShipping.defaultCharge,
          freeShippingThreshold: nextShipping.freeShippingThreshold,
          localDeliveryCharge: nextShipping.localDeliveryCharge,
        }).catch((e) => console.warn('Audit log notice:', e));

        if (isSupabaseConfigured()) {
          supabase
            .from('store_settings')
            .upsert({
              key: 'store_contact',
              value: nextSettings,
              updated_at: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error) console.warn('Supabase Shipping settings update notice:', error.message);
              else console.log('Synced Shipping settings to Supabase cloud DB');
            });
        }
      },

      // ─── Update Website Appearance / Theme ────────────────────────
      updateAppearanceSettings: (appearanceUpdates) => {
        const current = get().settings;
        const nextAppearance: WebsiteAppearanceSettings = {
          ...(current.appearance || defaultAppearanceSettings),
          ...appearanceUpdates,
        };
        const nextSettings: StoreSettings = { ...current, appearance: nextAppearance };
        set({ settings: nextSettings });

        logAdminAction('Admin', 'ROOT_ADMIN', 'APPEARANCE_UPDATED', 'SETTINGS', 'website_appearance', {
          publishedVersion: nextAppearance.publishedVersion,
          isDraft: nextAppearance.isDraft,
        }).catch((e) => console.warn('Audit log notice:', e));

        if (isSupabaseConfigured()) {
          supabase
            .from('store_settings')
            .upsert({
              key: 'store_contact',
              value: nextSettings,
              updated_at: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error) console.warn('Supabase Appearance settings update notice:', error.message);
              else console.log('Synced Appearance settings to Supabase cloud DB');
            });
        }
      },

      // ─── Update Customer Auth Settings ────────────────────────────
      updateCustomerAuthSettings: (authUpdates) => {
        const current = get().settings;
        const nextAuth: CustomerAuthSettings = {
          ...(current.customerAuth || defaultCustomerAuthSettings),
          ...authUpdates,
        };
        const nextSettings: StoreSettings = { ...current, customerAuth: nextAuth };
        set({ settings: nextSettings });

        logAdminAction('Admin', 'ROOT_ADMIN', 'CUSTOMER_AUTH_SETTINGS_UPDATED', 'SETTINGS', 'customer_auth', {
          customerLoginEnabled: nextAuth.customerLoginEnabled,
          mobileOtpEnabled: nextAuth.mobileOtpEnabled,
          googleLoginEnabled: nextAuth.googleLoginEnabled,
          allowGuestCheckout: nextAuth.allowGuestCheckout,
        }).catch((e) => console.warn('Audit log notice:', e));

        if (isSupabaseConfigured()) {
          supabase
            .from('store_settings')
            .upsert({
              key: 'store_contact',
              value: nextSettings,
              updated_at: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error) console.warn('Supabase Customer Auth settings update notice:', error.message);
              else console.log('Synced Customer Auth settings to Supabase cloud DB');
            });
        }
      },

      // ─── Update Website Content Settings ──────────────────────────
      updateContentSettings: (contentUpdates) => {
        const current = get().settings;
        const nextContent: WebsiteContentSettings = {
          ...(current.content || defaultWebsiteContentSettings),
          ...contentUpdates,
        };
        const nextSettings: StoreSettings = { ...current, content: nextContent };
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
              if (error) console.warn('Supabase Content settings update notice:', error.message);
              else console.log('Synced Content settings to Supabase cloud DB');
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
