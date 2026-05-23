'use strict';
const logger = require('../config/logger');

class AppError extends Error {
  constructor(message, statusCode = 500, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 500 ? 'error' : 'fail';
    this.isOperational = true;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(errors) {
    super('Validation failed', 422, errors);
    this.name = 'ValidationError';
  }
}

function handleMongooseCastError(err) {
  return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
}

function handleMongooseDuplicateKey(err) {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return new AppError(`A record with ${field} '${value}' already exists.`, 409);
}

function handleMongooseValidation(err) {
  const errors = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
  return new ValidationError(errors);
}

function handleJWTError() {
  return new AppError('Invalid authentication token. Please log in again.', 401);
}

function handleJWTExpired() {
  return new AppError('Your session has expired. Please log in again.', 401);
}

function handleMulterError(err) {
  if (err.code === 'LIMIT_FILE_SIZE') return new AppError('File size exceeds the 10MB limit.', 400);
  if (err.code === 'LIMIT_UNEXPECTED_FILE') return new AppError('Unexpected file field.', 400);
  return new AppError(err.message, 400);
}

// 404 handler
const notFoundHandler = (req, res, next) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404));
};

// Main error handler
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Transform known error types
  if (err.name === 'CastError') error = handleMongooseCastError(err);
  else if (err.code === 11000) error = handleMongooseDuplicateKey(err);
  else if (err.name === 'ValidationError') error = handleMongooseValidation(err);
  else if (err.name === 'JsonWebTokenError') error = handleJWTError();
  else if (err.name === 'TokenExpiredError') error = handleJWTExpired();
  else if (err.name === 'MulterError') error = handleMulterError(err);

  const statusCode = error.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log server errors
  if (statusCode >= 500) {
    logger.error('Server error:', { message: err.message, stack: err.stack, url: req.originalUrl, method: req.method, ip: req.ip });
  }

  // API response
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Internal server error',
      errors: error.errors || [],
      ...(isProduction ? {} : { stack: err.stack }),
    });
  }

  // Web response (EJS)
  res.status(statusCode).render('error', {
    title: `Error ${statusCode}`,
    statusCode,
    message: isProduction && statusCode >= 500 ? 'Something went wrong. Please try again.' : error.message,
    user: req.user || null,
  });
};

module.exports = { AppError, ValidationError, errorHandler, notFoundHandler };
