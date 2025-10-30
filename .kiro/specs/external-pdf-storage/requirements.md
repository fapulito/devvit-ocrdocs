# Requirements Document

## Introduction

This specification defines the requirements for integrating external storage solutions (AWS S3 or PostgreSQL) to enable PDF document storage and retrieval in the Devvit Document Manager application. Currently, the application is limited by Redis's 512KB value size limit, preventing PDF storage. This feature will enable users to upload, store, and retrieve PDF documents by leveraging external storage while maintaining metadata in Redis for fast access.

## Glossary

- **Document Manager**: The Devvit application that manages document uploads and storage
- **Redis Store**: Devvit's built-in key-value storage with 512KB value size limit
- **External Storage Provider**: AWS S3 or PostgreSQL database used for storing large PDF files
- **Storage Adapter**: Server-side component that abstracts storage operations
- **Document Metadata**: Information about documents (name, size, type, upload date) stored in Redis
- **Binary Content**: The actual PDF file data stored in external storage
- **Presigned URL**: Time-limited URL for secure direct access to S3 objects
- **Storage Key**: Unique identifier linking metadata to external storage location
- **Client Application**: React-based frontend running in Reddit webview
- **Server Endpoint**: Express API route handling storage operations

## Requirements

### Requirement 1

**User Story:** As a Reddit user, I want to upload PDF documents to the Document Manager app, so that I can store and organize my important files within Reddit.

#### Acceptance Criteria

1. WHEN a user selects a PDF file through the upload interface, THE Client Application SHALL validate the file type is PDF and size is under 10MB
2. WHEN a valid PDF is selected, THE Client Application SHALL send the file to the server endpoint via multipart form data
3. WHEN the server receives a PDF upload request, THE Server Endpoint SHALL generate a unique Storage Key for the document
4. WHEN the Storage Key is generated, THE Storage Adapter SHALL upload the Binary Content to the External Storage Provider
5. WHEN the upload to external storage succeeds, THE Server Endpoint SHALL store Document Metadata in Redis Store with reference to the Storage Key

### Requirement 2

**User Story:** As a Reddit user, I want to view my uploaded PDF documents, so that I can access them when needed.

#### Acceptance Criteria

1. WHEN a user opens the Document Manager app, THE Client Application SHALL request the list of documents from the server endpoint
2. WHEN the server receives a list request, THE Server Endpoint SHALL retrieve all Document Metadata from Redis Store
3. WHEN a user clicks on a PDF document, THE Client Application SHALL request the document URL from the server endpoint
4. IF the External Storage Provider is S3, THEN THE Storage Adapter SHALL generate a Presigned URL with 1-hour expiration
5. IF the External Storage Provider is PostgreSQL, THEN THE Storage Adapter SHALL provide a server endpoint URL that streams the Binary Content
6. WHEN the URL is returned, THE Client Application SHALL open the PDF in a new browser tab

### Requirement 3

**User Story:** As a Reddit user, I want to delete PDF documents I no longer need, so that I can manage my storage space.

#### Acceptance Criteria

1. WHEN a user clicks the delete button on a document, THE Client Application SHALL send a delete request to the server endpoint with the document ID
2. WHEN the server receives a delete request, THE Server Endpoint SHALL retrieve the Storage Key from Redis Store
3. WHEN the Storage Key is retrieved, THE Storage Adapter SHALL delete the Binary Content from the External Storage Provider
4. WHEN the external deletion succeeds, THE Server Endpoint SHALL remove the Document Metadata from Redis Store
5. IF the external deletion fails, THEN THE Server Endpoint SHALL return an error and SHALL NOT remove metadata from Redis Store

### Requirement 4

**User Story:** As a developer, I want the storage solution to be configurable between S3 and PostgreSQL, so that I can choose the most appropriate option for my deployment.

#### Acceptance Criteria

1. WHEN the server starts, THE Storage Adapter SHALL read configuration from environment variables to determine the storage provider type
2. WHERE S3 is configured, THE Storage Adapter SHALL initialize with AWS credentials, bucket name, and region
3. WHERE PostgreSQL is configured, THE Storage Adapter SHALL initialize with database connection string and table schema
4. WHEN storage operations are requested, THE Storage Adapter SHALL route operations to the configured provider implementation
5. IF configuration is missing or invalid, THEN THE Server Endpoint SHALL log an error and SHALL NOT start

### Requirement 5

**User Story:** As a developer, I want secure authentication for external storage access, so that unauthorized users cannot access stored documents.

#### Acceptance Criteria

1. WHEN configuring S3 storage, THE Storage Adapter SHALL require AWS access key ID and secret access key via environment variables
2. WHEN configuring PostgreSQL storage, THE Storage Adapter SHALL require connection string with authentication credentials via environment variables
3. WHEN generating S3 Presigned URLs, THE Storage Adapter SHALL set expiration time to 1 hour maximum
4. WHEN serving PostgreSQL documents, THE Server Endpoint SHALL verify the requesting user has access to the document via Reddit authentication
5. THE Storage Adapter SHALL NOT expose credentials or connection strings in logs or error messages

### Requirement 6

**User Story:** As a developer, I want comprehensive error handling for storage operations, so that users receive clear feedback when issues occur.

#### Acceptance Criteria

1. WHEN an upload to External Storage Provider fails, THE Server Endpoint SHALL return a 500 error with message "Failed to upload document"
2. WHEN a document retrieval fails, THE Server Endpoint SHALL return a 404 error with message "Document not found"
3. WHEN a delete operation fails, THE Server Endpoint SHALL return a 500 error with message "Failed to delete document"
4. WHEN storage configuration is invalid, THE Server Endpoint SHALL log detailed error information for debugging
5. WHEN network errors occur, THE Storage Adapter SHALL retry operations up to 3 times with exponential backoff

### Requirement 7

**User Story:** As a developer, I want to maintain backward compatibility with existing image storage, so that current functionality continues to work.

#### Acceptance Criteria

1. WHEN a user uploads an image file, THE Server Endpoint SHALL continue storing the Binary Content in Redis Store as base64
2. WHEN a user uploads a PDF file, THE Server Endpoint SHALL store the Binary Content in External Storage Provider
3. WHEN retrieving documents, THE Server Endpoint SHALL determine storage location based on Document Metadata
4. THE Storage Adapter SHALL support both Redis-based and external storage retrieval in the same codebase
5. THE Client Application SHALL handle both inline base64 images and external PDF URLs without modification

### Requirement 8

**User Story:** As a system administrator, I want monitoring and logging for storage operations, so that I can troubleshoot issues and track usage.

#### Acceptance Criteria

1. WHEN a document is uploaded, THE Server Endpoint SHALL log the document ID, size, and storage provider used
2. WHEN a document is retrieved, THE Server Endpoint SHALL log the document ID and access timestamp
3. WHEN a document is deleted, THE Server Endpoint SHALL log the document ID and deletion timestamp
4. WHEN storage errors occur, THE Storage Adapter SHALL log error details including provider type and operation attempted
5. THE Server Endpoint SHALL track total storage usage per user in Redis Store metadata
