'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/authController');
const { authenticate } = require('../../middleware/auth');
const { authLimiter, passwordResetLimiter, emailLimiter } = require('../../middleware/rateLimiter');
const { validate } = require('../../middleware/validate');
const { body } = require('express-validator');

router.post('/register', authLimiter, [body('firstName').trim().notEmpty(), body('lastName').trim().notEmpty(), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8 })], validate, ctrl.register);
router.post('/login', authLimiter, [body('email').isEmail(), body('password').notEmpty()], validate, ctrl.login);
router.post('/refresh', ctrl.refreshToken);
router.post('/logout', authenticate, ctrl.logout);
router.get('/verify-email/:token', emailLimiter, ctrl.verifyEmail);
router.post('/forgot-password', passwordResetLimiter, [body('email').isEmail()], validate, ctrl.forgotPassword);
router.patch('/reset-password/:token', [body('password').isLength({ min: 8 })], validate, ctrl.resetPassword);
router.get('/me', authenticate, ctrl.getMe);
router.patch('/update-password', authenticate, ctrl.updatePassword);
module.exports = router;
