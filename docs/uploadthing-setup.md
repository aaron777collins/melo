# UploadThing Setup Guide for Melo v2

This guide walks you through setting up UploadThing for file upload functionality in Melo v2.

## Prerequisites

- Melo v2 development environment set up
- Node.js and pnpm installed
- Matrix homeserver running

## Step 1: Create UploadThing Account

1. Go to [uploadthing.com](https://uploadthing.com/)
2. Sign up for a new account or log in to existing account
3. Click "Create New App" in your dashboard
4. Enter app name: "Melo v2 - [Environment]" (e.g., "Melo v2 - Production")
5. Select your deployment region (closest to your users)

## Step 2: Get API Credentials

1. In your UploadThing dashboard, click on your app
2. Go to "API Keys" section
3. Copy your **App ID** (starts with `app_`)
4. Copy your **Secret Key** (starts with `sk_live_` or `sk_test_`)

## Step 3: Configure Environment Variables

Add the following to your `.env.local` (development) or `.env.production` (production):

```bash
# UploadThing Configuration
UPLOADTHING_SECRET=sk_live_your_secret_key_here
UPLOADTHING_APP_ID=your_app_id_here
```

**Security Note:** Never commit real API keys to version control. Use placeholder values in `.env.example`.

## Step 4: Verify Configuration

Run the configuration check:

```bash
cd /path/to/melo
pnpm dev
```

Open your browser and check the browser console for UploadThing initialization logs.

## Step 5: Test File Upload

1. Navigate to any chat room
2. Look for the file upload button (📎 icon)
3. Try uploading a small image file
4. Verify the file appears in the chat

## Configuration Options

The UploadThing configuration is located in `lib/uploadthing/config.ts`:

### File Size Limits

- **Message Files**: 4MB per file, 20MB total per upload
- **Server Images**: 4MB per file, 1 file only

### Allowed File Types

**Message Files:**
- Images: JPEG, PNG, GIF, WebP
- Documents: PDF, TXT
- Audio: MP3, WAV, OGG
- Video: MP4, WebM, OGG

**Server Images:**
- Images only: JPEG, PNG, GIF, WebP

### Security Features

- File type validation (whitelist approach)
- File size restrictions
- Malicious filename detection
- Path traversal prevention
- Rate limiting (10 uploads/minute, 100 uploads/hour)

## Customization

### Modify File Type Restrictions

Edit `lib/uploadthing/config.ts`:

```typescript
export const messageFileConfig: UploadConfig = {
  allowedFileTypes: [
    'image/jpeg',
    'image/png',
    // Add more types here
  ],
  maxFileSize: 4 * 1024 * 1024, // 4MB
  enableValidation: true
};
```

### Adjust File Size Limits

Edit the same file:

```typescript
fileLimits: {
  messageFile: {
    maxFileSize: 8 * 1024 * 1024, // 8MB
    maxFileCount: 10,
    maxTotalSize: 50 * 1024 * 1024 // 50MB
  }
}
```

## Troubleshooting

### Common Issues

**1. "UploadThing not configured" Error**
- Verify `UPLOADTHING_SECRET` and `UPLOADTHING_APP_ID` are set
- Check for typos in environment variable names
- Ensure `.env.local` is in the project root

**2. "File type not allowed" Error**
- Check if file type is in the allowed list
- Verify file has correct MIME type
- Check browser console for specific error details

**3. "File size exceeds limit" Error**
- Check file size against configured limits
- Consider compressing large files
- Adjust limits if needed (see customization above)

**4. Upload Progress Stalls**
- Check network connectivity
- Verify UploadThing service status
- Check browser console for network errors

### Debug Mode

Enable debug logging by setting:

```bash
NEXT_PUBLIC_DEBUG_MODE=true
```

This will show detailed upload progress and error information in the browser console.

### Health Check

To verify UploadThing integration:

1. Check configuration status:
```bash
curl http://localhost:3000/api/uploadthing/health
```

2. Test upload endpoint:
```bash
curl -X POST http://localhost:3000/api/uploadthing \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## Production Considerations

### Performance

- UploadThing automatically handles CDN distribution
- Files are processed and optimized server-side
- Progressive upload with resumable transfers

### Security

- All uploads go through Matrix authentication
- File validation happens both client and server-side
- Automatic malware scanning (enterprise plans)
- GDPR compliance features available

### Monitoring

- Upload success/failure rates in UploadThing dashboard
- File storage usage tracking
- Error reporting integration with Sentry

### Backup & Recovery

- UploadThing provides automatic backups
- Files can be bulk-exported if needed
- Consider additional backup strategy for critical files

## API Reference

### Client Methods

```typescript
import { createUploadthingClient } from '@/lib/uploadthing/client';

const client = createUploadthingClient({
  maxFileSize: 4 * 1024 * 1024,
  allowedFileTypes: ['image/jpeg', 'image/png'],
  enableValidation: true
});

// Upload message files
const results = await client.uploadMessageFiles(files, {
  onProgress: (progress) => {
    console.log(`Upload progress: ${progress.progress}%`);
  }
});

// Upload server image
const result = await client.uploadServerImage(file);
```

### Configuration Validation

```typescript
import { isUploadthingConfigured, validateUploadthingEnvironment } from '@/lib/uploadthing/config';

if (!isUploadthingConfigured()) {
  const errors = validateUploadthingEnvironment();
  console.error('UploadThing configuration errors:', errors);
}
```

## Support

For issues with this integration:
1. Check the troubleshooting section above
2. Review UploadThing documentation at [docs.uploadthing.com](https://docs.uploadthing.com)
3. Check the project's GitHub issues
4. Contact the development team

For UploadThing service issues:
1. Check UploadThing status page
2. Contact UploadThing support through their dashboard