/**
 * Validation Middleware for Hotel Service
 */

const Joi = require('joi');

const validateHotelSearch = (req, res, next) => {
    const schema = Joi.object({
        location: Joi.string().min(2).required()
            .messages({
                'string.min': 'Location must be at least 2 characters',
                'any.required': 'Location is required'
            }),
        checkIn: Joi.date().iso().min('now').required()
            .messages({
                'date.base': 'Check-in must be a valid ISO date',
                'date.min': 'Check-in cannot be in the past',
                'any.required': 'Check-in date is required'
            }),
        checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).required()
            .messages({
                'date.greater': 'Check-out must be after check-in',
                'any.required': 'Check-out date is required'
            }),
        guests: Joi.number().integer().min(1).max(10).optional()
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

    next();
};

const validateRoomReservation = (req, res, next) => {
    const schema = Joi.object({
        roomCount: Joi.number().integer().min(1).max(10).required()
            .messages({
                'number.min': 'At least 1 room must be selected',
                'number.max': 'Maximum 10 rooms allowed per booking',
                'any.required': 'Room count is required'
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

const validateHotelId = (req, res, next) => {
    const { id } = req.params;

    if (!id || isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({
            success: false,
            error: 'Invalid hotel ID'
        });
    }

    req.params.id = parseInt(id);
    next();
};

const validateCitySearch = (req, res, next) => {
    const schema = Joi.object({
        query: Joi.string().min(2).max(50).required()
            .messages({
                'string.min': 'Search query must be at least 2 characters',
                'string.max': 'Search query too long',
                'any.required': 'Search query is required'
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
    validateHotelSearch,
    validateRoomReservation,
    validateHotelId,
    validateCitySearch
};
