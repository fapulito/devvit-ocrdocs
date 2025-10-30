# Design Document: External PDF Storage Integration

## Overview

This design document outlines the architecture for integrating external storage solutions (AWS S3 and PostgreSQL) into the Devvit Document Manager application to enable PDF document storage. The solution provides a flexible storage adapter pattern that supports multiple storage backends while maintaining backward compatibility with existing Redis-based image storage.

The design addresses the 512KB Redis value size limitation by offloading large PDF files to external storage while keeping metadata in Redis for fast access and listing operations.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
│                    (React in Webview)                        │
└────────────┬────────────────────────────────────────────────┘
             │ HTTP/Fetch API
             │
┌────────────▼────────────────────────────────────────────────┐
│                    Devvit Server (Express)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Endpoints Layer                      │   │
│  │  /api/documents/add                                   │   │
│  │  /api/documents/list                                  │   │
│  │  /api/documents/get/:id                               │   │
│  │  /api/documents/delete                                │   │
│  └────────────┬─────────────────────────────────────────┘   │
│               │                                              │
│  ┌────────────▼─────────────────────────────────────────┐   │
│  │           Storage Adapter (Abstract)                  │   │
│  │  - upload(buffer, metadata)                           │   │
│  │  - getUrl(storageKey)                                 │   │
│  │  - delete(storageKey)                                 │   │
│  └────────┬──────────────────────┬──────────────────────┘   │
│           │                      │                           │
│  ┌────────▼────────┐    ┌───────▼──────────┐               │
│  │  S3 Adapter     │    │ PostgreSQL       │               │
│  │  Implementation │    │ Adapter Impl     │               │
│  └────────┬────────┘    └───────┬──────────┘               │
└───────────┼─────────────────────┼───────────────────────────┘
            │                     │
            │                     │
┌───────────▼────────┐  ┌─────────▼──────────┐
│   AWS S3 Bucket    │  │  PostgreSQL DB     │
│   (External)       │  │  (Neon/External)   │
└────────────────────┘  └────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                    Redis (Devvit Built-in)                  │
│  - Document metadata (id, name, type, size, timestamp)     │
│  - Storage keys and provider type                          │
│  - User access tracking                                    │
└────────────────────────────────────────────────────────────┘
```

### Storage Decision Flow

```
User uploads file
       │
       ▼
Is file type PDF?
       │
   ┌───┴───┐
   │       │
  YES     NO
   │       │
   │       └──► Store in Redis as base64 (existing behavior)
   │
   ▼
Is file size > 512KB?
   │
   └──► YES ──► Store in External Storage
                 │
                 ├─► Generate unique storage key
                 ├─► Upload binary to external provider
                 ├─► Store metadata + storage key in Redis
                 └─► Return success
```

## Components and Interfaces

### 1. Storage Adapter Interface

**File: `src/server/storage/StorageAdapter.ts`**

```typescript
export interface StorageMetadata {
  fileName: string;
  fileType: string;
  fileSize: number;
  userId: string;
  postId: string;
}

export interface StorageResult {
  storageKey: string;
  provider: 's3' | 'postgresql' | 'redis';
  url?: string; // For immediate access (S3 presigned URL)
}

export interface StorageAdapter {
  /**
   * Upload a file to external storage
   * @param buffer - File binary data
   * @param metadata - File metadata
   * @returns Storage key and provider information
   */
  upload(buffer: Buffer, metadata: StorageMetadata): Promise<StorageResult>;

  /**
   * Get a URL to access the stored file
   * @param storageKey - Unique identifier for the stored file
   * @returns URL to access the file (presigned for S3, endpoint for PostgreSQL)
   */
  getUrl(storageKey: string): Promise<string>;

  /**
   * Delete a file from external storage
   * @param storageKey - Unique identifier for the stored file
   */
  delete(storageKey: string): Promise<void>;

  /**
   * Check if the adapter is properly configured
   */
  isConfigured(): boolean;
}
```

### 2. S3 Storage Adapter

**File: `src/server/storage/S3StorageAdapter.ts`**

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageAdapter, StorageMetadata, StorageResult } from './StorageAdapter';

export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client;
  private bucketName: string;
  private region: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucketName = process.env.AWS_S3_BUCKET || '';
    
    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  isConfigured(): boolean {
    return !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET
    );
  }

  async upload(buffer: Buffer, metadata: StorageMetadata): Promise<StorageResult> {
    const storageKey = `documents/${metadata.postId}/${metadata.userId}/${Date.now()}_${metadata.fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
      Body: buffer,
      ContentType: metadata.fileType,
      Metadata: {
        originalName: metadata.fileName,
        userId: metadata.userId,
        postId: metadata.postId,
      },
    });

    await this.client.send(command);

    // Generate presigned URL for immediate access
    const getCommand = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });
    const url = await getSignedUrl(this.client, getCommand, { expiresIn: 3600 });

    return {
      storageKey,
      provider: 's3',
      url,
    };
  }

  async getUrl(storageKey: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    return await getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  async delete(storageKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    await this.client.send(command);
  }
}
```

### 3. PostgreSQL Storage Adapter

**File: `src/server/storage/PostgreSQLStorageAdapter.ts`**

```typescript
import { Pool } from 'pg';
import { StorageAdapter, StorageMetadata, StorageResult } from './StorageAdapter';

export class PostgreSQLStorageAdapter implements StorageAdapter {
  private pool: Pool;
  private baseUrl: string;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.POSTGRESQL_CONNECTION_STRING,
      ssl: process.env.POSTGRESQL_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    // Base URL for document retrieval endpoint
    this.baseUrl = process.env.SERVER_BASE_URL || '';
  }

  isConfigured(): boolean {
    return !!(process.env.POSTGRESQL_CONNECTION_STRING && process.env.SERVER_BASE_URL);
  }

  async upload(buffer: Buffer, metadata: StorageMetadata): Promise<StorageResult> {
    const storageKey = `pg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.pool.query(
      `INSERT INTO document_storage (
        storage_key, 
        file_name, 
        file_type, 
        file_size, 
        binary_data, 
        user_id, 
        post_id, 
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        storageKey,
        metadata.fileName,
        metadata.fileType,
        metadata.fileSize,
        buffer,
        metadata.userId,
        metadata.postId,
      ]
    );

    return {
      storageKey,
      provider: 'postgresql',
      url: `${this.baseUrl}/api/documents/stream/${storageKey}`,
    };
  }

  async getUrl(storageKey: string): Promise<string> {
    return `${this.baseUrl}/api/documents/stream/${storageKey}`;
  }

  async delete(storageKey: string): Promise<void> {
    await this.pool.query('DELETE FROM document_storage WHERE storage_key = $1', [storageKey]);
  }

  async getDocument(storageKey: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    const result = await this.pool.query(
      'SELECT binary_data, file_type FROM document_storage WHERE storage_key = $1',
      [storageKey]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      buffer: result.rows[0].binary_data,
      contentType: result.rows[0].file_type,
    };
  }
}
```

### 4. Storage Factory

**File: `src/server/storage/StorageFactory.ts`**

```typescript
import { StorageAdapter } from './StorageAdapter';
import { S3StorageAdapter } from './S3StorageAdapter';
import { PostgreSQLStorageAdapter } from './PostgreSQLStorageAdapter';

export type StorageProvider = 's3' | 'postgresql';

export class StorageFactory {
  private static instance: StorageAdapter | null = null;

  static getAdapter(): StorageAdapter {
    if (this.instance) {
      return this.instance;
    }

    const provider = (process.env.STORAGE_PROVIDER || 's3') as StorageProvider;

    switch (provider) {
      case 's3':
        this.instance = new S3StorageAdapter();
        break;
      case 'postgresql':
        this.instance = new PostgreSQLStorageAdapter();
        break;
      default:
        throw new Error(`Unknown storage provider: ${provider}`);
    }

    if (!this.instance.isConfigured()) {
      throw new Error(`Storage provider ${provider} is not properly configured`);
    }

    console.log(`Storage adapter initialized: ${provider}`);
    return this.instance;
  }
}
```

## Data Models

### Redis Document Metadata

```typescript
// Stored in Redis at key: docs:{postId}:list
interface DocumentMetadata {
  id: string;                    // Unique document ID
  fileName: string;              // Original file name
  fileType: string;              // MIME type
  fileSize: number;              // Size in bytes
  description: string;           // User description
  notes: string;                 // User notes
  timestamp: number;             // Upload timestamp
  
  // Storage information
  storageProvider: 'redis' | 's3' | 'postgresql';
  storageKey?: string;           // Key for external storage (if not Redis)
  imageData?: string;            // Base64 data (if stored in Redis)
}
```

### PostgreSQL Schema

```sql
-- Table for storing PDF binary data
CREATE TABLE document_storage (
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

CREATE INDEX idx_storage_key ON document_storage(storage_key);
CREATE INDEX idx_post_id ON document_storage(post_id);
CREATE INDEX idx_user_id ON document_storage(user_id);
CREATE INDEX idx_created_at ON document_storage(created_at DESC);
```

### S3 Object Structure

```
Bucket: devvit-documents
├── documents/
│   ├── {postId}/
│   │   ├── {userId}/
│   │   │   ├── {timestamp}_{filename}.pdf
│   │   │   └── {timestamp}_{filename}.pdf
```

**S3 Object Metadata:**
- `originalName`: Original file name
- `userId`: Reddit user ID
- `postId`: Reddit post ID
- `uploadedAt`: ISO timestamp

## API Endpoints

### Upload Document

**Endpoint:** `POST /api/documents/add`

**Request Body:**
```typescript
{
  fileName: string;
  fileType: string;
  fileData: string;      // Base64 encoded file data
  description: string;
  notes?: string;
}
```

**Response:**
```typescript
{
  type: 'document';
  document: DocumentMetadata;
}
```

**Logic:**
1. Decode base64 file data to buffer
2. Determine storage location based on file type and size
3. If PDF: Upload to external storage via adapter
4. Store metadata in Redis with storage reference
5. Return document metadata to client

### List Documents

**Endpoint:** `GET /api/documents/list`

**Response:**
```typescript
{
  type: 'documents-list';
  documents: DocumentMetadata[];
}
```

**Logic:**
1. Retrieve all document metadata from Redis
2. Return list (no binary data)

### Get Document URL

**Endpoint:** `GET /api/documents/get/:id`

**Response:**
```typescript
{
  url: string;           // Presigned URL (S3) or stream endpoint (PostgreSQL)
  expiresIn: number;     // Seconds until expiration
}
```

**Logic:**
1. Retrieve document metadata from Redis
2. If stored externally, call adapter.getUrl()
3. Return URL for client to access

### Stream Document (PostgreSQL Only)

**Endpoint:** `GET /api/documents/stream/:storageKey`

**Response:** Binary stream with appropriate Content-Type header

**Logic:**
1. Verify user has access to document
2. Retrieve binary data from PostgreSQL
3. Stream to client with proper headers

### Delete Document

**Endpoint:** `POST /api/documents/delete`

**Request Body:**
```typescript
{
  id: string;
}
```

**Response:**
```typescript
{
  status: 'success' | 'error';
  message?: string;
}
```

**Logic:**
1. Retrieve document metadata from Redis
2. If stored externally, call adapter.delete()
3. Remove metadata from Redis
4. Return success status

## Error Handling

### Error Types and Responses

```typescript
enum StorageErrorCode {
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  SIZE_LIMIT_EXCEEDED = 'SIZE_LIMIT_EXCEEDED',
}

interface StorageError {
  code: StorageErrorCode;
  message: string;
  details?: any;
}
```

### Error Handling Strategy

1. **Upload Failures:**
   - Retry up to 3 times with exponential backoff
   - If all retries fail, return 500 error
   - Do not save metadata to Redis if upload fails

2. **Download Failures:**
   - Return 404 if document not found
   - Return 500 if external storage unavailable
   - Log error details for debugging

3. **Delete Failures:**
   - Attempt external deletion first
   - Only remove Redis metadata if external deletion succeeds
   - If external deletion fails, keep metadata and return error

4. **Configuration Errors:**
   - Validate configuration on server startup
   - Log detailed error messages
   - Prevent server from starting if critical config missing

### Retry Logic

```typescript
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Testing Strategy

### Unit Tests

1. **Storage Adapter Tests:**
   - Mock S3 client and verify correct API calls
   - Mock PostgreSQL pool and verify correct queries
   - Test error handling and retry logic
   - Test configuration validation

2. **Storage Factory Tests:**
   - Test adapter selection based on environment
   - Test configuration validation
   - Test singleton pattern

3. **API Endpoint Tests:**
   - Test upload flow with mocked adapters
   - Test list/get/delete operations
   - Test error responses

### Integration Tests

1. **S3 Integration:**
   - Test actual upload to S3 bucket
   - Test presigned URL generation
   - Test deletion from S3

2. **PostgreSQL Integration:**
   - Test actual database operations
   - Test binary data storage and retrieval
   - Test streaming endpoint

3. **End-to-End Tests:**
   - Test complete upload-retrieve-delete flow
   - Test with both storage providers
   - Test backward compatibility with Redis storage

### Testing Environment

```bash
# S3 Testing (use LocalStack)
docker run -p 4566:4566 localstack/localstack

# PostgreSQL Testing
docker run -p 5432:5432 -e POSTGRES_PASSWORD=test postgres:15
```

## Configuration

### Environment Variables

```bash
# Storage Provider Selection
STORAGE_PROVIDER=s3  # or 'postgresql'

# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=devvit-documents

# PostgreSQL Configuration
POSTGRESQL_CONNECTION_STRING=postgresql://user:pass@host:5432/dbname
POSTGRESQL_SSL=true
SERVER_BASE_URL=https://your-app.reddit.com

# File Size Limits
MAX_FILE_SIZE_MB=10
```

### devvit.json Updates

```json
{
  "http": {
    "fetch": {
      "enabled": true,
      "domains": [
        "s3.amazonaws.com",
        "*.s3.amazonaws.com",
        "your-postgres-api.com"
      ]
    }
  }
}
```

## Security Considerations

### S3 Security

1. **Bucket Policy:**
   - Private bucket (no public access)
   - Access only via presigned URLs
   - Presigned URLs expire after 1 hour

2. **IAM Permissions:**
   - Minimal permissions (PutObject, GetObject, DeleteObject)
   - Scoped to specific bucket
   - Use IAM roles instead of access keys when possible

3. **Encryption:**
   - Enable S3 server-side encryption (SSE-S3 or SSE-KMS)
   - Encrypt data in transit (HTTPS only)

### PostgreSQL Security

1. **Connection Security:**
   - Use SSL/TLS for connections
   - Store connection string in environment variables
   - Use connection pooling with limits

2. **Access Control:**
   - Verify user authentication before streaming
   - Check document ownership via Redis metadata
   - Log all access attempts

3. **SQL Injection Prevention:**
   - Use parameterized queries
   - Validate all input
   - Sanitize storage keys

### General Security

1. **Authentication:**
   - Leverage Devvit's built-in Reddit authentication
   - Verify user context on all requests
   - Check document ownership before operations

2. **Rate Limiting:**
   - Implement upload rate limits per user
   - Limit concurrent operations
   - Monitor for abuse patterns

3. **Data Privacy:**
   - Never log sensitive data or credentials
   - Sanitize error messages
   - Implement audit logging

## Performance Considerations

### Optimization Strategies

1. **Caching:**
   - Cache presigned URLs in Redis (with expiration)
   - Cache frequently accessed metadata
   - Use Redis for fast document listing

2. **Compression:**
   - Compress PDFs before upload (if not already compressed)
   - Use gzip for API responses
   - Consider S3 compression features

3. **Parallel Operations:**
   - Upload to external storage and save metadata in parallel
   - Batch delete operations when possible
   - Use connection pooling for PostgreSQL

4. **Lazy Loading:**
   - Load document list without binary data
   - Generate URLs only when user requests access
   - Paginate document lists for large collections

### Performance Metrics

- Upload time: < 5 seconds for 10MB file
- List operation: < 500ms
- URL generation: < 200ms
- Delete operation: < 1 second

## Migration Strategy

### Phase 1: Add External Storage Support

1. Implement storage adapters
2. Add new API endpoints
3. Update document metadata structure
4. Deploy with feature flag disabled

### Phase 2: Enable for New Uploads

1. Enable external storage for new PDF uploads
2. Keep existing documents in Redis
3. Monitor performance and errors
4. Gather user feedback

### Phase 3: Optional Migration

1. Create migration script for existing documents
2. Migrate documents in batches
3. Verify data integrity
4. Update metadata references

### Rollback Plan

1. Disable external storage via environment variable
2. Fall back to Redis-only storage
3. Keep external data intact for recovery
4. Monitor for issues

## Monitoring and Logging

### Metrics to Track

1. **Upload Metrics:**
   - Upload success/failure rate
   - Average upload time
   - File size distribution
   - Storage provider usage

2. **Access Metrics:**
   - Document access frequency
   - URL generation time
   - Download success rate
   - Cache hit rate

3. **Storage Metrics:**
   - Total storage used per provider
   - Storage cost estimation
   - Document count per user/post
   - Retention and cleanup stats

### Logging Strategy

```typescript
// Structured logging format
{
  timestamp: ISO8601,
  level: 'info' | 'warn' | 'error',
  operation: 'upload' | 'download' | 'delete',
  provider: 's3' | 'postgresql',
  documentId: string,
  userId: string,
  postId: string,
  duration: number,
  success: boolean,
  error?: string
}
```

## Cost Analysis

### AWS S3 Costs (Estimated)

- Storage: $0.023 per GB/month
- PUT requests: $0.005 per 1,000 requests
- GET requests: $0.0004 per 1,000 requests
- Data transfer: $0.09 per GB (first 10TB)

**Example:** 1,000 users, 10 PDFs each (5MB avg)
- Storage: 50GB × $0.023 = $1.15/month
- Requests: ~10,000 × $0.005 = $0.05/month
- **Total: ~$1.20/month**

### PostgreSQL Costs (Neon)

- Free tier: 0.5GB storage, 100 hours compute/month
- Pro tier: $19/month (3GB storage, unlimited compute)

**Example:** Same 1,000 users scenario
- Storage: 50GB requires Pro tier
- **Total: $19/month minimum**

### Recommendation

- **Small scale (<1GB):** PostgreSQL (Neon free tier)
- **Medium scale (1-100GB):** S3 (more cost-effective)
- **Large scale (>100GB):** S3 with lifecycle policies
