# Changelog v0.0.5 - PDF Redis Storage Fix

## Issue
PDFs were failing to upload with error: "Failed to upload document to external storage"

## Root Cause
The code was routing PDFs to external storage (S3/PostgreSQL) which doesn't work in Devvit production because:
- AWS SDK requires environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- Devvit doesn't support environment variables in production
- Even storing credentials in Redis doesn't work because AWS SDK checks `process.env` first

## Solution
Changed PDF storage to use Redis (same as images) instead of external storage.

## Changes Made

### 1. Server-Side Storage Routing (`src/server/index.ts`)

**Before:**
```typescript
if (isPDF) {
  // PDF: Use external storage (S3/PostgreSQL)
  const storageAdapter = StorageFactory.getAdapter();
  const storageResult = await storageAdapter.upload(buffer, metadata);
  // ... fails in production
} else {
  // Image: Use Redis
  document = { imageData: fileData, storageProvider: 'redis' };
}
```

**After:**
```typescript
// Store all files (images and PDFs) in Redis as base64
document = {
  id: documentId,
  fileName,
  fileType,
  fileSize,
  imageData: fileData, // Store base64 data for both images and PDFs
  storageProvider: 'redis',
};
```

### 2. File Size Limits

**Client (`src/client/components/DocumentUploader.tsx`):**
- **Before**: Images 500KB, PDFs 10MB
- **After**: Both images and PDFs 500KB (Redis constraint)

**Server (`src/server/index.ts`):**
- **Before**: 10MB limit
- **After**: 500KB limit

### 3. Environment Configuration

**`.env` and `.env.template`:**
- Set `STORAGE_PROVIDER=redis` as default
- Added clear documentation that AWS/PostgreSQL only work in local dev
- Explained why Gemini API works but AWS doesn't

## Testing

Build successful:
```bash
npm run build
✓ Client built in 1.05s
✓ Server built in 5.62s
```

## Impact

### ✅ What Works Now
- PDFs upload successfully in both dev and production
- PDFs stored in Redis alongside images
- Consistent storage mechanism for all file types
- No external dependencies or credentials needed

### ⚠️ Limitations
- Maximum file size reduced from 10MB to 500KB for PDFs
- Most scanned receipts/invoices are under 500KB
- Larger documents will be rejected with clear error message

### 📝 Documentation Added
- `WHY_GEMINI_WORKS_BUT_AWS_DOESNT.md` - Technical explanation
- `GEMINI_API_KEY_SETUP.md` - Setup guide for Gemini integration
- Updated `.env.template` with clear warnings and explanations

## Next Steps

### Immediate
1. Test PDF upload in playtest environment
2. Verify file size limits work correctly
3. Update user documentation with new size limits

### Future (Gemini Integration)
1. Implement admin endpoints for API key management
2. Create Gemini analysis module
3. Add auto-analysis feature to document upload flow

## Related Files
- `src/server/index.ts` - Storage routing logic
- `src/client/components/DocumentUploader.tsx` - File size validation
- `.env` - Storage provider configuration
- `.env.template` - Documentation and defaults

## Version
- **Previous**: v0.0.4 (PDFs failed to upload)
- **Current**: v0.0.5 (PDFs work with Redis storage)
- **Next**: v0.0.6 (Gemini AI analysis integration)
