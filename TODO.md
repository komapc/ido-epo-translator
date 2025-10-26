# TODO - Ido-Esperanto Web Translator

**Last Updated:** October 23, 2025

## 🎯 Current Priority

### ~~🚨 0. Configure GitHub Secrets~~ ✅ COMPLETE
**Status:** ✅ **IMPLEMENTED** - Deployments working since Oct 22-23  
**Evidence:** Multiple successful deployments in GitHub Actions

- ✅ Added `CLOUDFLARE_API_TOKEN` to GitHub Secrets
- ✅ Added `CLOUDFLARE_ACCOUNT_ID` to GitHub Secrets
- ✅ Deployment workflow working successfully

**Impact:** Automated Cloudflare Worker deployments now working  
**Documentation:** `DEPLOYMENT_FIX_NEEDED.md`

---

### 🔴 0. Dictionary Quality Issues (BLOCKING TRANSLATION QUALITY)
**Status:** ❌ **CRITICAL** - Depends on extractor fixes  
**Priority:** CRITICAL  
**Time:** Depends on extractor team  
**Impact:** Poor translation quality, missing features

**Root Cause:** Extractor creates incomplete and corrupted dictionaries:
- ❌ **Missing morphological rules** - No verb participles, limited adjective forms
- ❌ **Corrupted bilingual entries** - Metadata in translations (e.g., `du` → `du Kategorio:Eo DU{wikt_io}`)

**Dependencies:**
- [ ] **Wait for extractor morphological integration fix** (`projects/extractor/TODO.md` #0)
- [ ] **Wait for extractor data corruption fix** (`projects/extractor/TODO.md` #1)
- [ ] **Deploy fixed dictionaries to APy server**
- [ ] **Test translation quality improvements**

**Cannot proceed with translation improvements until extractor issues are resolved.**

**Files to monitor:**
- `projects/extractor/TODO.md` - Critical fixes in progress
- `EXTRACTOR_MORPHOLOGY_ANALYSIS.md` - Detailed issue analysis

---

### 1. Improve Deployment (After Extractor Fixes)
**Status:** Waiting for extractor fixes  
**Priority:** High (after dictionary quality is resolved)  
**Dependencies:** Extractor morphological integration and data cleaning

#### Current Issues:
The current deployment process works but deploys incomplete/corrupted dictionaries from the extractor.

#### Goals (After Extractor Fixes):
- [ ] **Deploy Fixed Dictionaries**
  - Wait for complete dictionaries with morphological rules
  - Deploy clean bilingual dictionaries without metadata corruption
  - Test translation quality improvements

- [ ] **Automated Dictionary Updates**
  - Automatic detection of new dictionary versions
  - Trigger rebuild when extractor produces new .dix files
  - Zero-downtime deployment

- [ ] **Faster Rebuild Process**
  - Current: ~5-10 minutes to rebuild Apertium pairs
  - Target: <3 minutes for dictionary-only updates
  - Investigate: Pre-compiled dictionary swapping

- [ ] **Enhanced Rebuild Button**
  - Show dictionary version information
  - Display quality metrics (entries count, morphological features)
  - Progress tracking for rebuild process
  - Currently: Manual trigger, shows progress
  - Needs: Smart detection (don't rebuild if unnecessary)
  - Status: ✅ Already implemented (checks for updates first)
  - Improvement: Show what changed (version diff)

---

## 📋 Deployment Improvement Tasks

### High Priority:
- [ ] **Webhook for Extractor → Translator**
  - Trigger deployment when extractor finishes
  - POST to EC2 webhook with new dictionary URLs
  - Auto-download and install new dictionaries
  
- [ ] **Dictionary Hot-Reload**
  - Reload dictionaries without restarting APy
  - Investigate APy server capabilities
  - Fall back to graceful restart if needed

- [ ] **Version Tracking**
  - Track dictionary versions (git commit SHA or timestamp)
  - Display in UI footer (currently shows repo versions)
  - Show "Dictionary updated X hours ago"

- [ ] **Deployment Pipeline**
  ```
  Extractor Run → Build .dix → Git Commit → Webhook → EC2 Download → APy Reload → UI Update
  ```

### Medium Priority:
- [ ] **Rollback Capability**
  - Keep last 3 dictionary versions
  - Quick rollback if new version has issues
  - Accessible via admin panel

- [ ] **Pre-built Binaries**
  - Compile `.dix` → `.bin` in extractor
  - Upload pre-compiled binaries to S3 or GitHub releases
  - EC2 downloads binaries instead of compiling
  - Target: 80% faster deployment

- [ ] **Staging Environment**
  - Test new dictionaries on staging before prod
  - Separate EC2 instance or Docker container
  - Automated testing before promotion

- [ ] **Health Checks**
  - Verify translation quality after deployment
  - Run smoke tests (10-20 known good translations)
  - Alert if quality degrades

### Lower Priority:
- [ ] **Blue-Green Deployment**
  - Run two APy instances
  - Switch traffic after successful deployment
  - Zero downtime guarantee

- [ ] **CDN for Dictionaries**
  - Store compiled dictionaries on Cloudflare R2
  - Fast global distribution
  - Version management

---

## 🔧 Technical Implementation

### Option 1: Webhook + Hot Reload (Recommended)
**Effort:** Medium | **Impact:** High

```bash
# Extractor finishes → triggers webhook
curl -X POST https://ec2-host/webhook/update-dictionaries \
  -H "Authorization: Bearer $SECRET" \
  -d '{"repo": "apertium-ido-epo", "commit": "abc123"}'

# EC2 webhook handler:
1. Pull latest dictionaries from git
2. Compile .dix → .bin (or download pre-compiled)
3. Reload APy server (hot reload or restart)
4. Return success/failure
```

### Option 2: Pre-compiled Binaries (Future)
**Effort:** High | **Impact:** Very High

```bash
# In extractor (after building .dix):
make compile-bin
# Produces: apertium-ido.ido.bin, apertium-ido-epo.ido-epo.bin

# Upload to GitHub releases or S3
aws s3 cp *.bin s3://apertium-dictionaries/ido-epo/v1.2.3/

# EC2 downloads and installs:
wget https://cdn.example.com/dictionaries/ido-epo-v1.2.3.tar.gz
tar -xzf ido-epo-v1.2.3.tar.gz -C /opt/apertium/
systemctl reload apy
```

### Option 3: Docker Image (Complex but Clean)
**Effort:** Very High | **Impact:** Very High

- Build complete Docker image with dictionaries
- Push to Docker Hub or GitHub Container Registry
- EC2 pulls and deploys new container
- Benefits: Complete reproducibility, rollback via tags

---

## 📊 Current Deployment Process

### As-Is (October 2025):
1. **Extractor runs** → produces new `.dix` files in `dist/`
2. **Manual step:** Copy to apertium-ido-epo repo
3. **Manual step:** Git commit and push
4. **Manual step:** SSH to EC2, git pull
5. **Manual step:** Rebuild Apertium pairs (~5-10 min)
6. **Manual step:** Restart Docker container
7. **Result:** New dictionaries live

**Problems:**
- 6 manual steps
- 10-15 minutes total
- Error-prone
- No automation

### To-Be (Proposed):
1. **Extractor runs** → produces new `.dix` files
2. **Auto-commit** to apertium-ido-epo repo
3. **Webhook triggers** EC2 update
4. **EC2 auto-updates** and reloads (3 minutes)
5. **Result:** New dictionaries live

**Benefits:**
- 1 manual step (run extractor)
- 3 minutes total
- Automated
- Reliable

---

## 🔍 Questions to Answer

**Please clarify:**
1. Should dictionary updates be **fully automated** or require approval?
2. Is it okay to **auto-commit** new dictionaries to git?
3. Should we build **pre-compiled binaries** in the extractor?
4. Do you want a **staging environment** for testing?
5. What's the **acceptable downtime** for dictionary updates? (0 seconds, <10 seconds, <1 minute?)

---

## 📋 Next Actions

### Immediate (This Week):
1. **Document Current Process**
   - Write step-by-step guide for manual deployment
   - Identify pain points
   - Time each step

2. **Design Webhook System**
   - Define API contract (payload, authentication)
   - Plan EC2 handler script
   - Consider error handling

3. **Test Hot Reload**
   - Research APy hot reload capabilities
   - Test dictionary reload without restart
   - Document findings

### Short Term (This Month):
- [ ] Implement webhook endpoint on EC2
- [ ] Add webhook trigger to extractor
- [ ] Test automated deployment flow
- [ ] Document in `docs/DEPLOYMENT_GUIDE.md`

### Medium Term (Next 3 Months):
- [ ] Pre-compiled binary support
- [ ] Staging environment
- [ ] Automated smoke tests
- [ ] Version tracking in UI

---

## 📚 Resources

- Current deployment docs: `DEPLOYMENT_GUIDE.md`, `OPERATIONS.md`
- EC2 setup: `setup-ec2.sh`
- Webhook server: `webhook-server.js` (basic implementation exists)
- Rebuild script: `apy-server/rebuild.sh`
- Docker: `apy-server/docker-compose.yml`, `apy-server/Dockerfile`

---

## 💡 Additional Improvements (Lower Priority)

### UI Enhancements:
- [ ] **Add Google Analytics**
  - Implement Google Analytics 4 (GA4) tracking
  - Track translation usage patterns (language pairs, volume)
  - Monitor user engagement and session duration
  - Privacy-compliant implementation (no personal data)
  - Add to both web interface and API endpoints
  - Expected: Better insights into translator usage
- [ ] Show dictionary version in footer (commit SHA + date)
- [ ] "Dictionary last updated: 2 hours ago"
- [ ] Admin panel: View dictionary stats (word count, source breakdown)
- [ ] Admin panel: Compare current vs previous dictionary

### Monitoring:
- [ ] Log translation requests (privacy-preserving)
- [ ] Track translation quality metrics
- [ ] Alert on error rate increases
- [ ] Dashboard for translation stats

### Performance:
- [ ] Cache frequent translations (Redis)
- [ ] Edge caching for static translations
- [ ] Optimize APy server configuration
- [ ] Load balancing for high traffic


