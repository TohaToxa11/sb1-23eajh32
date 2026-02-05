import { useState, useEffect } from 'react';
import { History, Eye, EyeOff } from 'lucide-react';
import { getWalletsWithBalance, WalletRecord } from '../lib/supabase';

export default function WalletHistory() {
  const [wallets, setWallets] = useState<WalletRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    setLoading(true);
    const data = await getWalletsWithBalance();
    setWallets(data);
    setLoading(false);
  };

  const toggleKeyVisibility = (walletId: string) => {
    setVisibleKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(walletId)) {
        newSet.delete(walletId);
      } else {
        newSet.add(walletId);
      }
      return newSet;
    });
  };

  const maskPrivateKey = (key: string) => {
    return key.substring(0, 8) + '...' + key.substring(key.length - 8);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center text-gray-600">Loading history...</div>
        </div>
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-4">
            <History className="w-6 h-6 text-orange-500" />
            <h2 className="text-2xl font-bold text-gray-800">Wallet History</h2>
          </div>
          <p className="text-gray-600">No wallets with balance found yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <History className="w-6 h-6 text-orange-500" />
          <h2 className="text-2xl font-bold text-gray-800">Wallet History</h2>
        </div>

        <div className="space-y-4">
          {wallets.map((wallet) => (
            <div key={wallet.id} className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors">
              <div className="grid gap-3">
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Address</div>
                  <div className="text-sm font-mono text-gray-800 break-all">{wallet.address}</div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-medium text-gray-500">Private Key</div>
                    <button
                      onClick={() => toggleKeyVisibility(wallet.id)}
                      className="text-orange-500 hover:text-orange-600 transition-colors"
                    >
                      {visibleKeys.has(wallet.id) ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="text-sm font-mono text-gray-800 break-all">
                    {visibleKeys.has(wallet.id)
                      ? wallet.private_key
                      : maskPrivateKey(wallet.private_key)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Balance</div>
                    <div className="text-lg font-bold text-green-600">{wallet.balance} BTC</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Found At</div>
                    <div className="text-sm text-gray-700">
                      {new Date(wallet.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
