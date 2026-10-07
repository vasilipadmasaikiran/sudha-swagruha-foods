// ============================================================
// Sample Products Data (Demo)
// Replace with real Supabase data in production
// ============================================================

export type MeasurementUnit = 'g' | 'kg' | 'ml' | 'l' | 'pcs' | 'packs';
export type PricingModel = 'fixed_pack' | 'per_unit';
export type ProductStatus = 'active' | 'low_stock' | 'out_of_stock' | 'inactive' | 'archived';

export interface ProductVariant {
  id?: string;
  weight: string;
  price: number;
  comparePrice?: number;
  stock: number;
  reservedStock?: number;
  sku: string;
  weightValue?: number;
  unit?: MeasurementUnit;
  is_active?: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name_en: string;
  name_te: string;
  description_en: string;
  description_te: string;
  category: 'pickles' | 'karam' | 'masala' | 'podi';
  images: string[];
  ingredients_en: string;
  ingredients_te: string;
  variants: ProductVariant[];
  base_unit?: MeasurementUnit;
  pricing_model?: PricingModel;
  base_price_per_unit?: number;
  min_order_qty?: number;
  max_order_qty?: number;
  qty_step?: number;
  low_stock_threshold?: number;
  status?: ProductStatus;
  is_active: boolean;
  is_archived?: boolean;
  is_demo: boolean;
  badge?: 'new' | 'hot' | 'bestseller';
  rating?: number;
  reviewCount?: number;
  created_at: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_te: string;
  description_en: string;
  description_te: string;
  icon: string;
  image: string;
  color: string;
}

const getImg = (name: string) => import.meta.env.BASE_URL + 'images/' + name;

export const categories: Category[] = [
  {
    id: '1',
    slug: 'pickles',
    name_en: 'Pickles',
    name_te: 'ఊరగాయలు',
    description_en: 'Traditional Andhra-style pickles with bold flavors',
    description_te: 'సంప్రదాయ ఆంధ్ర స్టైల్ ఊరగాయలు',
    icon: '🫙',
    image: getImg('pickle.jpg'),
    color: '#C62828',
  },
  {
    id: '2',
    slug: 'karam',
    name_en: 'Karam Powders',
    name_te: 'కారం పొడులు',
    description_en: 'Spicy chilli-based powders for everyday meals',
    description_te: 'రోజువారీ వంటకు కారమైన పొడులు',
    icon: '🌶️',
    image: getImg('karam.jpg'),
    color: '#C62828',
  },
  {
    id: '3',
    slug: 'masala',
    name_en: 'Masala Powders',
    name_te: 'మసాలా పొడులు',
    description_en: 'Aromatic spice blends for authentic Telugu cooking',
    description_te: 'అసలైన తెలుగు వంటకు సుగంధ మసాలాలు',
    icon: '🌿',
    image: getImg('masala.jpg'),
    color: '#2F6B3B',
  },
  {
    id: '4',
    slug: 'podi',
    name_en: 'Podis',
    name_te: 'పొడులు',
    description_en: 'Dry chutneys and rice powders for daily use',
    description_te: 'నిత్య వాడకానికి పొడి చట్నీలు & అన్నం పొడులు',
    icon: '🍚',
    image: getImg('karam.jpg'),
    color: '#795548',
  },
];

export const sampleProducts: Product[] = [
  {
    id: '1',
    slug: 'andhra-avakaya',
    name_en: 'Andhra Avakaya',
    name_te: 'ఆంధ్ర అవకాయ',
    description_en: 'The king of all pickles! Our Andhra Avakaya is made with raw mangoes, mustard seeds, red chilli powder, salt, and sesame oil — just like Amma makes it. Bold, spicy, and utterly addictive.',
    description_te: 'అన్ని ఊరగాయలలో రాజు! మా ఆంధ్ర అవకాయ పచ్చి మామిడికాయలు, ఆవాలు, ఎర్ర మిర్చి పొడి, ఉప్పు మరియు నువ్వుల నూనెతో తయారు చేయబడింది — అమ్మ తయారు చేసిన విధంగా.',
    category: 'pickles',
    images: [getImg('pickle.jpg')],
    ingredients_en: 'Raw Mango, Mustard Seeds, Red Chilli Powder, Salt, Sesame Oil, Fenugreek',
    ingredients_te: 'పచ్చి మామిడికాయ, ఆవాలు, ఎర్ర మిర్చి పొడి, ఉప్పు, నువ్వుల నూనె, మెంతులు',
    variants: [
      { weight: '250g', price: 180, comparePrice: 220, stock: 50, sku: 'SSF-AVK-250' },
      { weight: '500g', price: 320, comparePrice: 400, stock: 30, sku: 'SSF-AVK-500' },
      { weight: '1kg', price: 600, comparePrice: 750, stock: 20, sku: 'SSF-AVK-1KG' },
    ],
    is_active: true,
    is_demo: true,
    badge: 'bestseller',
    rating: 4.8,
    reviewCount: 124,
    created_at: '2026-01-01',
  },
  {
    id: '2',
    slug: 'gongura-pickle',
    name_en: 'Gongura Pickle',
    name_te: 'గోంగూర పచ్చడి',
    description_en: 'The pride of Andhra! Our Gongura (Sorrel leaves) pickle is tangy, spicy, and deeply flavorful. Made with freshly sourced gongura leaves, mustard, fenugreek and red chillies.',
    description_te: 'ఆంధ్ర గర్వం! మా గోంగూర పచ్చడి పులుపుగా, కారంగా, అద్భుతమైన రుచితో ఉంటుంది. తాజా గోంగూర ఆకులు, ఆవాలు, మెంతులు మరియు ఎర్ర మిర్చిలతో తయారు చేయబడింది.',
    category: 'pickles',
    images: [getImg('pickle.jpg')],
    ingredients_en: 'Gongura Leaves, Red Chillies, Mustard Seeds, Fenugreek, Sesame Oil, Salt, Garlic',
    ingredients_te: 'గోంగూర ఆకులు, ఎర్ర మిర్చులు, ఆవాలు, మెంతులు, నువ్వుల నూనె, ఉప్పు, వెల్లుల్లి',
    variants: [
      { weight: '250g', price: 160, comparePrice: 200, stock: 40, sku: 'SSF-GON-250' },
      { weight: '500g', price: 290, comparePrice: 360, stock: 25, sku: 'SSF-GON-500' },
      { weight: '1kg', price: 550, comparePrice: 700, stock: 15, sku: 'SSF-GON-1KG' },
    ],
    is_active: true,
    is_demo: true,
    badge: 'hot',
    rating: 4.7,
    reviewCount: 89,
    created_at: '2026-01-02',
  },
  {
    id: '3',
    slug: 'lemon-pickle',
    name_en: 'Lemon Pickle',
    name_te: 'నిమ్మకాయ ఊరగాయ',
    description_en: 'Sunshine in a jar! Our Lemon Pickle is perfectly balanced with tangy lemon, spicy chillies, and aromatic spices. A perfect accompaniment to rice, chapati, or snacks.',
    description_te: 'జాడీలో సూర్యకిరణం! మా నిమ్మకాయ ఊరగాయ పులుపైన నిమ్మకాయ, కారమైన మిర్చులు మరియు సుగంధ మసాలాలతో సరిగ్గా సమతుల్యంగా ఉంటుంది.',
    category: 'pickles',
    images: [getImg('pickle.jpg')],
    ingredients_en: 'Lemon, Red Chilli Powder, Salt, Mustard Seeds, Sesame Oil, Fenugreek, Asafoetida',
    ingredients_te: 'నిమ్మకాయ, ఎర్ర మిర్చి పొడి, ఉప్పు, ఆవాలు, నువ్వుల నూనె, మెంతులు, ఇంగువ',
    variants: [
      { weight: '250g', price: 140, comparePrice: 170, stock: 60, sku: 'SSF-LEM-250' },
      { weight: '500g', price: 260, comparePrice: 320, stock: 35, sku: 'SSF-LEM-500' },
    ],
    is_active: true,
    is_demo: true,
    badge: 'new',
    rating: 4.6,
    reviewCount: 45,
    created_at: '2026-02-01',
  },
  {
    id: '4',
    slug: 'tomato-pickle',
    name_en: 'Tomato Pickle',
    name_te: 'టమాటా పచ్చడి',
    description_en: 'A Telugu kitchen staple! This rich and tangy tomato pickle is cooked with fresh tomatoes, mustard, and a blend of aromatic spices that make every meal special.',
    description_te: 'తెలుగు వంటింటి అవసరం! ఈ రిచ్ మరియు పులుపైన టమాటా పచ్చడి తాజా టమాటాలు, ఆవాలు మరియు సుగంధ మసాలాల మిశ్రమంతో వండబడుతుంది.',
    category: 'pickles',
    images: [getImg('pickle.jpg')],
    ingredients_en: 'Tomatoes, Red Chillies, Mustard Seeds, Sesame Oil, Salt, Garlic, Curry Leaves',
    ingredients_te: 'టమాటాలు, ఎర్ర మిర్చులు, ఆవాలు, నువ్వుల నూనె, ఉప్పు, వెల్లుల్లి, కరివేపాకు',
    variants: [
      { weight: '250g', price: 130, comparePrice: 160, stock: 45, sku: 'SSF-TOM-250' },
      { weight: '500g', price: 240, comparePrice: 300, stock: 28, sku: 'SSF-TOM-500' },
    ],
    is_active: true,
    is_demo: true,
    rating: 4.5,
    reviewCount: 67,
    created_at: '2026-01-15',
  },
  {
    id: '5',
    slug: 'kandi-karam',
    name_en: 'Kandi Karam',
    name_te: 'కంది కారం',
    description_en: 'The heart of Telugu breakfasts! Kandi Karam made with roasted toor dal, red chillies, garlic, and cumin. Perfect with idli, dosa, or rice and ghee.',
    description_te: 'తెలుగు అల్పాహారాల హృదయం! వేయించిన కంది పప్పు, ఎర్ర మిర్చులు, వెల్లుల్లి మరియు జీలకర్రతో తయారు చేసిన కంది కారం. ఇడ్లీ, దోశ లేదా అన్నం మరియు నెయ్యితో సరిపోతుంది.',
    category: 'karam',
    images: [getImg('karam.jpg')],
    ingredients_en: 'Toor Dal, Red Chillies, Garlic, Cumin, Salt, Curry Leaves, Asafoetida',
    ingredients_te: 'కంది పప్పు, ఎర్ర మిర్చులు, వెల్లుల్లి, జీలకర్ర, ఉప్పు, కరివేపాకు, ఇంగువ',
    variants: [
      { weight: '100g', price: 80, comparePrice: 100, stock: 80, sku: 'SSF-KKR-100' },
      { weight: '250g', price: 180, comparePrice: 220, stock: 50, sku: 'SSF-KKR-250' },
      { weight: '500g', price: 320, comparePrice: 400, stock: 30, sku: 'SSF-KKR-500' },
    ],
    is_active: true,
    is_demo: true,
    badge: 'bestseller',
    rating: 4.9,
    reviewCount: 156,
    created_at: '2026-01-01',
  },
  {
    id: '6',
    slug: 'idli-karam',
    name_en: 'Idli Karam',
    name_te: 'ఇడ్లీ కారం',
    description_en: 'The ultimate idli companion! Our Idli Karam is a perfect blend of roasted chana dal, red chillies, garlic, and spices. Just a pinch with oil or ghee transforms your idli.',
    description_te: 'ఇడ్లీకి అత్యుత్తమ జోడీ! మా ఇడ్లీ కారం వేయించిన శెనగ పప్పు, ఎర్ర మిర్చులు, వెల్లుల్లి మరియు మసాలాల పరిపూర్ణ మిశ్రమం.',
    category: 'karam',
    images: [getImg('karam.jpg')],
    ingredients_en: 'Chana Dal, Red Chillies, Garlic, Cumin, Salt, Sesame Seeds, Curry Leaves',
    ingredients_te: 'శెనగ పప్పు, ఎర్ర మిర్చులు, వెల్లుల్లి, జీలకర్ర, ఉప్పు, నువ్వులు, కరివేపాకు',
    variants: [
      { weight: '100g', price: 70, comparePrice: 90, stock: 90, sku: 'SSF-IDK-100' },
      { weight: '250g', price: 160, comparePrice: 200, stock: 55, sku: 'SSF-IDK-250' },
      { weight: '500g', price: 290, comparePrice: 360, stock: 35, sku: 'SSF-IDK-500' },
    ],
    is_active: true,
    is_demo: true,
    badge: 'hot',
    rating: 4.8,
    reviewCount: 98,
    created_at: '2026-01-05',
  },
  {
    id: '7',
    slug: 'curry-leaf-podi',
    name_en: 'Curry Leaf Podi',
    name_te: 'కరివేపాకు పొడి',
    description_en: 'Fragrant and nutritious! Our Curry Leaf Podi captures the earthy aroma and health benefits of fresh curry leaves combined with lentils and spices.',
    description_te: 'సుగంధమైన మరియు పోషకాహారం! మా కరివేపాకు పొడి తాజా కరివేపాకు యొక్క మట్టి వాసన మరియు ఆరోగ్య ప్రయోజనాలను పప్పు మరియు మసాలాలతో కలపుతుంది.',
    category: 'podi',
    images: [getImg('karam.jpg')],
    ingredients_en: 'Curry Leaves, Urad Dal, Chana Dal, Red Chillies, Garlic, Salt, Sesame Seeds',
    ingredients_te: 'కరివేపాకు, మినప పప్పు, శెనగ పప్పు, ఎర్ర మిర్చులు, వెల్లుల్లి, ఉప్పు, నువ్వులు',
    variants: [
      { weight: '100g', price: 90, comparePrice: 110, stock: 70, sku: 'SSF-CVP-100' },
      { weight: '250g', price: 200, comparePrice: 250, stock: 45, sku: 'SSF-CVP-250' },
    ],
    is_active: true,
    is_demo: true,
    badge: 'new',
    rating: 4.6,
    reviewCount: 34,
    created_at: '2026-03-01',
  },
  {
    id: '8',
    slug: 'peanut-podi',
    name_en: 'Peanut Podi',
    name_te: 'పల్లీ పొడి',
    description_en: 'Crunchy, nutty, and absolutely delicious! Our Peanut Podi is made from roasted peanuts, red chillies, garlic, and a touch of tamarind. Perfect with rice, dosa, or as a snack.',
    description_te: 'క్రంచీ, నట్టీ మరియు పూర్తిగా రుచికరం! మా పల్లీ పొడి వేయించిన వేరుశెనగలు, ఎర్ర మిర్చులు, వెల్లుల్లి మరియు చిన్న చింతపండుతో తయారు చేయబడింది.',
    category: 'podi',
    images: [getImg('karam.jpg')],
    ingredients_en: 'Roasted Peanuts, Red Chillies, Garlic, Tamarind, Salt, Cumin, Curry Leaves',
    ingredients_te: 'వేయించిన వేరుశెనగలు, ఎర్ర మిర్చులు, వెల్లుల్లి, చింతపండు, ఉప్పు, జీలకర్ర, కరివేపాకు',
    variants: [
      { weight: '100g', price: 75, comparePrice: 95, stock: 85, sku: 'SSF-PNP-100' },
      { weight: '250g', price: 170, comparePrice: 210, stock: 50, sku: 'SSF-PNP-250' },
      { weight: '500g', price: 310, comparePrice: 390, stock: 30, sku: 'SSF-PNP-500' },
    ],
    is_active: true,
    is_demo: true,
    rating: 4.7,
    reviewCount: 78,
    created_at: '2026-01-20',
  },
  {
    id: '9',
    slug: 'sambar-powder',
    name_en: 'Sambar Powder',
    name_te: 'సాంబార్ పొడి',
    description_en: 'The soul of South Indian cooking! Our Sambar Powder is a carefully balanced blend of 16 roasted spices that gives your sambar the authentic village restaurant taste.',
    description_te: 'దక్షిణ భారత వంటపాకం యొక్క ఆత్మ! మా సాంబార్ పొడి 16 వేయించిన మసాలాల జాగ్రత్తగా సమతుల్యమైన మిశ్రమం.',
    category: 'masala',
    images: [getImg('masala.jpg')],
    ingredients_en: 'Coriander, Cumin, Black Pepper, Red Chillies, Mustard, Fenugreek, Curry Leaves, Turmeric, Cinnamon, Cloves, Cardamom, Asafoetida',
    ingredients_te: 'కొత్తిమీర, జీలకర్ర, నల్ల మిరియాలు, ఎర్ర మిర్చులు, ఆవాలు, మెంతులు, కరివేపాకు, పసుపు, దాల్చిన చెక్క, లవంగాలు, యాలకులు, ఇంగువ',
    variants: [
      { weight: '100g', price: 85, comparePrice: 105, stock: 75, sku: 'SSF-SBP-100' },
      { weight: '250g', price: 190, comparePrice: 240, stock: 48, sku: 'SSF-SBP-250' },
      { weight: '500g', price: 350, comparePrice: 440, stock: 28, sku: 'SSF-SBP-500' },
    ],
    is_active: true,
    is_demo: true,
    badge: 'bestseller',
    rating: 4.8,
    reviewCount: 112,
    created_at: '2026-01-08',
  },
  {
    id: '10',
    slug: 'chicken-masala',
    name_en: 'Chicken Masala',
    name_te: 'చికెన్ మసాలా',
    description_en: 'Restaurant-quality at home! Our Andhra-style Chicken Masala brings the bold, fiery flavors of Telugu cooking to your kitchen. Made with premium whole spices, slow roasted to perfection.',
    description_te: 'ఇంట్లో రెస్టారెంట్ నాణ్యత! మా ఆంధ్ర స్టైల్ చికెన్ మసాలా తెలుగు వంట యొక్క బోల్డ్, ఫైరీ రుచులను మీ వంటింటికి తీసుకువస్తుంది.',
    category: 'masala',
    images: [getImg('masala.jpg')],
    ingredients_en: 'Red Chillies, Coriander, Cumin, Black Pepper, Cinnamon, Cloves, Cardamom, Fennel, Star Anise, Turmeric, Mace, Nutmeg',
    ingredients_te: 'ఎర్ర మిర్చులు, కొత్తిమీర, జీలకర్ర, నల్ల మిరియాలు, దాల్చిన చెక్క, లవంగాలు, యాలకులు, సోంపు, స్టార్ అనిస్, పసుపు, జాపత్రి, జాజికాయ',
    variants: [
      { weight: '100g', price: 120, comparePrice: 150, stock: 60, sku: 'SSF-CHM-100' },
      { weight: '200g', price: 220, comparePrice: 275, stock: 40, sku: 'SSF-CHM-200' },
      { weight: '500g', price: 500, comparePrice: 625, stock: 20, sku: 'SSF-CHM-500' },
    ],
    is_active: true,
    is_demo: true,
    badge: 'hot',
    rating: 4.9,
    reviewCount: 203,
    created_at: '2026-01-03',
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return sampleProducts.find((p) => p.slug === slug);
}

export function getProductsByCategory(category: string): Product[] {
  return sampleProducts.filter((p) => p.category === category && p.is_active);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
