# Simple API Key Setup

Your API key: `AIzaSyD6eIn0o6DH2yGD6GRqPzznN_D6rp4vpMI`

## Set it in Redis

Add this temporary endpoint to `src/server/index.ts` after the other routes:

```typescript
// Temporary endpoint to set API key
router.post('/api/set-key', async (req, res) => {
  await redis.set('config:gemini_api_key', 'AIzaSyD6eIn0o6DH2yGD6GRqPzznN_D6rp4vpMI');
  res.json({ success: true, message: 'API key set' });
});
```

Then:
1. Run `npm run dev`
2. Open the playtest URL
3. In browser console: `fetch('/api/set-key', {method: 'POST'}).then(r => r.json()).then(console.log)`
4. Remove the endpoint from code
5. Upload: `npx devvit upload`

Done. The key is now in Redis and will persist.
