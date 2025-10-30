export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type Document = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  imageData?: string; // base64 (optional for PDFs stored externally)
  description: string;
  notes: string;
  timestamp: number;
  storageProvider: 'redis' | 's3' | 'postgresql';
  storageKey?: string; // For external storage references
};

export type DocumentResponse = {
  type: 'document';
  document: Document;
};

export type DocumentsListResponse = {
  type: 'documents-list';
  documents: Document[];
};

export type DocumentRetrievalResponse = {
  type: 'document-retrieval';
  url?: string; // URL for external storage (S3 presigned or PostgreSQL stream endpoint)
  imageData?: string; // base64 data for Redis-stored images
  expiresIn?: number; // Seconds until URL expiration (for external storage)
  storageProvider: 'redis' | 's3' | 'postgresql';
};

export type OcrResult = {
  text: string;
  confidence: number;
  fileName: string;
  timestamp: number;
};

export type OcrResponse = {
  type: 'ocr';
  result: OcrResult;
};

export type OcrHistoryResponse = {
  type: 'ocr-history';
  results: OcrResult[];
};

export type AnalysisResponse = {
  type: 'analysis';
  description: string;
  summary: string;
};
