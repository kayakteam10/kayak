/**
 * Validation Middleware for Car Service
 */

const Joi = require('joi');

const validateCarSearch = (req, res, next) => {
    const schema = Joi.object({
        location: Joi.string().min(2).required(),
        pickupDate: Joi.date().iso().min('now').required(),
        returnDate: Joi.date().iso().min(Joi.ref('pickupDate')).required(),
        carType: Joi.string().valid('economy', 'compact', 'suv', 'luxury', 'any').optional()
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

const validateCarReservation = (req, res, next) => {
    const schema = Joi.object({
        pickupDate: Joi.date().iso().min('now').required(),
        returnDate: Joi.date().iso().min(Joi.ref('pickupDate')).required()
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

const validateCarId = (req, res, next) => {
    const { id } = req.params;

    if (!id || isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({
            success: false,
            error: 'Invalid car ID'
        });
    }

    req.params.id = parseInt(id);
    next();
};

const validateLocationSearch = (req, res, next) => {
    const schema = Joi.object({
        q: Joi.string().min(2).max(50).required()
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
    validateCarSearch,
    validateCarReservation,
    validateCarId,
    validateLocationSearch
};
