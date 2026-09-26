# Sudha Swagruha Foods - E-Commerce Website

A mobile-first, production-ready e-commerce website for authentic Telugu homemade food products.

## Technology Stack
- **Frontend**: React + Vite + TypeScript + Tailwind CSS (v4)
- **State Management**: Zustand
- **Routing**: React Router DOM (v7)
- **Deployment**: GitHub Pages (Static Build)
- **Backend/DB**: Supabase (PostgreSQL, Auth, Edge Functions) - *Ready to connect*
- **Payments**: Razorpay - *Ready to connect*

## Features
- 📱 Responsive mobile-first design (Green, Red, Earthy tones)
- 🌐 Bilingual support (English / Telugu)
- 🛒 Cart management with local storage persistence
- 🚚 Free delivery threshold calculator
- 🎟️ Coupon code support
- 💬 WhatsApp Business floating button and checkout integration
- 🛍️ Demo mode with fully functional fallback (no API keys required initially)
- 🔒 Admin panel (demo login: admin@sudhaswagruha.com / admin123)
- 📦 Order tracking (demo tracking: SSF-20260926-DEMO / 9999999999)

## Setup for Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy the example env file:
   ```bash
   cp .env.example .env
   ```
   *Note: For the demo mode, no keys are required.*

3. **Start Development Server**
   ```bash
   npm run dev
   ```

## Production Deployment (GitHub Pages)

This project is configured to deploy seamlessly to GitHub Pages.

1. Ensure the `VITE_BASE_PATH` in your `.env` or CI matches your repository name if not hosting at the root domain. For example, if your repo is `sudha-swagruha-foods`, the base path should be `/sudha-swagruha-foods/`.
2. Push your code to the `main` or `master` branch.
3. The included GitHub Action (`.github/workflows/deploy.yml`) will automatically build and deploy the `dist/` folder to GitHub Pages.

## Connecting Backend Services (Supabase & Razorpay)

The codebase is prepared for real backend integration using Supabase Edge Functions:
- `create-order`
- `verify-payment`
- `whatsapp-notification`

To go live:
1. Create a Supabase project and add your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`.
2. Add your Razorpay Key ID to `VITE_RAZORPAY_KEY_ID`.
3. Set your secret keys (Razorpay Secret, WhatsApp Token, Supabase Service Role) securely in your Supabase Edge Function environment variables.
4. Deploy the edge functions and database migrations.

## Build for Production
To manually generate a static build:
```bash
npm run build
```
The output will be in the `dist/` directory.
