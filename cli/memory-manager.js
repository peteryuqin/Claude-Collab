/**
 * Memory Manager for Claude-Collab
 * Handles persistent key-value storage using SQLite
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class MemoryManager {
  constructor() {
    // Ensure .claude-collab directory exists
    const dataDir = path.join(process.cwd(), '.claude-collab');
    fs.mkdirSync(dataDir, { recursive: true });
    
    // Initialize database
    this.dbPath = path.join(dataDir, 'memory.db');
    this.db = new Database(this.dbPath);
    
    // Create table if not exists
    this.initDatabase();
  }

  /**
   * Initialize database schema
   */
  initDatabase() {
    const createTable = `
      CREATE TABLE IF NOT EXISTS memory (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        type TEXT DEFAULT 'string',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        access_count INTEGER DEFAULT 0,
        tags TEXT,
        ttl INTEGER,
        expires_at DATETIME
      )
    `;
    
    this.db.exec(createTable);
    
    // Create indexes
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_memory_created_at ON memory(created_at)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_memory_expires_at ON memory(expires_at)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_memory_tags ON memory(tags)');
    
    // Clean up expired entries
    this.cleanupExpired();
  }

  /**
   * Store a value in memory
   */
  store(key, value, options = {}) {
    try {
      const type = typeof value;
      const serializedValue = type === 'object' ? JSON.stringify(value) : String(value);
      const tags = options.tags ? JSON.stringify(options.tags) : null;
      const ttl = options.ttl || null;
      const expiresAt = ttl ? new Date(Date.now() + ttl * 1000).toISOString() : null;
      
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO memory (key, value, type, tags, ttl, expires_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      stmt.run(key, serializedValue, type, tags, ttl, expiresAt);
      
      return {
        success: true,
        key: key,
        type: type,
        size: serializedValue.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Retrieve a value from memory
   */
  get(key) {
    try {
      // Clean expired entries first
      this.cleanupExpired();
      
      const stmt = this.db.prepare(`
        UPDATE memory 
        SET accessed_at = CURRENT_TIMESTAMP, 
            access_count = access_count + 1 
        WHERE key = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        RETURNING value, type
      `);
      
      const row = stmt.get(key);
      
      if (!row) {
        return { success: false, error: 'Key not found' };
      }
      
      let value = row.value;
      if (row.type === 'object') {
        try {
          value = JSON.parse(row.value);
        } catch {
          // Return as string if parse fails
        }
      } else if (row.type === 'number') {
        value = Number(row.value);
      } else if (row.type === 'boolean') {
        value = row.value === 'true';
      }
      
      return {
        success: true,
        value: value,
        type: row.type
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List all keys with optional filtering
   */
  list(options = {}) {
    try {
      let query = 'SELECT key, type, created_at, updated_at, access_count, tags FROM memory WHERE 1=1';
      const params = [];
      
      // Filter by pattern
      if (options.pattern) {
        query += ' AND key LIKE ?';
        params.push(options.pattern.replace('*', '%'));
      }
      
      // Filter by tags
      if (options.tags && options.tags.length > 0) {
        const tagConditions = options.tags.map(() => 'tags LIKE ?').join(' OR ');
        query += ` AND (${tagConditions})`;
        options.tags.forEach(tag => params.push(`%"${tag}"%`));
      }
      
      // Filter out expired
      query += ' AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)';
      
      // Sort
      const sortBy = options.sortBy || 'created_at';
      const sortOrder = options.sortOrder || 'DESC';
      query += ` ORDER BY ${sortBy} ${sortOrder}`;
      
      // Limit
      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
      }
      
      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params);
      
      return {
        success: true,
        count: rows.length,
        keys: rows.map(row => ({
          key: row.key,
          type: row.type,
          created: row.created_at,
          updated: row.updated_at,
          accessed: row.access_count,
          tags: row.tags ? JSON.parse(row.tags) : []
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a key from memory
   */
  delete(key) {
    try {
      const stmt = this.db.prepare('DELETE FROM memory WHERE key = ?');
      const result = stmt.run(key);
      
      return {
        success: true,
        deleted: result.changes > 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear all memory
   */
  clear() {
    try {
      this.db.exec('DELETE FROM memory');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get memory statistics
   */
  stats() {
    try {
      const stats = this.db.prepare(`
        SELECT 
          COUNT(*) as total_keys,
          SUM(LENGTH(value)) as total_size,
          AVG(access_count) as avg_access_count,
          MAX(access_count) as max_access_count,
          COUNT(CASE WHEN expires_at IS NOT NULL THEN 1 END) as keys_with_ttl
        FROM memory
        WHERE expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP
      `).get();
      
      const typeStats = this.db.prepare(`
        SELECT type, COUNT(*) as count
        FROM memory
        WHERE expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP
        GROUP BY type
      `).all();
      
      return {
        success: true,
        stats: {
          totalKeys: stats.total_keys || 0,
          totalSize: stats.total_size || 0,
          avgAccessCount: Math.round(stats.avg_access_count || 0),
          maxAccessCount: stats.max_access_count || 0,
          keysWithTTL: stats.keys_with_ttl || 0,
          types: typeStats.reduce((acc, row) => {
            acc[row.type] = row.count;
            return acc;
          }, {})
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export memory to JSON
   */
  export(filepath) {
    try {
      const rows = this.db.prepare(`
        SELECT * FROM memory
        WHERE expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP
      `).all();
      
      const data = rows.map(row => ({
        key: row.key,
        value: row.type === 'object' ? JSON.parse(row.value) : row.value,
        type: row.type,
        tags: row.tags ? JSON.parse(row.tags) : [],
        created: row.created_at,
        updated: row.updated_at,
        accessed: row.access_count
      }));
      
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      
      return {
        success: true,
        count: data.length,
        filepath: filepath
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Import memory from JSON
   */
  import(filepath) {
    try {
      const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid import format: expected array');
      }
      
      let imported = 0;
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO memory (key, value, type, tags, created_at, access_count)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const transaction = this.db.transaction(() => {
        for (const item of data) {
          if (!item.key) continue;
          
          const value = typeof item.value === 'object' 
            ? JSON.stringify(item.value) 
            : String(item.value);
          const type = item.type || typeof item.value;
          const tags = item.tags ? JSON.stringify(item.tags) : null;
          
          stmt.run(
            item.key,
            value,
            type,
            tags,
            item.created || new Date().toISOString(),
            item.accessed || 0
          );
          
          imported++;
        }
      });
      
      transaction();
      
      return {
        success: true,
        imported: imported
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up expired entries
   */
  cleanupExpired() {
    try {
      const stmt = this.db.prepare('DELETE FROM memory WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP');
      const result = stmt.run();
      return result.changes;
    } catch (error) {
      console.error('Error cleaning up expired entries:', error);
      return 0;
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = { MemoryManager };