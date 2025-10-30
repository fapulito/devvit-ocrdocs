# 📄 OCR Document Manager for Reddit - Development Journey

## 🎯 Project Goal

Build a Reddit app using Devvit that allows users to upload documents (images and PDFs), perform OCR/AI analysis, and manage their documents within Reddit posts.

---

## 🚀 Phase 1: Initial Vision & AWS Textract Attempt

### The Plan
We started with ambitious goals:
- Use AWS Textract for professional OCR
- Store documents in S3 for scalability
- Use PostgreSQL (Neon) for metadata
- Build a production-ready document management system

### The Reality Check 💥

**AWS Textract Problems:**
- ❌ Requires AWS SDK with native dependencies
- ❌ Devvit's serverless environment doesn't support native Node.js packages
- ❌ No filesystem access for temporary file storage
- ❌ Complex authentication requirements incompatible with Devvit

**Verdict:** AWS Textract was completely incompatible with Devvit's architecture.

---

## 🔄 Phase 2: Pivot to Google Gemini AI

### Why Gemini?
- ✅ Pure JavaScript SDK (no native dependencies)
- ✅ Supports both image and PDF analysis
- ✅ Vision capabilities for document understanding
- ✅ Works with Devvit's HTTP fetch (generativelanguage.googleapis.com is globally allow-listed)

### The Environment Variable Nightmare 😤

**Devvit's Strange Approach:**
- Devvit **does not support environment variables** in the traditional sense
- No `.env` file support in production
- No way to inject secrets at build time
- The only option: **hardcode API keys in code** or store in Redis

**Our Solution:**
```typescript
const apiKey = await redis.get('config:gemini_api_key') || 'HARDCODED_FALLBACK';
```

This is a **terrible security practice** but it's the only way Devvit allows external API integration. The API key is visible in the source code and must be manually set in Redis after deployment.

---

## 💾 Phase 3: Storage Architecture Battle

### Initial Plan: External Storage
- S3 for large files
- PostgreSQL for metadata
- Presigned URLs for access

### The Problems:
1. **AWS SDK Issues:** Same native dependency problems as Textract
2. **PostgreSQL Complexity:** Connection pooling doesn't work in serverless
3. **Devvit Fetch Limitations:** Custom domains require Reddit approval (1-3 days)

### Final Solution: Redis-Only Storage ✅

**Why Redis Won:**
- ✅ Built into Devvit (no external dependencies)
- ✅ No authentication needed
- ✅ Works immediately
- ✅ Simple key-value storage
- ❌ 500KB file size limit (acceptable for compressed images and small PDFs)

**Storage Strategy:**
```typescript
// Store base64-encoded files directly in Redis
await redis.set(`docs:${postId}:list`, JSON.stringify(documents));
```

Documents are stored as base64 strings in Redis with 7-day cache for AI analysis results.

---

## 🎨 Phase 4: Splash Screen Frustration

### The Problem
Implementing a custom splash screen took **way longer than expected** due to Devvit's URL handling quirks.

**Issue:** Devvit was appending extra parameters to asset URLs, breaking image loading:
```
Expected: /assets/splash.png
Actual:   /assets/splash.png?devvit_post_id=xyz&extra_params=...
```

**Solution:** Had to carefully handle URL construction and test extensively to get images loading correctly.

### Build Time Chaos ⏱️

**The Devvit Build Experience:**
- Sometimes builds complete in 10 seconds ⚡
- Sometimes they take 2+ minutes 🐌
- Sometimes they fail for no reason 💥
- Sometimes they work perfectly after a retry 🤷

**No consistency, no clear error messages, just chaos.**

---

## 🔧 Phase 5: The Model Name Saga

### The Final Boss Battle 😤

After getting everything else working, the Gemini API kept returning 404 errors. This turned into a multi-hour debugging nightmare.

**Attempt 1:** `gemini-1.5-flash-latest`
```
❌ Error: models/gemini-1.5-flash-latest is not found for API version v1beta
```

**Attempt 2:** `gemini-1.5-flash`
```
❌ Error: models/gemini-1.5-flash is not found for API version v1beta
```

**Attempt 3:** `models/gemini-1.5-flash` (with prefix)
```
❌ Error: models/gemini-1.5-flash is not found for API version v1beta
```

**Attempt 4:** Switch to v1 API
```
❌ Error: models/gemini-1.5-flash is not found for API version v1
```

**Attempt 5:** `gemini-1.5-flash-8b`
```
❌ Error: models/gemini-1.5-flash-8b is not found for API version v1
```

### The Breakthrough 💡

Checked Google AI Studio documentation and found the actual model name: **`gemini-2.5-flash`**

```typescript
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.4,
    maxOutputTokens: 1000,
  },
}, {
  apiVersion: 'v1',
});
```

**But wait, there's more!** 🎭

### The Empty Response Mystery

The model started working but returned **empty strings**:
```json
{"textLength":0,"textPreview":"","hasText":false}
```

**Root Cause:** `maxOutputTokens: 200` was too small!
- The model was generating responses
- They were being truncated to nothing
- `finishReason: "MAX_TOKENS"` revealed the issue

**Solution:** Increased to `maxOutputTokens: 1000`

### The JSON Format Problem

Model returned plain text instead of JSON:
```
"The provided image is an aerial view of a construction site..."
```

**Solution:** Rewrote prompt to force JSON output:
```typescript
const prompt = `You must respond with ONLY valid JSON, no other text.

Analyze this image and return JSON with this exact structure:
{
  "description": "brief description (max 80 chars)",
  "summary": "key details and information"
}

Respond with ONLY the JSON object, nothing else.`;
```

---

## 🎉 Phase 6: Success!

### What We Built

A fully functional document management app for Reddit that:

✅ **Uploads images and PDFs** (despite Reddit docs saying only images are supported)
✅ **AI-powered analysis** using Gemini 2.5 Flash
✅ **Auto-generates descriptions** from document content
✅ **Extracts key information** (amounts, dates, companies)
✅ **Stores documents in Redis** (up to 20 per post, 500KB each)
✅ **7-day caching** for AI results (cost optimization)
✅ **Rate limiting** (100 requests/day per user)
✅ **Mobile-friendly UI** with Tailwind CSS
✅ **Works entirely within Reddit** posts

### Final Architecture

```
┌─────────────────────────────────────────┐
│         Reddit Post (Devvit)            │
├─────────────────────────────────────────┤
│  Client (React)                         │
│  ├─ DocumentUploader.tsx                │
│  ├─ DocumentsList.tsx                   │
│  └─ File compression & preview          │
├─────────────────────────────────────────┤
│  Server (Express)                       │
│  ├─ /api/analyze (Gemini AI)            │
│  ├─ /api/documents/add                  │
│  ├─ /api/documents/list                 │
│  └─ /api/documents/delete               │
├─────────────────────────────────────────┤
│  Storage (Redis)                        │
│  ├─ docs:{postId}:list (documents)      │
│  ├─ analysis:{hash} (AI cache)          │
│  └─ ratelimit:{user}:{date} (limits)    │
├─────────────────────────────────────────┤
│  External APIs                          │
│  └─ Google Gemini 2.5 Flash (v1 API)    │
└─────────────────────────────────────────┘
```

### Key Technical Achievements

1. **PDF Support in Reddit** 📄
   - Reddit's documentation says only images can be uploaded
   - We proved PDFs work by encoding them as base64 and using Gemini's PDF analysis

2. **Efficient Caching** 💾
   - MD5 hash-based cache keys
   - 7-day TTL for AI results
   - Duplicate uploads use cached analysis (free)

3. **Cost Optimization** 💰
   - Gemini 2.5 Flash: ~$0.0002 per analysis
   - Monthly cost: ~$0.40-$0.67 for 100 requests/day
   - Essentially free with caching

4. **Rate Limiting** 🚦
   - 100 requests/day per user
   - Resets at midnight UTC
   - Prevents API abuse

5. **Mobile-First Design** 📱
   - Touch-optimized file input
   - Responsive layout
   - Works in Reddit mobile app

---

## 🤔 Lessons Learned

### About Devvit

**The Good:**
- ✅ React integration works well
- ✅ Redis is fast and reliable
- ✅ Hot reload during development
- ✅ Automatic Reddit authentication

**The Bad:**
- ❌ No environment variable support (security nightmare)
- ❌ No native Node.js packages (kills AWS SDK)
- ❌ Erratic build times (10s to 2+ minutes)
- ❌ Poor error messages
- ❌ URL handling quirks with assets

**The Ugly:**
- 😤 Must hardcode API keys in source code
- 😤 Build failures with no explanation
- 😤 Documentation gaps (PDF support not mentioned)
- 😤 No way to test external APIs locally

### About AI Integration

**What Worked:**
- Gemini 2.5 Flash is fast and accurate
- Vision API handles both images and PDFs
- JSON mode works with proper prompting
- Cost is negligible with caching

**What Didn't:**
- Model names are confusing and poorly documented
- Token limits need careful tuning
- Empty responses are hard to debug
- API version compatibility is unclear

### About Reddit Development

**Surprising Discoveries:**
- PDFs work despite documentation saying otherwise
- Redis is more capable than expected
- Mobile support is better than anticipated
- Community will find creative uses we didn't expect

---

## 📊 Final Stats

- **Development Time:** ~2 weeks (with many frustrating hours)
- **Lines of Code:** ~2,500
- **API Integrations:** 1 (Gemini)
- **Storage Solutions Attempted:** 3 (S3, PostgreSQL, Redis)
- **Model Names Tried:** 6+
- **Build Failures:** Too many to count
- **Final Result:** ✅ Working OCR app on Reddit

---

## 🚀 What's Next?

Potential improvements:
- [ ] Batch document analysis
- [ ] Export to CSV/Excel
- [ ] Document search functionality
- [ ] OCR text editing
- [ ] Multi-language support
- [ ] Document categorization
- [ ] Receipt total calculations
- [ ] Integration with accounting software

---

## 💭 Final Thoughts

Building on Devvit is like solving a puzzle where half the pieces are missing and the box has the wrong picture. But when it works, it's pretty cool to have an AI-powered document manager running inside Reddit posts.

The biggest lesson: **Don't fight the platform.** We tried AWS, PostgreSQL, and complex architectures. What worked was embracing Devvit's limitations and using Redis for everything.

Also: **Google's model naming is chaos.** 🤷

---

**Built with:** React, TypeScript, Express, Redis, Google Gemini AI, Tailwind CSS, and a lot of patience.

**Deployed on:** Reddit via Devvit

**Status:** ✅ Production-ready (with hardcoded API keys because Devvit)
