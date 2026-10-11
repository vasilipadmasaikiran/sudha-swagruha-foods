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
  shippingResult?: any;
}

export interface CalculationStep {
  step: string;
  label: string;
  amount: number;
  operation: 'add' | 'subtract' | 'result' | 'info';
  description?: string;
}

export interface OrderFinancialSummary {
  // Subtotals & Discounts
  originalSubtotal: number; // Gross sum of (unit_price * quantity) of all items before cancellations
  originalAmount: number; // Alias for originalSubtotal (Total price before discounts - Requirement 1.2)
  originalProductSubtotal: number; // Explicit authoritative alias
  productDiscount: number; // Item-level discounts
  itemDiscount: number; // Alias for productDiscount
  subtotalAfterItemDiscount: number;
  originalOrderDiscount: number; // Original coupon/order discount BEFORE cancellations
  originalCouponDiscount: number; // Alias for originalOrderDiscount
  adjustedDiscount: number; // Active coupon/order discount remaining on uncancelled items
  orderDiscount: number; // Active Order/Coupon discount (= adjustedDiscount)
  couponDiscount: number; // Alias for orderDiscount
  campaignDiscount: number; // Campaign / storewide promotional discount
  totalDiscount: number; // productDiscount + orderDiscount + campaignDiscount
  discountAmount: number; // Alias for totalDiscount (Total eligible discount - Requirement 1.2)
  
  // Cancellations & Returns
  cancelledAmount: number; // Value of cancelled / removed items (gross)
  cancelledGrossAmount: number; // Gross value of cancelled items
  cancelledAllocatedDiscount: number; // Proportional discount attributable to cancelled items
  refundableCancelledAmount: number; // Net customer amount refundable for cancelled items
  adjustedProductTotal: number; // Gross items remaining (originalSubtotal - cancelledGrossAmount)
  returnedAmount: number; // Value of returned items
  adjustedSubtotal: number; // Authoritative payable product subtotal
  taxableAmount: number; // Base taxable amount (adjustedSubtotal)
  
  // Taxes / GST
  gstRate: number; // Applied GST rate %
  gstAmount: number; // Applied GST amount
  taxAmount: number; // Alias for gstAmount

  // Delivery / Shipping
  calculatedShipping: number; // Original calculated delivery fee
  shippingCharge: number; // Alias for calculatedShipping
  shippingOverride?: number; // Admin override delivery fee if set
  finalShipping: number; // Effective shipping fee applied
  shippingAmount: number; // Alias for finalShipping
  shippingResult?: any; // Full calculation breakdown from calculateShipping

  // Other Charges
  otherCharges: number; // COD fee, packaging fee, etc.

  // Grand Totals
  originalOrderTotal: number; // Order total before cancellations
  adjustedOrderTotal: number; // Order total after item cancellations
  finalOrderTotal: number; // Final payable amount (adjustedSubtotal + finalShipping + tax + otherCharges)
  finalAmount: number; // Alias for finalOrderTotal (Final adjusted amount payable - Requirement 1.2)
  grandTotal: number; // Alias for finalOrderTotal

  // Payment Reconciliation
  totalAmountReceived: number; // Verified payments collected
  amountPaid: number; // Alias for totalAmountReceived
  balanceAmount: number; // Math.max(0, finalOrderTotal - totalAmountReceived)
  amountDue: number; // Alias for balanceAmount
  excessAmount: number; // Math.max(0, totalAmountReceived - finalOrderTotal)
  refundAmount: number; // Total refund required / due
  refundDue: number; // Explicit refund due
  refundedAmount: number; // Amount actually refunded
  amountRefunded: number; // Alias for refundedAmount
  pendingRefundAmount: number; // Refund initiated but pending processing
  netReceived: number; // totalAmountReceived - refundedAmount
  remainingRefundable: number; // Math.max(0, totalAmountReceived - refundedAmount)

  // Statuses
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid' | 'excess_payment' | 'refunded' | 'partially_refunded';
  
  // Audit, Diagnostics & Inspection
  recordedTotal?: number; // Stored total in DB for reconciliation comparison
  hasDiscrepancy?: boolean; // True if stored total deviates from calculated total
  discrepancyReason?: string; // Clear diagnostic explanation
  breakdown: CalculationStep[]; // Step-by-step trace for "View Calculation Details"
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
 * Single Authoritative Order Financial Calculation Engine
 * 
 * Authoritative Sequence:
 * 1. Gross Product Subtotal (sum of unit_price * quantity for all items)
 * 2. Less Product Discounts
 * 3. Less Order/Coupon Discounts
 * 4. Less Cancelled Items
 * 5. = Adjusted Subtotal
 * 6. Add Final Shipping (Calculated + Admin Override)
 * 7. Add Applicable Taxes (GST)
 * 8. Add Other Surcharges (COD)
 * 9. = FINAL ORDER TOTAL
 * 10. Reconcile Payments:
 *     - Paid < Total  => Balance Due (PARTIALLY PAID / UNPAID)
 *     - Paid == Total => Balance = 0 (FULLY PAID)
 *     - Paid > Total  => Excess Payment => Refund Due (EXCESS AMOUNT)
 */
export function calculateOrderFinancials(inputsOrOrder: any): OrderFinancialSummary {
  if (!inputsOrOrder) {
    return {
      originalSubtotal: 0,
      originalAmount: 0,
      originalProductSubtotal: 0,
      productDiscount: 0,
      itemDiscount: 0,
      subtotalAfterItemDiscount: 0,
      originalOrderDiscount: 0,
      originalCouponDiscount: 0,
      orderDiscount: 0,
      couponDiscount: 0,
      campaignDiscount: 0,
      totalDiscount: 0,
      discountAmount: 0,
      cancelledGrossAmount: 0,
      cancelledAllocatedDiscount: 0,
      refundableCancelledAmount: 0,
      adjustedProductTotal: 0,
      adjustedDiscount: 0,
      cancelledAmount: 0,
      returnedAmount: 0,
      adjustedSubtotal: 0,
      taxableAmount: 0,
      gstRate: 0,
      gstAmount: 0,
      taxAmount: 0,
      calculatedShipping: 0,
      shippingCharge: 0,
      finalShipping: 0,
      shippingAmount: 0,
      otherCharges: 0,
      originalOrderTotal: 0,
      adjustedOrderTotal: 0,
      finalOrderTotal: 0,
      finalAmount: 0,
      grandTotal: 0,
      totalAmountReceived: 0,
      amountPaid: 0,
      balanceAmount: 0,
      amountDue: 0,
      excessAmount: 0,
      refundAmount: 0,
      refundDue: 0,
      refundedAmount: 0,
      amountRefunded: 0,
      pendingRefundAmount: 0,
      netReceived: 0,
      remainingRefundable: 0,
      paymentStatus: 'unpaid',
      breakdown: [],
    };
  }

  const items = Array.isArray(inputsOrOrder.items) ? inputsOrOrder.items : [];
  
  // 1. Calculate Gross Subtotal, Cancelled Items & Item Discounts
  let grossSubtotal = 0;
  let cancelledItemsVal = 0;
  let itemDiscountVal = 0;
  let cancelledItemDiscountVal = 0;

  for (const it of items) {
    const unitPrice = roundToTwo(Number(it.unit_price || 0));
    const qty = Math.max(0, Number(it.quantity || 0));
    const lineTotal = it.total_price !== undefined ? roundToTwo(Number(it.total_price)) : roundToTwo(unitPrice * qty);
    
    grossSubtotal += lineTotal;
    
    const isCancelled = it.status === 'removed' || it.status === 'cancelled';
    const cancelledQty = Math.max(0, Number(it.cancelled_quantity || 0));

    if (isCancelled) {
      cancelledItemsVal += lineTotal;
      if (it.discount_amount || it.item_discount) {
        cancelledItemDiscountVal += roundToTwo(Number(it.discount_amount || it.item_discount || 0));
      }
    } else if (cancelledQty > 0) {
      const cancelledPart = roundToTwo(unitPrice * cancelledQty);
      cancelledItemsVal += cancelledPart;
      if (it.discount_amount || it.item_discount) {
        const itemDisc = Number(it.discount_amount || it.item_discount || 0);
        const proportionalDisc = qty > 0 ? roundToTwo((itemDisc / qty) * cancelledQty) : 0;
        cancelledItemDiscountVal += proportionalDisc;
        itemDiscountVal += roundToTwo(itemDisc - proportionalDisc);
      }
    } else {
      if (it.discount_amount || it.item_discount) {
        itemDiscountVal += roundToTwo(Number(it.discount_amount || it.item_discount || 0));
      }
    }
  }

  // Fallback if order has top-level subtotal but no items array populated
  if (items.length === 0) {
    if (inputsOrOrder.originalSubtotal !== undefined) {
      grossSubtotal = roundToTwo(Number(inputsOrOrder.originalSubtotal));
    } else if (inputsOrOrder.original_subtotal !== undefined) {
      grossSubtotal = roundToTwo(Number(inputsOrOrder.original_subtotal));
    } else if (inputsOrOrder.gross_subtotal !== undefined) {
      grossSubtotal = roundToTwo(Number(inputsOrOrder.gross_subtotal));
    } else if (inputsOrOrder.subtotal !== undefined) {
      const rawSub = roundToTwo(Number(inputsOrOrder.subtotal));
      const rawTot = inputsOrOrder.total !== undefined ? roundToTwo(Number(inputsOrOrder.total)) : undefined;
      const rawDisc = inputsOrOrder.discount !== undefined ? roundToTwo(Number(inputsOrOrder.discount)) : 0;
      // CRITICAL PREVENT DOUBLE DISCOUNT DEDUCTION (Section 2.3):
      // If rawSub <= rawTot (or rawSub === rawTot) while rawDisc > 0, the stored subtotal
      // was already recorded AFTER discount deduction!
      // In that case, the original subtotal before discounts was rawSub + rawDisc.
      if (rawTot !== undefined && rawDisc > 0 && Math.abs(rawSub - rawTot) <= 0.05) {
        grossSubtotal = roundToTwo(rawSub + rawDisc);
      } else {
        grossSubtotal = rawSub;
      }
    }
  }

  const originalSubtotal = roundToTwo(grossSubtotal);
  const cancelledGrossAmount = roundToTwo(cancelledItemsVal);
  const productDiscount = roundToTwo(itemDiscountVal);

  // 2. Separate Discount Types (Section 2.4: Product, Coupon, Campaign)
  let originalOrderDiscount = 0;
  const campaignDiscount = roundToTwo(Number(inputsOrOrder.campaign_discount || inputsOrOrder.campaignDiscount || 0));

  // Check stored allocated discounts on already-cancelled items
  let storedAllocatedDiscountsSum = 0;
  for (const it of items) {
    if (it.status === 'removed' || it.status === 'cancelled') {
      if ((it as any).allocated_discount !== undefined && Number((it as any).allocated_discount) > 0) {
        storedAllocatedDiscountsSum += roundToTwo(Number((it as any).allocated_discount));
      }
    }
  }

  if (inputsOrOrder.original_discount !== undefined && Number(inputsOrOrder.original_discount) > 0) {
    originalOrderDiscount = roundToTwo(Number(inputsOrOrder.original_discount));
  } else if (inputsOrOrder.original_coupon_discount !== undefined && Number(inputsOrOrder.original_coupon_discount) > 0) {
    originalOrderDiscount = roundToTwo(Number(inputsOrOrder.original_coupon_discount));
  } else if (inputsOrOrder.originalOrderDiscount !== undefined && Number(inputsOrOrder.originalOrderDiscount) > 0) {
    originalOrderDiscount = roundToTwo(Number(inputsOrOrder.originalOrderDiscount));
  } else if (inputsOrOrder.fixedCouponDiscount && inputsOrOrder.fixedCouponDiscount > 0) {
    originalOrderDiscount = roundToTwo(inputsOrOrder.fixedCouponDiscount);
  } else if (inputsOrOrder.couponDiscountPercent && inputsOrOrder.couponDiscountPercent > 0) {
    originalOrderDiscount = roundToTwo((originalSubtotal * inputsOrOrder.couponDiscountPercent) / 100);
  } else if (inputsOrOrder.coupon_discount !== undefined) {
    const rawC = roundToTwo(Number(inputsOrOrder.coupon_discount));
    originalOrderDiscount = storedAllocatedDiscountsSum > 0 ? roundToTwo(rawC + storedAllocatedDiscountsSum) : rawC;
  } else if (inputsOrOrder.order_discount !== undefined) {
    const rawO = roundToTwo(Number(inputsOrOrder.order_discount));
    originalOrderDiscount = storedAllocatedDiscountsSum > 0 ? roundToTwo(rawO + storedAllocatedDiscountsSum) : rawO;
  } else if (inputsOrOrder.discount_amount !== undefined) {
    const rawD = Math.max(0, roundToTwo(Number(inputsOrOrder.discount_amount) - productDiscount - campaignDiscount));
    originalOrderDiscount = storedAllocatedDiscountsSum > 0 ? roundToTwo(rawD + storedAllocatedDiscountsSum) : rawD;
  } else if (inputsOrOrder.discount !== undefined) {
    const rawD = Math.max(0, roundToTwo(Number(inputsOrOrder.discount) - productDiscount - campaignDiscount));
    originalOrderDiscount = storedAllocatedDiscountsSum > 0 ? roundToTwo(rawD + storedAllocatedDiscountsSum) : rawD;
  }

  // 3. Proportional Discount Allocation on Cancelled Items (Requirements 1.1 - 1.7)
  let cancelledAllocatedDiscount = 0;
  const isOrderCancelled = inputsOrOrder.order_status === 'cancelled';

  if (isOrderCancelled) {
    cancelledAllocatedDiscount = originalOrderDiscount;
  } else if (storedAllocatedDiscountsSum > 0) {
    cancelledAllocatedDiscount = Math.min(originalOrderDiscount, roundToTwo(storedAllocatedDiscountsSum));
  } else if (originalSubtotal > 0 && originalOrderDiscount > 0 && cancelledGrossAmount > 0) {
    // Proportional order-level discount attributable to cancelled items (Section 2.5)
    const effectiveDiscountRate = originalOrderDiscount / originalSubtotal;
    const allocatedOrderDiscount = roundToTwo(cancelledGrossAmount * effectiveDiscountRate);
    cancelledAllocatedDiscount = Math.min(originalOrderDiscount, roundToTwo(allocatedOrderDiscount + cancelledItemDiscountVal));
  } else if (cancelledItemDiscountVal > 0) {
    cancelledAllocatedDiscount = roundToTwo(cancelledItemDiscountVal);
  }

  // Net customer amount refundable for cancelled items
  const refundableCancelledAmount = Math.max(0, roundToTwo(cancelledGrossAmount - cancelledAllocatedDiscount));

  // Adjusted active discount remaining on uncancelled items
  const adjustedDiscount = Math.max(0, roundToTwo(originalOrderDiscount - cancelledAllocatedDiscount));

  // Adjusted product gross remaining
  const adjustedProductTotal = Math.max(0, roundToTwo(originalSubtotal - cancelledGrossAmount));

  // Adjusted Subtotal (Authoritative payable product subtotal)
  const adjustedSubtotal = isOrderCancelled
    ? 0
    : Math.max(0, roundToTwo(adjustedProductTotal - adjustedDiscount - productDiscount - campaignDiscount));

  const cancelledAmount = cancelledGrossAmount;
  const subtotalAfterItemDiscount = Math.max(0, roundToTwo(originalSubtotal - productDiscount));
  const orderDiscount = adjustedDiscount;
  const totalDiscount = roundToTwo(productDiscount + orderDiscount + campaignDiscount);
  const taxableAmount = adjustedSubtotal;

  // 4. GST Tax Calculation
  let gstRate = 0;
  let gstAmount = 0;

  if (inputsOrOrder.historicalGstRate !== undefined && inputsOrOrder.historicalGstAmount !== undefined) {
    gstRate = roundToTwo(inputsOrOrder.historicalGstRate);
    gstAmount = roundToTwo(inputsOrOrder.historicalGstAmount);
  } else if (inputsOrOrder.gst_amount !== undefined) {
    gstRate = roundToTwo(Number(inputsOrOrder.gst_rate || 0));
    gstAmount = roundToTwo(Number(inputsOrOrder.gst_amount || 0));
  } else if (inputsOrOrder.total_amount !== undefined || inputsOrOrder.total !== undefined || inputsOrOrder.final_amount !== undefined) {
    // Existing stored order without explicit gst_amount: preserve recorded tax rather than retroactively altering historical total
    gstRate = roundToTwo(Number(inputsOrOrder.gst_rate || 0));
    gstAmount = roundToTwo(Number(inputsOrOrder.gst_amount || 0));
  } else {
    const taxConfig = inputsOrOrder.taxConfig || DEFAULT_TAX_CONFIG;
    if (taxConfig.gstEnabled && taxConfig.gstRate > 0) {
      gstRate = roundToTwo(taxConfig.gstRate);
      gstAmount = roundToTwo((taxableAmount * gstRate) / 100);
    }
  }

  // 5. Shipping / Delivery Charges
  const calculatedShipping = roundToTwo(
    inputsOrOrder.calculated_delivery_charge !== undefined
      ? Number(inputsOrOrder.calculated_delivery_charge)
      : inputsOrOrder.shipping_snapshot?.originalCalculatedCharge !== undefined
      ? Number(inputsOrOrder.shipping_snapshot.originalCalculatedCharge)
      : inputsOrOrder.shipping_snapshot?.shippingCharge !== undefined
      ? Number(inputsOrOrder.shipping_snapshot.shippingCharge)
      : inputsOrOrder.shippingCharge !== undefined
      ? Number(inputsOrOrder.shippingCharge)
      : inputsOrOrder.delivery_charge !== undefined
      ? Number(inputsOrOrder.delivery_charge)
      : 0
  );

  const shippingOverride =
    inputsOrOrder.admin_shipping_override !== undefined
      ? roundToTwo(Number(inputsOrOrder.admin_shipping_override))
      : undefined;

  const finalShipping = shippingOverride !== undefined ? shippingOverride : calculatedShipping;

  // 6. Other Charges (COD Surcharges, etc.)
  let otherCharges = 0;
  if (inputsOrOrder.shipping_snapshot?.breakdown?.codCharge) {
    otherCharges = roundToTwo(Number(inputsOrOrder.shipping_snapshot.breakdown.codCharge));
  }

  // 7. Grand Totals
  const originalOrderTotal = roundToTwo(Math.max(0, originalSubtotal - totalDiscount + finalShipping + gstAmount + otherCharges));
  const finalOrderTotal = roundToTwo(Math.max(0, adjustedSubtotal + finalShipping + gstAmount + otherCharges));

  // 8. Payments & Reconciliation
  let totalPaymentsCollected = 0;
  if (Array.isArray(inputsOrOrder.payments) && inputsOrOrder.payments.length > 0) {
    totalPaymentsCollected = inputsOrOrder.payments
      .filter((p: any) => p.status === 'success')
      .reduce((sum: number, p: any) => sum + roundToTwo(Number(p.amount || 0)), 0);
  } else if (inputsOrOrder.amountPaid !== undefined) {
    totalPaymentsCollected = roundToTwo(Number(inputsOrOrder.amountPaid));
  } else if (inputsOrOrder.amount_paid !== undefined) {
    totalPaymentsCollected = roundToTwo(Number(inputsOrOrder.amount_paid));
  } else if (inputsOrOrder.payment_status === 'paid') {
    totalPaymentsCollected = roundToTwo(Number(inputsOrOrder.total || finalOrderTotal));
  }

  const totalAmountReceived = roundToTwo(totalPaymentsCollected);

  // 9. Refunds
  let totalRefundsIssued = 0;
  let totalPendingRefunds = 0;

  if (Array.isArray(inputsOrOrder.refunds) && inputsOrOrder.refunds.length > 0) {
    totalRefundsIssued = inputsOrOrder.refunds
      .filter((r: any) => r.status === 'success')
      .reduce((sum: number, r: any) => sum + roundToTwo(Number(r.amount || 0)), 0);

    totalPendingRefunds = inputsOrOrder.refunds
      .filter((r: any) => r.status === 'pending' || r.status === 'processing')
      .reduce((sum: number, r: any) => sum + roundToTwo(Number(r.amount || 0)), 0);
  } else if (inputsOrOrder.amountRefunded !== undefined) {
    totalRefundsIssued = roundToTwo(Number(inputsOrOrder.amountRefunded));
  } else if (inputsOrOrder.refunded_amount !== undefined) {
    totalRefundsIssued = roundToTwo(Number(inputsOrOrder.refunded_amount));
  }

  const refundedAmount = roundToTwo(totalRefundsIssued);
  const pendingRefundAmount = roundToTwo(totalPendingRefunds);

  // Balance & Excess Calculations
  const balanceAmount = Math.max(0, roundToTwo(finalOrderTotal - totalAmountReceived));
  const excessAmount = Math.max(0, roundToTwo(totalAmountReceived - finalOrderTotal));
  
  // Overall Refund Amount Due
  const refundAmount = excessAmount > 0 ? excessAmount : Math.max(refundedAmount, pendingRefundAmount);
  const netReceived = Math.max(0, roundToTwo(totalAmountReceived - refundedAmount));
  const remainingRefundable = Math.max(0, roundToTwo(totalAmountReceived - refundedAmount));

  // 10. Canonical Payment Status
  let canonicalPaymentStatus: 'unpaid' | 'partially_paid' | 'paid' | 'excess_payment' | 'refunded' | 'partially_refunded';

  if (isOrderCancelled) {
    if (refundedAmount >= totalAmountReceived && totalAmountReceived > 0) {
      canonicalPaymentStatus = 'refunded';
    } else if (totalAmountReceived > 0) {
      canonicalPaymentStatus = 'partially_refunded';
    } else {
      canonicalPaymentStatus = 'unpaid';
    }
  } else {
    if (refundedAmount >= totalAmountReceived && totalAmountReceived > 0) {
      canonicalPaymentStatus = 'refunded';
    } else if (refundedAmount > 0) {
      canonicalPaymentStatus = 'partially_refunded';
    } else if (excessAmount > 0) {
      canonicalPaymentStatus = 'excess_payment';
    } else if (totalAmountReceived >= finalOrderTotal && finalOrderTotal > 0) {
      canonicalPaymentStatus = 'paid';
    } else if (totalAmountReceived > 0) {
      canonicalPaymentStatus = 'partially_paid';
    } else {
      canonicalPaymentStatus = 'unpaid';
    }
  }

  // 11. Stored vs Calculated Reconciliation
  const recordedTotal = inputsOrOrder.total !== undefined ? roundToTwo(Number(inputsOrOrder.total)) : undefined;
  let hasDiscrepancy = false;
  let discrepancyReason: string | undefined = undefined;

  if (recordedTotal !== undefined && Math.abs(finalOrderTotal - recordedTotal) > 0.05) {
    hasDiscrepancy = true;
    if (cancelledAmount > 0 && Math.abs(originalOrderTotal - recordedTotal) <= 0.05) {
      discrepancyReason = `Stored total (₹${recordedTotal}) does not reflect ₹${cancelledAmount} in cancelled items.`;
    } else if (shippingOverride !== undefined && Math.abs((originalOrderTotal - shippingOverride + calculatedShipping) - recordedTotal) <= 0.05) {
      discrepancyReason = `Stored total (₹${recordedTotal}) does not reflect shipping override adjustment.`;
    } else {
      discrepancyReason = `Calculation mismatch: Stored total is ₹${recordedTotal}, but authoritative calculation is ₹${finalOrderTotal} (Difference: ₹${roundToTwo(finalOrderTotal - recordedTotal)}).`;
    }
  }

  // 12. Step-by-Step Breakdown for "View Calculation Details"
  let runningSubtotal = originalSubtotal;

  const breakdown: CalculationStep[] = [
    {
      step: '1',
      label: 'Gross Product Subtotal',
      amount: originalSubtotal,
      operation: 'add',
      description: `Sum of unit price × quantity across all items (Running Subtotal: ₹${roundToTwo(runningSubtotal)})`,
    },
  ];

  if (productDiscount > 0) {
    runningSubtotal = roundToTwo(runningSubtotal - productDiscount);
    breakdown.push({
      step: '2',
      label: 'Product Discounts',
      amount: productDiscount,
      operation: 'subtract',
      description: `Direct item-level reductions (Running Subtotal: ₹${roundToTwo(runningSubtotal)})`,
    });
  }

  if (originalOrderDiscount > 0) {
    runningSubtotal = roundToTwo(runningSubtotal - originalOrderDiscount);
    breakdown.push({
      step: '3',
      label: `Coupon / Order Discount ${inputsOrOrder.coupon_code ? `(${inputsOrOrder.coupon_code})` : ''}`,
      amount: originalOrderDiscount,
      operation: 'subtract',
      description: `Cart-level promotional discount applied at checkout (Running Subtotal: ₹${roundToTwo(runningSubtotal)})`,
    });
  }

  if (cancelledAmount > 0) {
    runningSubtotal = roundToTwo(runningSubtotal - cancelledAmount);
    breakdown.push({
      step: '4',
      label: 'Cancelled Items (Gross)',
      amount: cancelledAmount,
      operation: 'subtract',
      description: `List price of cancelled items removed from order (Running Subtotal: ₹${roundToTwo(runningSubtotal)})`,
    });
    if (cancelledAllocatedDiscount > 0) {
      runningSubtotal = roundToTwo(runningSubtotal + cancelledAllocatedDiscount);
      breakdown.push({
        step: '4b',
        label: 'Allocated Discount Reversal',
        amount: cancelledAllocatedDiscount,
        operation: 'add',
        description: `Proportional coupon discount (+₹${cancelledAllocatedDiscount}) attributed to cancelled items returned to order total (Running Subtotal: ₹${roundToTwo(runningSubtotal)})`,
      });
    }
    breakdown.push({
      step: '4c',
      label: 'Net Customer Deduction for Cancelled Items',
      amount: refundableCancelledAmount,
      operation: 'info',
      description: `Net payable amount removed from order (Gross ₹${cancelledAmount} - Allocated Discount ₹${cancelledAllocatedDiscount} = ₹${refundableCancelledAmount})`,
    });
  }

  breakdown.push({
    step: '5',
    label: 'Adjusted Subtotal',
    amount: adjustedSubtotal,
    operation: 'result',
    description: `Payable product value after all discounts & item cancellations (Running: ₹${roundToTwo(adjustedSubtotal)})`,
  });

  if (calculatedShipping > 0 || finalShipping > 0) {
    breakdown.push({
      step: '6',
      label: shippingOverride !== undefined
        ? `Shipping (Calculated: ₹${calculatedShipping}, Override: ₹${shippingOverride})`
        : 'Delivery / Shipping Fee',
      amount: finalShipping,
      operation: 'add',
      description: finalShipping === 0 ? 'Free Shipping Qualified' : 'Standard Delivery Rate',
    });
  }

  if (gstAmount > 0) {
    breakdown.push({
      step: '7',
      label: `GST Tax (${gstRate}%)`,
      amount: gstAmount,
      operation: 'add',
      description: 'Goods & Services Tax',
    });
  }

  if (otherCharges > 0) {
    breakdown.push({
      step: '8',
      label: 'Other Surcharges (COD)',
      amount: otherCharges,
      operation: 'add',
      description: 'Cash on delivery handling',
    });
  }

  breakdown.push({
    step: '9',
    label: 'Final Order Total',
    amount: finalOrderTotal,
    operation: 'result',
    description: 'Final authoritative payable amount',
  });

  breakdown.push({
    step: '10',
    label: 'Total Amount Received',
    amount: totalAmountReceived,
    operation: 'info',
    description: `Verified payments collected (${canonicalPaymentStatus.toUpperCase().replace('_', ' ')})`,
  });

  if (balanceAmount > 0) {
    breakdown.push({
      step: '11',
      label: 'Balance Amount Due',
      amount: balanceAmount,
      operation: 'result',
      description: 'Outstanding balance pending payment',
    });
  }

  if (excessAmount > 0) {
    breakdown.push({
      step: '11',
      label: 'Excess Amount (Refund Due)',
      amount: excessAmount,
      operation: 'result',
      description: 'Amount paid exceeds order total; refund required',
    });
  }

  if (refundedAmount > 0) {
    breakdown.push({
      step: '12',
      label: 'Refund Issued to Customer',
      amount: refundedAmount,
      operation: 'info',
      description: 'Funds successfully returned to customer',
    });
  }

  return {
    originalSubtotal,
    originalAmount: originalSubtotal,
    originalProductSubtotal: originalSubtotal,
    productDiscount,
    itemDiscount: productDiscount,
    subtotalAfterItemDiscount,
    originalOrderDiscount,
    originalCouponDiscount: originalOrderDiscount,
    adjustedDiscount,
    orderDiscount: adjustedDiscount,
    couponDiscount: adjustedDiscount,
    campaignDiscount,
    totalDiscount,
    discountAmount: totalDiscount,
    cancelledAmount,
    cancelledGrossAmount,
    cancelledAllocatedDiscount,
    refundableCancelledAmount,
    adjustedProductTotal,
    returnedAmount: 0,
    adjustedSubtotal,
    taxableAmount,
    gstRate,
    gstAmount,
    taxAmount: gstAmount,
    calculatedShipping,
    shippingCharge: calculatedShipping,
    shippingOverride,
    finalShipping,
    shippingAmount: finalShipping,
    shippingResult: inputsOrOrder.shippingResult,
    otherCharges,
    originalOrderTotal,
    adjustedOrderTotal: finalOrderTotal,
    finalOrderTotal,
    finalAmount: finalOrderTotal,
    grandTotal: finalOrderTotal,
    totalAmountReceived,
    amountPaid: totalAmountReceived,
    balanceAmount,
    amountDue: balanceAmount,
    excessAmount,
    refundAmount,
    refundDue: excessAmount > 0 ? excessAmount : Math.max(0, refundAmount - refundedAmount),
    refundedAmount,
    amountRefunded: refundedAmount,
    pendingRefundAmount,
    netReceived,
    remainingRefundable,
    paymentStatus: canonicalPaymentStatus,
    recordedTotal,
    hasDiscrepancy,
    discrepancyReason,
    breakdown,
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

export interface ManualPaymentValidationResult {
  valid: boolean;
  error?: string;
  paymentAmount: number;
  currentPaid: number;
  newTotalPaid: number;
  orderTotal: number;
  newAmountDue: number;
  newPaymentStatus: 'unpaid' | 'partially_paid' | 'paid' | 'refunded' | 'partially_refunded';
}

/**
 * Validates manual payments with authoritative business rules:
 * 1. Payment amount must be strictly > 0
 * 2. New Total Paid must NOT exceed Order Total
 * 3. Never trusts frontend; recalculates amounts and status
 */
export function validateManualPayment(
  order: { total?: number; amount_paid?: number; refunded_amount?: number; payment_status?: string },
  incomingPaymentAmount: number
): ManualPaymentValidationResult {
  const paymentAmount = roundToTwo(incomingPaymentAmount);
  const orderTotal = roundToTwo(Number(order.total || 0));
  const currentPaid = roundToTwo(
    order.amount_paid !== undefined
      ? order.amount_paid
      : order.payment_status === 'paid'
      ? orderTotal
      : 0
  );
  const currentRefunded = roundToTwo(Number(order.refunded_amount || 0));

  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    return {
      valid: false,
      error: 'Payment amount must be greater than ₹0.00',
      paymentAmount: 0,
      currentPaid,
      newTotalPaid: currentPaid,
      orderTotal,
      newAmountDue: Math.max(0, roundToTwo(orderTotal - currentPaid)),
      newPaymentStatus: derivePaymentStatus(orderTotal, currentPaid, currentRefunded),
    };
  }

  const newTotalPaid = roundToTwo(currentPaid + paymentAmount);
  if (newTotalPaid > orderTotal) {
    const maxAllowed = Math.max(0, roundToTwo(orderTotal - currentPaid));
    return {
      valid: false,
      error: `Payment rejected: ₹${currentPaid.toLocaleString('en-IN')} already paid + ₹${paymentAmount.toLocaleString('en-IN')} exceeds order total ₹${orderTotal.toLocaleString('en-IN')}. Maximum allowable payment is ₹${maxAllowed.toLocaleString('en-IN')}.`,
      paymentAmount,
      currentPaid,
      newTotalPaid,
      orderTotal,
      newAmountDue: maxAllowed,
      newPaymentStatus: derivePaymentStatus(orderTotal, currentPaid, currentRefunded),
    };
  }

  const newAmountDue = Math.max(0, roundToTwo(orderTotal - newTotalPaid));
  const newPaymentStatus = derivePaymentStatus(orderTotal, newTotalPaid, currentRefunded);

  return {
    valid: true,
    paymentAmount,
    currentPaid,
    newTotalPaid,
    orderTotal,
    newAmountDue,
    newPaymentStatus,
  };
}

export interface OrderReconciliationItem {
  orderId: string;
  orderNumber: string;
  customerName: string;
  recordedTotal: number;
  calculatedTotal: number;
  difference: number;
  reason: string;
  financialSummary: OrderFinancialSummary;
}

/**
 * Diagnostic & Reconciliation Utility (Requirement 20.16)
 * Audits a collection of orders against the authoritative calculation engine
 * without silently mutating historical database records.
 */
export function diagnoseOrderFinancials(orders: any[]): {
  totalAudited: number;
  matchingCount: number;
  discrepancyCount: number;
  discrepancies: OrderReconciliationItem[];
} {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const discrepancies: OrderReconciliationItem[] = [];
  let matchingCount = 0;

  for (const o of safeOrders) {
    const fin = calculateOrderFinancials(o);
    const recordedTotal = o.total !== undefined ? roundToTwo(Number(o.total)) : fin.finalOrderTotal;
    const diff = roundToTwo(fin.finalOrderTotal - recordedTotal);

    if (Math.abs(diff) > 0.05) {
      discrepancies.push({
        orderId: o.id || o.order_number,
        orderNumber: o.order_number || o.id,
        customerName: o.customer_name || 'Customer',
        recordedTotal,
        calculatedTotal: fin.finalOrderTotal,
        difference: diff,
        reason: fin.discrepancyReason || `Calculation discrepancy of ₹${diff}`,
        financialSummary: fin,
      });
    } else {
      matchingCount++;
    }
  }

  return {
    totalAudited: safeOrders.length,
    matchingCount,
    discrepancyCount: discrepancies.length,
    discrepancies,
  };
}
