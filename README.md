# UniPortal 🎓
### International University Admission & Scholarship Platform

A production-grade, investor-level platform connecting international students with US universities.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env template
cp .env.example .env
# Fill in MONGODB_URI, CLOUDINARY_*, SMTP_* etc.

# 3. Seed database with demo data
npm run seed

# 4. Start development server
npm run dev

# 5. Open http://localhost:5000
```

## Demo Credentials
| Role | Email | Password |
|---|---|---|
| Super Admin | superadmin@uniportal.io | SuperAdmin1234! |
| Admin | admin@demo.com | Demo1234 |
| Student | student@demo.com | Demo1234 |
| University | mit@demo.com | Demo1234 |

## Features
- ✅ JWT auth with refresh token rotation
- ✅ Role-based access control (5 roles)
- ✅ University & program management
- ✅ Scholarship listings with filters
- ✅ Student application workflow
- ✅ Offer letter generation (PDF)
- ✅ Manual payment verification
- ✅ Real-time messaging (Socket.IO)
- ✅ In-app + email notifications
- ✅ Admin dashboard with audit logs
- ✅ Fraud prevention foundation
- ✅ Enterprise security (Helmet, rate limiting, sanitization)
- ✅ Cloudinary file uploads
- ✅ Redis-ready caching (graceful degradation)

## Deployment (Render)
1. Push to GitHub
2. Create Render web service → connect repo
3. Set environment variables in Render dashboard
4. Deploy — `render.yaml` handles the rest

See `ARCHITECTURE.md` for full technical documentation.

---
Built with Node.js · Express · MongoDB · Socket.IO · EJS · TailwindCSS
