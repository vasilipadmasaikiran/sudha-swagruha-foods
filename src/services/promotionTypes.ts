// ============================================================
// Promotions & Customer Communication Data Models & Types
// Defines schema for Campaigns, Templates, Audiences, and Logs
// ============================================================

export type PromotionType =
  | 'offer'
  | 'voucher'
  | 'coupon'
  | 'festival_sale'
  | 'flash_sale'
  | 'product_announcement'
  | 'new_arrival'
  | 'clearance'
  | 'special_announcement'
  | 'custom';

export type PromotionStatus =
  | 'draft'
  | 'scheduled'
  | 'processing'
  | 'sent'
  | 'failed'
  | 'cancelled';

export type AudienceType =
  | 'all'
  | 'selected'
  | 'segment_vip'
  | 'segment_new'
  | 'segment_returning'
  | 'segment_inactive'
  | 'segment_product'
  | 'segment_category';

export type CommunicationChannel = 'email' | 'sms' | 'both';

export interface PromotionalCampaign {
  id: string;
  name: string;
  type: PromotionType;
  title: string;
  description: string;
  banner_url?: string;
  voucher_code?: string;
  discount_percent?: number;
  discount_amount?: number;
  min_order_amount?: number;
  status: PromotionStatus;
  audience_type: AudienceType;
  audience_filter?: {
    category?: string;
    productId?: string;
  };
  selected_customer_keys?: string[];
  channels: ('email' | 'sms')[];
  email_subject?: string;
  email_title?: string;
  email_message?: string;
  email_cta_text?: string;
  email_cta_link?: string;
  sms_message?: string;
  start_date?: string;
  end_date?: string;
  scheduled_at?: string; // ISO string in application timezone (IST)
  sent_at?: string;
  completed_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;

  // Delivery & Reach Metrics
  total_recipients: number;
  email_queued: number;
  email_sent: number;
  email_failed: number;
  sms_queued: number;
  sms_sent: number;
  sms_failed: number;
}

export interface PromotionTemplate {
  id: string;
  name: string;
  category: PromotionType;
  channel: 'email' | 'sms' | 'both';
  email_subject?: string;
  email_message?: string;
  sms_message?: string;
  default_cta_text?: string;
  default_cta_link?: string;
  created_by?: string;
  created_at?: string;
}

export interface CampaignRecipientLog {
  id: string;
  campaign_id: string;
  campaign_name: string;
  customer_key: string;
  customer_name: string;
  channel: 'email' | 'sms';
  recipient: string; // Email address or Normalized Phone
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'skipped';
  provider?: string;
  provider_message_id?: string;
  failure_reason?: string;
  attempt_count: number;
  sent_at: string;
}

export interface CustomerAudienceItem {
  key: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  address?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  purchasedCategories: string[];
  purchasedProductIds: string[];
  optOutEmail?: boolean;
  optOutSms?: boolean;
}
