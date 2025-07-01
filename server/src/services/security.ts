import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { db } from '@server/utils/db';
import { users } from '@shared/schema';
import { eq, sql, desc } from 'drizzle-orm';

export interface EncryptionKeys {
  publicKey: string;
  privateKey: string;
  algorithm: string;
}

export interface TOTPSecret {
  userId: number;
  secret: string;
  enabled: boolean;
  backupCodes: string[];
  createdAt: string;
}

export interface AuditLogEntry {
  id?: number;
  userId: number;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  success: boolean;
}

export interface GDPRDataRequest {
  userId: number;
  requestType: 'export' | 'delete' | 'rectify';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  completedAt?: string;
  data?: Record<string, any>;
}

class SecurityService {
  private encryptionKeys: Map<number, EncryptionKeys> = new Map();
  private totpSecrets: Map<number, TOTPSecret> = new Map();
  private sessionTokens: Map<string, { userId: number; expiresAt: Date }> = new Map();

  constructor() {
    this.initializeSecurity();
  }

  private async initializeSecurity() {
    // Generate encryption keys for the system
    await this.generateSystemKeys();
    
    // Load existing TOTP secrets
    await this.loadTOTPSecrets();
    
    // Clean up expired sessions
    setInterval(() => this.cleanupExpiredSessions(), 300000); // Every 5 minutes
  }

  private async generateSystemKeys(): Promise<void> {
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      const systemKeys: EncryptionKeys = {
        publicKey,
        privateKey,
        algorithm: 'RSA-2048'
      };

      this.encryptionKeys.set(0, systemKeys); // System-wide keys
      console.log('System encryption keys generated');
    } catch (error) {
      console.error('Error generating system keys:', error);
    }
  }

  private async loadTOTPSecrets(): Promise<void> {
    try {
      // In real implementation, this would load from database
      console.log('TOTP secrets loaded');
    } catch (error) {
      console.error('Error loading TOTP secrets:', error);
    }
  }

  // End-to-End Encryption
  public async encryptSensitiveData(data: string, userId?: number): Promise<string> {
    try {
      const keys = userId ? this.encryptionKeys.get(userId) : this.encryptionKeys.get(0);
      if (!keys) {
        throw new Error('Encryption keys not found');
      }

      // Generate a random AES key for data encryption
      const aesKey = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);

      // Encrypt data with AES
      const cipher = crypto.createCipher('aes-256-cbc', aesKey);
      let encryptedData = cipher.update(data, 'utf8', 'hex');
      encryptedData += cipher.final('hex');

      // Encrypt AES key with RSA public key
      const encryptedKey = crypto.publicEncrypt(
        keys.publicKey,
        Buffer.from(aesKey)
      );

      // Combine encrypted key and data
      const combined = {
        encryptedKey: encryptedKey.toString('base64'),
        iv: iv.toString('hex'),
        encryptedData
      };

      return JSON.stringify(combined);
    } catch (error) {
      console.error('Error encrypting data:', error);
      throw error;
    }
  }

  public async decryptSensitiveData(encryptedData: string, userId?: number): Promise<string> {
    try {
      const keys = userId ? this.encryptionKeys.get(userId) : this.encryptionKeys.get(0);
      if (!keys) {
        throw new Error('Encryption keys not found');
      }

      const combined = JSON.parse(encryptedData);
      
      // Decrypt AES key with RSA private key
      const aesKey = crypto.privateDecrypt(
        keys.privateKey,
        Buffer.from(combined.encryptedKey, 'base64')
      );

      // Decrypt data with AES
      const decipher = crypto.createDecipher('aes-256-cbc', aesKey);
      let decryptedData = decipher.update(combined.encryptedData, 'hex', 'utf8');
      decryptedData += decipher.final('utf8');

      return decryptedData;
    } catch (error) {
      console.error('Error decrypting data:', error);
      throw error;
    }
  }

  // TOTP-based 2FA
  public async setupTOTP(userId: number): Promise<{ secret: string; qrCode: string }> {
    try {
      // Generate TOTP secret
      const secret = authenticator.generateSecret();
      
      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      
      // Store TOTP secret
      const totpSecret: TOTPSecret = {
        userId,
        secret,
        enabled: false,
        backupCodes,
        createdAt: new Date().toISOString()
      };
      
      this.totpSecrets.set(userId, totpSecret);
      
      // Generate QR code URL
      const qrCode = authenticator.keyuri(
        `user-${userId}`,
        'SmartRetail360',
        secret
      );
      
      return { secret, qrCode };
    } catch (error) {
      console.error('Error setting up TOTP:', error);
      throw error;
    }
  }

  public async verifyTOTP(userId: number, token: string): Promise<boolean> {
    try {
      const totpSecret = this.totpSecrets.get(userId);
      if (!totpSecret || !totpSecret.enabled) {
        return false;
      }

      // Verify TOTP token
      const isValid = authenticator.verify({
        token,
        secret: totpSecret.secret
      });

      if (isValid) {
        // Log successful verification
        await this.logAuditEvent(userId, '2FA_VERIFICATION', 'user', userId.toString(), {
          method: 'totp',
          success: true
        }, '127.0.0.1', 'SecurityService');
      }

      return isValid;
    } catch (error) {
      console.error('Error verifying TOTP:', error);
      return false;
    }
  }

  public async verifyBackupCode(userId: number, backupCode: string): Promise<boolean> {
    try {
      const totpSecret = this.totpSecrets.get(userId);
      if (!totpSecret || !totpSecret.enabled) {
        return false;
      }

      const isValid = totpSecret.backupCodes.includes(backupCode);
      
      if (isValid) {
        // Remove used backup code
        totpSecret.backupCodes = totpSecret.backupCodes.filter(code => code !== backupCode);
        
        // Log successful verification
        await this.logAuditEvent(userId, '2FA_VERIFICATION', 'user', userId.toString(), {
          method: 'backup_code',
          success: true
        }, '127.0.0.1', 'SecurityService');
      }

      return isValid;
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return false;
    }
  }

  public async enableTOTP(userId: number): Promise<boolean> {
    try {
      const totpSecret = this.totpSecrets.get(userId);
      if (!totpSecret) {
        return false;
      }

      totpSecret.enabled = true;
      
      // Log TOTP enablement
      await this.logAuditEvent(userId, '2FA_ENABLED', 'user', userId.toString(), {
        method: 'totp'
      }, '127.0.0.1', 'SecurityService');
      
      return true;
    } catch (error) {
      console.error('Error enabling TOTP:', error);
      return false;
    }
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  // GDPR Compliance
  public async exportUserData(userId: number): Promise<Record<string, any>> {
    try {
      // Get user data
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (user.length === 0) {
        throw new Error('User not found');
      }

      // Get other related data (orders, preferences, etc.)
      // This would include all data related to the user

      const userData = {
        personalInformation: {
          id: user[0].id,
          email: user[0].email,
          role: user[0].role,
          createdAt: user[0].createdAt,
          updatedAt: user[0].updatedAt
        },
        dataProcessingActivities: [
          {
            purpose: 'Account Management',
            legalBasis: 'Contract',
            retentionPeriod: '7 years'
          },
          {
            purpose: 'Security Monitoring',
            legalBasis: 'Legitimate Interest',
            retentionPeriod: '2 years'
          }
        ],
        dataRights: [
          'Right to access',
          'Right to rectification',
          'Right to erasure',
          'Right to data portability',
          'Right to object'
        ],
        exportDate: new Date().toISOString()
      };

      // Log data export
      await this.logAuditEvent(userId, 'GDPR_DATA_EXPORT', 'user', userId.toString(), {
        exportType: 'user_data',
        dataSize: JSON.stringify(userData).length
      }, '127.0.0.1', 'SecurityService');

      return userData;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  public async deleteUserData(userId: number): Promise<boolean> {
    try {
      // Start transaction
      await db.transaction(async (tx) => {
        // Anonymize user data instead of complete deletion (for audit purposes)
        await tx.update(users)
          .set({
            email: `deleted-${userId}@deleted.com`,
            password: await bcrypt.hash('deleted', 10),
            role: 'DELETED',
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));
      });

      // Log data deletion
      await this.logAuditEvent(userId, 'GDPR_DATA_DELETION', 'user', userId.toString(), {
        deletionType: 'anonymization',
        reason: 'GDPR right to erasure'
      }, '127.0.0.1', 'SecurityService');

      return true;
    } catch (error) {
      console.error('Error deleting user data:', error);
      return false;
    }
  }

  public async rectifyUserData(userId: number, corrections: Record<string, any>): Promise<boolean> {
    try {
      // Update user data
      await db.update(users)
        .set({
          ...corrections,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Log data rectification
      await this.logAuditEvent(userId, 'GDPR_DATA_RECTIFICATION', 'user', userId.toString(), {
        corrections,
        reason: 'GDPR right to rectification'
      }, '127.0.0.1', 'SecurityService');

      return true;
    } catch (error) {
      console.error('Error rectifying user data:', error);
      return false;
    }
  }

  // Audit Logging
  public async logAuditEvent(
    userId: number,
    action: string,
    resource: string,
    resourceId: string,
    details: Record<string, any>,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        userId,
        action,
        resource,
        resourceId,
        details,
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString(),
        success: true
      };

      // Mock implementation - in real app, this would insert into audit logs table
      console.log('Audit event logged:', auditEntry);
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }

  public async getAuditLogs(
    userId?: number,
    action?: string,
    startDate?: string,
    endDate?: string,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    try {
      // Mock implementation - in real app, this would query the audit logs table
      const mockLogs: AuditLogEntry[] = [
        {
          id: 1,
          userId: userId || 1,
          action: action || 'login',
          resource: 'user',
          resourceId: '1',
          details: { ip: '192.168.1.1' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date().toISOString(),
          success: true
        }
      ];
      
      return mockLogs.slice(0, limit);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  }

  // Session Management
  public async createSession(userId: number, expiresInHours: number = 24): Promise<string> {
    try {
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

      this.sessionTokens.set(sessionToken, { userId, expiresAt });

      // Log session creation
      await this.logAuditEvent(userId, 'SESSION_CREATED', 'session', sessionToken, {
        expiresInHours,
        expiresAt: expiresAt.toISOString()
      }, '127.0.0.1', 'SecurityService');

      return sessionToken;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  public async validateSession(sessionToken: string): Promise<number | null> {
    try {
      const session = this.sessionTokens.get(sessionToken);
      
      if (!session || session.expiresAt < new Date()) {
        return null;
      }

      return session.userId;
    } catch (error) {
      console.error('Error validating session:', error);
      return null;
    }
  }

  public async invalidateSession(sessionToken: string): Promise<boolean> {
    try {
      const session = this.sessionTokens.get(sessionToken);
      if (session) {
        this.sessionTokens.delete(sessionToken);
        
        // Log session invalidation
        await this.logAuditEvent(session.userId, 'SESSION_INVALIDATED', 'session', sessionToken, {
          reason: 'manual_logout'
        }, '127.0.0.1', 'SecurityService');
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error invalidating session:', error);
      return false;
    }
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredTokens: string[] = [];
    
    // Collect expired tokens
    for (const [token, session] of Array.from(this.sessionTokens.entries())) {
      if (session.expiresAt < now) {
        expiredTokens.push(token);
      }
    }
    
    // Remove expired tokens
    expiredTokens.forEach(token => {
      this.sessionTokens.delete(token);
    });
    
    if (expiredTokens.length > 0) {
      console.log(`Cleaned up ${expiredTokens.length} expired sessions`);
    }
  }

  // Security Utilities
  public async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  public validateInput(input: string, type: 'email' | 'username' | 'password'): boolean {
    switch (type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(input);
      case 'username':
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(input);
      case 'password':
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(input);
      default:
        return false;
    }
  }

  public sanitizeInput(input: string): string {
    // Basic XSS prevention
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Security Headers
  public getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    };
  }
}

export const securityService = new SecurityService(); 