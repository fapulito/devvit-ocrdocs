import { GoogleGenerativeAI } from '@google/generative-ai';
import { redis } from '@devvit/web/server';

/**
 * Logging utility for structured Gemini API logs
 */
const logger = {
  info: (message: string, metadata?: Record<string, any>) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      ...metadata,
    };
    console.log(`[Gemini] ${JSON.stringify(logEntry)}`);
  },

  warn: (message: string, metadata?: Record<string, any>) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      ...metadata,
    };
    console.warn(`[Gemini] ${JSON.stringify(logEntry)}`);
  },

  error: (message: string, error: unknown, metadata?: Record<string, any>) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error: errorMessage,
      stack: errorStack,
      ...metadata,
    };
    console.error(`[Gemini] ${JSON.stringify(logEntry)}`);
  },

  performance: (operation: string, durationMs: number, metadata?: Record<string, any>) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'PERFORMANCE',
      operation,
      durationMs,
      ...metadata,
    };
    console.log(`[Gemini] ${JSON.stringify(logEntry)}`);
  },
};

/**
 * Initialize Gemini API client with API key from Redis
 * @returns GoogleGenerativeAI instance or null if API key not configured
 */
async function initializeGeminiClient(): Promise<GoogleGenerativeAI | null> {
  try {
    // Retrieve API key from Redis
    const apiKey = await redis.get('config:gemini_api_key');

    if (!apiKey) {
      logger.warn('API key not configured in Redis');
      return null;
    }

    // Initialize Google Generative AI client
    const genAI = new GoogleGenerativeAI(apiKey as string);
    logger.info('Client initialized successfully');

    return genAI;
  } catch (error) {
    logger.error('Failed to initialize client', error);
    return null;
  }
}

/**
 * Get configured Gemini model instance
 * Uses gemini-1.5-flash for cost-effective analysis
 */
async function getModel() {
  const genAI = await initializeGeminiClient();

  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }

  // Configure model with optimal settings for document analysis
  const model = genAI.getGenerativeModel(
    {
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.4, // Lower temperature for more consistent, factual responses
        maxOutputTokens: 1000, // Increased to allow full JSON response
      },
    },
    {
      apiVersion: 'v1', // Use v1 API instead of v1beta
    }
  );

  return model;
}

/**
 * Detect MIME type from base64 data prefix
 * @param base64Data - Base64 encoded data (may include data URI prefix)
 * @returns MIME type string
 */
function detectMimeType(base64Data: string): string {
  // Check if data URI prefix exists
  if (base64Data.startsWith('data:')) {
    const match = base64Data.match(/^data:([^;]+);/);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Default to JPEG if no prefix found
  return 'image/jpeg';
}

/**
 * Strip data URI prefix from base64 string if present
 * @param base64Data - Base64 encoded data (may include data URI prefix)
 * @returns Clean base64 string
 */
function stripDataUriPrefix(base64Data: string): string {
  if (base64Data.startsWith('data:')) {
    const base64Index = base64Data.indexOf('base64,');
    if (base64Index !== -1) {
      return base64Data.substring(base64Index + 7);
    }
  }
  return base64Data;
}

/**
 * Analyze an image using Gemini API with retry logic
 * @param base64Image - Base64 encoded image data (with or without data URI prefix)
 * @param fileName - Original filename for fallback
 * @param retryCount - Current retry attempt (internal use)
 * @returns Object with description and summary
 */
export async function analyzeImage(
  base64Image: string,
  fileName: string,
  retryCount: number = 0
): Promise<{ description: string; summary: string }> {
  const MAX_RETRIES = 2;
  const TIMEOUT_MS = 5000; // 5 second timeout

  try {
    const model = await getModel();

    // Detect MIME type and clean base64 data
    const mimeType = detectMimeType(base64Image);
    const cleanBase64 = stripDataUriPrefix(base64Image);

    // Prepare the image part for Gemini
    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType: mimeType,
      },
    };

    // Prompt for image analysis - force JSON output
    const prompt = `You must respond with ONLY valid JSON, no other text.

Analyze this image and return JSON with this exact structure:
{
  "description": "brief description (max 80 chars)",
  "summary": "key details and information"
}

If it's a document/receipt: include company name, date, amounts.
If it's a photo: describe what you see briefly.

Respond with ONLY the JSON object, nothing else.`;

    // Call Gemini API with timeout
    const result = await Promise.race([
      model.generateContent([prompt, imagePart]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('API timeout')), TIMEOUT_MS)
      ),
    ]);

    const response = await result.response;

    // Log full response object for debugging
    logger.info('Full API response object', {
      candidates: response.candidates?.length || 0,
      promptFeedback: JSON.stringify(response.promptFeedback),
      firstCandidate: response.candidates?.[0]
        ? {
            finishReason: response.candidates[0].finishReason,
            safetyRatings: response.candidates[0].safetyRatings,
            hasContent: !!response.candidates[0].content,
          }
        : null,
      fileName,
    });

    const text = response.text();

    // Log raw response for debugging
    logger.info('Raw API response text', {
      textLength: text.length,
      textPreview: text.substring(0, 200),
      hasText: !!text,
      fileName,
    });

    // Parse JSON response
    const parsed = parseGeminiResponse(text);

    logger.info('Image analysis successful', {
      descriptionLength: parsed.description.length,
      summaryLength: parsed.summary.length,
      retryCount,
      fileName,
    });

    return parsed;
  } catch (error) {
    logger.error('Image analysis failed', error, {
      retryCount,
      fileName,
      fileSize: base64Image.length,
    });

    // Check if error is retryable
    const isRetryable = isRetryableError(error);

    // Retry with exponential backoff if applicable
    if (isRetryable && retryCount < MAX_RETRIES) {
      const backoffMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      logger.info('Retrying image analysis', {
        backoffMs,
        attempt: retryCount + 1,
        maxRetries: MAX_RETRIES,
        fileName,
      });

      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return analyzeImage(base64Image, fileName, retryCount + 1);
    }

    // Fallback to generic description
    logger.warn('Using fallback response for image', {
      fileName,
      reason: 'Max retries exceeded or non-retryable error',
    });
    return createFallbackResponse(
      fileName,
      'image',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Parse Gemini API response and extract description and summary
 * Handles various response formats and validates output
 */
function parseGeminiResponse(text: string): { description: string; summary: string } {
  try {
    // Remove markdown code blocks if present
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/```\n?/g, '');
    }

    // Parse JSON
    const parsed = JSON.parse(cleanText);

    // Validate required fields
    if (!parsed.description || !parsed.summary) {
      throw new Error('Missing required fields in response');
    }

    // Enforce length limits and sanitize
    const description = sanitizeText(parsed.description.substring(0, 100));
    const summary = sanitizeText(parsed.summary.substring(0, 500));

    logger.info('Response parsed successfully', {
      originalDescriptionLength: parsed.description.length,
      originalSummaryLength: parsed.summary.length,
      truncatedDescription: parsed.description.length > 100,
      truncatedSummary: parsed.summary.length > 500,
    });

    return { description, summary };
  } catch (error) {
    logger.error('Failed to parse response', error, {
      responseLength: text.length,
      responsePreview: text.substring(0, 100),
    });
    throw new Error('Invalid response format from Gemini API');
  }
}

/**
 * Sanitize text output by removing unsafe characters
 * @param text - Text to sanitize
 * @returns Sanitized text
 */
function sanitizeText(text: string): string {
  // Remove control characters except newlines and tabs
  return text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Determine if an error is retryable
 * @param error - Error object or message
 * @returns True if error should trigger a retry
 */
function isRetryableError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();

  // Retryable errors: timeouts, network issues, temporary API issues
  const retryablePatterns = [
    'timeout',
    'network',
    'econnreset',
    'econnrefused',
    'etimedout',
    'socket hang up',
    '503', // Service unavailable
    '429', // Rate limit (will retry with backoff)
    'temporarily unavailable',
  ];

  return retryablePatterns.some((pattern) => errorString.includes(pattern));
}

/**
 * Create a fallback response when analysis fails
 * @param fileName - Original filename
 * @param fileType - Type of file (image or pdf)
 * @param errorMessage - Error message for logging
 * @returns Fallback response object
 */
function createFallbackResponse(
  fileName: string,
  fileType: 'image' | 'pdf',
  errorMessage: string
): { description: string; summary: string } {
  logger.warn('Creating fallback response', {
    fileName,
    fileType,
    errorMessage,
  });

  const fileTypeLabel = fileType === 'pdf' ? 'PDF' : 'Image';

  return {
    description: `${fileTypeLabel} - ${fileName}`,
    summary: 'Auto-analysis unavailable. Please add details manually.',
  };
}

/**
 * Analyze a PDF document using Gemini API with retry logic
 * @param base64PDF - Base64 encoded PDF data (with or without data URI prefix)
 * @param fileName - Original filename for fallback
 * @param retryCount - Current retry attempt (internal use)
 * @returns Object with description and summary
 */
export async function analyzePDF(
  base64PDF: string,
  fileName: string,
  retryCount: number = 0
): Promise<{ description: string; summary: string }> {
  const MAX_RETRIES = 2;
  const TIMEOUT_MS = 5000; // 5 second timeout

  try {
    const model = await getModel();

    // Detect MIME type and clean base64 data
    const mimeType = detectMimeType(base64PDF);
    const cleanBase64 = stripDataUriPrefix(base64PDF);

    // Prepare the PDF part for Gemini
    const pdfPart = {
      inlineData: {
        data: cleanBase64,
        mimeType: mimeType.includes('pdf') ? mimeType : 'application/pdf',
      },
    };

    // Prompt for PDF analysis - force JSON output
    const prompt = `You must respond with ONLY valid JSON, no other text.

Analyze this PDF and return JSON with this exact structure:
{
  "description": "brief description (max 80 chars)",
  "summary": "key points and details (max 400 chars)"
}

Include: document type, main subject, key dates, important numbers.

Respond with ONLY the JSON object, nothing else.`;

    // Call Gemini API with timeout
    const result = await Promise.race([
      model.generateContent([prompt, pdfPart]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('API timeout')), TIMEOUT_MS)
      ),
    ]);

    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    const parsed = parseGeminiResponse(text);

    logger.info('PDF analysis successful', {
      descriptionLength: parsed.description.length,
      summaryLength: parsed.summary.length,
      retryCount,
      fileName,
    });

    return parsed;
  } catch (error) {
    logger.error('PDF analysis failed', error, {
      retryCount,
      fileName,
      fileSize: base64PDF.length,
    });

    // Check if error is retryable
    const isRetryable = isRetryableError(error);

    // Retry with exponential backoff if applicable
    if (isRetryable && retryCount < MAX_RETRIES) {
      const backoffMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      logger.info('Retrying PDF analysis', {
        backoffMs,
        attempt: retryCount + 1,
        maxRetries: MAX_RETRIES,
        fileName,
      });

      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return analyzePDF(base64PDF, fileName, retryCount + 1);
    }

    // Fallback to generic description
    logger.warn('Using fallback response for PDF', {
      fileName,
      reason: 'Max retries exceeded or non-retryable error',
    });
    return createFallbackResponse(
      fileName,
      'pdf',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Main document analysis function that routes to appropriate handler
 * @param fileData - Base64 encoded file data (with or without data URI prefix)
 * @param fileType - MIME type or file extension
 * @param fileName - Original filename
 * @returns Object with description and summary
 */
export async function analyzeDocument(
  fileData: string,
  fileType: string,
  fileName: string
): Promise<{ description: string; summary: string }> {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.info('Starting document analysis', {
      requestId,
      fileName,
      fileType,
      dataLength: fileData.length,
    });

    // Detect file type and route to appropriate handler
    const detectedType = detectFileType(fileData, fileType);

    logger.info('File type detected', {
      requestId,
      detectedType,
      providedType: fileType,
    });

    let result: { description: string; summary: string };

    if (detectedType === 'pdf') {
      result = await analyzePDF(fileData, fileName);
    } else if (detectedType === 'image') {
      result = await analyzeImage(fileData, fileName);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    const duration = Date.now() - startTime;

    logger.performance('Document analysis completed', duration, {
      requestId,
      fileName,
      fileType: detectedType,
      descriptionLength: result.description.length,
      summaryLength: result.summary.length,
      success: true,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Document analysis failed', error, {
      requestId,
      fileName,
      fileType,
      durationMs: duration,
    });

    logger.performance('Document analysis completed', duration, {
      requestId,
      fileName,
      fileType,
      success: false,
    });

    // Unified error handling - return fallback response
    const detectedType = detectFileType(fileData, fileType);
    return createFallbackResponse(
      fileName,
      detectedType === 'pdf' ? 'pdf' : 'image',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Detect file type from MIME type or data URI prefix
 * @param fileData - Base64 encoded file data (may include data URI prefix)
 * @param fileType - MIME type or file extension hint
 * @returns 'image' or 'pdf'
 */
function detectFileType(fileData: string, fileType: string): 'image' | 'pdf' {
  // Normalize file type string
  const normalizedType = fileType.toLowerCase();

  // Check MIME type
  if (normalizedType.includes('pdf') || normalizedType.includes('application/pdf')) {
    return 'pdf';
  }

  if (
    normalizedType.includes('image') ||
    normalizedType.includes('jpeg') ||
    normalizedType.includes('jpg') ||
    normalizedType.includes('png') ||
    normalizedType.includes('gif') ||
    normalizedType.includes('webp')
  ) {
    return 'image';
  }

  // Check data URI prefix if present
  if (fileData.startsWith('data:')) {
    if (fileData.startsWith('data:application/pdf')) {
      return 'pdf';
    }
    if (fileData.startsWith('data:image/')) {
      return 'image';
    }
  }

  // Check file extension as fallback
  if (normalizedType.endsWith('.pdf')) {
    return 'pdf';
  }

  if (
    normalizedType.endsWith('.jpg') ||
    normalizedType.endsWith('.jpeg') ||
    normalizedType.endsWith('.png') ||
    normalizedType.endsWith('.gif') ||
    normalizedType.endsWith('.webp')
  ) {
    return 'image';
  }

  // Default to image if uncertain
  logger.warn('Could not determine file type, defaulting to image', {
    providedFileType: fileType,
    hasDataUri: fileData.startsWith('data:'),
  });
  return 'image';
}

/**
 * Log cache hit/miss for monitoring
 * This function should be called by the caching layer when implemented
 * @param hit - Whether the cache was hit or missed
 * @param cacheKey - The cache key used
 * @param metadata - Additional metadata about the cache operation
 */
export function logCacheOperation(
  hit: boolean,
  cacheKey: string,
  metadata?: Record<string, any>
): void {
  logger.info(hit ? 'Cache hit' : 'Cache miss', {
    cacheHit: hit,
    cacheKey,
    ...metadata,
  });
}

/**
 * Log rate limit check for monitoring
 * This function should be called by the rate limiting layer when implemented
 * @param username - The username being rate limited
 * @param currentCount - Current request count
 * @param limit - Maximum allowed requests
 * @param exceeded - Whether the limit was exceeded
 */
export function logRateLimitCheck(
  username: string,
  currentCount: number,
  limit: number,
  exceeded: boolean
): void {
  if (exceeded) {
    logger.warn('Rate limit exceeded', {
      username,
      currentCount,
      limit,
      exceeded,
    });
  } else {
    logger.info('Rate limit check', {
      username,
      currentCount,
      limit,
      exceeded,
      remaining: limit - currentCount,
    });
  }
}

export { initializeGeminiClient, getModel };
