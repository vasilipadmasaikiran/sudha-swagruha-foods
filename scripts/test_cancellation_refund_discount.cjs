const assert = require('assert');

// Test the calculation engine logic directly
const { calculateOrderFinancials, roundToTwo } = require('../src/services/orderCalculationService.ts');

console.log('=== STARTING CANCELLATION, DISCOUNT & REFUND VERIFICATION TESTS ===\n');

// -------------------------------------------------------------
// Test 1: Order with NO discount applied -> Admin cancels 1 item
// -------------------------------------------------------------
const orderNoDiscount = {
  id: 'ord_no_disc_01',
  order_number: '10001',
  subtotal: 1000,
  total: 500, // stored total after 1 item cancelled
  total_amount: 500,
  discount: 0,
  original_discount: 0,
  order_discount: 0,
  items: [
    {
      product_id: 'prod_1',
      product_name_en: 'Kaju Katli',
      quantity: 1,
      unit_price: 500,
      total_price: 500,
      status: 'active'
    },
    {
      product_id: 'prod_2',
      product_name_en: 'Besan Laddu',
      quantity: 1,
      unit_price: 500,
      total_price: 500,
      status: 'cancelled',
      cancelled_quantity: 1
    }
  ],
  amountPaid: 1000,
  payments: [{ status: 'success', amount: 1000 }]
};

const fin1 = calculateOrderFinancials(orderNoDiscount);

console.log('Test 1 (No Discount Applied):');
console.log(' - Original Subtotal:', fin1.originalSubtotal);
console.log(' - Cancelled Gross Amount:', fin1.cancelledGrossAmount);
console.log(' - Original Order Discount:', fin1.originalOrderDiscount);
console.log(' - Adjusted Order Discount:', fin1.adjustedDiscount);
console.log(' - Total Discount:', fin1.totalDiscount);
console.log(' - Refundable Cancelled Amount:', fin1.refundableCancelledAmount);
console.log(' - Adjusted Subtotal:', fin1.adjustedSubtotal);
console.log(' - Final Order Total:', fin1.finalOrderTotal);
console.log(' - Excess Amount (Refund Due):', fin1.excessAmount);

assert.strictEqual(fin1.originalSubtotal, 1000, 'Original subtotal must be 1000');
assert.strictEqual(fin1.cancelledGrossAmount, 500, 'Cancelled gross amount must be 500');
assert.strictEqual(fin1.totalDiscount, 0, 'Discount must be 0! Must NOT be updated with cancelled item amount!');
assert.strictEqual(fin1.adjustedDiscount, 0, 'Adjusted discount must remain 0');
assert.strictEqual(fin1.refundableCancelledAmount, 500, 'Cancelled item amount must be 100% refund amount when no discount applied');
assert.strictEqual(fin1.adjustedSubtotal, 500, 'Adjusted subtotal must be 500');
assert.strictEqual(fin1.finalOrderTotal, 500, 'Final order total must be 500');
assert.strictEqual(fin1.excessAmount, 500, 'Excess amount to refund must be 500');

console.log('✔ Test 1 PASSED: Discount remained 0, Refund amount is 100% of cancelled item (500).\n');

// -------------------------------------------------------------
// Test 2: Order with 10% Discount applied -> Admin cancels 1 item
// -------------------------------------------------------------
// Total 1000, Discount 10% = 100. Customer paid 900.
// Item 1 = 600, Item 2 = 400.
// Cancel Item 1 (600):
// Discount on cancelled item = 600 * 10% = 60
// Refund amount = 600 - 60 = 540
// Remaining item = 400. Remaining discount = 40.
// Adjusted subtotal = 400 - 40 = 360.
const orderWithDiscount = {
  id: 'ord_with_disc_02',
  order_number: '10002',
  subtotal: 900,
  total: 360,
  total_amount: 360,
  original_discount: 100,
  discount: 40,
  coupon_code: 'FESTIVE10',
  items: [
    {
      product_id: 'prod_1',
      product_name_en: 'Assorted Sweets Box',
      quantity: 1,
      unit_price: 600,
      total_price: 600,
      status: 'cancelled',
      cancelled_quantity: 1,
      allocated_discount: 60,
      refundable_amount: 540
    },
    {
      product_id: 'prod_2',
      product_name_en: 'Mysore Pak',
      quantity: 1,
      unit_price: 400,
      total_price: 400,
      status: 'active'
    }
  ],
  amountPaid: 900,
  payments: [{ status: 'success', amount: 900 }]
};

const fin2 = calculateOrderFinancials(orderWithDiscount);

console.log('Test 2 (10% Discount Applied):');
console.log(' - Original Subtotal:', fin2.originalSubtotal);
console.log(' - Cancelled Gross Amount:', fin2.cancelledGrossAmount);
console.log(' - Cancelled Allocated Discount:', fin2.cancelledAllocatedDiscount);
console.log(' - Refundable Cancelled Amount:', fin2.refundableCancelledAmount);
console.log(' - Remaining Adjusted Discount on Active Item:', fin2.adjustedDiscount);
console.log(' - Adjusted Subtotal:', fin2.adjustedSubtotal);
console.log(' - Final Order Total:', fin2.finalOrderTotal);
console.log(' - Excess Amount (Refund Due):', fin2.excessAmount);

assert.strictEqual(fin2.originalSubtotal, 1000, 'Original subtotal must be 1000');
assert.strictEqual(fin2.cancelledGrossAmount, 600, 'Cancelled gross must be 600');
assert.strictEqual(fin2.cancelledAllocatedDiscount, 60, 'Allocated discount on cancelled item must be 60 (10% of 600)');
assert.strictEqual(fin2.refundableCancelledAmount, 540, 'Refund amount must be 600 - 60 = 540');
assert.strictEqual(fin2.adjustedDiscount, 40, 'Adjusted discount on remaining 400 item must be 40');
assert.strictEqual(fin2.adjustedSubtotal, 360, 'Adjusted subtotal must be 400 - 40 = 360');
assert.strictEqual(fin2.finalOrderTotal, 360, 'Final payable must be 360');
assert.strictEqual(fin2.excessAmount, 540, 'Excess amount to refund must be exactly 540');

console.log('✔ Test 2 PASSED: Cancelled item amount - discount % = 540 refund. Active discount is 40. Cancelled item is not added to discount.\n');

// -------------------------------------------------------------
// Test 3: Partial Quantity Cancellation with Discount
// -------------------------------------------------------------
// Item 1: 3 units of 200 = 600.
// Discount 10% = 60. Subtotal = 540.
// Cancel 1 unit (200 gross):
// Discount on cancelled unit = 200 * 10% = 20.
// Refund amount = 200 - 20 = 180.
// Remaining 2 units = 400 gross. Remaining discount = 40.
// Adjusted subtotal = 400 - 40 = 360.
const orderPartialQty = {
  id: 'ord_partial_03',
  order_number: '10003',
  original_discount: 60,
  items: [
    {
      product_id: 'prod_1',
      product_name_en: 'Sunnundalu',
      quantity: 2,
      unit_price: 200,
      total_price: 400,
      status: 'active'
    },
    {
      product_id: 'prod_1',
      product_name_en: 'Sunnundalu',
      quantity: 1,
      unit_price: 200,
      total_price: 200,
      status: 'cancelled',
      cancelled_quantity: 1,
      allocated_discount: 20,
      refundable_amount: 180
    }
  ],
  amountPaid: 540,
  payments: [{ status: 'success', amount: 540 }]
};

const fin3 = calculateOrderFinancials(orderPartialQty);

console.log('Test 3 (Partial Quantity Cancellation with Discount):');
console.log(' - Cancelled Gross Amount:', fin3.cancelledGrossAmount);
console.log(' - Allocated Discount:', fin3.cancelledAllocatedDiscount);
console.log(' - Refundable Cancelled Amount:', fin3.refundableCancelledAmount);
console.log(' - Adjusted Discount:', fin3.adjustedDiscount);
console.log(' - Adjusted Subtotal:', fin3.adjustedSubtotal);

assert.strictEqual(fin3.cancelledGrossAmount, 200, 'Cancelled gross must be 200');
assert.strictEqual(fin3.cancelledAllocatedDiscount, 20, 'Allocated discount must be 20');
assert.strictEqual(fin3.refundableCancelledAmount, 180, 'Refund must be 200 - 20 = 180');
assert.strictEqual(fin3.adjustedDiscount, 40, 'Remaining discount must be 40');
assert.strictEqual(fin3.adjustedSubtotal, 360, 'Adjusted subtotal must be 360');

console.log('✔ Test 3 PASSED: Partial quantity refund exactly matches 180.\n');

console.log('=== ALL CANCELLATION, DISCOUNT & REFUND TESTS PASSED 100% ===');
