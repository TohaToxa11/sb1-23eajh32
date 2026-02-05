import { useState } from 'react';
import WalletGenerator from './components/WalletGenerator';
import WalletHistory from './components/WalletHistory';
import { Wallet, History } from 'lucide-react';

type Tab = 'generator' | 'history';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('generator');

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Wallet className="w-10 h-10 text-orange-600" />
              <h1 className="text-4xl font-bold text-gray-800">Bitcoin Wallet Scanner</h1>
            </div>
            <p className="text-center text-gray-600 max-w-2xl mx-auto">
              Educational project demonstrating Bitcoin key generation and address verification
            </p>
          </div>

          <div className="flex gap-2 mb-6 bg-white rounded-lg p-1 shadow-sm max-w-md mx-auto">
            <button
              onClick={() => setActiveTab('generator')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-all ${
                activeTab === 'generator'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Wallet className="w-5 h-5" />
              Generator
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <History className="w-5 h-5" />
              History
            </button>
          </div>

          {activeTab === 'generator' ? <WalletGenerator /> : <WalletHistory />}
        </div>
      </div>
    </div>
  );
}

export default App;
