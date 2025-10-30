# 📄 Document Manager for Reddit

> AI-powered document management app built on Reddit's Devvit platform

[![License](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.2.0-brightgreen.svg)](https://nodejs.org/)
[![Devvit](https://img.shields.io/badge/Devvit-0.12.1-orange.svg)](https://developers.reddit.com/)

A personal document management application that lets you upload, organize, and manage your important documents directly within Reddit posts, powered by Google Gemini AI for automatic document analysis.

> **Note:** This is a productivity tool for document management. It provides a practical solution for organizing and storing personal documents on Reddit with AI-powered analysis.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.template .env
# Edit .env and add your Gemini API key

# Login to Devvit
npm run login

# Build and deploy
npm run build
npm run deploy
```

📖 **Full setup instructions:** See [SETUP.md](SETUP.md)

📚 **Development journey:** See [DEVELOPMENT_JOURNEY.md](DEVELOPMENT_JOURNEY.md)

### What It Does

Document Manager is a full-featured document organization app that runs inside Reddit posts. Upload images and PDFs of receipts, invoices, notes, forms, contracts, or any important documents, add descriptions and notes, and access them anytime from the same Reddit post. Each document is stored with metadata and a preview (for images), making it easy to find what you need at a glance.

The app launches directly into a clean three-tab interface with a modern dark gradient theme:
- **Setup**: Configure your Google Gemini API key for AI-powered document analysis (one-time setup per post)
- **Upload Document**: Upload images or PDFs (both with 500KB limit), with optional AI analysis, add descriptions, and optional notes
- **My Documents**: Browse all your uploaded documents in a visual grid with previews, descriptions, and timestamps

The app features **AI-powered document analysis** using Google's Gemini 2.5 Flash API to automatically extract key information from your documents:
- **Easy Setup**: Configure your Gemini API key once through the Setup tab - stored securely in Redis
- **Smart Description Generation**: AI analyzes your document and suggests a concise description (max 80 characters)
- **Automatic Summarization**: Extracts key details like amounts, dates, and important information (max 400 characters)
- **Intelligent Text Recognition**: Works with both images and PDFs to understand document content
- **Auto-Analyze Toggle**: Enable or disable automatic AI analysis when uploading documents
- **Re-Analyze Button**: Regenerate AI analysis if you're not satisfied with the initial results
- **Manual Override**: Edit AI-generated descriptions and summaries before saving
- **Safe Submission**: Prevents accidental form submission while AI analysis is in progress
- **Intelligent Caching**: Analysis results cached for 7 days with MD5 hash-based cache keys
- **Rate Limiting**: Fair usage with 100 analysis requests per user per day

### What Makes It Innovative

- **AI-Powered Document Analysis**: Integration with Google's Gemini 1.5 Flash API automatically analyzes documents and extracts key information
  - **Smart Description Generation**: AI reads your document and suggests a concise, accurate description (max 80 characters)
  - **Automatic Summarization**: Extracts amounts, dates, reference numbers, and key details from receipts, invoices, and forms (max 400 characters)
  - **Re-Analyze Button**: Don't like the AI's first attempt? Click "Re-analyze" next to the description field to regenerate the analysis
  - **Auto-Analyze Toggle**: Enable or disable automatic AI analysis when uploading documents
  - **Safe Form Submission**: Prevents accidental submission while AI analysis is in progress
  - **Intelligent Caching**: Analysis results cached for 7 days to improve performance and reduce API costs
  - **Rate Limiting**: Fair usage with 100 analysis requests per user per day
  - **Graceful Fallback**: If AI analysis fails, provides generic descriptions so uploads always succeed
  - **User Control**: Toggle auto-analyze on/off, manually trigger re-analysis, and edit AI-generated content before saving
  - **Automatic Setup**: API key retrieved from Redis configuration on app initialization
- **Reddit-Native Storage**: Seamlessly integrated into Reddit posts using Devvit's Redis backend - each post becomes a personal document vault
- **Unified Storage Architecture**: All files (images and PDFs) stored in Redis for consistent, fast access without external dependencies
- **PDF Support**: Upload and manage PDF documents up to 500KB, stored directly in Redis alongside images
- **Modern Dark UI**: Beautiful gradient dark theme (gray-900 to gray-800) with glassmorphism effects (backdrop blur, semi-transparent panels) for a premium feel
- **Visual Document Library**: Grid-based layout with image previews and PDF indicators makes finding documents quick and intuitive
- **Persistent Per-Post Storage**: Documents are tied to specific Reddit posts and persist indefinitely (up to 20 documents per post)
- **Rich Metadata System**: Add descriptions and notes to each document for better organization and searchability
- **Mobile-Aware Design**: Enhanced file picker with mobile browser compatibility warnings and fallback guidance
- **Smart Image Compression**: Automatically resizes images to max 800px and compresses to JPEG quality 0.5 to stay within 500KB limit
- **Unified 500KB Limit**: Both images and PDFs limited to 500KB for consistent Redis storage performance
- **No External Dependencies**: All files stored in Redis - works reliably in both development and production without external services
- **User Context Integration**: Displays your Reddit username in the header and maintains separate document collections per post
- **Full Document Details**: Click any document to view full-size image or open PDF in new tab with complete metadata
- **Bulk Export**: Copy all document metadata to clipboard with visual feedback for backup or sharing
- **Simplified Download**: Clear instructions for saving images via right-click or opening in new tab
- **Confirmation Dialogs**: Delete operations require confirmation to prevent accidental data loss
- **Automatic Cleanup**: Deleting documents removes them from Redis storage
- **Responsive Design**: Works on desktop and mobile with touch-optimized interactions and responsive layouts
- **Cross-Browser Support**: Enhanced file input handling works across different browsers, with clear guidance when limitations exist
- **Comprehensive Logging**: Structured logging for AI analysis operations, performance metrics, and error tracking

### Technology Stack

- [Devvit](https://developers.reddit.com/): Reddit's developer platform for building immersive apps
- [React](https://react.dev/): UI framework with hooks for state management
- [Express](https://expressjs.com/): Backend API for document storage and retrieval
- [Google Gemini API](https://ai.google.dev/): AI-powered document analysis and text extraction
- [Tailwind CSS](https://tailwindcss.com/): Utility-first styling for responsive design
- [TypeScript](https://www.typescriptlang.org/): Type safety across client and server
- [Vite](https://vite.dev/): Fast build tool and dev server
- [Redis](https://redis.io/): Data persistence layer (via Devvit) for storing documents and caching analysis results

## How to Use Document Manager

### Step-by-Step Instructions

**1. Launch the App**
   - Find a Reddit post where Document Manager is installed
   - Click the "Launch App" button to open the full-screen interface
   - You'll see the main interface with a modern dark gradient background:
     - **Header**: Dark glassmorphic header with a blue-purple gradient document icon, "Document Manager" title, and your username displayed on the right (e.g., "Hello, username!")
     - **Navigation tabs**: "Setup", "Upload Document", and "My Documents" tabs with blue highlight indicator for the active tab
     - **Footer**: Dark footer with clickable links to Devvit Docs, r/Devvit, and Discord community
   - The app opens to the **Setup** tab by default for first-time configuration

**2. Configure API Key (Setup Tab - First Time Only)**
   - On first launch, you'll see the **Setup** tab with a dark glassmorphic card
   - The card displays:
     - **Heading**: "Configure Gemini API Key"
     - **Description**: Instructions with a clickable link to Google AI Studio
     - **Password input field**: For entering your API key (masked for security)
     - **Configure button**: Blue button that shows "Configuring..." while processing
   - Get your free Gemini API key at https://aistudio.google.com/app/apikey
   - Enter the API key in the password field
   - Click "Configure API Key" to store it securely in Redis
   - **Success feedback**: Green success message appears: "API key configured successfully! AI analysis is now enabled."
   - **Additional info**: Blue info box confirms the key is stored and ready to use
   - The key is stored per-post in Redis and persists across sessions
   - You only need to do this once per Reddit post
   - After setup, switch to the "Upload Document" tab to start uploading

**3. Upload a Document (Upload Document Tab)**
   - Click the "Upload Document" tab in the navigation
   - You'll see a dark glassmorphic card with "Document Upload" heading and a subtitle: "Select an image or PDF file to upload and manage."
   - **Mobile users**: A yellow warning banner appears on mobile devices stating "⚠️ File uploads may not work on mobile due to Reddit app restrictions. Please use desktop for uploading."
   - **Tap the dashed border area** labeled "Tap to select a file" to open your device's file picker
   - The app uses enhanced file picker handling with focus management for better mobile browser compatibility
   - If the file picker doesn't open, you'll see a helpful error message suggesting to use the Reddit app or try a different browser
   - Select an image or PDF file from your device
   - **Supported formats**: 
     - **Images**: PNG, JPG, JPEG, GIF, BMP (max 500KB after compression)
     - **PDFs**: Any PDF document (max 500KB)
   - **File size limits**:
     - Both images and PDFs: 500KB maximum
   - **Automatic image compression**: Images are resized to max 800px on longest side and compressed to JPEG quality 0.5 for optimal file size
   - **PDF handling**: PDFs are stored in Redis as base64 data, same as images
   - **Supported content**: Receipts, invoices, forms, notes, contracts, business cards, certificates, reports, manuals, etc.

**4. Configure AI Analysis (Optional)**
   - At the top of the upload form, you'll see an **"Auto-analyze with AI"** checkbox
   - **Enabled by default**: AI will automatically analyze your document when you select a file
   - **Toggle off**: If you prefer to add descriptions manually, uncheck this option
   - The setting persists during your session for convenience

**5. Add Document Details**
   - After selecting a file, you'll see:
     - **For images**: A thumbnail preview of your uploaded image with rounded corners in a dark gray container
     - **For PDFs**: A PDF icon with "PDF Document" label (no preview available)
     - **File name**: Displayed below the preview/icon in small gray text
   - **AI Analysis** (if auto-analyze is enabled):
     - A purple "Analyzing document..." indicator appears near the file preview
     - The AI processes your document and pre-fills the description and notes fields
     - Fields marked with a ✨ sparkle icon indicate AI-generated content
     - **Not satisfied with the AI analysis?** Click the purple "Re-analyze" button next to the description field to regenerate the analysis
   - Fill in or edit the document details:
     - **Description** (required): Add a clear, descriptive title for your document (e.g., "Receipt from Walmart 2024-10-29")
       - If AI analysis ran, this field will be pre-filled with an AI-generated description
       - You can edit the AI-generated description or click "Re-analyze" to try again
     - **Notes** (optional): Add any additional details, key information, or notes about the document
       - If AI analysis ran, this field will be pre-filled with an AI-generated summary
       - You can edit the AI-generated notes as needed
   - Click the blue gradient **"Save Document"** button to store it (button shows "Uploading..." while processing)
   - Click **"Cancel"** to clear the form and start over
   - After successful save, you're automatically redirected to the "My Documents" tab to see your new upload

**6. View Your Documents (My Documents Tab)**
   - Click the **"My Documents"** tab in the navigation bar (tab highlights in blue when active)
   - View all your uploaded documents in a **grid layout** (2 columns on desktop, 1 on mobile)
   - If no documents exist, you'll see:
     - Empty state message: "No documents yet. Upload your first document to get started!"
     - Helpful info box explaining how documents work (per-post storage, access instructions, copy feature, 20 document limit)
   - Each document card displays on a dark semi-transparent background with hover effects:
     - **For images**: Thumbnail preview (fixed 160px height, full width, object-cover for consistent layout)
     - **For PDFs**: PDF icon with "PDF Document" label
     - **PDF badge**: Red "PDF" badge in top-right corner for PDF documents
     - **Description**: Your custom title in bold white text, truncated if too long
     - **File name**: Original file name in small gray text, truncated if too long
     - **Notes preview**: First 2 lines of notes (if added) with line-clamp in gray text
     - **Upload date**: Formatted as locale date in small gray text
     - **Click to open**: Blue text for PDFs indicating they'll open in a new tab
   - Documents are shown in **reverse chronological order** (most recent first)
   - The header shows total document count: "My Documents (X)" in white text
   - **Copy All button**: Top-right button to copy all document metadata to clipboard
   - Cards have a hover effect (border changes to blue) and cursor changes to pointer to indicate they're clickable

**7. View Document Details**
   - **For images**: Click any image card to open the **detail view**
   - **For PDFs**: Click any PDF card to view in the detail view (same as images)
   - The detail view shows on a dark glassmorphic card with shadow:
     - **Back button**: "← Back to list" link in blue at the top with hover effect
     - **For images**: Full-size image preview (max 384px height, centered, with rounded corners and border)
     - **For PDFs**: PDF icon with "PDF Document" label (no preview available)
     - **File name**: Complete file name under "File Name" heading in gray
     - **Description**: Full description text under "Description" heading in white
     - **Notes**: Complete notes with preserved formatting (whitespace-pre-wrap) under "Notes" heading (only shown if notes exist)
     - **Upload timestamp**: Full date and time formatted as locale string under "Uploaded" heading in gray
     - **Save instructions**: Blue info box with instructions on how to save the image via right-click (for images only)
     - **Delete button**: Red "Delete Document" button centered at the bottom to remove the document
   - Click **"← Back to list"** at the top to return to the grid view

**8. Save a Document**
   - **For images**: Open the document detail view
     - You'll see a blue info box with instructions: "💡 To save this image: Right-click the image above and select 'Save image as...' or 'Open image in new tab'"
     - **Right-click method**: Right-click the full-size image and select "Save image as..." from the context menu
     - **New tab method**: Right-click and select "Open image in new tab", then save from there
     - Works with all uploaded image formats across all browsers and devices
   - **For PDFs**: Currently stored as base64 in Redis
     - Right-click the PDF icon and select "Save image as..." to save the preview
     - For full PDF access, you'll need to download the original file before uploading

**9. Copy All Documents**
   - In the "My Documents" tab, click the **"Copy All"** button in the top-right corner
   - All document metadata is copied to your clipboard:
     - Export date and total document count
     - For each document: filename, description, notes, and upload date
   - The button turns green and shows "Copied!" for 3 seconds when successful
   - Useful for backup or sharing document information without the images
   - **Note**: If clipboard access fails, an alert will show the first 500 characters of the export data for manual copying

**10. Delete a Document**
   - Open the document detail view (for both images and PDFs) and click the red **"Delete Document"** button
   - A modal dialog appears with a dark overlay asking "Delete Document?"
   - The dialog shows: "Are you sure you want to delete this document? This action cannot be undone."
   - Click **"Delete"** to confirm (button shows "Deleting..." while processing) or **"Cancel"** to abort
   - The document is permanently removed from your collection
   - All files are deleted from Redis storage
   - If you were viewing the deleted document, you're automatically returned to the document list
   - The document disappears from the grid immediately after successful deletion

**11. Upload More Documents**
   - Switch back to the "Upload Document" tab (click the tab in the navigation bar)
   - The upload form is ready for a new document with a fresh state
   - The auto-analyze setting persists from your previous choice
   - After saving, you're automatically redirected to "My Documents" to see your new upload
   - Each document is saved independently with its own metadata
   - The app maintains up to 20 most recent documents per post to avoid storage limits

### Tips for Best Organization

- **One-Time Setup**: Configure your Gemini API key once in the Setup tab - it's stored securely in Redis and persists across sessions
- **Get a Free API Key**: Visit https://aistudio.google.com/app/apikey to get a free Gemini API key (15 requests/minute, 1,500 requests/day free tier)
- **AI Analysis**: Enable auto-analyze for automatic description generation, or disable it if you prefer manual entry
- **Re-Analyze Feature**: If the AI's first analysis isn't perfect, click "Re-analyze" to try again
- **Edit AI Content**: Always review and edit AI-generated descriptions and notes before saving
- **Caching Benefits**: Duplicate uploads use cached analysis results (free, instant)
- **Desktop Recommended**: File uploads work best on desktop browsers due to Reddit app limitations on mobile
- **Mobile Warning**: A yellow banner on mobile devices alerts users to potential upload issues
- **Mobile-Optimized UI**: The upload area says "Tap to select a file" for better mobile experience with enhanced file picker handling
- **Browser Compatibility**: If file picker doesn't work, try using the official Reddit app or a different browser (Chrome, Safari, Firefox)
- **File Size Management**: 
  - Both images and PDFs have a 500KB limit
  - Images are automatically compressed - the app handles resizing (max 800px) and compression (JPEG quality 0.5) for you
  - PDFs must be under 500KB before upload - compress large PDFs using online tools if needed
- **Descriptive Titles**: Use clear, searchable descriptions (e.g., "2024 Tax Return" or "Q4 Sales Report" instead of "Document 1")
- **Add Notes**: Include key details in notes for easier searching later (dates, amounts, reference numbers, key points)
- **Regular Cleanup**: Delete outdated documents to keep your collection manageable (20 document limit per post)
- **Regular Backups**: Use the "Copy All" button to backup your document metadata regularly
- **Save Documents**: 
  - Images: Right-click to save locally, or open in new tab for easier downloading
  - PDFs: Currently stored as base64 - save original files separately for full PDF access
- **Image Quality**: Use clear, well-lit photos for better readability when viewing later
- **PDF Organization**: Use PDFs for single-page documents, receipts, or forms under 500KB
- **Consistent Naming**: Develop a naming convention for similar document types
- **Error Handling**: If upload or deletion fails, you'll see clear error messages in a red alert box with details
- **Confirmation Dialogs**: Delete operations require confirmation to prevent accidental removal
- **Visual Feedback**: Buttons show loading states ("Uploading...", "Deleting...") so you know the app is processing your request
- **Troubleshooting**: Check browser console logs if issues persist - the app provides detailed logging for debugging

## Getting Started (For Developers)

> Make sure you have Node 22 downloaded on your machine before running!

1. Clone this repository
2. Run `npm install` to install dependencies
3. Configure your test subreddit (optional):
   - Copy `.env.template` to `.env`
   - Set your preferred test subreddit: `DEVVIT_SUBREDDIT=r/your_test_subreddit`
   - Default is `r/ocrdocs_dev`
4. Run `npm run dev` to start the development server
5. Follow the Devvit playtest URL to test the app on Reddit

## Commands

- `npm run dev`: Starts a development server where you can develop your application live on Reddit.
- `npm run build`: Builds your client and server projects
- `npm run deploy`: Uploads a new version of your app
- `npm run launch`: Publishes your app for review
- `npm run login`: Logs your CLI into Reddit
- `npm run check`: Type checks, lints, and prettifies your app

## Features

- **Modern Dark UI**: Beautiful gradient dark theme (gray-900 to gray-800) with glassmorphism effects (backdrop blur, semi-transparent panels)
- **Easy API Key Setup**: Configure your Gemini API key through the Setup tab - stored securely in Redis per-post
- **AI-Powered Document Analysis**: Automatic extraction of key information using Google's Gemini 2.5 Flash API
- **Smart Description Generation**: AI suggests concise descriptions (max 80 chars) based on document content
- **Automatic Summarization**: Extracts amounts, dates, and key details (max 400 chars) from documents
- **Re-Analyze Feature**: Don't like the AI's analysis? Click "Re-analyze" to regenerate it
- **Auto-Analyze Toggle**: Enable or disable automatic AI analysis when uploading
- **AI-Generated Indicators**: ✨ sparkle icons show which fields were generated by AI
- **Intelligent Caching**: Analysis results cached for 7 days using MD5 hash-based cache keys
- **Rate Limiting**: Fair usage with 100 analysis requests per user per day (resets at midnight UTC)
- **Graceful Fallback**: If AI fails, provides generic descriptions so uploads always succeed
- **Per-Post Configuration**: Each Reddit post has its own API key configuration stored in Redis
- **Retry Logic**: Automatic retry with exponential backoff for transient API failures
- **Comprehensive Logging**: Structured JSON logs for monitoring, debugging, and performance analysis
- **Mobile Upload Warning**: Yellow banner on mobile devices alerts users to potential file upload limitations in the Reddit app
- **Enhanced File Picker**: Improved mobile browser compatibility with focus management and error handling
- **Robust Error Messages**: Clear guidance when file picker issues occur, with browser/app recommendations
- **Touch-Optimized Upload**: Mobile-friendly file picker with "Tap to select a file" prompt and active state feedback
- **Dual File Type Support**: Upload both images and PDFs with unified Redis storage
- **Robust PDF Detection**: Detects PDFs by MIME type (application/pdf, application/x-pdf) and file extension (.pdf) for maximum compatibility
- **Image Upload**: Upload images with automatic compression (max 500KB after compression)
- **PDF Upload**: Upload PDF documents up to 500KB stored in Redis
- **Smart Image Compression**: Automatically resizes to max 800px and compresses to JPEG quality 0.5 for optimal file size
- **Unified Storage Architecture**: All files stored in Redis for consistent, reliable access
- **No External Dependencies**: Works in both development and production without external services
- **Rich Metadata**: Add descriptions and notes to each document for better organization
- **Visual Library**: Grid-based layout with image previews and PDF indicators for quick document identification
- **Document Details**: Click any document to view full-size with complete metadata
- **PDF Indicators**: Red "PDF" badges on PDF document cards
- **Copy All Documents**: Copy all document metadata to clipboard with visual feedback (button turns green and shows "Copied!" for 3 seconds)
- **Easy Document Saving**: 
  - Images: Clear instructions for saving via right-click or opening in new tab
  - PDFs: Stored as base64 in Redis for reliable access
- **Persistent Storage**: All documents saved in Redis and persist across sessions (up to 20 per post)
- **Simple Deletion**: Remove documents from Redis with confirmation dialog
- **Three-Tab Interface**: Setup tab for API key configuration, Upload tab for new documents, and My Documents tab for browsing your collection
- **Mobile-Friendly**: Responsive design works seamlessly on desktop and mobile with touch-optimized interactions
- **Reddit Integration**: Fully integrated with Reddit's authentication and data storage
- **User Context**: Displays your Reddit username in the header and maintains per-post document collections
- **Easy Management**: Delete documents with confirmation dialog to keep your library organized
- **Loading States**: Visual feedback for uploads ("Uploading..."), deletions ("Deleting..."), and PDF opens ("Opening document...")
- **Smooth Interactions**: Hover effects on cards, loading states on buttons, and smooth tab transitions
- **Gradient Icon**: Blue-purple gradient document icon in the header for visual appeal
- **Debug Logging**: Console logging for troubleshooting file picker, upload, and storage issues

## Architecture

- **Client** (`src/client/`): React app with document upload and management components
- **Server** (`src/server/`): Express API with Redis storage for document persistence
- **Shared** (`src/shared/`): TypeScript types for API contracts

## Cursor Integration

This template comes with a pre-configured cursor environment. To get started, [download cursor](https://www.cursor.com/downloads) and enable the `devvit-mcp` when prompted.
