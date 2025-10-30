/**
 * PostgreSQL Storage Adapter Implementation
 * 
 * This adapter stores PDF documents in a PostgreSQL database as BYTEA (binary data).
 * It provides connection pooling, SSL/TLS support, and SQL injection prevention.
 */

import { Pool, PoolConfig } from 'pg';
import {
  StorageAdapter,
  StorageMetadata,
  StorageResult,
  StorageError,
  StorageErrorCode,
} from './StorageAdapter.js';

/**
 * PostgreSQL Storage Adapter
 * 
 * Stores binary document data in PostgreSQL with metadata.
 * Uses connection pooling for efficient database access.
 */
export class PostgreSQLStorageAdapter implements StorageAdapter {
  private pool: Pool;
  private baseUrl: string;
  private isInitialized: boolean = false;
  private configured: boolean = false;

  constructor(config?: {
    connectionString: string;
    ssl: boolean;
    serverBaseUrl: string;
  }) {
    if (config) {
      this.baseUrl = config.serverBaseUrl;
      this.configured = !!(config.connectionString && config.serverBaseUrl);

      if (!this.configured) {
        console.warn('PostgreSQL adapter is not properly configured');
        this.pool = new Pool();
        return;
      }

      const poolConfig: PoolConfig = {
        connectionString: config.connectionString,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };

      this.pool = new Pool(poolConfig);
      this.isInitialized = true;
    } else {
      // Fallback to environment variables for local development
      const connectionString = process.env.POSTGRESQL_CONNECTION_STRING;
      const sslEnabled = process.env.POSTGRESQL_SSL === 'true';
      this.baseUrl = process.env.SERVER_BASE_URL || '';
      this.configured = !!(connectionString && this.baseUrl);

      if (!this.configured) {
        console.warn('PostgreSQL adapter is not properly configured');
        this.pool = new Pool();
        return;
      }

      const poolConfig: PoolConfig = {
        connectionString,
        ssl: sslEnabled ? { rejectUnauthorized: false } : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };

      this.pool = new Pool(poolConfig);
      this.isInitialized = true;
    }

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });

    console.log('PostgreSQL storage adapter initialized');
  }

  /**
   * Check if the adapter is properly configured
   */
  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Initialize database schema
   * Creates the document_storage table if it doesn't exist
   */
  async initializeSchema(): Promise<void> {
    if (!this.isInitialized) {
      throw new StorageError(
        StorageErrorCode.CONFIGURATION_ERROR,
        'PostgreSQL adapter is not properly configured'
      );
    }

    const createTableQuery = `
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

      CREATE INDEX IF NOT EXISTS idx_storage_key ON document_storage(storage_key);
      CREATE INDEX IF NOT EXISTS idx_post_id ON document_storage(post_id);
      CREATE INDEX IF NOT EXISTS idx_user_id ON document_storage(user_id);
      CREATE INDEX IF NOT EXISTS idx_created_at ON document_storage(created_at DESC);
    `;

    try {
      await this.pool.query(createTableQuery);
      console.log('PostgreSQL schema initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PostgreSQL schema:', error);
      throw new StorageError(
        StorageErrorCode.CONFIGURATION_ERROR,
        'Failed to initialize database schema',
        error
      );
    }
  }

  /**
   * Upload a file to PostgreSQL storage
   */
  async upload(buffer: Buffer, metadata: StorageMetadata): Promise<StorageResult> {
    if (!this.isInitialized) {
      throw new StorageError(
        StorageErrorCode.CONFIGURATION_ERROR,
        'PostgreSQL adapter is not properly configured'
      );
    }

    // Generate unique storage key
    const storageKey = `pg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Insert document into database with parameterized query (prevents SQL injection)
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

      console.log(`Document uploaded to PostgreSQL: ${storageKey}`);

      return {
        storageKey,
        provider: 'postgresql',
        url: `${this.baseUrl}/api/documents/stream/${storageKey}`,
      };
    } catch (error) {
      console.error('Failed to upload document to PostgreSQL:', error);
      throw new StorageError(
        StorageErrorCode.UPLOAD_FAILED,
        'Failed to upload document to PostgreSQL',
        error
      );
    }
  }

  /**
   * Get URL to access a stored document
   * Returns the server streaming endpoint URL
   */
  async getUrl(storageKey: string): Promise<string> {
    if (!this.isInitialized) {
      throw new StorageError(
        StorageErrorCode.CONFIGURATION_ERROR,
        'PostgreSQL adapter is not properly configured'
      );
    }

    // Verify document exists before returning URL
    try {
      const result = await this.pool.query(
        'SELECT storage_key FROM document_storage WHERE storage_key = $1',
        [storageKey]
      );

      if (result.rows.length === 0) {
        throw new StorageError(
          StorageErrorCode.NOT_FOUND,
          'Document not found in PostgreSQL storage'
        );
      }

      return `${this.baseUrl}/api/documents/stream/${storageKey}`;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      console.error('Failed to verify document in PostgreSQL:', error);
      throw new StorageError(
        StorageErrorCode.DOWNLOAD_FAILED,
        'Failed to generate document URL',
        error
      );
    }
  }

  /**
   * Delete a document from PostgreSQL storage
   */
  async delete(storageKey: string): Promise<void> {
    if (!this.isInitialized) {
      throw new StorageError(
        StorageErrorCode.CONFIGURATION_ERROR,
        'PostgreSQL adapter is not properly configured'
      );
    }

    try {
      // Delete document using parameterized query (prevents SQL injection)
      const result = await this.pool.query(
        'DELETE FROM document_storage WHERE storage_key = $1',
        [storageKey]
      );

      if (result.rowCount === 0) {
        throw new StorageError(
          StorageErrorCode.NOT_FOUND,
          'Document not found in PostgreSQL storage'
        );
      }

      console.log(`Document deleted from PostgreSQL: ${storageKey}`);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      console.error('Failed to delete document from PostgreSQL:', error);
      throw new StorageError(
        StorageErrorCode.DELETE_FAILED,
        'Failed to delete document from PostgreSQL',
        error
      );
    }
  }

  /**
   * Get document binary data and metadata
   * Helper method for streaming endpoint
   */
  async getDocument(storageKey: string): Promise<{ buffer: Buffer; contentType: string; fileName: string } | null> {
    if (!this.isInitialized) {
      throw new StorageError(
        StorageErrorCode.CONFIGURATION_ERROR,
        'PostgreSQL adapter is not properly configured'
      );
    }

    try {
      const result = await this.pool.query(
        `SELECT binary_data, file_type, file_name 
         FROM document_storage 
         WHERE storage_key = $1`,
        [storageKey]
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Update access tracking
      await this.pool.query(
        `UPDATE document_storage 
         SET accessed_at = NOW(), access_count = access_count + 1 
         WHERE storage_key = $1`,
        [storageKey]
      );

      return {
        buffer: result.rows[0].binary_data,
        contentType: result.rows[0].file_type,
        fileName: result.rows[0].file_name,
      };
    } catch (error) {
      console.error('Failed to retrieve document from PostgreSQL:', error);
      throw new StorageError(
        StorageErrorCode.DOWNLOAD_FAILED,
        'Failed to retrieve document from PostgreSQL',
        error
      );
    }
  }

  /**
   * Close the connection pool
   * Should be called when shutting down the server
   */
  async close(): Promise<void> {
    if (this.isInitialized) {
      await this.pool.end();
      console.log('PostgreSQL connection pool closed');
    }
  }
}
