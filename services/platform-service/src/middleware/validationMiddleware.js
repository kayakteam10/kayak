const Joi = require('joi');
const logger = require('../utils/logger');

const validateUpdateProfile = (req, res, next) => {
    const schema = Joi.object({
        firstName: Joi.string().min(1).max(100).optional(),
        lastName: Joi.string().min(1).max(100).optional(),
        phone: Joi.string().pattern(/^\+?[\d\s-]{10,}$/).message('Invalid phone number format').optional(),
        address: Joi.string().min(5).max(255).optional(),
        city: Joi.string().min(2).max(100).optional(),
        state: Joi.string().length(2).uppercase().message('State must be a 2-letter abbreviation (e.g., CA, NY)').optional(),
        zipCode: Joi.string().pattern(/^\d{5}(-\d{4})?$/).message('Invalid ZIP code format (e.g., 12345 or 12345-6789)').optional(),
        ssn: Joi.string().pattern(/^\d{3}-\d{2}-\d{4}$/).message('Invalid SSN format (000-00-0000)').optional(),
        profilePicture: Joi.string().allow('').optional(), // Allow empty string
        creditCardLast4: Joi.string().allow('').optional(),
        creditCardType: Joi.string().allow('').optional()
    });

    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });

    if (error) {
        logger.warn(`Validation failed: ${error.details.map(x => x.message).join(', ')}`);
        return res.status(400).json({
            success: false,
            error: error.details.map(x => x.message).join(', ')
        });
    }

    req.body = value; // Use validated value with stripped fields
    next();
};

module.exports = {
    validateUpdateProfile
};
