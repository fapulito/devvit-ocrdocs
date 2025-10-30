# Syncing Devvit Redis to Neon PostgreSQL

## Architecture

```
Devvit App (Redis) → Your API Server → Neon PostgreSQL
```

## Implementation Steps

### 1. Create API Server (Example: Next.js on Vercel)

**File: `pages/api/sync-document.ts`**
```typescript
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify request is from your Devvit app (use API key)
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.DEVVIT_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { id, fileName, fileType, imageData, description, notes, timestamp, postId, subreddit } = req.body;

    await pool.query(
      `INSERT INTO documents (id, file_name, file_type, image_data, description, notes, timestamp, post_id, subreddit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         description = EXCLUDED.description,
         notes = EXCLUDED.notes`,
      [id, fileName, fileType, imageData, description, notes, new Date(timestamp), postId, subreddit]
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
}
```

**PostgreSQL Schema:**
```sql
CREATE TABLE documents (
  id VARCHAR(255) PRIMARY KEY,
  file_name VARCHAR(500),
  file_type VARCHAR(100),
  image_data TEXT, -- Base64 encoded image
  description TEXT,
  notes TEXT,
  timestamp TIMESTAMP,
  post_id VARCHAR(255),
  subreddit VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_post_id ON documents(post_id);
CREATE INDEX idx_subreddit ON documents(subreddit);
CREATE INDEX idx_timestamp ON documents(timestamp DESC);
```

### 2. Update Devvit App to Sync

**Add to `src/server/index.ts`:**
```typescript
// Add after saving to Redis
const syncToPostgres = async (document: any, postId: string, subreddit: string) => {
  try {
    const response = await fetch('https://your-api.vercel.app/api/sync-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.POSTGRES_SYNC_API_KEY || '',
      },
      body: JSON.stringify({
        ...document,
        postId,
        subreddit,
      }),
    });

    if (!response.ok) {
      console.error('Failed to sync to PostgreSQL:', await response.text());
    }
  } catch (error) {
    console.error('Error syncing to PostgreSQL:', error);
    // Don't fail the request if sync fails
  }
};

// In the /api/documents/add endpoint, after redis.set():
await syncToPostgres(document, postId, context.subredditName || 'unknown');
```

### 3. Update devvit.json

```json
{
  "http": {
    "fetch": {
      "enabled": true,
      "domains": ["your-api.vercel.app"]
    }
  }
}
```

### 4. Add Environment Variables

**In `.env`:**
```
POSTGRES_SYNC_API_KEY=your-secret-key-here
```

**In your API server:**
```
DATABASE_URL=postgresql://user:pass@your-neon-db.neon.tech/dbname
DEVVIT_API_KEY=your-secret-key-here
```

## Option 2: Batch Export (Manual)

If you can't get domain whitelisting, create an export endpoint:

**Add to `src/server/index.ts`:**
```typescript
router.get('/api/documents/export', async (_req, res): Promise<void> => {
  const { postId } = context;
  if (!postId) {
    res.status(400).json({ status: 'error', message: 'postId is required' });
    return;
  }

  try {
    const key = `docs:${postId}:list`;
    const existing = await redis.get(key);
    const documents = existing ? JSON.parse(existing) : [];
    
    // Return as JSON for manual import
    res.json({
      postId,
      subreddit: context.subredditName,
      exportDate: new Date().toISOString(),
      documents,
    });
  } catch (error) {
    console.error('Error exporting documents:', error);
    res.status(500).json({ status: 'error', message: 'Failed to export documents' });
  }
});
```

Then manually call this endpoint and import the JSON into PostgreSQL.

## Option 3: Scheduled Sync (Advanced)

Use Devvit's scheduler to periodically sync data:

```typescript
// In devvit.json
{
  "triggers": {
    "scheduler": [
      {
        "name": "sync-to-postgres",
        "cron": "0 */6 * * *", // Every 6 hours
        "endpoint": "/internal/sync-postgres"
      }
    ]
  }
}
```

## Pros & Cons

### Option 1 (Real-time Webhook)
✅ Real-time sync
✅ Automatic
❌ Requires domain whitelisting
❌ Requires external server

### Option 2 (Manual Export)
✅ No whitelisting needed
✅ Simple
❌ Manual process
❌ Not real-time

### Option 3 (Scheduled)
✅ Automatic
✅ Batch processing
❌ Requires domain whitelisting
❌ Not real-time

## Recommendation

Start with **Option 2 (Manual Export)** for testing, then move to **Option 1 (Webhook)** once you get domain whitelisting from Reddit.

## Neon PostgreSQL Setup

1. Create a Neon account: https://neon.tech
2. Create a new project
3. Run the schema SQL above
4. Get your connection string
5. Use it in your API server

## Cost Considerations

- **Neon Free Tier**: 0.5 GB storage, 100 hours compute/month
- **Vercel Free Tier**: Unlimited API calls (with limits)
- **Total Cost**: $0 for small apps!
