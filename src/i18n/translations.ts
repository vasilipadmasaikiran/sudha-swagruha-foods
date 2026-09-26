// ============================================================
// i18n - Translation System
// English ↔ Telugu bilingual support
// ============================================================

export type Language = 'en' | 'te';

export const translations = {
  en: {
    // ─── Navigation ───────────────────────────────────────────
    nav: {
      home: 'Home',
      products: 'Products',
      categories: 'Categories',
      about: 'About Us',
      contact: 'Contact',
      cart: 'Shopping Cart',
      trackOrder: 'Track Order',
      admin: 'Admin',
      search: 'Search products...',
    },

    // ─── Hero ─────────────────────────────────────────────────
    hero: {
      heading: "The Taste of Amma's Kitchen",
      subheading: 'Authentic homemade pickles, masalas & spicy powders made with traditional recipes.',
      shopNow: 'Shop Now',
      learnMore: 'Our Story',
      badge: '🌿 100% Natural & Homemade',
    },

    // ─── Categories ───────────────────────────────────────────
    categories: {
      title: 'Our Specialties',
      subtitle: 'Handcrafted with love, made with the finest ingredients',
      pickles: 'Pickles',
      picklesDesc: 'Traditional Andhra-style pickles with bold flavors',
      karam: 'Karam Powders',
      karamDesc: 'Spicy chilli-based powders for everyday meals',
      masala: 'Masala Powders',
      masalaDesc: 'Aromatic spice blends for authentic Telugu cooking',
      podi: 'Podis',
      podiDesc: 'Dry chutneys and rice powders for daily use',
    },

    // ─── Products ─────────────────────────────────────────────
    products: {
      title: 'Our Products',
      subtitle: 'Made fresh with traditional recipes',
      addToCart: 'Add to Cart',
      buyNow: 'Buy Now',
      outOfStock: 'Out of Stock',
      inStock: 'In Stock',
      selectWeight: 'Select Weight',
      quantity: 'Quantity',
      description: 'Description',
      ingredients: 'Ingredients',
      weight: 'Weight',
      sku: 'SKU',
      share: 'Share',
      reviews: 'Reviews',
      noReviews: 'No reviews yet. Be the first!',
      writeReview: 'Write a Review',
      filterBy: 'Filter by',
      sortBy: 'Sort by',
      sortPriceLow: 'Price: Low to High',
      sortPriceHigh: 'Price: High to Low',
      sortNewest: 'Newest First',
      sortPopular: 'Most Popular',
      searchResults: 'Search Results',
      noProducts: 'No products found',
      demoNotice: '⚠️ Demo product — replace with real product details',
    },

    // ─── Cart ─────────────────────────────────────────────────
    cart: {
      title: 'Shopping Cart',
      empty: 'Your cart is empty',
      emptyDesc: 'Add some delicious products to get started!',
      continueShopping: 'Continue Shopping',
      remove: 'Remove',
      quantity: 'Qty',
      subtotal: 'Subtotal',
      deliveryCharge: 'Delivery Charge',
      freeDelivery: 'Free Delivery',
      discount: 'Discount',
      total: 'Grand Total',
      proceedToCheckout: 'Proceed to Checkout',
      couponCode: 'Coupon Code',
      applyCoupon: 'Apply',
      couponApplied: 'Coupon applied!',
      invalidCoupon: 'Invalid coupon code',
      itemsCount: '{{count}} items',
      freeDeliveryNote: 'Free delivery on orders above ₹499',
    },

    // ─── Checkout ─────────────────────────────────────────────
    checkout: {
      title: 'Checkout',
      personalInfo: 'Personal Information',
      deliveryAddress: 'Delivery Address',
      paymentMethod: 'Payment',
      name: 'Full Name',
      mobile: 'Mobile Number',
      whatsapp: 'WhatsApp Number',
      whatsappSame: 'Same as mobile',
      email: 'Email Address',
      houseNo: 'House / Flat No.',
      street: 'Street / Colony',
      area: 'Area / Locality',
      city: 'Village / City',
      district: 'District',
      state: 'State',
      pincode: 'PIN Code',
      placeOrder: 'Place Order',
      payWithRazorpay: 'Pay Securely with Razorpay',
      orderSummary: 'Order Summary',
      agreeTerms: 'I agree to the terms and conditions',
    },

    // ─── Payment ──────────────────────────────────────────────
    payment: {
      processing: 'Processing payment...',
      verifying: 'Verifying payment...',
      success: 'Payment Successful!',
      failed: 'Payment could not be completed. Please try again.',
      cancelled: 'Payment was cancelled.',
      retry: 'Retry Payment',
    },

    // ─── Order Success ────────────────────────────────────────
    orderSuccess: {
      title: '🎉 Order Confirmed!',
      subtitle: 'Thank you for your order!',
      orderNumber: 'Order Number',
      trackOrder: 'Track Order',
      continueShopping: 'Continue Shopping',
      contactWhatsApp: 'Contact on WhatsApp',
      estimatedDelivery: 'Estimated Delivery: 3–5 business days',
      paymentStatus: 'Payment Status',
      paid: 'PAID ✅',
      pending: 'PENDING',
      viewSummary: 'Order Summary',
    },

    // ─── Order Tracking ───────────────────────────────────────
    tracking: {
      title: 'Track Your Order',
      orderNumber: 'Order Number',
      mobileNumber: 'Mobile Number',
      track: 'Track Order',
      notFound: 'Order not found. Please check your order number and mobile.',
      statuses: {
        placed: 'Order Placed',
        confirmed: 'Confirmed',
        preparing: 'Preparing',
        packed: 'Packed',
        shipped: 'Shipped',
        delivered: 'Delivered',
      },
    },

    // ─── About ────────────────────────────────────────────────
    about: {
      title: 'From Our Home to Your Home',
      subtitle: 'Our Story',
      story: 'Every jar we send carries the warmth of a village kitchen, the wisdom of traditional recipes passed down through generations, and the love of an Amma who believes that good food can heal and nourish the soul.',
      values: {
        natural: '100% Natural',
        naturalDesc: 'No artificial colors, preservatives or chemicals',
        traditional: 'Traditional Recipes',
        traditionalDesc: 'Authentic methods passed down through generations',
        homemade: 'Homemade with Love',
        homemadeDesc: 'Crafted in small batches with personal care',
        quality: 'Premium Quality',
        qualityDesc: 'Finest ingredients sourced directly from farmers',
      },
    },

    // ─── Contact ──────────────────────────────────────────────
    contact: {
      title: 'Get in Touch',
      subtitle: "We'd love to hear from you",
      whatsapp: 'Chat on WhatsApp',
      phone: 'Call Us',
      email: 'Email Us',
      address: 'Our Location',
      orderWhatsApp: 'Order via WhatsApp',
      messageSent: 'Message sent! We will reply soon.',
      name: 'Your Name',
      message: 'Your Message',
      send: 'Send Message',
    },

    // ─── Reviews ──────────────────────────────────────────────
    reviews: {
      title: 'Customer Reviews',
      rating: 'Rating',
      review: 'Your Review',
      name: 'Your Name',
      verifiedPurchase: 'Verified Purchase',
      submit: 'Submit Review',
      submitted: 'Review submitted! Thank you.',
    },

    // ─── Admin ────────────────────────────────────────────────
    admin: {
      title: 'Admin Panel',
      dashboard: 'Dashboard',
      products: 'Products',
      orders: 'Orders',
      categories: 'Categories',
      offers: 'Offers & Coupons',
      addProduct: 'Add Product',
      editProduct: 'Edit Product',
      deleteProduct: 'Delete Product',
      totalOrders: 'Total Orders',
      totalRevenue: 'Total Revenue',
      pendingOrders: 'Pending Orders',
      totalProducts: 'Total Products',
      login: 'Admin Login',
      logout: 'Logout',
      password: 'Password',
      signIn: 'Sign In',
    },

    // ─── Errors ───────────────────────────────────────────────
    errors: {
      outOfStock: 'This product is currently out of stock.',
      cartEmpty: 'Your cart is currently empty.',
      paymentFailed: 'Payment could not be completed. Please try again.',
      orderNotFound: 'Order not found.',
      networkError: 'Network error. Please check your connection.',
      generic: 'Something went wrong. Please try again.',
      required: 'This field is required',
      invalidMobile: 'Enter a valid 10-digit mobile number',
      invalidPincode: 'Enter a valid 6-digit PIN code',
      invalidEmail: 'Enter a valid email address',
    },

    // ─── Common ───────────────────────────────────────────────
    common: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      submit: 'Submit',
      search: 'Search',
      filter: 'Filter',
      all: 'All',
      yes: 'Yes',
      no: 'No',
      price: 'Price',
      free: 'Free',
      new: 'New',
      hot: 'Hot',
      bestSeller: 'Best Seller',
      rupee: '₹',
    },
  },

  te: {
    // ─── Navigation ───────────────────────────────────────────
    nav: {
      home: 'హోమ్',
      products: 'ఉత్పత్తులు',
      categories: 'వర్గాలు',
      about: 'మా గురించి',
      contact: 'సంప్రదించండి',
      cart: 'మీ కార్ట్',
      trackOrder: 'ఆర్డర్ ట్రాక్ చేయండి',
      admin: 'అడ్మిన్',
      search: 'ఉత్పత్తులు వెతకండి...',
    },

    // ─── Hero ─────────────────────────────────────────────────
    hero: {
      heading: 'అమ్మ చేతి రుచులు… పల్లెటూరి పరిమళంతో!',
      subheading: 'సాంప్రదాయ పద్ధతుల్లో, ఇంటి వంట రుచితో తయారు చేసిన అసలైన ఊరగాయలు, మసాలా పొడులు & కారం పొడులు.',
      shopNow: 'ఇప్పుడే కొనండి',
      learnMore: 'మా కథ',
      badge: '🌿 పూర్తి సహజమైన & ఇంట్లో తయారు చేసిన',
    },

    // ─── Categories ───────────────────────────────────────────
    categories: {
      title: 'మా ప్రత్యేకతలు',
      subtitle: 'ప్రేమతో తయారు చేసిన, ఉత్తమ పదార్థాలతో',
      pickles: 'ఊరగాయలు',
      picklesDesc: 'సంప్రదాయ ఆంధ్ర స్టైల్ ఊరగాయలు',
      karam: 'కారం పొడులు',
      karamDesc: 'రోజువారీ వంటకు కారమైన పొడులు',
      masala: 'మసాలా పొడులు',
      masalaDesc: 'అసలైన తెలుగు వంటకు సుగంధ మసాలాలు',
      podi: 'పొడులు',
      podiDesc: 'నిత్య వాడకానికి పొడి చట్నీలు & అన్నం పొడులు',
    },

    // ─── Products ─────────────────────────────────────────────
    products: {
      title: 'మా ఉత్పత్తులు',
      subtitle: 'సంప్రదాయ వంటకాలతో తాజాగా తయారు చేసిన',
      addToCart: 'కార్ట్‌లోకి చేర్చండి',
      buyNow: 'ఇప్పుడే కొనండి',
      outOfStock: 'స్టాక్ అయిపోయింది',
      inStock: 'స్టాక్‌లో ఉంది',
      selectWeight: 'బరువు ఎంచుకోండి',
      quantity: 'సంఖ్య',
      description: 'వివరణ',
      ingredients: 'పదార్థాలు',
      weight: 'బరువు',
      sku: 'SKU',
      share: 'షేర్ చేయండి',
      reviews: 'సమీక్షలు',
      noReviews: 'ఇంకా సమీక్షలు లేవు. మొదటివారిగా రాయండి!',
      writeReview: 'సమీక్ష రాయండి',
      filterBy: 'ఫిల్టర్',
      sortBy: 'క్రమబద్ధీకరించండి',
      sortPriceLow: 'ధర: తక్కువ నుండి ఎక్కువ',
      sortPriceHigh: 'ధర: ఎక్కువ నుండి తక్కువ',
      sortNewest: 'కొత్తవి ముందు',
      sortPopular: 'అత్యంత ప్రజాదరణ',
      searchResults: 'వెతుకు ఫలితాలు',
      noProducts: 'ఉత్పత్తులు కనుగొనబడలేదు',
      demoNotice: '⚠️ డెమో ఉత్పత్తి — నిజమైన వివరాలతో మార్చండి',
    },

    // ─── Cart ─────────────────────────────────────────────────
    cart: {
      title: 'మీ కార్ట్',
      empty: 'మీ కార్ట్ ప్రస్తుతం ఖాళీగా ఉంది',
      emptyDesc: 'కొనడం ప్రారంభించడానికి రుచికరమైన ఉత్పత్తులు చేర్చండి!',
      continueShopping: 'కొనడం కొనసాగించండి',
      remove: 'తీసివేయండి',
      quantity: 'సంఖ్య',
      subtotal: 'సబ్‌టోటల్',
      deliveryCharge: 'డెలివరీ చార్జ్',
      freeDelivery: 'ఉచిత డెలివరీ',
      discount: 'తగ్గింపు',
      total: 'మొత్తం',
      proceedToCheckout: 'ఆర్డర్ పూర్తి చేయండి',
      couponCode: 'కూపన్ కోడ్',
      applyCoupon: 'వర్తించు',
      couponApplied: 'కూపన్ వర్తించబడింది!',
      invalidCoupon: 'చెల్లని కూపన్ కోడ్',
      itemsCount: '{{count}} వస్తువులు',
      freeDeliveryNote: '₹499 పై ఆర్డర్లకు ఉచిత డెలివరీ',
    },

    // ─── Checkout ─────────────────────────────────────────────
    checkout: {
      title: 'ఆర్డర్ పూర్తి చేయండి',
      personalInfo: 'వ్యక్తిగత సమాచారం',
      deliveryAddress: 'డెలివరీ చిరునామా',
      paymentMethod: 'చెల్లింపు',
      name: 'పూర్తి పేరు',
      mobile: 'మొబైల్ నంబర్',
      whatsapp: 'వాట్సాప్ నంబర్',
      whatsappSame: 'మొబైల్ నంబర్ అదే',
      email: 'ఇమెయిల్ చిరునామా',
      houseNo: 'ఇల్లు / ఫ్లాట్ నం.',
      street: 'వీధి / కాలనీ',
      area: 'ప్రాంతం / లోకాలిటీ',
      city: 'గ్రామం / నగరం',
      district: 'జిల్లా',
      state: 'రాష్ట్రం',
      pincode: 'పిన్ కోడ్',
      placeOrder: 'ఆర్డర్ చేయండి',
      payWithRazorpay: 'రేజర్‌పే ద్వారా సురక్షితంగా చెల్లించండి',
      orderSummary: 'ఆర్డర్ సారాంశం',
      agreeTerms: 'నేను నిబంధనలకు అంగీకరిస్తున్నాను',
    },

    // ─── Payment ──────────────────────────────────────────────
    payment: {
      processing: 'చెల్లింపు ప్రాసెస్ అవుతోంది...',
      verifying: 'చెల్లింపు నిర్ధారిస్తోంది...',
      success: 'చెల్లింపు విజయవంతమైంది!',
      failed: 'చెల్లింపు పూర్తి కాలేదు. దయచేసి మరోసారి ప్రయత్నించండి.',
      cancelled: 'చెల్లింపు రద్దు చేయబడింది.',
      retry: 'మళ్ళీ ప్రయత్నించండి',
    },

    // ─── Order Success ────────────────────────────────────────
    orderSuccess: {
      title: '🎉 ఆర్డర్ నిర్ధారించబడింది!',
      subtitle: 'మీ ఆర్డర్ విజయవంతంగా నమోదైంది!',
      orderNumber: 'ఆర్డర్ నంబర్',
      trackOrder: 'ఆర్డర్ ట్రాక్ చేయండి',
      continueShopping: 'కొనడం కొనసాగించండి',
      contactWhatsApp: 'వాట్సాప్‌లో సంప్రదించండి',
      estimatedDelivery: 'అంచనా డెలివరీ: 3–5 పని దినాలు',
      paymentStatus: 'చెల్లింపు స్థితి',
      paid: 'చెల్లించబడింది ✅',
      pending: 'పెండింగ్‌లో ఉంది',
      viewSummary: 'ఆర్డర్ సారాంశం',
    },

    // ─── Order Tracking ───────────────────────────────────────
    tracking: {
      title: 'మీ ఆర్డర్ ట్రాక్ చేయండి',
      orderNumber: 'ఆర్డర్ నంబర్',
      mobileNumber: 'మొబైల్ నంబర్',
      track: 'ట్రాక్ చేయండి',
      notFound: 'ఆర్డర్ కనుగొనబడలేదు. దయచేసి మీ ఆర్డర్ నంబర్ మరియు మొబైల్ తనిఖీ చేయండి.',
      statuses: {
        placed: 'ఆర్డర్ చేయబడింది',
        confirmed: 'నిర్ధారించబడింది',
        preparing: 'తయారు చేస్తోంది',
        packed: 'ప్యాక్ చేయబడింది',
        shipped: 'పంపబడింది',
        delivered: 'డెలివరీ అయింది',
      },
    },

    // ─── About ────────────────────────────────────────────────
    about: {
      title: 'మా ఇంటి వంట… మీ ఇంటి రుచిగా',
      subtitle: 'మా కథ',
      story: 'మేము పంపే ప్రతి బాటిలో ఒక పల్లెటూరి వంటింటి వెచ్చదనం, తరాల నుండి అందివచ్చిన సంప్రదాయ వంటకాల జ్ఞానం మరియు మంచి ఆహారం ఆత్మను నయం చేయగలదని నమ్మే అమ్మ ప్రేమ ఉంటుంది.',
      values: {
        natural: '100% సహజం',
        naturalDesc: 'కృత్రిమ రంగులు, నిరోధకాలు లేదా రసాయనాలు లేవు',
        traditional: 'సంప్రదాయ వంటకాలు',
        traditionalDesc: 'తరాల నుండి అందివచ్చిన అసలైన పద్ధతులు',
        homemade: 'ప్రేమతో ఇంట్లో తయారు చేసిన',
        homemadeDesc: 'వ్యక్తిగత శ్రద్ధతో చిన్న బాచ్‌లలో తయారు చేసిన',
        quality: 'ఉన్నత నాణ్యత',
        qualityDesc: 'రైతుల నుండి నేరుగా తీసుకున్న ఉత్తమ పదార్థాలు',
      },
    },

    // ─── Contact ──────────────────────────────────────────────
    contact: {
      title: 'సంప్రదించండి',
      subtitle: 'మీ నుండి వినడం మాకు ఆనందం',
      whatsapp: 'వాట్సాప్‌లో చాట్ చేయండి',
      phone: 'ఫోన్ చేయండి',
      email: 'ఇమెయిల్ చేయండి',
      address: 'మా స్థానం',
      orderWhatsApp: 'వాట్సాప్ ద్వారా ఆర్డర్ చేయండి',
      messageSent: 'సందేశం పంపబడింది! మేము త్వరలో సమాధానం ఇస్తాం.',
      name: 'మీ పేరు',
      message: 'మీ సందేశం',
      send: 'సందేశం పంపండి',
    },

    // ─── Reviews ──────────────────────────────────────────────
    reviews: {
      title: 'కస్టమర్ సమీక్షలు',
      rating: 'రేటింగ్',
      review: 'మీ సమీక్ష',
      name: 'మీ పేరు',
      verifiedPurchase: 'ధృవీకరించిన కొనుగోలు',
      submit: 'సమీక్ష సమర్పించండి',
      submitted: 'సమీక్ష సమర్పించబడింది! ధన్యవాదాలు.',
    },

    // ─── Admin ────────────────────────────────────────────────
    admin: {
      title: 'అడ్మిన్ పానెల్',
      dashboard: 'డ్యాష్‌బోర్డ్',
      products: 'ఉత్పత్తులు',
      orders: 'ఆర్డర్లు',
      categories: 'వర్గాలు',
      offers: 'ఆఫర్లు & కూపన్లు',
      addProduct: 'ఉత్పత్తి జోడించండి',
      editProduct: 'ఉత్పత్తి సవరించండి',
      deleteProduct: 'ఉత్పత్తి తొలగించండి',
      totalOrders: 'మొత్తం ఆర్డర్లు',
      totalRevenue: 'మొత్తం ఆదాయం',
      pendingOrders: 'పెండింగ్ ఆర్డర్లు',
      totalProducts: 'మొత్తం ఉత్పత్తులు',
      login: 'అడ్మిన్ లాగిన్',
      logout: 'లాగ్అవుట్',
      password: 'పాస్‌వర్డ్',
      signIn: 'సైన్ ఇన్',
    },

    // ─── Errors ───────────────────────────────────────────────
    errors: {
      outOfStock: 'ఈ ఉత్పత్తి ప్రస్తుతం స్టాక్‌లో లేదు.',
      cartEmpty: 'మీ కార్ట్ ప్రస్తుతం ఖాళీగా ఉంది.',
      paymentFailed: 'చెల్లింపు పూర్తి కాలేదు. దయచేసి మరోసారి ప్రయత్నించండి.',
      orderNotFound: 'ఆర్డర్ కనుగొనబడలేదు.',
      networkError: 'నెట్‌వర్క్ లోపం. దయచేసి మీ కనెక్షన్ తనిఖీ చేయండి.',
      generic: 'ఏదో తప్పు జరిగింది. దయచేసి మళ్ళీ ప్రయత్నించండి.',
      required: 'ఈ ఫీల్డ్ అవసరం',
      invalidMobile: 'చెల్లుబాటు అయ్యే 10-అంకెల మొబైల్ నంబర్ నమోదు చేయండి',
      invalidPincode: 'చెల్లుబాటు అయ్యే 6-అంకెల పిన్ కోడ్ నమోదు చేయండి',
      invalidEmail: 'చెల్లుబాటు అయ్యే ఇమెయిల్ చిరునామా నమోదు చేయండి',
    },

    // ─── Common ───────────────────────────────────────────────
    common: {
      loading: 'లోడ్ అవుతోంది...',
      save: 'సేవ్ చేయండి',
      cancel: 'రద్దు చేయండి',
      delete: 'తొలగించండి',
      edit: 'సవరించండి',
      view: 'చూడండి',
      close: 'మూసివేయండి',
      back: 'వెనుకకు',
      next: 'తదుపరి',
      submit: 'సమర్పించండి',
      search: 'వెతకండి',
      filter: 'ఫిల్టర్',
      all: 'అన్నీ',
      yes: 'అవును',
      no: 'లేదు',
      price: 'ధర',
      free: 'ఉచితం',
      new: 'కొత్తది',
      hot: 'హాట్',
      bestSeller: 'బెస్ట్ సెల్లర్',
      rupee: '₹',
    },
  },
} as const;

export type TranslationKey = typeof translations.en;

export function t(lang: Language, key: string): string {
  const keys = key.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = translations[lang];
  for (const k of keys) {
    value = value?.[k];
  }
  return value ?? key;
}
