/**
 * S3 Storage Adapter Implementation
 * 
 * This module implements the StorageAdapter interface for AWS S3,
 * providing upload, retrieval, and deletion capabilities for PDF documents.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  StorageAdapter,
  StorageMetadata,
  StorageResult,
  StorageError,
  StorageErrorCode,
} from './StorageAdapter.js';

/**
 * Retry an operation with exponential backoff
 * @param operation - The async operation to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @returns The result of the operation
 */
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * S3 Storage Adapter
 * 
 * Implements storage operations using AWS S3 with presigned URLs for secure access
 */
export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client;
  private bucketName: string;
  private region: string;
  private configured: boolean;

  constructor(config?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
  }) {
    if (config) {
      this.region = config.region;
      this.bucketName = config.bucket;
      this.configured = !!(config.accessKeyId && config.secretAccessKey && config.bucket);

      this.client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
    } else {
      // Fallback to environment variables for local development
      this.region = process.env.AWS_REGION || 'us-east-1';
      this.bucketName = process.env.AWS_S3_BUCKET || '';
      this.configured = !!(
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY &&
        process.env.AWS_S3_BUCKET
      );

      this.client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      });
    }
  }

  /**
   * Check if the S3 adapter is properly configured
   * @returns true if all required configuration is set
   */
  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Upload a file to S3
   * @param buffer - File binary data
   * @param metadata - File metadata
   * @returns Storage result with key, provider, and presigned URL
   */
  async upload(buffer: Buffer, metadata: StorageMetadata): Promise<StorageResult> {
    if (!this.isConfigured()) {
      throw new StorageError(
        StorageErrorCode.CONFIGURATION_ERROR,
        'S3 storage is not properly configured'
      );
    }

    // Generate unique storage key with path structure
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const sanitizedFileName = metadata.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `documents/${metadata.postId}/${metadata.userId}/${timestamp}_${randomSuffix}_${sanitizedFileName}`;

    try {
      // Upload to S3 with retry logic
      await retryOperation(async () => {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
          Body: buffer,
          ContentType: metadata.fileType,
          Metadata: {
            originalName: metadata.fileName,
            userId: metadata.userId,
            postId: metadata.postId,
            fileSize: metadata.fileSize.toString(),
            uploadedAt: new Date().toISOString(),
          },
        });

        await this.client.send(command);
      });

      // Generate presigned URL for immediate access
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
      });
      const url = await getSignedUrl(this.client, getCommand, { expiresIn: 3600 });

      console.log(`Successfully uploaded document to S3: ${storageKey}`);

      return {
        storageKey,
        provider: 's3',
        url,
      };
    } catch (error) {
      console.error('S3 upload failed:', error);
      throw new StorageError(
        StorageErrorCode.UPLOAD_FAILED,
        'Failed to upload document to S3',
        error
      );
    }
  }

  /**
   * Generate a presigned URL to access a stored file
   * @param storageKey - Unique identifier for the stored file
   * @returns Presigned URL valid for 1 hour
   */
  async getUrl(storageKey: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new StorageError(
        StorageErrorCode.CONFIGURATION_ERROR,
        'S3 storage is not properly configured'
      );
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn: 3600 });
      console.log(`Generated presigned URL for: ${storageKey}`);
      return url;
    } catch (error) {
      console.error('Failed to generate presigned URL:', error);
      throw new StorageError(
        StorageErrorCode.DOWNLOAD_FAILED,
        'Failed to generate access URL',
        error
      );
    }
  }

  /**
   * Delete a file from S3
   * @param storageKey - Unique identifier for the stored file
   */
  async delete(storageKey: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new StorageError(
        StorageErrorCode.CONFIGURATION_ERROR,
        'S3 storage is not properly configured'
      );
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
      });

      await this.client.send(command);
      console.log(`Successfully deleted document from S3: ${storageKey}`);
    } catch (error) {
      console.error('S3 deletion failed:', error);
      throw new StorageError(
        StorageErrorCode.DELETE_FAILED,
        'Failed to delete document from S3',
        error
      );
    }
  }
}
