/**
 * Storage Factory
 * 
 * Factory class for creating and managing storage adapter instances.
 * Implements singleton pattern to ensure only one adapter instance exists.
 */

import { StorageAdapter, StorageError, StorageErrorCode } from './StorageAdapter.js';
import { S3StorageAdapter } from './S3StorageAdapter.js';
import { PostgreSQLStorageAdapter } from './PostgreSQLStorageAdapter.js';
import { AppConfig } from '../config.js';

/**
 * Supported storage provider types
 */
export type StorageProvider = 's3' | 'postgresql' | 'redis';

/**
 * Environment variable configuration for storage providers
 */
interface StorageConfig {
  provider: StorageProvider;
  s3?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
  };
  postgresql?: {
    connectionString: string;
    ssl: boolean;
    serverBaseUrl: string;
  };
}

/**
 * Factory class for creating storage adapter instances
 */
export class StorageFactory {
  private static instance: StorageAdapter | null = null;
  private static config: StorageConfig | null = null;

  /**
   * Get the configured storage adapter instance
   * @param appConfig - Configuration from Redis (optional, uses env vars if not provided)
   * @returns Configured storage adapter
   * @throws StorageError if configuration is invalid or adapter cannot be created
   */
  static getAdapter(appConfig?: AppConfig): StorageAdapter {
    if (this.instance) {
      return this.instance;
    }

    // Load and validate configuration
    this.config = appConfig ? this.loadConfigurationFromAppConfig(appConfig) : this.loadConfiguration();
    this.validateConfiguration(this.config);

    // Create adapter based on provider
    this.instance = this.createAdapter(this.config);

    // Verify adapter is properly configured
    if (!this.instance.isConfigured()) {
      throw new StorageError(
        StorageErrorCode.CONFIGURATION_ERROR,
        `Storage provider ${this.config.provider} is not properly configured. Check configuration in Redis.`
      );
    }

    console.log(`[StorageFactory] Storage adapter initialized: ${this.config.provider}`);
    return this.instance;
  }

  /**
   * Load configuration from AppConfig (Redis-based)
   */
  private static loadConfigurationFromAppConfig(appConfig: AppConfig): StorageConfig {
    const config: StorageConfig = {
      provider: appConfig.storageProvider,
    };

    if (appConfig.storageProvider === 's3') {
      config.s3 = {
        region: appConfig.awsRegion || 'us-east-1',
        accessKeyId: appConfig.awsAccessKeyId || '',
        secretAccessKey: appConfig.awsSecretAccessKey || '',
        bucket: appConfig.awsS3Bucket || '',
      };
    } else if (appConfig.storageProvider === 'postgresql') {
      config.postgresql = {
        connectionString: appConfig.postgresqlConnectionString || '',
        ssl: appConfig.postgresqlSsl || false,
        serverBaseUrl: appConfig.serverBaseUrl || '',
      };
    }

    return config;
  }

  /**
   * Load storage configuration from environment variables
   * @returns Storage configuration object
   */
  private static loadConfiguration(): StorageConfig {
    const provider = (process.env.STORAGE_PROVIDER || 's3') as StorageProvider;

    const config: StorageConfig = {
      provider,
    };

    if (provider === 's3') {
      config.s3 = {
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        bucket: process.env.AWS_S3_BUCKET || '',
      };
    } else if (provider === 'postgresql') {
      config.postgresql = {
        connectionString: process.env.POSTGRESQL_CONNECTION_STRING || '',
        ssl: process.env.POSTGRESQL_SSL === 'true',
        serverBaseUrl: process.env.SERVER_BASE_URL || '',
      };
    }

    return config;
  }

  /**
   * Validate storage configuration
   * @param config - Storage configuration to validate
   * @throws StorageError if configuration is invalid
   */
  private static validateConfiguration(config: StorageConfig): void {
    if (!config.provider) {
      throw new StorageError(
        StorageErrorCode.CONFIGURATION_ERROR,
        'STORAGE_PROVIDER environment variable is required'
      );
    }

    if (!['s3', 'postgresql'].includes(config.provider)) {
      throw new StorageError(
        StorageErrorCode.CONFIGURATION_ERROR,
        `Invalid storage provider: ${config.provider}. Must be 's3' or 'postgresql'`
      );
    }

    if (config.provider === 's3') {
      this.validateS3Configuration(config.s3!);
    } else if (config.provider === 'postgresql') {
      this.validatePostgreSQLConfiguration(config.postgresql!);
    }
  }

  /**
   * Validate S3-specific configuration
   * @param s3Config - S3 configuration to validate
   * @throws StorageError if S3 configuration is invalid
   */
  private static validateS3Configuration(s3Config: StorageConfig['s3']): void {
    const requiredVars = [
      { name: 'AWS_ACCESS_KEY_ID', value: s3Config?.accessKeyId },
      { name: 'AWS_SECRET_ACCESS_KEY', value: s3Config?.secretAccessKey },
      { name: 'AWS_S3_BUCKET', value: s3Config?.bucket },
    ];

    const missing = requiredVars.filter((v) => !v.value);

    if (missing.length > 0) {
      throw new StorageError(
        StorageErrorCode.CONFIGURATION_ERROR,
        `Missing required S3 configuration: ${missing.map((v) => v.name).join(', ')}`
      );
    }
  }

  /**
   * Validate PostgreSQL-specific configuration
   * @param pgConfig - PostgreSQL configuration to validate
   * @throws StorageError if PostgreSQL configuration is invalid
   */
  private static validatePostgreSQLConfiguration(
    pgConfig: StorageConfig['postgresql']
  ): void {
    const requiredVars = [
      { name: 'POSTGRESQL_CONNECTION_STRING', value: pgConfig?.connectionString },
      { name: 'SERVER_BASE_URL', value: pgConfig?.serverBaseUrl },
    ];

    const missing = requiredVars.filter((v) => !v.value);

    if (missing.length > 0) {
      throw new StorageError(
        StorageErrorCode.CONFIGURATION_ERROR,
        `Missing required PostgreSQL configuration: ${missing.map((v) => v.name).join(', ')}`
      );
    }
  }

  /**
   * Create storage adapter instance based on configuration
   * @param config - Storage configuration
   * @returns Storage adapter instance
   * @throws StorageError if adapter cannot be created
   */
  private static createAdapter(config: StorageConfig): StorageAdapter {
    switch (config.provider) {
      case 's3':
        return new S3StorageAdapter(config.s3);
      case 'postgresql':
        return new PostgreSQLStorageAdapter(config.postgresql);
      default:
        throw new StorageError(
          StorageErrorCode.CONFIGURATION_ERROR,
          `Unknown storage provider: ${config.provider}`
        );
    }
  }

  /**
   * Reset the factory (useful for testing)
   */
  static reset(): void {
    this.instance = null;
    this.config = null;
  }

  /**
   * Get current configuration (useful for debugging)
   * @returns Current storage configuration (with sensitive data masked)
   */
  static getConfig(): Partial<StorageConfig> | null {
    if (!this.config) {
      return null;
    }

    // Return config with sensitive data masked
    const maskedConfig: Partial<StorageConfig> = {
      provider: this.config.provider,
    };

    if (this.config.s3) {
      maskedConfig.s3 = {
        region: this.config.s3.region,
        accessKeyId: this.maskSensitiveData(this.config.s3.accessKeyId),
        secretAccessKey: '***MASKED***',
        bucket: this.config.s3.bucket,
      };
    }

    if (this.config.postgresql) {
      maskedConfig.postgresql = {
        connectionString: this.maskSensitiveData(this.config.postgresql.connectionString),
        ssl: this.config.postgresql.ssl,
        serverBaseUrl: this.config.postgresql.serverBaseUrl,
      };
    }

    return maskedConfig;
  }

  /**
   * Mask sensitive data for logging
   * @param data - Data to mask
   * @returns Masked data showing only first and last few characters
   */
  private static maskSensitiveData(data: string): string {
    if (!data || data.length < 8) {
      return '***MASKED***';
    }
    return `${data.substring(0, 4)}...${data.substring(data.length - 4)}`;
  }
}
