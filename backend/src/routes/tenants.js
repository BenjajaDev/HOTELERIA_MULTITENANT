const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all tenants (admin only)
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const query = `
      SELECT id, name, subdomain, status, settings, created_at, updated_at
      FROM tenants
      ORDER BY created_at DESC
    `;
    
    const result = await db.queryMaster(query);
    
    res.json({
      tenants: result.rows
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new tenant (super admin only)
router.post('/',
  requireRole('admin'),
  [
    body('name').isLength({ min: 2 }).trim(),
    body('subdomain').isLength({ min: 2 }).matches(/^[a-z0-9-]+$/).trim(),
    body('adminEmail').isEmail().normalizeEmail(),
    body('adminPassword').isLength({ min: 8 }),
    body('adminName').isLength({ min: 2 }).trim()
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

      const { name, subdomain, adminEmail, adminPassword, adminName, settings = {} } = req.body;

      // Start transaction
      await db.transactionMaster(async (client) => {
        // Create tenant record
        const tenantQuery = `
          INSERT INTO tenants (name, subdomain, status, settings, created_at, updated_at)
          VALUES ($1, $2, 'active', $3, NOW(), NOW())
          RETURNING id, name, subdomain
        `;
        
        const tenantResult = await client.query(tenantQuery, [name, subdomain, settings]);
        const tenant = tenantResult.rows[0];

        // Create tenant database
        const createDbQuery = `CREATE DATABASE hotel_tenant_${tenant.id}`;
        await client.query(createDbQuery);

        // Initialize tenant database schema
        await initializeTenantDatabase(tenant.id);

        // Create admin user for tenant
        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash(adminPassword, 12);
        
        const adminQuery = `
          INSERT INTO users (email, password_hash, name, role, status, created_at)
          VALUES ($1, $2, $3, 'admin', 'active', NOW())
          RETURNING id, email, name, role
        `;
        
        const adminResult = await db.queryTenant(tenant.id, adminQuery, [
          adminEmail, passwordHash, adminName
        ]);

        res.status(201).json({
          message: 'Tenant created successfully',
          tenant: {
            id: tenant.id,
            name: tenant.name,
            subdomain: tenant.subdomain
          },
          admin: adminResult.rows[0]
        });
      });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Subdomain already exists' });
      }
      console.error('Create tenant error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update tenant
router.put('/:tenantId',
  requireRole('admin'),
  [
    body('name').optional().isLength({ min: 2 }).trim(),
    body('status').optional().isIn(['active', 'inactive', 'suspended']),
    body('settings').optional().isObject()
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

      const { tenantId } = req.params;
      const updates = req.body;

      const setClause = Object.keys(updates)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');

      const query = `
        UPDATE tenants 
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1
        RETURNING id, name, subdomain, status, settings, updated_at
      `;

      const values = [tenantId, ...Object.values(updates)];
      const result = await db.queryMaster(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      res.json({
        message: 'Tenant updated successfully',
        tenant: result.rows[0]
      });
    } catch (error) {
      console.error('Update tenant error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Helper function to initialize tenant database schema
async function initializeTenantDatabase(tenantId) {
  const schemas = [
    // Users table
    `CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'staff',
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      permissions TEXT[],
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    
    // Hotels table
    `CREATE TABLE hotels (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address TEXT,
      city VARCHAR(100),
      country VARCHAR(100),
      phone VARCHAR(20),
      email VARCHAR(255),
      description TEXT,
      amenities TEXT[],
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    
    // Room types table
    `CREATE TABLE room_types (
      id SERIAL PRIMARY KEY,
      hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      max_occupancy INTEGER NOT NULL,
      base_price DECIMAL(10,2) NOT NULL,
      amenities TEXT[],
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    
    // Rooms table
    `CREATE TABLE rooms (
      id SERIAL PRIMARY KEY,
      hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
      room_type_id INTEGER REFERENCES room_types(id) ON DELETE CASCADE,
      room_number VARCHAR(20) NOT NULL,
      floor INTEGER,
      status VARCHAR(20) NOT NULL DEFAULT 'available',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(hotel_id, room_number)
    )`,
    
    // Reservations table
    `CREATE TABLE reservations (
      id SERIAL PRIMARY KEY,
      hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
      room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
      guest_name VARCHAR(255) NOT NULL,
      guest_email VARCHAR(255),
      guest_phone VARCHAR(20),
      check_in_date DATE NOT NULL,
      check_out_date DATE NOT NULL,
      guests_count INTEGER NOT NULL DEFAULT 1,
      total_amount DECIMAL(10,2),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`
  ];

  for (const schema of schemas) {
    await db.queryTenant(tenantId, schema);
  }
}

module.exports = router;