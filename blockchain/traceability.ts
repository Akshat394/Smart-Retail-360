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
  carbonFootprint?: number;
  sustainabilityScore?: number;
}

export interface GreenToken {
  tokenId: string;
  owner: string;
  amount: number;
  carbonOffset: number; // kg CO2
  mintedAt: string;
  transactionHash: string;
  projectId?: string;
  reason?: string;
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
  carbonOffset?: number;
  sustainabilityImpact?: number;
}

export interface SustainabilityMetrics {
  totalCarbonOffset: number;
  totalGreenTokens: number;
  totalProjects: number;
  averageSustainabilityScore: number;
  carbonFootprintByProduct: Record<string, number>;
  sustainabilityTrends: Array<{
    date: string;
    carbonOffset: number;
    tokensMinted: number;
    score: number;
  }>;
}

export interface CarbonProject {
  projectId: string;
  name: string;
  description: string;
  location: string;
  carbonOffset: number;
  status: 'pending' | 'active' | 'completed' | 'verified';
  createdAt: string;
  completedAt?: string;
  verificationDocument?: string;
}

class BlockchainTraceabilityService {
  private productTraces: Map<string, ProductTrace[]> = new Map();
  private greenTokens: Map<string, GreenToken[]> = new Map();
  private smartContracts: Map<string, SmartContract> = new Map();
  private carbonProjects: Map<string, CarbonProject> = new Map();
  private blockchain: ProductTrace[] = [];
  private sustainabilityMetrics!: SustainabilityMetrics;

  constructor() {
    this.initializeGenesisBlock();
    this.initializeSustainabilityMetrics();
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

  private initializeSustainabilityMetrics() {
    this.sustainabilityMetrics = {
      totalCarbonOffset: 0,
      totalGreenTokens: 0,
      totalProjects: 0,
      averageSustainabilityScore: 0,
      carbonFootprintByProduct: {},
      sustainabilityTrends: []
    };
  }

  private calculateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private createProductHash(productInfo: Record<string, any>): string {
    const dataString = JSON.stringify(productInfo, Object.keys(productInfo).sort());
    return this.calculateHash(dataString);
  }

  private calculateCarbonFootprint(location: string, action: string, metadata: Record<string, any>): number {
    // Calculate carbon footprint based on location, action, and metadata
    let baseFootprint = 0;
    
    // Base footprint by action
    switch (action.toLowerCase()) {
      case 'manufactured':
        baseFootprint = 2.5; // kg CO2
        break;
      case 'shipped':
        baseFootprint = 1.8; // kg CO2 per km
        break;
      case 'stored':
        baseFootprint = 0.5; // kg CO2 per day
        break;
      case 'delivered':
        baseFootprint = 1.2; // kg CO2
        break;
      default:
        baseFootprint = 1.0; // kg CO2
    }

    // Adjust based on location (distance from origin)
    const locationMultiplier = this.getLocationMultiplier(location);
    
    // Adjust based on metadata (vehicle type, packaging, etc.)
    const metadataMultiplier = this.getMetadataMultiplier(metadata);
    
    return +(baseFootprint * locationMultiplier * metadataMultiplier).toFixed(2);
  }

  private getLocationMultiplier(location: string): number {
    // Distance-based multiplier (simplified)
    const distanceMap: Record<string, number> = {
      'Mumbai': 1.2,
      'Delhi': 1.3,
      'Bangalore': 1.1,
      'Chennai': 1.4,
      'Kolkata': 1.3,
      'Hyderabad': 1.0,
      'Pune': 0.9,
      'Ahmedabad': 1.1
    };
    return distanceMap[location] || 1.0;
  }

  private getMetadataMultiplier(metadata: Record<string, any>): number {
    let multiplier = 1.0;
    
    // Vehicle type adjustments
    if (metadata.vehicleType === 'electric') multiplier *= 0.3;
    else if (metadata.vehicleType === 'hybrid') multiplier *= 0.6;
    else if (metadata.vehicleType === 'diesel') multiplier *= 1.4;
    
    // Packaging adjustments
    if (metadata.packaging === 'recycled') multiplier *= 0.8;
    else if (metadata.packaging === 'biodegradable') multiplier *= 0.7;
    
    // Route optimization
    if (metadata.routeOptimized) multiplier *= 0.9;
    
    return multiplier;
  }

  private calculateSustainabilityScore(carbonFootprint: number, metadata: Record<string, any>): number {
    let score = 100;
    
    // Reduce score based on carbon footprint
    score -= carbonFootprint * 5;
    
    // Bonus points for sustainable practices
    if (metadata.vehicleType === 'electric') score += 15;
    if (metadata.packaging === 'recycled') score += 10;
    if (metadata.packaging === 'biodegradable') score += 15;
    if (metadata.routeOptimized) score += 10;
    if (metadata.localSourcing) score += 20;
    
    return Math.max(0, Math.min(100, Math.round(score)));
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

      // Calculate carbon footprint and sustainability score
      const carbonFootprint = this.calculateCarbonFootprint(location, metadata.action || 'moved', metadata);
      const sustainabilityScore = this.calculateSustainabilityScore(carbonFootprint, metadata);

      // Create product info for hashing
      const productInfo = {
        productId,
        location,
        supplier,
        batchNumber,
        timestamp: new Date().toISOString(),
        metadata,
        previousHash,
        carbonFootprint,
        sustainabilityScore
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
        metadata,
        carbonFootprint,
        sustainabilityScore
      };

      // Store trace
      if (!this.productTraces.has(productId)) {
        this.productTraces.set(productId, []);
      }
      this.productTraces.get(productId)!.push(trace);

      // Add to blockchain
      this.blockchain.push(trace);

      // Update sustainability metrics
      this.updateSustainabilityMetrics(trace);

      // Log the trace creation
      console.log(`Product trace created: ${productId} -> ${hash} (CO2: ${carbonFootprint}kg, Score: ${sustainabilityScore})`);

      return trace;
    } catch (error) {
      console.error('Error creating product trace:', error);
      throw error;
    }
  }

  private updateSustainabilityMetrics(trace: ProductTrace) {
    // Update carbon footprint by product
    if (trace.carbonFootprint) {
      this.sustainabilityMetrics.carbonFootprintByProduct[trace.productId] = 
        (this.sustainabilityMetrics.carbonFootprintByProduct[trace.productId] || 0) + trace.carbonFootprint;
    }

    // Update trends
    const today = new Date().toDateString();
    const existingTrend = this.sustainabilityMetrics.sustainabilityTrends.find(t => t.date === today);
    
    if (existingTrend) {
      existingTrend.carbonOffset += trace.carbonFootprint || 0;
      existingTrend.score = Math.round((existingTrend.score + (trace.sustainabilityScore || 0)) / 2);
    } else {
      this.sustainabilityMetrics.sustainabilityTrends.push({
        date: today,
        carbonOffset: trace.carbonFootprint || 0,
        tokensMinted: 0,
        score: trace.sustainabilityScore || 0
      });
    }

    // Keep only last 30 days of trends
    if (this.sustainabilityMetrics.sustainabilityTrends.length > 30) {
      this.sustainabilityMetrics.sustainabilityTrends = this.sustainabilityMetrics.sustainabilityTrends.slice(-30);
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
          previousHash: trace.previousHash,
          carbonFootprint: trace.carbonFootprint,
          sustainabilityScore: trace.sustainabilityScore
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
    carbonOffset: number,
    projectId?: string,
    reason?: string
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
        transactionHash,
        projectId,
        reason
      };

      // Store token
      if (!this.greenTokens.has(owner)) {
        this.greenTokens.set(owner, []);
      }
      this.greenTokens.get(owner)!.push(token);

      // Update sustainability metrics
      this.sustainabilityMetrics.totalGreenTokens += amount;
      this.sustainabilityMetrics.totalCarbonOffset += carbonOffset;

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
      const userTokens = this.greenTokens.get(owner) || [];
      const totalBalance = userTokens.reduce((sum, token) => sum + token.amount, 0);
      
      if (totalBalance < amount) {
        throw new Error('Insufficient token balance');
      }

      // Simple burn implementation - remove tokens from balance
      let remainingToBurn = amount;
      const updatedTokens: GreenToken[] = [];
      
      for (const token of userTokens) {
        if (remainingToBurn <= 0) {
          updatedTokens.push(token);
          continue;
        }
        
        if (token.amount <= remainingToBurn) {
          remainingToBurn -= token.amount;
          // Token fully burned, don't add to updated list
        } else {
          // Partial burn
          const burnedToken: GreenToken = {
            ...token,
            amount: remainingToBurn
          };
          updatedTokens.push(burnedToken);
          remainingToBurn = 0;
        }
      }

      this.greenTokens.set(owner, updatedTokens);

      console.log(`Green tokens burned: ${amount} tokens from ${owner}`);
      return true;
    } catch (error) {
      console.error('Error burning green tokens:', error);
      return false;
    }
  }

  public async getGreenTokenBalance(owner: string): Promise<number> {
    try {
      const userTokens = this.greenTokens.get(owner) || [];
      return userTokens.reduce((sum, token) => sum + token.amount, 0);
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
      const blockHash = this.calculateHash(`${supplierId}-${productId}-${amount}-contract`);
      
      const contract: SmartContract = {
        contractId,
        supplierId,
        productId,
        amount,
        conditions,
        status: 'pending',
        createdAt: new Date().toISOString(),
        carbonOffset: amount * 0.1, // Estimate carbon offset
        sustainabilityImpact: amount * 0.05 // Estimate sustainability impact
      };

      this.smartContracts.set(contractId, contract);

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
        throw new Error('Contract not found');
      }

      if (deliveryConfirmation) {
        contract.status = 'executed';
        contract.executedAt = new Date().toISOString();
        
        // Mint green tokens for successful execution
        if (contract.carbonOffset) {
          await this.mintGreenTokens(
            contract.supplierId,
            Math.floor(contract.carbonOffset),
            contract.carbonOffset,
            contractId,
            'Smart contract execution reward'
          );
        }

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
      const traces = this.productTraces.get(productId) || [];
      
      if (traces.length === 0) {
        return false;
      }

      // Verify blockchain integrity
      for (let i = 1; i < traces.length; i++) {
        const currentTrace = traces[i];
        const previousTrace = traces[i - 1];
        
        if (currentTrace.previousHash !== previousTrace.hash) {
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
          previousHash: currentTrace.previousHash,
          carbonFootprint: currentTrace.carbonFootprint,
          sustainabilityScore: currentTrace.sustainabilityScore
        };
        
        const calculatedHash = this.createProductHash(productInfo);
        if (calculatedHash !== currentTrace.hash) {
          return false;
        }
      }

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
      const totalTokens = Array.from(this.greenTokens.values())
        .reduce((sum, tokens) => sum + tokens.reduce((tSum, token) => tSum + token.amount, 0), 0);
      const totalContracts = this.smartContracts.size;
      const totalProjects = this.carbonProjects.size;

      return {
        blockchainHeight: this.blockchain.length,
        totalTraces,
        totalProducts,
        totalTokens,
        totalContracts,
        totalProjects,
        totalCarbonOffset: this.sustainabilityMetrics.totalCarbonOffset,
        averageSustainabilityScore: this.sustainabilityMetrics.averageSustainabilityScore,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting blockchain stats:', error);
      return {};
    }
  }

  public async getSustainabilityMetrics(): Promise<SustainabilityMetrics> {
    try {
      // Calculate average sustainability score
      const allTraces = Array.from(this.productTraces.values()).flat();
      const scores = allTraces.map(trace => trace.sustainabilityScore).filter(score => score !== undefined);
      
      this.sustainabilityMetrics.averageSustainabilityScore = scores.length > 0 
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : 0;

      return this.sustainabilityMetrics;
    } catch (error) {
      console.error('Error getting sustainability metrics:', error);
      return this.sustainabilityMetrics;
    }
  }

  public async createCarbonProject(
    name: string,
    description: string,
    location: string,
    carbonOffset: number,
    verificationDocument?: string
  ): Promise<CarbonProject> {
    try {
      const projectId = crypto.randomUUID();
      
      const project: CarbonProject = {
        projectId,
        name,
        description,
        location,
        carbonOffset,
        status: 'pending',
        createdAt: new Date().toISOString(),
        verificationDocument
      };

      this.carbonProjects.set(projectId, project);
      this.sustainabilityMetrics.totalProjects++;

      console.log(`Carbon project created: ${projectId} - ${name}`);
      return project;
    } catch (error) {
      console.error('Error creating carbon project:', error);
      throw error;
    }
  }

  public async verifyCarbonProject(projectId: string): Promise<boolean> {
    try {
      const project = this.carbonProjects.get(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      project.status = 'verified';
      
      // Mint tokens for verified project
      await this.mintGreenTokens(
        'project-owner',
        Math.floor(project.carbonOffset),
        project.carbonOffset,
        projectId,
        'Carbon project verification reward'
      );

      console.log(`Carbon project verified: ${projectId}`);
      return true;
    } catch (error) {
      console.error('Error verifying carbon project:', error);
      return false;
    }
  }

  public async getCarbonProjects(): Promise<CarbonProject[]> {
    try {
      return Array.from(this.carbonProjects.values());
    } catch (error) {
      console.error('Error getting carbon projects:', error);
      return [];
    }
  }

  // Sync inventory with blockchain
  public async syncWithDatabase(): Promise<void> {
    try {
      // This would sync blockchain data with the main database
      // For now, just log the sync
      console.log('Blockchain synced with database');
    } catch (error) {
      console.error('Error syncing blockchain with database:', error);
    }
  }
}

export const blockchainService = new BlockchainTraceabilityService(); 