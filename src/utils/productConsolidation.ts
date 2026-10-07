// ============================================================
// Enterprise Product Deduplication & Consolidation Engine
// Consolidates fragmented weight-based product rows into a single
// authoritative product with configurable measurement variants.
// ============================================================

import type { Product, ProductVariant, MeasurementUnit, PricingModel, ProductStatus } from '@/data/products';
import type { DbProduct } from '@/services/supabase';

export interface ConsolidationReport {
  totalRawProducts: number;
  totalConsolidatedProducts: number;
  mergedProductCount: number;
  unresolvedCount: number;
  mergedGroups: Array<{
    canonicalName: string;
    canonicalSlug: string;
    variantCount: number;
    consolidatedWeights: string[];
    totalStock: number;
  }>;
}

/**
 * Normalizes a weight string to standard units and numeric values
 * e.g., "250g" -> { value: 250, unit: 'g', display: '250g', grams: 250 }
 *       "1kg"  -> { value: 1, unit: 'kg', display: '1kg', grams: 1000 }
 *       "500ml"-> { value: 500, unit: 'ml', display: '500ml', grams: 500 }
 */
export function parseWeightString(weightStr: string): {
  value: number;
  unit: MeasurementUnit;
  display: string;
  normalizedGrams: number;
} {
  const clean = (weightStr || '').trim().toLowerCase().replace(/\s+/g, '');
  const match = clean.match(/^(\d+(?:\.\d+)?)\s*(kg|g|ml|l|litre|litres|pcs|pieces|pack|packs)?$/i);

  if (!match) {
    return {
      value: 1,
      unit: 'packs',
      display: weightStr || '1 pack',
      normalizedGrams: 1000,
    };
  }

  const num = parseFloat(match[1]);
  const rawUnit = (match[2] || 'g').toLowerCase();

  let unit: MeasurementUnit = 'g';
  let normalizedGrams = num;

  if (rawUnit === 'kg') {
    unit = 'kg';
    normalizedGrams = num * 1000;
  } else if (rawUnit === 'l' || rawUnit === 'litre' || rawUnit === 'litres') {
    unit = 'l';
    normalizedGrams = num * 1000;
  } else if (rawUnit === 'ml') {
    unit = 'ml';
    normalizedGrams = num;
  } else if (rawUnit === 'pcs' || rawUnit === 'pieces') {
    unit = 'pcs';
    normalizedGrams = num;
  } else if (rawUnit === 'pack' || rawUnit === 'packs') {
    unit = 'packs';
    normalizedGrams = num;
  } else {
    unit = 'g';
    normalizedGrams = num;
  }

  return {
    value: num,
    unit,
    display: `${num}${unit}`,
    normalizedGrams,
  };
}

/**
 * Strips weight suffixes from slug or name to identify the canonical product identity
 * e.g. "andhra-avakaya-250g" -> "andhra-avakaya"
 *      "Andhra Avakaya - 500 g" -> "Andhra Avakaya"
 */
export function extractBaseSlug(slug: string): string {
  if (!slug) return '';
  return slug
    .toLowerCase()
    .replace(/-(\d+(?:\.\d+)?)(kg|g|ml|l|pcs|packs)$/i, '')
    .replace(/-(250g|500g|1kg|100g|2kg|5kg|100ml|200ml|500ml|1l)$/i, '')
    .trim();
}

export function extractBaseName(name: string): string {
  if (!name) return '';
  return name
    .replace(/\s*[-–(]?\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|l|pcs|packs|gms)\s*[)]?$/i, '')
    .replace(/\s*[-–(]?\s*(250g|500g|1kg|100g|2kg|5kg|100ml|500ml|1l)\s*[)]?$/i, '')
    .trim();
}

/**
 * Derives product status based on stock and activation
 */
export function computeProductStatus(
  isActive: boolean,
  totalStock: number,
  lowStockThreshold: number = 10,
  isArchived: boolean = false
): ProductStatus {
  if (isArchived) return 'archived';
  if (!isActive) return 'inactive';
  if (totalStock <= 0) return 'out_of_stock';
  if (totalStock <= lowStockThreshold) return 'low_stock';
  return 'active';
}

/**
 * Consolidates an array of raw products (from Supabase DbProduct or frontend Product)
 * into unified products with deduplicated weight variants.
 */
export function consolidateProductCatalog(
  rawProducts: Array<Product | DbProduct>
): {
  products: Product[];
  report: ConsolidationReport;
} {
  const groups = new Map<string, Array<Product | DbProduct>>();

  // Step 1: Group raw products by canonical base identity
  for (const item of rawProducts) {
    const rawName = 'name_en' in item ? item.name_en : '';
    const rawSlug = 'slug' in item ? item.slug : '';
    const baseName = extractBaseName(rawName).toLowerCase();
    const baseSlug = extractBaseSlug(rawSlug);
    const category = item.category || 'pickles';

    // Form grouping key combining normalized name and category
    const groupKey = `${category}:::${baseName || baseSlug}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(item);
  }

  const consolidatedList: Product[] = [];
  const mergedGroupReports: ConsolidationReport['mergedGroups'] = [];
  let mergedProductCount = 0;
  let unresolvedCount = 0;

  // Step 2: Merge each group into a single Product
  for (const [, items] of groups.entries()) {
    if (items.length === 0) continue;

    const primaryItem = items[0];
    const canonicalNameEn = extractBaseName(primaryItem.name_en);
    const canonicalNameTe = extractBaseName(primaryItem.name_te);
    const canonicalSlug = extractBaseSlug(primaryItem.slug) || primaryItem.slug;

    // Collect and merge variants
    const variantMap = new Map<string, ProductVariant>();
    let totalStock = 0;
    const allImages: string[] = [];

    for (const item of items) {
      // Gather images
      const itemImages = Array.isArray(item.images) ? item.images : [];
      for (const img of itemImages) {
        if (img && !allImages.includes(img)) {
          allImages.push(img);
        }
      }

      // Check if item already has a variants array (Product) or is a single-weight row (DbProduct)
      if ('variants' in item && Array.isArray(item.variants) && item.variants.length > 0) {
        for (const v of item.variants) {
          const parsed = parseWeightString(v.weight);
          const weightKey = parsed.display;
          const current = variantMap.get(weightKey);

          if (!current) {
            variantMap.set(weightKey, {
              weight: parsed.display,
              price: v.price,
              comparePrice: v.comparePrice,
              stock: v.stock,
              sku: v.sku || `SSF-${canonicalSlug.toUpperCase().slice(0, 6)}-${parsed.display.toUpperCase()}`,
            });
            totalStock += v.stock;
          } else {
            // If duplicate variant across items, combine stock and keep latest price
            current.stock += v.stock;
            totalStock += v.stock;
            if (v.price > 0) current.price = v.price;
            if (v.comparePrice) current.comparePrice = v.comparePrice;
          }
        }
      } else {
        // Single-weight row (DbProduct)
        const dbItem = item as DbProduct;
        const dbWeight = dbItem.weight || '250g';
        const parsed = parseWeightString(dbWeight);
        const weightKey = parsed.display;
        const current = variantMap.get(weightKey);

        const rowPrice = Number(dbItem.price || 0);
        const rowComparePrice = dbItem.compare_price ? Number(dbItem.compare_price) : undefined;
        const rowStock = Number(dbItem.stock || 0);
        const rowSku = dbItem.sku || `SSF-${canonicalSlug.toUpperCase().slice(0, 6)}-${parsed.display.toUpperCase()}`;

        if (!current) {
          variantMap.set(weightKey, {
            weight: parsed.display,
            price: rowPrice,
            comparePrice: rowComparePrice,
            stock: rowStock,
            sku: rowSku,
          });
          totalStock += rowStock;
        } else {
          current.stock += rowStock;
          totalStock += rowStock;
          if (rowPrice > 0) current.price = rowPrice;
          if (rowComparePrice) current.comparePrice = rowComparePrice;
        }
      }
    }

    // Sort variants by weight in ascending order (e.g. 100g, 250g, 500g, 1kg)
    const sortedVariants = Array.from(variantMap.values()).sort((a, b) => {
      const wA = parseWeightString(a.weight).normalizedGrams;
      const wB = parseWeightString(b.weight).normalizedGrams;
      return wA - wB;
    });

    // Ensure fallback variant if somehow empty
    if (sortedVariants.length === 0) {
      const dbPrimary = primaryItem as any;
      sortedVariants.push({
        weight: '250g',
        price: Number(dbPrimary.price || 150),
        comparePrice: dbPrimary.compare_price ? Number(dbPrimary.compare_price) : undefined,
        stock: Number(dbPrimary.stock || 20),
        sku: `SSF-${canonicalSlug.toUpperCase().slice(0, 6)}-250G`,
      });
      totalStock += 20;
    }

    const lowStockThreshold = 10;
    const isAnyActive = items.some((it) => it.is_active);
    const computedStatus = computeProductStatus(isAnyActive, totalStock, lowStockThreshold);

    // Determine base measurement unit
    const firstParsed = parseWeightString(sortedVariants[0].weight);
    const baseUnit: MeasurementUnit = firstParsed.unit === 'kg' ? 'kg' : firstParsed.unit === 'l' ? 'l' : 'g';

    const consolidatedProduct: Product = {
      id: primaryItem.id,
      slug: canonicalSlug,
      name_en: canonicalNameEn || primaryItem.name_en,
      name_te: canonicalNameTe || primaryItem.name_te,
      description_en: primaryItem.description_en,
      description_te: primaryItem.description_te,
      category: primaryItem.category as any,
      images: allImages.length > 0 ? allImages : [import.meta.env.BASE_URL + 'images/pickle.jpg'],
      ingredients_en: primaryItem.ingredients_en || '',
      ingredients_te: primaryItem.ingredients_te || '',
      variants: sortedVariants,
      base_unit: baseUnit,
      pricing_model: 'fixed_pack',
      min_order_qty: 1,
      max_order_qty: 50,
      qty_step: 1,
      low_stock_threshold: lowStockThreshold,
      status: computedStatus,
      is_active: isAnyActive,
      is_demo: 'is_demo' in primaryItem ? Boolean(primaryItem.is_demo) : false,
      badge: 'badge' in primaryItem ? (primaryItem as any).badge : undefined,
      rating: 'rating' in primaryItem ? (primaryItem as any).rating : 4.8,
      reviewCount: 'reviewCount' in primaryItem ? (primaryItem as any).reviewCount : 50,
      created_at: primaryItem.created_at || new Date().toISOString(),
    };

    consolidatedList.push(consolidatedProduct);

    if (items.length > 1) {
      mergedProductCount += items.length - 1;
      mergedGroupReports.push({
        canonicalName: consolidatedProduct.name_en,
        canonicalSlug: consolidatedProduct.slug,
        variantCount: sortedVariants.length,
        consolidatedWeights: sortedVariants.map((v) => v.weight),
        totalStock,
      });
    }
  }

  const report: ConsolidationReport = {
    totalRawProducts: rawProducts.length,
    totalConsolidatedProducts: consolidatedList.length,
    mergedProductCount,
    unresolvedCount,
    mergedGroups: mergedGroupReports,
  };

  return { products: consolidatedList, report };
}
