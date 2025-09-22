const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

// Login
router.post('/login', 
  rateLimiter.auth,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('tenantId').notEmpty().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { email, password, tenantId } = req.body;

      // Verify tenant exists
      const tenantQuery = 'SELECT id, name, status FROM tenants WHERE id = $1 OR subdomain = $1';
      const tenantResult = await db.queryMaster(tenantQuery, [tenantId]);
      
      if (tenantResult.rows.length === 0) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      const tenant = tenantResult.rows[0];
      if (tenant.status !== 'active') {
        return res.status(403).json({ error: 'Tenant is not active' });
      }

      // Find user in tenant database
      const userQuery = `
        SELECT id, email, password_hash, name, role, status 
        FROM users 
        WHERE email = $1 AND status = 'active'
      `;
      const userResult = await db.queryTenant(tenant.id, userQuery, [email]);

      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = userResult.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          tenantId: tenant.id,
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        tenant: {
          id: tenant.id,
          name: tenant.name
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Register (for tenant admin to create users)
router.post('/register',
  rateLimiter.registration,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').isLength({ min: 2 }).trim(),
    body('tenantId').notEmpty().trim(),
    body('role').isIn(['admin', 'manager', 'receptionist', 'staff'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { email, password, name, tenantId, role } = req.body;

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insert user into tenant database
      const insertQuery = `
        INSERT INTO users (email, password_hash, name, role, status, created_at)
        VALUES ($1, $2, $3, $4, 'active', NOW())
        RETURNING id, email, name, role, created_at
      `;

      const result = await db.queryTenant(tenantId, insertQuery, [
        email, passwordHash, name, role
      ]);

      const user = result.rows[0];

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({ error: 'Email already exists' });
      }
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;