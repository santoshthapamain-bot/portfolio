const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'portfolio.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------- Schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  reset_token TEXT,
  reset_expires INTEGER
);

CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT DEFAULT 'Your Name',
  role TEXT DEFAULT 'Full Stack Developer',
  bio TEXT DEFAULT 'Write a short bio about yourself from the dashboard.',
  profile_photo TEXT DEFAULT '',
  resume_link TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS hero_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  image TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS education (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  degree TEXT NOT NULL,
  institution TEXT NOT NULL,
  year TEXT DEFAULT '',
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS hobbies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  icon TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS trainings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  organization TEXT DEFAULT '',
  year TEXT DEFAULT '',
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  link TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS social_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS contact_info (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT DEFAULT '',
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// ---------- Seed default data (only runs once) ----------
const seed = db.transaction(() => {
  const adminCount = db.prepare('SELECT COUNT(*) AS c FROM admin').get().c;
  if (adminCount === 0) {
    const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123';
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO admin (email, password) VALUES (?, ?)').run(email, hash);
    console.log(`\n[seed] Default admin created -> email: ${email}  password: ${password}`);
    console.log('[seed] Please log in and change this password from the dashboard.\n');
  }

  const profileCount = db.prepare('SELECT COUNT(*) AS c FROM profile').get().c;
  if (profileCount === 0) {
    db.prepare(`INSERT INTO profile (id, name, role, bio, profile_photo) VALUES (1, ?, ?, ?, ?)`)
      .run('Your Name', 'Full Stack Developer', 'This is your bio. Edit it anytime from the Dashboard.', '');
  }

  const contactCount = db.prepare('SELECT COUNT(*) AS c FROM contact_info').get().c;
  if (contactCount === 0) {
    db.prepare(`INSERT INTO contact_info (id, email, phone, address) VALUES (1, ?, ?, ?)`)
      .run('you@example.com', '+00 000 000 0000', 'Your City, Country');
  }
});
seed();

module.exports = db;
