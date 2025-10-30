# Production Release Checklist

## Pre-Release (Do These First)

### Assets
- [ ] Convert `assets/icon.svg` to `assets/default-icon.png` (512x512)
  - Use: https://cloudconvert.com/svg-to-png
  - Or follow SPLASH_ASSETS_GUIDE.md
- [ ] Convert `assets/splash.svg` to `assets/default-splash.png` (1200x630)
- [ ] Verify both PNG files are under 1MB
- [ ] Test splash screen looks good

### Testing
- [ ] Upload document from desktop ✅
- [ ] View document on mobile ✅
- [ ] Delete document ✅
- [ ] Open full size image ✅
- [ ] Test with max 20 documents
- [ ] Test with 500KB image
- [ ] Verify mobile warning shows
- [ ] Verify download instructions show

### Code Quality
- [ ] Run `npm run check` (lint + prettier)
- [ ] No console.error in production code
- [ ] All TypeScript errors resolved
- [ ] Version updated to 1.0.0 ✅

## Deployment Steps

### 1. Build
```bash
npm run build
```
Expected output: Client and server built successfully

### 2. Deploy
```bash
npm run deploy
```
Expected output: "App uploaded successfully"

### 3. Test on Subreddit
- [ ] Visit r/ocrdocs_dev
- [ ] Create new post via mod menu
- [ ] Verify splash screen appears
- [ ] Click "Open Manager"
- [ ] Upload test document
- [ ] Verify it saves and displays

### 4. Mobile Test
- [ ] Open on mobile browser
- [ ] Verify warning message shows
- [ ] Verify can view documents
- [ ] Verify can delete documents
- [ ] Verify cannot upload (expected)

## Optional: Publish for Review

Only if you want the app public:

```bash
npm run launch
```

- [ ] Submitted for review
- [ ] Received confirmation email
- [ ] Approved by Reddit (wait 1-3 days)

## Post-Deployment

### Monitor
```bash
npx devvit logs r/ocrdocs_dev --since 1h
```

- [ ] No errors in logs
- [ ] App responding correctly
- [ ] Users can access

### Documentation
- [ ] README.md is clear
- [ ] LIMITATIONS.md explains restrictions
- [ ] USER_GUIDE.md helps users

## Success Criteria

✅ App builds without errors
✅ Deploys successfully
✅ Splash screen displays
✅ Desktop upload works
✅ Mobile viewing works
✅ Documents persist in Redis
✅ Delete functionality works
✅ No critical errors in logs

## If Something Goes Wrong

### Build Fails
```bash
rm -rf dist node_modules
npm install
npm run build
```

### Deploy Fails
```bash
npx devvit login
npm run deploy
```

### App Not Working
```bash
# Check logs
npx devvit logs r/ocrdocs_dev

# Rollback if needed
npx devvit versions
npx devvit rollback <previous-version>
```

## Final Sign-Off

- [ ] All tests passing
- [ ] Deployed successfully
- [ ] Tested on production
- [ ] No critical issues
- [ ] Ready for users

**Deployed by:** _________________
**Date:** _________________
**Version:** 1.0.0
**Status:** ⬜ Success  ⬜ Issues Found

## Notes

_Add any deployment notes here_

---

**Next Steps:**
1. Monitor logs for 24 hours
2. Gather user feedback
3. Plan v1.1.0 improvements
