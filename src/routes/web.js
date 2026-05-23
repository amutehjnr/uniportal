'use strict';
const express = require('express');
const router = express.Router();
const { optionalAuth, authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const University = require('../models/University');
const Program = require('../models/Program');
const Scholarship = require('../models/Scholarship');

// Public pages
router.get('/', optionalAuth, (req, res) => res.render('public/home', { title: 'UniPortal – Find Your Dream University', user: req.user }));
router.get('/universities', optionalAuth, (req, res) => res.render('public/universities', { title: 'Universities', user: req.user }));
router.get('/universities/:slug', optionalAuth, (req, res) => res.render('public/university-detail', { title: 'University Details', user: req.user, slug: req.params.slug }));
router.get('/programs', optionalAuth, (req, res) => res.render('public/programs', { title: 'Programs', user: req.user }));
router.get('/scholarships', optionalAuth, (req, res) => res.render('public/scholarships', { title: 'Scholarships', user: req.user }));
router.get('/scholarships/:id', optionalAuth, (req, res) => res.render('public/scholarship-detail', { title: 'Scholarship', user: req.user }));

// Auth pages
router.get('/login', (req, res) => res.render('auth/login', { title: 'Login – UniPortal', user: null }));
router.get('/register', (req, res) => res.render('auth/register', { title: 'Create Account – UniPortal', user: null }));
router.get('/forgot-password', (req, res) => res.render('auth/forgot-password', { title: 'Forgot Password', user: null }));
router.get('/reset-password/:token', (req, res) => res.render('auth/reset-password', { title: 'Reset Password', user: null, token: req.params.token }));

// Student dashboard
router.get('/dashboard', authenticate, authorize('student'), (req, res) => res.render('student/dashboard', { title: 'My Dashboard', user: req.user }));
router.get('/student/profile', authenticate, authorize('student'), (req, res) => res.render('student/profile', { title: 'My Profile', user: req.user }));
router.get('/student/applications', authenticate, authorize('student'), (req, res) => res.render('student/applications', { title: 'My Applications', user: req.user }));
router.get('/student/applications/:id', authenticate, authorize('student'), (req, res) => res.render('student/application-detail', { title: 'Application', user: req.user }));
router.get('/student/offers', authenticate, authorize('student'), (req, res) => res.render('student/offers', { title: 'My Offers', user: req.user }));
router.get('/student/offers/:id', authenticate, authorize('student'), (req, res) => res.render('student/offer-detail', { title: 'Offer Letter', user: req.user }));
router.get('/student/payments', authenticate, authorize('student'), (req, res) => res.render('student/payments', { title: 'Payments', user: req.user }));
router.get('/student/messages', authenticate, authorize('student'), (req, res) => res.render('student/messages', { title: 'Messages', user: req.user }));
router.get('/student/notifications', authenticate, (req, res) => res.render('student/notifications', { title: 'Notifications', user: req.user }));

// University dashboard
router.get('/university/dashboard', authenticate, authorize('university','admission_officer'), (req, res) => res.render('university/dashboard', { title: 'University Dashboard', user: req.user }));
router.get('/university/applications', authenticate, authorize('university','admission_officer'), (req, res) => res.render('university/applications', { title: 'Applications', user: req.user }));
router.get('/university/applications/:id', authenticate, authorize('university','admission_officer'), (req, res) => res.render('university/application-detail', { title: 'Application Review', user: req.user }));
router.get('/university/programs', authenticate, authorize('university'), (req, res) => res.render('university/programs', { title: 'Programs', user: req.user }));
router.get('/university/scholarships', authenticate, authorize('university'), (req, res) => res.render('university/scholarships', { title: 'Scholarships', user: req.user }));
router.get('/university/messages', authenticate, authorize('university','admission_officer'), (req, res) => res.render('university/messages', { title: 'Messages', user: req.user }));

// Admin dashboard
router.get('/admin/dashboard', authenticate, authorize('admin','super_admin'), (req, res) => res.render('admin/dashboard', { title: 'Admin Dashboard', user: req.user }));
router.get('/admin/users', authenticate, authorize('admin','super_admin'), (req, res) => res.render('admin/users', { title: 'Users', user: req.user }));
router.get('/admin/universities', authenticate, authorize('admin','super_admin'), (req, res) => res.render('admin/universities', { title: 'Universities', user: req.user }));
router.get('/admin/payments', authenticate, authorize('admin','super_admin'), (req, res) => res.render('admin/payments', { title: 'Payments', user: req.user }));
router.get('/admin/scholarships', authenticate, authorize('admin','super_admin'), (req, res) => res.render('admin/scholarships', { title: 'Scholarships', user: req.user }));
router.get('/admin/audit-logs', authenticate, authorize('admin','super_admin'), (req, res) => res.render('admin/audit-logs', { title: 'Audit Logs', user: req.user }));

module.exports = router;
