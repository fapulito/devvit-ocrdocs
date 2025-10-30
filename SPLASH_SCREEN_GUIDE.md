# Splash Screen Asset Guide for Devvit Web Apps

## The Problem

Devvit's splash screen is a pain in the ass because:
- It ONLY accepts PNG files (no SVG, no JPEG)
- You need to configure it in TWO places
- The documentation doesn't make this clear
- If you fuck it up, you get the default Snoo icon

## Required Files

You need TWO PNG files in `src/client/public/`:

1. **Splash background** - The main background image
   - Recommended size: 1200x630px or larger
   - Format: PNG only
   - Example: `splash.png`

2. **App icon** - Small icon shown on the splash screen
   - Recommended size: 256x256px or 512x512px
   - Format: PNG only
   - Example: `icon.png` or `ocricon_adobe_reddit.png`

## Configuration (Two Places!)

### 1. devvit.json

This is the static configuration used by the Devvit platform:

```json
{
  "post": {
    "dir": "dist/client",
    "entrypoints": {
      "default": {
        "entry": "index.html",
        "splash": "splash.png",
        "icon": "ocricon_adobe_reddit.png"
      }
    }
  }
}
```

### 2. src/server/core/post.ts

This is the runtime configuration when creating posts programmatically:

```typescript
return await reddit.submitCustomPost({
  splash: {
    backgroundUri: 'splash.png',
    buttonLabel: 'Launch App',
    description: 'Your app description here',
    heading: 'Your App Heading',
    appIconUri: 'ocricon_adobe_reddit.png',
  },
  // ... rest of config
});
```

**IMPORTANT:** The file names in both places MUST match exactly.

## Common Mistakes

### ❌ Using SVG files
```json
"splash": "splash.svg"  // WRONG - will show default Snoo
```

### ❌ Mismatched file names
```json
// devvit.json
"splash": "splash.png"

// post.ts
backgroundUri: 'background.png'  // WRONG - doesn't match
```

### ❌ Files not in public folder
If your PNG files are in `src/client/assets/` instead of `src/client/public/`, they won't be copied to the build output.

### ❌ Not rebuilding after adding files
You added the PNG files but forgot to run `npm run build`. The files need to be in `dist/client/` after build.

## The Correct Workflow

1. **Create your PNG files** (use Photoshop, Figma, whatever)
   - `splash.png` - background image
   - `icon.png` - app icon

2. **Put them in `src/client/public/`**
   ```
   src/client/public/
   ├── splash.png
   └── icon.png
   ```

3. **Update devvit.json**
   ```json
   "splash": "splash.png",
   "icon": "icon.png"
   ```

4. **Update src/server/core/post.ts**
   ```typescript
   splash: {
     backgroundUri: 'splash.png',
     appIconUri: 'icon.png',
     // ... other config
   }
   ```

5. **Rebuild**
   ```bash
   npm run build
   ```

6. **Verify files are in dist/client/**
   ```bash
   ls dist/client/
   # Should show splash.png and icon.png
   ```

7. **Upload to Reddit**
   ```bash
   npx devvit upload
   ```

8. **Create a new post** to see the updated splash screen

## Text Overlay Issues

If text is overlapping on your splash screen:

- **Remove `appDisplayName`** - This adds extra text that can overlap
- **Keep `heading` short** - Long headings get cut off
- **Keep `description` concise** - Max 2 lines recommended
- **Design your background with text in mind** - Leave space for Reddit's text overlay

## Debugging

If you still see the default Snoo:

1. Check `dist/client/` - Are your PNG files there?
2. Check devvit.json - Do the file names match exactly?
3. Check post.ts - Do the file names match exactly?
4. Did you rebuild after making changes?
5. Did you create a NEW post after uploading? (Old posts keep old splash screens)

## Pro Tips

- Use a dark background with light text for better readability
- Keep important content in the center - edges may be cropped on mobile
- Test on both desktop and mobile
- The splash screen is cached - create a new post to see changes
- Don't use `appDisplayName` unless you really need it - it causes text overlap

## Example Working Configuration

**src/client/public/**
```
splash.png (1200x630px)
icon.png (512x512px)
```

**devvit.json**
```json
{
  "post": {
    "dir": "dist/client",
    "entrypoints": {
      "default": {
        "entry": "index.html",
        "splash": "splash.png",
        "icon": "icon.png"
      }
    }
  }
}
```

**src/server/core/post.ts**
```typescript
return await reddit.submitCustomPost({
  splash: {
    backgroundUri: 'splash.png',
    buttonLabel: 'Launch App',
    description: 'Upload and manage your documents',
    heading: 'Document Manager',
    appIconUri: 'icon.png',
  },
  subredditName: subredditName,
  title: 'Document Manager',
});
```

Now rebuild, upload, and create a new post. It should work correctly.
