// ============================================================
// Website Customization & Customer Auth Configuration Schemas
// Controls Appearance, Content, Versioning, and Authentication
// ============================================================

export interface ThemeColors {
  primary: string; // e.g. #047857
  primaryHover: string; // e.g. #065f46
  secondary: string; // e.g. #92400e
  accent: string; // e.g. #f59e0b
  background: string; // e.g. #fffbeb
  surface: string; // e.g. #ffffff
  textPrimary: string; // e.g. #1e293b
  textSecondary: string; // e.g. #64748b
  headerBg: string; // e.g. #ffffff
  footerBg: string; // e.g. #064e3b
  cardBg: string; // e.g. #ffffff
  borderColor: string; // e.g. #e2e8f0
}

export interface ThemeTypography {
  headingFont: string; // 'Playfair Display' | 'Inter' | 'Outfit' | 'Roboto'
  bodyFont: string; // 'Inter' | 'Poppins' | 'Roboto' | 'System'
  baseFontSize: number; // 14, 16, 18
  headingWeight: string; // '600' | '700' | '800'
}

export interface ThemeLayout {
  headerStyle: 'classic' | 'centered' | 'minimal' | 'bold';
  footerStyle: 'four-column' | 'three-column' | 'minimal';
  productCardStyle: 'card-modern' | 'card-bordered' | 'card-compact';
  buttonShape: 'rounded-xl' | 'rounded-full' | 'rounded-md' | 'square';
  containerWidth: 'max-w-6xl' | 'max-w-7xl' | 'max-w-screen-2xl';
}

export interface ThemeVersionRecord {
  versionId: string;
  versionName: string;
  savedAt: string;
  savedBy: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  layout: ThemeLayout;
}

export interface WebsiteAppearanceSettings {
  publishedVersion: string;
  isDraft: boolean;
  colors: ThemeColors;
  typography: ThemeTypography;
  layout: ThemeLayout;
  draftColors?: ThemeColors;
  draftTypography?: ThemeTypography;
  draftLayout?: ThemeLayout;
  versionHistory: ThemeVersionRecord[];
}

export const defaultAppearanceSettings: WebsiteAppearanceSettings = {
  publishedVersion: 'v1.0.0',
  isDraft: false,
  colors: {
    primary: '#047857',
    primaryHover: '#065f46',
    secondary: '#92400e',
    accent: '#f59e0b',
    background: '#fffdfa',
    surface: '#ffffff',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    headerBg: '#ffffff',
    footerBg: '#064e3b',
    cardBg: '#ffffff',
    borderColor: '#f1f5f9',
  },
  typography: {
    headingFont: 'Playfair Display',
    bodyFont: 'Inter',
    baseFontSize: 16,
    headingWeight: '700',
  },
  layout: {
    headerStyle: 'classic',
    footerStyle: 'four-column',
    productCardStyle: 'card-modern',
    buttonShape: 'rounded-xl',
    containerWidth: 'max-w-7xl',
  },
  versionHistory: [],
};

export interface CustomerAuthSettings {
  customerLoginEnabled: boolean;
  mobileOtpEnabled: boolean;
  googleLoginEnabled: boolean;
  allowGuestCheckout: boolean;
  otpExpirationMinutes: number; // e.g. 5
  otpResendCooldownSeconds: number; // e.g. 30
  maxOtpRetries: number; // e.g. 3
  rateLimitMaxRequestsPer15Min: number; // e.g. 5
  forceLoginToBrowse: boolean;
}

export const defaultCustomerAuthSettings: CustomerAuthSettings = {
  customerLoginEnabled: true,
  mobileOtpEnabled: true,
  googleLoginEnabled: true,
  allowGuestCheckout: true,
  otpExpirationMinutes: 5,
  otpResendCooldownSeconds: 30,
  maxOtpRetries: 3,
  rateLimitMaxRequestsPer15Min: 5,
  forceLoginToBrowse: false,
};

export interface PolicyContent {
  shippingPolicy: string;
  returnRefundPolicy: string;
  privacyPolicy: string;
  termsConditions: string;
}

export interface HeroBannerConfig {
  enabled: boolean;
  heading: string;
  headingTe?: string;
  subheading: string;
  subheadingTe?: string;
  buttonText: string;
  buttonLink: string;
  imageUrl: string;
}

export interface WebsiteContentSettings {
  hero: HeroBannerConfig;
  announcementText: string;
  announcementLink?: string;
  aboutSnippet: string;
  policies: PolicyContent;
}

export const defaultWebsiteContentSettings: WebsiteContentSettings = {
  hero: {
    enabled: true,
    heading: 'Authentic Andhra Traditional Sweets & Spicy Pickles',
    headingTe: 'సాంప్రదాయ ఆంధ్ర పిండివంటలు & ఘుమఘుమలాడే పచ్చళ్ళు',
    subheading: 'Crafted with age-old recipes, pure cold-pressed oils, and farm-fresh spices. Delivered to your doorstep worldwide.',
    buttonText: 'Explore Delicacies',
    buttonLink: '/products',
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1200&auto=format&fit=crop&q=80',
  },
  announcementText: '🎉 Free Pan-India Delivery on orders above ₹1,000! Authentic Andhra Taste.',
  aboutSnippet: 'At Sudha Swagruha Foods, our recipes are handed down through generations with no preservatives or artificial colors.',
  policies: {
    shippingPolicy: 'We ship orders within 24-48 hours via premium couriers (Delhivery, DTDC, Blue Dart). Standard delivery takes 3-5 business days across India.',
    returnRefundPolicy: 'Items damaged in transit or defective can be reported within 24 hours of delivery with photographic evidence for instant refund or replacement.',
    privacyPolicy: 'Your privacy is paramount. Customer phone numbers and addresses are strictly used for delivery and order milestone tracking.',
    termsConditions: 'By placing an order on Sudha Swagruha Foods, you agree to our standard terms of service and shipping policies.',
  },
};
