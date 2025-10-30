# Document Manager - User Guide

## How to Access Your Documents

### On the Same Device
1. Return to the Reddit post where you installed the app
2. Click "Launch App" or tap the post
3. Your documents are automatically loaded

### On Different Devices
Documents are tied to the **specific Reddit post** where the app is installed. To access your documents on another device:

1. Open Reddit on the new device
2. Navigate to the **same post** where you uploaded documents
3. Launch the app from that post
4. Your documents will be there!

**Important:** Documents are stored per-post, not per-user. Each Reddit post with the app has its own document collection.

## Features

### 1. Upload Documents
- Click "Upload Document" tab
- Select an image (PNG, JPG, JPEG, GIF, BMP)
- Max file size: 500KB (automatically compressed)
- Add description (required) and notes (optional)
- Click "Save Document"

### 2. View All Documents
- Click "My Documents" tab
- See all uploaded documents in a grid
- Shows thumbnail, description, filename, and date
- Click any document to view full details

### 3. View Document Details
- Click on any document card
- See full-size image
- View all metadata (filename, description, notes, upload date)
- Download or delete the document

### 4. Download Individual Documents
- Open a document in detail view
- Click the "Download" button
- Image saves to your device's downloads folder
- Original filename is preserved

### 5. Export All Documents
- In "My Documents" tab, click "Export All" button (top right)
- Downloads a text file with all document information:
  - Filenames
  - Descriptions
  - Notes
  - Upload dates
- Useful for backup or sharing document metadata

### 6. Delete Documents
- Open a document in detail view
- Click "Delete" button
- Confirm deletion in the modal
- Document is permanently removed from Redis

## Storage Details

### Where Are Documents Stored?
- **Redis database** provided by Devvit
- Stored per-post (each Reddit post has its own collection)
- Maximum 20 documents per post
- Each document max 500KB after compression

### Data Persistence
- Documents persist indefinitely in Redis
- Accessible anytime you return to the post
- Not affected by app updates or restarts

### Privacy
- Documents are private to the post
- Only accessible through the specific Reddit post
- No cross-post sharing (by design)

## Cross-Device Access Strategy

Since documents are per-post, here are strategies for cross-device access:

### Option 1: Bookmark the Post
1. Save/bookmark the Reddit post on all devices
2. Access documents by opening the bookmarked post
3. Works across desktop, mobile, and tablets

### Option 2: Share the Post Link
1. Copy the Reddit post URL
2. Send to yourself (email, messages, etc.)
3. Open on other devices

### Option 3: Export and Re-upload
1. Download documents on one device
2. Export all metadata
3. Re-upload on another device/post if needed

### Option 4: Use PostgreSQL Sync (Advanced)
- See `POSTGRESQL_SYNC.md` for instructions
- Sync documents to external database
- Access from anywhere via custom API

## Limitations

1. **Per-Post Storage**: Documents don't sync across different posts
2. **No Cloud Sync**: No automatic cross-device synchronization
3. **20 Document Limit**: Maximum 20 documents per post
4. **500KB File Size**: Images are compressed to stay under limit
5. **Images Only**: No PDF support (due to size constraints)

## Tips for Best Experience

1. **Use One Main Post**: Create a dedicated post for your documents
2. **Bookmark It**: Save the post URL for easy access
3. **Regular Exports**: Export metadata regularly as backup
4. **Download Important Docs**: Save critical documents locally
5. **Descriptive Names**: Use clear descriptions for easy searching

## Future Enhancements

Potential features (see `POSTGRESQL_SYNC.md` for implementation):
- Cross-post document sync
- Cloud storage integration
- Full-text search
- Document categories/tags
- Sharing via Reddit DM
- PDF support with external storage
- Mobile app integration

## Troubleshooting

**Q: I can't see my documents on another device**
A: Make sure you're accessing the exact same Reddit post. Documents are per-post, not per-user.

**Q: My document upload failed**
A: Check file size (must be under 500KB). Try a smaller image or screenshot.

**Q: Can I access documents from a different post?**
A: No, each post has its own document collection. This is by design for privacy and organization.

**Q: How do I backup my documents?**
A: Use the "Export All" button to save metadata, and download individual images.

**Q: Can I share documents with others?**
A: Currently, documents are private to the post. You can download and share externally.

## Support

For issues or questions:
- Check the Devvit documentation
- Visit r/Devvit on Reddit
- Review the code in the GitHub repository
