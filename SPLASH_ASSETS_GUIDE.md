# Custom Splash Screen Assets Guide

I've created custom SVG assets for your Document Manager app with a modern, dark theme that matches your app's design.

## Files Created

1. **`assets/icon.svg`** - App icon (512x512)
   - Blue-to-purple gradient background
   - White document with checkmark
   - Modern, clean design

2. **`assets/splash.svg`** - Splash screen background (1200x630)
   - Dark gradient background matching app theme
   - Centered icon and text
   - Feature badges (Secure Storage, Cross-Device, Fast Access)
   - Subtle glow effects and grid pattern

## Converting SVG to PNG

You need to convert these SVGs to PNG format. Here are your options:

### Option 1: Online Converter (Easiest)
1. Go to https://cloudconvert.com/svg-to-png
2. Upload `assets/icon.svg`
3. Set dimensions to **512x512**
4. Download as `default-icon.png`
5. Repeat for `assets/splash.svg` with dimensions **1200x630**
6. Save as `default-splash.png`
7. Replace the existing files in the `assets` folder

### Option 2: Using Inkscape (Free Desktop App)
```bash
# Install Inkscape from https://inkscape.org/

# Convert icon
inkscape assets/icon.svg --export-filename=assets/default-icon.png --export-width=512 --export-height=512

# Convert splash
inkscape assets/splash.svg --export-filename=assets/default-splash.png --export-width=1200 --export-height=630
```

### Option 3: Using ImageMagick (Command Line)
```bash
# Install ImageMagick from https://imagemagick.org/

# Convert icon
magick convert -density 300 -background none assets/icon.svg -resize 512x512 assets/default-icon.png

# Convert splash
magick convert -density 300 -background none assets/splash.svg -resize 1200x630 assets/default-splash.png
```

### Option 4: Using Node.js (Automated)
```bash
# Install sharp
npm install --save-dev sharp

# Create convert script
node -e "
const sharp = require('sharp');
const fs = require('fs');

// Convert icon
sharp('assets/icon.svg')
  .resize(512, 512)
  .png()
  .toFile('assets/default-icon.png');

// Convert splash
sharp('assets/splash.svg')
  .resize(1200, 630)
  .png()
  .toFile('assets/default-splash.png');

console.log('Conversion complete!');
"
```

## Design Features

### Icon (512x512)
- **Gradient**: Blue (#2563eb) to Purple (#7c3aed)
- **Symbol**: Document with folded corner
- **Accent**: Green checkmark for "verified/managed"
- **Style**: Modern, flat design with subtle depth

### Splash Screen (1200x630)
- **Background**: Dark gradient (#111827 to #1f2937)
- **Theme**: Matches your app's dark UI
- **Elements**:
  - Centered app icon with glow effect
  - "Document Manager" heading in white
  - Descriptive subtitle in gray
  - Three feature badges with emojis
  - Subtle grid pattern overlay
  - "Powered by Reddit Devvit" footer

### Color Palette
- **Primary Blue**: #3b82f6
- **Purple Accent**: #7c3aed
- **Success Green**: #10b981
- **Dark Gray**: #111827, #1f2937
- **Light Gray**: #9ca3af, #6b7280

## After Conversion

1. Replace the PNG files in the `assets` folder
2. Rebuild the app: `npm run build`
3. Create a new post to see the updated splash screen
4. The splash will show on the Reddit feed before users tap to open

## Customization

Want to tweak the design? Edit the SVG files:

**Icon (`assets/icon.svg`):**
- Change gradient colors in the `<linearGradient>` tags
- Modify document shape in the `<path>` elements
- Adjust checkmark position/color

**Splash (`assets/splash.svg`):**
- Update text content in `<text>` elements
- Change feature badges (lines 85-110)
- Modify glow effects in `<filter>` section
- Adjust background gradient colors

## Testing

After updating assets:
1. Clear browser cache
2. Create a new test post
3. View the post on Reddit (don't open the app yet)
4. The splash screen should show your custom design
5. Tap "Open Manager" to launch the app

## Tips

- **High Resolution**: Use 2x or 3x resolution for crisp display on retina screens
- **File Size**: Keep PNGs under 1MB for fast loading
- **Contrast**: Ensure text is readable on all backgrounds
- **Branding**: Match colors with your app's theme for consistency

## Reddit Design Guidelines

Your splash screen follows Reddit's best practices:
- ✅ Clear app name and description
- ✅ Compelling call-to-action button
- ✅ Professional, modern design
- ✅ Consistent with app experience
- ✅ Optimized dimensions (1200x630)
- ✅ Dark theme popular on Reddit

## Need Help?

If you have issues converting or want different designs:
1. Use an online SVG editor like https://www.figma.com
2. Export as PNG at the correct dimensions
3. Or use any graphic design tool (Photoshop, GIMP, etc.)

The SVG files are fully editable and can be customized to your exact preferences!
