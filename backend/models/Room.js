/**
 * Room Model
 * Handles all database operations for assessment rooms
 * HCI Principle: Data Integrity - centralized data access
 */

const { run, get, all } = require('../database/db');

class Room {
  /**
   * Generate a unique room code
   * Format: XXXX-XX (4 alphanumeric + 2 alphanumeric)
   */
  static generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += '-';
    for (let i = 0; i < 2; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  
  /**
   * Create a new room
   * @param {Object} roomData - Room data
   * @returns {Promise<Object>} Created room
   */
  static async create({ 
    roomName, 
    creatorId, 
    maxParticipants = null, 
    isUnlimited = true,
    startTime = null,
    endTime = null,
    autoSubmit = true,
    showScores = true,
    showAnswers = false,
    showGrades = true,
    instructions = '',
    registrationFields = null
  }) {
    const roomCode = this.generateRoomCode();
    
    const result = await run(
      `INSERT INTO rooms (room_code, room_name, creator_id, max_participants, is_unlimited, start_time, end_time, auto_submit, show_scores, show_answers, show_grades, instructions, registration_fields) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [roomCode, roomName, creatorId, maxParticipants, isUnlimited, startTime, endTime, autoSubmit, showScores, showAnswers, showGrades, instructions, registrationFields ? JSON.stringify(registrationFields) : null]
    );
    
    return this.findById(result.id);
  }
  
  /**
   * Find room by ID
   * @param {number} id - Room ID
   * @returns {Promise<Object|null>} Room object or null
   */
  static async findById(id) {
    const room = await get(
      `SELECT r.*, u.full_name as creator_name 
       FROM rooms r 
       LEFT JOIN users u ON r.creator_id = u.id 
       WHERE r.id = ?`,
      [id]
    );
    
    if (room) {
      room.registration_fields = room.registration_fields ? JSON.parse(room.registration_fields) : null;
    }
    
    return room || null;
  }
  
  /**
   * Find room by code
   * @param {string} roomCode - Room code
   * @returns {Promise<Object|null>} Room object or null
   */
  static async findByCode(roomCode) {
    const room = await get(
      `SELECT r.*, u.full_name as creator_name 
       FROM rooms r 
       LEFT JOIN users u ON r.creator_id = u.id 
       WHERE r.room_code = ?`,
      [roomCode.toUpperCase()]
    );
    
    if (room) {
      room.registration_fields = room.registration_fields ? JSON.parse(room.registration_fields) : null;
    }
    
    return room || null;
  }
  
  /**
   * Get all rooms by creator
   * @param {number} creatorId - Creator user ID
   * @returns {Promise<Array>} Array of rooms
   */
  static async findByCreator(creatorId) {
    const rooms = await all(
      `SELECT r.*, 
        (SELECT COUNT(*) FROM submissions s WHERE s.room_id = r.id) as participant_count
       FROM rooms r 
       WHERE r.creator_id = ? 
       ORDER BY r.created_at DESC`,
      [creatorId]
    );
    
    return rooms.map(room => ({
      ...room,
      registration_fields: room.registration_fields ? JSON.parse(room.registration_fields) : null
    }));
  }
  
  /**
   * Update room
   * @param {number} id - Room ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated room
   */
  static async update(id, updates) {
    const allowedFields = {
      roomName: 'room_name',
      maxParticipants: 'max_participants',
      isUnlimited: 'is_unlimited',
      startTime: 'start_time',
      endTime: 'end_time',
      autoSubmit: 'auto_submit',
      showScores: 'show_scores',
      showAnswers: 'show_answers',
      showGrades: 'show_grades',
      instructions: 'instructions',
      registrationFields: 'registration_fields',
      status: 'status'
    };
    
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields[key]) {
        fields.push(`${allowedFields[key]} = ?`);
        values.push(key === 'registrationFields' && value ? JSON.stringify(value) : value);
      }
    }
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    values.push(id);
    
    await run(
      `UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return this.findById(id);
  }
  
  /**
   * Delete room
   * @param {number} id - Room ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const result = await run(
      `DELETE FROM rooms WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }
  
  /**
   * Check if room code exists
   * @param {string} roomCode - Room code to check
   * @returns {Promise<boolean>} True if exists
   */
  static async codeExists(roomCode) {
    const room = await get(
      `SELECT 1 FROM rooms WHERE room_code = ?`,
      [roomCode.toUpperCase()]
    );
    return !!room;
  }
  
  /**
   * Get room statistics
   * @param {number} roomId - Room ID
   * @returns {Promise<Object>} Room statistics
   */
  static async getStats(roomId) {
    const stats = await get(
      `SELECT 
        COUNT(*) as total_submissions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
        AVG(percentage) as average_score,
        MAX(percentage) as highest_score,
        MIN(percentage) as lowest_score
       FROM submissions 
       WHERE room_id = ?`,
      [roomId]
    );
    
    return stats;
  }
  
  /**
   * Check if room is active and joinable
   * @param {string} roomCode - Room code
   * @returns {Promise<Object>} Room status
   */
  static async checkJoinable(roomCode) {
    const room = await this.findByCode(roomCode);
    
    if (!room) {
      return { canJoin: false, reason: 'Room not found' };
    }
    
    const now = new Date();
    const startTime = room.start_time ? new Date(room.start_time) : null;
    const endTime = room.end_time ? new Date(room.end_time) : null;
    
    if (room.status === 'closed') {
      return { canJoin: false, reason: 'This room has been closed' };
    }
    
    if (startTime && now < startTime) {
      return { canJoin: false, reason: 'This assessment has not started yet' };
    }
    
    if (endTime && now > endTime) {
      return { canJoin: false, reason: 'This assessment has ended' };
    }
    
    // Check participant limit
    if (!room.is_unlimited && room.max_participants) {
      const count = await get(
        `SELECT COUNT(*) as count FROM submissions WHERE room_id = ?`,
        [room.id]
      );
      
      if (count.count >= room.max_participants) {
        return { canJoin: false, reason: 'This room is full' };
      }
    }
    
    return { canJoin: true, room };
  }
}

module.exports = Room;
