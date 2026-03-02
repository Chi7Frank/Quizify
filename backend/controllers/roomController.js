/**
 * Room Controller
 * Handles room creation, management, and joining
 * HCI Principles:
 * - Visibility of System Status: Clear status messages
 * - Error Prevention: Validation and checks before operations
 */

const Room = require('../models/Room');
const Question = require('../models/Question');
const Submission = require('../models/Submission');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Create a new room
 * POST /api/rooms
 */
async function createRoom(req, res, next) {
  try {
    const {
      roomName,
      maxParticipants,
      isUnlimited,
      startTime,
      endTime,
      autoSubmit,
      showScores,
      showAnswers,
      showGrades,
      instructions,
      registrationFields
    } = req.body;
    
    const room = await Room.create({
      roomName,
      creatorId: req.user.id,
      maxParticipants,
      isUnlimited,
      startTime,
      endTime,
      autoSubmit,
      showScores,
      showAnswers,
      showGrades,
      instructions,
      registrationFields
    });
    
    res.status(201).json({
      success: true,
      message: 'Room created successfully!',
      data: { room }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all rooms for the current teacher
 * GET /api/rooms/teacher
 */
async function getTeacherRooms(req, res, next) {
  try {
    const rooms = await Room.findByCreator(req.user.id);
    
    res.json({
      success: true,
      data: { rooms }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get room by code
 * GET /api/rooms/:roomCode
 */
async function getRoom(req, res, next) {
  try {
    const { roomCode } = req.params;
    
    const room = await Room.findByCode(roomCode);
    if (!room) {
      throw new ApiError(
        'Room not found. Please check the room code and try again.',
        404,
        'ROOM_NOT_FOUND'
      );
    }
    
    // Check if user is the creator
    const isCreator = room.creator_id === req.user.id;
    
    // Get question count
    const questionCount = await Question.getCount(room.id);
    
    res.json({
      success: true,
      data: { 
        room: {
          ...room,
          questionCount,
          isCreator
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update room
 * PUT /api/rooms/:roomCode
 */
async function updateRoom(req, res, next) {
  try {
    const { roomCode } = req.params;
    
    const room = await Room.findByCode(roomCode);
    if (!room) {
      throw new ApiError('Room not found.', 404, 'ROOM_NOT_FOUND');
    }
    
    // Check ownership
    if (room.creator_id !== req.user.id) {
      throw new ApiError(
        'You do not have permission to update this room.',
        403,
        'FORBIDDEN'
      );
    }
    
    const updates = req.body;
    const updatedRoom = await Room.update(room.id, updates);
    
    res.json({
      success: true,
      message: 'Room updated successfully!',
      data: { room: updatedRoom }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete room
 * DELETE /api/rooms/:roomCode
 */
async function deleteRoom(req, res, next) {
  try {
    const { roomCode } = req.params;
    
    const room = await Room.findByCode(roomCode);
    if (!room) {
      throw new ApiError('Room not found.', 404, 'ROOM_NOT_FOUND');
    }
    
    // Check ownership
    if (room.creator_id !== req.user.id) {
      throw new ApiError(
        'You do not have permission to delete this room.',
        403,
        'FORBIDDEN'
      );
    }
    
    await Room.delete(room.id);
    
    res.json({
      success: true,
      message: 'Room deleted successfully!'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Join room (validate room code)
 * POST /api/rooms/join
 */
async function joinRoom(req, res, next) {
  try {
    const { roomCode } = req.body;
    
    const { canJoin, reason, room } = await Room.checkJoinable(roomCode);
    
    if (!canJoin) {
      throw new ApiError(reason, 400, 'CANNOT_JOIN');
    }
    
    // Get question count
    const questionCount = await Question.getCount(room.id);
    
    res.json({
      success: true,
      message: 'Room found!',
      data: {
        room: {
          id: room.id,
          roomCode: room.room_code,
          roomName: room.room_name,
          instructions: room.instructions,
          registrationFields: room.registration_fields,
          questionCount,
          startTime: room.start_time,
          endTime: room.end_time
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get room results (for teachers)
 * GET /api/rooms/:roomCode/results
 */
async function getRoomResults(req, res, next) {
  try {
    const { roomCode } = req.params;
    
    const room = await Room.findByCode(roomCode);
    if (!room) {
      throw new ApiError('Room not found.', 404, 'ROOM_NOT_FOUND');
    }
    
    // Check ownership
    if (room.creator_id !== req.user.id) {
      throw new ApiError(
        'You do not have permission to view these results.',
        403,
        'FORBIDDEN'
      );
    }
    
    // Get submissions
    const submissions = await Submission.findByRoom(room.id);
    
    // Get statistics
    const stats = await Submission.getStats(room.id);
    
    // Get question count and total points
    const questionCount = await Question.getCount(room.id);
    const totalPoints = await Question.getTotalPoints(room.id);
    
    res.json({
      success: true,
      data: {
        room: {
          id: room.id,
          roomCode: room.room_code,
          roomName: room.room_name,
          questionCount,
          totalPoints
        },
        stats,
        submissions
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate new room code
 * POST /api/rooms/:roomCode/regenerate-code
 */
async function regenerateRoomCode(req, res, next) {
  try {
    const { roomCode } = req.params;
    
    const room = await Room.findByCode(roomCode);
    if (!room) {
      throw new ApiError('Room not found.', 404, 'ROOM_NOT_FOUND');
    }
    
    // Check ownership
    if (room.creator_id !== req.user.id) {
      throw new ApiError(
        'You do not have permission to modify this room.',
        403,
        'FORBIDDEN'
      );
    }
    
    // Generate new code
    let newCode;
    let attempts = 0;
    do {
      newCode = Room.generateRoomCode();
      attempts++;
    } while (await Room.codeExists(newCode) && attempts < 10);
    
    if (attempts >= 10) {
      throw new ApiError(
        'Unable to generate a unique room code. Please try again.',
        500,
        'CODE_GENERATION_FAILED'
      );
    }
    
    await Room.update(room.id, { roomCode: newCode });
    
    res.json({
      success: true,
      message: 'Room code regenerated!',
      data: { roomCode: newCode }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createRoom,
  getTeacherRooms,
  getRoom,
  updateRoom,
  deleteRoom,
  joinRoom,
  getRoomResults,
  regenerateRoomCode
};
