// ============================================================
// Admin Console - Promotions & Customer Communication Module
// Campaigns, Offers, Vouchers, Templates, Audiences, Dispatch & Logs
// ============================================================
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone,
  Plus,
  Send,
  Calendar,
  Clock,
  Users,
  Mail,
  MessageSquare,
  Tag,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
  Edit3,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight,
  X,
  FileText,
  Ban,
  ShieldCheck,
  Check,
  Smartphone,
  ExternalLink,
  Percent,
  TrendingUp,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { usePromotionStore } from '@/hooks/usePromotionStore';
import { useOrderStore } from '@/hooks/useOrderStore';
import { useProductStore } from '@/hooks/useProductStore';
import { useSettingsStore } from '@/hooks/useSettingsStore';
import { useAdminAuthStore } from '@/hooks/useAdminAuthStore';
import { AudienceService } from '@/services/audienceService';
import type {
  PromotionalCampaign,
  PromotionType,
  AudienceType,
  PromotionTemplate,
} from '@/services/promotionTypes';
import toast from 'react-hot-toast';

const PROMOTION_TYPES: { key: PromotionType; label: string; icon: any; color: string }[] = [
  { key: 'festival_sale', label: 'Festival Mega Sale', icon: Flame, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { key: 'offer', label: 'Discount Offer', icon: Percent, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { key: 'voucher', label: 'Promo Voucher', icon: Tag, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  { key: 'flash_sale', label: 'Flash Sale (48-Hr)', icon: Sparkles, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { key: 'product_announcement', label: 'Product Announcement', icon: Megaphone, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { key: 'new_arrival', label: 'New Delicacy Arrival', icon: Layers, color: 'text-green-400 bg-green-500/10 border-green-500/30' },
  { key: 'clearance', label: 'Clearance Sale', icon: TrendingUp, color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
  { key: 'special_announcement', label: 'VIP Special', icon: ShieldCheck, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  { key: 'custom', label: 'Custom Campaign', icon: FileText, color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
];

export default function AdminPromotionsTab() {
  const {
    campaigns,
    templates,
    recipientLogs,
    customerPreferences,
    isProcessing,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    duplicateCampaign,
    scheduleCampaign,
    cancelScheduledCampaign,
    sendCampaignNow,
    sendTestEmail,
    sendTestSms,
    setCustomerPreference,
  } = usePromotionStore();

  const { orders } = useOrderStore();
  const { coupons } = useProductStore();
  const { settings } = useSettingsStore();
  const { currentUser, hasPermission } = useAdminAuthStore();

  // Active Sub-Section
  const [subTab, setSubTab] = useState<'dashboard' | 'campaigns' | 'offers' | 'audience' | 'templates' | 'history'>('dashboard');

  // Search & Filters
  const [campaignSearch, setCampaignSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [historySearch, setHistorySearch] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [confirmSendCampaign, setConfirmSendCampaign] = useState<PromotionalCampaign | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<PromotionalCampaign | null>(null);

  // Form State for Create / Edit Campaign
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<PromotionType>('festival_sale');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formBannerUrl, setFormBannerUrl] = useState('');
  const [formVoucherCode, setFormVoucherCode] = useState('');
  const [formDiscountPercent, setFormDiscountPercent] = useState<number | ''>(20);
  const [formMinOrder, setFormMinOrder] = useState<number | ''>(500);
  const [formAudienceType, setFormAudienceType] = useState<AudienceType>('all');
  const [formSelectedCustomerKeys, setFormSelectedCustomerKeys] = useState<string[]>([]);
  const [formChannels, setFormChannels] = useState<('email' | 'sms')[]>(['email', 'sms']);
  const [formEmailSubject, setFormEmailSubject] = useState('');
  const [formEmailTitle, setFormEmailTitle] = useState('');
  const [formEmailMessage, setFormEmailMessage] = useState('');
  const [formEmailCtaText, setFormEmailCtaText] = useState('Shop Delicacies Now');
  const [formEmailCtaLink, setFormEmailCtaLink] = useState('');
  const [formSmsMessage, setFormSmsMessage] = useState('');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [formSendOption, setFormSendOption] = useState<'immediate' | 'schedule'>('immediate');
  const [formScheduleDate, setFormScheduleDate] = useState('');
  const [formScheduleTime, setFormScheduleTime] = useState('10:00');

  // Test send state
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testMobileNumber, setTestMobileNumber] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [isSendingTestSms, setIsSendingTestSms] = useState(false);

  // Customer search inside audience selector
  const [audienceSearch, setAudienceSearch] = useState('');

  // RBAC Access Control
  const isRootAdmin = currentUser?.role === 'ROOT_ADMIN';
  const canAccessPromotions = isRootAdmin || hasPermission('canViewPromotions') || currentUser?.role === 'ORDER_PROCESSOR';

  if (!canAccessPromotions) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4 max-w-lg mx-auto my-12">
        <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <Ban className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-white">403 Access Restricted</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Your current administrative role (<span className="text-white font-mono">{currentUser?.role || 'STORE_KEEPER'}</span>) does not have permission to manage promotional marketing campaigns.
        </p>
      </div>
    );
  }

  // Aggregate Customer Audience
  const allCustomers = useMemo(() => {
    return AudienceService.aggregateCustomersFromOrders(orders, customerPreferences);
  }, [orders, customerPreferences]);

  // Audience Count Preview for Active Form
  const formAudiencePreview = useMemo(() => {
    const filtered = AudienceService.filterAudience(
      allCustomers,
      formAudienceType,
      formSelectedCustomerKeys
    );
    const resolved = AudienceService.resolveDeliverableRecipients(
      filtered,
      formChannels,
      Boolean(settings.sms?.enabled)
    );
    return {
      filteredCount: filtered.length,
      ...resolved,
    };
  }, [allCustomers, formAudienceType, formSelectedCustomerKeys, formChannels, settings.sms?.enabled]);

  // Statistics for Dashboard
  const stats = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter((c) => c.status === 'sent' || c.status === 'scheduled').length;
    const scheduled = campaigns.filter((c) => c.status === 'scheduled').length;
    const sent = campaigns.filter((c) => c.status === 'sent').length;
    const draft = campaigns.filter((c) => c.status === 'draft').length;
    const failed = campaigns.filter((c) => c.status === 'failed').length;

    const emailSentTotal = campaigns.reduce((sum, c) => sum + (c.email_sent || 0), 0);
    const emailFailedTotal = campaigns.reduce((sum, c) => sum + (c.email_failed || 0), 0);
    const smsSentTotal = campaigns.reduce((sum, c) => sum + (c.sms_sent || 0), 0);
    const smsFailedTotal = campaigns.reduce((sum, c) => sum + (c.sms_failed || 0), 0);

    return {
      total,
      active,
      scheduled,
      sent,
      draft,
      failed,
      emailSentTotal,
      emailFailedTotal,
      smsSentTotal,
      smsFailedTotal,
      totalAudienceReached: emailSentTotal + smsSentTotal,
    };
  }, [campaigns]);

  // Filtered Campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const q = campaignSearch.toLowerCase().trim();
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || (c.voucher_code && c.voucher_code.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, campaignSearch, statusFilter]);

  // Filtered Recipient Logs
  const filteredLogs = useMemo(() => {
    return recipientLogs.filter((log) => {
      const q = historySearch.toLowerCase().trim();
      if (!q) return true;
      return (
        log.campaign_name.toLowerCase().includes(q) ||
        log.customer_name.toLowerCase().includes(q) ||
        log.recipient.toLowerCase().includes(q) ||
        log.status.toLowerCase().includes(q)
      );
    });
  }, [recipientLogs, historySearch]);

  // Open Create Modal & reset form
  const handleOpenCreateModal = (template?: PromotionTemplate) => {
    setEditingCampaignId(null);
    setFormName(template ? `${template.name} - ${new Date().toLocaleDateString()}` : '');
    setFormType(template?.category || 'festival_sale');
    setFormTitle(template?.email_subject || 'Special Delicacies Offer');
    setFormDesc(template?.email_message || '');
    setFormBannerUrl('https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&auto=format&fit=crop&q=80');
    setFormVoucherCode(coupons[0]?.code || 'SPECIAL20');
    setFormDiscountPercent(20);
    setFormMinOrder(500);
    setFormAudienceType('all');
    setFormSelectedCustomerKeys([]);
    setFormChannels(template?.channel === 'email' ? ['email'] : template?.channel === 'sms' ? ['sms'] : ['email', 'sms']);
    setFormEmailSubject(template?.email_subject || 'Special Festivities Discount from {{businessName}}');
    setFormEmailTitle(template?.name || 'Exclusive Delicacies Promotion');
    setFormEmailMessage(template?.email_message || 'Enjoy authentic traditional Andhra delicacies prepared fresh with pure ghee and heritage spices.');
    setFormEmailCtaText(template?.default_cta_text || 'Shop & Save Now');
    setFormEmailCtaLink(template?.default_cta_link || 'https://vasilipadmasaikiran.github.io/sudha-swagruha-foods');
    setFormSmsMessage(template?.sms_message || 'Namaskaram {{customerName}}! Celebrate with {{businessName}} delicacies. Get 20% OFF using code {{voucherCode}}. Shop: {{shopUrl}}');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormEndDate(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
    setFormSendOption('immediate');
    setFormScheduleDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    setFormScheduleTime('10:00');
    setCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (c: PromotionalCampaign) => {
    setEditingCampaignId(c.id);
    setFormName(c.name);
    setFormType(c.type);
    setFormTitle(c.title);
    setFormDesc(c.description);
    setFormBannerUrl(c.banner_url || '');
    setFormVoucherCode(c.voucher_code || '');
    setFormDiscountPercent(c.discount_percent || 0);
    setFormMinOrder(c.min_order_amount || 0);
    setFormAudienceType(c.audience_type);
    setFormSelectedCustomerKeys(c.selected_customer_keys || []);
    setFormChannels(c.channels);
    setFormEmailSubject(c.email_subject || '');
    setFormEmailTitle(c.email_title || c.title);
    setFormEmailMessage(c.email_message || c.description);
    setFormEmailCtaText(c.email_cta_text || 'Shop Now');
    setFormEmailCtaLink(c.email_cta_link || '');
    setFormSmsMessage(c.sms_message || '');
    setFormStartDate(c.start_date || new Date().toISOString().split('T')[0]);
    setFormEndDate(c.end_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
    setFormSendOption(c.scheduled_at ? 'schedule' : 'immediate');
    if (c.scheduled_at) {
      const dt = new Date(c.scheduled_at);
      setFormScheduleDate(dt.toISOString().split('T')[0]);
      setFormScheduleTime(dt.toTimeString().substring(0, 5));
    }
    setCreateModalOpen(true);
  };

  // Submit Campaign Form (Save as Draft or Schedule)
  const handleSaveCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formTitle.trim()) {
      toast.error('Please enter a Campaign Name and Title');
      return;
    }

    if (formChannels.length === 0) {
      toast.error('Please select at least one communication channel (Email or SMS)');
      return;
    }

    const scheduledTimestamp =
      formSendOption === 'schedule' && formScheduleDate
        ? new Date(`${formScheduleDate}T${formScheduleTime}:00`).toISOString()
        : undefined;

    const initialStatus = scheduledTimestamp ? 'scheduled' : 'draft';

    try {
      if (editingCampaignId) {
        await updateCampaign(editingCampaignId, {
          name: formName.trim(),
          type: formType,
          title: formTitle.trim(),
          description: formDesc.trim(),
          banner_url: formBannerUrl.trim(),
          voucher_code: formVoucherCode.trim().toUpperCase(),
          discount_percent: Number(formDiscountPercent) || 0,
          min_order_amount: Number(formMinOrder) || 0,
          audience_type: formAudienceType,
          selected_customer_keys: formSelectedCustomerKeys,
          channels: formChannels,
          email_subject: formEmailSubject.trim(),
          email_title: formEmailTitle.trim(),
          email_message: formEmailMessage.trim(),
          email_cta_text: formEmailCtaText.trim(),
          email_cta_link: formEmailCtaLink.trim(),
          sms_message: formSmsMessage.trim(),
          start_date: formStartDate,
          end_date: formEndDate,
          scheduled_at: scheduledTimestamp,
          status: initialStatus,
        });
        toast.success(`Campaign "${formName}" updated successfully!`);
      } else {
        await createCampaign({
          name: formName.trim(),
          type: formType,
          title: formTitle.trim(),
          description: formDesc.trim(),
          banner_url: formBannerUrl.trim(),
          voucher_code: formVoucherCode.trim().toUpperCase(),
          discount_percent: Number(formDiscountPercent) || 0,
          min_order_amount: Number(formMinOrder) || 0,
          status: initialStatus,
          audience_type: formAudienceType,
          selected_customer_keys: formSelectedCustomerKeys,
          channels: formChannels,
          email_subject: formEmailSubject.trim(),
          email_title: formEmailTitle.trim(),
          email_message: formEmailMessage.trim(),
          email_cta_text: formEmailCtaText.trim(),
          email_cta_link: formEmailCtaLink.trim(),
          sms_message: formSmsMessage.trim(),
          start_date: formStartDate,
          end_date: formEndDate,
          scheduled_at: scheduledTimestamp,
          created_by: currentUser?.full_name || 'Root Admin',
        });
        toast.success(`Campaign "${formName}" created as ${initialStatus.toUpperCase()}!`);
      }
      setCreateModalOpen(false);
    } catch {
      toast.error('Failed to save promotional campaign');
    }
  };

  // Execute Send Now
  const handleExecuteSend = async (campaign: PromotionalCampaign) => {
    setConfirmSendCampaign(null);
    const toastId = toast.loading(`Initiating campaign batch dispatch for "${campaign.name}"...`);

    const res = await sendCampaignNow(campaign.id, currentUser?.full_name || 'Root Admin');
    toast.dismiss(toastId);

    if (res.success) {
      toast.success(res.message, { duration: 6000 });
    } else {
      toast.error(res.message, { duration: 6000 });
    }
  };

  // Send Test Email Action
  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      toast.error('Please enter a valid test email address');
      return;
    }
    setIsSendingTestEmail(true);
    try {
      const dummyId = editingCampaignId || 'test_promo';
      const res = await sendTestEmail(dummyId, testEmailAddress.trim());
      if (res.success) {
        toast.success(`Test email sent to ${testEmailAddress}!`);
      } else {
        toast.error(res.message || 'Test email failed');
      }
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // Send Test SMS Action
  const handleSendTestSms = async () => {
    if (!testMobileNumber || testMobileNumber.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setIsSendingTestSms(true);
    try {
      const dummyId = editingCampaignId || 'test_promo';
      const res = await sendTestSms(dummyId, testMobileNumber.trim());
      if (res.success) {
        toast.success(`Test SMS dispatched to ${testMobileNumber}!`);
      } else {
        toast.error(res.message || 'Test SMS failed');
      }
    } finally {
      setIsSendingTestSms(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── HEADER & SUBTAB NAVIGATION ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/70 p-5 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-md">
              <Megaphone className="w-4 h-4" />
            </div>
            <span>Promotions & Customer Communication</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Automated Email & SMS marketing campaigns, vouchers, audience targeting & real-time delivery logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Promotion</span>
          </button>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'dashboard', label: 'Dashboard & Metrics', icon: TrendingUp },
          { id: 'campaigns', label: `Campaigns (${campaigns.length})`, icon: Megaphone },
          { id: 'offers', label: `Offers & Vouchers (${coupons.length})`, icon: Tag },
          { id: 'audience', label: `Audience (${allCustomers.length})`, icon: Users },
          { id: 'templates', label: `Templates (${templates.length})`, icon: FileText },
          { id: 'history', label: `Delivery Logs (${recipientLogs.length})`, icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`px-4 py-2 rounded-2xl font-semibold transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: PROMOTIONS DASHBOARD ─── */}
      {subTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Overview Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Campaigns', value: stats.total, color: 'text-white', bg: 'bg-slate-900' },
              { label: 'Active / Sent', value: stats.sent, color: 'text-emerald-400', bg: 'bg-emerald-950/30 border-emerald-500/20' },
              { label: 'Scheduled', value: stats.scheduled, color: 'text-purple-400', bg: 'bg-purple-950/30 border-purple-500/20' },
              { label: 'Drafts', value: stats.draft, color: 'text-amber-400', bg: 'bg-amber-950/30 border-amber-500/20' },
              { label: 'Emails Delivered', value: stats.emailSentTotal, color: 'text-cyan-400', bg: 'bg-cyan-950/30 border-cyan-500/20' },
              { label: 'SMS Delivered', value: stats.smsSentTotal, color: 'text-rose-400', bg: 'bg-rose-950/30 border-rose-500/20' },
            ].map((kpi, idx) => (
              <div key={idx} className={`p-4 rounded-2xl border border-slate-800 shadow-sm ${kpi.bg}`}>
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{kpi.label}</p>
                <p className={`text-2xl font-mono font-extrabold mt-1 ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions & Recent Campaigns */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-emerald-400" />
                  <span>Recent Campaigns</span>
                </h3>
                <button
                  onClick={() => setSubTab('campaigns')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                >
                  View All Campaigns →
                </button>
              </div>

              <div className="space-y-3">
                {campaigns.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{c.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            c.status === 'sent'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : c.status === 'scheduled'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : c.status === 'processing'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{c.title}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
                        <span>Channels: {c.channels.join(', ').toUpperCase()}</span>
                        {c.voucher_code && <span className="font-mono text-cyan-400 font-bold">Voucher: {c.voucher_code}</span>}
                        <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setPreviewCampaign(c);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                      >
                        Preview
                      </button>
                      {c.status === 'draft' && (
                        <button
                          onClick={() => setConfirmSendCampaign(c)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Send Now</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Communication Status Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>Channels Status</span>
              </h3>

              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Email Gateway</span>
                  </span>
                  <span className="text-emerald-400 font-bold">ACTIVE</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Domain: {settings.smtp?.senderEmail || 'info@sudhaswagruhafoods.com'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
                    <span>SMS Gateway</span>
                  </span>
                  <span
                    className={`font-bold ${
                      settings.sms?.enabled ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {settings.sms?.enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Provider: {settings.sms?.provider ? settings.sms.provider.toUpperCase() : 'FAST2SMS'}
                </p>
                {!settings.sms?.enabled && (
                  <p className="text-[10px] text-amber-400 font-medium">
                    ⚠️ SMS promotions will be held until Root Admin enables SMS in Settings.
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleOpenCreateModal()}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold rounded-2xl shadow-lg transition cursor-pointer text-center"
                >
                  Start New Marketing Campaign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: CAMPAIGNS DIRECTORY ─── */}
      {subTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={campaignSearch}
                onChange={(e) => setCampaignSearch(e.target.value)}
                placeholder="Search campaigns, voucher codes..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Drafts</option>
                <option value="scheduled">Scheduled</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <button
                onClick={() => handleOpenCreateModal()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Campaign</span>
              </button>
            </div>
          </div>

          {filteredCampaigns.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
              <Megaphone className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-white font-bold text-sm">No promotional campaigns found</h4>
              <p className="text-xs text-slate-400">Create your first offer or voucher campaign to engage your customers.</p>
              <button
                onClick={() => handleOpenCreateModal()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Create Promotion
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredCampaigns.map((c) => (
                <div
                  key={c.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 hover:border-slate-700 transition shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-base">{c.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              c.status === 'sent'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : c.status === 'scheduled'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : c.status === 'processing'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.description}</p>
                      </div>

                      {c.voucher_code && (
                        <div className="px-2.5 py-1 bg-cyan-950/60 border border-cyan-500/30 rounded-xl font-mono text-cyan-400 text-xs font-bold tracking-wider">
                          {c.voucher_code}
                        </div>
                      )}
                    </div>

                    {/* Stats metrics */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-2xl border border-slate-800/80 text-center text-xs">
                      <div>
                        <p className="text-[10px] text-slate-500">Audience</p>
                        <p className="font-mono font-bold text-white">{c.total_recipients || 'Targeting...'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500">Emails Sent</p>
                        <p className="font-mono font-bold text-cyan-400">{c.email_sent || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500">SMS Sent</p>
                        <p className="font-mono font-bold text-rose-400">{c.sms_sent || 0}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Channels: {c.channels.join(' + ').toUpperCase()}</span>
                      {c.scheduled_at && (
                        <span className="text-purple-400 font-semibold">
                          Scheduled: {new Date(c.scheduled_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPreviewCampaign(c)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
                        title="Preview Email & SMS"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(c)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
                        title="Edit Campaign"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          const dup = await duplicateCampaign(c.id);
                          if (dup) toast.success(`Duplicated as "${dup.name}"`);
                        }}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
                        title="Duplicate Campaign"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to delete "${c.name}"?`)) {
                            await deleteCampaign(c.id);
                            toast.success('Campaign removed');
                          }
                        }}
                        className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition cursor-pointer"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {c.status === 'scheduled' && (
                        <button
                          onClick={async () => {
                            await cancelScheduledCampaign(c.id, currentUser?.full_name);
                            toast.success('Scheduled campaign cancelled.');
                          }}
                          className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs font-semibold rounded-xl cursor-pointer"
                        >
                          Cancel Schedule
                        </button>
                      )}

                      {(c.status === 'draft' || c.status === 'failed') && (
                        <button
                          onClick={() => setConfirmSendCampaign(c)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950"
                        >
                          <Send className="w-3 h-3" />
                          <span>Dispatch</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: OFFERS & VOUCHERS INTEGRATION ─── */}
      {subTab === 'offers' && (
        <div className="space-y-6">
          <div className="p-5 bg-gradient-to-r from-emerald-950/40 via-teal-950/20 to-slate-900 border border-emerald-500/30 rounded-3xl space-y-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400" />
              <span>Integrated E-Commerce Voucher System</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              Promotional campaigns directly link with your active discount coupons stored in the cloud database. Any voucher chosen in a campaign automatically populates into email and SMS messaging variables.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {coupons.map((cp) => (
              <div
                key={cp.id}
                className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-extrabold text-emerald-400 tracking-wider">
                    {cp.code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      cp.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {cp.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-medium">{cp.description}</p>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-400">
                  <div>Discount: <strong className="text-white">{cp.discountPercent}%</strong></div>
                  <div>Min Order: <strong className="text-white">₹{cp.minOrder}</strong></div>
                  <div>Used: <strong className="text-white">{cp.usageCount || 0} times</strong></div>
                  <div>Status: <strong className="text-emerald-400">Checkout Enabled</strong></div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      handleOpenCreateModal();
                      setFormVoucherCode(cp.code);
                      setFormDiscountPercent(cp.discountPercent);
                      setFormMinOrder(cp.minOrder);
                    }}
                    className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>Launch Campaign for this Voucher</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 4: AUDIENCE & CUSTOMERS ─── */}
      {subTab === 'audience' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Registered Customer Audience</h3>
              <p className="text-xs text-slate-400">
                Aggregated from customer accounts and completed orders with opt-out enforcement.
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-lg font-extrabold text-emerald-400">{allCustomers.length}</span>{' '}
              <span className="text-xs text-slate-400">Registered Patrons</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Contact Email</th>
                    <th className="px-4 py-3">Phone / WhatsApp</th>
                    <th className="px-4 py-3">Total Orders</th>
                    <th className="px-4 py-3">Lifetime Spent</th>
                    <th className="px-4 py-3">Promotional Opt-In</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {allCustomers.map((cust) => (
                    <tr key={cust.key} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 text-white font-bold">{cust.name}</td>
                      <td className="px-4 py-3 text-slate-400">{cust.email || '—'}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">{cust.phone || '—'}</td>
                      <td className="px-4 py-3 text-center">{cust.totalOrders}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">₹{cust.totalSpent}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!cust.optOutEmail}
                              onChange={(e) => setCustomerPreference(cust.key, 'email', !e.target.checked)}
                              className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0"
                            />
                            <span>Email</span>
                          </label>
                          <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!cust.optOutSms}
                              onChange={(e) => setCustomerPreference(cust.key, 'sms', !e.target.checked)}
                              className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0"
                            />
                            <span>SMS</span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: TEMPLATES ─── */}
      {subTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Marketing Communication Templates
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-3 shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm">{tmpl.name}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {tmpl.channel.toUpperCase()}
                    </span>
                  </div>

                  {tmpl.email_subject && (
                    <p className="text-xs text-cyan-300 font-medium">Subject: {tmpl.email_subject}</p>
                  )}

                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 whitespace-pre-line font-sans line-clamp-4">
                    {tmpl.email_message || tmpl.sms_message}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleOpenCreateModal(tmpl)}
                    className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Use This Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 6: COMMUNICATION HISTORY & DELIVERY LOGS ─── */}
      {subTab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search delivery logs by customer, recipient..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <p className="text-xs text-slate-400">
              Total Logged Deliveries: <strong className="text-white font-mono">{recipientLogs.length}</strong>
            </p>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
              <Clock className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-white">No delivery logs recorded yet</p>
              <p className="text-xs text-slate-400">When campaigns are sent, per-recipient delivery statuses will appear here.</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800 text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Campaign</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Channel</th>
                      <th className="px-4 py-3">Recipient</th>
                      <th className="px-4 py-3">Delivery Status</th>
                      <th className="px-4 py-3">Sent At</th>
                      <th className="px-4 py-3">Diagnostic Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3 font-semibold text-white">{log.campaign_name}</td>
                        <td className="px-4 py-3">{log.customer_name}</td>
                        <td className="px-4 py-3 uppercase font-mono text-[11px] text-cyan-400">{log.channel}</td>
                        <td className="px-4 py-3 font-mono">{log.recipient}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.status === 'sent' || log.status === 'delivered'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{new Date(log.sent_at).toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-400 line-clamp-1">{log.failure_reason || log.provider_message_id || 'OK'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL 1: CREATE / EDIT CAMPAIGN MODAL ─── */}
      <AnimatePresence>
        {createModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 text-slate-100 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {editingCampaignId ? 'Edit Promotional Campaign' : 'Create New Promotion'}
                    </h3>
                    <p className="text-xs text-slate-400">Configure audience, offers, emails, and SMS copy.</p>
                  </div>
                </div>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCampaignSubmit} className="space-y-5">
                {/* 1. Campaign Core Metadata */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Campaign Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Diwali Sweets Mega Offer"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Promotion Category *
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as PromotionType)}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      {PROMOTION_TYPES.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Title & Description */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Headline / Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Celebrate Diwali with 25% OFF on Authentic Andhra Delights"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Promotional Description
                    </label>
                    <textarea
                      rows={2}
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="Brief note on what this promotion offers..."
                      className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* 3. Offer & Voucher Linking */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Discount Offer / Voucher Integration</span>
                  </h4>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Select Existing Voucher
                      </label>
                      <select
                        value={formVoucherCode}
                        onChange={(e) => {
                          const code = e.target.value;
                          setFormVoucherCode(code);
                          const matching = coupons.find((c) => c.code === code);
                          if (matching) {
                            setFormDiscountPercent(matching.discountPercent);
                            setFormMinOrder(matching.minOrder);
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono"
                      >
                        <option value="">No Voucher (General Offer)</option>
                        {coupons.map((c) => (
                          <option key={c.id} value={c.code}>
                            {c.code} ({c.discountPercent}% OFF)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Discount %
                      </label>
                      <input
                        type="number"
                        value={formDiscountPercent}
                        onChange={(e) => setFormDiscountPercent(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Min Order Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={formMinOrder}
                        onChange={(e) => setFormMinOrder(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Customer Audience Targeting */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>Audience & Customer Targeting</span>
                    </h4>
                    <span className="text-xs font-mono font-bold text-white bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
                      Reach: {formAudiencePreview.totalEligibleCount} Patrons
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-2 text-xs">
                    {[
                      { key: 'all', label: 'All Registered Customers', desc: `${allCustomers.length} Total` },
                      { key: 'segment_vip', label: 'VIP Customers', desc: 'Spent ₹2,000+' },
                      { key: 'segment_new', label: 'New Patrons', desc: '1 Order' },
                      { key: 'segment_returning', label: 'Returning Buyers', desc: '2+ Orders' },
                      { key: 'segment_inactive', label: 'Inactive Patrons', desc: 'No Order > 45 Days' },
                      { key: 'selected', label: 'Selected Customers', desc: `${formSelectedCustomerKeys.length} Selected` },
                    ].map((aud) => (
                      <button
                        type="button"
                        key={aud.key}
                        onClick={() => setFormAudienceType(aud.key as any)}
                        className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
                          formAudienceType === aud.key
                            ? 'bg-cyan-950/40 border-cyan-500 text-white font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <p className="text-xs">{aud.label}</p>
                        <p className="text-[10px] text-slate-500">{aud.desc}</p>
                      </button>
                    ))}
                  </div>

                  {/* Selected Customers Picker if 'selected' chosen */}
                  {formAudienceType === 'selected' && (
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2 max-h-48 overflow-y-auto">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-[11px] text-slate-400 font-semibold">Pick Specific Customers:</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setFormSelectedCustomerKeys(allCustomers.map((c) => c.key))}
                            className="text-[10px] text-emerald-400 hover:underline"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormSelectedCustomerKeys([])}
                            className="text-[10px] text-slate-400 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      {allCustomers.map((c) => {
                        const isChecked = formSelectedCustomerKeys.includes(c.key);
                        return (
                          <label key={c.key} className="flex items-center justify-between p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer text-xs">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormSelectedCustomerKeys([...formSelectedCustomerKeys, c.key]);
                                  } else {
                                    setFormSelectedCustomerKeys(formSelectedCustomerKeys.filter((k) => k !== c.key));
                                  }
                                }}
                                className="rounded border-slate-700 bg-slate-800 text-cyan-500"
                              />
                              <span className="text-white font-semibold">{c.name}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">{c.phone || c.email}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 5. Communication Channels Selection */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Communication Channels</span>
                    </h4>
                    {!settings.sms?.enabled && (
                      <span className="text-[10px] text-amber-400 font-semibold">
                        (SMS is globally disabled by Root Admin)
                      </span>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-white font-semibold">
                      <input
                        type="checkbox"
                        checked={formChannels.includes('email')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormChannels([...formChannels, 'email']);
                          } else {
                            setFormChannels(formChannels.filter((c) => c !== 'email'));
                          }
                        }}
                        className="rounded border-slate-700 bg-slate-800 text-emerald-500"
                      />
                      <span>Email Promotion ({formAudiencePreview.emailRecipients.length} reachable)</span>
                    </label>

                    <label
                      className={`flex items-center gap-2 text-xs font-semibold ${
                        settings.sms?.enabled ? 'cursor-pointer text-white' : 'opacity-50 cursor-not-allowed text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={!settings.sms?.enabled}
                        checked={formChannels.includes('sms')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormChannels([...formChannels, 'sms']);
                          } else {
                            setFormChannels(formChannels.filter((c) => c !== 'sms'));
                          }
                        }}
                        className="rounded border-slate-700 bg-slate-800 text-rose-500"
                      />
                      <span>SMS Promotion ({formAudiencePreview.smsRecipients.length} reachable)</span>
                    </label>
                  </div>
                </div>

                {/* 6. Message Composition (Email & SMS Tabs) */}
                <div className="space-y-4">
                  {/* Email Composition if email selected */}
                  {formChannels.includes('email') && (
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email Content Composition</span>
                      </h4>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Email Subject Line *
                        </label>
                        <input
                          type="text"
                          required
                          value={formEmailSubject}
                          onChange={(e) => setFormEmailSubject(e.target.value)}
                          placeholder="e.g. 🎉 Special Diwali 25% OFF from {{businessName}}"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Email Message Body *
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={formEmailMessage}
                          onChange={(e) => setFormEmailMessage(e.target.value)}
                          placeholder="Rich promotional message to patrons..."
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                        />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            CTA Button Text
                          </label>
                          <input
                            type="text"
                            value={formEmailCtaText}
                            onChange={(e) => setFormEmailCtaText(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            CTA Target URL
                          </label>
                          <input
                            type="text"
                            value={formEmailCtaLink}
                            onChange={(e) => setFormEmailCtaLink(e.target.value)}
                            placeholder="https://..."
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SMS Composition if SMS selected */}
                  {formChannels.includes('sms') && (
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>SMS Copy Composition</span>
                        </h4>
                        <span className="text-[11px] font-mono text-slate-400">
                          {formSmsMessage.length} chars • {Math.ceil(formSmsMessage.length / 160) || 1} SMS Segment
                        </span>
                      </div>

                      <textarea
                        rows={3}
                        required
                        value={formSmsMessage}
                        onChange={(e) => setFormSmsMessage(e.target.value)}
                        placeholder="SMS message text..."
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono"
                      />

                      {/* Template Variable Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-500 font-semibold">Variables:</span>
                        {['{{customerName}}', '{{businessName}}', '{{voucherCode}}', '{{discount}}', '{{shopUrl}}'].map((chip) => (
                          <button
                            type="button"
                            key={chip}
                            onClick={() => setFormSmsMessage((prev) => prev + ' ' + chip)}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[10px] font-mono cursor-pointer"
                          >
                            + {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 7. Test Message Dispatch */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Send Test Diagnostic Message</span>
                  </h4>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        placeholder="test.admin@example.com"
                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                      />
                      <button
                        type="button"
                        disabled={isSendingTestEmail}
                        onClick={handleSendTestEmail}
                        className="px-3 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-400 font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50"
                      >
                        {isSendingTestEmail ? 'Sending...' : 'Test Email'}
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={testMobileNumber}
                        onChange={(e) => setTestMobileNumber(e.target.value)}
                        placeholder="9876543210"
                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono"
                      />
                      <button
                        type="button"
                        disabled={isSendingTestSms}
                        onClick={handleSendTestSms}
                        className="px-3 py-2 bg-rose-600/30 hover:bg-rose-600/50 text-rose-400 font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50"
                      >
                        {isSendingTestSms ? 'Sending...' : 'Test SMS'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 8. Send Option (Immediate vs Scheduled) */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Dispatch Scheduling (IST Timezone)
                  </h4>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-white font-semibold cursor-pointer">
                      <input
                        type="radio"
                        checked={formSendOption === 'immediate'}
                        onChange={() => setFormSendOption('immediate')}
                        className="text-emerald-500 bg-slate-800"
                      />
                      <span>Save as Draft / Immediate Send</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-white font-semibold cursor-pointer">
                      <input
                        type="radio"
                        checked={formSendOption === 'schedule'}
                        onChange={() => setFormSendOption('schedule')}
                        className="text-purple-500 bg-slate-800"
                      />
                      <span>Schedule for Later</span>
                    </label>
                  </div>

                  {formSendOption === 'schedule' && (
                    <div className="grid sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Schedule Date</label>
                        <input
                          type="date"
                          required
                          value={formScheduleDate}
                          onChange={(e) => setFormScheduleDate(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Schedule Time (IST)</label>
                        <input
                          type="time"
                          required
                          value={formScheduleTime}
                          onChange={(e) => setFormScheduleTime(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold rounded-2xl shadow-lg cursor-pointer"
                  >
                    {editingCampaignId
                      ? 'Save Changes'
                      : formSendOption === 'schedule'
                      ? 'Confirm & Schedule Campaign'
                      : 'Save Campaign as Draft'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 2: CONFIRM IMMEDIATE BULK DISPATCH ─── */}
      <AnimatePresence>
        {confirmSendCampaign && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <Send className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="font-bold text-white text-base">Confirm Promotional Dispatch</h3>
                <p className="text-xs text-slate-400">
                  Are you sure you want to begin immediate promotional communication?
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Campaign:</span>
                  <span className="text-white font-bold">{confirmSendCampaign.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Channels:</span>
                  <span className="text-cyan-400 font-bold uppercase">{confirmSendCampaign.channels.join(' + ')}</span>
                </div>
                {confirmSendCampaign.voucher_code && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Voucher Code:</span>
                    <span className="text-emerald-400 font-mono font-bold">{confirmSendCampaign.voucher_code}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-800 pt-1.5">
                  <span className="text-slate-400">Target Audience:</span>
                  <span className="text-white font-bold">{allCustomers.length} Registered Customers</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Messages will be queued in asynchronous chunks to avoid gateway rate limits. Non-blocking delivery ensures system operations continue uninterrupted.
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmSendCampaign(null)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleExecuteSend(confirmSendCampaign)}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? 'Dispatching...' : 'Dispatch Now'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 3: CAMPAIGN PREVIEW ─── */}
      <AnimatePresence>
        {previewCampaign && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-white text-base">Campaign Message Preview</h3>
                  <p className="text-xs text-slate-400">{previewCampaign.name}</p>
                </div>
                <button
                  onClick={() => setPreviewCampaign(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Email Preview Mockup */}
              {previewCampaign.channels.includes('email') && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email Appearance</span>
                  </span>
                  <div className="bg-white rounded-2xl text-slate-900 p-6 border border-slate-200 shadow-md space-y-4">
                    <div className="bg-slate-900 text-white p-4 rounded-xl text-center">
                      <h4 className="font-extrabold text-base">{settings.businessName || 'Sudha Swagruha Foods'}</h4>
                      <p className="text-[11px] text-slate-400">Authentic Andhra Sweets, Pickles & Delicacies</p>
                    </div>

                    <p className="text-xs text-slate-500 font-semibold">Subject: {previewCampaign.email_subject}</p>

                    <h3 className="font-extrabold text-lg text-slate-900">{previewCampaign.email_title || previewCampaign.title}</h3>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{previewCampaign.email_message || previewCampaign.description}</p>

                    {previewCampaign.voucher_code && (
                      <div className="p-4 bg-emerald-50 border-2 border-dashed border-emerald-500 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase">Special Promo Voucher</span>
                        <p className="font-mono font-extrabold text-2xl text-emerald-900 tracking-wider my-1">
                          {previewCampaign.voucher_code}
                        </p>
                        {previewCampaign.discount_percent && (
                          <p className="text-xs font-bold text-emerald-700">Get {previewCampaign.discount_percent}% OFF</p>
                        )}
                      </div>
                    )}

                    <div className="text-center pt-2">
                      <span className="inline-block px-6 py-2.5 bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md">
                        {previewCampaign.email_cta_text || 'Shop Now'} →
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* SMS Preview Mockup */}
              {previewCampaign.channels.includes('sms') && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>SMS Appearance (Mobile Chat Bubble)</span>
                  </span>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-end">
                    <div className="max-w-xs bg-emerald-800/80 text-white text-xs p-3.5 rounded-2xl rounded-tr-none font-sans leading-relaxed shadow-md">
                      {previewCampaign.sms_message
                        ?.replace('{{customerName}}', 'Suresh')
                        .replace('{{businessName}}', settings.businessName || 'Sudha Swagruha Foods')
                        .replace('{{voucherCode}}', previewCampaign.voucher_code || 'PROMO20')
                        .replace('{{shopUrl}}', 'https://sudhaswagruha.com') || previewCampaign.description}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setPreviewCampaign(null)}
                  className="w-full py-2.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-2xl cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
