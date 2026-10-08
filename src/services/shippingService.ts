// ============================================================
// Central Authoritative Shipping & Delivery Calculation Engine
// Single Source of Truth for Shipping Charges across:
// Cart -> Checkout -> Order Creation -> Admin Console -> Track Order -> Invoices
// ============================================================
import { roundToTwo } from './orderCalculationService';

export interface DeliveryZone {
  id: string;
  name: string;
  states: string[];
  pincodePrefixes: string[];
  pincodes?: string[];
  charge: number;
  freeShippingThreshold?: number;
  freeThreshold?: number;
}

export interface WeightRule {
  maxWeightGrams: number;
  additionalCharge: number;
}

export interface OrderValueRule {
  minOrderValue: number;
  maxOrderValue: number;
  charge: number;
}

export interface ShippingSettings {
  enabled: boolean;
  defaultCharge: number; // e.g. 60
  defaultShippingCharge?: number;
  freeShippingThreshold: number; // e.g. 1000
  enableFreeShippingThreshold?: boolean;
  minOrderValueForFreeShipping: number; // e.g. 1000
  localDeliveryCharge: number; // e.g. 40
  standardDeliveryCharge: number; // e.g. 60
  expressDeliveryCharge: number; // e.g. 120
  expressShippingCharge?: number;
  enableExpressDelivery?: boolean;
  codAdditionalCharge: number; // e.g. 30
  enableCodExtraCharge?: boolean;
  allowLocalPickup: boolean;
  allowExpressDelivery: boolean;
  zones: DeliveryZone[];
  weightRules: WeightRule[];
  orderValueRules: OrderValueRule[];
  calculationMethod?: string;
  futureProviders?: any;
  calculationVersion: string;
}

export const defaultShippingSettings: ShippingSettings = {
  enabled: true,
  defaultCharge: 60,
  freeShippingThreshold: 1000,
  minOrderValueForFreeShipping: 1000,
  localDeliveryCharge: 40,
  standardDeliveryCharge: 60,
  expressDeliveryCharge: 120,
  codAdditionalCharge: 30,
  allowLocalPickup: false,
  allowExpressDelivery: false,
  zones: [
    {
      id: 'local-ap',
      name: 'Andhra Pradesh & Telangana (Local)',
      states: ['Andhra Pradesh', 'Telangana'],
      pincodePrefixes: ['50', '51', '52', '53'],
      charge: 40,
      freeShippingThreshold: 800,
    },
    {
      id: 'south-india',
      name: 'South India (Rest)',
      states: ['Karnataka', 'Tamil Nadu', 'Kerala'],
      pincodePrefixes: ['56', '57', '58', '59', '60', '61', '62', '63', '64', '67', '68', '69'],
      charge: 60,
      freeShippingThreshold: 1000,
    },
    {
      id: 'pan-india',
      name: 'Rest of India',
      states: [],
      pincodePrefixes: [],
      charge: 80,
      freeShippingThreshold: 1200,
    },
  ],
  weightRules: [
    { maxWeightGrams: 1000, additionalCharge: 0 },
    { maxWeightGrams: 3000, additionalCharge: 30 },
    { maxWeightGrams: 5000, additionalCharge: 60 },
  ],
  orderValueRules: [],
  calculationVersion: 'v2.1',
};

export interface ShippingAuditItem {
  previousShipping: number;
  newShipping: number;
  reason: string;
  changedBy: string;
  changedAt: string;
}

export interface ShippingSnapshot {
  shippingCharge: number;
  finalShippingCharge?: number; // Alias for shippingCharge
  originalCalculatedCharge: number;
  adminOverride?: number;
  overrideReason?: string;
  overriddenBy?: string;
  overriddenAt?: string;
  shippingRule: string;
  shippingZone?: string;
  shippingCalculationVersion: string;
  shippingCalculatedAt: string;
  auditTrail: ShippingAuditItem[];
}

export interface ShippingCalculationInputs {
  subtotal: number;
  customer?: { id?: string; name?: string; mobile?: string };
  deliveryAddress?: {
    city?: string;
    state?: string;
    pincode?: string;
  };
  deliveryMethod?: 'standard' | 'express' | 'local_pickup';
  paymentMethod?: 'online' | 'cod' | 'whatsapp';
  totalWeightGrams?: number;
  weightGrams?: number; // Alias
  settings?: ShippingSettings;
}

export interface ShippingCalculationResult {
  shippingCharge: number;
  finalShippingCharge?: number; // Alias
  isFree?: boolean; // Alias for isFreeShipping
  isFreeShipping: boolean;
  freeShippingThreshold: number;
  amountNeededForFreeShipping: number;
  ruleApplied: string;
  reason?: string; // Alias for ruleApplied
  zoneApplied?: string;
  zoneName?: string; // Alias for zoneApplied
  baseShippingCharge?: number;
  expressSurcharge?: number;
  codSurcharge?: number;
  calculationVersion: string;
  calculatedAt: string;
  breakdown: {
    baseCharge: number;
    zoneAdjustment: number;
    weightAdjustment: number;
    codCharge: number;
    expressCharge: number;
    discountWaiver: number;
  };
}

/**
 * Authoritative Single Calculation Engine for Shipping & Delivery
 */
export function calculateShipping(inputs: ShippingCalculationInputs): ShippingCalculationResult {
  const settings = inputs.settings || defaultShippingSettings;
  const calculatedAt = new Date().toISOString();
  const subtotal = Math.max(0, roundToTwo(inputs.subtotal));

  // If shipping is globally disabled
  if (!settings.enabled || subtotal <= 0) {
    return {
      shippingCharge: 0,
      finalShippingCharge: 0,
      isFree: true,
      isFreeShipping: true,
      freeShippingThreshold: settings.freeShippingThreshold,
      amountNeededForFreeShipping: 0,
      ruleApplied: 'Shipping globally disabled or empty cart',
      reason: 'Shipping globally disabled or empty cart',
      calculationVersion: settings.calculationVersion,
      calculatedAt,
      baseShippingCharge: 0,
      expressSurcharge: 0,
      codSurcharge: 0,
      breakdown: {
        baseCharge: 0,
        zoneAdjustment: 0,
        weightAdjustment: 0,
        codCharge: 0,
        expressCharge: 0,
        discountWaiver: 0,
      },
    };
  }

  // Determine Applicable Zone
  let activeZone: DeliveryZone | undefined;
  const state = inputs.deliveryAddress?.state?.trim().toLowerCase() || '';
  const pincode = inputs.deliveryAddress?.pincode?.trim() || '';

  if (settings.zones && settings.zones.length > 0) {
    activeZone = settings.zones.find((z) => {
      const stateMatch = z.states.some((s) => s.toLowerCase() === state);
      const pinMatch = z.pincodePrefixes.some((p) => pincode.startsWith(p));
      const exactPinMatch = z.pincodes ? z.pincodes.some((p) => p === pincode) : false;
      return stateMatch || pinMatch || exactPinMatch;
    });

    if (!activeZone) {
      // Default to fallback zone or standard
      activeZone = settings.zones.find((z) => z.id === 'pan-india') || settings.zones[settings.zones.length - 1];
    }
  }

  const effectiveThreshold = activeZone?.freeThreshold || activeZone?.freeShippingThreshold || settings.freeShippingThreshold;
  const baseCharge = activeZone ? activeZone.charge : (settings.defaultShippingCharge || settings.defaultCharge);

  // Check if Order Value qualifies for Free Shipping
  if (subtotal >= effectiveThreshold) {
    return {
      shippingCharge: 0,
      finalShippingCharge: 0,
      isFree: true,
      isFreeShipping: true,
      freeShippingThreshold: effectiveThreshold,
      amountNeededForFreeShipping: 0,
      ruleApplied: `Free shipping threshold reached (Subtotal >= ₹${effectiveThreshold.toLocaleString('en-IN')})`,
      reason: `Free shipping threshold reached (Subtotal >= ₹${effectiveThreshold.toLocaleString('en-IN')})`,
      zoneApplied: activeZone?.name,
      zoneName: activeZone?.name,
      calculationVersion: settings.calculationVersion,
      calculatedAt,
      baseShippingCharge: baseCharge,
      expressSurcharge: 0,
      codSurcharge: 0,
      breakdown: {
        baseCharge,
        zoneAdjustment: 0,
        weightAdjustment: 0,
        codCharge: 0,
        expressCharge: 0,
        discountWaiver: baseCharge,
      },
    };
  }

  // Weight Surcharges if applicable
  const totalWeight = inputs.weightGrams || inputs.totalWeightGrams || 0;
  let weightAdjustment = 0;
  if (totalWeight > 0 && settings.weightRules.length > 0) {
    const matchedWeightRule = settings.weightRules.find((w) => totalWeight <= w.maxWeightGrams);
    if (matchedWeightRule) {
      weightAdjustment = matchedWeightRule.additionalCharge;
    } else {
      const highestWeightRule = settings.weightRules[settings.weightRules.length - 1];
      weightAdjustment = highestWeightRule ? highestWeightRule.additionalCharge : 0;
    }
  }

  // Express or Special Delivery method
  let expressCharge = 0;
  const expressEnabled = settings.enableExpressDelivery ?? settings.allowExpressDelivery;
  const expressTarget = settings.expressShippingCharge || settings.expressDeliveryCharge;
  if (inputs.deliveryMethod === 'express' && expressEnabled) {
    expressCharge = Math.max(0, expressTarget - baseCharge);
  }

  // COD Extra Fee
  let codCharge = 0;
  const codExtra = settings.enableCodExtraCharge ? (settings.codAdditionalCharge || 0) : settings.codAdditionalCharge;
  if (inputs.paymentMethod === 'cod' && codExtra > 0) {
    codCharge = codExtra;
  }

  const finalCharge = roundToTwo(baseCharge + weightAdjustment + expressCharge + codCharge);
  const amountNeeded = Math.max(0, roundToTwo(effectiveThreshold - subtotal));
  const ruleText = activeZone ? `Standard Zone: ${activeZone.name}` : `Standard Delivery (Below ₹${effectiveThreshold})`;

  return {
    shippingCharge: finalCharge,
    finalShippingCharge: finalCharge,
    isFree: false,
    isFreeShipping: false,
    freeShippingThreshold: effectiveThreshold,
    amountNeededForFreeShipping: amountNeeded,
    ruleApplied: ruleText,
    reason: ruleText,
    zoneApplied: activeZone?.name,
    zoneName: activeZone?.name,
    calculationVersion: settings.calculationVersion,
    calculatedAt,
    baseShippingCharge: baseCharge,
    expressSurcharge: expressCharge,
    codSurcharge: codCharge,
    breakdown: {
      baseCharge,
      zoneAdjustment: 0,
      weightAdjustment,
      codCharge,
      expressCharge,
      discountWaiver: 0,
    },
  };
}

/**
 * Creates an immutable snapshot for recording with an order at placement time
 */
export function createShippingSnapshot(
  result: ShippingCalculationResult,
  adminOverride?: number,
  overrideReason?: string,
  overriddenBy?: string
): ShippingSnapshot {
  const isOverridden = adminOverride !== undefined && adminOverride >= 0;
  const finalCharge = isOverridden ? roundToTwo(adminOverride) : result.shippingCharge;

  return {
    shippingCharge: finalCharge,
    finalShippingCharge: finalCharge,
    originalCalculatedCharge: result.shippingCharge,
    adminOverride: isOverridden ? finalCharge : undefined,
    overrideReason: isOverridden ? overrideReason || 'Admin Manual Override' : undefined,
    overriddenBy: isOverridden ? overriddenBy || 'Admin' : undefined,
    overriddenAt: isOverridden ? new Date().toISOString() : undefined,
    shippingRule: result.ruleApplied,
    shippingZone: result.zoneApplied,
    shippingCalculationVersion: result.calculationVersion,
    shippingCalculatedAt: result.calculatedAt,
    auditTrail: isOverridden
      ? [
          {
            previousShipping: result.shippingCharge,
            newShipping: finalCharge,
            reason: overrideReason || 'Initial Admin Override',
            changedBy: overriddenBy || 'Admin',
            changedAt: new Date().toISOString(),
          },
        ]
      : [],
  };
}
