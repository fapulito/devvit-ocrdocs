# Quick Setup - Gemini API Key

## Steps

1. **Upload the app first** (settings need to be registered):
```bash
npx devvit upload
```

2. **Then set the API key**:
```bash
npx devvit settings set apiKey
```

When prompted, enter: `AIzaSyD6eIn0o6DH2yGD6GRqPzznN_D6rp4vpMI`

3. **Done!** The key is now stored and the app will use it.

## How It Works

- `Devvit.addSettings()` in `src/server/index.ts` registers the setting
- After upload, the setting becomes available
- CLI command stores it securely
- Code reads it from Redis at `config:gemini_api_key`
