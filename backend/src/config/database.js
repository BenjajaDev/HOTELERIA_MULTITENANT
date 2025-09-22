const { Pool } = require('pg');

class Database {
  constructor() {
    this.pools = new Map(); // Store pools for each tenant
    this.masterPool = null;
    this.init();
  }

  init() {
    // Master database connection for tenant management
    this.masterPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'hoteleria_multitenant',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.masterPool.on('error', (err) => {
      console.error('Unexpected error on idle master database client', err);
    });
  }

  // Get or create a connection pool for a specific tenant
  getTenantPool(tenantId) {
    if (!this.pools.has(tenantId)) {
      const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: `hotel_tenant_${tenantId}`,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      pool.on('error', (err) => {
        console.error(`Unexpected error on idle tenant ${tenantId} database client`, err);
      });

      this.pools.set(tenantId, pool);
    }

    return this.pools.get(tenantId);
  }

  // Get master database connection
  getMasterPool() {
    return this.masterPool;
  }

  // Execute query on master database
  async queryMaster(text, params) {
    const client = await this.masterPool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  // Execute query on tenant database
  async queryTenant(tenantId, text, params) {
    const pool = this.getTenantPool(tenantId);
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  // Transaction support for tenant database
  async transactionTenant(tenantId, callback) {
    const pool = this.getTenantPool(tenantId);
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Transaction support for master database
  async transactionMaster(callback) {
    const client = await this.masterPool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Close all connections
  async close() {
    if (this.masterPool) {
      await this.masterPool.end();
    }

    for (const [tenantId, pool] of this.pools) {
      await pool.end();
    }
    
    this.pools.clear();
  }
}

// Singleton instance
const db = new Database();

module.exports = db;