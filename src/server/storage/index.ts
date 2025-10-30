/**
 * Storage Module Exports
 * 
 * Central export point for storage adapter infrastructure
 */

export type {
  StorageAdapter,
  StorageMetadata,
  StorageResult,
} from './StorageAdapter.js';

export {
  StorageError,
  StorageErrorCode,
} from './StorageAdapter.js';

export { StorageFactory } from './StorageFactory.js';
export type { StorageProvider } from './StorageFactory.js';
