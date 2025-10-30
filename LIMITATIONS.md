# Document Manager - Platform Limitations

## Reddit Webview Sandbox Restrictions

Reddit's Devvit apps run in a **sandboxed iframe** with strict security policies. This creates fundamental limitations that cannot be bypassed.

### What Doesn't Work

#### ❌ File Uploads on Mobile
- **Issue**: `<input type="file">` is blocked in Reddit's mobile webview
- **Error**: Silent failure - file picker doesn't open
- **Reason**: Reddit app's sandbox doesn't allow file system access
- **Workaround**: **Use desktop browser** to upload documents

#### ❌ Direct Downloads
- **Issue**: Download attribute is blocked
- **Error**: "Download is disallowed. The frame is sandboxed, but the flag 'allow-downloads' is not set"
- **Reason**: Reddit's iframe sandbox policy
- **Workaround**: 
  - Right-click image → "Save image as..."
  - Or open image in new tab → save from there

#### ❌ Camera Access
- **Issue**: `capture="environment"` attribute doesn't work
- **Reason**: Camera API blocked in sandbox
- **Workaround**: Take photo with camera app, then upload from gallery (desktop only)

### What Works

#### ✅ Desktop Upload
- File uploads work perfectly on **desktop browsers**
- Chrome, Firefox, Safari, Edge all supported
- Drag-and-drop would also be blocked (same sandbox)

#### ✅ View Documents
- All uploaded documents viewable on any device
- Images display properly
- Metadata (description, notes) accessible

#### ✅ Delete Documents
- Works on both mobile and desktop
- Confirmation modal works properly

#### ✅ Open Full Size
- Opens image in new tab/window
- From there, users can save manually

## Recommended User Flow

### For Desktop Users
1. ✅ Upload documents
2. ✅ Add descriptions and notes
3. ✅ View all documents
4. ✅ Right-click to save images
5. ✅ Delete unwanted documents

### For Mobile Users
1. ✅ View documents uploaded from desktop
2. ✅ Read descriptions and notes
3. ✅ Open images full size
4. ✅ Delete documents
5. ❌ Cannot upload new documents

## Alternative Solutions

### Option 1: Accept Limitations (Current)
- **Pro**: Simple, works within Reddit's constraints
- **Con**: Mobile upload not possible
- **Best for**: Desktop-primary workflows

### Option 2: External Upload Service
Create a separate web app outside Reddit:
- Users upload to external site
- External site syncs to Devvit via API
- Requires:
  - Separate hosting (Vercel, Netlify, etc.)
  - API endpoint in Devvit
  - Domain whitelisting from Reddit
  - More complex architecture

### Option 3: Reddit Native Upload
Use Reddit's image hosting:
- Upload images as Reddit posts/comments
- Store references in Redis
- Requires:
  - Different UX (posts instead of direct upload)
  - Reddit API integration
  - Public visibility (unless private subreddit)

### Option 4: Text-Only Mode
Remove images entirely:
- Users type/paste text content
- No file uploads needed
- Works everywhere
- Loses document scanning functionality

## Technical Details

### Sandbox Attributes
Reddit's iframe likely has:
```html
<iframe sandbox="allow-scripts allow-same-origin">
```

Missing attributes that would enable features:
- `allow-downloads` - Would enable downloads
- `allow-forms` - Might help with file inputs
- `allow-popups` - Would help with new windows

### Why We Can't Fix It
- Sandbox attributes are set by Reddit (parent page)
- Apps running inside iframe cannot modify them
- This is intentional security design
- Prevents malicious apps from accessing user files

### Browser Differences
- **Desktop Chrome/Firefox**: File uploads work
- **Mobile Chrome/Firefox**: File uploads blocked
- **Reddit Mobile App**: Most restricted (uses webview)
- **Mobile Safari**: Sometimes works, often doesn't

## User Communication

### In-App Messages
We've added warning messages:
- Yellow banner on mobile upload screen
- Info box on download screen
- Explains limitations clearly

### Documentation
- README updated with limitations
- USER_GUIDE explains desktop-only upload
- This LIMITATIONS.md for developers

## Comparison with Other Platforms

### What Other Platforms Allow
- **Standalone web apps**: Full file access
- **Browser extensions**: Full file access
- **Native mobile apps**: Full file access
- **Electron apps**: Full file access

### Reddit Devvit Constraints
- Sandboxed iframe (most restrictive)
- No native mobile app option
- No browser extension option
- Must work within sandbox

## Recommendations

### For Users
1. **Upload from desktop** - Most reliable
2. **View on any device** - Works everywhere
3. **Use right-click to save** - Workaround for downloads
4. **Keep important docs backed up** - Export metadata regularly

### For Developers
1. **Set expectations early** - Document limitations
2. **Provide workarounds** - Right-click, open in new tab
3. **Focus on what works** - Viewing, organizing, searching
4. **Consider alternatives** - External services if needed

## Future Possibilities

### If Reddit Adds Features
- `allow-downloads` flag → Downloads would work
- File API access → Mobile uploads would work
- Camera API → Direct photo capture would work

### Current Status (2025)
- No indication Reddit will change sandbox policy
- Security is priority over convenience
- Unlikely to change soon

## Conclusion

**Document Manager works best as a desktop-upload, cross-device-view solution.**

Mobile users can:
- ✅ View all documents
- ✅ Read descriptions/notes
- ✅ Delete documents
- ✅ Open images full size
- ❌ Cannot upload new documents
- ⚠️ Downloads require workaround

This is a **platform limitation**, not a bug. The app works as well as possible within Reddit's security constraints.
