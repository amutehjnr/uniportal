# UniPortal – Production Architecture Document
> International University Admission & Scholarship Platform (USA Focus)

---

## 1. System Overview

UniPortal is an investor-grade, production-ready university admission platform built as a multi-tenant SaaS connecting international students, US universities, admission officers, and platform admins.

**Core Technology Stack**
| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js 4.x |
| Template Engine | EJS + TailwindCSS + Vanilla JS |
| Database | MongoDB Atlas (M10+) |
| Authentication | JWT (access 15m) + Refresh Tokens (7d) |
| File Storage | Cloudinary |
| Real-time | Socket.IO 4.x |
| Email | Nodemailer (SMTP) |
| PDF | PDFKit |
| Caching | Redis (ioredis, optional/graceful) |
| Deployment | Render (web service) |

---

## 2. Folder Structure

```
uniportal/
├── src/
│   ├── app.js                    # Boot entry point
│   ├── config/
│   │   ├── express.js            # Express setup + all middleware
│   │   ├── database.js           # MongoDB connection + retry
│   │   ├── logger.js             # Winston daily-rotate logger
│   │   ├── socket.js             # Socket.IO server + auth
│   │   ├── redis.js              # Redis client + cache helpers
│   │   ├── cloudinary.js         # Multer-Cloudinary upload configs
│   │   └── email.js              # Nodemailer + HTML email templates
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── applicationController.js
│   │   ├── offerController.js
│   │   ├── paymentController.js
│   │   ├── universityController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   ├── auth.js               # JWT authenticate, authorize (RBAC)
│   │   ├── asyncHandler.js       # Async error wrapper
│   │   ├── errorHandler.js       # AppError class + global handler
│   │   ├── rateLimiter.js        # Per-endpoint rate limiters
│   │   ├── validate.js           # express-validator runner
│   │   └── audit.js              # Audit log interceptor
│   ├── models/
│   │   ├── User.js               # Auth + RBAC base
│   │   ├── StudentProfile.js     # Education, test scores, docs
│   │   ├── University.js         # Institution profiles
│   │   ├── Program.js            # Degree programs + requirements
│   │   ├── Scholarship.js        # Scholarship listings
│   │   ├── Application.js        # Applications + workflow
│   │   ├── Offer.js              # Admission offer letters
│   │   ├── Payment.js            # Manual payment verification
│   │   ├── Notification.js       # In-app + email notifications
│   │   ├── Message.js            # Conversation + Message models
│   │   └── AuditLog.js           # Immutable audit trail
│   ├── routes/
│   │   ├── index.js              # API v1 router aggregator
│   │   ├── web.js                # EJS page routes
│   │   └── api/
│   │       ├── auth.js
│   │       ├── applications.js
│   │       ├── universities.js
│   │       ├── programs.js
│   │       ├── scholarships.js
│   │       ├── offers.js
│   │       ├── payments.js
│   │       ├── notifications.js
│   │       ├── messages.js
│   │       ├── admin.js
│   │       └── profile.js
│   ├── services/
│   │   ├── authService.js        # Token lifecycle, register/login
│   │   ├── notificationService.js # Create + emit notifications
│   │   └── pdfService.js         # Offer letter PDF generation
│   └── validators/               # express-validator rule sets
├── views/
│   ├── partials/
│   │   ├── head.ejs              # HTML head + Tailwind config
│   │   ├── navbar.ejs            # Global navigation
│   │   ├── sidebar-student.ejs   # Student sidebar
│   │   └── footer.ejs            # Global JS utilities
│   ├── auth/                     # login, register, forgot/reset
│   ├── public/                   # home, universities, programs, scholarships
│   ├── student/                  # dashboard, applications, offers, payments, messages
│   ├── university/               # dashboard, application review, programs
│   ├── admin/                    # dashboard, users, payments, audit logs
│   └── error.ejs
├── scripts/
│   └── seed.js                   # Dev database seeder
├── public/                       # Static assets (CSS, JS, images)
├── logs/                         # Winston log files (gitignored)
├── .env.example
├── render.yaml                   # Render IaC blueprint
├── Procfile
└── package.json
```

---

## 3. User Roles & RBAC

| Role | Access Level | Key Capabilities |
|---|---|---|
| `student` | Own resources only | Apply, upload docs, accept offers, submit payments |
| `university` | Own university | Manage programs/scholarships, review applications, issue offers |
| `admission_officer` | Assigned university | Review and update applications |
| `admin` | Platform-wide | Verify payments, manage users, verify universities |
| `super_admin` | Full access | Create admin users, access all resources, audit logs |

---

## 4. Authentication Architecture

```
POST /api/v1/auth/register
  → Hash password (bcrypt cost=12)
  → Create User + StudentProfile
  → Generate email verification token (SHA-256 hash stored)
  → Send welcome email

POST /api/v1/auth/login
  → Check account locked (brute-force protection)
  → Compare bcrypt hash
  → Generate JWT access token (15m) + refresh token (7d)
  → Store hashed refresh token in user.refreshTokens[]
  → Set HTTP-only cookies (Secure + SameSite=Strict in prod)
  → Reset login attempts

POST /api/v1/auth/refresh
  → Verify refresh token JWT
  → Find hashed token in DB (replay protection)
  → Rotate: delete old, issue new pair
  → Set new cookies

POST /api/v1/auth/logout
  → Remove specific refresh token from DB
  → Clear cookies

Security Properties:
  ✓ Refresh token rotation (each use invalidates old token)
  ✓ Max 5 concurrent sessions per user
  ✓ Account locked after 5 failed attempts (2h)
  ✓ All sessions invalidated on password change
  ✓ Tokens never stored in localStorage
```

---

## 5. Security Architecture

### Applied Middleware Stack (express.js)
```
Helmet.js          → 15+ security headers (CSP, HSTS, XFO, etc.)
CORS               → Allowlist-based origin control
Rate Limiting      → Global (100/15m) + per-endpoint (auth: 10/15m)
mongoSanitize      → Strip $ and . from MongoDB operators (NoSQL injection)
xss-clean          → Sanitize HTML in request bodies
JWT Verification   → Stateless auth + DB validation
RBAC Middleware    → Role-based route protection
Audit Logging      → Every mutating API call logged
bcrypt (cost=12)   → Password hashing
HTTP-only Cookies  → Token storage (prevents XSS theft)
Input Validation   → express-validator on all write routes
File Validation    → MIME type + size checks before Cloudinary upload
```

### Threat Model Coverage
| Threat | Mitigation |
|---|---|
| SQL/NoSQL Injection | mongoSanitize + Mongoose strict schemas |
| XSS | xss-clean + Helmet CSP + HTTP-only cookies |
| CSRF | SameSite=Strict cookies + CORS allowlist |
| Brute Force | Rate limiting + account lockout (5 attempts) |
| Token Theft | HTTP-only cookies + refresh rotation |
| Session Replay | Hashed token storage + single-use rotation |
| File Upload Abuse | MIME + size validation + Cloudinary quarantine |
| Privilege Escalation | RBAC middleware on every protected route |
| Information Disclosure | Generic error messages in production |
| Audit Trail Gaps | Immutable AuditLog with 2-year TTL |

---

## 6. MongoDB Schema Design

### Indexes Strategy
```js
// User: email lookups, role filtering
{ email: 1 }        (unique)
{ email: 1, role: 1 }
{ createdAt: -1 }

// Application: student/university queries, status dashboards
{ student: 1, status: 1 }
{ university: 1, status: 1 }
{ student: 1, university: 1, program: 1 }  (unique – prevents duplicates)

// Scholarship: deadline filtering, nationality matching
{ deadline: 1, isActive: 1 }
{ 'eligibility.nationalities': 1 }
{ name: 'text', description: 'text' }  (full-text)

// Notification: TTL auto-delete at 90 days
{ createdAt: 1 }  expireAfterSeconds: 7776000

// AuditLog: TTL auto-delete at 2 years
{ createdAt: 1 }  expireAfterSeconds: 63072000
```

### Relationship Strategy
- **Reference (ObjectId)** for cross-collection links (User→University, Application→Program)
- **Embed** for subdocuments that are always queried together (documents[], timeline[], testScores[])
- **Denormalize selectively** for critical read paths (lastMessage in Conversation)

---

## 7. API Structure

```
Base URL: /api/v1

Auth
  POST   /auth/register
  POST   /auth/login
  POST   /auth/refresh
  POST   /auth/logout
  GET    /auth/verify-email/:token
  POST   /auth/forgot-password
  PATCH  /auth/reset-password/:token
  GET    /auth/me
  PATCH  /auth/update-password

Universities (public + authenticated)
  GET    /universities                 → listing + search
  GET    /universities/:slug           → detail
  GET    /universities/:id/programs    → programs for a university
  GET    /universities/dashboard/stats → university portal stats

Programs
  GET    /programs                     → listing + filters

Scholarships
  GET    /scholarships                 → listing + filters
  GET    /scholarships/:id
  POST   /scholarships                 → create (uni/admin)

Applications
  POST   /applications                 → create draft
  GET    /applications                 → list (role-filtered)
  GET    /applications/:id
  PATCH  /applications/:id/submit
  PATCH  /applications/:id/status      → update (uni/admin)
  POST   /applications/:id/documents   → file upload

Offers
  POST   /offers                       → issue offer (uni/admin)
  GET    /offers/:id
  PATCH  /offers/:id/respond           → accept/decline (student)

Payments
  POST   /payments                     → submit + proof upload
  GET    /payments                     → list (role-filtered)
  PATCH  /payments/:id/verify          → verify/reject (admin)

Notifications
  GET    /notifications
  PATCH  /notifications/read-all
  PATCH  /notifications/:id/read

Messages
  GET    /messages/conversations
  POST   /messages/conversations
  GET    /messages/conversations/:id/messages
  POST   /messages/conversations/:id/messages

Profile
  GET    /profile/student
  PATCH  /profile/student
  POST   /profile/avatar
  POST   /profile/document/:type

Admin
  GET    /admin/dashboard
  GET    /admin/users
  PATCH  /admin/users/:id/suspend
  PATCH  /admin/universities/:id/verify
  GET    /admin/audit-logs
  POST   /admin/users                  → create admin users
```

---

## 8. Application Workflow

```
Student Workflow:
  Register → Verify Email → Complete Profile (95%) →
  Browse Universities → Select Program → Create Application (draft) →
  Upload Documents → Submit Application →
  Track Status (real-time notifications) →
  Receive Offer Letter → Accept/Decline →
  Submit Payment Proof → Enrollment

University Workflow:
  Register → Admin Verification →
  Set Up Profile + Programs + Scholarships →
  Receive Application Notifications →
  Review Documents → Update Status →
  Schedule Interview (optional) →
  Issue Offer Letter (PDF generated + emailed) →
  Confirm Enrollment

Admin Workflow:
  Platform Dashboard → Verify Universities →
  Review Payment Proofs → Verify/Reject →
  Monitor Audit Logs → Manage Users →
  View Analytics
```

---

## 9. Real-time Architecture (Socket.IO)

```
Authentication: JWT token on handshake
Rooms:
  user:{userId}        → personal notifications
  role:{role}          → broadcast to role
  conv:{conversationId} → messaging

Events emitted to client:
  notification:new     → new notification bell + toast
  message:new          → real-time chat
  typing:start / stop  → typing indicator

Events from client:
  join:conversation    → subscribe to chat room
  leave:conversation
  typing:start / stop
```

---

## 10. Render Deployment Setup

### Step-by-Step
```bash
# 1. Fork / push to GitHub
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/yourorg/uniportal
git push origin main

# 2. Create MongoDB Atlas cluster (M10+ for production)
# - Enable VPC Peering or allowlist Render IPs
# - Create database user with readWrite role
# - Get connection string → MONGODB_URI

# 3. Create Cloudinary account
# - Get Cloud Name, API Key, API Secret

# 4. Create Render web service
# - Connect GitHub repo
# - Build: npm install
# - Start: npm start
# - Health check: /health

# 5. Set all env vars in Render Dashboard:
#    MONGODB_URI, CLOUDINARY_*, SMTP_*, JWT_*_SECRET,
#    APP_URL, ALLOWED_ORIGINS, SUPER_ADMIN_*

# 6. Seed the database (one-time):
#    Via Render Shell or locally with production MONGODB_URI:
npm run seed
```

### Environment Tiers
| Tier | Render Plan | MongoDB | Notes |
|---|---|---|---|
| MVP | Starter ($7/mo) | M0 Free | Dev/staging only |
| Launch | Starter ($7/mo) | M10 ($57/mo) | Up to 10K users |
| Growth | Standard ($25/mo) | M20 ($189/mo) | Up to 100K users |
| Scale | Pro ($85/mo) + Redis | M30+ | 100K+ users |

---

## 11. Performance Optimizations

```
✓ MongoDB connection pool (maxPoolSize: 10)
✓ Response compression (gzip)
✓ Static file caching (7-day Cache-Control in prod)
✓ Redis caching layer (university listings, program search)
  - Cache TTL: 5min for listings, 10min for detail pages
  - Graceful degradation if Redis unavailable
✓ Pagination on all list endpoints
✓ Selective field projection (no password in responses)
✓ Indexes on all query paths
✓ TTL indexes on notifications (90d) and audit logs (2yr)
✓ Socket.IO connection pooling
✓ Cloudinary CDN for all media
✓ Lazy loading on EJS pages (API calls after DOM ready)
✓ Morgan HTTP logging skips 2xx in production
```

---

## 12. Monitoring & Logging

```
Winston Levels: error, warn, info, http, debug
Log Rotation: Daily files, 30d error retention, 14d combined
Formats: JSON (file), colorized (console)

Logs captured:
  - All HTTP requests (morgan → winston)
  - MongoDB connection events
  - Unhandled rejections + uncaught exceptions
  - Failed auth attempts
  - File upload events
  - Email delivery confirmations/failures
  - Socket.IO connect/disconnect

Production monitoring additions:
  - Render built-in metrics (CPU, memory, response time)
  - MongoDB Atlas Performance Advisor + Profiler
  - Uptime monitoring: Better Uptime or UptimeRobot (free tier)
  - Error tracking: Sentry (add @sentry/node in phase 2)
```

---

## 13. Future Scalability Roadmap

### Phase 2 (10K–100K users)
- Add Redis for session caching + job queues
- Separate email into a worker service (Bull/BullMQ)
- Add Stripe for automated payment processing
- Implement Elasticsearch for advanced program search
- Add rate limit with Redis store (distributed)

### Phase 3 (100K–1M users)
- Migrate to AWS (ECS Fargate + RDS Aurora or DocumentDB)
- Add CDN (CloudFront) for all static assets
- Implement horizontal scaling (multiple Express instances)
- Add read replicas for MongoDB
- Microservices split: auth-service, notification-service, pdf-service

### Phase 4 (1M+ users)
- Kubernetes (EKS) orchestration
- Event-driven architecture (AWS SQS/SNS or Kafka)
- Database sharding strategy
- Multi-region deployment
- ML-powered application matching & fraud detection

---

## 14. Production Checklist

### Before Launch
- [ ] Set all env vars in Render dashboard
- [ ] Enable MongoDB Atlas IP allowlist / VPC peering
- [ ] Configure custom domain + SSL in Render
- [ ] Set `ALLOWED_ORIGINS` to production domain
- [ ] Set `JWT_COOKIE_SECURE=true`
- [ ] Set `NODE_ENV=production`
- [ ] Run seed script for Super Admin creation
- [ ] Test email delivery (Nodemailer SMTP)
- [ ] Verify Cloudinary uploads working
- [ ] Test Socket.IO connection on production URL
- [ ] Load test with at least 100 concurrent users
- [ ] Enable MongoDB Atlas backups (daily)
- [ ] Set up uptime monitoring (UptimeRobot free)
- [ ] Review Helmet CSP policy for production domains
- [ ] Set `LOG_LEVEL=warn` in production

### Security Hardening
- [ ] Rotate JWT secrets quarterly
- [ ] Review CORS allowlist
- [ ] Audit RBAC on all routes
- [ ] Test rate limiting endpoints
- [ ] Verify audit logs capturing all sensitive actions
- [ ] Test brute-force lockout (5 attempts)
- [ ] Verify HTTP-only cookies in browser DevTools
- [ ] Penetration test (OWASP Top 10)
