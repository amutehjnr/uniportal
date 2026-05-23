'use strict';
/**
 * Database migration script
 * Usage: node scripts/migrate.js
 * Add migration functions below as the app evolves
 */
require('dotenv').config();
const mongoose = require('mongoose');

const migrations = [
  {
    version: '1.0.0',
    description: 'Initial schema setup — handled by Mongoose auto-create',
    run: async () => {
      console.log('  → Creating indexes...');
      const User = require('../src/models/User');
      const Application = require('../src/models/Application');
      const Scholarship = require('../src/models/Scholarship');
      await Promise.all([
        User.createIndexes(),
        Application.createIndexes(),
        Scholarship.createIndexes(),
      ]);
      console.log('  ✓ Indexes created');
    },
  },
];

async function runMigrations() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Running migrations...\n');
  for (const m of migrations) {
    console.log(`[${m.version}] ${m.description}`);
    await m.run();
    console.log(`✓ ${m.version} complete\n`);
  }
  await mongoose.disconnect();
  console.log('All migrations complete.');
}

runMigrations().catch(err => { console.error('Migration failed:', err); process.exit(1); });
