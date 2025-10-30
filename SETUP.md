# Setup Guide - OCR Document Manager for Reddit

## Prerequisites

- Node.js 22.2.0 or higher
- npm or yarn
- Reddit account
- Google AI Studio API key (free tier available)

## Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd ocrdocs
npm install
```

### 2. Get a Gemini API Key

1. Go to https://aistudio.google.com/apikey
2. Click "Create API Key"
3. Copy the generated key

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
DEVVIT_SUBREDDIT=r/your_test_subreddit
STORAGE_PROVIDER=redis
GEMINI_API_KEY=your_api_key_here
```

**Important:** Never commit your `.env` file to git. It's already in `.gitignore`.

### 4. Login to Devvit

```bash
npm run login
```

Follow the prompts to authenticate with your Reddit account.

### 5. Build the App

```bash
npm run build
```

### 6. Deploy to Reddit

```bash
npm run deploy
```

### 7. Set the API Key in Redis

After deployment, you need to set the API key in Redis for each subreddit:

1. Install the app to your test subreddit
2. Create a post using the mod menu
3. Open the post and open browser console (F12)
4. Run this command:

```javascript
fetch('/api/temp-set-key', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

This will read the API key from your environment and store it in Redis.

## Development

### Run Development Server

```bash
npm run dev
```

This will:
- Start the client build watcher
- Start the server build watcher
- Start Devvit playtest on your test subreddit

### Project Structure

```
src/
├── client/          # React frontend
│   ├── components/  # UI components
│   └── public/      # Static assets (splash screen, icons)
├── server/          # Express backend
│   ├── ai/          # Gemini AI integration
│   ├── core/        # Post creation logic
│   └── storage/     # Storage adapters (Redis, S3, PostgreSQL)
└── shared/          # Shared types
```

## Features

- ✅ Upload images and PDFs (up to 500KB)
- ✅ AI-powered document analysis using Gemini 2.5 Flash
- ✅ Auto-generate descriptions and summaries
- ✅ Store up to 20 documents per post
- ✅ 7-day caching for AI results
- ✅ Rate limiting (100 requests/day per user)
- ✅ Mobile-friendly interface

## Configuration

### Storage Options

The app uses Redis by default (built into Devvit). External storage options (S3, PostgreSQL) are available but not recommended due to Devvit limitations.

### AI Model Settings

Edit `src/server/ai/gemini.ts` to adjust:
- Model: `gemini-2.5-flash` (default)
- Temperature: `0.4` (lower = more consistent)
- Max tokens: `1000` (response length limit)

### Rate Limiting

Edit `src/server/index.ts` to adjust the rate limit:
```typescript
const RATE_LIMIT = 100; // requests per day per user
```

## Deployment to Production

### 1. Build and Upload

```bash
npm run build
npx devvit upload
```

### 2. Publish for Review

```bash
npm run launch
```

This submits your app to Reddit for review. Apps installed on subreddits with >200 members require approval.

### 3. Install to Subreddit

After approval:
1. Go to your subreddit
2. Mod Tools → Apps → Install App
3. Select "OCR Document Manager"
4. Create a post using the mod menu

### 4. Set API Key

Don't forget to set the Gemini API key in Redis for each subreddit (see step 7 above).

## Troubleshooting

### "API key not configured" Error

The API key needs to be set in Redis. Run the `/api/temp-set-key` endpoint as described in step 7.

### Build Failures

Devvit builds can be inconsistent. If a build fails:
1. Try running `npm run build` again
2. Check that Node.js version is 22.2.0+
3. Clear `dist/` folder and rebuild

### Analysis Not Working

1. Check that the API key is valid at https://aistudio.google.com/apikey
2. Verify the key is set in Redis
3. Check browser console for errors
4. Check Devvit logs: `npx devvit logs r/your_subreddit --since 15m`

## Security Notes

⚠️ **Never commit API keys to git!**

- API keys should only be in `.env` (which is gitignored)
- The code now reads from environment variables
- Set keys in Redis after deployment using the temp endpoint

## Cost Estimates

Gemini 2.5 Flash pricing:
- Free tier: 15 requests/minute
- Paid: ~$0.0002 per analysis
- With 100 requests/day: ~$0.60/month
- 7-day caching reduces costs significantly

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with `npm run dev`
5. Submit a pull request

## License

BSD-3-Clause

## Support

For issues and questions:
- Check the [Development Journey](DEVELOPMENT_JOURNEY.md) for common problems
- Open an issue on GitHub
- See Reddit Devvit docs: https://developers.reddit.com/docs

## Credits

Built with:
- React & TypeScript
- Devvit (Reddit's developer platform)
- Google Gemini AI
- Tailwind CSS

Developed during the AWS AI Agent Hackathon and ported to Reddit Devvit.
