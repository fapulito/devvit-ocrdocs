import { useState, useEffect } from 'react';
import type { Document } from '../../shared/types/api';

export const DocumentsList = ({ refreshTrigger }: { refreshTrigger: number }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [refreshTrigger]);

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents/list');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (docId: string) => {
    setDeleteConfirm(docId);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    setDeleting(true);
    try {
      const response = await fetch('/api/documents/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteConfirm }),
      });

      if (response.ok) {
        setDocuments(documents.filter((doc) => doc.id !== deleteConfirm));
        if (selectedDoc?.id === deleteConfirm) {
          setSelectedDoc(null);
        }
        setDeleteConfirm(null);
      } else {
        const errorData = await response.json();
        console.error('Delete failed:', errorData.message);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  const handleDocumentClick = async (doc: Document) => {
    // For PDFs stored externally, fetch URL and open in new tab
    if (doc.fileType === 'application/pdf' && doc.storageProvider !== 'redis') {
      setLoadingUrl(true);
      setUrlError(null);
      
      try {
        const response = await fetch(`/api/documents/get/${doc.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to get document URL');
        }
        
        const data = await response.json();
        
        if (data.url) {
          // Open PDF in new tab
          window.open(data.url, '_blank');
        } else {
          throw new Error('No URL returned from server');
        }
      } catch (error) {
        console.error('Failed to get document URL:', error);
        setUrlError(error instanceof Error ? error.message : 'Failed to open document');
      } finally {
        setLoadingUrl(false);
      }
    } else {
      // For images or Redis-stored documents, show in detail view
      setSelectedDoc(doc);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400 py-8">Loading documents...</div>;
  }

  if (documents.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center text-gray-500 py-12">
          <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-400">No documents yet.</p>
          <p className="text-gray-600 text-sm mt-1">Upload your first document to get started!</p>
        </div>

        <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-4 mt-6">
          <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How it works
          </h3>
          <ul className="text-gray-400 text-sm space-y-2">
            <li>• Documents are stored per-post (this Reddit post)</li>
            <li>• Access your documents anytime by returning to this post</li>
            <li>• Download individual documents or copy all metadata to clipboard</li>
            <li>• Maximum 20 documents per post (500KB each)</li>
          </ul>
        </div>
      </div>
    );
  }

  const handleCopyAll = async () => {
    if (documents.length === 0) return;

    // Create a simple text export with all document info
    let exportText = `Document Manager Export\n`;
    exportText += `Exported: ${new Date().toLocaleString()}\n`;
    exportText += `Total Documents: ${documents.length}\n\n`;
    exportText += `${'='.repeat(50)}\n\n`;

    documents.forEach((doc, index) => {
      exportText += `Document ${index + 1}\n`;
      exportText += `File: ${doc.fileName}\n`;
      exportText += `Description: ${doc.description}\n`;
      if (doc.notes) {
        exportText += `Notes: ${doc.notes}\n`;
      }
      exportText += `Uploaded: ${new Date(doc.timestamp).toLocaleString()}\n`;
      exportText += `\n${'-'.repeat(50)}\n\n`;
    });

    // Copy to clipboard (works in sandbox)
    try {
      await navigator.clipboard.writeText(exportText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      // Fallback: show in alert for manual copy
      alert('Copy to clipboard failed. Here\'s your data:\n\n' + exportText.substring(0, 500) + '...\n\n(Select and copy this text)');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
      {loadingUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm mx-4 shadow-2xl border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              <div>
                <p className="text-white font-medium">Opening document...</p>
                <p className="text-gray-400 text-sm">Please wait</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedDoc ? (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-4 md:p-6 border border-gray-700/50">
          <button
            onClick={() => setSelectedDoc(null)}
            className="mb-4 text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            ← Back to list
          </button>

          <div className="mb-4">
            {selectedDoc.imageData ? (
              <img
                src={selectedDoc.imageData}
                alt={selectedDoc.fileName}
                className="max-h-96 mx-auto rounded-lg border border-gray-700"
              />
            ) : (
              <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-12 text-center">
                <svg
                  className="w-24 h-24 text-red-400 mx-auto mb-4"
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
                <p className="text-gray-300 font-medium mb-2">PDF Document</p>
                <p className="text-gray-500 text-sm">
                  Stored in {selectedDoc.storageProvider === 's3' ? 'AWS S3' : 'PostgreSQL'}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-gray-400">File Name</h3>
              <p className="text-white">{selectedDoc.fileName}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-400">Description</h3>
              <p className="text-white">{selectedDoc.description}</p>
            </div>

            {selectedDoc.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-400">Notes</h3>
                <p className="text-gray-300 whitespace-pre-wrap">{selectedDoc.notes}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-400">Uploaded</h3>
              <p className="text-gray-500 text-sm">
                {new Date(selectedDoc.timestamp).toLocaleString()}
              </p>
            </div>

            {selectedDoc.imageData ? (
              <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 mb-4">
                <p className="text-blue-300 text-xs">
                  💡 <strong>To save this image:</strong> Right-click the image above and select "Save image as..." or "Open image in new tab"
                </p>
              </div>
            ) : null}

            <div className="flex justify-center mt-4">
              <button
                onClick={() => handleDeleteClick(selectedDoc.id)}
                className="px-6 py-3 bg-red-600/80 text-white rounded-lg hover:bg-red-600 active:bg-red-700 transition-colors touch-manipulation"
              >
                Delete Document
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">
              My Documents ({documents.length})
            </h2>
            {documents.length > 0 && (
              <button
                onClick={handleCopyAll}
                className={`px-4 py-2 rounded-lg transition-all text-sm flex items-center gap-2 ${
                  copySuccess
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {copySuccess ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy All
                  </>
                )}
              </button>
            )}
          </div>
          {urlError && (
            <div className="mb-4 bg-red-900/30 border border-red-700 rounded-lg p-4">
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
                <div>
                  <p className="text-red-300 text-sm font-medium">{urlError}</p>
                  <button
                    onClick={() => setUrlError(null)}
                    className="text-red-400 text-xs underline mt-1"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => {
              const isPDF = doc.fileType === 'application/pdf';
              const isExternalStorage = doc.storageProvider !== 'redis';
              
              return (
                <div
                  key={doc.id}
                  onClick={() => handleDocumentClick(doc)}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-gray-700/50 cursor-pointer hover:border-blue-500/50 hover:shadow-xl transition-all"
                >
                  <div className="mb-3 relative">
                    {isPDF ? (
                      <div className="w-full h-40 bg-gray-900/50 rounded-lg flex items-center justify-center border border-gray-700">
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
                          <p className="text-gray-400 text-sm">PDF Document</p>
                          {isExternalStorage && (
                            <p className="text-gray-500 text-xs mt-1">
                              {doc.storageProvider === 's3' ? 'Stored in S3' : 'Stored in PostgreSQL'}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <img
                        src={doc.imageData}
                        alt={doc.fileName}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    )}
                    {isPDF && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md font-medium">
                        PDF
                      </div>
                    )}
                  </div>

                  <h3 className="font-semibold text-white mb-1 truncate">
                    {doc.description}
                  </h3>

                  <p className="text-xs text-gray-500 mb-2 truncate">{doc.fileName}</p>

                  {doc.notes && (
                    <p className="text-sm text-gray-400 line-clamp-2 mb-2">{doc.notes}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-600">
                      {new Date(doc.timestamp).toLocaleDateString()}
                    </p>
                    {isPDF && isExternalStorage && (
                      <p className="text-xs text-blue-400">Click to open</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm mx-4 shadow-2xl border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-2">Delete Document?</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete this document? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
