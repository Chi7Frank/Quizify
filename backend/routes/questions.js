/**
 * Question Routes
 * Routes for question management within rooms
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireTeacher } = require('../middleware/auth');
const { createQuestionValidation, roomCodeValidation } = require('../middleware/validator');
const {
  addQuestion,
  getQuestions,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  duplicateQuestion
} = require('../controllers/questionController');

/**
 * @route   POST /api/rooms/:roomCode/questions
 * @desc    Add a new question to room
 * @access  Private (Teacher only)
 */
router.post('/', authenticateToken, requireTeacher, roomCodeValidation, createQuestionValidation, addQuestion);

/**
 * @route   GET /api/rooms/:roomCode/questions
 * @desc    Get all questions for a room
 * @access  Private
 */
router.get('/', authenticateToken, roomCodeValidation, getQuestions);

/**
 * @route   PUT /api/rooms/:roomCode/questions/:questionId
 * @desc    Update a question
 * @access  Private (Teacher only)
 */
router.put('/:questionId', authenticateToken, requireTeacher, roomCodeValidation, updateQuestion);

/**
 * @route   DELETE /api/rooms/:roomCode/questions/:questionId
 * @desc    Delete a question
 * @access  Private (Teacher only)
 */
router.delete('/:questionId', authenticateToken, requireTeacher, roomCodeValidation, deleteQuestion);

/**
 * @route   POST /api/rooms/:roomCode/questions/reorder
 * @desc    Reorder questions
 * @access  Private (Teacher only)
 */
router.post('/reorder', authenticateToken, requireTeacher, roomCodeValidation, reorderQuestions);

/**
 * @route   POST /api/rooms/:roomCode/questions/:questionId/duplicate
 * @desc    Duplicate a question
 * @access  Private (Teacher only)
 */
router.post('/:questionId/duplicate', authenticateToken, requireTeacher, roomCodeValidation, duplicateQuestion);

module.exports = router;
