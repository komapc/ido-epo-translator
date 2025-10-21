# 🏗️ Architecture Explained - What Is Hosted Where

## 📊 Complete System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       YOUR GITHUB REPO                       │
│    github.com/komapc/vortaro                 │
│                                                              │
│  ├── src/                    ← React frontend code          │
│  ├── functions/api/          ← Cloudflare Functions         │
│  ├── apy-server/             ← Docker + APy setup           │
│  └── .github/workflows/      ← CI/CD automation             │
└──────────────┬────────────────────────┬──────────────────────┘
               │                        │
               │ (auto-deploy)          │ (auto-deploy)
               ▼                        ▼
┌──────────────────────────┐  ┌──────────────────────────────┐
│   CLOUDFLARE PAGES       │  │        EC2 SERVER            │
│   (Frontend + API)       │  │   (Translation Engine)       │
│                          │  │                              │
│  Location: Edge (Global) │  │  Location: Your AWS Region   │
│  Cost: FREE              │  │  Cost: ~$15/month            │
└──────────┬───────────────┘  └────────┬─────────────────────┘
           │                           │
           │ API calls                 │
           └────────────►  ◄───────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │    USERS     │
                  │  (Browsers)  │
                  └──────────────┘
```

---

## 🌐 **Component 1: Cloudflare Pages (Frontend)**

### **What's Hosted:**
- ✅ React application (built with Vite)
- ✅ HTML, CSS, JavaScript files
- ✅ Static assets (images, fonts)
- ✅ `index.html` - Entry point

### **Location:**
- **Global Edge Network** (200+ data centers worldwide)
- Automatically cached at the closest location to your users
- URL: `https://vortaro.pages.dev` (or custom domain)

### **Files Served:**
```
dist/
├── index.html           # Main HTML file
├── assets/
│   ├── index-*.js       # React app bundle (158 KB)
│   └── index-*.css      # Styles (13 KB)
└── _redirects           # SPA routing rules
```

### **How It Works:**
1. User visits `https://your-site.pages.dev`
2. Cloudflare serves `index.html` from nearest edge location
3. Browser loads React app
4. React takes over routing (SPA)

### **Deployment:**
- **Trigger:** Push to GitHub `main` branch
- **Process:** Cloudflare detects push → Builds → Deploys
- **Time:** ~2 minutes
- **Cost:** $0 (unlimited requests)

---

## ⚙️ **Component 2: Cloudflare Functions (API)**

### **What's Hosted:**
- ✅ `/api/translate` - Text translation endpoint
- ✅ `/api/translate-url` - URL translation endpoint  
- ✅ `/api/admin/rebuild` - Admin rebuild endpoint
- ✅ `/api/health` - Health check endpoint

### **Location:**
- **Cloudflare Edge** (same as frontend)
- Runs as serverless functions at the edge

### **Files:**
```
functions/api/[[path]].ts   # API handler (all routes)
```

**OR** (alternative setup):
```
worker.js                   # Cloudflare Worker (all-in-one)
```

### **How It Works:**
1. React app calls `/api/translate` with text
2. Cloudflare Function receives request at edge
3. Function forwards to APy server on EC2
4. Receives translation, returns to user

### **Request Flow Example:**
```
User clicks "Translate" button
   ↓
React sends POST to /api/translate
   ↓
Cloudflare Function at edge processes request
   ↓
Function calls EC2: http://YOUR_EC2_IP:2737/translate
   ↓
APy server translates using Apertium
   ↓
Response flows back through Cloudflare to user
```

### **Deployment:**
- **Trigger:** Push to GitHub
- **Process:** Auto-deploys with frontend
- **Time:** Same 2 minutes
- **Cost:** $0 (up to 100k requests/day)

---

## 🖥️ **Component 3: EC2 Server (Translation Engine)**

### **What's Hosted:**
- ✅ **Docker container** with:
  - APy HTTP API server (Python)
  - Apertium core engine
  - `apertium-ido` language data
  - `apertium-epo` language data
  - `apertium-ido-epo` translation rules

### **Location:**
- **Your AWS Region** (e.g., us-east-1, eu-west-1)
- Single dedicated server
- URL: `http://YOUR_EC2_IP:2737`

### **Container Structure:**
```
EC2 Instance
└── Docker Container (ido-epo-apy)
    ├── Debian Linux
    ├── Apertium Engine
    ├── APy Server (Python)
    │   └── Listening on port 2737
    ├── /usr/local/share/apertium/modes/
    │   ├── ido-epo.mode     # Ido → Esperanto
    │   └── epo-ido.mode     # Esperanto → Ido
    └── Language Data
        ├── apertium-ido/
        │   └── apertium-ido.ido.dix  (6,667 entries)
        ├── apertium-epo/
        └── apertium-ido-epo/
            ├── apertium-ido-epo.ido-epo.dix  (~13,300 entries)
            └── apertium-ido-epo.ido-epo.t1x  (transfer rules)
```

### **How It Works:**
1. APy server listens on port 2737
2. Receives translation requests via HTTP POST
3. Calls Apertium engine with text
4. Returns translated text as JSON

### **API Endpoints (on EC2):**
```bash
# List available translation pairs
GET http://YOUR_EC2_IP:2737/listPairs
→ [{"sourceLanguage":"ido","targetLanguage":"epo"}, ...]

# Translate text
POST http://YOUR_EC2_IP:2737/translate
Body: q=Me+amas+vu&langpair=ido|epo
→ {"responseData":{"translatedText":"Mi amas vin"}}
```

### **Deployment:**
- **Initial:** Run `setup-ec2.sh` script (one-time)
- **Updates:** 
  - Option A: GitHub Actions auto-deploy
  - Option B: SSH and run `./update-dictionaries.sh`
- **Time:** 10-15 minutes for rebuild
- **Cost:** ~$15/month (t3.small instance)

---

## 🔄 **Component 4: GitHub Actions (CI/CD)**

### **What's Hosted:**
- ✅ `.github/workflows/deploy-ec2.yml` - EC2 deployment
- ✅ `.github/workflows/cloudflare-pages.yml` - Frontend deployment

### **Location:**
- **GitHub's infrastructure**
- Free for public repositories

### **What It Does:**

#### **Workflow 1: Deploy to Cloudflare Pages**
```yaml
Trigger: Push to main (src/, functions/ changes)
Steps:
  1. Checkout code
  2. npm install
  3. npm run build
  4. Deploy to Cloudflare Pages
Result: Frontend updated automatically
```

#### **Workflow 2: Deploy to EC2**
```yaml
Trigger: Push to main (apy-server/ changes) OR manual
Steps:
  1. SSH to EC2
  2. Pull latest apertium-ido-epo code
  3. Rebuild Docker image
  4. Restart container
Result: Translation engine updated
```

### **Deployment:**
- **Trigger:** Automatic on git push
- **Requirements:** GitHub secrets configured
- **Cost:** $0 (free for public repos)

---

## 📁 **What's Stored Where**

### **On GitHub:**
```
✅ All source code
✅ React components
✅ API functions
✅ Docker configuration
✅ Deployment scripts
✅ Documentation
```

### **On Cloudflare:**
```
✅ Built frontend (HTML/CSS/JS)
✅ API serverless functions
✅ Edge cache
✅ SSL certificates (automatic)
```

### **On EC2:**
```
✅ Docker container image
✅ Apertium language data
✅ APy server runtime
✅ Translation modes
✅ Compiled dictionaries
```

### **On Your Local Machine:**
```
✅ Development environment
✅ Git repository clone
✅ Local testing setup
```

---

## 🔄 **Data Flow Examples**

### **Example 1: Text Translation**

```
1. User types "Me amas vu" in browser
2. Clicks "Translate" button

3. React app sends POST to:
   https://your-site.pages.dev/api/translate
   Body: {"text":"Me amas vu","direction":"ido-epo"}

4. Cloudflare Function (edge) receives request

5. Function forwards to EC2:
   POST http://YOUR_EC2_IP:2737/translate
   Body: q=Me+amas+vu&langpair=ido|epo

6. APy on EC2 calls Apertium engine

7. Apertium translates using dictionaries:
   - Looks up "Me" → "Mi"
   - Looks up "amas" → "amas"
   - Looks up "vu" → "vin"
   - Applies transfer rules

8. APy returns JSON:
   {"responseData":{"translatedText":"Mi amas vin"}}

9. Cloudflare Function returns to browser

10. React displays: "Mi amas vin"
```

### **Example 2: URL Translation**

```
1. User enters Wikipedia URL: https://io.wikipedia.org/wiki/Austria
2. Clicks "Translate"

3. React sends POST to:
   /api/translate-url

4. Cloudflare Function fetches the Wikipedia page

5. Function extracts text from HTML (removes tags)

6. Function sends text to EC2 APy server

7. APy translates entire text

8. Function returns both original and translated text

9. React displays side-by-side comparison
```

### **Example 3: Code Update**

```
1. You edit src/App.tsx locally
2. git add . && git commit -m "Updated UI"
3. git push origin main

4. GitHub receives push

5. Cloudflare Pages detects push via webhook

6. Cloudflare runs build:
   - npm install
   - npm run build
   - Creates dist/ folder

7. Cloudflare deploys to edge network (2 min)

8. New version live at https://your-site.pages.dev
```

---

## 💰 **Cost Breakdown by Component**

| Component | Service | Location | Cost/Month |
|-----------|---------|----------|------------|
| Frontend | Cloudflare Pages | Global Edge | **$0** |
| API | Cloudflare Functions | Global Edge | **$0** |
| Translation | EC2 t3.small | AWS Region | **~$15** |
| CI/CD | GitHub Actions | GitHub Cloud | **$0** |
| Repository | GitHub | GitHub Cloud | **$0** |
| **TOTAL** | | | **~$15/month** |

---

## 🌍 **Geographic Distribution**

### **Global (Fast Everywhere):**
- ✅ Frontend (React app)
- ✅ API Functions
- ✅ Cached responses

**Users in Japan, Brazil, Europe, USA all get:**
- Fast page loads from nearest edge
- API responses from nearest edge
- Only translation calls go to EC2

### **Single Region (Your EC2):**
- ⚙️ Translation Engine (APy + Apertium)
- ⚙️ Dictionary data
- ⚙️ Actual translation processing

**Why this works:**
- Frontend loads instantly (edge cached)
- Only the actual translation hits EC2
- Translation is ~100-500ms (acceptable)

---

## 🔐 **Security & Access**

### **Public (No Auth Required):**
- ✅ Frontend website
- ✅ `/api/translate` endpoint
- ✅ `/api/translate-url` endpoint
- ✅ EC2 APy server (port 2737)

### **Protected:**
- 🔐 `/api/admin/rebuild` - Requires password
- 🔐 EC2 SSH (port 22) - Requires SSH key
- 🔐 GitHub Actions - Requires secrets

### **Environment Variables:**

**On Cloudflare Pages:**
```
APY_SERVER_URL=http://YOUR_EC2_IP:2737
ADMIN_PASSWORD=your-secure-password
```

**On EC2:**
```
(No env vars needed - APy auto-detects modes)
```

---

## 🎯 **Quick Reference**

| What | Where | URL | Access |
|------|-------|-----|--------|
| **React App** | Cloudflare | `https://your-site.pages.dev` | Public |
| **API Functions** | Cloudflare | `https://your-site.pages.dev/api/*` | Public |
| **Translation Engine** | EC2 | `http://YOUR_EC2_IP:2737` | Public |
| **Source Code** | GitHub | `github.com/komapc/vortaro` | Public |
| **Admin Panel** | Cloudflare | `https://your-site.pages.dev` (Admin tab) | Password |
| **SSH Access** | EC2 | `ssh ubuntu@YOUR_EC2_IP` | SSH Key |

---

## 🔧 **How to Update Each Component**

### **Update Frontend (React):**
```bash
vim src/App.tsx
git push origin main
# ✅ Auto-deploys to Cloudflare in 2 min
```

### **Update API (Functions):**
```bash
vim functions/api/[[path]].ts
git push origin main
# ✅ Auto-deploys with frontend
```

### **Update Dictionaries (Translation):**
```bash
# In apertium-ido-epo repo
git push origin main

# Then on EC2:
ssh ubuntu@YOUR_EC2_IP
cd /opt/ido-epo-translator
./update-dictionaries.sh
# ✅ Rebuilds in 10-15 min
```

---

## 📊 **Traffic Flow Summary**

```
User Request
    ↓
Cloudflare Edge (nearest location)
    ├─→ Static files (HTML/CSS/JS) → Instant
    ├─→ Cached API responses → Instant
    └─→ New translation request
            ↓
        EC2 Server (your region)
            ↓
        Apertium Engine
            ↓
        Translation result
            ↓
        Back to user via Cloudflare
```

**Performance:**
- Static files: **10-50ms** (edge)
- API overhead: **10-20ms** (edge)
- Translation: **100-500ms** (EC2)
- **Total:** **120-570ms** typical

---

## ✅ **Summary**

**What runs where:**
- **Cloudflare (Global):** Frontend + API + Cache
- **EC2 (Single Region):** Translation Engine only
- **GitHub:** Source code + CI/CD
- **Your Machine:** Development only

**Why this architecture:**
- ✅ Fast global frontend (edge CDN)
- ✅ Cheap (only pay for EC2)
- ✅ Easy updates (git push)
- ✅ Scalable (can add more EC2 instances)
- ✅ Reliable (Cloudflare edge redundancy)

**Current Status:**
- ✅ Code committed to GitHub
- ✅ Frontend builds successfully
- 🔄 EC2 Docker rebuilding (10-15 min)
- ⏳ Ready to deploy to Cloudflare Pages

**Next Step:**
Connect GitHub to Cloudflare Pages → Go live!

