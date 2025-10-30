# External Storage Setup Guide

## Overview

This guide explains how to configure external storage (AWS S3 or PostgreSQL) for PDF document storage in your Devvit Document Manager app.

## Important: Devvit Configuration Storage

**Devvit does not support environment variables in production.** Instead, configuration must be stored in Redis using the built-in Redis client.

## HTTP Fetch Configuration

Your app is already configured to make fetch requests to external storage providers in `devvit.json`:

```json
"http": {
  "fetch": {
    "enabled": true,
    "domains": [
      "s3.amazonaws.com",
      "*.s3.amazonaws.com",
      "*.neon.tech"
    ]
  }
}
```

### Globally Allow-Listed Domains

Devvit has pre-approved these domains for all apps:
- **AWS S3**: `s3.amazonaws.com` and all regional endpoints (`*.s3.amazonaws.com`)
- **Neon PostgreSQL**: All Neon database endpoints (`*.neon.tech`)

### Adding Custom Domains

If you need to use other services (e.g., different PostgreSQL providers, custom APIs):

1. Add the domain to `devvit.json`:
   ```json
   "domains": [
     "s3.amazonaws.com",
     "*.s3.amazonaws.com",
     "*.neon.tech",
     "your-custom-domain.com"
   ]
   ```

2. Submit your app for review - Reddit's Devvit team will review and approve the domain

3. For more information: https://developers.reddit.com/docs/capabilities/server/http-fetch

## Setup Instructions

### Step 1: Choose Your Storage Provider

You can use either AWS S3 or PostgreSQL (Neon recommended):

- **AWS S3**: Best for production, scalable, pay-per-use (~$1-5/month for typical usage)
- **PostgreSQL (Neon)**: Free tier available, good for testing and small deployments

### Step 2: Get Your Credentials

#### For AWS S3:

1. Create an AWS account at https://aws.amazon.com
2. Create an S3 bucket:
   - Go to S3 console
   - Click "Create bucket"
   - Choose a unique name (e.g., `devvit-ocr-docs`)
   - Select region (e.g., `us-east-1`)
   - Keep default settings (private bucket)
3. Create IAM credentials:
   - Go to IAM console
   - Create new user with programmatic access
   - Attach policy: `AmazonS3FullAccess` (or create custom policy with PutObject, GetObject, DeleteObject)
   - Save the Access Key ID and Secret Access Key

#### For PostgreSQL (Neon):

1. Create a Neon account at https://neon.tech
2. Create a new project
3. Copy the connection string (looks like: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname`)
4. Note your app's base URL (will be provided by Reddit after deployment)

### Step 3: Configure Your App

#### Option A: One-Time Setup Endpoint (Recommended)

1. Update `src/server/setup-config.ts` with your actual credentials:

```typescript
const config: AppConfig = {
  storageProvider: 's3', // or 'postgresql'
  
  // AWS S3 Configuration
  awsRegion: 'us-east-1',
  awsAccessKeyId: 'YOUR_ACTUAL_ACCESS_KEY',
  awsSecretAccessKey: 'YOUR_ACTUAL_SECRET_KEY',
  awsS3Bucket: 'your-bucket-name',
  
  // OR PostgreSQL Configuration
  // postgresqlConnectionString: 'postgresql://user:pass@host:5432/dbname',
  // postgresqlSsl: true,
  // serverBaseUrl: 'https://your-app.reddit.com',
  
  maxFileSizeMB: 10,
};
```

2. Add this endpoint to your server (`src/server/index.ts`):

```typescript
import { setupConfiguration } from './setup-config.js';

// Add this endpoint (protect it or remove after first use)
router.post('/api/setup-config', async (_req, res) => {
  try {
    await setupConfiguration(redis);
    res.json({ status: 'success', message: 'Configuration saved' });
  } catch (error) {
    console.error('Setup failed:', error);
    res.status(500).json({ status: 'error', message: 'Setup failed' });
  }
});
```

3. Deploy your app: `npm run deploy`

4. Call the setup endpoint once:
   ```bash
   curl -X POST https://your-app.reddit.com/api/setup-config
   ```

5. **Delete `src/server/setup-config.ts` after setup** to remove credentials from code

#### Option B: Manual Redis Setup (Advanced)

If you have direct Redis access during development:

```typescript
import { setConfig } from './config.js';

await setConfig(redis, {
  storageProvider: 's3',
  awsRegion: 'us-east-1',
  awsAccessKeyId: 'YOUR_KEY',
  awsSecretAccessKey: 'YOUR_SECRET',
  awsS3Bucket: 'your-bucket',
  maxFileSizeMB: 10,
});
```

### Step 4: Update Your Server Code

Modify your document upload endpoint to use the Redis-based configuration:

```typescript
import { getConfig } from './config.js';
import { StorageFactory } from './storage/StorageFactory.js';

router.post('/api/documents/add', async (req, res) => {
  // Load configuration from Redis
  const config = await getConfig(redis);
  
  // Get storage adapter with configuration
  const storage = StorageFactory.getAdapter(config);
  
  // Use storage adapter for uploads
  const result = await storage.upload(buffer, metadata);
  
  // ... rest of your code
});
```

### Step 5: Initialize PostgreSQL Schema (PostgreSQL Only)

If using PostgreSQL, initialize the database schema:

```typescript
import { PostgreSQLStorageAdapter } from './storage/PostgreSQLStorageAdapter.js';

// After getting the adapter
if (config.storageProvider === 'postgresql') {
  const pgAdapter = storage as PostgreSQLStorageAdapter;
  await pgAdapter.initializeSchema();
}
```

## Local Development

For local development with `npm run dev`, you can still use environment variables:

1. Create `.env` file:
   ```bash
   STORAGE_PROVIDER=s3
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   AWS_S3_BUCKET=your_bucket
   ```

2. The storage adapters will fall back to environment variables if no config is provided

## Security Best Practices

1. **Never commit credentials to Git**
   - Add `.env` to `.gitignore` (already done)
   - Delete `setup-config.ts` after initial setup

2. **Use IAM roles when possible**
   - For AWS, use minimal permissions (PutObject, GetObject, DeleteObject only)
   - Scope permissions to specific bucket

3. **Rotate credentials regularly**
   - Update credentials in Redis using the setup endpoint
   - Invalidate old credentials in AWS/Neon

4. **Monitor usage**
   - Check AWS CloudWatch or Neon dashboard for unusual activity
   - Set up billing alerts

## Troubleshooting

### "Storage provider not properly configured"

- Check that configuration is saved in Redis
- Verify credentials are correct
- Check Redis key: `app:config`

### "Failed to upload to S3"

- Verify AWS credentials are valid
- Check bucket name is correct
- Ensure bucket is in the correct region
- Check IAM permissions include PutObject

### "Failed to connect to PostgreSQL"

- Verify connection string is correct
- Check SSL setting matches your database
- Ensure database is accessible (not behind firewall)
- Verify Neon project is active

### "Domain not whitelisted"

- Check `devvit.json` includes the domain
- For custom domains, submit app for review
- Wait for Reddit approval

## Cost Estimates

### AWS S3 (Typical Usage)

- Storage: $0.023 per GB/month
- PUT requests: $0.005 per 1,000 requests
- GET requests: $0.0004 per 1,000 requests

**Example**: 1,000 users, 10 PDFs each (5MB avg)
- Storage: 50GB × $0.023 = $1.15/month
- Requests: ~10,000 × $0.005 = $0.05/month
- **Total: ~$1.20/month**

### PostgreSQL (Neon)

- **Free tier**: 0.5GB storage, 100 hours compute/month
- **Pro tier**: $19/month (3GB storage, unlimited compute)

**Recommendation**: Start with Neon free tier for testing, move to S3 for production scale.

## Next Steps

1. Choose your storage provider
2. Get credentials
3. Configure your app using the setup endpoint
4. Test with a PDF upload
5. Monitor usage and costs
6. Scale as needed

## Support

- Devvit Documentation: https://developers.reddit.com/docs
- AWS S3 Documentation: https://docs.aws.amazon.com/s3/
- Neon Documentation: https://neon.tech/docs
- Reddit Developer Discord: https://discord.com/invite/R7yu2wh9Qz
