/**
 * Authentication Middleware
 * Validates JWT tokens and protects routes
 * HCI Principle: Security - proper authentication checks
 */

const jwt = require('jsonwebtoken');

/**
 * Verify JWT token from Authorization header or cookies
 */
function authenticateToken(req, res, next) {
  // Get token from Authorization header or cookies
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1] || req.cookies?.token;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
      code: 'NO_TOKEN'
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(403).json({
      success: false,
      message: 'Invalid token.',
      code: 'INVALID_TOKEN'
    });
  }
}

/**
 * Check if user has teacher role
 */
function requireTeacher(req, res, next) {
  if (!req.user || req.user.role !== 'teacher') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Teacher role required.',
      code: 'TEACHER_REQUIRED'
    });
  }
  next();
}

/**
 * Check if user has student role
 */
function requireStudent(req, res, next) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Student role required.',
      code: 'STUDENT_REQUIRED'
    });
  }
  next();
}

/**
 * Optional authentication - sets user if token valid, continues either way
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1] || req.cookies?.token;
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Continue without user
    }
  }
  
  next();
}

module.exports = {
  authenticateToken,
  requireTeacher,
  requireStudent,
  optionalAuth
};
