// Mock import.meta.env
globalThis.import = { meta: { env: { BASE_URL: '/' } } };

import fs from 'fs';
import path from 'path';
import { sampleProducts as products } from '../src/data/products';

let sql = `-- Seed Data for Swagruha Foods\n\n`;
sql += `INSERT INTO public.products (id, name_en, name_te, slug, description_en, description_te, category, images, ingredients_en, ingredients_te, price, compare_price, stock, weight, sku, is_active)\nVALUES \n`;

const values = [];

for (const p of products) {
  // If a product has multiple variants, we'll just insert the first one to match the flat schema
  // Or we can create one product row per variant
  for (const v of p.variants) {
    const slug = p.variants.length > 1 ? `${p.slug}-${v.weight.toLowerCase().replace(' ', '')}` : p.slug;
    
    // escape single quotes
    const esc = (str) => typeof str === 'string' ? str.replace(/'/g, "''") : str;

    const imagesArray = `'{${p.images.map(img => `"${img}"`).join(',')}}'`;
    
    const val = `(
      gen_random_uuid(), 
      '${esc(p.name_en)}', 
      '${esc(p.name_te)}', 
      '${esc(slug)}', 
      '${esc(p.description_en)}', 
      '${esc(p.description_te)}', 
      '${esc(p.category)}', 
      ${imagesArray}, 
      '${esc(p.ingredients_en)}', 
      '${esc(p.ingredients_te)}', 
      ${v.price}, 
      ${v.comparePrice || 'NULL'}, 
      ${v.stock}, 
      '${esc(v.weight)}', 
      '${esc(v.sku)}', 
      ${p.is_active}
    )`;
    values.push(val);
  }
}

sql += values.join(',\n') + ';\n';

fs.writeFileSync(path.join(process.cwd(), 'supabase', 'seed.sql'), sql);
console.log('Successfully generated supabase/seed.sql!');
