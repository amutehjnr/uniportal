'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../src/models/User');
const University = require('../src/models/University');
const Program = require('../src/models/Program');
const Scholarship = require('../src/models/Scholarship');
const StudentProfile = require('../src/models/StudentProfile');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}), University.deleteMany({}), Program.deleteMany({}),
    Scholarship.deleteMany({}), StudentProfile.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // ── Create Super Admin ────────────────────────────────────────────────────
  const superAdmin = await User.create({
    firstName: 'Super', lastName: 'Admin', email: process.env.SUPER_ADMIN_EMAIL || 'emiliachris74@gmail.com',
    password: process.env.SUPER_ADMIN_PASSWORD || 'Musamarch@121', role: 'super_admin', isEmailVerified: true,
  });

  // ── Create Admin ──────────────────────────────────────────────────────────
  const admin = await User.create({
    firstName: 'Admin', lastName: 'User', email: 'admin@demo.com',
    password: 'Demo@6565', role: 'admin', isEmailVerified: true,
  });

  // ── Create Demo Student ───────────────────────────────────────────────────
  const student = await User.create({
    firstName: 'John', lastName: 'Doe', email: 'student@demo.com',
    password: 'Demo1234', role: 'student', isEmailVerified: true,
  });
  await StudentProfile.create({
    user: student._id, gender: 'male', nationality: 'Nigerian',
    dateOfBirth: new Date('2000-01-15'),
    education: [{ institution: 'University of Lagos', degree: 'Bachelor', fieldOfStudy: 'Computer Science', startYear: 2018, endYear: 2022, gpa: 3.8, country: 'Nigeria' }],
    testScores: [{ testName: 'IELTS', score: 7.5, dateGiven: new Date('2023-06-01') }, { testName: 'GRE', score: 320, dateGiven: new Date('2023-07-15') }],
    address: { city: 'Lagos', country: 'Nigeria' },
  });

  // ── Create University Users & Profiles ───────────────────────────────────
  const uniData = [
    { name: 'Massachusetts Institute of Technology', slug: 'mit', type: 'private', city: 'Cambridge', state: 'Massachusetts', ranking: { usnews: 1, qs: 1 }, stats: { acceptanceRate: 4, totalStudents: 11500, internationalStudents: 3200 } },
    { name: 'Stanford University', slug: 'stanford', type: 'private', city: 'Stanford', state: 'California', ranking: { usnews: 3, qs: 2 }, stats: { acceptanceRate: 4.3, totalStudents: 16914, internationalStudents: 3700 } },
    { name: 'University of California, Berkeley', slug: 'uc-berkeley', type: 'public', city: 'Berkeley', state: 'California', ranking: { usnews: 22, qs: 27 }, stats: { acceptanceRate: 14.5, totalStudents: 42500, internationalStudents: 5200 } },
    { name: 'Carnegie Mellon University', slug: 'cmu', type: 'private', city: 'Pittsburgh', state: 'Pennsylvania', ranking: { usnews: 25, qs: 52 }, stats: { acceptanceRate: 15.4, totalStudents: 14900, internationalStudents: 3800 } },
    { name: 'University of Michigan', slug: 'umich', type: 'public', city: 'Ann Arbor', state: 'Michigan', ranking: { usnews: 23, qs: 33 }, stats: { acceptanceRate: 17.7, totalStudents: 47000, internationalStudents: 6800 } },
    { name: 'Georgia Institute of Technology', slug: 'gatech', type: 'public', city: 'Atlanta', state: 'Georgia', ranking: { usnews: 35, qs: 88 }, stats: { acceptanceRate: 17.8, totalStudents: 21000, internationalStudents: 5100 } },
  ];

  const universities = [];
  for (const u of uniData) {
    const uniUser = await User.create({
      firstName: u.name.split(' ')[0], lastName: 'University', email: `${u.slug}@demo.com`,
      password: 'Demo1234', role: 'university', isEmailVerified: true,
    });
    const uni = await University.create({
      user: uniUser._id, name: u.name, slug: u.slug, type: u.type,
      description: `${u.name} is a world-renowned research university known for academic excellence, innovation, and strong industry connections.`,
      location: { city: u.city, state: u.state, country: 'USA' },
      contact: { email: `admissions@${u.slug}.edu`, website: `https://www.${u.slug}.edu`, admissionsEmail: `international@${u.slug}.edu` },
      ranking: { ...u.ranking, year: 2024 }, stats: u.stats,
      isVerified: true, isActive: true, featured: Math.random() > 0.5,
    });
    uniUser.universityRef = uni._id;
    await uniUser.save({ validateBeforeSave: false });
    universities.push(uni);
  }

  // ── Create Programs ───────────────────────────────────────────────────────
  const programTemplates = [
    { name: 'Master of Science in Computer Science', degree: 'Master', field: 'Computer Science', duration: 2, tuition: 58000 },
    { name: 'Master of Business Administration', degree: 'MBA', field: 'Business Administration', duration: 2, tuition: 72000 },
    { name: 'PhD in Artificial Intelligence', degree: 'PhD', field: 'Artificial Intelligence', duration: 5, tuition: 45000 },
    { name: 'Bachelor of Science in Engineering', degree: 'Bachelor', field: 'Engineering', duration: 4, tuition: 52000 },
    { name: 'Master of Data Science', degree: 'Master', field: 'Data Science', duration: 1.5, tuition: 55000 },
    { name: 'Master of Public Policy', degree: 'Master', field: 'Public Policy', duration: 2, tuition: 48000 },
  ];

  for (const uni of universities) {
    const numPrograms = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < numPrograms; i++) {
      const t = programTemplates[i % programTemplates.length];
      await Program.create({
        university: uni._id, name: t.name, degree: t.degree, field: t.field,
        description: `Our ${t.name} program offers cutting-edge curriculum, world-class faculty, and exceptional career prospects.`,
        duration: { value: t.duration, unit: 'years' },
        mode: ['on-campus','hybrid','online'][Math.floor(Math.random()*3)],
        tuitionFee: { amount: t.tuition + Math.round(Math.random()*10000-5000), currency: 'USD', per: 'year' },
        applicationFee: { amount: [75,90,100,125][Math.floor(Math.random()*4)], currency: 'USD' },
        intakes: ['Fall','Spring'],
        requirements: [
          { type: 'gpa', minimum: 3.0, preferred: 3.5 },
          { type: 'ielts', minimum: 6.5, preferred: 7.0 },
          { type: 'gre', minimum: 300 },
        ],
        isActive: true, featured: Math.random() > 0.7,
      });
    }
  }

  // ── Create Scholarships ───────────────────────────────────────────────────
  const scholarshipData = [
    { name: 'International Excellence Scholarship', type: 'merit', amount: 20000, deadline: 30 },
    { name: 'STEM Diversity Fellowship', type: 'diversity', amount: 15000, deadline: 60 },
    { name: 'Graduate Research Award', type: 'research', isPercentage: true, percentage: 50, deadline: 45 },
    { name: 'Global Leadership Grant', type: 'merit', amount: 10000, deadline: 90 },
    { name: 'Full Ride Presidential Scholarship', type: 'full_ride', deadline: 30 },
    { name: 'Need-Based International Aid', type: 'need', amount: 25000, deadline: 60 },
  ];

  for (let i = 0; i < scholarshipData.length; i++) {
    const s = scholarshipData[i];
    const uni = universities[i % universities.length];
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + s.deadline);
    await Scholarship.create({
      university: uni._id, name: s.name, type: s.type,
      description: `The ${s.name} supports outstanding international students pursuing academic excellence at ${uni.name}.`,
      amount: s.isPercentage ? { isPercentage: true, percentage: s.percentage } : { value: s.amount, currency: 'USD', isPercentage: false },
      eligibility: { nationalities: ['All'], degreeLevel: ['Master','PhD','Bachelor'], gpaMinimum: 3.0 },
      deadline, isActive: true, isFeatured: i < 3,
      createdBy: (await User.findOne({ role: 'admin' }))._id,
    });
  }

  console.log('✅ Seed completed successfully!');
  console.log('─────────────────────────────────────────────');
  console.log('Demo Credentials:');
  console.log('  Super Admin: superadmin@uniportal.io / SuperAdmin1234!');
  console.log('  Admin:       admin@demo.com / Demo1234');
  console.log('  Student:     student@demo.com / Demo1234');
  console.log('  University:  mit@demo.com / Demo1234');
  console.log('─────────────────────────────────────────────');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
