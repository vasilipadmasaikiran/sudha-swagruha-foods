// ============================================================
// Enterprise Product Pricing & Inventory Calculation Service
// Decimal-safe authoritative pricing & unit conversion engine
// Requirements 2.4, 3.2, 4.1, 4.2
// ============================================================

import type { Product, ProductVariant, MeasurementUnit, PricingModel } from '@/data/products';
import { roundToTwo } from './orderCalculationService';
import { parseWeightString } from '@/utils/productConsolidation';

export interface CalculatedLinePrice {
  basePrice: number;
  unitPrice: number;
  totalPrice: number;
  selectedWeight: string;
  selectedQuantity: number;
  pricingModel: PricingModel;
  stockAvailable: number;
  isAvailable: boolean;
  validationError?: string;
}

/**
 * Calculates authoritative line item price based on product configuration:
 * Model A: Price per Base Unit (e.g. ₹600/kg) -> Line Total = (weight_in_base_units) * base_price * quantity
 * Model B: Fixed Price Per Pack (e.g. 250g pack @ ₹180) -> Line Total = pack_price * quantity
 */
export function calculateLinePrice(
  product: Product,
  variant: ProductVariant,
  quantity: number
): CalculatedLinePrice {
  const safeQty = Math.max(1, Math.floor(quantity));
  const model: PricingModel = product.pricing_model || 'fixed_pack';
  const availableStock = variant.stock || 0;
  const isAvailable = availableStock >= safeQty;

  let unitPrice = variant.price;

  if (model === 'per_unit' && product.base_price_per_unit && product.base_price_per_unit > 0) {
    const parsed = parseWeightString(variant.weight);
    const baseUnit = product.base_unit || 'g';

    // Convert parsed weight to base unit ratio
    let baseUnitRatio = 1;
    if (baseUnit === 'kg') {
      baseUnitRatio = parsed.normalizedGrams / 1000;
    } else if (baseUnit === 'l') {
      baseUnitRatio = parsed.normalizedGrams / 1000;
    } else if (baseUnit === 'g') {
      baseUnitRatio = parsed.normalizedGrams;
    } else {
      baseUnitRatio = parsed.value;
    }

    unitPrice = roundToTwo(baseUnitRatio * product.base_price_per_unit);
  }

  const totalPrice = roundToTwo(unitPrice * safeQty);

  let validationError: string | undefined;
  if (!product.is_active) {
    validationError = `${product.name_en} is currently not available for purchase.`;
  } else if (product.is_archived) {
    validationError = `${product.name_en} has been discontinued.`;
  } else if (availableStock <= 0) {
    validationError = `${product.name_en} (${variant.weight}) is out of stock.`;
  } else if (availableStock < safeQty) {
    validationError = `Only ${availableStock} available for ${product.name_en} (${variant.weight}).`;
  }

  return {
    basePrice: product.base_price_per_unit || unitPrice,
    unitPrice,
    totalPrice,
    selectedWeight: variant.weight,
    selectedQuantity: safeQty,
    pricingModel: model,
    stockAvailable: availableStock,
    isAvailable: !validationError,
    validationError,
  };
}

/**
 * Validates requested item purchase against inventory rules
 */
export function validateVariantStock(
  variant: ProductVariant,
  requestedQuantity: number,
  productName: string = 'Item'
): { isValid: boolean; maxAllowed: number; error?: string } {
  const stock = Math.max(0, variant.stock || 0);
  if (stock === 0) {
    return {
      isValid: false,
      maxAllowed: 0,
      error: `${productName} (${variant.weight}) is currently out of stock.`,
    };
  }

  if (requestedQuantity > stock) {
    return {
      isValid: false,
      maxAllowed: stock,
      error: `Requested quantity (${requestedQuantity}) exceeds available stock (${stock}) for ${productName} (${variant.weight}).`,
    };
  }

  return { isValid: true, maxAllowed: stock };
}
