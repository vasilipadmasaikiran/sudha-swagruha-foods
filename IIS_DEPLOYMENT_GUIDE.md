# Enterprise IIS Deployment Guide — Sudha Swagruha Foods
**Production Hosting on Windows Server with Dedicated IIS**

---

## 1. System Requirements & Prerequisites
Before hosting on Windows Server (2016, 2019, 2022, or 2025):
1. **Web Server (IIS)** role enabled with:
   - Common HTTP Features: `Default Document`, `Static Content`, `HTTP Errors`, `HTTP Redirection`
   - Performance Features: `Static Content Compression`, `Dynamic Content Compression`
   - Security: `Request Filtering`
2. **IIS URL Rewrite Module 2.1 (Mandatory)**:
   - Download official MSI from: [Microsoft IIS URL Rewrite 2.1](https://www.iis.net/downloads/microsoft/url-rewrite)
   - Or install via Winget: `winget install Microsoft.URLRewrite`
   - *Why is this required?* Vite / React SPA uses client-side routing (`/admin`, `/checkout`, `/orders`, `/tracking`). Without URL Rewrite, refreshing any page besides `/` returns an IIS `404 Not Found` error.

---

## 2. Automated One-Click PowerShell Deployment
The deployment package includes [`Deploy-To-IIS.ps1`](./Deploy-To-IIS.ps1).

1. Open **PowerShell as Administrator**.
2. Navigate to the IIS production folder:
   ```powershell
   cd "C:\EcoomerceBuild\SwagruhaFoods-IIS-Production"
   ```
3. Run the automated script:
   ```powershell
   .\Deploy-To-IIS.ps1 -SiteName "SudhaSwagruhaFoods" -Port 80
   ```
   *Optional parameters:*
   - `-Port 443 -HostHeader "orders.sudhaswagruha.com"`

The script automatically:
- Validates the IIS role and URL Rewrite 2.1 module.
- Sets NTFS ACL security permissions for `IIS_IUSRS` and `IUSR`.
- Creates a dedicated Application Pool (`SudhaSwagruhaAppPool`) configured with **No Managed Code** and **AlwaysRunning**.
- Configures the website and sets up bindings.

---

## 3. Manual IIS Setup (Step-by-Step GUI)

If you prefer using the **Internet Information Services (IIS) Manager** GUI:

### Step 1: Copy Deployment Files
Copy the contents of `SwagruhaFoods-IIS-Production` to your designated web directory, e.g.:
```
C:\inetpub\wwwroot\SudhaSwagruhaFoods
```

### Step 2: Create a Dedicated Application Pool
1. Open **IIS Manager** (`inetmgr`).
2. In the **Connections** pane, click **Application Pools**.
3. Click **Add Application Pool...** in the Actions pane.
4. Name: `SudhaSwagruhaPool`
5. .NET CLR version: Select **No Managed Code** (this is an optimized static SPA).
6. Managed pipeline mode: **Integrated**.
7. Click **OK**.
8. Right-click `SudhaSwagruhaPool` → **Advanced Settings**:
   - `Start Mode`: Set to **AlwaysRunning**.
   - `Idle Time-out (minutes)`: Set to `0` (prevents idle shutdown).

### Step 3: Add Website
1. In IIS Manager, right-click **Sites** → **Add Website...**
2. **Site name**: `SudhaSwagruhaFoods`
3. **Application pool**: Select `SudhaSwagruhaPool`.
4. **Physical path**: `C:\inetpub\wwwroot\SudhaSwagruhaFoods` (or your folder location).
5. **Binding**:
   - Type: `http` (or `https`)
   - IP address: `All Unassigned`
   - Port: `80` (or `443`)
   - Host name: `your-domain.com` (leave empty for testing with IP).
6. Click **OK**.

### Step 4: Verify `web.config`
Ensure the provided `web.config` file resides in the root directory. It contains:
- The React SPA rewrite rule targeting `/index.html`.
- Custom MIME types for `.json`, `.woff`, `.woff2`, `.webp`, `.svg`, and `.mjs`.
- HTTP Security Headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`).
- Non-caching headers for `index.html` (guarantees customers always get latest releases without stale cache).

---

## 4. HTTPS & SSL Certificate Configuration

### Option A: Free Automated SSL with Let's Encrypt (win-acme)
1. Download `win-acme` from [win-acme.com](https://www.win-acme.com/).
2. Run `wacs.exe` as Administrator on your Windows Server.
3. Choose `N: Create certificate (simple mode)`.
4. Select `1: Single binding of an IIS site` and pick `SudhaSwagruhaFoods`.
5. Enter your technical contact email.
6. `win-acme` will automatically generate the certificate, create the IIS HTTPS (port 443) binding, and set up a Windows Task Scheduler job to auto-renew every 60 days.

### Option B: Commercial SSL Certificate (PFX file)
1. In IIS Manager, select the server node → **Server Certificates**.
2. Click **Import...** and select your `.pfx` certificate file.
3. Expand **Sites** → right-click `SudhaSwagruhaFoods` → **Edit Bindings...**
4. Click **Add...**:
   - Type: `https`
   - Port: `443`
   - SSL Certificate: Select your imported certificate.
5. Click **OK**.

---

## 5. Troubleshooting & FAQ

| Symptom / Error | Root Cause | Solution |
| :--- | :--- | :--- |
| **HTTP 500.19 with Error Code `0x8007000d`** | URL Rewrite module is not installed, so IIS cannot parse the `<rewrite>` section in `web.config`. | Install [IIS URL Rewrite 2.1](https://www.iis.net/downloads/microsoft/url-rewrite) and run `iisreset`. |
| **HTTP 404 when refreshing `/admin` or `/orders`** | URL Rewrite rule is missing or disabled. | Verify that `web.config` is in the site root and that the `React SPA Routing` rule exists. |
| **Fonts or `.webp` images not displaying** | MIME types missing in IIS. | Handled automatically by `web.config`. If error persists, check IIS Manager → Site → **MIME Types**. |
| **Access Denied (HTTP 401.3)** | IIS worker process does not have read permissions to the physical folder. | Run `icacls "C:\inetpub\wwwroot\SudhaSwagruhaFoods" /grant "IIS_IUSRS":(OI)(CI)RX` in an Admin command prompt. |
