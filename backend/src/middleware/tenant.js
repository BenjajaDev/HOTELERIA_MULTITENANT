const db = require('../config/database');

// Middleware to extract and validate tenant information
const tenantMiddleware = async (req, res, next) => {
  try {
    // Extract tenant ID from various sources
    let tenantId = req.headers['x-tenant-id'] || 
                   req.query.tenant || 
                   req.body.tenantId ||
                   req.params.tenantId;

    // If no tenant ID provided, try to extract from subdomain
    if (!tenantId && req.headers.host) {
      const subdomain = req.headers.host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        tenantId = subdomain;
      }
    }

    if (!tenantId) {
      return res.status(400).json({
        error: 'Tenant ID is required',
        message: 'Please provide tenant ID in header (x-tenant-id), query param (tenant), or subdomain'
      });
    }

    // Validate tenant exists and is active
    const tenantQuery = `
      SELECT id, name, subdomain, status, settings 
      FROM tenants 
      WHERE id = $1 OR subdomain = $1
    `;
    
    const result = await db.queryMaster(tenantQuery, [tenantId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Tenant not found',
        message: `Tenant with ID '${tenantId}' does not exist`
      });
    }

    const tenant = result.rows[0];

    if (tenant.status !== 'active') {
      return res.status(403).json({
        error: 'Tenant inactive',
        message: `Tenant '${tenant.name}' is currently ${tenant.status}`
      });
    }

    // Add tenant information to request object
    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      settings: tenant.settings || {}
    };

    // Test tenant database connection
    try {
      await db.queryTenant(tenant.id, 'SELECT 1');
    } catch (dbError) {
      console.error(`Database connection failed for tenant ${tenant.id}:`, dbError);
      return res.status(503).json({
        error: 'Tenant database unavailable',
        message: 'Please try again later'
      });
    }

    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process tenant information'
    });
  }
};

module.exports = tenantMiddleware;