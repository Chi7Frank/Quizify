/**
 * Exam Routes
 * Routes for student exam taking and submission
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const {
  roomCodeValidation,
  registrationValidation,
  submitExamValidation
} = require('../middleware/validator');
const {
  registerForExam,
  getExam,
  autoSave,
  submitExam,
  getResults,
  getAutoSave
} = require('../controllers/examController');

/**
 * @route   POST /api/rooms/:roomCode/register
 * @desc    Register for exam (submit registration form)
 * @access  Public
 */
router.post('/register', optionalAuth, roomCodeValidation, registrationValidation, registerForExam);

/**
 * @route   GET /api/rooms/:roomCode/exam
 * @desc    Get exam questions
 * @access  Public
 */
router.get('/exam', optionalAuth, roomCodeValidation, getExam);

/**
 * @route   POST /api/rooms/:roomCode/auto-save
 * @desc    Auto-save exam progress
 * @access  Public
 */
router.post('/auto-save', optionalAuth, roomCodeValidation, autoSave);

/**
 * @route   GET /api/rooms/:roomCode/auto-save/:submissionId
 * @desc    Get auto-saved progress
 * @access  Public
 */
router.get('/auto-save/:submissionId', optionalAuth, roomCodeValidation, getAutoSave);

/**
 * @route   POST /api/rooms/:roomCode/submit
 * @desc    Submit exam
 * @access  Public
 */
router.post('/submit', optionalAuth, roomCodeValidation, submitExamValidation, submitExam);

/**
 * @route   GET /api/rooms/:roomCode/results/:submissionId
 * @desc    Get exam results
 * @access  Public
 */
router.get('/results/:submissionId', optionalAuth, roomCodeValidation, getResults);

module.exports = router;
