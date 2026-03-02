/**
 * Question Model
 * Handles all database operations for questions
 * HCI Principle: Data Integrity - centralized data access
 */

const { run, get, all } = require('../database/db');

class Question {
  /**
   * Create a new question
   * @param {Object} questionData - Question data
   * @returns {Promise<Object>} Created question
   */
  static async create({
    roomId,
    questionType,
    questionText,
    points = 1,
    options = null,
    correctAnswer = null,
    mediaUrl = null,
    orderIndex
  }) {
    const result = await run(
      `INSERT INTO questions (room_id, question_type, question_text, points, options, correct_answer, media_url, order_index) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [roomId, questionType, questionText, points, 
       options ? JSON.stringify(options) : null,
       correctAnswer ? JSON.stringify(correctAnswer) : null,
       mediaUrl, orderIndex]
    );
    
    return this.findById(result.id);
  }
  
  /**
   * Find question by ID
   * @param {number} id - Question ID
   * @returns {Promise<Object|null>} Question object or null
   */
  static async findById(id) {
    const question = await get(
      `SELECT * FROM questions WHERE id = ?`,
      [id]
    );
    
    if (question) {
      question.options = question.options ? JSON.parse(question.options) : null;
      question.correct_answer = question.correct_answer ? JSON.parse(question.correct_answer) : null;
    }
    
    return question || null;
  }
  
  /**
   * Get all questions for a room
   * @param {number} roomId - Room ID
   * @param {boolean} includeAnswers - Whether to include correct answers
   * @returns {Promise<Array>} Array of questions
   */
  static async findByRoom(roomId, includeAnswers = false) {
    const questions = await all(
      `SELECT * FROM questions WHERE room_id = ? ORDER BY order_index ASC`,
      [roomId]
    );
    
    return questions.map(q => {
      const question = {
        id: q.id,
        roomId: q.room_id,
        questionType: q.question_type,
        questionText: q.question_text,
        points: q.points,
        options: q.options ? JSON.parse(q.options) : null,
        mediaUrl: q.media_url,
        orderIndex: q.order_index
      };
      
      if (includeAnswers) {
        question.correctAnswer = q.correct_answer ? JSON.parse(q.correct_answer) : null;
      }
      
      return question;
    });
  }
  
  /**
   * Update question
   * @param {number} id - Question ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated question
   */
  static async update(id, updates) {
    const allowedFields = {
      questionType: 'question_type',
      questionText: 'question_text',
      points: 'points',
      options: 'options',
      correctAnswer: 'correct_answer',
      mediaUrl: 'media_url',
      orderIndex: 'order_index'
    };
    
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields[key]) {
        fields.push(`${allowedFields[key]} = ?`);
        const val = ['options', 'correctAnswer'].includes(key) && value 
          ? JSON.stringify(value) 
          : value;
        values.push(val);
      }
    }
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    values.push(id);
    
    await run(
      `UPDATE questions SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return this.findById(id);
  }
  
  /**
   * Delete question
   * @param {number} id - Question ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    const result = await run(
      `DELETE FROM questions WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }
  
  /**
   * Reorder questions
   * @param {number} roomId - Room ID
   * @param {Array} questionIds - Ordered array of question IDs
   * @returns {Promise<boolean>} Success status
   */
  static async reorder(roomId, questionIds) {
    const db = require('../database/db').getDatabase();
    
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        const stmt = db.prepare(
          'UPDATE questions SET order_index = ? WHERE id = ? AND room_id = ?'
        );
        
        questionIds.forEach((id, index) => {
          stmt.run(index + 1, id, roomId);
        });
        
        stmt.finalize((err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }
          
          db.run('COMMIT', (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(true);
          });
        });
      });
    });
  }
  
  /**
   * Get question count for a room
   * @param {number} roomId - Room ID
   * @returns {Promise<number>} Question count
   */
  static async getCount(roomId) {
    const result = await get(
      `SELECT COUNT(*) as count FROM questions WHERE room_id = ?`,
      [roomId]
    );
    return result.count;
  }
  
  /**
   * Get total points for a room
   * @param {number} roomId - Room ID
   * @returns {Promise<number>} Total points
   */
  static async getTotalPoints(roomId) {
    const result = await get(
      `SELECT SUM(points) as total FROM questions WHERE room_id = ?`,
      [roomId]
    );
    return result.total || 0;
  }
  
  /**
   * Duplicate a question
   * @param {number} id - Question ID to duplicate
   * @returns {Promise<Object>} New question
   */
  static async duplicate(id) {
    const question = await this.findById(id);
    if (!question) {
      throw new Error('Question not found');
    }
    
    // Get max order index for the room
    const result = await get(
      `SELECT MAX(order_index) as max_index FROM questions WHERE room_id = ?`,
      [question.room_id]
    );
    
    const newOrderIndex = (result.max_index || 0) + 1;
    
    return await this.create({
      roomId: question.room_id,
      questionType: question.question_type,
      questionText: question.question_text + ' (Copy)',
      points: question.points,
      options: question.options,
      correctAnswer: question.correct_answer,
      mediaUrl: question.media_url,
      orderIndex: newOrderIndex
    });
  }
}

module.exports = Question;
