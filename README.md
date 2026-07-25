# SF Tools — Salesforce Developer Toolkit ⚡

SF Tools is a comprehensive, offline-first suite of utilities designed for Salesforce developers, administrators, and consultants. It streamlines day-to-day development tasks with a package.xml generator, SOQL builder, code diff utility, code formatter, AI-powered code analyzer, and more.

---

## 🌟 Key Features

* **📦 package.xml Generator:** Build and customize package files for metadata migrations and deployments.
* **🔍 SOQL Builder:** Construct Salesforce Object Query Language queries visually or write them manually with helpful autocomplete and syntax options.
* **✍️ Code Formatter & Diff:** Clean up, format, and compare files for Apex, Visualforce, HTML, CSS, JavaScript, and JSON.
* **🧠 AI Code Analyzer & Explainer:** Paste Apex or LWC code to check for structure, performance issues, security vulnerabilities, or get code explanations (powered by Anthropic Claude).
* **📴 100% Offline Capable:** A fully featured Progressive Web App (PWA) with service worker caching (`sw.js`) that allows tools to function without an active internet connection.
* **☁️ Cloudflare Pages & Workers Integration:** Designed to run serverless on Cloudflare using `sf-proxy-worker.js` and `_worker.js` with KV namespaces (`AI_TOKENS`) for secure payment and AI proxy transactions.

---

## 📂 Project Structure

* `index.html`: Main frontend containing the responsive workspace layout and offline developer tools.
* `manifest.json`: PWA metadata definition providing icons, themes, and launch options.
* `wrangler.toml`: Configuration for Cloudflare Serverless Workers deployment.
* `sf-proxy-worker.js`: Cloudflare worker managing secure serverless proxy endpoints (Razorpay payment validation, Anthropic API, Resend mailing).
* `_worker.js`: Cloudflare Pages function handler.
* `sw.js`: Service worker caching static assets for offline capability.
* `sitemap.xml` & `robots.txt`: Search engine optimization configurations.
* `.claude/`: Contains workspace-level scripts, helpers, and dev tool configuration templates:
  - `serve.ps1` & `serve.pl`: Local development test server scripts.
  - `analysis_modal_new.js`, `depfind_new.js`, etc.: Auxiliary utilities.

---

## ⚙️ Local Development

To run the frontend locally, you can start a simple HTTP server in the repository directory:

### Using Python:
```bash
python -m http.server 8000
```

### Using Node.js (`http-server`):
```bash
npx http-server -p 8000
```

### Using the provided PowerShell script:
```powershell
powershell -ExecutionPolicy Bypass -File .claude/serve.ps1
```

Once running, navigate to `http://localhost:8000` in your web browser.

---

## 🚀 Cloudflare Deployment & Secrets

To deploy the proxy worker and backend functions, you will need the Cloudflare Wrangler CLI.

### 1. Configure Secrets
Run the following commands using the Wrangler CLI to securely store API keys in Cloudflare KV without exposing them in public commits:

```bash
# Set Anthropic Claude API Key
npx wrangler secret put ANTHROPIC_API_KEY

# Set Razorpay Secret Key for Payments
npx wrangler secret put RAZORPAY_KEY_SECRET

# Set Resend API Key for Email Notifications
npx wrangler secret put RESEND_API_KEY

# Set Custom Admin Password Key
npx wrangler secret put ADMIN_KEY
```

### 2. Deploy to Cloudflare
Once secrets are set, compile and deploy your serverless worker to your Cloudflare account:

```bash
npx wrangler deploy
```
