import { useState } from 'react';
import { Key } from 'lucide-react';

/** Prompt shown when no API key is available for knowledge-API calls. */
export default function ApiKeyGate({ tenantId, onConnect }: { tenantId: string; onConnect: (key: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
      <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
        <Key size={22} className="text-indigo-500" />
      </div>
      <div>
        <p className="font-semibold text-gray-800">Connect your API key</p>
        <p className="text-sm text-gray-400 mt-1 max-w-xs">
          Enter a project API key to explore the knowledge graph.
          You can create one in the <strong>API Keys</strong> tab.
        </p>
      </div>
      <div className="flex w-full max-w-sm gap-2">
        <input
          type="password"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && value && onConnect(value)}
          placeholder={`${tenantId}_sk_…`}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={() => value && onConnect(value)}
          disabled={!value}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Connect
        </button>
      </div>
      <p className="text-xs text-gray-400">
        Keys are stored in session storage and cleared when you close the tab.
      </p>
    </div>
  );
}
