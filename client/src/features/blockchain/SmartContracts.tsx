import React, { useState, useEffect } from 'react';
import { FileText, Play, Pause, Settings, Code, CheckCircle, AlertTriangle, Clock, Info, Zap } from 'lucide-react';
import { useNotification } from '../../hooks/useNotification';

interface SmartContract {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'draft';
  type: 'automation' | 'verification' | 'payment' | 'compliance';
  lastExecuted: string;
  executionCount: number;
  conditions: string[];
  actions: string[];
}

interface ContractExecution {
  id: string;
  contractId: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: string;
  result: string;
  gasUsed: number;
}

const SmartContracts: React.FC = () => {
  const [contracts, setContracts] = useState<SmartContract[]>([]);
  const [executions, setExecutions] = useState<ContractExecution[]>([]);
  const [selectedContract, setSelectedContract] = useState<SmartContract | null>(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    fetchContracts();
    fetchExecutions();
  }, []);

  const fetchContracts = async () => {
    try {
      const response = await fetch('/api/blockchain/smart-contracts');
      if (response.ok) {
        const data = await response.json();
        setContracts(data.contracts);
      } else {
        throw new Error('No real data');
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
      // Mock data for demonstration
      const mockContracts: SmartContract[] = [
        {
          id: '1',
          name: 'Automated Quality Check',
          description: 'Automatically verifies product quality standards before shipment',
          status: 'active',
          type: 'verification',
          lastExecuted: new Date(Date.now() - 3600000).toISOString(),
          executionCount: 156,
          conditions: ['Product temperature < 25°C', 'Package integrity check passed', 'Label verification complete'],
          actions: ['Approve shipment', 'Update inventory status', 'Generate quality certificate']
        },
        {
          id: '2',
          name: 'Carbon Offset Payment',
          description: 'Automatically processes carbon offset payments based on delivery distance',
          status: 'active',
          type: 'payment',
          lastExecuted: new Date(Date.now() - 7200000).toISOString(),
          executionCount: 89,
          conditions: ['Delivery completed', 'Distance > 50km', 'Green vehicle used'],
          actions: ['Calculate carbon offset', 'Transfer tokens', 'Update sustainability metrics']
        },
        {
          id: '3',
          name: 'Supplier Compliance Check',
          description: 'Verifies supplier compliance with sustainability standards',
          status: 'paused',
          type: 'compliance',
          lastExecuted: new Date(Date.now() - 86400000).toISOString(),
          executionCount: 23,
          conditions: ['Supplier certification valid', 'Environmental audit passed', 'Labor standards met'],
          actions: ['Approve supplier', 'Update supplier status', 'Generate compliance report']
        },
        {
          id: '4',
          name: 'Inventory Reorder Trigger',
          description: 'Automatically triggers reorder when inventory falls below threshold',
          status: 'active',
          type: 'automation',
          lastExecuted: new Date(Date.now() - 1800000).toISOString(),
          executionCount: 234,
          conditions: ['Stock level < minimum threshold', 'Supplier availability confirmed', 'Budget approved'],
          actions: ['Create purchase order', 'Notify procurement team', 'Update forecast']
        }
      ];
      setContracts(mockContracts);
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutions = async () => {
    try {
      const response = await fetch('/api/blockchain/smart-contracts/executions');
      if (response.ok) {
        const data = await response.json();
        setExecutions(data.executions);
      } else {
        throw new Error('No real data');
      }
    } catch (error) {
      console.error('Failed to fetch executions:', error);
      // Mock execution data
      const mockExecutions: ContractExecution[] = [
        {
          id: '1',
          contractId: '1',
          status: 'success',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          result: 'Quality check passed - Shipment approved',
          gasUsed: 45000
        },
        {
          id: '2',
          contractId: '2',
          status: 'success',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          result: 'Carbon offset calculated - 15 tokens transferred',
          gasUsed: 32000
        },
        {
          id: '3',
          contractId: '4',
          status: 'success',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          result: 'Reorder triggered - PO #12345 created',
          gasUsed: 28000
        }
      ];
      setExecutions(mockExecutions);
    }
  };

  const executeContract = async (contractId: string) => {
    try {
      const response = await fetch(`/api/blockchain/smart-contract/${contractId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'manual' })
      });

      if (response.ok) {
        showNotification({ message: 'Contract executed successfully', type: 'success', orderId: 0, customerName: '' });
        fetchContracts();
        fetchExecutions();
      } else {
        throw new Error('Failed to execute contract');
      }
    } catch (error) {
      showNotification({ message: 'Failed to execute contract: ' + (error instanceof Error ? error.message : 'Unknown error'), type: 'error', orderId: 0, customerName: '' });
    }
  };

  const toggleContractStatus = async (contractId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      // Mock status update
      setContracts(prev => prev.map(contract => 
        contract.id === contractId ? { ...contract, status: newStatus as 'active' | 'paused' } : contract
      ));
      showNotification({ message: `Contract ${newStatus}`, type: 'success', orderId: 0, customerName: '' });
    } catch (error) {
      showNotification({ message: 'Failed to update contract status', type: 'error', orderId: 0, customerName: '' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'paused': return 'text-yellow-400';
      case 'draft': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'automation': return 'bg-blue-500/20 text-blue-400';
      case 'verification': return 'bg-green-500/20 text-green-400';
      case 'payment': return 'bg-purple-500/20 text-purple-400';
      case 'compliance': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="text-purple-400 w-8 h-8" />
          <h2 className="text-2xl font-bold text-white">Smart Contracts</h2>
          <button
            className="ml-2 text-gray-400 hover:text-purple-400"
            onClick={() => setShowOnboarding((v) => !v)}
            title="Show onboarding info"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
        {showOnboarding && (
          <div className="bg-purple-900/80 border border-purple-500 rounded-lg p-4 mb-4 text-purple-200 text-sm flex items-center gap-2">
            <Info className="w-4 h-4" />
            Smart contracts automate supply chain actions (e.g., quality checks, carbon offset payments). You can view, execute, and monitor contract status. All actions are tracked for transparency.
          </div>
        )}
        
        {/* Contracts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {contracts.map(contract => (
            <div key={contract.id} className="bg-gray-800/80 rounded-xl p-6 border-2 border-purple-500/40 shadow-xl">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{contract.name}</h3>
                  <p className="text-gray-300 text-sm mb-3">{contract.description}</p>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-medium ${getStatusColor(contract.status)}`}>
                      {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(contract.type)}`}>
                      {contract.type}
                    </span>
          </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleContractStatus(contract.id, contract.status)}
                    className={`px-3 py-1 text-xs rounded ${
                      contract.status === 'active' 
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {contract.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => executeContract(contract.id)}
                    className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded"
                  >
                    Execute
                  </button>
            </div>
          </div>

              <div className="space-y-3">
                  <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-1">Conditions</h4>
                  <ul className="text-xs text-gray-400 space-y-1">
                    {contract.conditions.map((condition, index) => (
                      <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-400" />
                          {condition}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-1">Actions</h4>
                  <ul className="text-xs text-gray-400 space-y-1">
                    {contract.actions.map((action, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Zap className="w-3 h-3 text-blue-400" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>

                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-700">
                  <span>Executions: {contract.executionCount}</span>
                  <span>Last: {contract.lastExecuted ? new Date(contract.lastExecuted).toLocaleDateString() : 'Never'}</span>
                </div>
              </div>
              </div>
          ))}
        </div>

        {/* Recent Executions */}
        <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-purple-500/40 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Executions</h3>
          <div className="space-y-3">
            {executions.map(execution => {
              const contract = contracts.find(c => c.id === execution.contractId);
              return (
                <div key={execution.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-white">{contract?.name || 'Unknown Contract'}</div>
                    <div className="text-xs text-gray-400">{execution.result}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      execution.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {execution.status}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(execution.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartContracts; 