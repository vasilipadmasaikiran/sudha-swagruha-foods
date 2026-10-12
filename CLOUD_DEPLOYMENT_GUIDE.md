# Multi-Cloud Deployment Guide — Sudha Swagruha Foods
**Production Deployment Architecture for AWS, Microsoft Azure, Google Cloud Platform (GCP), & Containers**

---

## Architecture Overview
Sudha Swagruha Foods is architected as a high-performance modern web application. The frontend is compiled into pure static optimized assets (`HTML`, `CSS`, `JS`, `WebP/SVG`) with a Supabase PostgreSQL backend.

Deploying on cloud platforms offers:
- **Global CDN Edge Caching**: Sub-50ms response times for customers across India and worldwide.
- **Auto-Scaling & 99.99% SLA**: Handles festival flash sales (Diwali, Sankranti) with zero server bottlenecks.
- **Zero Server Maintenance**: Static and serverless hosting eliminates OS patching and server administration.

---

## 1. Amazon Web Services (AWS)

### Architecture Option 1: S3 + CloudFront (Recommended for Scale)
- **AWS S3**: Stores the production static assets.
- **AWS CloudFront**: Global CDN distribution with Origin Access Control (OAC) and automated HTTPS.

#### Quick Deployment Steps:
1. **Create S3 Bucket**:
   - In AWS Console, create a bucket (e.g., `sudha-swagruha-production`) in `ap-south-1` (Mumbai).
   - Uncheck "Block all public access" or use CloudFront Origin Access Control (OAC).
2. **Create CloudFront Distribution**:
   - Origin Domain: Select your S3 bucket.
   - Viewer Protocol Policy: `Redirect HTTP to HTTPS`.
   - **Crucial SPA Setting (Custom Error Response)**:
     - Error Code: `403: Forbidden` and `404: Not Found`
     - Response Page Path: `/index.html`
     - HTTP Response Code: `200: OK`
     *(This ensures sub-routes like `/admin` or `/checkout` load correctly on direct refresh).*
3. **Execute Automated Deployment Script**:
   ```powershell
   cd "C:\EcoomerceBuild\SwagruhaFoods-Cloud-Production\aws"
   .\deploy-aws-s3-cloudfront.ps1 -BucketName "sudha-swagruha-production" -DistributionId "YOUR_CLOUDFRONT_DIST_ID"
   ```

### Architecture Option 2: AWS Amplify (One-Click Git CI/CD)
1. In AWS Console, go to **AWS Amplify**.
2. Click **Host web app** → connect your Git repo (GitHub / CodeCommit).
3. The included [`amplify.yml`](./aws/amplify.yml) will automatically configure build and caching headers.
4. Amplify provides free managed SSL and automated branch preview deployments.

---

## 2. Microsoft Azure

### Architecture Option 1: Azure Static Web Apps (Recommended)
Azure Static Web Apps is tailored for React/Vite SPAs with built-in SSL, global hosting, and custom domain mapping.

1. In Azure Portal, click **Create a resource** → search **Static Web App**.
2. Select your Resource Group and Region (`Central India` or `South India`).
3. Deployment details: Choose **Upload from local / CLI** or connect GitHub.
4. The deployment package already includes [`staticwebapp.config.json`](./azure/staticwebapp.config.json) in `dist/`.
   - This automatically enables SPA navigation fallback (`/index.html`), custom MIME types, and security headers.
5. Deploy via Azure CLI:
   ```bash
   swa deploy dist --deployment-token YOUR_SWA_TOKEN --env production
   ```

### Architecture Option 2: Azure Blob Storage Static Website
1. Create a Storage Account (e.g. `sudhaswagruhastorage`).
2. Run the included automated script:
   ```powershell
   cd "C:\EcoomerceBuild\SwagruhaFoods-Cloud-Production\azure"
   .\deploy-azure-storage.ps1 -StorageAccountName "sudhaswagruhastorage"
   ```
3. Link with **Azure Front Door** or **Azure CDN** for custom domain and SSL.

---

## 3. Google Cloud Platform (GCP)

### Architecture Option 1: Google Firebase Hosting (Recommended)
Firebase Hosting runs on Google's SSD edge CDN with zero-configuration SSL.

1. Install Firebase CLI (if not installed):
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
2. Navigate to the GCP folder:
   ```powershell
   cd "C:\EcoomerceBuild\SwagruhaFoods-Cloud-Production\gcp"
   ```
3. The included [`firebase.json`](./gcp/firebase.json) is pre-configured with SPA rewrites to `/index.html` and 1-year immutable caching for static assets.
4. Deploy using the automated script:
   ```powershell
   .\deploy-gcp-firebase.ps1 -ProjectId "YOUR_GCP_PROJECT_ID"
   ```

### Architecture Option 2: Google App Engine
- The included [`app.yaml`](./gcp/app.yaml) provides static hosting configuration.
- Deploy with:
  ```bash
  gcloud app deploy app.yaml
  ```

---

## 4. Containerized Hosting (Docker & Kubernetes)
For enterprise teams running **AWS ECS/Fargate**, **Azure Container Apps**, **GCP Cloud Run**, or **Kubernetes**:

The package includes an optimized **Alpine Nginx Docker container** ([`Dockerfile`](./Dockerfile) & [`nginx.conf`](./nginx.conf)).

### 1. Build and Test Locally:
```bash
cd "C:\EcoomerceBuild\SwagruhaFoods-Cloud-Production"
docker build -t sudha-swagruha-foods:latest .
docker run -d -p 8080:80 --name swagruha-web sudha-swagruha-foods:latest
```
Open `http://localhost:8080` in your browser.

### 2. Deploy to Google Cloud Run (Serverless Container):
```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/swagruha-web
gcloud run deploy swagruha-web --image gcr.io/YOUR_PROJECT_ID/swagruha-web --platform managed --allow-unauthenticated --region asia-south1
```

### 3. Deploy to AWS App Runner / ECS:
Push the Docker image to **AWS ECR** and create an **AWS App Runner** or **Fargate Service** pointing to port 80.

---

## 5. Production Environment Variables & Supabase Connection
The application communicates with your production Supabase database instance.
In the cloud environment, verify the connection credentials in:
- `dist/supabase-config.json` or your `.env.production` file:
  ```env
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-production-anon-key
  ```
- In the Supabase project dashboard, ensure your production domain (e.g. `https://orders.sudhaswagruha.com`) is added under **Authentication → URL Configuration → Redirect URLs**.
