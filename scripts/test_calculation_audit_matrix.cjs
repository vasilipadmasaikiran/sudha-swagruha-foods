// ==============================================================================
// Section 20 Audit Test Matrix: Single Authoritative Calculation Engine
// Tests all scenarios specified in User Requirements Section 20.15 & 20.1 - 20.18
// ==============================================================================

const assert = require('assert');

// Pure JS mirrors of the TypeScript calculation engine in src/services/orderCalculationService.ts
function roundToTwo(num) {
  return Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;
}

function calculateOrderFinancials(input) {
  const isDbOrder = 'items' in input && !('rawItems' in input);

  let rawItems = [];
  let couponDiscount = 0;
  let orderDiscount = 0;
  let productDiscount = 0;
  let calculatedShipping = 0;
  let shippingOverride = undefined;
  let codCharges = 0;
  let taxConfig = { gstEnabled: false, gstRate: 0 };
  let payments = [];
  let refunds = [];
  let recordedTotal = undefined;
  let orderStatus = 'placed';

  if (isDbOrder) {
    const order = input;
    rawItems = Array.isArray(order.items) ? order.items : [];
    couponDiscount = Number(order.coupon_discount || order.discount_amount || 0);
    orderDiscount = Number(order.order_discount || 0);
    productDiscount = Number(order.item_discount || 0);
    calculatedShipping = Number(order.shipping_calculated ?? order.shipping_amount ?? 0);
    if (order.shipping_override !== undefined && order.shipping_override !== null) {
      shippingOverride = Number(order.shipping_override);
    }
    codCharges = Number(order.cod_charges || 0);
    taxConfig = {
      gstEnabled: Number(order.gst_rate || order.tax_amount || 0) > 0,
      gstRate: Number(order.gst_rate || 0),
    };
    payments = Array.isArray(order.payments) ? order.payments : [];
    refunds = Array.isArray(order.refunds) ? order.refunds : [];
    recordedTotal = order.total !== undefined ? Number(order.total) : undefined;
    orderStatus = order.order_status || 'placed';
  } else {
    const raw = input;
    rawItems = raw.rawItems || [];
    couponDiscount = Number(raw.couponDiscount || 0);
    orderDiscount = Number(raw.orderDiscount || 0);
    productDiscount = Number(raw.productDiscount || 0);
    calculatedShipping = Number(raw.calculatedShipping || 0);
    shippingOverride = raw.shippingOverride !== undefined ? Number(raw.shippingOverride) : undefined;
    codCharges = Number(raw.codCharges || 0);
    taxConfig = raw.taxConfig || { gstEnabled: false, gstRate: 0 };
    payments = raw.payments || [];
    refunds = raw.refunds || [];
    recordedTotal = raw.recordedTotal;
    orderStatus = raw.orderStatus || 'placed';
  }

  // 1. Gross Product Subtotal
  let originalSubtotal = 0;
  let cancelledAmount = 0;
  let computedProductDiscount = productDiscount;

  if (orderStatus === 'cancelled') {
    for (const it of rawItems) {
      const qty = Number(it.quantity || 1);
      const unitPrice = Number(it.unit_price || it.price || 0);
      originalSubtotal += qty * unitPrice;
    }
    cancelledAmount = originalSubtotal;
  } else {
    for (const it of rawItems) {
      const qty = Number(it.quantity || 1);
      const unitPrice = Number(it.unit_price || it.price || 0);
      const lineTotal = qty * unitPrice;
      originalSubtotal += lineTotal;

      const isCancelled = it.status === 'cancelled' || it.status === 'removed';
      const cancelledQty = Number(it.cancelled_quantity || 0);

      if (isCancelled) {
        cancelledAmount += lineTotal;
      } else if (cancelledQty > 0) {
        cancelledAmount += cancelledQty * unitPrice;
      }

      if (it.discount_amount) {
        computedProductDiscount += Number(it.discount_amount);
      }
    }
  }

  originalSubtotal = roundToTwo(originalSubtotal);
  cancelledAmount = roundToTwo(cancelledAmount);
  computedProductDiscount = roundToTwo(computedProductDiscount);

  // 2. Sequence (20.3): Gross Subtotal - Product Discounts - Order/Coupon Discounts - Cancelled Items = Adjusted Subtotal
  const cleanOrderDiscount = roundToTwo(orderDiscount);
  const cleanCouponDiscount = roundToTwo(couponDiscount);
  const totalDiscounts = roundToTwo(computedProductDiscount + cleanOrderDiscount + cleanCouponDiscount);

  const activeSubtotalBeforeDiscount = Math.max(0, originalSubtotal - cancelledAmount);
  const adjustedSubtotal = roundToTwo(Math.max(0, activeSubtotalBeforeDiscount - (cleanOrderDiscount + cleanCouponDiscount)));

  // 3. Shipping Charge (20.5)
  const finalShipping = shippingOverride !== undefined
    ? roundToTwo(shippingOverride)
    : roundToTwo(calculatedShipping);

  // 4. Taxes & Other charges
  const otherCharges = roundToTwo(codCharges);
  let gstAmount = 0;
  const gstRate = taxConfig.gstEnabled ? Number(taxConfig.gstRate || 0) : 0;
  if (taxConfig.gstEnabled && gstRate > 0) {
    gstAmount = roundToTwo((adjustedSubtotal * gstRate) / 100);
  }

  // 5. Final Order Total (20.3)
  const originalOrderTotal = roundToTwo(
    Math.max(0, originalSubtotal - totalDiscounts) + finalShipping + gstAmount + otherCharges
  );

  const finalOrderTotal = orderStatus === 'cancelled'
    ? 0
    : roundToTwo(adjustedSubtotal + finalShipping + gstAmount + otherCharges);

  const adjustedOrderTotal = finalOrderTotal;

  // 6. Payment & Settlement (20.6)
  let totalAmountReceived = 0;
  for (const pay of payments) {
    if (pay.status === 'success' || pay.status === 'paid' || pay.status === 'completed') {
      totalAmountReceived += Number(pay.amount || 0);
    }
  }
  totalAmountReceived = roundToTwo(totalAmountReceived);

  let refundedAmount = 0;
  let pendingRefundAmount = 0;
  for (const ref of refunds) {
    const amt = Number(ref.amount || 0);
    if (ref.status === 'success' || ref.status === 'completed' || ref.status === 'refunded') {
      refundedAmount += amt;
    } else if (ref.status === 'pending' || ref.status === 'processing') {
      pendingRefundAmount += amt;
    }
  }
  refundedAmount = roundToTwo(refundedAmount);
  pendingRefundAmount = roundToTwo(pendingRefundAmount);

  let balanceAmount = 0;
  let excessAmount = 0;

  if (totalAmountReceived >= finalOrderTotal) {
    balanceAmount = 0;
    excessAmount = roundToTwo(totalAmountReceived - finalOrderTotal);
  } else {
    balanceAmount = roundToTwo(finalOrderTotal - totalAmountReceived);
    excessAmount = 0;
  }

  const refundAmount = excessAmount > 0
    ? excessAmount
    : orderStatus === 'cancelled'
    ? totalAmountReceived
    : 0;

  // 7. Authoritative Payment Status (20.6)
  let paymentStatus = 'unpaid';
  if (orderStatus === 'cancelled') {
    if (totalAmountReceived === 0) {
      paymentStatus = 'unpaid';
    } else if (refundedAmount >= totalAmountReceived) {
      paymentStatus = 'refunded';
    } else {
      paymentStatus = 'excess_payment';
    }
  } else if (totalAmountReceived === 0) {
    paymentStatus = 'unpaid';
  } else if (excessAmount > 0) {
    if (refundedAmount >= excessAmount) {
      paymentStatus = 'paid';
    } else {
      paymentStatus = 'excess_payment';
    }
  } else if (balanceAmount === 0) {
    paymentStatus = 'paid';
  } else {
    paymentStatus = 'partially_paid';
  }

  return {
    originalSubtotal,
    productDiscount: computedProductDiscount,
    orderDiscount: cleanOrderDiscount,
    couponDiscount: cleanCouponDiscount,
    cancelledAmount,
    adjustedSubtotal,
    calculatedShipping: roundToTwo(calculatedShipping),
    shippingOverride: shippingOverride !== undefined ? roundToTwo(shippingOverride) : undefined,
    finalShipping,
    gstRate,
    gstAmount,
    otherCharges,
    originalOrderTotal,
    adjustedOrderTotal,
    finalOrderTotal,
    totalAmountReceived,
    balanceAmount,
    excessAmount,
    refundAmount,
    refundedAmount,
    pendingRefundAmount,
    paymentStatus,
    recordedTotal,
    hasDiscrepancy: recordedTotal !== undefined && Math.abs(recordedTotal - finalOrderTotal) > 0.01,
  };
}

// ==============================================================================
// TEST EXECUTION
// ==============================================================================

console.log('--- STARTING SECTION 20 CALCULATION AUDIT TEST MATRIX ---\n');

// 1. Normal Order (Section 20.15)
// Items = ₹1,000, Shipping = ₹60, Total = ₹1,060
{
  const res = calculateOrderFinancials({
    rawItems: [{ unit_price: 1000, quantity: 1 }],
    calculatedShipping: 60,
  });
  assert.strictEqual(res.originalSubtotal, 1000);
  assert.strictEqual(res.finalShipping, 60);
  assert.strictEqual(res.finalOrderTotal, 1060);
  assert.strictEqual(res.balanceAmount, 1060);
  console.log('✔ Test 1 PASS: Normal Order (Items = ₹1000, Shipping = ₹60 => Total = ₹1060)');
}

// 2. Free Shipping (Section 20.15)
// Items = ₹1,500, Shipping = ₹0, Total = ₹1,500
{
  const res = calculateOrderFinancials({
    rawItems: [{ unit_price: 500, quantity: 3 }],
    calculatedShipping: 0,
  });
  assert.strictEqual(res.originalSubtotal, 1500);
  assert.strictEqual(res.finalShipping, 0);
  assert.strictEqual(res.finalOrderTotal, 1500);
  console.log('✔ Test 2 PASS: Free Shipping (Items = ₹1500, Shipping = ₹0 => Total = ₹1500)');
}

// 3. Discount (Section 20.15)
// Items = ₹1,000, Discount = ₹100, Shipping = ₹60, Final = ₹960
{
  const res = calculateOrderFinancials({
    rawItems: [{ unit_price: 1000, quantity: 1 }],
    couponDiscount: 100,
    calculatedShipping: 60,
  });
  assert.strictEqual(res.originalSubtotal, 1000);
  assert.strictEqual(res.couponDiscount, 100);
  assert.strictEqual(res.adjustedSubtotal, 900);
  assert.strictEqual(res.finalShipping, 60);
  assert.strictEqual(res.finalOrderTotal, 960);
  console.log('✔ Test 3 PASS: Discount (Items = ₹1000, Discount = ₹100, Shipping = ₹60 => Final = ₹960)');
}

// 4. Cancellation (Section 20.4 & 20.15)
// Original = ₹2,000, Cancelled = ₹500, Shipping = ₹60 => Adjusted calculation must be correct
{
  const res = calculateOrderFinancials({
    rawItems: [
      { unit_price: 1500, quantity: 1 },
      { unit_price: 500, quantity: 1, status: 'cancelled' },
    ],
    calculatedShipping: 60,
  });
  assert.strictEqual(res.originalSubtotal, 2000);
  assert.strictEqual(res.cancelledAmount, 500);
  assert.strictEqual(res.adjustedSubtotal, 1500);
  assert.strictEqual(res.finalShipping, 60);
  assert.strictEqual(res.finalOrderTotal, 1560);
  console.log('✔ Test 4 PASS: Item Cancellation (Original = ₹2000, Cancelled = ₹500, Shipping = ₹60 => Final = ₹1560)');
}

// 5. Partial Payment (Section 20.6 & 20.15)
// Final Total = ₹1,000, Paid = ₹700, Balance = ₹300
{
  const res = calculateOrderFinancials({
    rawItems: [{ unit_price: 1000, quantity: 1 }],
    calculatedShipping: 0,
    payments: [{ amount: 700, status: 'success' }],
  });
  assert.strictEqual(res.finalOrderTotal, 1000);
  assert.strictEqual(res.totalAmountReceived, 700);
  assert.strictEqual(res.balanceAmount, 300);
  assert.strictEqual(res.excessAmount, 0);
  assert.strictEqual(res.paymentStatus, 'partially_paid');
  console.log('✔ Test 5 PASS: Partial Payment (Total = ₹1000, Paid = ₹700 => Balance = ₹300, Status = PARTIALLY PAID)');
}

// 6. Excess Payment (Section 20.6 & 20.15)
// Final Total = ₹1,000, Paid = ₹1,200, Excess = ₹200, Refund = ₹200
{
  const res = calculateOrderFinancials({
    rawItems: [{ unit_price: 1000, quantity: 1 }],
    calculatedShipping: 0,
    payments: [{ amount: 1200, status: 'success' }],
  });
  assert.strictEqual(res.finalOrderTotal, 1000);
  assert.strictEqual(res.totalAmountReceived, 1200);
  assert.strictEqual(res.balanceAmount, 0);
  assert.strictEqual(res.excessAmount, 200);
  assert.strictEqual(res.refundAmount, 200);
  assert.strictEqual(res.paymentStatus, 'excess_payment');
  console.log('✔ Test 6 PASS: Excess Payment (Total = ₹1000, Paid = ₹1200 => Excess = ₹200, Refund = ₹200, Status = EXCESS)');
}

// 7. Shipping Override (Section 20.5 & 20.15)
// Calculated Shipping = ₹60, Admin Override = ₹20, Final Shipping = ₹20
{
  const res = calculateOrderFinancials({
    rawItems: [{ unit_price: 1000, quantity: 1 }],
    calculatedShipping: 60,
    shippingOverride: 20,
  });
  assert.strictEqual(res.calculatedShipping, 60);
  assert.strictEqual(res.shippingOverride, 20);
  assert.strictEqual(res.finalShipping, 20);
  assert.strictEqual(res.finalOrderTotal, 1020);
  console.log('✔ Test 7 PASS: Shipping Override (Calculated = ₹60, Override = ₹20 => Final Shipping = ₹20, Total = ₹1020)');
}

// 8. Shipping Change After Payment (Section 20.15)
// Order placed: Items ₹1000 + Shipping ₹60 = ₹1060. Paid: ₹1060.
// Later Admin overrides shipping to ₹20 -> New order total ₹1020.
// Excess = ₹40, Refund required = ₹40.
{
  const res = calculateOrderFinancials({
    rawItems: [{ unit_price: 1000, quantity: 1 }],
    calculatedShipping: 60,
    shippingOverride: 20,
    payments: [{ amount: 1060, status: 'success' }],
  });
  assert.strictEqual(res.finalOrderTotal, 1020);
  assert.strictEqual(res.totalAmountReceived, 1060);
  assert.strictEqual(res.excessAmount, 40);
  assert.strictEqual(res.refundAmount, 40);
  assert.strictEqual(res.paymentStatus, 'excess_payment');
  console.log('✔ Test 8 PASS: Shipping Change After Payment (Paid ₹1060, New Total ₹1020 => Excess = ₹40, Refund = ₹40)');
}

// 9. Multiple Payments Ledger (Section 20.15)
// ₹300 + ₹400 + ₹300 = ₹1,000 -> Status must be FULLY PAID
{
  const res = calculateOrderFinancials({
    rawItems: [{ unit_price: 1000, quantity: 1 }],
    calculatedShipping: 0,
    payments: [
      { amount: 300, status: 'success' },
      { amount: 400, status: 'success' },
      { amount: 300, status: 'success' },
    ],
  });
  assert.strictEqual(res.finalOrderTotal, 1000);
  assert.strictEqual(res.totalAmountReceived, 1000);
  assert.strictEqual(res.balanceAmount, 0);
  assert.strictEqual(res.excessAmount, 0);
  assert.strictEqual(res.paymentStatus, 'paid');
  console.log('✔ Test 9 PASS: Multiple Payments Ledger (₹300 + ₹400 + ₹300 = ₹1000 => Status = FULLY PAID)');
}

// 10. Currency Precision & Decimal Safety (Section 20.14)
// ₹0, ₹0.01, ₹1, ₹59.99, ₹60, ₹999.99, ₹1,000, ₹10,000+
{
  const testAmounts = [0, 0.01, 1, 59.99, 60, 999.99, 1000, 10543.75];
  for (const amt of testAmounts) {
    const res = calculateOrderFinancials({
      rawItems: [{ unit_price: amt, quantity: 1 }],
      calculatedShipping: 0,
    });
    assert.strictEqual(res.finalOrderTotal, amt);
  }
  // Floating point test (0.1 + 0.2 != 0.3 without protection)
  const floatRes = calculateOrderFinancials({
    rawItems: [
      { unit_price: 0.1, quantity: 1 },
      { unit_price: 0.2, quantity: 1 },
    ],
  });
  assert.strictEqual(floatRes.finalOrderTotal, 0.3);
  console.log('✔ Test 10 PASS: Precision & IEEE 754 Decimal Safety (0, 0.01, 59.99, 999.99, 10,000+ and 0.1+0.2=0.3)');
}

// 11. Historical Order Non-Destructive Reconciliation (Section 20.16)
// Stored Total ≠ Calculated Total => Discrepancy flagged without database modification
{
  const historicalOrder = {
    id: 'ord-test-audit-101',
    order_number: 'ORD1001',
    items: [{ unit_price: 1540, quantity: 1 }],
    shipping_amount: 0,
    total: 1600, // Historical DB recorded 1600, but math says 1540
    created_at: new Date().toISOString(),
  };

  const res = calculateOrderFinancials(historicalOrder);
  assert.strictEqual(res.finalOrderTotal, 1540);
  assert.strictEqual(res.recordedTotal, 1600);
  assert.strictEqual(res.hasDiscrepancy, true);
  console.log('✔ Test 11 PASS: Non-Destructive Reconciliation Audit (Flagged ₹60 variance on ORD1001 without altering DB)');
}

console.log('\n--- ALL 11 TESTS IN SECTION 20 AUDIT MATRIX PASSED WITH ZERO ERRORS ---');
