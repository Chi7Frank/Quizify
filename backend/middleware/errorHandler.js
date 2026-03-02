/**
 * Error Handling Middleware
 * Centralized error handling with user-friendly messages
 * HCI Principles: 
 * - Error Prevention: Clear error messages
 * - Visibility of System Status: Informative error responses
 */

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(message, statusCode, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode
  });
  
  // Handle specific error types
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      details: err.details
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
      code: 'INVALID_TOKEN'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Your session has expired. Please login again.',
      code: 'TOKEN_EXPIRED'
    });
  }
  
  // Handle SQLite errors
  if (err.message && err.message.includes('SQLITE_CONSTRAINT_UNIQUE')) {
    return res.status(409).json({
      success: false,
      message: 'This record already exists.',
      code: 'DUPLICATE_ENTRY'
    });
  }
  
  if (err.message && err.message.includes('SQLITE_CONSTRAINT_FOREIGNKEY')) {
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist.',
      code: 'FOREIGN_KEY_VIOLATION'
    });
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError' || err.array) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed. Please check your input.',
      code: 'VALIDATION_ERROR',
      details: err.array ? err.array() : err.errors
    });
  }
  
  // Default error response
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'An unexpected error occurred. Please try again later.'
    : err.message;
  
  res.status(statusCode).json({
    success: false,
    message: message,
    code: err.code || 'INTERNAL_ERROR'
  });
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found.`,
    code: 'ROUTE_NOT_FOUND'
  });
}

/**
 * Async handler wrapper - catches errors in async route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  ApiError,
  errorHandler,
  notFoundHandler,
  asyncHandler
};
