# Gemini API Key Setup Guide

## Overview

The Gemini API key is stored using Devvit's built-in settings system. This is the recommended approach for managing sensitive configuration in Devvit apps.

---

## Step 1: Get Your Gemini API Key

### Option A: Google AI Studio (Recommended - Free Tier)

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key (starts with `AIza...`)

### Option B: Google Cloud Console (For Production)

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable the **"Generative Language API"**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy the key

**Pricing:**
- **Free tier**: 15 requests/minute, 1,500 requests/day
- **Paid tier**: $0.075 per 1M input tokens, $0.30 per 1M output tokens

---

## Step 2: Set the API Key Using Devvit CLI

### Using Devvit Settings Command (Recommended)

The easiest way to set the API key is using the Devvit CLI:

```bash
# Set the API key for your app
npx devvit settings set apiKey

# You'll be prompted to enter the key securely
# Or provide it directly:
npx devvit settings set apiKey "AIza...your-key-here"
```

**Benefits:**
- ✅ Secure: Key is encrypted and stored securely by Devvit
- ✅ Simple: No custom endpoints needed
- ✅ Standard: Follows Devvit platform conventions
- ✅ Persistent: Survives deployments and updates

### Verify the Key is Set

```bash
# List all settings (values are hidden for security)
npx devvit settings list

# Output:
# apiKey: ********** (set)
```

---

## Step 3: Test the Integration

### Test with Analysis Endpoint

```bash
# Try analyzing a document
curl -X POST https://your-app.reddit.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "fileData": "data:image/png;base64,...",
    "fileType": "image/png",
    "fileName": "test.png"
  }'

# If key is not set, you'll get:
{
  "error": "Gemini API key not configured. Run: npx devvit settings set apiKey"
}
```

---

## How the Analysis Endpoint Uses the Key

**In `src/server/ai/gemini.ts`:**

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { settings } from '@devvit/web/server';

export async function analyzeDocument(
  fileData: string,
  fileType: string
): Promise<{ description: string; summary: string }> {
  
  // Retrieve API key from Devvit settings
  const apiKey = await settings.get('apiKey');
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured. Run: npx devvit settings set apiKey');
  }

  // Initialize Gemini client with the key
  const genAI = new GoogleGenerativeAI(apiKey as string);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Make API call
  const result = await model.generateContent([prompt, filePart]);
  
  return parseResponse(result);
}
```

## Configuration in devvit.json

The settings are defined in `devvit.json`:

```json
{
  "settings": [
    {
      "type": "string",
      "name": "apiKey",
      "label": "Gemini API Key",
      "helpText": "Your Google Gemini API key for document analysis",
      "isSecret": true
    }
  ]
}
```

---

## Security Considerations

### ✅ Good Practices

1. **Encrypted storage**: Devvit settings are encrypted and stored securely
2. **Moderator-only access**: Only app developers/moderators can set settings via CLI
3. **No client exposure**: Key never sent to client, only used server-side
4. **Persistent**: Key survives deployments and updates
5. **Platform standard**: Uses Devvit's recommended approach for secrets

### ⚠️ Important Notes

1. **Shared key**: All users of the app share the same API key
2. **Rate limiting**: Implement per-user rate limits to prevent abuse
3. **CLI access required**: Must have Devvit CLI access to set/update the key

---

## Troubleshooting

### "Gemini API key not configured"

**Problem**: The key hasn't been set via Devvit settings yet.

**Solution**: 
1. Get a Gemini API key from Google AI Studio
2. Run `npx devvit settings set apiKey` in your project directory
3. Test the analysis endpoint

### Analysis fails with "API key invalid"

**Problem**: The key is set but doesn't work.

**Solution**: 
1. Verify the key is correct in Google AI Studio
2. Check if the Generative Language API is enabled in your Google Cloud project
3. Verify you haven't exceeded rate limits (15 req/min on free tier)
4. Try generating a new API key
5. Check the server logs for detailed error messages

---

## Summary

**Setup Flow:**
1. Get Gemini API key from Google AI Studio
2. Add settings configuration to `devvit.json`
3. Run `npx devvit settings set apiKey` to set the key
4. Deploy the app
5. Analysis endpoint automatically uses the key from Devvit settings

**Key Storage:**
- Stored via Devvit settings system (encrypted)
- Setting name: `apiKey`
- Accessible only server-side via `settings.get('apiKey')`
- Persists across deployments

**Why This Works:**
- Uses Devvit's built-in secrets management
- No custom endpoints needed
- Follows platform best practices
- Secure and simple to manage
