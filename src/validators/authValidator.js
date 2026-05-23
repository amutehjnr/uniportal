'use strict';
const { body } = require('express-validator');

exports.register = [
  body('firstName').trim().notEmpty().isLength({ max: 50 }).withMessage('First name required'),
  body('lastName').trim().notEmpty().isLength({ max: 50 }).withMessage('Last name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase and number'),
];

exports.login = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password required'),
];

exports.forgotPassword = [
  body('email').isEmail().normalizeEmail(),
];

exports.resetPassword = [
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
];
