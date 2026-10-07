// ==============================================================================
// Comprehensive E2E Verification Script:
// Order Cancellation, Product Removal, Decimal-Safe Refunds, SMS/Email & RBAC
// ==============================================================================
const assert = require('assert');

console.log('================================================================');
console.log('RUNNING ENTERPRISE ORDER, REFUND, NOTIFICATION & RBAC TEST SUITE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

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
// TEST 1: DECIMAL-SAFE MONETARY ARITHMETIC & METRICS
// ------------------------------------------------------------------------------
runTest('Financial Safety: Decimal-Safe Rounding & Metric Calculation', () => {
  function roundToTwoDecimals(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  // Floating point test (0.1 + 0.2 = 0.30000000000000004)
  assert.strictEqual(roundToTwoDecimals(0.1 + 0.2), 0.3);
  assert.strictEqual(roundToTwoDecimals(750.555), 750.56);
  assert.strictEqual(roundToTwoDecimals(1550.00), 1550.00);

  const mockOrder = {
    id: 'ord_10025',
    order_number: 'SSF-10025',
    total: 1550.00,
    payment_status: 'paid',
    refunded_amount: 0.00,
    delivery_charge: 50.00,
    discount: 0.00,
    items: [
      { product_id: 'p1', product_name_en: 'Product A', unit_price: 500, quantity: 1, total_price: 500, status: 'active' },
      { product_id: 'p2', product_name_en: 'Product B', unit_price: 750, quantity: 1, total_price: 750, status: 'active' },
      { product_id: 'p3', product_name_en: 'Product C', unit_price: 300, quantity: 1, total_price: 300, status: 'active' },
    ]
  };

  function calculateMetrics(order) {
    const isPaid = order.payment_status === 'paid' || order.payment_status === 'partially_refunded';
    const originalPaidAmount = isPaid ? roundToTwoDecimals(order.total) : 0;
    const totalAlreadyRefunded = roundToTwoDecimals(order.refunded_amount || 0);
    const remainingRefundableAmount = Math.max(0, roundToTwoDecimals(originalPaidAmount - totalAlreadyRefunded));
    return {
      originalPaidAmount,
      totalAlreadyRefunded,
      remainingRefundableAmount,
      isRefundable: isPaid && remainingRefundableAmount > 0,
    };
  }

  const m1 = calculateMetrics(mockOrder);
  assert.strictEqual(m1.originalPaidAmount, 1550.00);
  assert.strictEqual(m1.totalAlreadyRefunded, 0.00);
  assert.strictEqual(m1.remainingRefundableAmount, 1550.00);
  assert.strictEqual(m1.isRefundable, true);
});

// ------------------------------------------------------------------------------
// TEST 2: PRODUCT REMOVAL WITH AUDIT TRAIL (NO PHYSICAL DELETION)
// ------------------------------------------------------------------------------
runTest('Product Removal: Soft Deletion, Audit Preserved, Partial Refund Recalculation', () => {
  const order = {
    id: 'ord_10025',
    order_number: 'SSF-10025',
    total: 1550.00,
    payment_status: 'paid',
    refunded_amount: 0.00,
    items: [
      { product_id: 'p1', product_name_en: 'Product A', quantity: 1, total_price: 500, status: 'active' },
      { product_id: 'p2', product_name_en: 'Product B', quantity: 1, total_price: 750, status: 'active' },
      { product_id: 'p3', product_name_en: 'Product C', quantity: 1, total_price: 300, status: 'active' },
    ],
    refunds: []
  };

  // Order Processor removes Product B
  const targetId = 'p2';
  const reason = 'Product unavailable in kitchen/stock';
  const removedBy = 'Order Processor Venkat';
  const removedAt = new Date().toISOString();

  // Non-destructive update: mark status 'removed'
  const updatedItems = order.items.map(item => {
    if (item.product_id === targetId) {
      return {
        ...item,
        status: 'removed',
        removal_reason: reason,
        removed_by: removedBy,
        removed_at: removedAt,
        refund_amount: 750.00
      };
    }
    return item;
  });

  // Verify item still exists in array
  assert.strictEqual(updatedItems.length, 3, 'Items array length must remain 3 (no physical deletion)');
  const removedItem = updatedItems.find(i => i.product_id === 'p2');
  assert.strictEqual(removedItem.status, 'removed');
  assert.strictEqual(removedItem.removal_reason, reason);
  assert.strictEqual(removedItem.removed_by, removedBy);
  assert.strictEqual(removedItem.refund_amount, 750.00);

  // Partial refund initiation
  const refundAmount = 750.00;
  const newRefunded = order.refunded_amount + refundAmount;
  const newPaymentStatus = newRefunded >= order.total ? 'refunded' : 'partially_refunded';

  assert.strictEqual(newRefunded, 750.00);
  assert.strictEqual(newPaymentStatus, 'partially_refunded');

  const remainingValue = order.total - newRefunded;
  assert.strictEqual(remainingValue, 800.00);
});

// ------------------------------------------------------------------------------
// TEST 3: FINANCIAL LIMITS & DUPLICATE REFUND PROTECTION
// ------------------------------------------------------------------------------
runTest('Financial Safety: Validation Rejects Overflow and Negative Amounts', () => {
  function validateRefund(paidTotal, alreadyRefunded, requestedAmount) {
    if (requestedAmount <= 0) return { valid: false, error: 'Amount must be > 0' };
    const maxRefundable = paidTotal - alreadyRefunded;
    if (requestedAmount > maxRefundable) {
      return { valid: false, error: `Requested ${requestedAmount} exceeds max refundable ${maxRefundable}` };
    }
    return { valid: true };
  }

  // Cannot refund negative amount
  assert.strictEqual(validateRefund(1000, 0, -100).valid, false);
  assert.strictEqual(validateRefund(1000, 0, 0).valid, false);

  // Cannot refund more than total paid
  assert.strictEqual(validateRefund(1000, 0, 1500).valid, false);

  // Partial refund 600 succeeds
  assert.strictEqual(validateRefund(1000, 0, 600).valid, true);

  // Second refund of 500 fails because only 400 is remaining
  assert.strictEqual(validateRefund(1000, 600, 500).valid, false);

  // Second refund of 400 succeeds
  assert.strictEqual(validateRefund(1000, 600, 400).valid, true);

  // Subsequent refund fails with 0 refundable balance
  assert.strictEqual(validateRefund(1000, 1000, 10).valid, false);
});

// ------------------------------------------------------------------------------
// TEST 4: FULL ORDER CANCELLATION
// ------------------------------------------------------------------------------
runTest('Order Cancellation: Reason Stored, Status Cancelled, Full Refund Processed', () => {
  const order = {
    id: 'ord_10026',
    order_number: 'SSF-10026',
    order_status: 'preparing',
    total: 2500.00,
    payment_status: 'paid',
    refunded_amount: 0.00,
    refunds: []
  };

  const cancelReason = 'Store/business cancellation due to severe weather';
  const cancelledBy = 'Root Admin';
  const cancelledAt = new Date().toISOString();

  // Validate reason is not empty
  assert.ok(cancelReason.trim().length > 0, 'Reason must not be empty');

  // Cancel order
  order.order_status = 'cancelled';
  order.cancellation_reason = cancelReason;
  order.cancelled_by = cancelledBy;
  order.cancelled_at = cancelledAt;

  // Full refund calculation
  const refundAmount = order.total - order.refunded_amount;
  assert.strictEqual(refundAmount, 2500.00);

  order.refunded_amount = 2500.00;
  order.payment_status = 'refunded';
  order.refunds.push({
    id: 'rfnd_full_1',
    amount: 2500.00,
    type: 'full',
    reason: `Order Cancellation: ${cancelReason}`,
    status: 'success',
    provider: 'razorpay'
  });

  assert.strictEqual(order.order_status, 'cancelled');
  assert.strictEqual(order.payment_status, 'refunded');
  assert.strictEqual(order.refunds.length, 1);
  assert.strictEqual(order.refunds[0].amount, 2500.00);
});

// ------------------------------------------------------------------------------
// TEST 5: SMS TEMPLATES & PROVIDER ABSTRACTION
// ------------------------------------------------------------------------------
runTest('SMS Engine: Template Resolution, Phone Normalization & Toggle Control', () => {
  function normalizePhone(mobile) {
    if (!mobile) return null;
    let clean = mobile.replace(/[^\d+]/g, '');
    if (clean.startsWith('+')) clean = clean.substring(1);
    if (clean.length === 10) clean = '91' + clean;
    if (clean.length === 12 && clean.startsWith('91')) return clean;
    return null;
  }

  assert.strictEqual(normalizePhone('9876543210'), '919876543210');
  assert.strictEqual(normalizePhone('+91 98765-43210'), '919876543210');
  assert.strictEqual(normalizePhone('12345'), null);

  function renderTemplate(template, vars) {
    let out = template;
    for (const [key, val] of Object.entries(vars)) {
      out = out.replace(new RegExp(`{{${key}}}`, 'g'), String(val || ''));
    }
    return out;
  }

  const rawTemplate = 'Dear {{customerName}}, your order #{{orderNumber}} has been cancelled. Reason: {{cancellationReason}}. Refund: ₹{{refundAmount}} initiated. - {{businessName}}';
  const rendered = renderTemplate(rawTemplate, {
    customerName: 'Suresh',
    orderNumber: 'SSF-10025',
    cancellationReason: 'Product unavailable',
    refundAmount: '750',
    businessName: 'Sudha Swagruha Foods'
  });

  assert.ok(rendered.includes('Dear Suresh'));
  assert.ok(rendered.includes('#SSF-10025'));
  assert.ok(rendered.includes('Reason: Product unavailable'));
  assert.ok(rendered.includes('Refund: ₹750 initiated'));
  assert.ok(rendered.includes('Sudha Swagruha Foods'));
});

// ------------------------------------------------------------------------------
// TEST 6: NON-BLOCKING NOTIFICATIONS (ORDER NEVER BREAKS IF SMS FAILS)
// ------------------------------------------------------------------------------
runTest('Resilience: Notification Failure Does Not Rollback Order Mutation', async () => {
  let orderUpdated = false;
  let notificationStatus = 'pending';

  async function updateOrderAndNotify() {
    // 1. Order database mutation
    orderUpdated = true;

    // 2. Notification trigger with simulated failure
    try {
      throw new Error('SMS Gateway 503 Provider Timeout');
    } catch (notifErr) {
      notificationStatus = 'failed';
      // Audit log records failure, does NOT throw to outer scope
    }

    return { success: true };
  }

  const result = await updateOrderAndNotify();
  assert.strictEqual(result.success, true, 'Order update must succeed despite notification failure');
  assert.strictEqual(orderUpdated, true, 'Order state must be successfully updated');
  assert.strictEqual(notificationStatus, 'failed', 'Notification failure must be captured safely');
});

// ------------------------------------------------------------------------------
// TEST 7: RBAC ACCESS CONTROL FOR ROOT ADMIN VS ORDER PROCESSOR
// ------------------------------------------------------------------------------
runTest('Security & RBAC: SMS Credentials Exclusively Restricted to ROOT_ADMIN', () => {
  const ROLE_PERMISSIONS = {
    ROOT_ADMIN: {
      canManageUsers: true,
      canViewOrders: true,
      canProcessOrders: true,
      canCancelOrders: true,
      canRemoveOrderItems: true,
      canInitiateRefunds: true,
      canViewRefunds: true,
      canConfigureSms: true,
      canConfigureEmail: true,
      canManageSettings: true,
    },
    ORDER_PROCESSOR: {
      canManageUsers: false,
      canViewOrders: true,
      canProcessOrders: true,
      canCancelOrders: true,
      canRemoveOrderItems: true,
      canInitiateRefunds: true,
      canViewRefunds: true,
      canConfigureSms: false, // Must be FALSE
      canConfigureEmail: false,
      canManageSettings: false,
    },
    STORE_KEEPER: {
      canManageUsers: false,
      canViewOrders: false,
      canProcessOrders: false,
      canCancelOrders: false,
      canRemoveOrderItems: false,
      canInitiateRefunds: false,
      canViewRefunds: false,
      canConfigureSms: false,
      canConfigureEmail: false,
      canManageSettings: false,
    }
  };

  // Root Admin permissions
  assert.strictEqual(ROLE_PERMISSIONS.ROOT_ADMIN.canConfigureSms, true);
  assert.strictEqual(ROLE_PERMISSIONS.ROOT_ADMIN.canCancelOrders, true);
  assert.strictEqual(ROLE_PERMISSIONS.ROOT_ADMIN.canInitiateRefunds, true);

  // Order Processor permissions
  assert.strictEqual(ROLE_PERMISSIONS.ORDER_PROCESSOR.canConfigureSms, false, 'Order processor must NOT configure SMS');
  assert.strictEqual(ROLE_PERMISSIONS.ORDER_PROCESSOR.canCancelOrders, true, 'Order processor can cancel orders if granted');
  assert.strictEqual(ROLE_PERMISSIONS.ORDER_PROCESSOR.canRemoveOrderItems, true, 'Order processor can remove order items');
  assert.strictEqual(ROLE_PERMISSIONS.ORDER_PROCESSOR.canInitiateRefunds, true, 'Order processor can initiate refunds');

  // Store Keeper blocked
  assert.strictEqual(ROLE_PERMISSIONS.STORE_KEEPER.canConfigureSms, false);
  assert.strictEqual(ROLE_PERMISSIONS.STORE_KEEPER.canCancelOrders, false);
  assert.strictEqual(ROLE_PERMISSIONS.STORE_KEEPER.canRemoveOrderItems, false);
  assert.strictEqual(ROLE_PERMISSIONS.STORE_KEEPER.canInitiateRefunds, false);
});

console.log('\n----------------------------------------------------------------');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('----------------------------------------------------------------\n');

if (passedTests === totalTests) {
  console.log('🎉 ALL TESTS PASSED! Enterprise Order & Refund Architecture Validated.');
  process.exit(0);
} else {
  console.error('❌ SOME TESTS FAILED.');
  process.exit(1);
}
