import { useState } from 'react';
import { navigateTo } from '@devvit/web/client';
import { useCounter } from './hooks/useCounter';
import { DocumentUploader } from './components/DocumentUploader';
import { DocumentsList } from './components/DocumentsList';
import { ApiKeyConfig } from './components/ApiKeyConfig';

export const App = () => {
  const { username } = useCounter();
  const [activeTab, setActiveTab] = useState<'upload' | 'documents' | 'config'>('config');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDocumentAdded = () => {
    setRefreshTrigger((prev) => prev + 1);
    setActiveTab('documents');
  };

  return (
    <div className="flex relative flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700/50 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">Document Manager</h1>
          </div>
          {username && (
            <span className="text-sm text-gray-400">Hello, {username}!</span>
          )}
        </div>
      </header>

      <nav className="bg-gray-900/30 backdrop-blur-sm border-b border-gray-700/50">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-all ${
              activeTab === 'config'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Setup
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-all ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Upload Document
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-all ${
              activeTab === 'documents'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            My Documents
          </button>
        </div>
      </nav>

      <main className="flex-1 py-8">
        {activeTab === 'config' ? (
          <ApiKeyConfig />
        ) : activeTab === 'upload' ? (
          <DocumentUploader onDocumentAdded={handleDocumentAdded} />
        ) : (
          <DocumentsList refreshTrigger={refreshTrigger} />
        )}
      </main>

      <footer className="bg-gray-900/50 backdrop-blur-sm border-t border-gray-700/50 py-4">
        <div className="max-w-4xl mx-auto flex justify-center gap-3 text-sm text-gray-500">
          <button
            className="hover:text-blue-400 transition-colors"
            onClick={() => navigateTo('https://developers.reddit.com/docs')}
          >
            Docs
          </button>
          <span className="text-gray-700">|</span>
          <button
            className="hover:text-blue-400 transition-colors"
            onClick={() => navigateTo('https://www.reddit.com/r/Devvit')}
          >
            r/Devvit
          </button>
          <span className="text-gray-700">|</span>
          <button
            className="hover:text-blue-400 transition-colors"
            onClick={() => navigateTo('https://discord.com/invite/R7yu2wh9Qz')}
          >
            Discord
          </button>
        </div>
      </footer>
    </div>
  );
};
