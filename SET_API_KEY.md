# Set Gemini API Key

The API key needs to be stored in Redis. Use this command during development:

```bash
# Start dev environment
npm run dev

# In browser console on the playtest page:
fetch('/api/admin/set-key', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: 'config:gemini_api_key',
    value: 'YOUR_API_KEY_HERE'
  })
})
```

Or add this temporary endpoint to `src/server/index.ts`:

```typescript
router.post('/api/admin/set-key', async (req, res) => {
  const { key, value } = req.body;
  await redis.set(key, value);
  res.json({ success: true });
});
```

Then call it once to set the key, and remove the endpoint.

