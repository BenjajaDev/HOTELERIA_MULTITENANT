const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user information from tenant database
    const userQuery = `
      SELECT id, email, name, role, status, permissions
      FROM users 
      WHERE id = $1 AND status = 'active'
    `;
    
    const result = await db.queryTenant(req.tenant.id, userQuery, [decoded.userId]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'User not found or inactive'
      });
    }

    const user = result.rows[0];
    
    // Add user information to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions || []
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Token expired'
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed'
    });
  }
};

// Middleware to check if user has specific permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required'
      });
    }

    // Admin role has all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user has the required permission
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `Permission '${permission}' required`
      });
    }

    next();
  };
};

// Middleware to check if user has specific role
const requireRole = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `Role must be one of: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  requirePermission,
  requireRole
};