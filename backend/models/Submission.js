/**
 * Submission Model
 * Handles all database operations for exam submissions
 * HCI Principles: 
 * - Error Prevention: Auto-save functionality
 * - Visibility of System Status: Track submission status
 */

const { run, get, all } = require('../database/db');

class Submission {
  /**
   * Create a new submission (when student starts exam)
   * @param {Object} submissionData - Submission data
   * @returns {Promise<Object>} Created submission
   */
  static async create({ roomId, userId = null, registrationData = null }) {
    const result = await run(
      `INSERT INTO submissions (room_id, user_id, registration_data, status) VALUES (?, ?, ?, ?)`,
      [roomId, userId, registrationData ? JSON.stringify(registrationData) : null, 'in_progress']
    );
    
    return this.findById(result.id);
  }
  
  /**
   * Find submission by ID
   * @param {number} id - Submission ID
   * @returns {Promise<Object|null>} Submission object or null
   */
  static async findById(id) {
    const submission = await get(
      `SELECT s.*, r.room_name, r.room_code, r.show_scores, r.show_answers, r.show_grades
       FROM submissions s
       JOIN rooms r ON s.room_id = r.id
       WHERE s.id = ?`,
      [id]
    );
    
    if (submission) {
      submission.registration_data = submission.registration_data ? JSON.parse(submission.registration_data) : null;
      submission.answers = submission.answers ? JSON.parse(submission.answers) : null;
    }
    
    return submission || null;
  }
  
  /**
   * Find submission by room and user
   * @param {number} roomId - Room ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Submission object or null
   */
  static async findByRoomAndUser(roomId, userId) {
    const submission = await get(
      `SELECT s.*, r.room_name, r.room_code, r.show_scores, r.show_answers, r.show_grades
       FROM submissions s
       JOIN rooms r ON s.room_id = r.id
       WHERE s.room_id = ? AND s.user_id = ?`,
      [roomId, userId]
    );
    
    if (submission) {
      submission.registration_data = submission.registration_data ? JSON.parse(submission.registration_data) : null;
      submission.answers = submission.answers ? JSON.parse(submission.answers) : null;
    }
    
    return submission || null;
  }
  
  /**
   * Get all submissions for a room
   * @param {number} roomId - Room ID
   * @returns {Promise<Array>} Array of submissions
   */
  static async findByRoom(roomId) {
    const submissions = await all(
      `SELECT s.*, u.full_name, u.email
       FROM submissions s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.room_id = ?
       ORDER BY s.submitted_at DESC`,
      [roomId]
    );
    
    return submissions.map(s => ({
      ...s,
      registration_data: s.registration_data ? JSON.parse(s.registration_data) : null,
      answers: s.answers ? JSON.parse(s.answers) : null
    }));
  }
  
  /**
   * Update submission answers (auto-save)
   * @param {number} id - Submission ID
   * @param {Object} answers - Current answers
   * @returns {Promise<Object>} Updated submission
   */
  static async updateAnswers(id, answers) {
    await run(
      `UPDATE submissions SET answers = ? WHERE id = ?`,
      [JSON.stringify(answers), id]
    );
    
    // Also save to auto_saves table for recovery
    await run(
      `INSERT INTO auto_saves (submission_id, answers) VALUES (?, ?)`,
      [id, JSON.stringify(answers)]
    );
    
    return this.findById(id);
  }
  
  /**
   * Submit exam (finalize submission)
   * @param {number} id - Submission ID
   * @param {Object} data - Submission data
   * @returns {Promise<Object>} Updated submission
   */
  static async submit(id, { answers, score = null, percentage = null, timeTaken = null, autoSubmitted = false }) {
    await run(
      `UPDATE submissions 
       SET answers = ?, score = ?, percentage = ?, time_taken = ?, status = ?, auto_submitted = ?, submitted_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [JSON.stringify(answers), score, percentage, timeTaken, 'completed', autoSubmitted, id]
    );
    
    return this.findById(id);
  }
  
  /**
   * Auto-submit exam (when time expires)
   * @param {number} id - Submission ID
   * @returns {Promise<Object>} Updated submission
   */
  static async autoSubmit(id) {
    const submission = await this.findById(id);
    if (!submission) {
      throw new Error('Submission not found');
    }
    
    // Calculate time taken
    const startTime = new Date(submission.created_at);
    const now = new Date();
    const timeTaken = Math.floor((now - startTime) / 1000);
    
    await run(
      `UPDATE submissions 
       SET status = ?, auto_submitted = ?, time_taken = ?, submitted_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      ['completed', true, timeTaken, id]
    );
    
    return this.findById(id);
  }
  
  /**
   * Update submission score
   * @param {number} id - Submission ID
   * @param {number} score - Score
   * @param {number} percentage - Percentage
   * @returns {Promise<Object>} Updated submission
   */
  static async updateScore(id, score, percentage) {
    await run(
      `UPDATE submissions SET score = ?, percentage = ? WHERE id = ?`,
      [score, percentage, id]
    );
    
    return this.findById(id);
  }
  
  /**
   * Get auto-save data
   * @param {number} submissionId - Submission ID
   * @returns {Promise<Object|null>} Latest auto-save or null
   */
  static async getLatestAutoSave(submissionId) {
    const autoSave = await get(
      `SELECT * FROM auto_saves WHERE submission_id = ? ORDER BY saved_at DESC LIMIT 1`,
      [submissionId]
    );
    
    if (autoSave) {
      autoSave.answers = autoSave.answers ? JSON.parse(autoSave.answers) : null;
    }
    
    return autoSave || null;
  }
  
  /**
   * Get submission statistics for a room
   * @param {number} roomId - Room ID
   * @returns {Promise<Object>} Statistics
   */
  static async getStats(roomId) {
    const stats = await get(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        AVG(percentage) as average_percentage,
        MAX(percentage) as highest_percentage,
        MIN(percentage) as lowest_percentage,
        AVG(time_taken) as average_time
       FROM submissions 
       WHERE room_id = ?`,
      [roomId]
    );
    
    return stats;
  }
  
  /**
   * Delete submission
   * @param {number} id - Submission ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const result = await run(
      `DELETE FROM submissions WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }
  
  /**
   * Check if user has already submitted for a room
   * @param {number} roomId - Room ID
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} True if already submitted
   */
  static async hasSubmitted(roomId, userId) {
    const submission = await get(
      `SELECT 1 FROM submissions WHERE room_id = ? AND user_id = ? AND status = 'completed'`,
      [roomId, userId]
    );
    return !!submission;
  }
}

module.exports = Submission;
