'use strict';

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const logger = require('./logger');
const { errorHandler, notFoundHandler } = require('../middleware/errorHandler');

const app = express();

// ── Trust Render's reverse proxy ─────────────────────────────────────────────
app.set('trust proxy', 1);

// ── Template Engine ───────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../../views'));

// ── Security Headers (Helmet) ─────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.tailwindcss.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://ui-avatars.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com', 'https://cdn.socket.io'],
      connectSrc: ["'self'", 'wss:', 'ws:'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ── Body Parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// ── Input Sanitization ────────────────────────────────────────────────────────
app.use(mongoSanitize());  // prevent NoSQL injection
app.use(xssClean());       // prevent XSS

// ── Global Rate Limiter ───────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  skip: (req) => req.path.startsWith('/public'),
});
app.use(globalLimiter);

// ── HTTP Logging ──────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (req, res) => res.statusCode < 400,
  }));
}

// ── Static Files ──────────────────────────────────────────────────────────────
app.use('/public', express.static(path.join(__dirname, '../../public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
  etag: true,
}));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ── API Routes ────────────────────────────────────────────────────────────────
const apiV1 = require('../routes/index');
app.use(`/api/${process.env.API_VERSION || 'v1'}`, apiV1);

// ── Web (EJS) Routes ──────────────────────────────────────────────────────────
const webRoutes = require('../routes/web');
app.use('/', webRoutes);

// ── 404 & Error Handlers ──────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
