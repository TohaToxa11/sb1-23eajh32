import { useState, useRef, useEffect } from 'react';
import { Wallet, Search, AlertCircle, CheckCircle, Loader2, Zap, Activity, XCircle } from 'lucide-react';
import { generateRandomWallet, BitcoinWallet } from '../lib/bitcoin';
import { checkBalance, AddressBalance } from '../lib/balanceChecker';
import { saveWallet } from '../lib/supabase';

interface GenerationStats {
  total: number;
  checked: number;
  withBalance: number;
  errors: number;
}

interface WalletDisplay extends BitcoinWallet {
  status: 'checking' | 'checked' | 'found' | 'error';
  balance?: number;
  timestamp: number;
}

export default function WalletGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState<GenerationStats>({ total: 0, checked: 0, withBalance: 0, errors: 0 });
  const [foundWallets, setFoundWallets] = useState<AddressBalance[]>([]);
  const [recentWallets, setRecentWallets] = useState<WalletDisplay[]>([]);
  const [speed, setSpeed] = useState(0);
  const [batchSize, setBatchSize] = useState(10);
  const shouldStopRef = useRef(false);
  const startTimeRef = useRef(0);
  const checksCountRef = useRef(0);

  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        if (elapsed > 0) {
          setSpeed(Math.round((checksCountRef.current / elapsed) * 60));
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  const checkWalletWithRetry = async (wallet: BitcoinWallet, maxRetries = 3): Promise<AddressBalance> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const balance = await Promise.race([
          checkBalance(wallet.address),
          new Promise<AddressBalance>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 10000)
          ),
        ]);
        return balance;
      } catch (error) {
        if (attempt === maxRetries - 1) {
          return {
            address: wallet.address,
            balance: 0,
            totalReceived: 0,
            totalSent: 0,
          };
        }
        // экспоненциальная пауза
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    return {
      address: wallet.address,
      balance: 0,
      totalReceived: 0,
      totalSent: 0,
    };
  };

  const processBatch = async () => {
    // Валидируем batchSize: гарантируем целое в [1,50]
    const size = Math.max(1, Math.min(50, Math.floor(batchSize)));
    const batch: WalletDisplay[] = [];

    for (let i = 0; i < size; i++) {
      if (shouldStopRef.current) break; // реагируем на остановку сразу при сборке батча
      const wallet = generateRandomWallet();
      batch.push({
        privateKey: wallet.privateKey,
        address: wallet.address,
        status: 'checking',
        timestamp: Date.now(),
      });
    }

    if (batch.length === 0) return; // если остановили — пропускаем обработку

    setRecentWallets((prev) => [...batch, ...prev].slice(0, 20));
    setStats((prev) => ({ ...prev, total: prev.total + batch.length }));

    const checkPromises = batch.map(async (walletDisplay) => {
      if (shouldStopRef.current) return null; // быстрый выход, если попросили остановиться

      try {
        const wallet: BitcoinWallet = {
          privateKey: walletDisplay.privateKey,
          address: walletDisplay.address,
        };

        const balance = await checkWalletWithRetry(wallet);

        checksCountRef.current++;

        const updatedWallet: WalletDisplay = {
          ...walletDisplay,
          status: balance.balance > 0 || balance.totalReceived > 0 ? 'found' : 'checked',
          balance: balance.balance,
        };

        setRecentWallets((prev) =>
          prev.map((w) => (w.address === walletDisplay.address ? updatedWallet : w))
        );

        setStats((prev) => ({
          ...prev,
          checked: prev.checked + 1,
          withBalance: balance.balance > 0 || balance.totalReceived > 0 ? prev.withBalance + 1 : prev.withBalance,
        }));

        if ((balance.balance > 0 || balance.totalReceived > 0) && !shouldStopRef.current) {
          setFoundWallets((prev) => [...prev, balance]);
          // сохраняем найденный кошелек (если у вас настроен supabase)
          try {
            await saveWallet(wallet.privateKey, wallet.address, balance.balance);
          } catch (err) {
            console.error('Failed to save wallet:', err);
          }
        }

        return balance;
      } catch (error) {
        console.error('Error processing wallet:', error);
        setStats((prev) => ({ ...prev, errors: prev.errors + 1, checked: prev.checked + 1 }));
        setRecentWallets((prev) =>
          prev.map((w) => (w.address === walletDisplay.address ? { ...w, status: 'error' as const } : w))
        );
        return null;
      }
    });

    await Promise.all(checkPromises);
    // Небольшая пауза, чтобы не забросать API
    await new Promise((resolve) => setTimeout(resolve, 200));
  };

  const startGeneration = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    shouldStopRef.current = false;
    setStats({ total: 0, checked: 0, withBalance: 0, errors: 0 });
    setFoundWallets([]);
    setRecentWallets([]);
    startTimeRef.current = Date.now();
    checksCountRef.current = 0;

    const runLoop = async () => {
      try {
        while (!shouldStopRef.current) {
          await processBatch();
        }
      } catch (error) {
        console.error('Generation error:', error);
      } finally {
        setIsGenerating(false);
      }
    };

    runLoop();
  };

  const stopGeneration = () => {
    shouldStopRef.current = true;
    setIsGenerating(false);
  };

  const getStatusColor = (status: WalletDisplay['status']) => {
    switch (status) {
      case 'checking':
        return 'border-blue-300 bg-blue-50';
      case 'checked':
        return 'border-gray-300 bg-gray-50';
      case 'found':
        return 'border-green-300 bg-green-50 animate-pulse';
      case 'error':
        return 'border-red-300 bg-red-50';
    }
  };

  const getStatusIcon = (status: WalletDisplay['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'checked':
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
      case 'found':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <Wallet className="w-8 h-8 text-orange-500" />
          <h1 className="text-3xl font-bold text-gray-800">Bitcoin Wallet Scanner</h1>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Educational Project</p>
              <p>
                The probability of finding an existing wallet with balance is astronomically low.
                This demonstrates Bitcoin cryptography in real-time.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Batch Size (wallets per batch)
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={batchSize}
            onChange={(e) => setBatchSize(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
            disabled={isGenerating}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
          />
        </div>

        <button
          onClick={isGenerating ? stopGeneration : startGeneration}
          className={`w-full font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 ${
            isGenerating
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
        >
          {isGenerating ? (
            <>
              <XCircle className="w-5 h-5" />
              Stop Generation
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Start Continuous Generation
            </>
          )}
        </button>

        {stats.total > 0 && (
          <div className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-blue-600 font-medium mb-1">Generated</div>
                <div className="text-xl font-bold text-blue-700">{stats.total}</div>
              </div>
              <div className="bg-cyan-50 rounded-lg p-3">
                <div className="text-xs text-cyan-600 font-medium mb-1">Checked</div>
                <div className="text-xl font-bold text-cyan-700">{stats.checked}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xs text-green-600 font-medium mb-1">Found</div>
                <div className="text-xl font-bold text-green-700">{stats.withBalance}</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="text-xs text-amber-600 font-medium mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Speed
                </div>
                <div className="text-xl font-bold text-amber-700">{speed}/min</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-xs text-red-600 font-medium mb-1">Errors</div>
                <div className="text-xl font-bold text-red-700">{stats.errors}</div>
              </div>
            </div>

            {isGenerating && (
              <div className="mt-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full h-2 overflow-hidden">
                <div className="bg-white h-full w-1/3 animate-pulse"></div>
              </div>
            )}
          </div>
        )}

        {recentWallets.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-bold text-gray-800">Live Feed</h2>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentWallets.map((wallet) => (
                <div
                  key={wallet.address}
                  className={`border rounded-lg p-3 transition-all ${getStatusColor(wallet.status)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-gray-600 truncate">
                        {wallet.address}
                      </div>
                      {wallet.status === 'found' && wallet.balance !== undefined && (
                        <div className="text-sm font-bold text-green-700 mt-1">
                          Balance: {wallet.balance} BTC
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">{getStatusIcon(wallet.status)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {foundWallets.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-bold text-gray-800">Found Wallets with Balance!</h2>
            </div>
            <div className="space-y-3">
              {foundWallets.map((wallet) => (
                <div
                  key={wallet.address}
                  className="bg-green-50 border-2 border-green-300 rounded-lg p-4 shadow-lg"
                >
                  <div className="text-sm font-medium text-gray-600 mb-1">Address</div>
                  <div className="text-sm font-mono text-gray-800 mb-2 break-all">
                    {wallet.address}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Balance:</span>{' '}
                      <span className="font-semibold text-green-700">{wallet.balance} BTC</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Received:</span>{' '}
                      <span className="font-semibold text-gray-700">
                        {wallet.totalReceived} BTC
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}