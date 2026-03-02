/**
 * Question Controller
 * Handles question creation, management, and retrieval
 * HCI Principles:
 * - Consistency: Standard CRUD operations
 * - Error Prevention: Validation and ownership checks
 */

const Question = require('../models/Question');
const Room = require('../models/Room');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Add question to room
 * POST /api/rooms/:roomCode/questions
 */
async function addQuestion(req, res, next) {
  try {
    const { roomCode } = req.params;
    const {
      questionType,
      questionText,
      points,
      options,
      correctAnswer,
      mediaUrl
    } = req.body;
    
    // Find room
    const room = await Room.findByCode(roomCode);
    if (!room) {
      throw new ApiError('Room not found.', 404, 'ROOM_NOT_FOUND');
    }
    
    // Check ownership
    if (room.creator_id !== req.user.id) {
      throw new ApiError(
        'You do not have permission to add questions to this room.',
        403,
        'FORBIDDEN'
      );
    }
    
    // Get next order index
    const questionCount = await Question.getCount(room.id);
    const orderIndex = questionCount + 1;
    
    // Create question
    const question = await Question.create({
      roomId: room.id,
      questionType,
      questionText,
      points,
      options,
      correctAnswer,
      mediaUrl,
      orderIndex
    });
    
    res.status(201).json({
      success: true,
      message: 'Question added successfully!',
      data: { question }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all questions for a room
 * GET /api/rooms/:roomCode/questions
 */
async function getQuestions(req, res, next) {
  try {
    const { roomCode } = req.params;
    const { includeAnswers } = req.query;
    
    // Find room
    const room = await Room.findByCode(roomCode);
    if (!room) {
      throw new ApiError('Room not found.', 404, 'ROOM_NOT_FOUND');
    }
    
    // Check if user is creator (only creator can see answers)
    const isCreator = room.creator_id === req.user?.id;
    const shouldIncludeAnswers = includeAnswers === 'true' && isCreator;
    
    const questions = await Question.findByRoom(room.id, shouldIncludeAnswers);
    
    res.json({
      success: true,
      data: { 
        questions,
        count: questions.length,
        totalPoints: questions.reduce((sum, q) => sum + q.points, 0)
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update question
 * PUT /api/rooms/:roomCode/questions/:questionId
 */
async function updateQuestion(req, res, next) {
  try {
    const { roomCode, questionId } = req.params;
    
    // Find room
    const room = await Room.findByCode(roomCode);
    if (!room) {
      throw new ApiError('Room not found.', 404, 'ROOM_NOT_FOUND');
    }
    
    // Check ownership
    if (room.creator_id !== req.user.id) {
      throw new ApiError(
        'You do not have permission to update questions in this room.',
        403,
        'FORBIDDEN'
      );
    }
    
    // Find question
    const question = await Question.findById(questionId);
    if (!question || question.room_id !== room.id) {
      throw new ApiError('Question not found.', 404, 'QUESTION_NOT_FOUND');
    }
    
    const updates = req.body;
    const updatedQuestion = await Question.update(questionId, updates);
    
    res.json({
      success: true,
      message: 'Question updated successfully!',
      data: { question: updatedQuestion }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete question
 * DELETE /api/rooms/:roomCode/questions/:questionId
 */
async function deleteQuestion(req, res, next) {
  try {
    const { roomCode, questionId } = req.params;
    
    // Find room
    const room = await Room.findByCode(roomCode);
    if (!room) {
      throw new ApiError('Room not found.', 404, 'ROOM_NOT_FOUND');
    }
    
    // Check ownership
    if (room.creator_id !== req.user.id) {
      throw new ApiError(
        'You do not have permission to delete questions from this room.',
        403,
        'FORBIDDEN'
      );
    }
    
    // Find question
    const question = await Question.findById(questionId);
    if (!question || question.room_id !== room.id) {
      throw new ApiError('Question not found.', 404, 'QUESTION_NOT_FOUND');
    }
    
    await Question.delete(questionId);
    
    // Reorder remaining questions
    const questions = await Question.findByRoom(room.id);
    const questionIds = questions.map(q => q.id);
    await Question.reorder(room.id, questionIds);
    
    res.json({
      success: true,
      message: 'Question deleted successfully!'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reorder questions
 * POST /api/rooms/:roomCode/questions/reorder
 */
async function reorderQuestions(req, res, next) {
  try {
    const { roomCode } = req.params;
    const { questionIds } = req.body;
    
    if (!Array.isArray(questionIds)) {
      throw new ApiError(
        'Question IDs must be provided as an array.',
        400,
        'INVALID_INPUT'
      );
    }
    
    // Find room
    const room = await Room.findByCode(roomCode);
    if (!room) {
      throw new ApiError('Room not found.', 404, 'ROOM_NOT_FOUND');
    }
    
    // Check ownership
    if (room.creator_id !== req.user.id) {
      throw new ApiError(
        'You do not have permission to reorder questions in this room.',
        403,
        'FORBIDDEN'
      );
    }
    
    await Question.reorder(room.id, questionIds);
    
    const questions = await Question.findByRoom(room.id);
    
    res.json({
      success: true,
      message: 'Questions reordered successfully!',
      data: { questions }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Duplicate question
 * POST /api/rooms/:roomCode/questions/:questionId/duplicate
 */
async function duplicateQuestion(req, res, next) {
  try {
    const { roomCode, questionId } = req.params;
    
    // Find room
    const room = await Room.findByCode(roomCode);
    if (!room) {
      throw new ApiError('Room not found.', 404, 'ROOM_NOT_FOUND');
    }
    
    // Check ownership
    if (room.creator_id !== req.user.id) {
      throw new ApiError(
        'You do not have permission to duplicate questions in this room.',
        403,
        'FORBIDDEN'
      );
    }
    
    // Find question
    const question = await Question.findById(questionId);
    if (!question || question.room_id !== room.id) {
      throw new ApiError('Question not found.', 404, 'QUESTION_NOT_FOUND');
    }
    
    const newQuestion = await Question.duplicate(questionId);
    
    res.status(201).json({
      success: true,
      message: 'Question duplicated successfully!',
      data: { question: newQuestion }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  addQuestion,
  getQuestions,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  duplicateQuestion
};
