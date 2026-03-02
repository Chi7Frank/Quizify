/**
 * Room Routes
 * Routes for room management and operations
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireTeacher, optionalAuth } = require('../middleware/auth');
const {
  createRoomValidation,
  roomCodeValidation,
  joinRoomValidation
} = require('../middleware/validator');
const {
  createRoom,
  getTeacherRooms,
  getRoom,
  updateRoom,
  deleteRoom,
  joinRoom,
  getRoomResults,
  regenerateRoomCode
} = require('../controllers/roomController');

/**
 * @route   POST /api/rooms
 * @desc    Create a new room
 * @access  Private (Teacher only)
 */
router.post('/', authenticateToken, requireTeacher, createRoomValidation, createRoom);

/**
 * @route   GET /api/rooms/teacher
 * @desc    Get all rooms for the current teacher
 * @access  Private (Teacher only)
 */
router.get('/teacher', authenticateToken, requireTeacher, getTeacherRooms);

/**
 * @route   POST /api/rooms/join
 * @desc    Validate room code and get room info
 * @access  Public
 */
router.post('/join', joinRoomValidation, joinRoom);

/**
 * @route   GET /api/rooms/:roomCode
 * @desc    Get room details
 * @access  Private
 */
router.get('/:roomCode', authenticateToken, roomCodeValidation, getRoom);

/**
 * @route   PUT /api/rooms/:roomCode
 * @desc    Update room
 * @access  Private (Teacher only)
 */
router.put('/:roomCode', authenticateToken, requireTeacher, roomCodeValidation, updateRoom);

/**
 * @route   DELETE /api/rooms/:roomCode
 * @desc    Delete room
 * @access  Private (Teacher only)
 */
router.delete('/:roomCode', authenticateToken, requireTeacher, roomCodeValidation, deleteRoom);

/**
 * @route   GET /api/rooms/:roomCode/results
 * @desc    Get room results (submissions and statistics)
 * @access  Private (Teacher only)
 */
router.get('/:roomCode/results', authenticateToken, requireTeacher, roomCodeValidation, getRoomResults);

/**
 * @route   POST /api/rooms/:roomCode/regenerate-code
 * @desc    Generate new room code
 * @access  Private (Teacher only)
 */
router.post('/:roomCode/regenerate-code', authenticateToken, requireTeacher, roomCodeValidation, regenerateRoomCode);

module.exports = router;
