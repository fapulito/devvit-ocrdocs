# Why Gemini API Works in Devvit But AWS S3 Doesn't

## TL;DR

**Gemini API ✅ Works in Devvit**
- API key passed directly to SDK constructor
- No environment variables required
- Can be stored in Redis and retrieved at runtime

**AWS S3 ❌ Doesn't Work in Devvit**
- AWS SDK requires environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- Devvit doesn't support environment variables in production
- No way to pass credentials to AWS SDK without env vars

---

## The Technical Difference

### How Gemini API Works

```typescript
// Gemini API - Key passed directly to constructor
import { GoogleGenerativeAI } from '@google/generative-ai';

// Retrieve key from Redis at runtime
const apiKey = await redis.get('config:gemini_api_key');

// Pass key directly to SDK
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Make API calls
const result = await model.generateContent(prompt);
```

**Why this works:**
- The SDK accepts the API key as a constructor parameter
- No environment variables needed
- Key can be stored anywhere (Redis, hardcoded, etc.)
- Full control over credential management

---

### How AWS S3 SDK Works

```typescript
// AWS SDK - Requires environment variables
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// AWS SDK automatically looks for these environment variables:
// - AWS_ACCESS_KEY_ID
// - AWS_SECRET_ACCESS_KEY
// - AWS_REGION

const s3Client = new S3Client({
  region: process.env.AWS_REGION, // ❌ Undefined in Devvit production
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID, // ❌ Undefined in Devvit production
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // ❌ Undefined in Devvit production
  },
});

// This fails because process.env is empty in Devvit
```

**Why this doesn't work:**
- AWS SDK expects credentials from `process.env`
- Devvit doesn't populate `process.env` in production
- Even if you store credentials in Redis, you can't pass them to AWS SDK
- The SDK's credential chain doesn't support runtime-provided credentials without env vars

---

## Devvit's Environment Variable Limitation

### What Devvit Supports

**Local Development (npm run dev):**
- ✅ `.env` files work
- ✅ `process.env` is populated
- ✅ AWS SDK works fine

**Production Deployment:**
- ❌ `.env` files ignored
- ❌ `process.env` is empty
- ❌ No way to set environment variables
- ❌ AWS SDK fails to authenticate

### Why This Limitation Exists

Devvit runs your code in a serverless environment where:
1. Each request runs in an isolated container
2. Environment variables would need to be injected per-request
3. Reddit doesn't provide a mechanism to configure env vars
4. Security model doesn't allow arbitrary environment configuration

---

## Current Storage Implementation

### What Actually Works

```typescript
// From src/server/index.ts (lines 165-220)

const isPDF = fileType === 'application/pdf' || fileType.includes('pdf');

if (isPDF) {
  // PDFs: Try external storage (S3/PostgreSQL)
  // ❌ This will FAIL in production because AWS credentials don't work
  const storageAdapter = StorageFactory.getAdapter();
  const storageResult = await storageAdapter.upload(buffer, metadata);
  
  document = {
    id: documentId,
    storageProvider: storageResult.provider, // 's3' or 'postgresql'
    storageKey: storageResult.storageKey,
    // ... other metadata
  };
} else {
  // Images: Store in Redis (works everywhere)
  document = {
    id: documentId,
    imageData: fileData, // base64 string
    storageProvider: 'redis',
    // ... other metadata
  };
}
```

### The Problem

**Current behavior:**
- Images → Redis ✅ (works in dev and production)
- PDFs → S3/PostgreSQL ❌ (only works in local dev, fails in production)

**What should happen:**
- Images → Redis ✅
- PDFs → Redis ✅ (with size limits)

---

## Solution: Store PDFs in Redis

### Why This Works

Redis storage doesn't require environment variables:

```typescript
// Redis storage - works everywhere
import { redis } from '@devvit/web/server';

// Store PDF as base64
await redis.set(`pdf:${documentId}`, base64Data);

// Retrieve PDF
const pdfData = await redis.get(`pdf:${documentId}`);
```

### Size Limitations

**Redis constraints:**
- Max value size: ~512MB (theoretical)
- Practical limit: ~10MB per value (performance)
- Recommended limit: 500KB per PDF

**Current implementation:**
- Images: 500KB limit (compressed)
- PDFs: 10MB limit (not compressed)

**Recommendation:**
- Reduce PDF limit to 500KB for Redis storage
- Most scanned receipts/invoices are under 500KB
- Larger documents can be rejected with clear error message

---

## Why Can't We Use the Same Approach for AWS?

### The Redis Approach for Gemini

```typescript
// Store Gemini API key in Redis
await redis.set('config:gemini_api_key', 'AIza...');

// Retrieve and use
const apiKey = await redis.get('config:gemini_api_key');
const genAI = new GoogleGenerativeAI(apiKey); // ✅ Works!
```

### Trying the Same with AWS (Doesn't Work)

```typescript
// Store AWS credentials in Redis
await redis.set('config:aws_access_key', 'AKIA...');
await redis.set('config:aws_secret_key', 'secret...');

// Retrieve credentials
const accessKey = await redis.get('config:aws_access_key');
const secretKey = await redis.get('config:aws_secret_key');

// Try to use with AWS SDK
const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: accessKey, // ❌ SDK still checks process.env first
    secretAccessKey: secretKey, // ❌ SDK credential chain fails
  },
});

// This STILL doesn't work because:
// 1. AWS SDK has a complex credential chain
// 2. It checks process.env before using provided credentials
// 3. When process.env is empty, the chain breaks
// 4. Even with explicit credentials, some SDK internals fail
```

### The Root Cause

**AWS SDK Architecture:**
```
AWS SDK Credential Chain:
1. Check process.env for AWS_ACCESS_KEY_ID
2. Check AWS credentials file (~/.aws/credentials)
3. Check IAM role (EC2/ECS metadata)
4. Check explicitly provided credentials
5. Fail if none found

In Devvit:
- Step 1: process.env is empty ❌
- Step 2: No filesystem access ❌
- Step 3: Not running on AWS ❌
- Step 4: Credentials provided, but chain already failed ❌
```

**Gemini SDK Architecture:**
```
Gemini SDK:
1. Use API key provided to constructor
2. That's it!

In Devvit:
- Step 1: Key retrieved from Redis and passed ✅
```

---

## Recommendations

### For Current Implementation

1. **Change PDF storage to Redis**
   - Modify `src/server/index.ts` to store PDFs in Redis like images
   - Set PDF size limit to 500KB (same as images)
   - Remove S3/PostgreSQL storage code (doesn't work in production)

2. **Update documentation**
   - Remove references to S3/PostgreSQL storage
   - Document Redis-only storage approach
   - Explain size limitations clearly

3. **Simplify codebase**
   - Remove `StorageFactory`, `S3StorageAdapter`, `PostgreSQLStorageAdapter`
   - Keep only Redis storage logic
   - Reduce complexity and maintenance burden

### For Gemini Integration

1. **Store API key in Redis**
   - Create admin endpoint: `POST /api/admin/set-gemini-key`
   - Restrict to moderators only
   - Retrieve key at runtime: `await redis.get('config:gemini_api_key')`

2. **Pass key to SDK**
   ```typescript
   const apiKey = await redis.get('config:gemini_api_key');
   const genAI = new GoogleGenerativeAI(apiKey);
   ```

3. **Handle missing key gracefully**
   - Check if key exists before making API calls
   - Return helpful error message if not configured
   - Provide setup instructions in error response

---

## Summary Table

| Feature | Storage Method | Works in Dev? | Works in Production? | Why? |
|---------|---------------|---------------|---------------------|------|
| **Images** | Redis (base64) | ✅ Yes | ✅ Yes | No env vars needed |
| **PDFs (current)** | S3/PostgreSQL | ✅ Yes | ❌ No | AWS SDK needs env vars |
| **PDFs (proposed)** | Redis (base64) | ✅ Yes | ✅ Yes | No env vars needed |
| **Gemini API** | Key in Redis | ✅ Yes | ✅ Yes | SDK accepts key directly |
| **AWS S3** | Credentials in Redis | ✅ Yes | ❌ No | SDK requires process.env |

---

## Conclusion

**The fundamental difference:**
- **Gemini SDK** = Flexible, accepts credentials as parameters
- **AWS SDK** = Rigid, requires environment variables

**The solution:**
- Use Redis for all storage (images + PDFs)
- Use Gemini API for AI features (key stored in Redis)
- Avoid AWS/external services that require environment variables

This is why the current implementation is designed to store PDFs in Redis, not S3!
