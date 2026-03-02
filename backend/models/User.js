/**
 * User Model
 * Handles all database operations for users
 * HCI Principle: Data Integrity - centralized data access
 */

const { run, get, all } = require('../database/db');

class User {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  static async create({ email, passwordHash, fullName, role }) {
    const result = await run(
      `INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)`,
      [email, passwordHash, fullName, role]
    );
    
    return this.findById(result.id);
  }
  
  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  static async findById(id) {
    const user = await get(
      `SELECT id, email, full_name, role, created_at FROM users WHERE id = ?`,
      [id]
    );
    return user || null;
  }
  
  /**
   * Find user by email (includes password for authentication)
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null
   */
  static async findByEmail(email) {
    const user = await get(
      `SELECT * FROM users WHERE email = ?`,
      [email.toLowerCase()]
    );
    return user || null;
  }
  
  /**
   * Find user by email with password (for login)
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object with password or null
   */
  static async findByEmailWithPassword(email) {
    return await get(
      `SELECT * FROM users WHERE email = ?`,
      [email.toLowerCase()]
    );
  }
  
  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated user
   */
  static async update(id, updates) {
    const allowedFields = ['email', 'full_name', 'role'];
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      const dbField = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(dbField)) {
        fields.push(`${dbField} = ?`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    values.push(id);
    
    await run(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return this.findById(id);
  }
  
  /**
   * Update user password
   * @param {number} id - User ID
   * @param {string} passwordHash - New password hash
   * @returns {Promise<boolean>} Success status
   */
  static async updatePassword(id, passwordHash) {
    const result = await run(
      `UPDATE users SET password_hash = ? WHERE id = ?`,
      [passwordHash, id]
    );
    return result.changes > 0;
  }
  
  /**
   * Delete user
   * @param {number} id - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const result = await run(
      `DELETE FROM users WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }
  
  /**
   * Get all users (with optional filtering)
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} Array of users
   */
  static async findAll(filters = {}) {
    let sql = `SELECT id, email, full_name, role, created_at FROM users WHERE 1=1`;
    const params = [];
    
    if (filters.role) {
      sql += ` AND role = ?`;
      params.push(filters.role);
    }
    
    sql += ` ORDER BY created_at DESC`;
    
    return await all(sql, params);
  }
  
  /**
   * Check if email exists
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} True if exists
   */
  static async emailExists(email) {
    const user = await get(
      `SELECT 1 FROM users WHERE email = ?`,
      [email.toLowerCase()]
    );
    return !!user;
  }
}

module.exports = User;
