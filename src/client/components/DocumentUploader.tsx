import { useState, useRef } from 'react';

export const DocumentUploader = ({ onDocumentAdded }: { onDocumentAdded: () => void }) => {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [base64Data, setBase64Data] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [aiGeneratedDescription, setAiGeneratedDescription] = useState(false);
  const [aiGeneratedNotes, setAiGeneratedNotes] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const maxSize = 800;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.5);
          resolve(compressed);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const analyzeFile = async (fileData: string, fileType: string, fileName: string) => {
    setAnalyzing(true);
    setAnalysisError(null);

    try {
      console.log('Starting file analysis...', { fileName, fileType });

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData,
          fileType,
          fileName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Analysis failed');
      }

      const result = await response.json();
      console.log('Analysis completed:', result);

      // Pre-fill description and notes with AI-generated content
      if (result.description) {
        setDescription(result.description);
        setAiGeneratedDescription(true);
      }
      if (result.summary) {
        setNotes(result.summary);
        setAiGeneratedNotes(true);
      }

      setAnalysisError(null);
    } catch (err) {
      let errorMessage = 'Analysis failed';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      console.error('Analysis error:', err);
      setAnalysisError(errorMessage);
      
      // Fallback to generic description on error
      const fileTypeLabel = fileType.includes('pdf') ? 'PDF' : 'Image';
      setDescription(`${fileTypeLabel} - ${fileName}`);
      setNotes('Please add details manually.');
      setAiGeneratedDescription(false);
      setAiGeneratedNotes(false);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      // More robust PDF detection
      const isPDF = file.type === 'application/pdf' || 
                    file.type === 'application/x-pdf' ||
                    file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/');

      console.log('File selected:', { name: file.name, type: file.type, size: file.size, isPDF, isImage });

      if (!isPDF && !isImage) {
        throw new Error('Only image files and PDFs are supported');
      }

      // Check file size limits
      // Both images and PDFs stored in Redis with 500KB limit
      const maxSizeMB = 0.5;
      const fileSizeMB = file.size / (1024 * 1024);
      
      if (fileSizeMB > maxSizeMB) {
        throw new Error(`File is too large. Maximum size is ${maxSizeMB}MB for ${isPDF ? 'PDFs' : 'images'}.`);
      }

      if (isPDF) {
        // For PDFs, read as base64 without compression
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target?.result as string;
          const pdfFileType = file.type || 'application/pdf';
          
          setBase64Data(base64);
          setFileName(file.name);
          setFileType(pdfFileType);
          setImagePreview(null); // No preview for PDFs
          console.log('PDF loaded successfully:', file.name);

          // Auto-analyze if enabled
          if (autoAnalyze) {
            await analyzeFile(base64, pdfFileType, file.name);
          }
        };
        reader.onerror = () => {
          setError('Failed to read PDF file');
          console.error('PDF read error');
        };
        reader.readAsDataURL(file);
      } else {
        // For images, compress as before
        const compressed = await compressImage(file);
        const sizeEstimate = (compressed.length * 0.75) / 1024;
        if (sizeEstimate > 500) {
          throw new Error('Image is too large even after compression. Try a smaller image.');
        }

        setImagePreview(compressed);
        setBase64Data(compressed);
        setFileName(file.name);
        setFileType('image/jpeg');

        // Auto-analyze if enabled
        if (autoAnalyze) {
          await analyzeFile(compressed, 'image/jpeg', file.name);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
      console.error('File load error:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent submission during analysis
    if (analyzing) {
      return;
    }

    if (!base64Data) {
      setError('Please select a file');
      return;
    }

    if (!description.trim()) {
      setError('Please add a description');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/documents/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          fileType,
          fileData: base64Data, // Changed from imageData to fileData for consistency
          description: description.trim(),
          notes: notes.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload document');
      }

      setImagePreview(null);
      setBase64Data('');
      setFileName('');
      setFileType('');
      setDescription('');
      setNotes('');
      setAiGeneratedDescription(false);
      setAiGeneratedNotes(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onDocumentAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setImagePreview(null);
    setBase64Data('');
    setFileName('');
    setFileType('');
    setDescription('');
    setNotes('');
    setAiGeneratedDescription(false);
    setAiGeneratedNotes(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 md:p-6">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-4 md:p-6 border border-gray-700/50">
        <h2 className="text-xl md:text-2xl font-bold mb-2 text-white">Document Upload</h2>
        <p className="text-gray-400 text-sm mb-4">Select an image or PDF file to upload and manage.</p>

        {/* Mobile limitation notice */}
        <div className="mb-6 bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3 md:hidden">
          <p className="text-yellow-300 text-xs">
            ⚠️ File uploads may not work on mobile due to Reddit app restrictions. Please use
            desktop for uploading.
          </p>
        </div>

        {/* Auto-analyze toggle */}
        <div className="mb-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={autoAnalyze}
              onChange={(e) => setAutoAnalyze(e.target.checked)}
              className="w-5 h-5 rounded border-gray-600 bg-gray-900/50 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-gray-900 cursor-pointer transition-colors"
            />
            <div className="flex-1">
              <span className="text-gray-300 text-sm font-medium group-hover:text-white transition-colors">
                Auto-analyze with AI
              </span>
              <p className="text-gray-500 text-xs mt-0.5">
                Automatically generate descriptions and summaries using Gemini AI
              </p>
            </div>
          </label>
        </div>

        {!imagePreview && !fileName ? (
          <div className="mb-6">
            {/* Visible, styled file input - most reliable for mobile */}
            <label className="relative block border-2 border-dashed border-gray-600 rounded-xl p-8 text-center bg-gray-900/30 cursor-pointer hover:border-blue-500 active:border-blue-600 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,application/pdf"
                onChange={handleFileSelect}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-3 pointer-events-none">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-300 font-medium">Tap to select a file</p>
                  <p className="text-gray-500 text-sm mt-1">Images (max 500KB) or PDFs (max 10MB)</p>
                </div>
              </div>
            </label>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-300">
                {imagePreview ? 'Preview' : 'Selected File'}
              </label>
              <div className="border border-gray-700 rounded-xl p-3 bg-gray-900/50">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <svg
                        className="w-16 h-16 text-red-400 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-gray-300 font-medium">PDF Document</p>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2 text-center">{fileName}</p>
                
                {/* Loading indicator positioned near file preview */}
                {analyzing && (
                  <div className="mt-3 bg-purple-900/20 border border-purple-700/30 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400"></div>
                      <div className="flex-1">
                        <p className="text-purple-300 text-sm font-medium">Analyzing document...</p>
                        <p className="text-purple-400/70 text-xs mt-1">AI is generating description and summary</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {analysisError && (
              <div className="mb-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-yellow-300 text-sm font-medium">Analysis unavailable</p>
                    <p className="text-yellow-400/70 text-xs mt-1">{analysisError}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Description *</label>
                {base64Data && !analyzing && (
                  <button
                    type="button"
                    onClick={() => analyzeFile(base64Data, fileType, fileName)}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Re-analyze
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setAiGeneratedDescription(false);
                  }}
                  placeholder="e.g., Receipt from grocery store"
                  className="block w-full text-sm text-white bg-gray-900/50 border border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                  required
                  disabled={analyzing}
                />
                {aiGeneratedDescription && description && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 rounded-md border border-purple-500/20 pointer-events-none">
                    <span className="text-sm">✨</span>
                    <span className="text-xs text-purple-400/80 font-medium hidden sm:inline">AI</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-300">
                Notes (optional)
              </label>
              <div className="relative">
                <textarea
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setAiGeneratedNotes(false);
                  }}
                  placeholder="Add any additional notes or text from the document..."
                  rows={4}
                  className="block w-full text-sm text-white bg-gray-900/50 border border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                  disabled={analyzing}
                />
                {aiGeneratedNotes && notes && (
                  <div className="absolute right-3 top-3 flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 rounded-md border border-purple-500/20 pointer-events-none">
                    <span className="text-sm">✨</span>
                    <span className="text-xs text-purple-400/80 font-medium hidden sm:inline">AI</span>
                  </div>
                )}
              </div>
            </div>

            {uploading && (
              <div className="mb-4 bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                  <div className="flex-1">
                    <p className="text-blue-300 text-sm font-medium">Uploading document...</p>
                    <p className="text-blue-400/70 text-xs mt-1">Please wait while we save your file</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={uploading || analyzing}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 touch-manipulation"
              >
                {uploading ? 'Uploading...' : 'Save Document'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={uploading || analyzing}
                className="px-4 py-3 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 disabled:opacity-50 transition-colors touch-manipulation"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="mt-4 bg-red-900/30 border border-red-700 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
