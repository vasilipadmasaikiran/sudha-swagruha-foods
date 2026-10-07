// ============================================================
// Comprehensive Automated Test: Customer Cancellation Request & Approval Workflow
// Tests:
// 1. Eligibility validation & request creation
// 2. State machine isolation (Order Status vs Request Status vs Refund Status)
// 3. Duplicate request prevention
// 4. Admin approval -> order cancelled + refund recorded
// 5. Admin rejection -> request rejected + order continues active
// 6. Authoritative refund calculations & safety limits
// ============================================================
const assert = require('assert');

console.log('🧪 Starting Automated Tests for Order Cancellation & Approval Workflow...\n');

// Mock order model
function createMockOrder(id, orderNumber, total, paymentStatus = 'paid') {
  return {
    id,
    order_number: orderNumber,
    total,
    payment_status: paymentStatus,
    order_status: 'preparing',
    refunded_amount: 0,
    items: [
      { product_id: 'p1', product_name_en: 'Avakaya Pickle', quantity: 2, unit_price: 300, total_price: 600, status: 'active' },
      { product_id: 'p2', product_name_en: 'Sunnundalu', quantity: 1, unit_price: 400, total_price: 400, status: 'active' },
    ],
    refunds: [],
    order_status_history: [
      { status: 'placed', timestamp: '2026-10-07T10:00:00Z', notes: 'Order placed by customer', updated_by: 'Customer' },
      { status: 'preparing', timestamp: '2026-10-07T10:15:00Z', notes: 'In kitchen preparation', updated_by: 'Kitchen' },
    ],
  };
}

function calculateRefundableMetrics(order) {
  const isPaid = order.payment_status === 'paid' || order.payment_status === 'partially_refunded';
  const paidAmount = isPaid ? Number(order.total || 0) : 0;
  const alreadyRefunded = Number(order.refunded_amount || 0);
  const remainingRefundableAmount = Math.max(0, paidAmount - alreadyRefunded);
  return {
    isPaid,
    paidAmount,
    alreadyRefunded,
    remainingRefundableAmount,
    isRefundable: isPaid && remainingRefundableAmount > 0,
  };
}

function requestCustomerCancellation(order, reason, customerComment) {
  if (order.order_status === 'cancelled') throw new Error('Order is already cancelled');
  if (order.order_status === 'delivered') throw new Error('Delivered orders cannot be cancelled');
  if (order.order_status === 'shipped') throw new Error('Order has already been dispatched with tracking');
  if (order.cancellation_request && order.cancellation_request.status === 'requested') {
    throw new Error('A cancellation request is already pending review for this order');
  }

  const metrics = calculateRefundableMetrics(order);
  const request = {
    status: 'requested',
    reason,
    customer_comment: customerComment,
    requested_at: new Date().toISOString(),
    estimated_refund_amount: metrics.remainingRefundableAmount,
  };

  const updatedHistory = [
    ...(order.order_status_history || []),
    {
      status: order.order_status, // CRITICAL: order_status remains active
      timestamp: new Date().toISOString(),
      notes: `Customer cancellation requested: ${reason}`,
      updated_by: 'Customer',
    },
  ];

  return {
    ...order,
    cancellation_request: request,
    order_status_history: updatedHistory,
  };
}

function approveCancellationRequest(order, approvedBy, reviewerRole) {
  if (order.order_status === 'cancelled') throw new Error('Order is already cancelled');
  if (!order.cancellation_request || order.cancellation_request.status !== 'requested') {
    throw new Error('No pending customer cancellation request found for this order');
  }

  const metrics = calculateRefundableMetrics(order);
  const refundAmount = metrics.remainingRefundableAmount;

  const refundRecord = {
    id: `rfnd_${Date.now()}`,
    order_id: order.id,
    order_number: order.order_number,
    amount: refundAmount,
    type: 'full',
    reason: `Customer cancellation approved: ${order.cancellation_request.reason}`,
    status: 'success',
    requested_by: `${approvedBy} (${reviewerRole})`,
    requested_at: new Date().toISOString(),
  };

  const approvedRequest = {
    ...order.cancellation_request,
    status: 'approved',
    reviewed_at: new Date().toISOString(),
    reviewed_by: approvedBy,
    reviewer_role: reviewerRole,
    approved_refund_amount: refundAmount,
  };

  const newRefundedAmount = (order.refunded_amount || 0) + refundAmount;
  const newPaymentStatus = newRefundedAmount >= order.total ? 'refunded' : 'partially_refunded';

  const updatedHistory = [
    ...(order.order_status_history || []),
    {
      status: 'cancelled',
      timestamp: new Date().toISOString(),
      notes: `Customer cancellation approved by ${approvedBy} (${reviewerRole}) with refund of ₹${refundAmount}`,
      updated_by: `${approvedBy} (${reviewerRole})`,
    },
  ];

  return {
    ...order,
    order_status: 'cancelled',
    cancellation_reason: order.cancellation_request.reason,
    cancelled_at: new Date().toISOString(),
    cancelled_by: `${approvedBy} (${reviewerRole})`,
    cancellation_request: approvedRequest,
    refunded_amount: newRefundedAmount,
    payment_status: newPaymentStatus,
    refunds: [...(order.refunds || []), refundRecord],
    order_status_history: updatedHistory,
  };
}

function rejectCancellationRequest(order, rejectionReason, adminComment, rejectedBy, reviewerRole) {
  if (!order.cancellation_request || order.cancellation_request.status !== 'requested') {
    throw new Error('No pending customer cancellation request found for this order');
  }

  const rejectedRequest = {
    ...order.cancellation_request,
    status: 'rejected',
    reviewed_at: new Date().toISOString(),
    reviewed_by: rejectedBy,
    reviewer_role: reviewerRole,
    rejection_reason: rejectionReason,
    admin_comment: adminComment,
  };

  const updatedHistory = [
    ...(order.order_status_history || []),
    {
      status: order.order_status, // order remains active
      timestamp: new Date().toISOString(),
      notes: `Cancellation request rejected: ${rejectionReason}`,
      updated_by: `${rejectedBy} (${reviewerRole})`,
    },
  ];

  return {
    ...order,
    cancellation_request: rejectedRequest,
    order_status_history: updatedHistory,
  };
}

// ─── TEST 1: Customer submits cancellation request ───
console.log('Test 1: Customer submits cancellation request');
let order1 = createMockOrder('ord-1', 'SSF-20261007-001', 1000, 'paid');
order1 = requestCustomerCancellation(order1, 'Product no longer required', 'I made duplicate plans');
assert.strictEqual(order1.cancellation_request.status, 'requested');
assert.strictEqual(order1.cancellation_request.reason, 'Product no longer required');
assert.strictEqual(order1.cancellation_request.estimated_refund_amount, 1000);
assert.strictEqual(order1.order_status, 'preparing', 'Order status must NOT become CANCELLED upon customer request');
console.log('✅ Test 1 Passed: Request recorded, order remains active preparing.\n');

// ─── TEST 2: Duplicate request blocked ───
console.log('Test 2: Prevent duplicate cancellation requests');
assert.throws(() => {
  requestCustomerCancellation(order1, 'Changed my mind', 'Second try');
}, /already pending review/);
console.log('✅ Test 2 Passed: Duplicate cancellation request rejected.\n');

// ─── TEST 3: Admin Approves Request ───
console.log('Test 3: Admin approves cancellation request');
const approvedOrder = approveCancellationRequest(order1, 'Store Owner Smt. Lakshmi', 'STORE_OWNER');
assert.strictEqual(approvedOrder.cancellation_request.status, 'approved');
assert.strictEqual(approvedOrder.order_status, 'cancelled');
assert.strictEqual(approvedOrder.refunded_amount, 1000);
assert.strictEqual(approvedOrder.payment_status, 'refunded');
assert.strictEqual(approvedOrder.refunds.length, 1);
assert.strictEqual(approvedOrder.refunds[0].amount, 1000);
assert.strictEqual(approvedOrder.refunds[0].status, 'success');
console.log('✅ Test 3 Passed: Order approved, marked cancelled, ₹1,000 refund recorded.\n');

// ─── TEST 4: Customer submits request and Admin Rejects ───
console.log('Test 4: Admin rejects cancellation request');
let order2 = createMockOrder('ord-2', 'SSF-20261007-002', 800, 'paid');
order2 = requestCustomerCancellation(order2, 'Delivery taking too long', 'Need it today');
assert.strictEqual(order2.cancellation_request.status, 'requested');

const rejectedOrder = rejectCancellationRequest(
  order2,
  'Order has already entered dispatch processing',
  'Your fresh batch has been packed and handed to courier',
  'Order Processor Anil',
  'ORDER_PROCESSOR'
);
assert.strictEqual(rejectedOrder.cancellation_request.status, 'rejected');
assert.strictEqual(rejectedOrder.order_status, 'preparing', 'Order status must remain active preparing');
assert.strictEqual(rejectedOrder.refunded_amount, 0, 'No refund should be initiated on rejection');
assert.strictEqual(rejectedOrder.refunds.length, 0);
assert.strictEqual(rejectedOrder.cancellation_request.rejection_reason, 'Order has already entered dispatch processing');
console.log('✅ Test 4 Passed: Request rejected, order stays active, no refund initiated.\n');

// ─── TEST 5: Financial safety limits ───
console.log('Test 5: Financial safety limits & partial refund arithmetic');
let order3 = createMockOrder('ord-3', 'SSF-20261007-003', 1200, 'partially_refunded');
order3.refunded_amount = 400; // previously refunded
const metrics = calculateRefundableMetrics(order3);
assert.strictEqual(metrics.paidAmount, 1200);
assert.strictEqual(metrics.alreadyRefunded, 400);
assert.strictEqual(metrics.remainingRefundableAmount, 800);
assert.strictEqual(metrics.isRefundable, true);

order3 = requestCustomerCancellation(order3, 'Found a better price');
assert.strictEqual(order3.cancellation_request.estimated_refund_amount, 800, 'Estimated refund must match remaining balance, not original total');

const approved3 = approveCancellationRequest(order3, 'Super Admin', 'ROOT_ADMIN');
assert.strictEqual(approved3.refunded_amount, 1200);
assert.strictEqual(approved3.payment_status, 'refunded');
assert.strictEqual(approved3.refunds[0].amount, 800, 'Refund must not exceed remaining refundable balance');
console.log('✅ Test 5 Passed: Strict arithmetic ensures Total Refunded (400 + 800 = 1200) <= Amount Paid (1200).\n');

console.log('🎉 ALL AUTOMATED TESTS COMPLETED SUCCESSFULLY!');
