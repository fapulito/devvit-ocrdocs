import express from 'express';
import crypto from 'crypto';
import {
  InitResponse,
  IncrementResponse,
  DecrementResponse,
  DocumentsListResponse,
  DocumentRetrievalResponse,
  Document,
  AnalysisResponse,
} from '../shared/types/api';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post';
import { StorageFactory } from './storage/StorageFactory';
import { analyzeDocument } from './ai/gemini';

const app = express();

// Middleware for JSON body parsing with increased limit
app.use(express.json({ limit: '2mb' }));
// Middleware for URL-encoded body parsing with increased limit
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
// Middleware for plain text body parsing
app.use(express.text({ limit: '2mb' }));

const router = express.Router();

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const [count, username] = await Promise.all([
        redis.get('count'),
        reddit.getCurrentUsername(),
      ]);

      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

// Document endpoints
router.post('/api/documents/add', async (req, res): Promise<void> => {
  const { postId } = context;
  if (!postId) {
    res.status(400).json({ status: 'error', message: 'postId is required' });
    return;
  }

  try {
    const { fileName, fileType, fileData, description, notes } = req.body;

    if (!fileData || !description) {
      res.status(400).json({ status: 'error', message: 'Missing required fields' });
      return;
    }

    // Subtask 5.1: File type detection and validation
    const isPDF = fileType === 'application/pdf' || fileType.includes('pdf');

    // Decode base64 file data to Buffer for processing
    const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    const buffer = Buffer.from(base64Data, 'base64');
    const fileSize = buffer.length;

    // File size validation (max 500KB for Redis storage)
    const MAX_FILE_SIZE = 500 * 1024; // 500KB in bytes
    if (fileSize > MAX_FILE_SIZE) {
      res.status(400).json({
        status: 'error',
        message: `File size exceeds maximum limit of 500KB. Current size: ${(fileSize / 1024).toFixed(2)}KB`,
      });
      return;
    }

    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const username = await reddit.getCurrentUsername();

    let document: Document;

    // Store all files (images and PDFs) in Redis as base64
    // External storage (S3/PostgreSQL) doesn't work in Devvit production
    // because AWS SDK requires environment variables that Devvit doesn't support
    document = {
      id: documentId,
      fileName,
      fileType,
      fileSize,
      imageData: fileData, // Store base64 data for both images and PDFs
      description,
      notes: notes || '',
      timestamp: Date.now(),
      storageProvider: 'redis',
    };

    console.log(
      `[Upload] Document ${documentId} stored in Redis (${isPDF ? 'PDF' : 'image'}, ${(fileSize / 1024).toFixed(2)}KB)`
    );

    // Subtask 5.3: Update Redis metadata storage
    // Save document metadata to Redis with storage provider and key
    const key = `docs:${postId}:list`;
    const existing = await redis.get(key);
    const documents = existing ? JSON.parse(existing) : [];

    documents.unshift(document);
    // Keep last 20 documents to avoid payload size issues
    if (documents.length > 20) documents.pop();

    await redis.set(key, JSON.stringify(documents));

    console.log(
      `[Upload] Document ${documentId} metadata saved to Redis with provider: ${document.storageProvider}`
    );

    res.json({ type: 'document', document });
  } catch (error) {
    console.error('[Upload Error] Error adding document:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to add document',
    });
  }
});

router.get('/api/documents/list', async (_req, res): Promise<void> => {
  const { postId } = context;
  if (!postId) {
    res.status(400).json({ status: 'error', message: 'postId is required' });
    return;
  }

  try {
    const key = `docs:${postId}:list`;
    const existing = await redis.get(key);
    const documents = existing ? JSON.parse(existing) : [];

    res.json({ type: 'documents-list', documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch documents' });
  }
});

router.get('/api/documents/get/:id', async (req, res): Promise<void> => {
  const { postId } = context;
  if (!postId) {
    res.status(400).json({ status: 'error', message: 'postId is required' });
    return;
  }

  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ status: 'error', message: 'Document ID is required' });
      return;
    }

    // Retrieve document metadata from Redis by ID
    const key = `docs:${postId}:list`;
    const existing = await redis.get(key);
    const documents: Document[] = existing ? JSON.parse(existing) : [];

    const document = documents.find((doc: Document) => doc.id === id);

    if (!document) {
      console.log(`[Retrieval] Document ${id} not found in Redis`);
      res.status(404).json({ status: 'error', message: 'Document not found' });
      return;
    }

    console.log(`[Retrieval] Document ${id} found with provider: ${document.storageProvider}`);

    // Check storage provider field to determine retrieval method
    if (document.storageProvider === 'redis') {
      // If stored in Redis, return base64 data directly
      console.log(`[Retrieval] Returning base64 data for document ${id} from Redis`);
      res.json({
        type: 'document-retrieval',
        imageData: document.imageData,
        storageProvider: 'redis',
      });
    } else {
      // If stored externally, call adapter.getUrl() to get access URL
      if (!document.storageKey) {
        console.error(
          `[Retrieval Error] Document ${id} has external storage provider but no storage key`
        );
        res.status(500).json({ status: 'error', message: 'Document storage key missing' });
        return;
      }

      try {
        const storageAdapter = StorageFactory.getAdapter();
        const url = await storageAdapter.getUrl(document.storageKey);

        // Return URL with expiration time to client
        // S3 presigned URLs expire in 1 hour (3600 seconds)
        // PostgreSQL stream endpoints don't expire but we use the same format
        const expiresIn = document.storageProvider === 's3' ? 3600 : undefined;

        console.log(
          `[Retrieval] Generated URL for document ${id} from ${document.storageProvider}`
        );

        res.json({
          type: 'document-retrieval',
          url,
          expiresIn,
          storageProvider: document.storageProvider,
        });
      } catch (storageError) {
        console.error(`[Retrieval Error] Failed to get URL for document ${id}:`, storageError);
        res.status(500).json({
          status: 'error',
          message: 'Failed to retrieve document URL',
        });
      }
    }
  } catch (error) {
    console.error('[Retrieval Error] Error retrieving document:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to retrieve document',
    });
  }
});

// PostgreSQL streaming endpoint
router.get('/api/documents/stream/:storageKey', async (req, res): Promise<void> => {
  const { postId } = context;

  // Verify user authentication using Devvit context
  if (!postId) {
    console.log('[Stream] Unauthorized access attempt - no postId in context');
    res.status(401).json({ status: 'error', message: 'Unauthorized' });
    return;
  }

  try {
    const { storageKey } = req.params;

    if (!storageKey) {
      res.status(400).json({ status: 'error', message: 'Storage key is required' });
      return;
    }

    // Retrieve document metadata from Redis to verify ownership
    const key = `docs:${postId}:list`;
    const existing = await redis.get(key);
    const documents: Document[] = existing ? JSON.parse(existing) : [];

    // Find document with matching storage key to verify it belongs to this post
    const document = documents.find((doc: Document) => doc.storageKey === storageKey);

    if (!document) {
      console.log(`[Stream] Document with storage key ${storageKey} not found in post ${postId}`);
      res.status(404).json({ status: 'error', message: 'Document not found' });
      return;
    }

    // Verify this is a PostgreSQL-stored document
    if (document.storageProvider !== 'postgresql') {
      console.log(
        `[Stream] Document ${storageKey} is not stored in PostgreSQL (provider: ${document.storageProvider})`
      );
      res.status(400).json({ status: 'error', message: 'Invalid storage provider for streaming' });
      return;
    }

    // Call PostgreSQLStorageAdapter.getDocument() to get binary data
    const storageAdapter = StorageFactory.getAdapter();

    // Type guard to ensure we have PostgreSQL adapter
    if (!('getDocument' in storageAdapter)) {
      console.error('[Stream] Storage adapter does not support getDocument method');
      res
        .status(500)
        .json({ status: 'error', message: 'Storage adapter does not support streaming' });
      return;
    }

    const documentData = await (storageAdapter as any).getDocument(storageKey);

    if (!documentData) {
      console.log(`[Stream] Document ${storageKey} not found in PostgreSQL storage`);
      res.status(404).json({ status: 'error', message: 'Document not found' });
      return;
    }

    // Stream binary data to client with proper Content-Type and Content-Disposition headers
    res.setHeader('Content-Type', documentData.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${documentData.fileName}"`);
    res.setHeader('Content-Length', documentData.buffer.length);

    console.log(`[Stream] Streaming document ${storageKey} (${documentData.fileName}) to client`);

    res.send(documentData.buffer);
  } catch (error) {
    console.error('[Stream Error] Error streaming document:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to stream document',
    });
  }
});

router.post('/api/documents/delete', async (req, res): Promise<void> => {
  const { postId } = context;
  if (!postId) {
    res.status(400).json({ status: 'error', message: 'postId is required' });
    return;
  }

  try {
    const { id } = req.body;

    if (!id) {
      res.status(400).json({ status: 'error', message: 'Document ID is required' });
      return;
    }

    // Retrieve document metadata from Redis to get storage provider and key
    const key = `docs:${postId}:list`;
    const existing = await redis.get(key);
    const documents: Document[] = existing ? JSON.parse(existing) : [];

    const document = documents.find((doc: Document) => doc.id === id);

    if (!document) {
      console.log(`[Delete] Document ${id} not found in Redis`);
      res.status(404).json({ status: 'error', message: 'Document not found' });
      return;
    }

    console.log(`[Delete] Found document ${id} with provider: ${document.storageProvider}`);

    // If stored externally, call adapter.delete() before removing from Redis
    if (document.storageProvider !== 'redis' && document.storageKey) {
      try {
        const storageAdapter = StorageFactory.getAdapter();

        console.log(
          `[Delete] Deleting document ${id} from ${document.storageProvider} with key ${document.storageKey}`
        );
        await storageAdapter.delete(document.storageKey);

        console.log(`[Delete] Successfully deleted document ${id} from external storage`);
      } catch (deleteError) {
        // If external deletion fails, return error and keep metadata intact
        console.error(
          `[Delete Error] Failed to delete document ${id} from external storage:`,
          deleteError
        );
        res.status(500).json({
          status: 'error',
          message: 'Failed to delete document from external storage',
        });
        return;
      }
    }

    // Only remove Redis metadata if external deletion succeeds (or if stored in Redis)
    const filtered = documents.filter((doc: Document) => doc.id !== id);
    await redis.set(key, JSON.stringify(filtered));

    console.log(`[Delete] Document ${id} metadata removed from Redis`);

    res.json({ status: 'success' });
  } catch (error) {
    console.error('[Delete Error] Error deleting document:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to delete document',
    });
  }
});

// TEMPORARY: Set API key endpoint (remove after use)
// To use: Set GEMINI_API_KEY environment variable, then call this endpoint
router.post('/api/temp-set-key', async (_req, res): Promise<void> => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    res.status(400).json({ success: false, message: 'GEMINI_API_KEY not set in environment' });
    return;
  }

  await redis.set('config:gemini_api_key', apiKey);
  res.json({ success: true, message: 'API key set in Redis' });
});

// Gemini AI Analysis endpoint
router.post<
  unknown,
  AnalysisResponse | { status: string; message: string },
  { fileData: string; fileType: string; fileName: string }
>('/api/analyze', async (req, res): Promise<void> => {
  const { postId } = context;
  if (!postId) {
    res.status(400).json({ status: 'error', message: 'postId is required' });
    return;
  }

  try {
    // Get current username for rate limiting
    const username = await reddit.getCurrentUsername();
    if (!username) {
      res.status(401).json({ status: 'error', message: 'User authentication required' });
      return;
    }

    // Rate limiting: 100 requests per day per user
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const rateLimitKey = `ratelimit:analysis:${username}:${today}`;

    // Get current count and increment
    const currentCount = await redis.get(rateLimitKey);
    const count = currentCount ? parseInt(currentCount) : 0;

    // Check if limit exceeded
    const RATE_LIMIT = 100;
    if (count >= RATE_LIMIT) {
      console.log(`[Analysis] Rate limit exceeded for user ${username}: ${count}/${RATE_LIMIT}`);

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', RATE_LIMIT.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(new Date().setHours(24, 0, 0, 0)).toISOString());

      res.status(429).json({
        status: 'error',
        message: `Daily analysis limit reached (${RATE_LIMIT} requests per day). Limit resets at midnight UTC.`,
      });
      return;
    }

    // Increment counter
    const newCount = await redis.incrBy(rateLimitKey, 1);

    // Set expiration to end of day (24 hours from now, rounded to midnight UTC)
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    const secondsUntilMidnight = Math.floor((midnight.getTime() - now.getTime()) / 1000);
    await redis.expire(rateLimitKey, secondsUntilMidnight);

    // Add rate limit headers to response
    const remaining = Math.max(0, RATE_LIMIT - newCount);
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', midnight.toISOString());

    console.log(
      `[Analysis] Rate limit check passed for user ${username}: ${newCount}/${RATE_LIMIT}`
    );

    // Extract fileData, fileType, fileName from request body
    const { fileData, fileType, fileName } = req.body;

    // Add request validation
    if (!fileData) {
      res.status(400).json({ status: 'error', message: 'fileData is required' });
      return;
    }

    if (!fileType) {
      res.status(400).json({ status: 'error', message: 'fileType is required' });
      return;
    }

    if (!fileName) {
      res.status(400).json({ status: 'error', message: 'fileName is required' });
      return;
    }

    console.log(`[Analysis] Starting analysis for file: ${fileName} (${fileType})`);

    // Generate file hash (MD5) for cache key
    const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;

    if (!base64Data) {
      res.status(400).json({ status: 'error', message: 'Invalid file data format' });
      return;
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const fileHash = crypto.createHash('md5').update(buffer).digest('hex');
    const cacheKey = `analysis:${fileHash}`;

    console.log(`[Analysis] Generated cache key for file: ${cacheKey}`);

    // Check cache before calling API
    const cachedResult = await redis.get(cacheKey);

    let analysis: { description: string; summary: string };

    if (cachedResult) {
      // Cache hit - return cached results
      console.log(`[Analysis] Cache hit for file: ${fileName} (key: ${cacheKey})`);
      analysis = JSON.parse(cachedResult);

      // Log cache operation for monitoring
      console.log(`[Analysis] Returning cached analysis for ${fileName}`);
    } else {
      // Cache miss - call Gemini API
      console.log(`[Analysis] Cache miss for file: ${fileName} (key: ${cacheKey})`);

      // Call analyzeDocument() function
      analysis = await analyzeDocument(fileData, fileType, fileName);

      console.log(`[Analysis] Analysis completed for file: ${fileName}`);

      // Only cache successful analyses (not fallback responses)
      const isFallback = analysis.summary.includes('Auto-analysis unavailable') || 
                         analysis.summary.includes('Please add details manually');
      
      if (!isFallback) {
        // Store analysis results in Redis with 7-day TTL
        const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds
        await redis.set(cacheKey, JSON.stringify(analysis));
        await redis.expire(cacheKey, CACHE_TTL_SECONDS);

        console.log(`[Analysis] Cached analysis results for ${fileName} (TTL: 7 days)`);
      } else {
        console.log(`[Analysis] Skipping cache for fallback response: ${fileName}`);
      }
    }

    console.log(`[Analysis] Returning analysis results for file: ${fileName}`);

    // Return analysis results to client
    res.json({
      type: 'analysis',
      description: analysis.description,
      summary: analysis.summary,
    });
  } catch (error) {
    console.error('[Analysis Error] Error analyzing document:', error);

    // Determine appropriate error message and status code
    let statusCode = 500;
    let errorMessage = 'Failed to analyze document';

    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();

      // API key not configured
      if (errorMsg.includes('api key not configured')) {
        statusCode = 503;
        errorMessage = 'AI analysis is temporarily unavailable. Please add details manually.';
      }
      // Timeout errors
      else if (errorMsg.includes('timeout')) {
        statusCode = 504;
        errorMessage = 'Analysis took too long. Please try again or add details manually.';
      }
      // Invalid response format
      else if (errorMsg.includes('invalid response')) {
        statusCode = 502;
        errorMessage =
          'AI service returned an invalid response. Please try again or add details manually.';
      }
      // Generic API errors
      else if (errorMsg.includes('gemini') || errorMsg.includes('api')) {
        statusCode = 503;
        errorMessage =
          'AI analysis service is temporarily unavailable. Please add details manually.';
      }
      // Use original error message for other cases
      else {
        errorMessage = error.message;
      }
    }

    res.status(statusCode).json({
      status: 'error',
      message: errorMessage,
    });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
