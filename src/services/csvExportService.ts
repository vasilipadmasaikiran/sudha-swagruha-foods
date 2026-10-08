// ============================================================
// Single Authoritative CSV Export Service
// Requirements: 20.9, 20.10, 20.11
// Guarantees: CSV Value = Admin Console Value = Authoritative Calculation Engine
// Format: Excel-compatible UTF-8 with BOM, clean numeric columns, RFC-4180 escaping
// ============================================================

import { calculateOrderFinancials, type OrderFinancialSummary } from './orderCalculationService';

export interface CsvOrderRow {
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  orderStatus: string;
  productSubtotal: number;
  discount: number;
  couponDiscount: number;
  cancelledAmount: number;
  adjustedSubtotal: number;
  calculatedShipping: number;
  shippingOverride: string;
  finalShipping: number;
  tax: number;
  otherCharges: number;
  originalOrderTotal: number;
  adjustedOrderTotal: number;
  finalOrderTotal: number;
  totalAmountReceived: number;
  balanceAmount: number;
  excessAmount: number;
  refundAmount: number;
  refundedAmount: number;
  pendingRefundAmount: number;
  paymentStatus: string;
  refundStatus: string;
  paymentMethod: string;
  transactionReference: string;
  deliveryMethod: string;
  deliveryStatus: string;
  trackingNumber: string;
  createdDate: string;
  updatedDate: string;
}

/**
 * Escapes a cell value for standard CSV compatibility (RFC-4180)
 */
function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates an authoritative CSV row for a single order
 */
export function buildOrderCsvRow(order: any): (string | number)[] {
  const fin: OrderFinancialSummary = calculateOrderFinancials(order);

  const orderDate = order.created_at
    ? new Date(order.created_at).toISOString().replace('T', ' ').slice(0, 19)
    : '';
  const updatedDate = order.updated_at
    ? new Date(order.updated_at).toISOString().replace('T', ' ').slice(0, 19)
    : orderDate;

  // Derive refund status
  let refundStatus = 'none';
  if (fin.refundedAmount >= fin.totalAmountReceived && fin.totalAmountReceived > 0) {
    refundStatus = 'fully_refunded';
  } else if (fin.refundedAmount > 0) {
    refundStatus = 'partially_refunded';
  } else if (fin.pendingRefundAmount > 0) {
    refundStatus = 'pending';
  }

  // Derive payment method & reference
  let paymentMethod = 'online';
  let transactionReference = order.payment_id || order.razorpay_order_id || '';
  if (Array.isArray(order.payments) && order.payments.length > 0) {
    const latestPayment = order.payments[order.payments.length - 1];
    paymentMethod = latestPayment.payment_method || latestPayment.provider || paymentMethod;
    transactionReference = latestPayment.transaction_id || transactionReference;
  }

  const shippingOverrideStr = fin.shippingOverride !== undefined ? String(fin.shippingOverride) : 'None';

  return [
    order.order_number || order.id || '',
    orderDate,
    order.customer_name || 'Customer',
    order.customer_mobile || '',
    order.customer_email || '',
    order.order_status || 'placed',
    fin.originalSubtotal,
    fin.productDiscount,
    fin.orderDiscount,
    fin.cancelledAmount,
    fin.adjustedSubtotal,
    fin.calculatedShipping,
    shippingOverrideStr,
    fin.finalShipping,
    fin.taxAmount,
    fin.otherCharges,
    fin.originalOrderTotal,
    fin.adjustedOrderTotal,
    fin.finalOrderTotal,
    fin.totalAmountReceived,
    fin.balanceAmount,
    fin.excessAmount,
    fin.refundAmount,
    fin.refundedAmount,
    fin.pendingRefundAmount,
    fin.paymentStatus.toUpperCase(),
    refundStatus.toUpperCase(),
    paymentMethod.toUpperCase(),
    transactionReference,
    order.shipping_snapshot?.shippingRule || 'Standard Delivery',
    order.order_status || 'placed',
    order.tracking_id || order.courier_name || '',
    orderDate,
    updatedDate,
  ];
}

export const CSV_ORDER_HEADERS = [
  'Order Number',
  'Order Date',
  'Customer Name',
  'Customer Mobile',
  'Customer Email',
  'Order Status',
  'Product Subtotal',
  'Discount',
  'Coupon Discount',
  'Cancelled Amount',
  'Adjusted Subtotal',
  'Calculated Shipping',
  'Shipping Override',
  'Final Shipping',
  'Tax',
  'Other Charges',
  'Original Order Total',
  'Adjusted Order Total',
  'Final Order Total',
  'Total Amount Received',
  'Balance Amount',
  'Excess Amount',
  'Refund Amount',
  'Refunded Amount',
  'Pending Refund Amount',
  'Payment Status',
  'Refund Status',
  'Payment Method',
  'Transaction Reference',
  'Delivery Method',
  'Delivery Status',
  'Tracking Number',
  'Created Date',
  'Updated Date',
];

/**
 * Exports orders to an authoritative, Excel-compatible CSV file.
 * Automatically adds UTF-8 BOM (\uFEFF) and triggers browser download.
 */
export function exportOrdersToCsv(orders: any[], filenamePrefix: string = 'SSF_Orders_Financial_Report'): void {
  const safeOrders = Array.isArray(orders) ? orders : [];
  
  const headerLine = CSV_ORDER_HEADERS.map(escapeCsvCell).join(',');
  const rowLines = safeOrders.map((order) => {
    const row = buildOrderCsvRow(order);
    return row.map(escapeCsvCell).join(',');
  });

  // Prepend UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().slice(0, 10);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.setAttribute('download', `${filenamePrefix}_${timestamp}.csv`);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
}
