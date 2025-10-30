/**
 * Storage Adapter Interface for External PDF Storage
 * 
 * This module defines the core interfaces and types for the storage adapter pattern,
 * enabling flexible storage backend selection (S3, PostgreSQL, etc.)
 */

/**
 * Metadata associated with a file being stored
 */
export interface StorageMetadata {
  fileName: string;
  fileType: string;
  fileSize: number;
  userId: string;
  postId: string;
}

/**
 * Result returned after a successful upload operation
 */
export interface StorageResult {
  storageKey: string;
  provider: 's3' | 'postgresql' | 'redis';
  url?: string; // For immediate access (S3 presigned URL)
}

/**
 * Error codes for storage operations
 */
export enum StorageErrorCode {
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  SIZE_LIMIT_EXCEEDED = 'SIZE_LIMIT_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

/**
 * Custom error class for storage operations
 */
export class StorageError extends Error {
  constructor(
    public code: StorageErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Abstract interface for storage adapters
 * 
 * All storage implementations (S3, PostgreSQL, etc.) must implement this interface
 */
export interface StorageAdapter {
  /**
   * Upload a file to external storage
   * @param buffer - File binary data
   * @param metadata - File metadata
   * @returns Storage key and provider information
   * @throws StorageError if upload fails
   */
  upload(buffer: Buffer, metadata: StorageMetadata): Promise<StorageResult>;

  /**
   * Get a URL to access the stored file
   * @param storageKey - Unique identifier for the stored file
   * @returns URL to access the file (presigned for S3, endpoint for PostgreSQL)
   * @throws StorageError if URL generation fails
   */
  getUrl(storageKey: string): Promise<string>;

  /**
   * Delete a file from external storage
   * @param storageKey - Unique identifier for the stored file
   * @throws StorageError if deletion fails
   */
  delete(storageKey: string): Promise<void>;

  /**
   * Check if the adapter is properly configured
   * @returns true if all required configuration is present and valid
   */
  isConfigured(): boolean;
}
