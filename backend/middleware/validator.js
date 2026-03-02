/**
 * Input Validation Middleware
 * Validates request inputs using express-validator
 * HCI Principle: Error Prevention - validate before processing
 */

const { body, param, query, validationResult } = require('express-validator');
const { ApiError } = require('./errorHandler');

/**
 * Check validation results and throw error if invalid
 */
function checkValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value
    }));
    
    throw new ApiError(
      'Validation failed. Please check your input.',
      400,
      'VALIDATION_ERROR',
      formattedErrors
    );
  }
  next();
}

// Authentication Validations
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number.'),
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters.'),
  body('role')
    .isIn(['student', 'teacher'])
    .withMessage('Role must be either student or teacher.'),
  checkValidation
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address.'),
  body('password')
    .notEmpty()
    .withMessage('Password is required.'),
  checkValidation
];

// Room Validations
const createRoomValidation = [
  body('roomName')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Room name must be between 3 and 100 characters.'),
  body('maxParticipants')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max participants must be between 1 and 1000.'),
  body('isUnlimited')
    .optional()
    .isBoolean()
    .withMessage('Is unlimited must be a boolean.'),
  body('startTime')
    .optional()
    .isISO8601()
    .withMessage('Start time must be a valid date.'),
  body('endTime')
    .optional()
    .isISO8601()
    .withMessage('End time must be a valid date.')
    .custom((value, { req }) => {
      if (req.body.startTime && new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time.');
      }
      return true;
    }),
  checkValidation
];

const roomCodeValidation = [
  param('roomCode')
    .matches(/^[A-Z0-9]{4}-[A-Z0-9]{2}$/)
    .withMessage('Invalid room code format.'),
  checkValidation
];

const joinRoomValidation = [
  body('roomCode')
    .matches(/^[A-Z0-9]{4}-[A-Z0-9]{2}$/)
    .withMessage('Invalid room code format.'),
  checkValidation
];

// Question Validations
const createQuestionValidation = [
  body('questionType')
    .isIn(['multiple_choice', 'true_false', 'short_answer', 'essay'])
    .withMessage('Invalid question type.'),
  body('questionText')
    .trim()
    .isLength({ min: 5, max: 1000 })
    .withMessage('Question text must be between 5 and 1000 characters.'),
  body('points')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Points must be between 1 and 100.'),
  body('options')
    .optional()
    .custom((value, { req }) => {
      if (['multiple_choice', 'true_false'].includes(req.body.questionType)) {
        if (!value || !Array.isArray(value) || value.length < 2) {
          throw new Error('Multiple choice and true/false questions require at least 2 options.');
        }
      }
      return true;
    }),
  body('correctAnswer')
    .optional()
    .custom((value, { req }) => {
      if (req.body.questionType === 'multiple_choice' && value && typeof value.index !== 'number') {
        throw new Error('Correct answer for multiple choice must include option index.');
      }
      return true;
    }),
  checkValidation
];

// Submission Validations
const submitExamValidation = [
  body('answers')
    .isObject()
    .withMessage('Answers must be an object.'),
  checkValidation
];

const registrationValidation = [
  body('registrationData')
    .isObject()
    .withMessage('Registration data is required.'),
  checkValidation
];

module.exports = {
  checkValidation,
  registerValidation,
  loginValidation,
  createRoomValidation,
  roomCodeValidation,
  joinRoomValidation,
  createQuestionValidation,
  submitExamValidation,
  registrationValidation
};
