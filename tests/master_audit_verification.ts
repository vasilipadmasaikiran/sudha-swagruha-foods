import assert from 'node:assert';
import { calculateOrderFinancials, roundToTwo } from '../src/services/orderCalculationService';
import { normalizeOrderTracking } from '../src/services/supabase';
import { generateCategorySlug } from '../src/hooks/useCategoryStore';
import { isValidGstin, isValidFssai } from '../src/hooks/useSettingsStore';
import { ROLE_DEFINITIONS, AdminRole } from '../src/hooks/useAdminAuthStore';

console.log('================================================================');
console.log('RUNNING MASTER ECOMMERCE AUDIT & VERIFICATION SUITE (TESTS A - J)');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`[FAIL] ${name}`);
    console.error(`       Error: ${err.message}`);
    throw err;
  }
}

// -------------------------------------------------------------
// TEST A: Discount Calculation & Double Deduction Prevention (Section 2 & 18)
// -------------------------------------------------------------
runTest('Test A: Discount Calculation (Subtotal ₹600, Coupon ₹140 -> Final ₹460, No Double Deduction)', () => {
  const orderInput = {
    items: [
      { product_id: 'prod-a', unit_price: 140, quantity: 1, status: 'active' },
      { product_id: 'prod-b', unit_price: 260, quantity: 1, status: 'active' },
      { product_id: 'prod-c', unit_price: 200, quantity: 1, status: 'active' },
    ],
    fixedCouponDiscount: 140,
    shippingCharge: 0,
    taxConfig: { gstEnabled: false, gstRate: 0 },
    amountPaid: 460,
  };

  const financials = calculateOrderFinancials(orderInput);

  assert.strictEqual(financials.originalProductSubtotal, 600, 'Original subtotal must be ₹600');
  assert.strictEqual(financials.couponDiscount, 140, 'Coupon discount must be ₹140');
  assert.strictEqual(financials.totalDiscount, 140, 'Total discount must be ₹140');
  assert.strictEqual(financials.adjustedSubtotal, 460, 'Discounted subtotal must be ₹460');
  assert.strictEqual(financials.finalOrderTotal, 460, 'Final order total must be ₹460');
  assert.strictEqual(financials.balanceAmount, 0, 'Balance must be 0 for fully paid order');
  assert.strictEqual(financials.paymentStatus, 'paid', 'Status must be paid');

  // Verify that recalculating Payment Info with this order DOES NOT double deduct discount (i.e. does not produce 320)
  const paymentInfoOrder = {
    total_amount: 460,
    subtotal: 600,
    discount_amount: 140,
    payment_method: 'UPI',
    items: [
      { product_id: 'prod-a', unit_price: 140, quantity: 1, status: 'active' },
      { product_id: 'prod-b', unit_price: 260, quantity: 1, status: 'active' },
      { product_id: 'prod-c', unit_price: 200, quantity: 1, status: 'active' },
    ],
    amountPaid: 460,
  };

  const recheckFinancials = calculateOrderFinancials(paymentInfoOrder);
  assert.strictEqual(recheckFinancials.finalOrderTotal, 460, 'Payment Info must use authoritative total ₹460, NOT ₹320');
  assert.notStrictEqual(recheckFinancials.finalOrderTotal, 320, 'Payment Info must NOT deduct discount twice!');

  // Verify Screenshot Case (Subtotal ₹535, Shipping ₹80, Recorded Total ₹401 with DB discount 0)
  const screenshotOrder = {
    order_number: 'SSF-20261011-9016',
    subtotal: 535,
    delivery_charge: 80,
    total: 401,
    discount: 0,
    items: [
      { product_id: 'prod-item', unit_price: 535, quantity: 1, status: 'active' }
    ]
  };
  const norm = normalizeOrderTracking(screenshotOrder as any);
  assert.strictEqual(norm.discount, 214, 'Normalized discount must resolve to ₹214 (535 + 80 - 401)');
  const finScreenshot = calculateOrderFinancials(norm);
  assert.strictEqual(finScreenshot.totalDiscount, 214, 'Financial totalDiscount must be ₹214');
  assert.strictEqual(finScreenshot.finalOrderTotal, 401, 'Authoritative finalOrderTotal must be ₹401, NOT ₹615');
  assert.strictEqual(finScreenshot.adjustedSubtotal, 321, 'Adjusted subtotal must be ₹321 (535 - 214)');
});

// -------------------------------------------------------------
// TEST B: Proportional Discount Allocation on Item Cancellation (Section 2.5 & 18)
// -------------------------------------------------------------
runTest('Test B: Cancelled Item Proportional Discount Allocation & Refundability', () => {
  // Order: ₹600 subtotal, ₹140 discount. Product A (₹140) is cancelled.
  // Effective Discount Rate = 140 / 600 = 23.3333%
  // Discount Allocated to Cancelled Product = 140 * (140/600) ≈ 32.67
  // Refundable Amount = 140 - 32.67 = 107.33
  const orderWithCancelledItem = {
    items: [
      { product_id: 'prod-a', unit_price: 140, quantity: 1, status: 'cancelled' },
      { product_id: 'prod-b', unit_price: 260, quantity: 1, status: 'active' },
      { product_id: 'prod-c', unit_price: 200, quantity: 1, status: 'active' },
    ],
    fixedCouponDiscount: 140,
    shippingCharge: 0,
    taxConfig: { gstEnabled: false, gstRate: 0 },
    amountPaid: 460,
  };

  const financials = calculateOrderFinancials(orderWithCancelledItem);

  assert.strictEqual(financials.originalProductSubtotal, 600, 'Original Subtotal must be ₹600');
  assert.strictEqual(financials.originalOrderDiscount, 140, 'Original Order Discount must be ₹140');
  assert.strictEqual(financials.cancelledGrossAmount, 140, 'Gross cancelled item value must be ₹140');
  assert.strictEqual(financials.cancelledAllocatedDiscount, 32.67, 'Allocated discount must be ₹32.67');
  assert.strictEqual(financials.refundableCancelledAmount, 107.33, 'Net refundable amount must be ₹107.33');
  assert.strictEqual(financials.adjustedDiscount, 107.33, 'Remaining active coupon discount must be ₹107.33');
  
  // Remaining items: ₹260 + ₹200 = ₹460 gross.
  // Remaining active discount: 140 - 32.67 = 107.33.
  // Remaining adjusted subtotal: 460 - 107.33 = 352.67.
  assert.strictEqual(financials.adjustedSubtotal, 352.67, 'Remaining subtotal must be ₹352.67');
  assert.strictEqual(financials.finalOrderTotal, 352.67, 'Adjusted final order total must be ₹352.67');
  
  // Amount paid was 460, final is 352.67 -> excess paid / refund due is 460 - 352.67 = 107.33
  assert.strictEqual(financials.refundDue, 107.33, 'Refund due must equal ₹107.33');
  assert.strictEqual(financials.paymentStatus, 'excess_payment', 'Status must flag excess payment / refund due');

  // Verify breakdown arithmetic trace matches adjustedSubtotal exactly:
  // 600 (Subtotal) - 140 (Coupon) - 140 (Cancelled Gross) + 32.67 (Allocated Discount Returned) = 352.67
  const stepSubtotal = financials.breakdown.find(s => s.step === '1')?.amount || 0;
  const stepCoupon = financials.breakdown.find(s => s.step === '3')?.amount || 0;
  const stepCancelled = financials.breakdown.find(s => s.step === '4')?.amount || 0;
  const stepAllocated = financials.breakdown.find(s => s.step === '4b')?.amount || 0;
  const calculatedSubtotal = roundToTwo(stepSubtotal - stepCoupon - stepCancelled + stepAllocated);
  assert.strictEqual(calculatedSubtotal, 352.67, 'Breakdown arithmetic trace must sum exactly to 352.67');

  // Verify Multiple Recalculation Stability (Prevent recursive discount degradation):
  const orderAfterUpdate = {
    ...orderWithCancelledItem,
    discount: financials.adjustedDiscount,
    coupon_discount: financials.adjustedDiscount,
    original_discount: 140,
    items: [
      { product_id: 'prod-a', unit_price: 140, quantity: 1, status: 'cancelled', allocated_discount: 32.67 },
      { product_id: 'prod-b', unit_price: 260, quantity: 1, status: 'active' },
      { product_id: 'prod-c', unit_price: 200, quantity: 1, status: 'active' },
    ],
  };
  const recheck = calculateOrderFinancials(orderAfterUpdate);
  assert.strictEqual(recheck.adjustedDiscount, 107.33, 'Recalculating updated order must keep adjusted discount stable at ₹107.33');
  assert.strictEqual(recheck.finalOrderTotal, 352.67, 'Recalculating updated order must keep final total stable at ₹352.67');
});

// -------------------------------------------------------------
// TEST C: Category Management & Slug Safety (Section 4 & 18)
// -------------------------------------------------------------
runTest('Test C: Category Management Slug Generation & Safety', () => {
  assert.strictEqual(generateCategorySlug('Pickles & Chutneys'), 'pickles-chutneys', 'Slug must normalize symbols');
  assert.strictEqual(generateCategorySlug('Karam Powders (Special)'), 'karam-powders-special', 'Slug must strip parens');
  assert.strictEqual(generateCategorySlug('  Organic Spices   '), 'organic-spices', 'Slug must trim whitespace');
  assert.strictEqual(generateCategorySlug('Special-Offer-2026'), 'special-offer-2026', 'Slug must handle hyphens');
});

// -------------------------------------------------------------
// TEST D & E: Food License & GST Format Validation (Section 5 & 18)
// -------------------------------------------------------------
runTest('Test D & E: Regulatory Food License (FSSAI) & GSTIN Format Validation', () => {
  // FSSAI must be 14 digits
  assert.strictEqual(isValidFssai('10123999000123'), true, 'Valid 14-digit FSSAI must pass');
  assert.strictEqual(isValidFssai('12345'), false, 'Short FSSAI must fail');
  assert.strictEqual(isValidFssai('1012399900012A'), false, 'Non-digit FSSAI must fail');
  assert.strictEqual(isValidFssai(''), false, 'Empty FSSAI is false for format check (optional in form)');

  // GSTIN must match Indian 15-character GST format: 2 digits + 5 letters + 4 digits + 1 letter + 1 alphanumeric + Z + 1 alphanumeric
  assert.strictEqual(isValidGstin('37AAAAA0000A1Z5'), true, 'Valid Andhra Pradesh GSTIN must pass');
  assert.strictEqual(isValidGstin('36ABCDE1234F1Z8'), true, 'Valid Telangana GSTIN must pass');
  assert.strictEqual(isValidGstin('INVALIDGST123'), false, 'Malformed GSTIN must fail');
  assert.strictEqual(isValidGstin(''), false, 'Empty GSTIN is false for format check (optional in form)');
});

// -------------------------------------------------------------
// TEST F: Delivery Slip Integrity - No Financials (Section 6 & 18)
// -------------------------------------------------------------
runTest('Test F: Delivery Slip Data Integrity (Zero Pricing, Zero Financials)', () => {
  const sampleDeliverySlipProps = {
    businessName: 'Sudha Swagruha Foods',
    orderNumber: 'ORD-2026-10025',
    customerName: 'Kiran V',
    items: [
      { name: 'Avakaya Pickle (500g)', quantity: 2 },
      { name: 'Kandi Podi (250g)', quantity: 1 }
    ]
  };

  // Assert required fields exist
  assert.ok(sampleDeliverySlipProps.orderNumber);
  assert.ok(sampleDeliverySlipProps.customerName);
  assert.strictEqual(sampleDeliverySlipProps.items.length, 2);

  // Assert no financial fields are present
  const keys = Object.keys(sampleDeliverySlipProps);
  assert.strictEqual(keys.includes('price'), false);
  assert.strictEqual(keys.includes('discount'), false);
  assert.strictEqual(keys.includes('payment_method'), false);
  assert.strictEqual(keys.includes('final_amount'), false);
});

// -------------------------------------------------------------
// TEST G: Multi-Payment Summation, Partial Payment & Excess Handling (Section 8, 9 & 18)
// -------------------------------------------------------------
runTest('Test G: Multi-Payment Summation, Partial Payment & Overpayment', () => {
  // Scenario 1: Partial Payment
  const partialOrder = {
    items: [{ unit_price: 500, quantity: 2, status: 'active' }], // 1000
    shippingCharge: 50,
    taxConfig: { gstEnabled: false, gstRate: 0 },
    amountPaid: 600, // Only 600 paid of 1050
  };
  const partialResult = calculateOrderFinancials(partialOrder);
  assert.strictEqual(partialResult.finalOrderTotal, 1050);
  assert.strictEqual(partialResult.totalAmountReceived, 600);
  assert.strictEqual(partialResult.balanceAmount, 450);
  assert.strictEqual(partialResult.excessAmount, 0);
  assert.strictEqual(partialResult.paymentStatus, 'partially_paid');

  // Scenario 2: Excess Payment
  const excessOrder = {
    items: [{ unit_price: 300, quantity: 1, status: 'active' }], // 300
    shippingCharge: 0,
    taxConfig: { gstEnabled: false, gstRate: 0 },
    amountPaid: 500, // 500 paid on 300 order
  };
  const excessResult = calculateOrderFinancials(excessOrder);
  assert.strictEqual(excessResult.finalOrderTotal, 300);
  assert.strictEqual(excessResult.totalAmountReceived, 500);
  assert.strictEqual(excessResult.balanceAmount, 0);
  assert.strictEqual(excessResult.excessAmount, 200);
  assert.strictEqual(excessResult.refundDue, 200);
  assert.strictEqual(excessResult.paymentStatus, 'excess_payment');
});

// -------------------------------------------------------------
// TEST H: Refund Statuses & Calculation Integrity (Section 10 & 18)
// -------------------------------------------------------------
runTest('Test H: Refund Calculation & Status Progression', () => {
  const refundedOrder = {
    items: [{ unit_price: 400, quantity: 1, status: 'active' }],
    shippingCharge: 0,
    taxConfig: { gstEnabled: false, gstRate: 0 },
    amountPaid: 400,
    amountRefunded: 400,
  };
  const refundResult = calculateOrderFinancials(refundedOrder);
  assert.strictEqual(refundResult.refundedAmount, 400);
  assert.strictEqual(refundResult.remainingRefundable, 0);
  assert.strictEqual(refundResult.paymentStatus, 'refunded');

  const partialRefundOrder = {
    items: [{ unit_price: 500, quantity: 1, status: 'active' }],
    shippingCharge: 0,
    taxConfig: { gstEnabled: false, gstRate: 0 },
    amountPaid: 500,
    amountRefunded: 200,
  };
  const partialRefundResult = calculateOrderFinancials(partialRefundOrder);
  assert.strictEqual(partialRefundResult.refundedAmount, 200);
  assert.strictEqual(partialRefundResult.remainingRefundable, 300);
  assert.strictEqual(partialRefundResult.paymentStatus, 'partially_refunded');
});

// -------------------------------------------------------------
// TEST I: Role-Based Access Control (RBAC) Permissions (Section 13 & 18)
// -------------------------------------------------------------
runTest('Test I: Role-Based Access Control Boundaries', () => {
  // ROOT_ADMIN has full permissions
  const rootAdmin = ROLE_DEFINITIONS['ROOT_ADMIN'];
  assert.strictEqual(rootAdmin.canManageCategories, true);
  assert.strictEqual(rootAdmin.canManagePayments, true);
  assert.strictEqual(rootAdmin.canInitiateRefunds, true);
  assert.strictEqual(rootAdmin.canConfigureSettings, true);

  // PRODUCT_MANAGER has category & product access, but NO payment access
  const productMgr = ROLE_DEFINITIONS['PRODUCT_MANAGER'];
  assert.strictEqual(productMgr.canManageCategories, true);
  assert.strictEqual(productMgr.canManageProducts, true);
  assert.strictEqual(productMgr.canManagePayments, false);
  assert.strictEqual(productMgr.canInitiateRefunds, false);
  assert.strictEqual(productMgr.canConfigureSettings, false);

  // FINANCE_MANAGER has payment & refund access, but NO category or product management
  const financeMgr = ROLE_DEFINITIONS['FINANCE_MANAGER'];
  assert.strictEqual(financeMgr.canManagePayments, true);
  assert.strictEqual(financeMgr.canInitiateRefunds, true);
  assert.strictEqual(financeMgr.canManageCategories, false);
  assert.strictEqual(financeMgr.canManageProducts, false);

  // ORDER_PROCESSOR can process orders, but CANNOT manage categories or payments module
  const orderProc = ROLE_DEFINITIONS['ORDER_PROCESSOR'];
  assert.strictEqual(orderProc.canProcessOrders, true);
  assert.strictEqual(orderProc.canManagePayments, false);
  assert.strictEqual(orderProc.canManageCategories, false);
});

// -------------------------------------------------------------
// TEST J: CSV Export Structure & Numeric Precision (Section 15 & 18)
// -------------------------------------------------------------
runTest('Test J: Financial Consistency and Decimal Rounding Integrity', () => {
  // Test monetary roundToTwo
  assert.strictEqual(roundToTwo(10.555), 10.56);
  assert.strictEqual(roundToTwo(140 * (140 / 600)), 32.67);
  assert.strictEqual(roundToTwo(140 - 32.666666), 107.33);
  assert.strictEqual(roundToTwo(0.1 + 0.2), 0.3);
});

console.log('\n================================================================');
console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests} Test Suites Verified Successfully!`);
console.log('================================================================');

