// ============================================================
// Single Authoritative Order Financial Calculation Engine
// Consistent decimal-safe calculations for:
// Cart -> Checkout -> Order Creation -> Admin Details -> Track Order -> Reports
// ============================================================

export interface FinancialCalculationItem {
  product_id?: string;
  unit_price: number;
  quantity: number;
  total_price?: number;
  item_discount?: number;
  status?: string; // 'active' | 'removed' | 'cancelled'
}

export interface TaxConfiguration {
  gstEnabled: boolean;
  gstRate: number; // percentage, e.g. 18 or 12 or 5
  hsnCode?: string;
  gstNumber?: string;
}

export interface OrderFinancialInputs {
  items: FinancialCalculationItem[];
  couponDiscountPercent?: number; // percentage, e.g. 10 for 10%
  fixedCouponDiscount?: number; // fixed amount in INR if applicable
  shippingCharge?: number; // delivery fee
  taxConfig?: TaxConfiguration;
  amountPaid?: number;
  amountRefunded?: number;
  // If order already has historical snapshots:
  historicalGstRate?: number;
  historicalGstAmount?: number;
  historicalTaxableAmount?: number;
}

export interface OrderFinancialSummary {
  originalSubtotal: number; // sum of original (unit_price * quantity) of all active items
  itemDiscount: number; // discounts at item level
  subtotalAfterItemDiscount: number;
  couponDiscount: number; // discounts from coupon
  totalDiscount: number; // itemDiscount + couponDiscount
  taxableAmount: number; // base taxable amount (subtotal - discounts)
  gstRate: number; // applied GST % (0 if GST disabled)
  gstAmount: number; // calculated GST amount
  shippingAmount: number; // delivery / shipping charge
  grandTotal: number; // taxableAmount + gstAmount + shippingAmount
  amountPaid: number; // recorded payments received
  amountRefunded: number; // recorded refunds issued
  amountDue: number; // Math.max(0, grandTotal - amountPaid)
  netReceived: number; // amountPaid - amountRefunded
  remainingRefundable: number; // Math.max(0, amountPaid - amountRefunded)
}

/**
 * Standard rounding to 2 decimal places to avoid IEEE-754 floating point issues
 */
export function roundToTwo(num: number): number {
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Default fallback tax configuration
 */
export const DEFAULT_TAX_CONFIG: TaxConfiguration = {
  gstEnabled: true,
  gstRate: 18,
  hsnCode: '21069099',
  gstNumber: '',
};

/**
 * Authoritative Order Financial Calculator
 * 
 * Formula:
 * 1. Subtotal = sum(unit_price * quantity) for non-cancelled items
 * 2. Item Discounts = sum(item_discount)
 * 3. Coupon Discount = (Subtotal - Item Discounts) * (couponPercent / 100) + fixedCouponDiscount
 * 4. Taxable Amount = Subtotal - Total Discounts
 * 5. GST Amount = Taxable Amount * (gstRate / 100) [if GST enabled]
 * 6. Grand Total = Taxable Amount + GST Amount + Shipping
 * 7. Amount Due = max(0, Grand Total - Amount Paid)
 * 8. Remaining Refundable = max(0, Amount Paid - Amount Refunded)
 */
export function calculateOrderFinancials(inputs: OrderFinancialInputs): OrderFinancialSummary {
  const items = Array.isArray(inputs.items) ? inputs.items : [];
  
  // 1. Calculate active subtotal (ignore removed/cancelled items)
  let rawSubtotal = 0;
  let rawItemDiscount = 0;

  for (const it of items) {
    if (it.status === 'removed' || it.status === 'cancelled') {
      continue;
    }
    const unitPrice = roundToTwo(Number(it.unit_price || 0));
    const qty = Math.max(0, Number(it.quantity || 0));
    const lineTotal = it.total_price !== undefined ? roundToTwo(Number(it.total_price)) : roundToTwo(unitPrice * qty);
    rawSubtotal += lineTotal;
    rawItemDiscount += roundToTwo(Number(it.item_discount || 0));
  }

  const originalSubtotal = roundToTwo(rawSubtotal);
  const itemDiscount = roundToTwo(rawItemDiscount);
  const subtotalAfterItemDiscount = Math.max(0, roundToTwo(originalSubtotal - itemDiscount));

  // 2. Coupon Discount calculation
  let couponDiscount = 0;
  if (inputs.fixedCouponDiscount && inputs.fixedCouponDiscount > 0) {
    couponDiscount = roundToTwo(inputs.fixedCouponDiscount);
  } else if (inputs.couponDiscountPercent && inputs.couponDiscountPercent > 0) {
    couponDiscount = roundToTwo((subtotalAfterItemDiscount * inputs.couponDiscountPercent) / 100);
  }
  // Cap coupon discount so it never exceeds subtotal
  couponDiscount = Math.min(couponDiscount, subtotalAfterItemDiscount);

  const totalDiscount = roundToTwo(itemDiscount + couponDiscount);
  const taxableAmount = Math.max(0, roundToTwo(originalSubtotal - totalDiscount));

  // 3. GST Tax Calculation
  // If historical snapshot is provided (for existing orders), preserve historical values!
  let gstRate = 0;
  let gstAmount = 0;

  if (inputs.historicalGstRate !== undefined && inputs.historicalGstAmount !== undefined) {
    gstRate = inputs.historicalGstRate;
    gstAmount = roundToTwo(inputs.historicalGstAmount);
  } else {
    const taxConfig = inputs.taxConfig || DEFAULT_TAX_CONFIG;
    if (taxConfig.gstEnabled && taxConfig.gstRate > 0) {
      gstRate = roundToTwo(taxConfig.gstRate);
      gstAmount = roundToTwo((taxableAmount * gstRate) / 100);
    }
  }

  // 4. Shipping Amount
  const shippingAmount = roundToTwo(Number(inputs.shippingCharge || 0));

  // 5. Grand Total
  const grandTotal = roundToTwo(taxableAmount + gstAmount + shippingAmount);

  // 6. Payment & Due Amounts
  const amountPaid = roundToTwo(Number(inputs.amountPaid || 0));
  const amountRefunded = roundToTwo(Number(inputs.amountRefunded || 0));
  const amountDue = Math.max(0, roundToTwo(grandTotal - amountPaid));
  const netReceived = roundToTwo(amountPaid - amountRefunded);
  const remainingRefundable = Math.max(0, roundToTwo(amountPaid - amountRefunded));

  return {
    originalSubtotal,
    itemDiscount,
    subtotalAfterItemDiscount,
    couponDiscount,
    totalDiscount,
    taxableAmount,
    gstRate,
    gstAmount,
    shippingAmount,
    grandTotal,
    amountPaid,
    amountRefunded,
    amountDue,
    netReceived,
    remainingRefundable,
  };
}

/**
 * Derives the canonical payment status from financial values
 */
export function derivePaymentStatus(
  grandTotal: number,
  amountPaid: number,
  amountRefunded: number
): 'unpaid' | 'partially_paid' | 'paid' | 'refunded' | 'partially_refunded' {
  const paid = roundToTwo(amountPaid);
  const refunded = roundToTwo(amountRefunded);
  const total = roundToTwo(grandTotal);

  if (refunded > 0) {
    if (paid > 0 && refunded >= paid) {
      return 'refunded';
    }
    return 'partially_refunded';
  }

  if (paid <= 0) {
    return 'unpaid';
  }

  if (paid >= total) {
    return 'paid';
  }

  return 'partially_paid';
}
