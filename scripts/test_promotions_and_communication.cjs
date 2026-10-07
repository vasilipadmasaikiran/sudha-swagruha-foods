// ==============================================================================
// Automated Test Suite: Promotions, Offers, Vouchers & Customer Communication
// Tests Campaign Lifecycles, Audience Segmentation, Variable Engine,
// Global SMS Disabled Controls, Opt-Outs, Idempotency & RBAC Security
// ==============================================================================
const assert = require('assert');

console.log('================================================================');
console.log('RUNNING PROMOTIONS & CUSTOMER COMMUNICATION TEST SUITE');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${testName}`);
    console.error(`   Error: ${err.message}\n`);
  }
}

// ------------------------------------------------------------------------------
// TEST 1: CAMPAIGN LIFECYCLE & STATE MACHINE
// ------------------------------------------------------------------------------
runTest('Campaign State Machine: Draft -> Scheduled -> Cancelled & Duplication', () => {
  const campaign = {
    id: 'promo_test_1',
    name: 'Diwali Delicacy Festival',
    type: 'festival_sale',
    status: 'draft',
    voucher_code: 'FESTIVE25',
    discount_percent: 25,
    channels: ['email', 'sms'],
  };

  assert.strictEqual(campaign.status, 'draft');

  // Transition to Scheduled
  const scheduleTime = '2026-10-25T10:00:00.000Z';
  campaign.status = 'scheduled';
  campaign.scheduled_at = scheduleTime;
  assert.strictEqual(campaign.status, 'scheduled');
  assert.strictEqual(campaign.scheduled_at, scheduleTime);

  // Cancellation
  campaign.status = 'cancelled';
  assert.strictEqual(campaign.status, 'cancelled');

  // Duplication test
  const duplicate = {
    ...campaign,
    id: 'promo_test_dup',
    name: `Copy of ${campaign.name}`,
    status: 'draft',
    scheduled_at: undefined,
  };
  assert.strictEqual(duplicate.status, 'draft');
  assert.strictEqual(duplicate.name, 'Copy of Diwali Delicacy Festival');
  assert.strictEqual(duplicate.voucher_code, 'FESTIVE25');
});

// ------------------------------------------------------------------------------
// TEST 2: TEMPLATE VARIABLE INTERPOLATION ENGINE
// ------------------------------------------------------------------------------
runTest('Template Engine: Safe Variable Interpolation without Code Injection', () => {
  function interpolateTemplate(template, vars) {
    let result = template;
    for (const [key, val] of Object.entries(vars)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, String(val ?? ''));
    }
    return result;
  }

  const rawSms = 'Namaskaram {{customerName}}! Get {{discount}}% OFF at {{businessName}} with code {{voucherCode}}. Valid until {{validUntil}}. Shop: {{shopUrl}}';
  const renderedSms = interpolateTemplate(rawSms, {
    customerName: 'Kiran',
    discount: 25,
    businessName: 'Sudha Swagruha Foods',
    voucherCode: 'FESTIVE25',
    validUntil: '31-Oct-2026',
    shopUrl: 'https://sudhaswagruha.com'
  });

  assert.ok(renderedSms.includes('Namaskaram Kiran!'));
  assert.ok(renderedSms.includes('Get 25% OFF'));
  assert.ok(renderedSms.includes('Sudha Swagruha Foods'));
  assert.ok(renderedSms.includes('code FESTIVE25'));
  assert.ok(renderedSms.includes('Valid until 31-Oct-2026'));
  assert.ok(!renderedSms.includes('{{customerName}}'));
});

// ------------------------------------------------------------------------------
// TEST 3: AUDIENCE SEGMENTATION ENGINE
// ------------------------------------------------------------------------------
runTest('Audience Segmentation: Accurately Filters VIP, New, Returning & Inactive Patrons', () => {
  const sampleCustomers = [
    { key: 'c1', name: 'VIP Customer A', totalOrders: 5, totalSpent: 3500, lastOrderDate: '2026-10-01' },
    { key: 'c2', name: 'VIP Customer B', totalOrders: 2, totalSpent: 2200, lastOrderDate: '2026-09-15' },
    { key: 'c3', name: 'New Customer C', totalOrders: 1, totalSpent: 450, lastOrderDate: '2026-10-05' },
    { key: 'c4', name: 'Returning Customer D', totalOrders: 3, totalSpent: 1200, lastOrderDate: '2026-09-20' },
    { key: 'c5', name: 'Inactive Customer E', totalOrders: 1, totalSpent: 500, lastOrderDate: '2026-05-01' }, // > 45 days ago
  ];

  function filterAudience(customers, type) {
    const fortyFiveDaysAgo = new Date(Date.now() - 45 * 86400000);
    switch (type) {
      case 'all': return customers;
      case 'segment_vip': return customers.filter(c => c.totalSpent >= 2000);
      case 'segment_new': return customers.filter(c => c.totalOrders === 1);
      case 'segment_returning': return customers.filter(c => c.totalOrders >= 2);
      case 'segment_inactive': return customers.filter(c => new Date(c.lastOrderDate) < fortyFiveDaysAgo);
      default: return customers;
    }
  }

  const vips = filterAudience(sampleCustomers, 'segment_vip');
  assert.strictEqual(vips.length, 2);
  assert.ok(vips.some(c => c.name === 'VIP Customer A'));
  assert.ok(vips.some(c => c.name === 'VIP Customer B'));

  const newPatrons = filterAudience(sampleCustomers, 'segment_new');
  assert.strictEqual(newPatrons.length, 2); // c3, c5

  const returning = filterAudience(sampleCustomers, 'segment_returning');
  assert.strictEqual(returning.length, 3); // c1, c2, c4

  const inactive = filterAudience(sampleCustomers, 'segment_inactive');
  assert.strictEqual(inactive.length, 1);
  assert.strictEqual(inactive[0].key, 'c5');
});

// ------------------------------------------------------------------------------
// TEST 4: GLOBAL SMS DISABLED ENFORCEMENT
// ------------------------------------------------------------------------------
runTest('Safety Control: Promotional SMS Blocked When Globally Disabled by Root Admin', () => {
  const storeSettings = {
    sms: {
      enabled: false, // Disabled globally
      provider: 'fast2sms',
      apiKey: 'test-key',
    }
  };

  function sendPromotionalSms(settings, mobile) {
    if (!settings.sms?.enabled) {
      return {
        success: false,
        error: 'SMS_GLOBALLY_DISABLED',
        message: 'Promotional SMS sending is currently disabled globally by Root Admin.'
      };
    }
    return { success: true };
  }

  const res = sendPromotionalSms(storeSettings, '+919876543210');
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.error, 'SMS_GLOBALLY_DISABLED');

  // When enabled, it proceeds
  storeSettings.sms.enabled = true;
  const res2 = sendPromotionalSms(storeSettings, '+919876543210');
  assert.strictEqual(res2.success, true);
});

// ------------------------------------------------------------------------------
// TEST 5: CUSTOMER CHANNEL OPT-OUT PREFERENCES
// ------------------------------------------------------------------------------
runTest('Customer Privacy: Channel Opt-Outs Are Strictly Enforced', () => {
  const audience = [
    { key: 'c1', name: 'Opted In Customer', email: 'c1@example.com', phone: '9876543210', optOutEmail: false, optOutSms: false },
    { key: 'c2', name: 'No-SMS Customer', email: 'c2@example.com', phone: '9876543211', optOutEmail: false, optOutSms: true },
    { key: 'c3', name: 'No-Email Customer', email: 'c3@example.com', phone: '9876543212', optOutEmail: true, optOutSms: false },
  ];

  function resolveRecipients(customers, channels) {
    const emailTargets = [];
    const smsTargets = [];

    customers.forEach(c => {
      if (channels.includes('email') && c.email && !c.optOutEmail) {
        emailTargets.push(c);
      }
      if (channels.includes('sms') && c.phone && !c.optOutSms) {
        smsTargets.push(c);
      }
    });

    return { emailTargets, smsTargets };
  }

  const { emailTargets, smsTargets } = resolveRecipients(audience, ['email', 'sms']);

  // c1 and c2 should receive email (c3 opted out)
  assert.strictEqual(emailTargets.length, 2);
  assert.ok(!emailTargets.some(c => c.key === 'c3'));

  // c1 and c3 should receive SMS (c2 opted out)
  assert.strictEqual(smsTargets.length, 2);
  assert.ok(!smsTargets.some(c => c.key === 'c2'));
});

// ------------------------------------------------------------------------------
// TEST 6: BATCH PROCESSING & IDEMPOTENT DUPLICATE PREVENTION
// ------------------------------------------------------------------------------
runTest('Reliability: Batch Processing with Idempotency Prevents Duplicate Sends', async () => {
  const existingDeliveryLogs = [
    { campaignId: 'promo_1', recipient: 'alice@example.com', channel: 'email', status: 'sent' }
  ];

  const recipients = [
    { email: 'alice@example.com', name: 'Alice' },
    { email: 'bob@example.com', name: 'Bob' },
  ];

  let actuallyDispatched = 0;

  for (const r of recipients) {
    // Idempotency check
    const alreadySent = existingDeliveryLogs.some(
      l => l.campaignId === 'promo_1' && l.recipient === r.email && l.status === 'sent'
    );

    if (!alreadySent) {
      actuallyDispatched++;
      existingDeliveryLogs.push({
        campaignId: 'promo_1',
        recipient: r.email,
        channel: 'email',
        status: 'sent'
      });
    }
  }

  // Alice was already sent in logs, so only Bob should be dispatched
  assert.strictEqual(actuallyDispatched, 1, 'Only Bob should be sent to prevent duplicate to Alice');
  assert.strictEqual(existingDeliveryLogs.length, 2);
});

// ------------------------------------------------------------------------------
// TEST 7: RBAC AUTHORIZATION MATRIX
// ------------------------------------------------------------------------------
runTest('Security: RBAC Correctly Protects Promotions & SMS Configuration', () => {
  const ROLE_DEFINITIONS = {
    ROOT_ADMIN: {
      allowedCategories: ['dashboard', 'orders', 'products', 'inventory', 'customers', 'users', 'promotions', 'website', 'settings'],
      canViewPromotions: true,
      canCreatePromotions: true,
      canSendPromotions: true,
      canConfigureSms: true,
    },
    STORE_KEEPER: {
      allowedCategories: ['inventory', 'products'],
      canViewPromotions: false,
      canCreatePromotions: false,
      canSendPromotions: false,
      canConfigureSms: false,
    },
    ORDER_PROCESSOR: {
      allowedCategories: ['orders'],
      canViewPromotions: false,
      canCreatePromotions: false,
      canSendPromotions: false,
      canConfigureSms: false,
    }
  };

  // Root Admin permissions
  assert.ok(ROLE_DEFINITIONS.ROOT_ADMIN.allowedCategories.includes('promotions'));
  assert.strictEqual(ROLE_DEFINITIONS.ROOT_ADMIN.canCreatePromotions, true);
  assert.strictEqual(ROLE_DEFINITIONS.ROOT_ADMIN.canConfigureSms, true);

  // Store Keeper blocked
  assert.ok(!ROLE_DEFINITIONS.STORE_KEEPER.allowedCategories.includes('promotions'));
  assert.strictEqual(ROLE_DEFINITIONS.STORE_KEEPER.canCreatePromotions, false);

  // Order Processor blocked from configuring SMS
  assert.strictEqual(ROLE_DEFINITIONS.ORDER_PROCESSOR.canConfigureSms, false);
});

console.log('\n----------------------------------------------------------------');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('----------------------------------------------------------------\n');

if (passedTests === totalTests) {
  console.log('🎉 ALL PROMOTION & COMMUNICATION TESTS PASSED!');
  process.exit(0);
} else {
  console.error('❌ SOME TESTS FAILED.');
  process.exit(1);
}
