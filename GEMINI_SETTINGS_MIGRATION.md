# Gemini API Key - Migration to Devvit Settings

## Summary

Migrated from custom admin endpoint + Redis storage to Devvit's built-in settings system for managing the Gemini API key.

## Changes Made

### 1. Removed Custom Admin Endpoint
- **Deleted**: `POST /api/admin/set-gemini-key` endpoint from `src/server/index.ts`
- **Reason**: Devvit settings provide a better, more secure solution

### 2. Updated API Key Retrieval
- **File**: `src/server/ai/gemini.ts`
- **Changed**: 
  - From: `redis.get('config:gemini_api_key')`
  - To: `settings.get('apiKey')`
- **Import**: Changed from `redis` to `settings` from `@devvit/web/server`

### 3. Added Settings Configuration
- **File**: `devvit.json`
- **Added**:
```json
{
  "settings": [
    {
      "type": "string",
      "name": "apiKey",
      "label": "Gemini API Key",
      "helpText": "Your Google Gemini API key for document analysis. Get one at https://aistudio.google.com/app/apikey",
      "isSecret": true
    }
  ]
}
```

### 4. Updated Documentation
- **File**: `GEMINI_API_KEY_SETUP.md`
- **Changes**:
  - Removed all admin endpoint instructions
  - Added Devvit CLI setup instructions
  - Simplified security considerations
  - Updated code examples

### 5. Updated Spec Documents
- **File**: `.kiro/specs/gemini-analysis/tasks.md`
  - Updated Task 2.4 to reflect Devvit settings approach
- **File**: `.kiro/specs/gemini-analysis/design.md`
  - Updated API Key Storage section with new approach

## How to Set the API Key

### Before (Old Way - Removed)
```bash
# Required custom endpoint and moderator authentication
curl -X POST /api/admin/set-gemini-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "AIza..."}'
```

### After (New Way - Current)
```bash
# Simple CLI command
npx devvit settings set apiKey
# Or with value directly:
npx devvit settings set apiKey "AIza..."
```

## Benefits of New Approach

1. **Simpler**: No custom code needed
2. **More Secure**: Encrypted by Devvit platform
3. **Standard**: Follows Devvit best practices
4. **Easier Management**: CLI-based, no API calls needed
5. **Better UX**: Clear help text in settings UI

## Migration Steps for Existing Deployments

If you already have the API key set in Redis:

1. Get the current key from Redis (if you have access)
2. Run `npx devvit settings set apiKey "YOUR_KEY"`
3. Deploy the updated code
4. The old Redis key will be ignored

## Testing

After deployment, verify the integration works:

```bash
# Test the analysis endpoint
curl -X POST /api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "fileData": "data:image/png;base64,...",
    "fileType": "image/png",
    "fileName": "test.png"
  }'
```

If the key is not set, you'll see:
```json
{
  "error": "Gemini API key not configured. Run: npx devvit settings set apiKey"
}
```

## Files Modified

- ✅ `src/server/index.ts` - Removed admin endpoint
- ✅ `src/server/ai/gemini.ts` - Updated to use settings
- ✅ `devvit.json` - Added settings configuration
- ✅ `GEMINI_API_KEY_SETUP.md` - Updated documentation
- ✅ `.kiro/specs/gemini-analysis/tasks.md` - Updated task
- ✅ `.kiro/specs/gemini-analysis/design.md` - Updated design

## No Breaking Changes

The analysis endpoint (`/api/analyze`) remains unchanged. Only the configuration method changed.
