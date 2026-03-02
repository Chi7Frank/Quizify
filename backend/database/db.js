/**
 * Database Connection Module
 * Provides centralized database access with error handling
 * HCI Principle: Error Prevention - centralized error handling
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'assessment.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db = null;

/**
 * Initialize database connection and create tables
 */
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    // Ensure database directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
        return;
      }
      
      console.log('Connected to SQLite database');
      
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) {
          console.error('Error enabling foreign keys:', err.message);
          reject(err);
          return;
        }
        
        // Run schema
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
        db.exec(schema, (err) => {
          if (err) {
            console.error('Error running schema:', err.message);
            reject(err);
            return;
          }
          
          console.log('Database schema initialized');
          resolve(db);
        });
      });
    });
  });
}

/**
 * Get database instance
 */
function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Close database connection
 */
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }
    
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
        reject(err);
        return;
      }
      
      console.log('Database connection closed');
      db = null;
      resolve();
    });
  });
}

/**
 * Run a query with parameters
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.run(sql, params, function(err) {
      if (err) {
        console.error('SQL Error:', err.message);
        reject(err);
        return;
      }
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Get a single row
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 */
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.get(sql, params, (err, row) => {
      if (err) {
        console.error('SQL Error:', err.message);
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

/**
 * Get all rows
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 */
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.all(sql, params, (err, rows) => {
      if (err) {
        console.error('SQL Error:', err.message);
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  run,
  get,
  all
};
