// ============================================================
// Enterprise Promotions & Customer Communication Store
// Manages Campaigns, Templates, Audiences, Batch Queue & History
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PromotionalCampaign,
  PromotionTemplate,
  CampaignRecipientLog,
  AudienceType,
  PromotionType,
} from '@/services/promotionTypes';
import { AudienceService } from '@/services/audienceService';
import { EmailService } from '@/services/emailService';
import { SmsService } from '@/services/smsService';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { useOrderStore } from '@/hooks/useOrderStore';
import { useProductStore } from '@/hooks/useProductStore';
import { logAdminAction } from '@/services/auditLogger';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

// Standard pre-seeded marketing templates
const DEFAULT_TEMPLATES: PromotionTemplate[] = [
  {
    id: 'tmpl_diwali_mega',
    name: 'Festival Mega Sale (Email + SMS)',
    category: 'festival_sale',
    channel: 'both',
    email_subject: '🎉 Festival Mega Offer! Get 25% OFF on Traditional Sweets & Delicacies',
    email_message:
      'Celebrate this festive season with freshly prepared Andhra sweets, hot savories, and traditional pickles crafted with authentic homestyle love.\n\nUse your exclusive promo voucher at checkout for an instant discount on your order!',
    sms_message:
      'Namaskaram {{customerName}}! Celebrate with {{businessName}} sweets & savories. Get 25% OFF using code {{voucherCode}}. Order now: {{shopUrl}}',
    default_cta_text: 'Claim Festive Discount',
    default_cta_link: 'https://vasilipadmasaikiran.github.io/sudha-swagruha-foods',
    created_by: 'System',
    created_at: new Date().toISOString(),
  },
  {
    id: 'tmpl_flash_sale',
    name: 'Weekend Flash Sale (SMS & Email)',
    category: 'flash_sale',
    channel: 'both',
    email_subject: '⚡ 48-Hour Weekend Flash Sale — Limited Stock Delicacies!',
    email_message:
      'Our kitchen has just rolled out limited-edition batches of premium Bellam Pootharekulu, Bandar Laddu, and spicy Gongura pickles. Enjoy lightning-fast delivery and extra savings this weekend only.',
    sms_message:
      '⚡ 48-Hour Flash Sale at {{businessName}}! Enjoy special savings on authentic sweets. Use code {{voucherCode}}. Limited stock: {{shopUrl}}',
    default_cta_text: 'Shop Flash Sale',
    default_cta_link: 'https://vasilipadmasaikiran.github.io/sudha-swagruha-foods',
    created_by: 'System',
    created_at: new Date().toISOString(),
  },
  {
    id: 'tmpl_new_arrival',
    name: 'New Delicacy Announcement',
    category: 'new_arrival',
    channel: 'email',
    email_subject: '🌿 Just Arrived in our Kitchen — Fresh Sweets & Savories!',
    email_message:
      'We are thrilled to introduce new authentic regional recipes to our catalog! Crafted by traditional masters with 100% pure ghee and farm-fresh ingredients.',
    sms_message:
      'New culinary arrivals at {{businessName}}! Try our freshly crafted regional delicacies. Explore here: {{shopUrl}}',
    default_cta_text: 'Explore New Arrivals',
    default_cta_link: 'https://vasilipadmasaikiran.github.io/sudha-swagruha-foods',
    created_by: 'System',
    created_at: new Date().toISOString(),
  },
  {
    id: 'tmpl_vip_offer',
    name: 'VIP Patron Appreciation Offer',
    category: 'special_announcement',
    channel: 'both',
    email_subject: '👑 Exclusive VIP Privilege — A Special Treat For Our Valued Patron',
    email_message:
      'Thank you for being one of our most cherished patrons. As a token of our heartfelt appreciation, enjoy VIP discounts and priority dispatched packaging on your next order.',
    sms_message:
      'Namaskaram {{customerName}}! As a cherished patron of {{businessName}}, enjoy an exclusive treat with voucher {{voucherCode}}. Shop: {{shopUrl}}',
    default_cta_text: 'Redeem VIP Privilege',
    default_cta_link: 'https://vasilipadmasaikiran.github.io/sudha-swagruha-foods',
    created_by: 'System',
    created_at: new Date().toISOString(),
  },
];

// Sample initial promotional campaigns
const INITIAL_CAMPAIGNS: PromotionalCampaign[] = [
  {
    id: 'promo_diwali_2026',
    name: 'Deepavali Grand Delicacy Festival',
    type: 'festival_sale',
    title: 'Celebrate Deepavali with Pure Ghee Sweets & Savories',
    description: 'Promotional outreach offering 20% discount on order values above ₹800.',
    banner_url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&auto=format&fit=crop&q=80',
    voucher_code: 'FESTIVE20',
    discount_percent: 20,
    min_order_amount: 800,
    status: 'draft',
    audience_type: 'all',
    channels: ['email', 'sms'],
    email_subject: '🎉 Deepavali Sweets Festival — 20% OFF on Traditional Delights!',
    email_title: 'Celebrate with Authentic Andhra Sweets',
    email_message:
      'Deepavali celebrations are incomplete without authentic sweets! Enjoy 20% OFF on Pootharekulu, Kaju Katli, Bobbatlu and spicy pickles.',
    email_cta_text: 'Shop Festive Delights',
    email_cta_link: 'https://vasilipadmasaikiran.github.io/sudha-swagruha-foods',
    sms_message:
      'Namaskaram {{customerName}}! Deepavali special: Get 20% OFF at {{businessName}} with code {{voucherCode}}. Order now: {{shopUrl}}',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    created_by: 'Root Admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    total_recipients: 0,
    email_queued: 0,
    email_sent: 0,
    email_failed: 0,
    sms_queued: 0,
    sms_sent: 0,
    sms_failed: 0,
  },
];

interface PromotionStore {
  campaigns: PromotionalCampaign[];
  templates: PromotionTemplate[];
  recipientLogs: CampaignRecipientLog[];
  customerPreferences: Record<string, { optOutEmail?: boolean; optOutSms?: boolean }>;
  isProcessing: boolean;
  activeFilter: string;

  // Campaign Management Actions
  createCampaign: (campaign: Omit<PromotionalCampaign, 'id' | 'created_at' | 'updated_at' | 'total_recipients' | 'email_queued' | 'email_sent' | 'email_failed' | 'sms_queued' | 'sms_sent' | 'sms_failed'>) => Promise<PromotionalCampaign>;
  updateCampaign: (id: string, updates: Partial<PromotionalCampaign>) => Promise<PromotionalCampaign | null>;
  deleteCampaign: (id: string) => Promise<boolean>;
  duplicateCampaign: (id: string, newName?: string) => Promise<PromotionalCampaign | null>;
  scheduleCampaign: (id: string, scheduledAt: string) => Promise<boolean>;
  cancelScheduledCampaign: (id: string, cancelledBy?: string) => Promise<boolean>;

  // Dispatch & Test Actions
  sendCampaignNow: (campaignId: string, initiatedBy?: string) => Promise<{ success: boolean; message: string; results?: { emailSent: number; emailFailed: number; smsSent: number; smsFailed: number } }>;
  sendTestEmail: (campaignId: string, testEmail: string) => Promise<{ success: boolean; message: string }>;
  sendTestSms: (campaignId: string, testMobile: string) => Promise<{ success: boolean; message: string }>;

  // Template Actions
  createTemplate: (template: Omit<PromotionTemplate, 'id' | 'created_at'>) => PromotionTemplate;
  updateTemplate: (id: string, updates: Partial<PromotionTemplate>) => void;
  deleteTemplate: (id: string) => void;

  // Preferences Actions
  setCustomerPreference: (customerKey: string, channel: 'email' | 'sms', optedOut: boolean) => void;
  setFilter: (filter: string) => void;
}

export const usePromotionStore = create<PromotionStore>()(
  persist(
    (set, get) => ({
      campaigns: INITIAL_CAMPAIGNS,
      templates: DEFAULT_TEMPLATES,
      recipientLogs: [],
      customerPreferences: {},
      isProcessing: false,
      activeFilter: 'all',

      setFilter: (filter) => set({ activeFilter: filter }),

      // ─── Create Campaign ──────────────────────────────────────────
      createCampaign: async (params) => {
        const id = `promo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const now = new Date().toISOString();

        const newCampaign: PromotionalCampaign = {
          ...params,
          id,
          created_at: now,
          updated_at: now,
          total_recipients: 0,
          email_queued: 0,
          email_sent: 0,
          email_failed: 0,
          sms_queued: 0,
          sms_sent: 0,
          sms_failed: 0,
        };

        set((state) => ({
          campaigns: [newCampaign, ...state.campaigns],
        }));

        await logAdminAction(
          params.created_by,
          'ROOT_ADMIN',
          'CREATE_PROMOTION',
          'CAMPAIGN',
          newCampaign.name,
          { id, type: newCampaign.type, channels: newCampaign.channels }
        );

        return newCampaign;
      },

      // ─── Update Campaign ──────────────────────────────────────────
      updateCampaign: async (id, updates) => {
        let updatedItem: PromotionalCampaign | null = null;

        set((state) => ({
          campaigns: state.campaigns.map((c) => {
            if (c.id === id) {
              updatedItem = { ...c, ...updates, updated_at: new Date().toISOString() };
              return updatedItem;
            }
            return c;
          }),
        }));

        return updatedItem;
      },

      // ─── Delete Campaign ──────────────────────────────────────────
      deleteCampaign: async (id) => {
        const target = get().campaigns.find((c) => c.id === id);
        if (!target) return false;

        set((state) => ({
          campaigns: state.campaigns.filter((c) => c.id !== id),
          recipientLogs: state.recipientLogs.filter((r) => r.campaign_id !== id),
        }));

        return true;
      },

      // ─── Duplicate Campaign ───────────────────────────────────────
      duplicateCampaign: async (id, newName) => {
        const target = get().campaigns.find((c) => c.id === id);
        if (!target) return null;

        const newId = `promo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const now = new Date().toISOString();

        const duplicated: PromotionalCampaign = {
          ...target,
          id: newId,
          name: newName || `Copy of ${target.name}`,
          status: 'draft',
          scheduled_at: undefined,
          sent_at: undefined,
          completed_at: undefined,
          created_at: now,
          updated_at: now,
          total_recipients: 0,
          email_queued: 0,
          email_sent: 0,
          email_failed: 0,
          sms_queued: 0,
          sms_sent: 0,
          sms_failed: 0,
        };

        set((state) => ({
          campaigns: [duplicated, ...state.campaigns],
        }));

        return duplicated;
      },

      // ─── Schedule Campaign ────────────────────────────────────────
      scheduleCampaign: async (id, scheduledAt) => {
        const target = get().campaigns.find((c) => c.id === id);
        if (!target) return false;

        set((state) => ({
          campaigns: state.campaigns.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: 'scheduled',
                  scheduled_at: scheduledAt,
                  updated_at: new Date().toISOString(),
                }
              : c
          ),
        }));

        await logAdminAction(
          target.created_by,
          'ROOT_ADMIN',
          'SCHEDULE_PROMOTION',
          'CAMPAIGN',
          target.name,
          { scheduledAt }
        );

        return true;
      },

      // ─── Cancel Scheduled Campaign ────────────────────────────────
      cancelScheduledCampaign: async (id, cancelledBy = 'Admin') => {
        const target = get().campaigns.find((c) => c.id === id);
        if (!target) return false;

        set((state) => ({
          campaigns: state.campaigns.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: 'cancelled',
                  updated_at: new Date().toISOString(),
                }
              : c
          ),
        }));

        await logAdminAction(
          cancelledBy,
          'ROOT_ADMIN',
          'CANCEL_PROMOTION',
          'CAMPAIGN',
          target.name,
          { previousStatus: target.status }
        );

        return true;
      },

      // ─── Dispatch Campaign Now (Batch Queue Worker) ───────────────
      sendCampaignNow: async (campaignId, initiatedBy = 'Root Admin') => {
        const campaign = get().campaigns.find((c) => c.id === campaignId);
        if (!campaign) {
          return { success: false, message: 'Campaign not found' };
        }

        const settings = useSettingsStore.getState().settings;
        const orders = useOrderStore.getState().orders;
        const preferences = get().customerPreferences;

        // 1. Resolve audience and deliverable recipients
        const allCustomers = AudienceService.aggregateCustomersFromOrders(orders, preferences);
        const filteredAudience = AudienceService.filterAudience(
          allCustomers,
          campaign.audience_type,
          campaign.selected_customer_keys,
          campaign.audience_filter
        );

        const {
          emailRecipients,
          smsRecipients,
          totalEligibleCount,
        } = AudienceService.resolveDeliverableRecipients(
          filteredAudience,
          campaign.channels,
          Boolean(settings.sms?.enabled)
        );

        if (emailRecipients.length === 0 && smsRecipients.length === 0) {
          return {
            success: false,
            message:
              'No eligible recipients found matching the audience criteria and enabled communication channels.',
          };
        }

        // Set status to PROCESSING
        set((state) => ({
          isProcessing: true,
          campaigns: state.campaigns.map((c) =>
            c.id === campaignId
              ? {
                  ...c,
                  status: 'processing',
                  sent_at: new Date().toISOString(),
                  total_recipients: totalEligibleCount,
                  email_queued: emailRecipients.length,
                  sms_queued: smsRecipients.length,
                }
              : c
          ),
        }));

        let emailSent = 0;
        let emailFailed = 0;
        let smsSent = 0;
        let smsFailed = 0;

        const newLogs: CampaignRecipientLog[] = [];
        const businessName = settings.businessName || 'Sudha Swagruha Foods';

        // ─── 2. Batch Dispatch Email (Chunks of 5 with non-blocking intervals) ───
        const BATCH_SIZE = 5;
        for (let i = 0; i < emailRecipients.length; i += BATCH_SIZE) {
          const batch = emailRecipients.slice(i, i + BATCH_SIZE);

          await Promise.all(
            batch.map(async (cust) => {
              if (!cust.email) return;

              // Idempotency check: don't double send if log exists for this campaign & recipient
              const alreadySent = get().recipientLogs.some(
                (l) => l.campaign_id === campaignId && l.recipient === cust.email && l.status === 'sent'
              );
              if (alreadySent) return;

              try {
                const res = await EmailService.sendPromotionalEmail({
                  to: cust.email,
                  customerName: cust.name,
                  subject: campaign.email_subject || `${campaign.title} - ${businessName}`,
                  campaignTitle: campaign.title,
                  campaignMessage: campaign.email_message || campaign.description,
                  bannerUrl: campaign.banner_url,
                  voucherCode: campaign.voucher_code,
                  discountText: campaign.discount_percent ? `${campaign.discount_percent}% OFF` : undefined,
                  ctaText: campaign.email_cta_text,
                  ctaLink: campaign.email_cta_link,
                  validUntil: campaign.end_date,
                  settings,
                });

                if (res.success) {
                  emailSent++;
                  newLogs.push({
                    id: `log_em_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    campaign_id: campaignId,
                    campaign_name: campaign.name,
                    customer_key: cust.key,
                    customer_name: cust.name,
                    channel: 'email',
                    recipient: cust.email,
                    status: 'sent',
                    provider: 'smtp-resend',
                    sent_at: new Date().toISOString(),
                    attempt_count: 1,
                  });
                } else {
                  emailFailed++;
                  newLogs.push({
                    id: `log_em_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    campaign_id: campaignId,
                    campaign_name: campaign.name,
                    customer_key: cust.key,
                    customer_name: cust.name,
                    channel: 'email',
                    recipient: cust.email,
                    status: 'failed',
                    failure_reason: res.message,
                    sent_at: new Date().toISOString(),
                    attempt_count: 1,
                  });
                }
              } catch (err: any) {
                emailFailed++;
                newLogs.push({
                  id: `log_em_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  campaign_id: campaignId,
                  campaign_name: campaign.name,
                  customer_key: cust.key,
                  customer_name: cust.name,
                  channel: 'email',
                  recipient: cust.email,
                  status: 'failed',
                  failure_reason: err?.message || 'Email dispatch failed',
                  sent_at: new Date().toISOString(),
                  attempt_count: 1,
                });
              }
            })
          );
        }

        // ─── 3. Batch Dispatch SMS (Chunks of 5) ──────────────────────
        if (campaign.channels.includes('sms') && settings.sms?.enabled) {
          for (let i = 0; i < smsRecipients.length; i += BATCH_SIZE) {
            const batch = smsRecipients.slice(i, i + BATCH_SIZE);

            await Promise.all(
              batch.map(async (cust) => {
                if (!cust.phone) return;

                const alreadySent = get().recipientLogs.some(
                  (l) => l.campaign_id === campaignId && l.recipient === cust.phone && l.status === 'sent'
                );
                if (alreadySent) return;

                try {
                  const smsTemplate =
                    campaign.sms_message ||
                    `Namaskaram {{customerName}}! ${campaign.title}. Use voucher {{voucherCode}} at {{businessName}}. Shop: {{shopUrl}}`;

                  const res = await SmsService.sendPromotionalSms({
                    mobileNumber: cust.phone,
                    customerName: cust.name,
                    message: smsTemplate,
                    settings,
                    campaignId: campaign.id,
                    campaignName: campaign.name,
                    customerKey: cust.key,
                  });

                  if (res.success) {
                    smsSent++;
                    newLogs.push({
                      id: `log_sms_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                      campaign_id: campaignId,
                      campaign_name: campaign.name,
                      customer_key: cust.key,
                      customer_name: cust.name,
                      channel: 'sms',
                      recipient: cust.phone,
                      status: 'sent',
                      provider: res.provider,
                      provider_message_id: res.providerMessageId,
                      sent_at: new Date().toISOString(),
                      attempt_count: 1,
                    });
                  } else {
                    smsFailed++;
                    newLogs.push({
                      id: `log_sms_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                      campaign_id: campaignId,
                      campaign_name: campaign.name,
                      customer_key: cust.key,
                      customer_name: cust.name,
                      channel: 'sms',
                      recipient: cust.phone,
                      status: 'failed',
                      provider: res.provider,
                      failure_reason: res.message,
                      sent_at: new Date().toISOString(),
                      attempt_count: 1,
                    });
                  }
                } catch (err: any) {
                  smsFailed++;
                  newLogs.push({
                    id: `log_sms_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    campaign_id: campaignId,
                    campaign_name: campaign.name,
                    customer_key: cust.key,
                    customer_name: cust.name,
                    channel: 'sms',
                    recipient: cust.phone,
                    status: 'failed',
                    failure_reason: err?.message || 'SMS dispatch failed',
                    sent_at: new Date().toISOString(),
                    attempt_count: 1,
                  });
                }
              })
            );
          }
        }

        // ─── 4. Mark Campaign Finished (SENT / FAILED) ────────────────
        const overallSuccess = (emailSent > 0 || smsSent > 0) || (emailFailed === 0 && smsFailed === 0);
        const finalStatus = overallSuccess ? 'sent' : 'failed';
        const completedAt = new Date().toISOString();

        set((state) => ({
          isProcessing: false,
          campaigns: state.campaigns.map((c) =>
            c.id === campaignId
              ? {
                  ...c,
                  status: finalStatus,
                  completed_at: completedAt,
                  email_sent: emailSent,
                  email_failed: emailFailed,
                  sms_sent: smsSent,
                  sms_failed: smsFailed,
                  updated_at: completedAt,
                }
              : c
          ),
          recipientLogs: [...newLogs, ...state.recipientLogs],
        }));

        await logAdminAction(
          initiatedBy,
          'ROOT_ADMIN',
          'SEND_PROMOTION',
          'CAMPAIGN',
          campaign.name,
          {
            emailSent,
            emailFailed,
            smsSent,
            smsFailed,
            totalAudience: totalEligibleCount,
            finalStatus,
          }
        );

        return {
          success: overallSuccess,
          message: `Campaign "${campaign.name}" dispatched! Emails: ${emailSent} sent (${emailFailed} failed) | SMS: ${smsSent} sent (${smsFailed} failed).`,
          results: { emailSent, emailFailed, smsSent, smsFailed },
        };
      },

      // ─── Send Test Email ──────────────────────────────────────────
      sendTestEmail: async (campaignId, testEmail) => {
        const campaign = get().campaigns.find((c) => c.id === campaignId);
        if (!campaign) return { success: false, message: 'Campaign not found' };

        const settings = useSettingsStore.getState().settings;
        const businessName = settings.businessName || 'Sudha Swagruha Foods';

        const res = await EmailService.sendPromotionalEmail({
          to: testEmail,
          customerName: 'Test Recipient',
          subject: `[TEST] ${campaign.email_subject || campaign.title} - ${businessName}`,
          campaignTitle: campaign.title,
          campaignMessage: campaign.email_message || campaign.description,
          bannerUrl: campaign.banner_url,
          voucherCode: campaign.voucher_code,
          discountText: campaign.discount_percent ? `${campaign.discount_percent}% OFF` : undefined,
          ctaText: campaign.email_cta_text,
          ctaLink: campaign.email_cta_link,
          validUntil: campaign.end_date,
          settings,
        });

        return res;
      },

      // ─── Send Test SMS ────────────────────────────────────────────
      sendTestSms: async (campaignId, testMobile) => {
        const campaign = get().campaigns.find((c) => c.id === campaignId);
        if (!campaign) return { success: false, message: 'Campaign not found' };

        const settings = useSettingsStore.getState().settings;
        const smsTemplate =
          campaign.sms_message ||
          `Namaskaram {{customerName}}! ${campaign.title}. Use code {{voucherCode}} at {{businessName}}. Shop: {{shopUrl}}`;

        const res = await SmsService.sendPromotionalSms({
          mobileNumber: testMobile,
          customerName: 'Test Patron',
          message: `[TEST] ${smsTemplate}`,
          settings,
          campaignId: campaign.id,
          campaignName: campaign.name,
        });

        return {
          success: res.success,
          message: res.success ? `Test SMS sent via ${res.provider.toUpperCase()}!` : res.message,
        };
      },

      // ─── Template Management ──────────────────────────────────────
      createTemplate: (params) => {
        const id = `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const newTmpl: PromotionTemplate = {
          ...params,
          id,
          created_at: new Date().toISOString(),
        };
        set((state) => ({ templates: [newTmpl, ...state.templates] }));
        return newTmpl;
      },

      updateTemplate: (id, updates) => {
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
      },

      deleteTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        }));
      },

      // ─── Communication Preferences ────────────────────────────────
      setCustomerPreference: (customerKey, channel, optedOut) => {
        set((state) => {
          const prev = state.customerPreferences[customerKey] || {};
          return {
            customerPreferences: {
              ...state.customerPreferences,
              [customerKey]: {
                ...prev,
                [channel === 'email' ? 'optOutEmail' : 'optOutSms']: optedOut,
              },
            },
          };
        });
      },
    }),
    {
      name: 'swagruha_promotions_store',
      partialize: (state) => ({
        campaigns: state.campaigns,
        templates: state.templates,
        recipientLogs: state.recipientLogs.slice(0, 500), // Keep recent 500 logs locally
        customerPreferences: state.customerPreferences,
      }),
    }
  )
);
