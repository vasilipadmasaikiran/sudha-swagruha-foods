// ============================================================
// Audience Service: Customer Aggregation & Segmentation Engine
// Extracts unique registered customers, applies segment filters,
// and respects customer channel opt-outs
// ============================================================
import type { DbOrder } from '@/services/supabase';
import type { CustomerAudienceItem, AudienceType, PromotionalCampaign } from './promotionTypes';

export const AudienceService = {
  /**
   * Aggregates orders into deduplicated customer profiles with purchase metrics
   */
  aggregateCustomersFromOrders(
    orders: DbOrder[],
    customerPreferences?: Record<string, { optOutEmail?: boolean; optOutSms?: boolean }>
  ): CustomerAudienceItem[] {
    const map = new Map<string, CustomerAudienceItem>();

    orders.forEach((o) => {
      // Keyed primarily by phone or email or customer_id
      const phoneRaw = (o.customer_mobile || o.customer_phone || o.customer_whatsapp || '').trim();
      const emailRaw = (o.customer_email || '').trim().toLowerCase();
      const key = phoneRaw ? `phone_${phoneRaw}` : emailRaw ? `email_${emailRaw}` : (o.customer_id || o.id);

      const categories = new Set<string>();
      const productIds = new Set<string>();

      (o.items || []).forEach((item) => {
        if (item.product_id) productIds.add(item.product_id);
      });

      const orderTotal = Number(o.total || o.total_amount || 0);
      const orderDate = o.created_at || new Date().toISOString();

      const existing = map.get(key);
      if (existing) {
        existing.totalOrders += 1;
        existing.totalSpent = Math.round((existing.totalSpent + orderTotal) * 100) / 100;
        if (new Date(orderDate) > new Date(existing.lastOrderDate)) {
          existing.lastOrderDate = orderDate;
        }
        if (!existing.email && emailRaw) existing.email = emailRaw;
        if (!existing.phone && phoneRaw) existing.phone = phoneRaw;
        productIds.forEach((pid) => {
          if (!existing.purchasedProductIds.includes(pid)) existing.purchasedProductIds.push(pid);
        });
      } else {
        const addrStr = typeof o.delivery_address === 'string'
          ? o.delivery_address
          : o.delivery_address
          ? `${o.delivery_address.house_no ? o.delivery_address.house_no + ', ' : ''}${o.delivery_address.street || ''}${o.delivery_address.area ? ', ' + o.delivery_address.area : ''}`
          : '';
        const cityStr = o.city || (typeof o.delivery_address === 'object' && o.delivery_address ? o.delivery_address.city : '') || '';

        const prefs = customerPreferences?.[key] || {};

        map.set(key, {
          key,
          name: o.customer_name || 'Valued Customer',
          phone: phoneRaw,
          email: emailRaw || undefined,
          city: cityStr,
          address: addrStr,
          totalOrders: 1,
          totalSpent: orderTotal,
          lastOrderDate: orderDate,
          purchasedCategories: Array.from(categories),
          purchasedProductIds: Array.from(productIds),
          optOutEmail: prefs.optOutEmail || false,
          optOutSms: prefs.optOutSms || false,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  },

  /**
   * Filters customers matching the campaign's audience criteria
   */
  filterAudience(
    customers: CustomerAudienceItem[],
    audienceType: AudienceType,
    selectedKeys?: string[],
    filter?: { category?: string; productId?: string }
  ): CustomerAudienceItem[] {
    const now = new Date();
    const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

    switch (audienceType) {
      case 'all':
        return customers;

      case 'segment_vip':
        // High spenders (e.g. ₹2000+)
        return customers.filter((c) => c.totalSpent >= 2000);

      case 'segment_new':
        // Customers with exactly 1 order
        return customers.filter((c) => c.totalOrders === 1);

      case 'segment_returning':
        // Repeat buyers (>= 2 orders)
        return customers.filter((c) => c.totalOrders >= 2);

      case 'segment_inactive':
        // Customers with no order in the last 45 days
        return customers.filter((c) => new Date(c.lastOrderDate) < fortyFiveDaysAgo);

      case 'selected':
        if (!selectedKeys || selectedKeys.length === 0) return [];
        return customers.filter((c) => selectedKeys.includes(c.key));

      case 'segment_product':
        if (!filter?.productId) return customers;
        return customers.filter((c) => c.purchasedProductIds.includes(filter.productId!));

      default:
        return customers;
    }
  },

  /**
   * Resolves final deliverable targets for each channel, respecting channel availability and opt-outs
   */
  resolveDeliverableRecipients(
    audience: CustomerAudienceItem[],
    channels: ('email' | 'sms')[],
    smsGloballyEnabled: boolean
  ): {
    emailRecipients: CustomerAudienceItem[];
    smsRecipients: CustomerAudienceItem[];
    totalEligibleCount: number;
    emailOptOutCount: number;
    smsOptOutCount: number;
  } {
    const wantsEmail = channels.includes('email');
    const wantsSms = channels.includes('sms') && smsGloballyEnabled;

    let emailOptOutCount = 0;
    let smsOptOutCount = 0;

    const emailRecipients: CustomerAudienceItem[] = [];
    const smsRecipients: CustomerAudienceItem[] = [];

    const eligibleSet = new Set<string>();

    audience.forEach((cust) => {
      // Email eligibility
      if (wantsEmail && cust.email && cust.email.includes('@')) {
        if (cust.optOutEmail) {
          emailOptOutCount++;
        } else {
          emailRecipients.push(cust);
          eligibleSet.add(cust.key);
        }
      }

      // SMS eligibility
      if (wantsSms && cust.phone && cust.phone.length >= 10) {
        if (cust.optOutSms) {
          smsOptOutCount++;
        } else {
          smsRecipients.push(cust);
          eligibleSet.add(cust.key);
        }
      }
    });

    return {
      emailRecipients,
      smsRecipients,
      totalEligibleCount: eligibleSet.size,
      emailOptOutCount,
      smsOptOutCount,
    };
  },
};
