/**
 * Authentication Controller
 * Handles user registration, login, and session management
 * HCI Principles:
 * - Error Prevention: Input validation and clear error messages
 * - Security: Password hashing, JWT tokens
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Generate JWT token
 */
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      fullName: user.full_name 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

/**
 * Register a new user
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { email, password, fullName, role } = req.body;
    
    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new ApiError(
        'An account with this email already exists. Please login instead.',
        409,
        'EMAIL_EXISTS'
      );
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await User.create({
      email,
      passwordHash,
      fullName,
      role
    });
    
    // Generate token
    const token = generateToken(user);
    
    // Set cookie (httpOnly for security)
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Login user
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password, rememberMe = false } = req.body;
    
    // Find user with password
    const user = await User.findByEmailWithPassword(email);
    if (!user) {
      throw new ApiError(
        'Invalid email or password. Please try again.',
        401,
        'INVALID_CREDENTIALS'
      );
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new ApiError(
        'Invalid email or password. Please try again.',
        401,
        'INVALID_CREDENTIALS'
      );
    }
    
    // Generate token
    const token = generateToken(user);
    
    // Set cookie
    const maxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 7 days or 24 hours
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge
    });
    
    res.json({
      success: true,
      message: 'Login successful!',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Logout user
 * POST /api/auth/logout
 */
async function logout(req, res, next) {
  try {
    // Clear cookie
    res.clearCookie('token');
    
    res.json({
      success: true,
      message: 'Logout successful!'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user
 * GET /api/auth/me
 */
async function getCurrentUser(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      throw new ApiError(
        'User not found.',
        404,
        'USER_NOT_FOUND'
      );
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh token
 * POST /api/auth/refresh
 */
async function refreshToken(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      throw new ApiError(
        'User not found.',
        404,
        'USER_NOT_FOUND'
      );
    }
    
    const token = generateToken(user);
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });
    
    res.json({
      success: true,
      data: { token }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  refreshToken
};
