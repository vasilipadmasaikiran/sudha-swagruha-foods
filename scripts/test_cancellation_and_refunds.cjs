// ============================================================
// Automated Test Suite: Order Cancellation, Product/Customisation
// Cancellation, and Financial Refunds
// ============================================================
const assert = require('assert');

console.log('================================================================');
console.log('RUNNING ORDER CANCELLATION, PRODUCT CANCELLATION & REFUNDS SUITE');
console.log('================================================================\n');

// 1. Financial Arithmetic & Metrics Calculation Test
function calculateRefundableMetrics(order) {
  const isPaid = order.payment_status === 'paid' || order.payment_status === 'partially_refunded';
  const originalPaidAmount = isPaid ? Number(order.total || 0) : 0;
  const totalAlreadyRefunded = Number(order.refunded_amount || 0);
  const remainingRefundableAmount = Math.max(0, Math.round((originalPaidAmount - totalAlreadyRefunded) * 100) / 100);

  const activeItemsSum = (order.items || [])
    .filter((it) => it.status !== 'removed' && it.status !== 'cancelled')
    .reduce((sum, it) => sum + Number(it.total_price || 0), 0);

  return {
    isPaid,
    originalPaidAmount,
    totalAlreadyRefunded,
    remainingRefundableAmount,
    refundableAmount: remainingRefundableAmount,
    activeItemsSum,
  };
}

const mockOrder = {
  id: 'order-test-1',
  order_number: 'SSF-TEST-001',
  customer_name: 'Test Customer',
  customer_mobile: '9876543210',
  items: [
    {
      product_id: 'p1',
      product_name_en: 'Andhra Avakaya Pickle',
      weight: '500g',
      quantity: 2,
      unit_price: 320,
      total_price: 640,
      status: 'active',
    },
    {
      product_id: 'p2',
      product_name_en: 'Kandi Karam Podi',
      weight: '250g',
      quantity: 1,
      unit_price: 180,
      total_price: 180,
      status: 'active',
    },
  ],
  total: 820,
  payment_status: 'paid',
  refunded_amount: 0,
  refunds: [],
};

// TEST 1: Initial Refundable Metrics
const initialMetrics = calculateRefundableMetrics(mockOrder);
assert.strictEqual(initialMetrics.originalPaidAmount, 820);
assert.strictEqual(initialMetrics.remainingRefundableAmount, 820);
assert.strictEqual(initialMetrics.activeItemsSum, 820);
console.log('✅ [PASS] Test 1: Order initial refundable metrics correctly calculated (₹820)');

// TEST 2: Product & Customisation Cancellation (Partial item quantity)
function cancelOrderItem(order, productId, options) {
  const itemIndex = order.items.findIndex(
    (it) => it.product_id === productId && it.status !== 'removed' && it.status !== 'cancelled'
  );
  assert.notStrictEqual(itemIndex, -1, 'Item should exist in order');

  const target = order.items[itemIndex];
  const cancelQty = options.cancelledQuantity || target.quantity;
  const isPartial = cancelQty < target.quantity;
  const unitPrice = target.unit_price;
  const lineRefund = Math.round(unitPrice * cancelQty * 100) / 100;
  const refundAmount = options.customRefundAmount !== undefined ? options.customRefundAmount : lineRefund;

  const refundRecord = {
    id: 'rfnd-item-1',
    order_number: order.order_number,
    amount: refundAmount,
    type: 'partial',
    reason: `Item Cancelled (${target.product_name_en} x${cancelQty}): ${options.reason}`,
    status: 'success',
    requested_at: new Date().toISOString(),
  };

  let updatedItems;
  if (isPartial) {
    const remainingQty = target.quantity - cancelQty;
    updatedItems = [
      ...order.items.slice(0, itemIndex),
      {
        ...target,
        quantity: remainingQty,
        total_price: unitPrice * remainingQty,
      },
      {
        ...target,
        quantity: cancelQty,
        total_price: unitPrice * cancelQty,
        status: 'cancelled',
        cancelled_quantity: cancelQty,
        removal_reason: options.reason,
        customization: options.customizationNotes,
        refund_amount: refundAmount,
      },
      ...order.items.slice(itemIndex + 1),
    ];
  } else {
    updatedItems = order.items.map((it, idx) =>
      idx === itemIndex
        ? {
            ...it,
            status: 'cancelled',
            cancelled_quantity: target.quantity,
            removal_reason: options.reason,
            customization: options.customizationNotes,
            refund_amount: refundAmount,
          }
        : it
    );
  }

  const newRefunded = order.refunded_amount + refundAmount;
  return {
    ...order,
    items: updatedItems,
    refunded_amount: newRefunded,
    payment_status: newRefunded >= order.total ? 'refunded' : 'partially_refunded',
    refunds: [...order.refunds, refundRecord],
  };
}

// Cancel 1 unit out of 2 units of Avakaya due to customisation
const orderAfterItemCancel = cancelOrderItem(mockOrder, 'p1', {
  cancelledQuantity: 1,
  reason: 'Product customisation / spice level cannot be prepared',
  customizationNotes: 'Customer requested medium spice, only spicy available',
});

assert.strictEqual(orderAfterItemCancel.items.length, 3, 'Should split into 1 active and 1 cancelled');
assert.strictEqual(orderAfterItemCancel.items[0].quantity, 1, 'Remaining active jar qty = 1');
assert.strictEqual(orderAfterItemCancel.items[1].quantity, 1, 'Cancelled jar qty = 1');
assert.strictEqual(orderAfterItemCancel.items[1].status, 'cancelled');
assert.strictEqual(orderAfterItemCancel.items[1].customization, 'Customer requested medium spice, only spicy available');
assert.strictEqual(orderAfterItemCancel.refunded_amount, 320);
assert.strictEqual(orderAfterItemCancel.payment_status, 'partially_refunded');

const postItemMetrics = calculateRefundableMetrics(orderAfterItemCancel);
assert.strictEqual(postItemMetrics.remainingRefundableAmount, 500); // 820 - 320 = 500
console.log('✅ [PASS] Test 2: Product & Customisation Cancellation cleanly splits items & initiates ₹320 partial refund');

// TEST 3: Full Order Cancellation with Remaining Balance Refund
function cancelFullOrder(order, reason, initiateRefund = true, customRefundAmount) {
  const metrics = calculateRefundableMetrics(order);
  const refundAmount = customRefundAmount !== undefined ? customRefundAmount : metrics.remainingRefundableAmount;

  const refundRecord = initiateRefund && refundAmount > 0 ? {
    id: 'rfnd-full-1',
    order_number: order.order_number,
    amount: refundAmount,
    type: refundAmount >= metrics.remainingRefundableAmount ? 'full' : 'partial',
    reason: `Order Cancellation: ${reason}`,
    status: 'success',
    requested_at: new Date().toISOString(),
  } : null;

  const newRefunded = order.refunded_amount + (refundRecord ? refundRecord.amount : 0);

  return {
    ...order,
    order_status: 'cancelled',
    cancellation_reason: reason,
    refunded_amount: newRefunded,
    payment_status: newRefunded >= order.total ? 'refunded' : 'partially_refunded',
    refunds: refundRecord ? [...order.refunds, refundRecord] : order.refunds,
  };
}

const finalCancelledOrder = cancelFullOrder(orderAfterItemCancel, 'Customer requested cancellation of remaining sweets');
assert.strictEqual(finalCancelledOrder.order_status, 'cancelled');
assert.strictEqual(finalCancelledOrder.refunded_amount, 820); // 320 + 500 = 820
assert.strictEqual(finalCancelledOrder.payment_status, 'refunded');
assert.strictEqual(finalCancelledOrder.refunds.length, 2);
console.log('✅ [PASS] Test 3: Entire Order Cancellation triggers full remaining refund (₹500, total ₹820)');

// TEST 4: Prevent Exceeding Refundable Balance
const overRefundCheck = calculateRefundableMetrics(finalCancelledOrder);
assert.strictEqual(overRefundCheck.remainingRefundableAmount, 0);
console.log('✅ [PASS] Test 4: Financial Ledger enforces 0 refundable balance after full refund');

console.log('\n----------------------------------------------------------------');
console.log('ALL ORDER CANCELLATION, PRODUCT CANCELLATION & REFUND TESTS PASSED!');
console.log('----------------------------------------------------------------\n');
