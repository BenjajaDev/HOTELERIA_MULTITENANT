const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { requirePermission } = require('../middleware/auth');

const router = express.Router();

// Get all hotels for tenant
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT h.*, 
             COUNT(r.id) as total_rooms,
             COUNT(CASE WHEN r.status = 'available' THEN 1 END) as available_rooms
      FROM hotels h
      LEFT JOIN rooms r ON h.id = r.hotel_id
      GROUP BY h.id
      ORDER BY h.created_at DESC
    `;
    
    const result = await db.queryTenant(req.tenant.id, query);
    
    res.json({
      hotels: result.rows
    });
  } catch (error) {
    console.error('Get hotels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get hotel by ID
router.get('/:hotelId', async (req, res) => {
  try {
    const { hotelId } = req.params;
    
    const query = `
      SELECT h.*, 
             COUNT(r.id) as total_rooms,
             COUNT(CASE WHEN r.status = 'available' THEN 1 END) as available_rooms
      FROM hotels h
      LEFT JOIN rooms r ON h.id = r.hotel_id
      WHERE h.id = $1
      GROUP BY h.id
    `;
    
    const result = await db.queryTenant(req.tenant.id, query, [hotelId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hotel not found' });
    }
    
    res.json({
      hotel: result.rows[0]
    });
  } catch (error) {
    console.error('Get hotel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new hotel
router.post('/',
  requirePermission('manage_hotels'),
  [
    body('name').isLength({ min: 2 }).trim(),
    body('address').optional().trim(),
    body('city').optional().trim(),
    body('country').optional().trim(),
    body('phone').optional().trim(),
    body('email').optional().isEmail().normalizeEmail(),
    body('description').optional().trim(),
    body('amenities').optional().isArray()
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

      const { name, address, city, country, phone, email, description, amenities = [] } = req.body;

      const query = `
        INSERT INTO hotels (name, address, city, country, phone, email, description, amenities, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `;

      const values = [name, address, city, country, phone, email, description, amenities];
      const result = await db.queryTenant(req.tenant.id, query, values);

      res.status(201).json({
        message: 'Hotel created successfully',
        hotel: result.rows[0]
      });
    } catch (error) {
      console.error('Create hotel error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update hotel
router.put('/:hotelId',
  requirePermission('manage_hotels'),
  [
    body('name').optional().isLength({ min: 2 }).trim(),
    body('address').optional().trim(),
    body('city').optional().trim(),
    body('country').optional().trim(),
    body('phone').optional().trim(),
    body('email').optional().isEmail().normalizeEmail(),
    body('description').optional().trim(),
    body('amenities').optional().isArray()
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

      const { hotelId } = req.params;
      const updates = req.body;

      const setClause = Object.keys(updates)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');

      const query = `
        UPDATE hotels 
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const values = [hotelId, ...Object.values(updates)];
      const result = await db.queryTenant(req.tenant.id, query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Hotel not found' });
      }

      res.json({
        message: 'Hotel updated successfully',
        hotel: result.rows[0]
      });
    } catch (error) {
      console.error('Update hotel error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete hotel
router.delete('/:hotelId',
  requirePermission('manage_hotels'),
  async (req, res) => {
    try {
      const { hotelId } = req.params;

      const query = 'DELETE FROM hotels WHERE id = $1 RETURNING id';
      const result = await db.queryTenant(req.tenant.id, query, [hotelId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Hotel not found' });
      }

      res.json({
        message: 'Hotel deleted successfully'
      });
    } catch (error) {
      console.error('Delete hotel error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;