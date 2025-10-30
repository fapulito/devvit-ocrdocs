# Storage Adapter Module

This module provides a flexible storage adapter pattern for handling external PDF storage in the Devvit Document Manager application.

## Overview

The storage adapter infrastructure supports multiple storage backends (S3, PostgreSQL) through a common interface, allowing easy switching between providers via environment configuration.

## Components

### StorageAdapter Interface (`StorageAdapter.ts`)

Defines the contract that all storage implementations must follow:

- `upload(buffer, metadata)` - Upload a file to storage
- `getUrl(storageKey)` - Get a URL to access a stored file
- `delete(storageKey)` - Delete a file from storage
- `isConfigured()` - Check if the adapter is properly configured

### S3StorageAdapter (`S3StorageAdapter.ts`)

AWS S3 implementation with:

- Presigned URL generation for secure access
- Automatic retry logic with exponential backoff
- Proper error handling and logging

### PostgreSQLStorageAdapter (`PostgreSQLStorageAdapter.ts`)

PostgreSQL implementation with:

- Binary data storage using BYTEA
- Connection pooling for efficient database access
- SSL/TLS support
- SQL injection prevention via parameterized queries
- Access tracking (access count and timestamp)
- Schema initialization with indexes

### StorageFactory (`StorageFactory.ts`)

Factory class that:

- Creates and manages storage adapter instances
- Implements singleton pattern
- Validates configuration on startup
- Provides configuration debugging utilities

## Configuration

### Environment Variables

```bash
# Storage Provider Selection
STORAGE_PROVIDER=s3  # or 'postgresql'

# AWS S3 Configuration (required if STORAGE_PROVIDER=s3)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=devvit-documents

# PostgreSQL Configuration (required if STORAGE_PROVIDER=postgresql)
POSTGRESQL_CONNECTION_STRING=postgresql://user:pass@host:5432/dbname
POSTGRESQL_SSL=true
SERVER_BASE_URL=https://your-app.reddit.com
```

## PostgreSQL Setup

### Database Schema

The PostgreSQL adapter automatically creates the required schema on initialization:

```sql
CREATE TABLE IF NOT EXISTS document_storage (
  id SERIAL PRIMARY KEY,
  storage_key VARCHAR(255) UNIQUE NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  binary_data BYTEA NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  post_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  accessed_at TIMESTAMP,
  access_count INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_storage_key ON document_storage(storage_key);
CREATE INDEX IF NOT EXISTS idx_post_id ON document_storage(post_id);
CREATE INDEX IF NOT EXISTS idx_user_id ON document_storage(user_id);
CREATE INDEX IF NOT EXISTS idx_created_at ON document_storage(created_at DESC);
```

### Initialization

To initialize the schema, call the `initializeSchema()` method after creating the adapter:

```typescript
import { StorageFactory } from './storage';

const adapter = StorageFactory.getAdapter();

// For PostgreSQL adapter, initialize schema
if (process.env.STORAGE_PROVIDER === 'postgresql') {
  const pgAdapter = adapter as PostgreSQLStorageAdapter;
  await pgAdapter.initializeSchema();
}
```

## Usage Example

```typescript
import { StorageFactory } from './storage';

// Get configured adapter
const storage = StorageFactory.getAdapter();

// Upload a file
const result = await storage.upload(fileBuffer, {
  fileName: 'document.pdf',
  fileType: 'application/pdf',
  fileSize: fileBuffer.length,
  userId: 'user123',
  postId: 'post456',
});

console.log(`Uploaded to ${result.provider}: ${result.storageKey}`);

// Get access URL
const url = await storage.getUrl(result.storageKey);
console.log(`Access URL: ${url}`);

// Delete file
await storage.delete(result.storageKey);
```

## Error Handling

All storage operations throw `StorageError` with specific error codes:

- `UPLOAD_FAILED` - Upload operation failed
- `DOWNLOAD_FAILED` - Download/URL generation failed
- `DELETE_FAILED` - Delete operation failed
- `NOT_FOUND` - Document not found
- `CONFIGURATION_ERROR` - Invalid configuration
- `NETWORK_ERROR` - Network connectivity issues

## Security Features

### PostgreSQL

- **SQL Injection Prevention**: All queries use parameterized statements
- **Connection Security**: SSL/TLS support for encrypted connections
- **Access Control**: Verify user authentication before streaming documents
- **Connection Pooling**: Limits concurrent connections to prevent resource exhaustion

### S3

- **Presigned URLs**: Time-limited access (1 hour expiration)
- **Private Bucket**: No public access, only via presigned URLs
- **Encryption**: Server-side encryption support

## Performance Considerations

### PostgreSQL

- **Connection Pooling**: Max 10 connections, 30s idle timeout
- **Indexes**: Optimized queries for storage_key, post_id, user_id, and created_at
- **Access Tracking**: Minimal overhead for tracking document access

### S3

- **Retry Logic**: Exponential backoff for failed operations
- **Presigned URLs**: No server overhead for file downloads
- **Regional Deployment**: Configure region for optimal latency

## Testing

To test the PostgreSQL adapter locally:

```bash
# Start PostgreSQL with Docker
docker run -p 5432:5432 -e POSTGRES_PASSWORD=test postgres:15

# Set environment variables
export STORAGE_PROVIDER=postgresql
export POSTGRESQL_CONNECTION_STRING=postgresql://postgres:test@localhost:5432/postgres
export POSTGRESQL_SSL=false
export SERVER_BASE_URL=http://localhost:3000

# Run your application
npm run dev
```

## Next Steps

After implementing the PostgreSQL adapter, the following tasks remain:

1. Update document metadata structure to include storage provider and key
2. Implement document upload endpoint with storage routing
3. Implement document retrieval endpoint
4. Implement PostgreSQL streaming endpoint
5. Update document deletion endpoint
6. Update client components for PDF handling
