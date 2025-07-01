import crypto from 'crypto';
import { db } from '../server/src/utils/db';
import { inventory, clickCollectOrders, suppliers } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

export interface ProductTrace {
  productId: string;
  hash: string;
  timestamp: string;
  location: string;
  supplier: string;
  batchNumber: string;
  previousHash?: string;
  metadata: Record<string, any>;
}

export interface GreenToken {
  tokenId: string;
  owner: string;
  amount: number;
  carbonOffset: number; // kg CO2
  mintedAt: string;
  transactionHash: string;
}

export interface SmartContract {
  contractId: string;
  supplierId: string;
  productId: string;
  amount: number;
  conditions: string[];
  status: 'pending' | 'executed' | 'cancelled';
  createdAt: string;
  executedAt?: string;
}

class BlockchainTraceabilityService {
  private productTraces: Map<string, ProductTrace[]> = new Map();
  private greenTokens: Map<string, GreenToken[]> = new Map();
  private smartContracts: Map<string, SmartContract> = new Map();
  private blockchain: ProductTrace[] = [];

  constructor() {
    this.initializeGenesisBlock();
  }

  private initializeGenesisBlock() {
    // Create genesis block
    const genesisBlock: ProductTrace = {
      productId: 'GENESIS',
      hash: this.calculateHash('GENESIS_BLOCK'),
      timestamp: new Date().toISOString(),
      location: 'SYSTEM',
      supplier: 'SYSTEM',
      batchNumber: 'GENESIS-001',
      metadata: { type: 'genesis', description: 'Initial blockchain block' }
    };
    this.blockchain.push(genesisBlock);
  }

  private calculateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private createProductHash(productInfo: Record<string, any>): string {
    const dataString = JSON.stringify(productInfo, Object.keys(productInfo).sort());
    return this.calculateHash(dataString);
  }

  public async createProductTrace(
    productId: string,
    location: string,
    supplier: string,
    batchNumber: string,
    metadata: Record<string, any> = {}
  ): Promise<ProductTrace> {
    try {
      // Get previous hash for this product
      const previousTraces = this.productTraces.get(productId) || [];
      const previousHash = previousTraces.length > 0 
        ? previousTraces[previousTraces.length - 1].hash 
        : this.blockchain[0].hash;

      // Create product info for hashing
      const productInfo = {
        productId,
        location,
        supplier,
        batchNumber,
        timestamp: new Date().toISOString(),
        metadata,
        previousHash
      };

      // Calculate hash
      const hash = this.createProductHash(productInfo);

      // Create trace
      const trace: ProductTrace = {
        productId,
        hash,
        timestamp: new Date().toISOString(),
        location,
        supplier,
        batchNumber,
        previousHash,
        metadata
      };

      // Store trace
      if (!this.productTraces.has(productId)) {
        this.productTraces.set(productId, []);
      }
      this.productTraces.get(productId)!.push(trace);

      // Add to blockchain
      this.blockchain.push(trace);

      // Log the trace creation
      console.log(`Product trace created: ${productId} -> ${hash}`);

      return trace;
    } catch (error) {
      console.error('Error creating product trace:', error);
      throw error;
    }
  }

  public async getProductTraceability(productId: string): Promise<ProductTrace[]> {
    try {
      const traces = this.productTraces.get(productId) || [];
      
      // Verify blockchain integrity
      const verifiedTraces = traces.filter(trace => {
        if (!trace.previousHash) return true;
        
        // Verify previous hash matches
        const previousTrace = traces.find(t => t.hash === trace.previousHash);
        if (!previousTrace) return false;
        
        // Verify current hash
        const productInfo = {
          productId: trace.productId,
          location: trace.location,
          supplier: trace.supplier,
          batchNumber: trace.batchNumber,
          timestamp: trace.timestamp,
          metadata: trace.metadata,
          previousHash: trace.previousHash
        };
        
        const calculatedHash = this.createProductHash(productInfo);
        return calculatedHash === trace.hash;
      });

      return verifiedTraces;
    } catch (error) {
      console.error('Error getting product traceability:', error);
      return [];
    }
  }

  public async mintGreenTokens(
    owner: string,
    amount: number,
    carbonOffset: number
  ): Promise<GreenToken> {
    try {
      const tokenId = crypto.randomUUID();
      const transactionHash = this.calculateHash(`${owner}-${amount}-${Date.now()}`);

      const token: GreenToken = {
        tokenId,
        owner,
        amount,
        carbonOffset,
        mintedAt: new Date().toISOString(),
        transactionHash
      };

      // Store token
      if (!this.greenTokens.has(owner)) {
        this.greenTokens.set(owner, []);
      }
      this.greenTokens.get(owner)!.push(token);

      // Log minting
      console.log(`Green tokens minted: ${amount} tokens for ${owner} (${carbonOffset}kg CO2 offset)`);

      return token;
    } catch (error) {
      console.error('Error minting green tokens:', error);
      throw error;
    }
  }

  public async burnGreenTokens(
    owner: string,
    amount: number
  ): Promise<boolean> {
    try {
      const tokens = this.greenTokens.get(owner) || [];
      
      if (tokens.length < amount) {
        console.error(`Insufficient tokens for ${owner}: ${tokens.length} available, ${amount} requested`);
        return false;
      }

      // Remove tokens (FIFO)
      const tokensToBurn = tokens.splice(0, amount);
      
      // Log burning
      console.log(`Green tokens burned: ${amount} tokens for ${owner}`);

      return true;
    } catch (error) {
      console.error('Error burning green tokens:', error);
      return false;
    }
  }

  public async getGreenTokenBalance(owner: string): Promise<number> {
    try {
      const tokens = this.greenTokens.get(owner) || [];
      return tokens.length;
    } catch (error) {
      console.error('Error getting green token balance:', error);
      return 0;
    }
  }

  public async createSmartContract(
    supplierId: string,
    productId: string,
    amount: number,
    conditions: string[]
  ): Promise<SmartContract> {
    try {
      const contractId = crypto.randomUUID();
      
      const contract: SmartContract = {
        contractId,
        supplierId,
        productId,
        amount,
        conditions,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // Store contract
      this.smartContracts.set(contractId, contract);

      // Log contract creation
      console.log(`Smart contract created: ${contractId} for supplier ${supplierId}`);

      return contract;
    } catch (error) {
      console.error('Error creating smart contract:', error);
      throw error;
    }
  }

  public async executeSmartContract(
    contractId: string,
    deliveryConfirmation: boolean
  ): Promise<boolean> {
    try {
      const contract = this.smartContracts.get(contractId);
      
      if (!contract) {
        console.error(`Smart contract not found: ${contractId}`);
        return false;
      }

      if (contract.status !== 'pending') {
        console.error(`Smart contract ${contractId} is not in pending status`);
        return false;
      }

      // Check conditions
      const conditionsMet = deliveryConfirmation;
      
      if (conditionsMet) {
        // Execute contract
        contract.status = 'executed';
        contract.executedAt = new Date().toISOString();
        
        // Update database
        await db.update(clickCollectOrders)
          .set({ status: 'Delivered' })
          .where(eq(clickCollectOrders.id, parseInt(contract.productId)));

        console.log(`Smart contract executed: ${contractId}`);
        return true;
      } else {
        contract.status = 'cancelled';
        console.log(`Smart contract cancelled: ${contractId}`);
        return false;
      }
    } catch (error) {
      console.error('Error executing smart contract:', error);
      return false;
    }
  }

  public async getSmartContracts(supplierId?: string): Promise<SmartContract[]> {
    try {
      const contracts = Array.from(this.smartContracts.values());
      
      if (supplierId) {
        return contracts.filter(contract => contract.supplierId === supplierId);
      }
      
      return contracts;
    } catch (error) {
      console.error('Error getting smart contracts:', error);
      return [];
    }
  }

  public async verifyProductAuthenticity(productId: string): Promise<boolean> {
    try {
      // Get product traces
      const traces = await this.getProductTraceability(productId);
      
      if (traces.length === 0) {
        console.log(`No traces found for product ${productId}`);
        return false;
      }

      // Verify blockchain integrity
      for (let i = 1; i < traces.length; i++) {
        const currentTrace = traces[i];
        const previousTrace = traces[i - 1];
        
        // Verify previous hash
        if (currentTrace.previousHash !== previousTrace.hash) {
          console.error(`Hash mismatch for product ${productId} at trace ${i}`);
          return false;
        }
        
        // Verify current hash
        const productInfo = {
          productId: currentTrace.productId,
          location: currentTrace.location,
          supplier: currentTrace.supplier,
          batchNumber: currentTrace.batchNumber,
          timestamp: currentTrace.timestamp,
          metadata: currentTrace.metadata,
          previousHash: currentTrace.previousHash
        };
        
        const calculatedHash = this.createProductHash(productInfo);
        if (calculatedHash !== currentTrace.hash) {
          console.error(`Hash verification failed for product ${productId} at trace ${i}`);
          return false;
        }
      }

      console.log(`Product authenticity verified: ${productId}`);
      return true;
    } catch (error) {
      console.error('Error verifying product authenticity:', error);
      return false;
    }
  }

  public async getBlockchainStats(): Promise<Record<string, any>> {
    try {
      const totalTraces = this.blockchain.length - 1; // Exclude genesis block
      const totalProducts = this.productTraces.size;
      const totalTokens = Array.from(this.greenTokens.values()).reduce((sum, tokens) => sum + tokens.length, 0);
      const totalContracts = this.smartContracts.size;
      
      const activeContracts = Array.from(this.smartContracts.values()).filter(c => c.status === 'pending').length;
      const executedContracts = Array.from(this.smartContracts.values()).filter(c => c.status === 'executed').length;

      return {
        totalTraces,
        totalProducts,
        totalTokens,
        totalContracts,
        activeContracts,
        executedContracts,
        blockchainHeight: this.blockchain.length,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting blockchain stats:', error);
      return {};
    }
  }

  public async syncWithDatabase(): Promise<void> {
    try {
      // Sync inventory with blockchain
      const inventoryItems = await db.select().from(inventory);
      
      for (const item of inventoryItems) {
        // Create trace for each inventory item if not exists
        const existingTraces = this.productTraces.get(item.productName) || [];
        if (existingTraces.length === 0) {
          await this.createProductTrace(
            item.productName,
            item.location,
            'SYSTEM',
            `BATCH-${Date.now()}`,
            { quantity: item.quantity, lastUpdated: item.lastUpdated }
          );
        }
      }

      console.log('Blockchain synced with database');
    } catch (error) {
      console.error('Error syncing blockchain with database:', error);
    }
  }
}

export const blockchainService = new BlockchainTraceabilityService(); 