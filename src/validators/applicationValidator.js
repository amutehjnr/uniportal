'use strict';
const { body, param } = require('express-validator');

exports.createApplication = [
  body('programId').isMongoId().withMessage('Invalid program ID'),
  body('intake').isIn(['Fall','Spring','Summer','Winter']).withMessage('Invalid intake'),
  body('intakeYear').isInt({ min: 2024, max: 2030 }).withMessage('Invalid intake year'),
  body('personalStatement').optional().isLength({ max: 10000 }).withMessage('Statement too long'),
];

exports.updateStatus = [
  param('id').isMongoId(),
  body('status').isIn(['under_review','documents_requested','interview_scheduled','offer_extended','accepted','rejected','waitlisted','withdrawn']).withMessage('Invalid status'),
  body('message').optional().isLength({ max: 1000 }),
];
