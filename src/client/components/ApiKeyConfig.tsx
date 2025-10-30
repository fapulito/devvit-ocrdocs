import { useState } from 'react';

export const ApiKeyConfig = () => {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch('/api/configure-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('API key configured successfully! AI analysis is now enabled.');
        setApiKey('');
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to configure API key');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Network error - make sure the server is running');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-bold mb-2 text-white">Configure Gemini API Key</h3>
        <p className="text-gray-400 text-sm mb-4">
          Enter your Gemini API key to enable AI-powered document analysis. Get your key at{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            Google AI Studio
          </a>
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Gemini API key"
            className="block w-full text-sm text-white bg-gray-900/50 border border-gray-700 rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {status === 'loading' ? 'Configuring...' : 'Configure API Key'}
          </button>
        </form>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg ${
              status === 'success'
                ? 'bg-green-900/30 border border-green-700 text-green-300'
                : 'bg-red-900/30 border border-red-700 text-red-300'
            }`}
          >
            {message}
          </div>
        )}

        {status === 'success' && (
          <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
            <p className="text-blue-300 text-sm">
              ✓ You can now use the Upload tab to test AI analysis. The API key is stored in Redis
              and will persist until you restart the server.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
