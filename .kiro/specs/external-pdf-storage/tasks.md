# Implementation Plan: External PDF Storage Integration

## Overview

This implementation plan breaks down the external PDF storage feature into discrete, actionable coding tasks. Each task builds incrementally on previous work, ensuring the feature is integrated step-by-step with proper testing and validation.

## Tasks

- [x] 1. Create storage adapter infrastructure and interfaces

  - Define the `StorageAdapter` interface with upload, getUrl, delete, and isConfigured methods in `src/server/storage/StorageAdapter.ts`
  - Create TypeScript types for `StorageMetadata`, `StorageResult`, and error handling
  - Implement the `StorageFactory` class with singleton pattern and provider selection logic
  - Add environment variable validation for storage configuration
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2. Implement S3 storage adapter

  - [x] 2.1 Create S3StorageAdapter class with AWS SDK integration

    - Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` packages
    - Implement constructor with S3Client initialization from environment variables
    - Implement `isConfigured()` method to validate AWS credentials and bucket name
    - _Requirements: 4.2, 5.1, 5.5_

  - [x] 2.2 Implement S3 upload functionality

    - Write `upload()` method that generates unique storage keys with path structure
    - Use PutObjectCommand to upload buffer to S3 with proper content type and metadata
    - Generate presigned URL for immediate access after upload
    - Implement retry logic with exponential backoff for failed uploads
    - _Requirements: 1.3, 1.4, 1.5, 6.6_

  - [x] 2.3 Implement S3 retrieval and deletion

    - Write `getUrl()` method to generate presigned URLs with 1-hour expiration
    - Write `delete()` method using DeleteObjectCommand
    - Add error handling for missing objects and network failures
    - _Requirements: 2.4, 2.5, 3.3, 3.4, 5.3_

- [x] 3. Implement PostgreSQL storage adapter

  - [x] 3.1 Create PostgreSQL schema and adapter class

    - Install `pg` package for PostgreSQL connectivity
    - Create database schema with `document_storage` table including indexes
    - Implement PostgreSQLStorageAdapter class with connection pool initialization

    - Implement `isConfigured()` method to validate connection string
    - _Requirements: 4.3, 5.2, 5.5_

  - [x] 3.2 Implement PostgreSQL upload and retrieval

    - Write `upload()` method that inserts binary data as BYTEA with metadata
    - Generate storage keys with unique identifiers
    - Write `getUrl()` method that returns server streaming endpoint URL
    - Implement `getDocument()` helper method for retrieving binary data
    - _Requirements: 1.3, 1.4, 1.5, 2.4, 2.5_

  - [x] 3.3 Implement PostgreSQL deletion and connection management

    - Write `delete()` method with parameterized query
    - Implement connection pooling with proper limits
    - Add SSL/TLS configuration support
    - Implement SQL injection prevention with parameterized queries
    - _Requirements: 3.3, 3.4, 5.2_

- [x] 4. Update document metadata structure in shared types

  - Extend the `Document` interface in `src/shared/types/api.ts` to include storage provider and storage key fields
  - Add `storageProvider` field with type `'redis' | 's3' | 'postgresql'`
  - Add optional `storageKey` field for external storage references
  - Make `imageData` field optional since PDFs won't use it
  - Add `fileSize` field to track document size
  - _Requirements: 1.5, 7.3_

- [x] 5. Implement document upload endpoint with storage routing

  - [x] 5.1 Update /api/documents/add endpoint for file type detection

    - Add logic to determine if file is PDF based on MIME type
    - Add file size validation (max 10MB)
    - Decode base64 file data to Buffer for processing
    - _Requirements: 1.1, 1.2_

  - [x] 5.2 Implement storage routing logic

    - If file is image (not PDF), continue using Redis storage with base64 encoding
    - If file is PDF, use StorageFactory to get configured adapter
    - Call adapter.upload() with buffer and metadata
    - Store returned storage key and provider in document metadata
    - _Requirements: 1.3, 1.4, 7.1, 7.2, 7.4_

  - [x] 5.3 Update Redis metadata storage

    - Save document metadata to Redis with storage provider and key
    - Ensure backward compatibility with existing image documents
    - Implement error handling that prevents metadata save if external upload fails
    - Add logging for upload operations with document ID and provider
    - _Requirements: 1.5, 6.1, 6.4, 8.1_

- [x] 6. Implement document retrieval endpoint

  - Create new `GET /api/documents/get/:id` endpoint
  - Retrieve document metadata from Redis by ID
  - Check storage provider field to determine retrieval method
  - If stored in Redis, return base64 data directly
  - If stored externally, call adapter.getUrl() to get access URL
  - Return URL with expiration time to client
  - Add logging for retrieval operations
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.3, 8.2_

- [x] 7. Implement PostgreSQL streaming endpoint

  - Create new `GET /api/documents/stream/:storageKey` endpoint
  - Verify user authentication using Devvit context
  - Retrieve document metadata from Redis to verify ownership

  - Call PostgreSQLStorageAdapter.getDocument() to get binary data
  - Stream binary data to client with proper Content-Type and Content-Disposition headers
  - Return 404 if document not found, 401 if unauthorized
  - _Requirements: 2.5, 5.4_

- [x] 8. Update document deletion endpoint

  - Modify existing `/api/documents/delete` endpoint to handle external storage
  - Retrieve document metadata from Redis to get storage provider and key
  - If stored externally, call adapter.delete() before removing from Redis
  - Only remove Redis metadata if external deletion succeeds
  - If external deletion fails, return error and keep metadata intact
  - Add logging for deletion operations
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.3_

- [x] 9. Update client components for PDF handling


  - [x] 9.1 Update DocumentUploader component

    - Add file type validation to accept PDFs
    - Update file size limit display to show 10MB for PDFs
    - Add loading state during upload with progress indication
    - Handle upload errors with user-friendly messages
    - _Requirements: 1.1, 1.2, 6.1_

  - [x] 9.2 Update DocumentsList component

    - Add logic to handle external document URLs vs base64 data
    - When user clicks PDF document, fetch URL from server and open in new tab
    - Add visual indicator for PDF documents vs images
    - Update error handling for failed URL generation
    - Ensure backward compatibility with existing image display
    - _Requirements: 2.3, 2.6, 7.5_

- [ ] 10. Add environment configuration and documentation

  - Create `.env.template` with all required environment variables for both S3 and PostgreSQL
  - Add configuration validation on server startup
  - Update `devvit.json` to whitelist required external domains (S3, PostgreSQL API)
  - Create `EXTERNAL_STORAGE_SETUP.md` documentation with setup instructions for both providers
  - Document cost analysis and provider selection guidance
  - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2_

- [ ] 11. Implement error handling and retry logic

  - Create error types and codes for storage operations
  - Implement retry mechanism with exponential backoff for network failures
  - Add comprehensive error logging with operation context
  - Ensure errors don't expose credentials or sensitive information
  - Add user-facing error messages for common failure scenarios
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 8.4_

- [ ] 12. Add monitoring and usage tracking

  - Implement logging for all storage operations with structured format
  - Track storage usage per user in Redis metadata
  - Log upload/download/delete operations with timestamps and providers
  - Add performance metrics logging (operation duration)
  - Create helper functions for consistent log formatting
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 13. Create integration tests for storage adapters

  - Write tests for S3StorageAdapter using mocked AWS SDK
  - Write tests for PostgreSQLStorageAdapter using test database
  - Test upload, retrieval, and deletion flows
  - Test error handling and retry logic
  - Test configuration validation
  - _Requirements: All requirements_

- [ ] 14. Create end-to-end tests
  - Test complete upload-retrieve-delete flow for PDFs
  - Test backward compatibility with existing image storage
  - Test both S3 and PostgreSQL providers
  - Test error scenarios and edge cases
  - Verify security and authentication
  - _Requirements: All requirements_
