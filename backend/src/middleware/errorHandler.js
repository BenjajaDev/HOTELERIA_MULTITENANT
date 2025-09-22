const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error response
  let error = {
    message: 'Internal server error',
    status: 500
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error.message = err.message;
    error.status = 400;
    error.details = err.details;
  } else if (err.name === 'CastError') {
    error.message = 'Invalid ID format';
    error.status = 400;
  } else if (err.code === '23505') { // PostgreSQL unique violation
    error.message = 'Duplicate entry';
    error.status = 409;
  } else if (err.code === '23503') { // PostgreSQL foreign key violation
    error.message = 'Referenced record not found';
    error.status = 400;
  } else if (err.code === '23502') { // PostgreSQL not null violation
    error.message = 'Required field missing';
    error.status = 400;
  } else if (err.message) {
    error.message = err.message;
    error.status = err.status || 500;
  }

  // Don't leak sensitive information in production
  if (process.env.NODE_ENV === 'production' && error.status >= 500) {
    error.message = 'Internal server error';
  }

  res.status(error.status).json({
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    ...(error.details && { details: error.details })
  });
};

module.exports = errorHandler;