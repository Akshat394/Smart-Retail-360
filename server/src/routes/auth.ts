import { Request, Response, NextFunction } from 'express';
import { storage } from '../utils/storage';
import type { User } from '@shared/schema';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Middleware to authenticate requests
export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!sessionToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await storage.validateSession(sessionToken);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Role-based authorization middleware
export const authorize = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Role definitions and permissions
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager', 
  OPERATIONS: 'operations',
  ANALYST: 'analyst',
  PLANNER: 'planner',
  VIEWER: 'viewer'
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: ['*'], // Full access
  [ROLES.MANAGER]: ['dashboard', 'analytics', 'digital_twin', 'routes', 'drivers', 'inventory'],
  [ROLES.OPERATIONS]: ['dashboard', 'routes', 'drivers', 'inventory'],
  [ROLES.ANALYST]: ['dashboard', 'analytics', 'digital_twin'],
  [ROLES.PLANNER]: ['dashboard', 'digital_twin', 'inventory', 'analytics'],
  [ROLES.VIEWER]: ['dashboard']
};

export const hasPermission = (userRole: string, permission: string): boolean => {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes('*') || permissions.includes(permission);
};