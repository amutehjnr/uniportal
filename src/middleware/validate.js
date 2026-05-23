'use strict';
const { validationResult } = require('express-validator');
const { ValidationError } = require('./errorHandler');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map(e => ({ field: e.path || e.param, message: e.msg }));
    throw new ValidationError(formatted);
  }
  next();
};

module.exports = { validate };
