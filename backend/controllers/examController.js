/**
 * Exam Controller
 * Handles student exam taking, submission, and results
 * HCI Principles:
 * - Error Prevention: Auto-save functionality
 * - Visibility of System Status: Progress tracking
 * - Forgiving UI: Allow answer changes before final submit
 */

const Room = require('../models/Room');
const Question = require('../models/Question');
const Submission = require('../models/Submission');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Register for exam (submit registration form)
 * POST /api/rooms/:roomCode/register
 */
async function registerForExam(req, res, next) {
  try {
    const { roomCode } = req.params;
    const { registrationData } = req.body;
    
    // Find room
    const room = await Room.findByCode(roomCode);
    if (!room) {
      throw new ApiError('Room not found.', 404, 'ROOM_NOT_FOUND');
    }
    
    // Check if room is joinable
    const { canJoin, reason } = await Room.checkJoinable(roomCode);
    if (!canJoin) {
      throw new ApiError(reason, 400, 'CANNOT_JOIN');
    }
    
    // Check if user already has a submission
    let submission;
    if (req.user) {
      submission = await Submission.findByRoomAndUser(room.id, req.user.id);
    }
    
    if (!submission) {
      // Create new submission
      submission = await Submission.create({
        roomId: room.id,
        userId: req.user?.id || null,
        registrationData
      });
    }
    
    res.json({
      success: true,
      message: 'Registration successful!',
      data: {
        submissionId: submission.id,
        room: {
          id: room.id,
          roomName: room.room_name,
          instructions: room.instructions
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get exam questions (for student)
 * GET /api/rooms/:roomCode/exam
 */
async function getExam(req, res, next) {
  try {
    const { roomCode } = req.params;
    
    // Find room
    const room = await Room.findByCode(roomCode);
    if (!room) {
      throw new ApiError('Room not found.', 404, 'ROOM_NOT_FOUND');
    }
    
    // Get questions (without answers)
    const questions = await Question.findByRoom(room.id, false);
    
    // Get total points
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
    
    res.json({
      success: true,
      data: {
        room: {
          id: room.id,
          roomName: room.room_name,
          instructions: room.instructions,
          endTime: room.end_time,
          autoSubmit: room.auto_submit
        },
        questions,
        totalQuestions: questions.length,
        totalPoints
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Auto-save exam progress
 * POST /api/rooms/:roomCode/auto-save
 */
async function autoSave(req, res, next) {
  try {
    const { roomCode } = req.params;
    const { submissionId, answers } = req.body;
    
    // Find submission
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new ApiError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }
    
    // Verify room code matches
    if (submission.room_code !== roomCode.toUpperCase()) {
      throw new ApiError('Invalid submission for this room.', 400, 'INVALID_SUBMISSION');
    }
    
    // Check if submission is still in progress
    if (submission.status !== 'in_progress') {
      throw new ApiError(
        'This exam has already been submitted.',
        400,
        'ALREADY_SUBMITTED'
      );
    }
    
    // Update answers
    await Submission.updateAnswers(submissionId, answers);
    
    res.json({
      success: true,
      message: 'Progress saved!',
      data: { savedAt: new Date().toISOString() }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Submit exam
 * POST /api/rooms/:roomCode/submit
 */
async function submitExam(req, res, next) {
  try {
    const { roomCode } = req.params;
    const { submissionId, answers } = req.body;
    
    // Find room
    const room = await Room.findByCode(roomCode);
    if (!room) {
      throw new ApiError('Room not found.', 404, 'ROOM_NOT_FOUND');
    }
    
    // Find submission
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new ApiError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }
    
    // Verify room code matches
    if (submission.room_code !== roomCode.toUpperCase()) {
      throw new ApiError('Invalid submission for this room.', 400, 'INVALID_SUBMISSION');
    }
    
    // Check if already submitted
    if (submission.status === 'completed') {
      throw new ApiError(
        'This exam has already been submitted.',
        400,
        'ALREADY_SUBMITTED'
      );
    }
    
    // Get questions with correct answers for scoring
    const questions = await Question.findByRoom(room.id, true);
    
    // Calculate score
    let score = 0;
    let totalPoints = 0;
    
    for (const question of questions) {
      totalPoints += question.points;
      const answer = answers[question.id];
      
      if (answer !== undefined && answer !== null) {
        if (question.questionType === 'multiple_choice' || question.questionType === 'true_false') {
          if (question.correctAnswer && answer === question.correctAnswer.index) {
            score += question.points;
          }
        }
        // Short answer and essay require manual grading
      }
    }
    
    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    
    // Calculate time taken
    const startTime = new Date(submission.created_at);
    const endTime = new Date();
    const timeTaken = Math.floor((endTime - startTime) / 1000);
    
    // Submit
    const completedSubmission = await Submission.submit(submissionId, {
      answers,
      score,
      percentage,
      timeTaken,
      autoSubmitted: false
    });
    
    res.json({
      success: true,
      message: 'Exam submitted successfully!',
      data: {
        submission: {
          id: completedSubmission.id,
          score: completedSubmission.score,
          percentage: completedSubmission.percentage,
          timeTaken: completedSubmission.time_taken,
          submittedAt: completedSubmission.submitted_at
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get exam results (for student)
 * GET /api/rooms/:roomCode/results/:submissionId
 */
async function getResults(req, res, next) {
  try {
    const { roomCode, submissionId } = req.params;
    
    // Find submission
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new ApiError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }
    
    // Verify room code matches
    if (submission.room_code !== roomCode.toUpperCase()) {
      throw new ApiError('Invalid submission for this room.', 400, 'INVALID_SUBMISSION');
    }
    
    // Check if user owns this submission (if logged in)
    if (req.user && submission.user_id && submission.user_id !== req.user.id) {
      throw new ApiError(
        'You do not have permission to view these results.',
        403,
        'FORBIDDEN'
      );
    }
    
    // Check if results should be shown
    if (!submission.show_scores && submission.status !== 'completed') {
      throw new ApiError(
        'Results are not available yet.',
        403,
        'RESULTS_NOT_AVAILABLE'
      );
    }
    
    // Get questions
    const questions = await Question.findByRoom(submission.room_id, submission.show_answers);
    
    // Build response
    const response = {
      success: true,
      data: {
        submission: {
          id: submission.id,
          status: submission.status,
          score: submission.show_scores ? submission.score : null,
          percentage: submission.show_scores ? submission.percentage : null,
          timeTaken: submission.time_taken,
          submittedAt: submission.submitted_at,
          answers: submission.answers
        },
        questions: questions.map(q => ({
          id: q.id,
          questionType: q.questionType,
          questionText: q.questionText,
          points: q.points,
          options: q.options,
          correctAnswer: submission.show_answers ? q.correctAnswer : null,
          userAnswer: submission.answers ? submission.answers[q.id] : null
        })),
        showScores: submission.show_scores,
        showAnswers: submission.show_answers,
        showGrades: submission.show_grades
      }
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Get auto-save data
 * GET /api/rooms/:roomCode/auto-save/:submissionId
 */
async function getAutoSave(req, res, next) {
  try {
    const { roomCode, submissionId } = req.params;
    
    // Find submission
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new ApiError('Submission not found.', 404, 'SUBMISSION_NOT_FOUND');
    }
    
    // Verify room code matches
    if (submission.room_code !== roomCode.toUpperCase()) {
      throw new ApiError('Invalid submission for this room.', 400, 'INVALID_SUBMISSION');
    }
    
    // Get latest auto-save
    const autoSave = await Submission.getLatestAutoSave(submissionId);
    
    res.json({
      success: true,
      data: {
        answers: autoSave?.answers || submission.answers || {},
        savedAt: autoSave?.saved_at || submission.created_at
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  registerForExam,
  getExam,
  autoSave,
  submitExam,
  getResults,
  getAutoSave
};
