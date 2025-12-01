/**
 * Error Handling Middleware
 * 
 * Centralized error handling for the service
 * Handles different error types with appropriate responses
 */

/**
 * Error handler middleware
 * Must be registered LAST in Express app
 */
const errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', err);

    // Joi validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
            message: err.message
        });
    }

    // MySQL duplicate entry error
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            success: false,
            error: 'Duplicate entry',
            message: 'A record with this information already exists'
        });
    }

    // MySQL foreign key constraint error
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
            success: false,
            error: 'Invalid reference',
            message: 'Referenced record does not exist'
        });
    }

    // MySQL connection error
    if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
        return res.status(503).json({
            success: false,
            error: 'Database connection error',
            message: 'Service temporarily unavailable'
        });
    }

    // Business logic errors (from service layer)
    if (err.message.includes('not found')) {
        return res.status(404).json({
            success: false,
            error: 'Not found',
            message: err.message
        });
    }

    if (err.message.includes('available') || err.message.includes('Insufficient')) {
        return res.status(409).json({
            success: false,
            error: 'Conflict',
            message: err.message
        });
    }

    // Default internal server error
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
};

/**
 * 404 Not Found handler
 * For routes that don't exist
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.path}`
    });
};

/**
 * Async handler wrapper
 * Catches errors from async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler
};
