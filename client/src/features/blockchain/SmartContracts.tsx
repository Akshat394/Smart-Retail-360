import React, { useState, useEffect } from 'react';
import { FileText, Play, Pause, Settings, Code, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
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

  useEffect(() => {
    fetchContracts();
    fetchExecutions();
  }, []);

  const fetchContracts = async () => {
    try {
      // Mock data for demo
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
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutions = async () => {
    try {
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
    } catch (error) {
      console.error('Failed to fetch executions:', error);
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contracts List */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-purple-500/40 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Active Contracts</h3>
              {loading ? (
                <div className="text-center py-8">
                  <Clock className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                  <p className="text-gray-400">Loading contracts...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contracts.map((contract) => (
                    <div
                      key={contract.id}
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        selectedContract?.id === contract.id
                          ? 'border-purple-500 bg-gray-700/50'
                          : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedContract(contract)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-white">{contract.name}</h4>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(contract.type)}`}>
                            {contract.type}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(contract.status)}`}>
                            {contract.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">{contract.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Executions: {contract.executionCount}</span>
                        <span>Last: {new Date(contract.lastExecuted).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Contract Details */}
          <div className="lg:col-span-1">
            {selectedContract ? (
              <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-purple-500/40 shadow-xl">
                <h3 className="text-lg font-semibold text-white mb-4">Contract Details</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-white mb-2">{selectedContract.name}</h4>
                    <p className="text-sm text-gray-400">{selectedContract.description}</p>
                  </div>

                  <div>
                    <h5 className="font-medium text-white mb-2">Conditions</h5>
                    <ul className="space-y-1">
                      {selectedContract.conditions.map((condition, index) => (
                        <li key={index} className="text-sm text-gray-300 flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-400" />
                          {condition}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-medium text-white mb-2">Actions</h5>
                    <ul className="space-y-1">
                      {selectedContract.actions.map((action, index) => (
                        <li key={index} className="text-sm text-gray-300 flex items-center gap-2">
                          <Code className="w-3 h-3 text-blue-400" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => executeContract(selectedContract.id)}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Execute
                    </button>
                    <button
                      onClick={() => toggleContractStatus(selectedContract.id, selectedContract.status)}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                        selectedContract.status === 'active'
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {selectedContract.status === 'active' ? (
                        <>
                          <Pause className="w-4 h-4" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Activate
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800/80 rounded-xl p-6 border-2 border-gray-500/40 shadow-xl text-center">
                <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-400 mb-2">No Contract Selected</h3>
                <p className="text-gray-500 text-sm">
                  Select a contract from the list to view details and manage execution
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Executions */}
        <div className="mt-6 bg-gray-800/80 rounded-xl p-6 border-2 border-blue-500/40 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Executions</h3>
          <div className="space-y-3">
            {executions.map((execution) => (
              <div key={execution.id} className="flex items-center gap-4 p-3 bg-gray-700/50 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${
                  execution.status === 'success' ? 'bg-green-400' : 
                  execution.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white">Contract #{execution.contractId}</span>
                    <span className="text-sm text-gray-400">
                      {new Date(execution.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300">{execution.result}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">{execution.gasUsed.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">gas used</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartContracts; 