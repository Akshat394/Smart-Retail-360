import React, { useState, useEffect } from 'react';
import { Leaf, TrendingUp, TrendingDown, Wallet, Send, RefreshCw, Award } from 'lucide-react';
import { useNotification } from '../../hooks/useNotification';

interface TokenBalance {
  owner: string;
  balance: number;
  totalMinted: number;
  totalBurned: number;
  carbonOffset: number;
}

interface TokenTransaction {
  id: string;
  type: 'mint' | 'burn' | 'transfer';
  amount: number;
  from: string;
  to?: string;
  reason: string;
  timestamp: string;
  carbonOffset: number;
}

const GreenTokens: React.FC = () => {
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [mintAmount, setMintAmount] = useState('');
  const [burnAmount, setBurnAmount] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('company');
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
  }, [selectedOwner]);

  const fetchBalance = async () => {
    try {
      const response = await fetch(`/api/blockchain/green-tokens/balance/${selectedOwner}`);
      if (response.ok) {
        const data = await response.json();
        setBalance(data);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      // Mock transactions for demo
      const mockTransactions: TokenTransaction[] = [
        {
          id: '1',
          type: 'mint',
          amount: 100,
          from: 'system',
          reason: 'Carbon offset from sustainable delivery',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          carbonOffset: 100
        },
        {
          id: '2',
          type: 'burn',
          amount: 25,
          from: selectedOwner,
          reason: 'Carbon neutral certification',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          carbonOffset: 25
        },
        {
          id: '3',
          type: 'mint',
          amount: 50,
          from: 'system',
          reason: 'Green packaging initiative',
          timestamp: new Date(Date.now() - 259200000).toISOString(),
          carbonOffset: 50
        }
      ];
      setTransactions(mockTransactions);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMint = async () => {
    if (!mintAmount || parseFloat(mintAmount) <= 0) {
      showNotification({ message: 'Please enter a valid amount', type: 'error', orderId: 0, customerName: '' });
      return;
    }

    try {
      const response = await fetch('/api/blockchain/green-tokens/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: selectedOwner,
          amount: parseFloat(mintAmount),
          reason: 'Carbon offset achievement'
        })
      });

      if (response.ok) {
        showNotification({ message: 'Tokens minted successfully', type: 'success', orderId: 0, customerName: '' });
        setMintAmount('');
        fetchBalance();
        fetchTransactions();
      } else {
        throw new Error('Failed to mint tokens');
      }
    } catch (error) {
      showNotification({ message: 'Failed to mint tokens: ' + (error instanceof Error ? error.message : 'Unknown error'), type: 'error', orderId: 0, customerName: '' });
    }
  };

  const handleBurn = async () => {
    if (!burnAmount || parseFloat(burnAmount) <= 0) {
      showNotification({ message: 'Please enter a valid amount', type: 'error', orderId: 0, customerName: '' });
      return;
    }

    try {
      const response = await fetch('/api/blockchain/green-tokens/burn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: selectedOwner,
          amount: parseFloat(burnAmount),
          reason: 'Carbon neutral certification'
        })
      });

      if (response.ok) {
        showNotification({ message: 'Tokens burned successfully', type: 'success', orderId: 0, customerName: '' });
        setBurnAmount('');
        fetchBalance();
        fetchTransactions();
      } else {
        throw new Error('Failed to burn tokens');
      }
    } catch (error) {
      showNotification({ message: 'Failed to burn tokens: ' + (error instanceof Error ? error.message : 'Unknown error'), type: 'error', orderId: 0, customerName: '' });
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'mint': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'burn': return <TrendingDown className="w-4 h-4 text-red-400" />;
      case 'transfer': return <Send className="w-4 h-4 text-blue-400" />;
      default: return <RefreshCw className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Leaf className="text-green-400 w-8 h-8" />
          <h2 className="text-2xl font-bold text-white">Green Tokens</h2>
        </div>

        {/* Owner Selection */}
        <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-green-500/40 shadow-xl mb-6">
          <div className="flex items-center gap-4">
            <label className="text-white font-medium">Select Owner:</label>
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-green-500 focus:outline-none"
            >
              <option value="company">Company</option>
              <option value="warehouse-1">Warehouse 1</option>
              <option value="warehouse-2">Warehouse 2</option>
              <option value="supplier-1">Supplier 1</option>
            </select>
          </div>
        </div>

        {/* Balance Overview */}
        {balance && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-green-500/40 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="w-6 h-6 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Current Balance</h3>
              </div>
              <div className="text-3xl font-bold text-green-400">{balance.balance}</div>
              <div className="text-sm text-gray-400">Green Tokens</div>
            </div>

            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-blue-500/40 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Total Minted</h3>
              </div>
              <div className="text-3xl font-bold text-blue-400">{balance.totalMinted}</div>
              <div className="text-sm text-gray-400">Tokens Created</div>
            </div>

            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-red-500/40 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <TrendingDown className="w-6 h-6 text-red-400" />
                <h3 className="text-lg font-semibold text-white">Total Burned</h3>
              </div>
              <div className="text-3xl font-bold text-red-400">{balance.totalBurned}</div>
              <div className="text-sm text-gray-400">Tokens Used</div>
            </div>

            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-purple-500/40 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-6 h-6 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Carbon Offset</h3>
              </div>
              <div className="text-3xl font-bold text-purple-400">{balance.carbonOffset}kg</div>
              <div className="text-sm text-gray-400">CO2 Reduced</div>
            </div>
          </div>
        )}

        {/* Token Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-green-500/40 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Mint Tokens
            </h3>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="Amount to mint"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-green-500 focus:outline-none"
              />
              <button
                onClick={handleMint}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Mint Tokens
              </button>
            </div>
          </div>

          <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-red-500/40 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              Burn Tokens
            </h3>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="Amount to burn"
                value={burnAmount}
                onChange={(e) => setBurnAmount(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-red-500 focus:outline-none"
              />
              <button
                onClick={handleBurn}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Burn Tokens
              </button>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-purple-500/40 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Transaction History</h3>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
              <p className="text-gray-400">Loading transactions...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-lg">
                  {getTransactionIcon(tx.type)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white capitalize">{tx.type}</span>
                      <span className="text-sm text-gray-400">
                        {new Date(tx.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300">{tx.reason}</div>
                    <div className="text-xs text-gray-400">
                      {tx.type === 'transfer' ? `${tx.from} → ${tx.to}` : `From: ${tx.from}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${tx.type === 'mint' ? 'text-green-400' : tx.type === 'burn' ? 'text-red-400' : 'text-blue-400'}`}>
                      {tx.type === 'mint' ? '+' : tx.type === 'burn' ? '-' : '→'} {tx.amount}
                    </div>
                    <div className="text-xs text-gray-400">{tx.carbonOffset}kg CO2</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GreenTokens; 