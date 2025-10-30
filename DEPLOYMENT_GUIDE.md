# Document Manager - Production Deployment Guide

## Pre-Deployment Checklist

### 1. Convert Splash Screen Assets
✅ **Convert SVG to PNG** (see SPLASH_ASSETS_GUIDE.md)
- [ ] Convert `assets/icon.svg` → `assets/default-icon.png` (512x512)
- [ ] Convert `assets/splash.svg` → `assets/default-splash.png` (1200x630)
- [ ] Verify file sizes are under 1MB each

### 2. Final Code Review
- [x] All features working on desktop
- [x] Mobile limitations documented
- [x] Error handling in place
- [x] Console logs removed (or minimal)
- [x] No sensitive data in code

### 3. Test Thoroughly
- [ ] Upload documents (desktop)
- [ ] View documents (mobile & desktop)
- [ ] Delete documents
- [ ] Export functionality
- [ ] Open full size images
- [ ] Test with different image sizes
- [ ] Test with 20 documents (limit)

### 4. Update Version
- [ ] Increment version in `package.json` (currently 0.2.4)
- [ ] Consider using semantic versioning for production (e.g., 1.0.0)

### 5. Documentation
- [x] README.md updated
- [x] USER_GUIDE.md created
- [x] LIMITATIONS.md documented
- [ ] Add screenshots to README (optional)

## Deployment Commands

### Step 1: Build the App
```bash
npm run build
```

This compiles both client and server code to the `dist` folder.

### Step 2: Upload to Reddit
```bash
npm run deploy
```

Or manually:
```bash
npx devvit upload
```

**What this does:**
- Uploads your app to Reddit's servers
- Creates a new version
- Makes it available for installation (private)

**Output:**
```
✓ App uploaded successfully
Version: 0.2.4
App ID: ocrdocs
```

### Step 3: Test in Production Environment
1. Install on your test subreddit
2. Create a post using the moderator menu
3. Test all functionality
4. Verify splash screen appears correctly
5. Test on both desktop and mobile

### Step 4: Publish for Review (Optional)
If you want to make your app public:

```bash
npm run launch
```

Or manually:
```bash
npm run build
npm run deploy
npx devvit publish
```

**What this does:**
- Submits app for Reddit review
- Required for subreddits with >200 members
- Review typically takes 1-3 days

## Version Management

### Semantic Versioning
Use this format: `MAJOR.MINOR.PATCH`

**Examples:**
- `1.0.0` - First production release
- `1.0.1` - Bug fix
- `1.1.0` - New feature (backwards compatible)
- `2.0.0` - Breaking changes

### Update Version
Edit `package.json`:
```json
{
  "version": "1.0.0"
}
```

## Installation Process

### For Your Subreddit
1. Go to your subreddit
2. Mod Tools → Apps
3. Find "Document Manager" (ocrdocs)
4. Click "Install"
5. Grant required permissions

### For Other Subreddits
After publishing:
1. Share app link: `https://developers.reddit.com/apps/ocrdocs`
2. Moderators can install from Reddit's app directory
3. Or search "Document Manager" in app marketplace

## Post-Deployment

### Monitor Usage
- Check Reddit Developer Portal for analytics
- Monitor error logs: `npx devvit logs r/your_subreddit`
- Watch for user feedback

### View Logs
```bash
# Real-time logs
npx devvit logs r/ocrdocs_dev

# Last 15 minutes
npx devvit logs r/ocrdocs_dev --since 15m

# Specific app
npx devvit logs r/ocrdocs_dev --app ocrdocs
```

### Update Existing Installation
When you deploy a new version:
1. Run `npm run deploy`
2. Existing installations auto-update
3. No need to reinstall

## Rollback

If something goes wrong:
```bash
# List versions
npx devvit versions

# Rollback to previous version
npx devvit rollback <version>
```

## Production Checklist

### Before First Deploy
- [ ] Convert splash assets to PNG
- [ ] Test on desktop browser
- [ ] Test on mobile browser
- [ ] Update version to 1.0.0
- [ ] Remove any test/debug code
- [ ] Verify .env is in .gitignore

### Deploy Commands
```bash
# 1. Build
npm run build

# 2. Deploy
npm run deploy

# 3. Test on your subreddit
# Visit: https://reddit.com/r/ocrdocs_dev

# 4. If ready for public, publish
npm run launch
```

### After Deploy
- [ ] Test installation on subreddit
- [ ] Create test post
- [ ] Upload test document
- [ ] Verify splash screen
- [ ] Test on mobile
- [ ] Monitor logs for errors

## Common Issues

### Issue: "App name already exists"
**Solution:** You cannot change the app name. It's permanently "ocrdocs"

### Issue: "Version already exists"
**Solution:** Increment version in package.json

### Issue: "Build failed"
**Solution:** 
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Issue: "Upload failed"
**Solution:**
```bash
# Re-authenticate
npx devvit login
npm run deploy
```

### Issue: "Splash screen not showing"
**Solution:** 
- Verify PNG files exist in `assets/` folder
- Check file sizes (must be under 1MB)
- Create a new post (old posts keep old splash)

## Publishing for Review

### Requirements
- App must be functional
- No malicious code
- Follows Reddit's content policy
- Clear description of functionality

### Submission
```bash
npm run launch
```

### Review Process
1. Submit via `npx devvit publish`
2. Reddit reviews (1-3 days)
3. Email notification when approved
4. App appears in marketplace

### What Reddit Checks
- Code quality
- Security
- User experience
- Content policy compliance
- Performance

## Maintenance

### Regular Updates
```bash
# 1. Make changes
# 2. Update version
# 3. Build and deploy
npm run build
npm run deploy
```

### Monitor Health
```bash
# Check logs
npx devvit logs r/your_subreddit --since 1h

# Check installations
# Visit: https://developers.reddit.com/apps/ocrdocs
```

## Support

### Resources
- [Devvit Documentation](https://developers.reddit.com/docs)
- [r/Devvit](https://reddit.com/r/Devvit) - Community support
- [Discord](https://discord.com/invite/R7yu2wh9Qz) - Developer chat

### Getting Help
1. Check documentation
2. Search r/Devvit
3. Ask in Discord
4. Contact Reddit support

## Production Environment Variables

### Current Setup
- `OCR_SPACE_API_KEY` - Not used (OCR disabled)
- `DEVVIT_SUBREDDIT` - Test subreddit

### For Production
No environment variables needed! Everything runs on Devvit's infrastructure.

## Final Steps

### Ready to Deploy?
```bash
# 1. Final build
npm run build

# 2. Deploy to production
npm run deploy

# 3. Test thoroughly
# Visit your subreddit and test the app

# 4. If everything works, publish
npm run launch
```

### Success!
Your app is now live on Reddit! 🎉

Monitor logs and user feedback to ensure smooth operation.

## Quick Reference

```bash
# Development
npm run dev              # Local development

# Production
npm run build           # Build for production
npm run deploy          # Upload to Reddit
npm run launch          # Build + Deploy + Publish

# Monitoring
npx devvit logs r/your_subreddit
npx devvit versions
npx devvit rollback <version>

# Authentication
npx devvit login
```

## Next Steps After Deployment

1. **Announce** - Post in your subreddit about the new app
2. **Gather Feedback** - Listen to user suggestions
3. **Iterate** - Make improvements based on feedback
4. **Scale** - Install on other subreddits
5. **Maintain** - Regular updates and bug fixes

Good luck with your production release! 🚀
