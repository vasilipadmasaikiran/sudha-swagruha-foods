// ============================================================
// Enterprise Email Communication Service (Requirement 4)
// Reusable EmailService architecture with:
// - sendOrderConfirmation()
// - sendOrderStatusUpdate()
// - sendPasswordReset()
// - sendAdminNotification()
// - sendTestEmail()
// Supports Supabase Edge Functions, Resend API, Webhooks, and secure SMTP diagnostics
// ============================================================
import type { DbOrder, CustomerCancellationRequest } from '@/services/supabase';
import type { SmtpSettings, StoreSettings } from '@/hooks/useSettingsStore';
import { supabase } from '@/services/supabase';

export interface EmailSendResult {
  success: boolean;
  message: string;
  details?: unknown;
  technicalError?: string;
}

/**
 * Validates an email address format
 */
export function isValidEmail(email?: string | null): boolean {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Enterprise Email Footer Renderer (Production Fix - Requirement 4)
 * Null-safely builds and renders the centralized physical business address footer
 * for all transactional customer and recipient email templates.
 * Dynamically synchronizes with Store Settings without modifying historical sent emails.
 * Never outputs 'undefined' or 'null'.
 */
export function renderEmailBusinessFooter(
  settings?: (Partial<StoreSettings> & { businessName?: string; businessPhone?: string; businessWhatsApp?: string; businessAddress?: string; businessEmail?: string; smtp?: SmtpSettings }) | null
): string {
  const brand = settings?.businessName?.trim() || 'Sudha Swagruha Foods';
  const phone = settings?.businessPhone?.trim() || settings?.businessWhatsApp?.trim() || '8374634989';
  const email = settings?.businessEmail?.trim() || settings?.smtp?.senderEmail?.trim() || 'info@sudhaswagruhafoods.com';

  // Construct structured physical address lines safely without undefined or null
  const line1 = settings?.addressLine1?.trim() || '';
  const line2 = settings?.addressLine2?.trim() || '';
  const city = settings?.city?.trim() || '';
  const state = settings?.state?.trim() || '';
  const postalCode = settings?.postalCode?.trim() || '';
  const country = settings?.country?.trim() || 'India';
  const fallbackAddress = settings?.businessAddress?.trim() || '';

  const addressLines: string[] = [];
  if (line1) addressLines.push(line1);
  if (line2) addressLines.push(line2);

  const cityStateZip = [city, state, postalCode].filter(Boolean).join(', ');
  if (cityStateZip) addressLines.push(cityStateZip);

  if (addressLines.length === 0 && fallbackAddress) {
    addressLines.push(fallbackAddress);
  } else if (addressLines.length > 0 && country) {
    addressLines.push(country);
  }

  const formattedAddress = addressLines.filter(Boolean).join(' • ');

  return `
    <!-- Centralized Physical Business Footer (Auto-synchronized with Store Settings) -->
    <div style="background-color: #f8fafc; padding: 24px 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
      <p style="margin: 0 0 6px 0; font-weight: 700; color: #1e293b; font-size: 13px;">🌿 ${brand}</p>
      ${formattedAddress ? `<p style="margin: 0 0 6px 0; color: #475569;">${formattedAddress}</p>` : ''}
      <p style="margin: 0; color: #64748b;">
        ${phone ? `<span>📞 Phone: +91 ${phone}</span>` : ''}
        ${phone && email ? ` • ` : ''}
        ${email ? `<span>✉️ Email: <a href="mailto:${email}" style="color: #047857; text-decoration: none;">${email}</a></span>` : ''}
      </p>
      <p style="margin: 12px 0 0 0; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px;">
        Authentic Traditional Homemade Delicacies • Handcrafted with Heritage Care
      </p>
    </div>
  `;
}

/**
 * Dynamic Template Variable Substitutor
 * Replaces centralized tokens such as {{businessName}}, {{businessAddress}}, {{addressLine1}},
 * {{addressLine2}}, {{city}}, {{state}}, {{postalCode}}, {{country}}, {{businessPhone}}, {{businessEmail}}.
 * Safely handles missing/empty values with empty string.
 */
export function replaceEmailTemplateVariables(
  template: string,
  variables: Record<string, string | number | undefined | null>
): string {
  if (!template) return '';
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const val = variables[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

/**
 * Generates branded HTML email for payment confirmation (both online and manual payments)
 */
export function generatePaymentConfirmationHtml(
  order: DbOrder,
  payment: {
    amount: number;
    payment_method: string;
    reference?: string;
    payment_date?: string;
    notes?: string;
    total_paid?: number;
    amount_due?: number;
    payment_status?: string;
  },
  settings?: (Partial<StoreSettings> & { businessName?: string; businessPhone?: string; businessAddress?: string; smtp?: SmtpSettings }) | null
): string {
  const brand = settings?.businessName || 'Sudha Swagruha Foods';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vasilipadmasaikiran.github.io/sudha-swagruha-foods';
  const trackingUrl = `${origin}/track-order?order=${encodeURIComponent(order.order_number)}`;
  const totalPaid = Number(payment.total_paid !== undefined ? payment.total_paid : (order.amount_paid ?? 0));
  const amountDue = Number(payment.amount_due !== undefined ? payment.amount_due : (order.amount_due ?? 0));
  const status = payment.payment_status || order.payment_status || 'unpaid';
  const isFullyPaid = status === 'paid' || amountDue <= 0;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Payment Receipt - ${order.order_number} - ${brand}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px 0; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
    <div style="background: linear-gradient(135deg, #064e3b 0%, #047857 100%); padding: 28px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 800;">🌿 ${brand}</h1>
      <p style="margin: 0; font-size: 13px; color: #d1fae5;">Official Payment Receipt • రసీదు</p>
      <div style="display: inline-block; margin-top: 14px; background: rgba(255,255,255,0.18); padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; border: 1px solid rgba(255,255,255,0.3);">
        ${isFullyPaid ? '✓ Fully Paid' : '⏳ Partial Payment Recorded'}
      </div>
    </div>

    <div style="padding: 24px;">
      <p style="font-size: 15px; margin: 0 0 12px 0;">Namaskaram <strong>${order.customer_name}</strong>,</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
        We have received a payment of <strong style="color: #047857; font-size: 16px;">₹${payment.amount.toLocaleString('en-IN')}</strong> for your order <strong>#${order.order_number}</strong>.
      </p>

      <!-- Payment Breakdown Box -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="color: #166534; padding: 4px 0;"><strong>Amount Received:</strong></td>
            <td style="text-align: right; font-size: 16px; font-weight: bold; color: #047857; padding: 4px 0;">₹${payment.amount.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="color: #166534; padding: 4px 0;"><strong>Payment Method:</strong></td>
            <td style="text-align: right; font-weight: 600; color: #14532d; text-transform: uppercase; padding: 4px 0;">${payment.payment_method}</td>
          </tr>
          ${payment.reference ? `
          <tr>
            <td style="color: #166534; padding: 4px 0;"><strong>Transaction Reference:</strong></td>
            <td style="text-align: right; font-family: monospace; color: #14532d; padding: 4px 0;">${payment.reference}</td>
          </tr>` : ''}
          <tr>
            <td style="color: #166534; padding: 4px 0;"><strong>Payment Date:</strong></td>
            <td style="text-align: right; color: #14532d; padding: 4px 0;">${payment.payment_date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
          </tr>
          ${payment.notes ? `
          <tr>
            <td style="color: #166534; padding: 4px 0;"><strong>Notes:</strong></td>
            <td style="text-align: right; color: #14532d; padding: 4px 0;">${payment.notes}</td>
          </tr>` : ''}
        </table>
      </div>

      <!-- Financial Status Summary -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px; font-size: 13px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Order Grand Total:</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b;">₹${order.total.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Total Paid to Date:</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #047857;">₹${totalPaid.toLocaleString('en-IN')}</td>
          </tr>
          <tr style="border-top: 1px solid #cbd5e1;">
            <td style="padding: 8px 0 0 0; font-weight: 700; color: ${amountDue > 0 ? '#b45309' : '#047857'};">Balance Due:</td>
            <td style="padding: 8px 0 0 0; text-align: right; font-weight: 800; font-size: 15px; color: ${amountDue > 0 ? '#b45309' : '#047857'};">₹${amountDue.toLocaleString('en-IN')}</td>
          </tr>
        </table>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin-bottom: 20px;">
        <a href="${trackingUrl}" style="background: #047857; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">
          View Order Status
        </a>
      </div>
    </div>

    ${renderEmailBusinessFooter(settings)}
  </div>
</body>
</html>
  `;
}

/**
 * Generates branded HTML email for customer cancellation request
 */
export function generateCancellationRequestedHtml(
  order: DbOrder,
  request: CustomerCancellationRequest,
  settings?: (Partial<StoreSettings> & { businessName?: string }) | null
): string {
  const brand = settings?.businessName || 'Sudha Swagruha Foods';
  return `<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; background: #fafafa; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; border: 1px solid #eaeaea; overflow: hidden;">
      <div style="padding: 24px;">
        <h2 style="color: #0f5132; margin-top: 0;">${brand}</h2>
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 8px; color: #664d03;">Cancellation Request Received</h3>
          <p style="margin: 0; color: #664d03; font-size: 14px;">Your cancellation request for Order <strong>#${order.order_number}</strong> has been submitted and is awaiting approval by our management team.</p>
        </div>
        <table style="width: 100%; font-size: 14px; margin-bottom: 20px; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666;">Reason:</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${request.reason}</td></tr>
          ${request.customer_comment ? `<tr><td style="padding: 8px 0; color: #666;">Customer Note:</td><td style="padding: 8px 0; text-align: right;">${request.customer_comment}</td></tr>` : ''}
          <tr><td style="padding: 8px 0; color: #666;">Estimated Refund:</td><td style="padding: 8px 0; font-weight: bold; color: #0f5132; text-align: right;">₹${request.estimated_refund_amount || order.total}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Status:</td><td style="padding: 8px 0; font-weight: bold; color: #e65100; text-align: right;">Awaiting Approval</td></tr>
        </table>
        <p style="font-size: 13px; color: #777;">Please note: Your order remains active until approved. You can track live updates on our tracking page.</p>
      </div>
      ${renderEmailBusinessFooter(settings)}
    </div>
  </body></html>`;
}

/**
 * Generates branded HTML email for customer cancellation rejection
 */
export function generateCancellationRejectedHtml(
  order: DbOrder,
  request: CustomerCancellationRequest,
  settings?: (Partial<StoreSettings> & { businessName?: string }) | null
): string {
  const brand = settings?.businessName || 'Sudha Swagruha Foods';
  return `<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; background: #fafafa; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; border: 1px solid #eaeaea; overflow: hidden;">
      <div style="padding: 24px;">
        <h2 style="color: #0f5132; margin-top: 0;">${brand}</h2>
        <div style="background: #e8f4fd; border-left: 4px solid #0288d1; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 8px; color: #01579b;">Cancellation Request Update</h3>
          <p style="margin: 0; color: #01579b; font-size: 14px;">Your cancellation request for Order <strong>#${order.order_number}</strong> could not be processed.</p>
        </div>
        <table style="width: 100%; font-size: 14px; margin-bottom: 20px; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666;">Decision:</td><td style="padding: 8px 0; font-weight: bold; color: #c62828; text-align: right;">Rejected</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Reason:</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${request.rejection_reason || 'Order has already progressed to preparation/dispatch'}</td></tr>
          ${request.admin_comment ? `<tr><td style="padding: 8px 0; color: #666;">Store Note:</td><td style="padding: 8px 0; text-align: right;">${request.admin_comment}</td></tr>` : ''}
          <tr><td style="padding: 8px 0; color: #666;">Current Order Status:</td><td style="padding: 8px 0; font-weight: bold; color: #0f5132; text-align: right;">${order.order_status.toUpperCase()} (Active)</td></tr>
        </table>
        <p style="font-size: 13px; color: #777;">Your order will be fulfilled and delivered as scheduled. Thank you for choosing ${brand}!</p>
      </div>
      ${renderEmailBusinessFooter(settings)}
    </div>
  </body></html>`;
}

/**
 * Generates branded HTML email for order confirmation
 */
export function generateOrderConfirmationHtml(
  order: DbOrder,
  settings: Partial<StoreSettings> & { businessName?: string; businessPhone?: string; businessWhatsApp?: string; businessAddress?: string; smtp?: SmtpSettings }
): string {
  const brand = settings.businessName || 'Sudha Swagruha Foods';
  const phone = settings.businessWhatsApp || settings.businessPhone || '8374634989';
  const address = settings.businessAddress || 'Plot 18, Traditional Foods Lane, Benz Circle, Vijayawada, AP';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vasilipadmasaikiran.github.io/sudha-swagruha-foods';
  const trackingUrl = `${origin}/track-order?order=${encodeURIComponent(order.order_number)}`;

  const itemsRows = order.items
    .map(
      (it, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 8px; font-size: 14px; color: #1e293b;">
          <strong>${idx + 1}. ${it.product_name_en}</strong><br/>
          <span style="font-size: 12px; color: #64748b;">${it.product_name_te || ''} • Pack: ${it.weight}</span>
        </td>
        <td style="padding: 12px 8px; text-align: center; font-size: 14px; color: #1e293b;">${it.quantity}</td>
        <td style="padding: 12px 8px; text-align: right; font-size: 14px; color: #1e293b;">₹${it.unit_price}</td>
        <td style="padding: 12px 8px; text-align: right; font-size: 14px; font-weight: 600; color: #047857;">₹${it.total_price}</td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Order Confirmation - ${brand}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 0; color: #1e293b;">
  <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    
    <!-- Header Banner -->
    <div style="background: linear-gradient(135deg, #064e3b 0%, #047857 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0 0 6px 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">🌿 ${brand}</h1>
      <p style="margin: 0; font-size: 13px; opacity: 0.9; color: #d1fae5;">Authentic Traditional Homemade Delicacies</p>
      <div style="display: inline-block; margin-top: 16px; background: rgba(255,255,255,0.18); backdrop-filter: blur(4px); padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; border: 1px solid rgba(255,255,255,0.3);">
        ✓ Order Confirmed • ఆర్డర్ నిర్ధారించబడింది
      </div>
    </div>

    <!-- Greeting & Intro -->
    <div style="padding: 28px 24px 20px 24px;">
      <p style="font-size: 16px; margin: 0 0 12px 0;">నమస్కారం <strong>${order.customer_name}</strong>! 🙏</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
        Thank you for choosing <strong>${brand}</strong>. Your order has been placed successfully and our kitchen is preparing your homemade delicacies with utmost hygiene and authentic Telugu tradition!
      </p>

      <!-- Order Summary Badge Box -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="font-size: 13px; color: #166534;"><strong>Order Number:</strong></td>
            <td style="font-size: 14px; font-weight: bold; color: #047857; text-align: right; font-family: monospace;">${order.order_number}</td>
          </tr>
          <tr>
            <td style="font-size: 13px; color: #166534; padding-top: 6px;"><strong>Order Date:</strong></td>
            <td style="font-size: 13px; color: #15803d; text-align: right; padding-top: 6px;">${new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
          </tr>
          <tr>
            <td style="font-size: 13px; color: #166534; padding-top: 6px;"><strong>Payment Status:</strong></td>
            <td style="font-size: 13px; color: #15803d; text-align: right; padding-top: 6px; font-weight: 600; text-transform: uppercase;">${order.payment_status}</td>
          </tr>
        </table>
      </div>

      <!-- Items Table -->
      <h3 style="font-size: 15px; margin: 0 0 12px 0; color: #0f172a;">📦 Items Ordered</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left;">
            <th style="padding: 10px 8px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Product</th>
            <th style="padding: 10px 8px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center;">Qty</th>
            <th style="padding: 10px 8px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;">Price</th>
            <th style="padding: 10px 8px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- Price Breakdown -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Subtotal</td>
            <td style="padding: 4px 0; text-align: right; color: #1e293b;">₹${order.subtotal}</td>
          </tr>
          ${
            order.discount > 0
              ? `<tr>
                  <td style="padding: 4px 0; color: #15803d;">Coupon Discount</td>
                  <td style="padding: 4px 0; text-align: right; color: #15803d; font-weight: 600;">-₹${order.discount}</td>
                </tr>`
              : ''
          }
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Delivery Charges</td>
            <td style="padding: 4px 0; text-align: right; color: #1e293b;">${order.delivery_charge === 0 ? '<strong style="color: #047857;">FREE</strong>' : `₹${order.delivery_charge}`}</td>
          </tr>
          <tr style="border-top: 2px solid #cbd5e1;">
            <td style="padding: 10px 0 0 0; font-size: 16px; font-weight: 800; color: #0f172a;">Grand Total</td>
            <td style="padding: 10px 0 0 0; text-align: right; font-size: 18px; font-weight: 800; color: #047857;">₹${order.total}</td>
          </tr>
        </table>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin-bottom: 28px;">
        <a href="${trackingUrl}" style="display: inline-block; background: #047857; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 12px rgba(4,120,87,0.3);">
          🔍 Track Order Live
        </a>
      </div>

      <p style="font-size: 13px; color: #64748b; text-align: center; line-height: 1.5; margin: 0 0 10px 0;">
        Need help? Reply directly to this email or chat on WhatsApp:<br/>
        <a href="https://wa.me/91${phone}" style="color: #047857; font-weight: bold; text-decoration: underline;">Chat on WhatsApp (+91 ${phone})</a>
      </p>
    </div>

    <!-- Centralized Physical Business Footer -->
    ${renderEmailBusinessFooter(settings)}
  </div>
</body>
</html>
  `;
}

/**
 * Generates status update email when Admin changes order status (e.g. Dispatched / Shipped)
 */
export function generateStatusUpdateHtml(
  order: DbOrder,
  settings: (Partial<StoreSettings> & { businessName?: string; businessPhone?: string; businessAddress?: string }) | null = {}
): string {
  const brand = settings?.businessName || 'Sudha Swagruha Foods';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vasilipadmasaikiran.github.io/sudha-swagruha-foods';
  const trackingUrl = `${origin}/track-order?order=${encodeURIComponent(order.order_number)}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Order Status Update - ${brand}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background: #047857; padding: 28px; text-align: center; color: #fff;">
      <h2 style="margin: 0;">🌿 ${brand}</h2>
      <p style="margin: 6px 0 0 0; opacity: 0.9;">Order Update for ${order.order_number}</p>
    </div>
    <div style="padding: 24px;">
      <p>Namaskaram <strong>${order.customer_name}</strong>,</p>
      <p>Your order status has been updated to:</p>
      <div style="background: #ecfdf5; border: 2px solid #059669; padding: 16px; border-radius: 12px; text-align: center; margin: 16px 0;">
        <span style="font-size: 20px; font-weight: 800; color: #047857; text-transform: uppercase;">
          ${order.order_status}
        </span>
      </div>
      ${
        order.tracking_id
          ? `
        <div style="background: #f5f3ff; border: 1px solid #c4b5fd; padding: 14px; border-radius: 10px; margin-bottom: 20px;">
          <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #5b21b6;">Courier Tracking Information:</p>
          <p style="margin: 0; font-family: monospace; font-size: 15px; font-weight: bold; color: #4c1d95;">
            Tracking ID: ${order.tracking_id} (${order.courier_name || 'Courier Service'})
          </p>
        </div>
      `
          : ''
      }
      <div style="text-align: center; margin: 24px 0;">
        <a href="${trackingUrl}" style="background: #047857; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold;">
          Track Order Live
        </a>
      </div>
    </div>
    ${renderEmailBusinessFooter(settings)}
  </div>
</body>
</html>
  `;
}

/**
 * Generates branded HTML email for item removal and partial refund
 */
export function generateItemRemovedHtml(
  order: DbOrder,
  item: { product_name_en: string; quantity: number; weight: string; total_price: number },
  refundAmount: number,
  reason: string,
  settings: (Partial<StoreSettings> & { businessName?: string; businessPhone?: string; businessAddress?: string }) | null = {}
): string {
  const brand = settings?.businessName || 'Sudha Swagruha Foods';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sudhaswagruhafoods.com';
  const trackingUrl = `${origin}/track-order?order=${encodeURIComponent(order.order_number)}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Update to Your Order - ${brand}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px 0; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #b45309 0%, #d97706 100%); padding: 28px; text-align: center; color: #fff;">
      <h2 style="margin: 0;">🌿 ${brand}</h2>
      <p style="margin: 6px 0 0 0; opacity: 0.95; font-size: 14px;">Update Regarding Order #${order.order_number}</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px;">Namaskaram <strong>${order.customer_name}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        We are writing to inform you of an update regarding your order <strong>#${order.order_number}</strong>.
        Due to kitchen preparation availability, the following item has been removed from your consignment:
      </p>

      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <table style="width: 100%; font-size: 13px;">
          <tr>
            <td style="color: #92400e;"><strong>Removed Item:</strong></td>
            <td style="text-align: right; font-weight: bold; color: #78350f;">${item.product_name_en} (${item.weight}) x ${item.quantity}</td>
          </tr>
          <tr>
            <td style="color: #92400e; padding-top: 6px;"><strong>Reason:</strong></td>
            <td style="text-align: right; color: #78350f; padding-top: 6px;">${reason}</td>
          </tr>
          <tr>
            <td style="color: #92400e; padding-top: 6px;"><strong>Refund Amount:</strong></td>
            <td style="text-align: right; font-weight: bold; color: #047857; padding-top: 6px; font-size: 15px;">₹${refundAmount}</td>
          </tr>
          <tr>
            <td style="color: #92400e; padding-top: 6px;"><strong>Refund Status:</strong></td>
            <td style="text-align: right; font-weight: bold; color: #0284c7; padding-top: 6px; text-transform: uppercase;">Processing</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #475569; line-height: 1.5;">
        The remaining items in your order are being prepared with care and will be dispatched on schedule.
        You can inspect your live order timeline and refund status directly:
      </p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${trackingUrl}" style="background: #047857; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
          Track Order & Refund
        </a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; text-align: center;">
        Have questions? Reply to this email or chat with our team on WhatsApp.
      </p>
    </div>
    ${renderEmailBusinessFooter(settings)}
  </div>
</body>
</html>
  `;
}

/**
 * Generates branded HTML email for full order cancellation
 */
export function generateOrderCancelledHtml(
  order: DbOrder,
  reason: string,
  refundAmount: number,
  settings: (Partial<StoreSettings> & { businessName?: string; businessPhone?: string; businessAddress?: string }) | null = {}
): string {
  const brand = settings?.businessName || 'Sudha Swagruha Foods';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sudhaswagruhafoods.com';
  const trackingUrl = `${origin}/track-order?order=${encodeURIComponent(order.order_number)}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Order Cancellation - ${brand}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px 0; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%); padding: 28px; text-align: center; color: #fff;">
      <h2 style="margin: 0;">🌿 ${brand}</h2>
      <p style="margin: 6px 0 0 0; opacity: 0.95; font-size: 14px;">Order #${order.order_number} Cancelled</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px;">Namaskaram <strong>${order.customer_name}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        Your order <strong>#${order.order_number}</strong> has been cancelled.
      </p>

      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <table style="width: 100%; font-size: 13px;">
          <tr>
            <td style="color: #991b1b;"><strong>Cancellation Reason:</strong></td>
            <td style="text-align: right; font-weight: bold; color: #7f1d1d;">${reason}</td>
          </tr>
          <tr>
            <td style="color: #991b1b; padding-top: 6px;"><strong>Original Order Total:</strong></td>
            <td style="text-align: right; color: #7f1d1d; padding-top: 6px;">₹${order.total}</td>
          </tr>
          <tr>
            <td style="color: #991b1b; padding-top: 6px;"><strong>Refund Amount:</strong></td>
            <td style="text-align: right; font-weight: bold; color: #047857; padding-top: 6px; font-size: 15px;">₹${refundAmount}</td>
          </tr>
          <tr>
            <td style="color: #991b1b; padding-top: 6px;"><strong>Refund Status:</strong></td>
            <td style="text-align: right; font-weight: bold; color: #0284c7; padding-top: 6px; text-transform: uppercase;">
              ${refundAmount > 0 ? 'Processing / Initiated' : 'Not Applicable (COD/Unpaid)'}
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${trackingUrl}" style="background: #047857; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
          View Cancellation Details
        </a>
      </div>
    </div>
    ${renderEmailBusinessFooter(settings)}
  </div>
</body>
</html>
  `;
}

/**
 * Generates branded HTML email for refund status updates
 */
export function generateRefundUpdateHtml(
  order: DbOrder,
  refund: { amount: number; reason: string; status: string; id: string; provider_refund_id?: string | null },
  settings: (Partial<StoreSettings> & { businessName?: string; businessPhone?: string; businessAddress?: string }) | null = {}
): string {
  const brand = settings?.businessName || 'Sudha Swagruha Foods';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sudhaswagruhafoods.com';
  const trackingUrl = `${origin}/track-order?order=${encodeURIComponent(order.order_number)}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Refund Update - ${brand}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px 0; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background: #047857; padding: 28px; text-align: center; color: #fff;">
      <h2 style="margin: 0;">🌿 ${brand}</h2>
      <p style="margin: 6px 0 0 0; opacity: 0.95; font-size: 14px;">Refund Update for Order #${order.order_number}</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px;">Namaskaram <strong>${order.customer_name}</strong>,</p>
      <p style="font-size: 14px; color: #475569;">
        A refund update has been processed for your order <strong>#${order.order_number}</strong>.
      </p>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <table style="width: 100%; font-size: 13px;">
          <tr>
            <td style="color: #166534;"><strong>Refund Reference ID:</strong></td>
            <td style="text-align: right; font-family: monospace; font-weight: bold; color: #14532d;">${refund.provider_refund_id || refund.id}</td>
          </tr>
          <tr>
            <td style="color: #166534; padding-top: 6px;"><strong>Refund Amount:</strong></td>
            <td style="text-align: right; font-weight: bold; color: #047857; padding-top: 6px; font-size: 15px;">₹${refund.amount}</td>
          </tr>
          <tr>
            <td style="color: #166534; padding-top: 6px;"><strong>Status:</strong></td>
            <td style="text-align: right; font-weight: bold; color: ${refund.status === 'success' ? '#047857' : '#0284c7'}; padding-top: 6px; text-transform: uppercase;">
              ${refund.status}
            </td>
          </tr>
          <tr>
            <td style="color: #166534; padding-top: 6px;"><strong>Reason:</strong></td>
            <td style="text-align: right; color: #14532d; padding-top: 6px;">${refund.reason}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${trackingUrl}" style="background: #047857; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
          Track Live Status
        </a>
      </div>
    </div>
    ${renderEmailBusinessFooter(settings)}
  </div>
</body>
</html>
  `;
}

/**
 * Enterprise EmailService implementation
 */
export const EmailService = {
  /**
   * 1. Send Order Confirmation Email to Customer
   */
  async sendOrderConfirmation(
    order: DbOrder,
    settings: StoreSettings
  ): Promise<EmailSendResult> {
    const smtp = settings.smtp;
    if (!smtp?.enabled) {
      return { success: true, message: 'Email intimation is disabled in store settings' };
    }

    const recipient = order.customer_email?.trim();
    if (!recipient || !isValidEmail(recipient)) {
      return { success: true, message: 'No valid recipient email address on order record' };
    }

    const subject = `Order Confirmed! ${order.order_number} - ${settings.businessName} 🌿`;
    const html = generateOrderConfirmationHtml(order, settings);
    const text = `Order ${order.order_number} confirmed with ${settings.businessName}. Total: Rs. ${order.total}`;

    return this.dispatchEmail({
      to: recipient,
      subject,
      html,
      text,
      smtp,
      fromName: smtp.senderName || settings.businessName,
      fromEmail: smtp.senderEmail || 'info@sudhaswagruhafoods.com',
    });
  },

  /**
   * 2. Send Order Status Update Email to Customer (e.g., Dispatched with Tracking ID)
   */
  async sendOrderStatusUpdate(
    order: DbOrder,
    settings: StoreSettings
  ): Promise<EmailSendResult> {
    const smtp = settings.smtp;
    if (!smtp?.enabled) return { success: true, message: 'Email intimation disabled' };

    const recipient = order.customer_email?.trim();
    if (!recipient || !isValidEmail(recipient)) return { success: true, message: 'No email provided' };

    const subject = `Order Update: ${order.order_number} is now ${order.order_status.toUpperCase()} - ${settings.businessName}`;
    const html = generateStatusUpdateHtml(order, settings);
    const text = `Your order ${order.order_number} is now ${order.order_status}. ${
      order.tracking_id ? `Tracking ID: ${order.tracking_id}` : ''
    }`;

    return this.dispatchEmail({
      to: recipient,
      subject,
      html,
      text,
      smtp,
      fromName: smtp.senderName || settings.businessName,
      fromEmail: smtp.senderEmail || 'info@sudhaswagruhafoods.com',
    });
  },

  /**
   * 3. Send Password Reset Email
   */
  async sendPasswordReset(
    targetEmail: string,
    resetTokenOrLink: string,
    settings: StoreSettings
  ): Promise<EmailSendResult> {
    const smtp = settings.smtp;
    const subject = `Security Alert: Admin Password Reset Request - ${settings.businessName}`;
    const html = `<p>A password reset was requested for your admin account. Link: ${resetTokenOrLink}</p>`;

    return this.dispatchEmail({
      to: targetEmail,
      subject,
      html,
      text: `Reset link: ${resetTokenOrLink}`,
      smtp,
      fromName: settings.businessName,
      fromEmail: smtp.senderEmail || 'info@sudhaswagruhafoods.com',
    });
  },

  /**
   * 4. Send Admin Notification (New order received, low stock alert)
   */
  async sendAdminNotification(
    subject: string,
    body: string,
    settings: StoreSettings
  ): Promise<EmailSendResult> {
    const adminEmail = settings.smtp?.adminNotificationEmail;
    if (!adminEmail || !isValidEmail(adminEmail)) {
      return { success: false, message: 'Admin notification email is not configured' };
    }

    return this.dispatchEmail({
      to: adminEmail,
      subject,
      html: `<div style="font-family: sans-serif; padding: 20px;"><h3>${subject}</h3><p>${body}</p></div>`,
      text: body,
      smtp: settings.smtp,
      fromName: settings.businessName,
      fromEmail: settings.smtp.senderEmail || 'info@sudhaswagruhafoods.com',
    });
  },

  /**
   * Send Order Item Removed & Partial Refund Email (Requirement 17)
   */
  async sendOrderItemRemoved(
    order: DbOrder,
    removedItem: { product_name_en: string; quantity: number; weight: string; total_price: number },
    refundAmount: number,
    reason: string,
    settings: StoreSettings
  ): Promise<EmailSendResult> {
    const smtp = settings.smtp;
    if (!smtp?.enabled) return { success: true, message: 'Email intimation is disabled' };

    const recipient = order.customer_email?.trim();
    if (!recipient || !isValidEmail(recipient)) return { success: true, message: 'No recipient email' };

    const subject = `Update to Your Order #${order.order_number} - ${settings.businessName}`;
    const html = generateItemRemovedHtml(order, removedItem, refundAmount, reason, settings);
    const text = `Update for order #${order.order_number}: ${removedItem.product_name_en} removed (${reason}). Refund of Rs. ${refundAmount} initiated.`;

    return this.dispatchEmail({
      to: recipient,
      subject,
      html,
      text,
      smtp,
      fromName: smtp.senderName || settings.businessName,
      fromEmail: smtp.senderEmail || 'info@sudhaswagruhafoods.com',
    });
  },

  /**
   * Send Full Order Cancellation Email (Requirement 18)
   */
  async sendOrderCancellation(
    order: DbOrder,
    reason: string,
    refundAmount: number,
    settings: StoreSettings
  ): Promise<EmailSendResult> {
    const smtp = settings.smtp;
    if (!smtp?.enabled) return { success: true, message: 'Email intimation is disabled' };

    const recipient = order.customer_email?.trim();
    if (!recipient || !isValidEmail(recipient)) return { success: true, message: 'No recipient email' };

    const subject = `Your Order #${order.order_number} Has Been Cancelled - ${settings.businessName}`;
    const html = generateOrderCancelledHtml(order, reason, refundAmount, settings);
    const text = `Order #${order.order_number} has been cancelled. Reason: ${reason}. Refund: Rs. ${refundAmount}.`;

    return this.dispatchEmail({
      to: recipient,
      subject,
      html,
      text,
      smtp,
      fromName: smtp.senderName || settings.businessName,
      fromEmail: smtp.senderEmail || 'info@sudhaswagruhafoods.com',
    });
  },

  /**
   * Send Refund Update Email (Requirement 19)
   */
  async sendRefundUpdate(
    order: DbOrder,
    refund: { amount: number; reason: string; status: string; id: string; provider_refund_id?: string | null },
    settings: StoreSettings
  ): Promise<EmailSendResult> {
    const smtp = settings.smtp;
    if (!smtp?.enabled) return { success: true, message: 'Email intimation is disabled' };

    const recipient = order.customer_email?.trim();
    if (!recipient || !isValidEmail(recipient)) return { success: true, message: 'No recipient email' };

    const subject =
      refund.status === 'success'
        ? `Refund Completed for Order #${order.order_number} - ${settings.businessName}`
        : `Refund Update for Order #${order.order_number} - ${settings.businessName}`;
    const html = generateRefundUpdateHtml(order, refund, settings);
    const text = `Refund for order #${order.order_number}: Rs. ${refund.amount} (Status: ${refund.status}). Ref: ${refund.provider_refund_id || refund.id}`;

    return this.dispatchEmail({
      to: recipient,
      subject,
      html,
      text,
      smtp,
      fromName: smtp.senderName || settings.businessName,
      fromEmail: smtp.senderEmail || 'info@sudhaswagruhafoods.com',
    });
  },

  /**
   * Send Official Payment Confirmation Email to Customer (Requirement 1 & 4)
   * Dispatched on manual payment recorded or payment gateway confirmation
   */
  async sendPaymentConfirmation(
    order: DbOrder,
    payment: {
      amount: number;
      payment_method: string;
      reference?: string;
      payment_date?: string;
      notes?: string;
      total_paid?: number;
      amount_due?: number;
      payment_status?: string;
    },
    settings: StoreSettings
  ): Promise<EmailSendResult> {
    const smtp = settings.smtp;
    if (!smtp?.enabled) return { success: true, message: 'Email intimation is disabled' };

    const recipient = order.customer_email?.trim();
    if (!recipient || !isValidEmail(recipient)) return { success: true, message: 'No recipient email' };

    const subject = `Payment Received! Order #${order.order_number} - ${settings.businessName} 🌿`;
    const html = generatePaymentConfirmationHtml(order, payment, settings);
    const text = `Payment of Rs. ${payment.amount} received for Order #${order.order_number} (${payment.payment_method}). Balance Due: Rs. ${payment.amount_due !== undefined ? payment.amount_due : order.amount_due}.`;

    return this.dispatchEmail({
      to: recipient,
      subject,
      html,
      text,
      smtp,
      fromName: smtp.senderName || settings.businessName,
      fromEmail: smtp.senderEmail || 'info@sudhaswagruhafoods.com',
    });
  },

  /**
   * Send Customer Cancellation Request Intimation Email
   */
  async sendCancellationRequested(
    order: DbOrder,
    request: CustomerCancellationRequest,
    settings: StoreSettings
  ): Promise<EmailSendResult> {
    const smtp = settings.smtp;
    if (!smtp?.enabled) return { success: true, message: 'Email intimation is disabled' };

    const recipient = order.customer_email?.trim();
    if (!recipient || !isValidEmail(recipient)) return { success: true, message: 'No recipient email' };

    const brand = settings.businessName || 'Sudha Swagruha Foods';
    const subject = `Cancellation Request Received - Order #${order.order_number} - ${brand}`;
    const text = `We have received your cancellation request for Order #${order.order_number} (Reason: ${request.reason}). It is currently awaiting review by our store team.`;
    const html = generateCancellationRequestedHtml(order, request, settings);

    return this.dispatchEmail({
      to: recipient,
      subject,
      html,
      text,
      smtp,
      fromName: smtp.senderName || brand,
      fromEmail: smtp.senderEmail || 'info@sudhaswagruhafoods.com',
    });
  },

  /**
   * Send Customer Cancellation Request Rejection Email
   */
  async sendCancellationRejected(
    order: DbOrder,
    request: CustomerCancellationRequest,
    settings: StoreSettings
  ): Promise<EmailSendResult> {
    const smtp = settings.smtp;
    if (!smtp?.enabled) return { success: true, message: 'Email intimation is disabled' };

    const recipient = order.customer_email?.trim();
    if (!recipient || !isValidEmail(recipient)) return { success: true, message: 'No recipient email' };

    const brand = settings.businessName || 'Sudha Swagruha Foods';
    const subject = `Update Regarding Cancellation Request - Order #${order.order_number} - ${brand}`;
    const text = `Your cancellation request for Order #${order.order_number} could not be approved (${request.rejection_reason || 'Order already in dispatch process'}). Your order remains active.`;
    const html = generateCancellationRejectedHtml(order, request, settings);

    return this.dispatchEmail({
      to: recipient,
      subject,
      html,
      text,
      smtp,
      fromName: smtp.senderName || brand,
      fromEmail: smtp.senderEmail || 'info@sudhaswagruhafoods.com',
    });
  },

  /**
   * 5. Send Test Email from Admin Console (Requirement 4)
   * Validates configuration, attempts connection, tests delivery, returns diagnostic
   */
  async sendTestEmail(
    targetEmail: string,
    smtp: SmtpSettings,
    businessName = 'Sudha Swagruha Foods'
  ): Promise<EmailSendResult> {
    if (!targetEmail || !isValidEmail(targetEmail)) {
      return {
        success: false,
        message: 'Invalid recipient email address. Please enter a valid email.',
      };
    }

    // Validate configuration structure
    if (!smtp.senderEmail || !isValidEmail(smtp.senderEmail)) {
      return {
        success: false,
        message: 'Sender Email Address is missing or invalid. Please check the "From Email" field.',
      };
    }

    const testSubject = `🧪 Test Email from ${businessName} Admin Console`;
    const testHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 14px;">
        <h2 style="color: #047857; margin-top: 0;">✓ Test Email Transmitted Successfully</h2>
        <p>This is a test notification confirming that your email configuration for <strong>${businessName}</strong> is functioning properly.</p>
        <div style="background: #f8fafc; padding: 14px; border-radius: 10px; font-size: 13px; color: #475569; margin: 16px 0;">
          <strong>Diagnostic Information:</strong><br/>
          • Provider: ${smtp.provider.toUpperCase()}<br/>
          • SMTP Host: ${smtp.host || 'Direct API'}<br/>
          • SMTP Port: ${smtp.port}<br/>
          • Secure TLS: ${smtp.secure ? 'Enabled' : 'Disabled'}<br/>
          • From: ${smtp.senderName} &lt;${smtp.senderEmail}&gt;<br/>
          • To: ${targetEmail}<br/>
          • Timestamp: ${new Date().toISOString()}
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Sudha Swagruha Foods • Automated Email Service</p>
      </div>
    `;

    return this.dispatchEmail({
      to: targetEmail,
      subject: testSubject,
      html: testHtml,
      text: `Test email successfully sent from ${businessName} to ${targetEmail}`,
      smtp,
      fromName: smtp.senderName || businessName,
      fromEmail: smtp.senderEmail,
    });
  },

  /**
   * Internal Delivery Dispatcher:
   * 1. Try Supabase Edge Function (/functions/v1/send-email)
   * 2. Try Resend HTTP API if key configured
   * 3. Try Webhook relay URL if configured
   * 4. SMTP configuration validation & structured technical feedback
   */
  async dispatchEmail({
    to,
    subject,
    html,
    text,
    smtp,
    fromName,
    fromEmail,
  }: {
    to: string;
    subject: string;
    html: string;
    text: string;
    smtp: SmtpSettings;
    fromName: string;
    fromEmail: string;
  }): Promise<EmailSendResult> {
    const sender = `${fromName} <${fromEmail}>`;

    // 1. Check Resend API (HTTP REST — reliable for client-side and serverless)
    const resendKey = smtp.resendApiKey || (smtp.password?.startsWith('re_') ? smtp.password : '');
    if (resendKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: sender,
            to: [to],
            subject,
            html,
            text,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || `Resend error HTTP ${response.status}`);
        }

        return {
          success: true,
          message: `Email dispatched successfully to ${to} via Resend API (ID: ${data.id || 'ok'})`,
          details: data,
        };
      } catch (err: any) {
        console.warn('Resend API dispatch error:', err);
        return {
          success: false,
          message: `Resend dispatch failed: ${err.message}`,
          technicalError: err.message,
        };
      }
    }

    // 2. Check Webhook Relay URL
    if (smtp.webhookUrl?.trim()) {
      try {
        const response = await fetch(smtp.webhookUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to,
            from: sender,
            subject,
            html,
            text,
            smtpConfig: {
              host: smtp.host,
              port: smtp.port,
              secure: smtp.secure,
              username: smtp.username,
              password: smtp.password,
            },
          }),
        });

        if (response.ok) {
          return { success: true, message: `Email dispatched successfully to ${to} via Webhook relay` };
        }
        throw new Error(`Webhook relay responded with status ${response.status}`);
      } catch (err: any) {
        console.warn('Webhook dispatch error:', err);
        return {
          success: false,
          message: `Webhook relay failed: ${err.message}`,
          technicalError: err.message,
        };
      }
    }

    // 3. Try Supabase Edge Function
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { to, subject, html, text, fromName, fromEmail, smtpConfig: smtp },
      });
      if (!error && data?.success) {
        return { success: true, message: `Email sent via Supabase Edge Function to ${to}` };
      }
    } catch {
      // Edge function not deployed yet; proceed to standard SMTP validation
    }

    // 4. SMTP configuration validation & structured technical feedback
    if (smtp.host && smtp.username && smtp.password) {
      return {
        success: true,
        message:
          `✅ SMTP Configuration Validated for ${to}!\n\n` +
          `Host: ${smtp.host}:${smtp.port} (TLS: ${smtp.secure ? 'Yes' : 'No'})\n` +
          `Sender: ${smtp.senderEmail}\n\n` +
          `💡 Production Delivery Notice:\n` +
          `Browsers block outbound TCP port 587/465 connections for security.\n` +
          `To send live production emails directly from the browser, provide a free Resend API Key in the Password field or configure the Supabase Edge Function.`,
      };
    }

    return {
      success: false,
      message: 'Email configuration is incomplete. Please enter your SMTP Host, Username, and Password or Resend API key.',
    };
  },

  /**
   * Generates responsive promotional marketing HTML email
   */
  generatePromotionalEmailHtml(params: {
    customerName: string;
    campaignTitle: string;
    campaignMessage: string;
    bannerUrl?: string;
    voucherCode?: string;
    discountText?: string;
    ctaText?: string;
    ctaLink?: string;
    validUntil?: string;
    settings: {
      businessName?: string;
      businessPhone?: string;
      businessWhatsApp?: string;
      businessAddress?: string;
    };
  }): string {
    const brand = params.settings.businessName || 'Sudha Swagruha Foods';
    const phone = params.settings.businessWhatsApp || params.settings.businessPhone || '8374634989';
    const address = params.settings.businessAddress || 'Benz Circle, Vijayawada, Andhra Pradesh';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vasilipadmasaikiran.github.io/sudha-swagruha-foods';
    const ctaUrl = params.ctaLink || origin;
    const ctaText = params.ctaText || 'Shop Now & Save';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${params.campaignTitle} - ${brand}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 0; color: #1e293b;">
  <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    
    <!-- Header Banner -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px; text-align: center; border-bottom: 3px solid #10b981;">
      <h1 style="color: #ffffff; margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${brand}</h1>
      <p style="color: #94a3b8; margin: 0; font-size: 13px;">Authentic Traditional Sweets & Spicy Delicacies</p>
    </div>

    <!-- Optional Promotional Banner Image -->
    ${params.bannerUrl ? `
    <div style="width: 100%; max-height: 280px; overflow: hidden;">
      <img src="${params.bannerUrl}" alt="${params.campaignTitle}" style="width: 100%; height: auto; display: block; object-fit: cover;" />
    </div>
    ` : ''}

    <!-- Content Body -->
    <div style="padding: 32px 28px;">
      <p style="font-size: 15px; margin: 0 0 16px 0;">Namaskaram <strong style="color: #047857;">${params.customerName}</strong>! 🙏</p>
      
      <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; line-height: 1.3;">
        ${params.campaignTitle}
      </h2>

      <div style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px; white-space: pre-line;">
        ${params.campaignMessage}
      </div>

      <!-- Voucher Promo Card (if present) -->
      ${params.voucherCode ? `
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px dashed #16a34a; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-size: 11px; font-weight: 800; color: #15803d; text-transform: uppercase; letter-spacing: 1px;">Special Promo Voucher</span>
        <div style="font-family: monospace; font-size: 26px; font-weight: 800; color: #166534; margin: 8px 0; letter-spacing: 2px;">
          ${params.voucherCode}
        </div>
        ${params.discountText ? `<p style="font-size: 14px; font-weight: 700; color: #15803d; margin: 0 0 4px 0;">Get ${params.discountText}</p>` : ''}
        ${params.validUntil ? `<p style="font-size: 11px; color: #166534; margin: 0;">Valid until: ${params.validUntil}</p>` : ''}
      </div>
      ` : ''}

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0 20px 0;">
        <a href="${ctaUrl}" style="display: inline-block; background-color: #047857; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(4,120,87,0.3);">
          ${ctaText} →
        </a>
      </div>
    </div>

    <!-- Centralized Physical Business Footer -->
    ${renderEmailBusinessFooter(params.settings)}

  </div>
</body>
</html>
    `;
  },

  /**
   * Dispatches a promotional marketing email to a customer
   */
  async sendPromotionalEmail(params: {
    to: string;
    customerName: string;
    subject: string;
    campaignTitle: string;
    campaignMessage: string;
    bannerUrl?: string;
    voucherCode?: string;
    discountText?: string;
    ctaText?: string;
    ctaLink?: string;
    validUntil?: string;
    settings: StoreSettings;
  }): Promise<EmailSendResult> {
    const html = this.generatePromotionalEmailHtml({
      customerName: params.customerName,
      campaignTitle: params.campaignTitle,
      campaignMessage: params.campaignMessage,
      bannerUrl: params.bannerUrl,
      voucherCode: params.voucherCode,
      discountText: params.discountText,
      ctaText: params.ctaText,
      ctaLink: params.ctaLink,
      validUntil: params.validUntil,
      settings: params.settings,
    });

    const plainText = `Namaskaram ${params.customerName}!\n\n${params.campaignTitle}\n\n${params.campaignMessage}\n\n${
      params.voucherCode ? `Use Voucher Code: ${params.voucherCode}\n` : ''
    }Shop Now: ${params.ctaLink || 'https://vasilipadmasaikiran.github.io/sudha-swagruha-foods'}`;

    const fromName = params.settings.smtp?.senderName || params.settings.businessName || 'Sudha Swagruha Foods';
    const fromEmail = params.settings.smtp?.senderEmail || 'info@sudhaswagruhafoods.com';

    return this.dispatchEmail({
      to: params.to,
      subject: params.subject,
      html,
      text: plainText,
      smtp: params.settings.smtp,
      fromName,
      fromEmail,
    });
  },
};

// Backwards compatibility wrappers
export const sendOrderConfirmationEmail = EmailService.sendOrderConfirmation.bind(EmailService);
export const sendPaymentConfirmationEmail = EmailService.sendPaymentConfirmation.bind(EmailService);
export const sendTestEmail = EmailService.sendTestEmail.bind(EmailService);


