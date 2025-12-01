/**
 * Validation Middleware
 * 
 * Uses Joi for request validation
 * Validates query parameters, body, and params
 */

const Joi = require('joi');

/**
 * Validate flight search query parameters
 */
const validateFlightSearch = (req, res, next) => {
    const schema = Joi.object({
        from: Joi.string().length(3).uppercase().required()
            .messages({
                'string.length': 'Origin airport code must be 3 characters',
                'any.required': 'Origin airport (from) is required'
            }),
        to: Joi.string().length(3).uppercase().required()
            .messages({
                'string.length': 'Destination airport code must be 3 characters',
                'any.required': 'Destination airport (to) is required'
            }),
        date: Joi.date().iso().min('now').required()
            .messages({
                'date.base': 'Date must be a valid ISO date',
                'date.min': 'Date cannot be in the past',
                'any.required': 'Date is required'
            }),
        passengers: Joi.number().integer().min(1).max(9).optional(),
        type: Joi.string().valid('oneway', 'roundtrip', 'multicity').optional()
    });

    const { error } = schema.validate(req.query, { abortEarly: false });

    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path[0],
            message: detail.message
        }));

        return res.status(400).json({
            success: false,
            error: 'Validation error',
            details: errors
        });
    }

    // Convert to uppercase for consistency
    if (req.query.from) req.query.from = req.query.from.toUpperCase();
    if (req.query.to) req.query.to = req.query.to.toUpperCase();

    next();
};

/**
 * Validate seat reservation request
 */
const validateSeatReservation = (req, res, next) => {
    const schema = Joi.object({
        seatNumbers: Joi.array()
            .items(Joi.string().pattern(/^[0-9]{1,2}[A-F]$/))
            .min(1)
            .max(9)
            .required()
            .messages({
                'array.min': 'At least one seat must be selected',
                'array.max': 'Maximum 9 seats allowed per booking',
                'string.pattern.base': 'Invalid seat format (e.g., 12A, 5B)',
                'any.required': 'Seat numbers are required'
            })
    });

    const { error } = schema.validate(req.body);

    if (error) {
        return res.status(400).json({
            success: false,
            error: error.details[0].message
        });
    }

    next();
};

/**
 * Validate flight ID parameter
 */
const validateFlightId = (req, res, next) => {
    const { id } = req.params;

    if (!id || isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({
            success: false,
            error: 'Invalid flight ID'
        });
    }

    req.params.id = parseInt(id);
    next();
};

/**
 * Validate airport search query
 */
const validateAirportSearch = (req, res, next) => {
    const schema = Joi.object({
        q: Joi.string().min(2).max(50).required()
            .messages({
                'string.min': 'Search query must be at least 2 characters',
                'string.max': 'Search query too long',
                'any.required': 'Search query (q) is required'
            })
    });

    const { error } = schema.validate(req.query);

    if (error) {
        return res.status(400).json({
            success: false,
            error: error.details[0].message
        });
    }

    next();
};

module.exports = {
    validateFlightSearch,
    validateSeatReservation,
    validateFlightId,
    validateAirportSearch
};
