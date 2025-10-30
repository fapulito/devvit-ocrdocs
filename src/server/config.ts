/**
 * Configuration management for the app
 * Stores sensitive configuration in Redis since Devvit doesn't support environment variables
 */

import { RedisClient } from '@devvit/web/server';

const CONFIG_KEY = 'app:config';

export interface AppConfig {
  storageProvider: 's3' | 'postgresql' | 'redis';
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsS3Bucket?: string;
  postgresqlConnectionString?: string;
  postgresqlSsl?: boolean;
  serverBaseUrl?: string;
  maxFileSizeMB?: number;
}

/**
 * Get configuration from Redis
 */
export async function getConfig(redis: RedisClient): Promise<AppConfig> {
  const configJson = await redis.get(CONFIG_KEY);
  
  if (configJson) {
    return JSON.parse(configJson);
  }
  
  // Default configuration - REPLACE THESE WITH YOUR ACTUAL VALUES
  return {
    storageProvider: 's3',
    awsRegion: 'us-east-1',
    awsAccessKeyId: 'YOUR_ACCESS_KEY_HERE',
    awsSecretAccessKey: 'YOUR_SECRET_KEY_HERE',
    awsS3Bucket: 'devvit-ocr',
    maxFileSizeMB: 10,
  };
}

/**
 * Set configuration in Redis
 */
export async function setConfig(redis: RedisClient, config: AppConfig): Promise<void> {
  await redis.set(CONFIG_KEY, JSON.stringify(config));
}
