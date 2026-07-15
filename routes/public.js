const express = require('express');
const router = express.Router();
const db = require('../db/database');

function getSiteData() {
  const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();
  const heroPhotos = db.prepare('SELECT * FROM hero_photos ORDER BY sort_order ASC, id ASC').all();
  const skills = db.prepare('SELECT * FROM skills ORDER BY sort_order ASC, id ASC').all();
  const education = db.prepare('SELECT * FROM education ORDER BY sort_order ASC, id ASC').all();
  const hobbies = db.prepare('SELECT * FROM hobbies ORDER BY sort_order ASC, id ASC').all();
  const trainings = db.prepare('SELECT * FROM trainings ORDER BY sort_order ASC, id ASC').all();
  const projects = db.prepare('SELECT * FROM projects ORDER BY sort_order ASC, id ASC').all();
  const social = db.prepare('SELECT * FROM social_links ORDER BY sort_order ASC, id ASC').all();
  const contact = db.prepare('SELECT * FROM contact_info WHERE id = 1').get();
  return { profile, heroPhotos, skills, education, hobbies, trainings, projects, social, contact };
}

router.get('/', (req, res) => {
  const data = getSiteData();
  res.render('home', { page: 'home', ...data });
});

router.get('/about', (req, res) => {
  const data = getSiteData();
  res.render('about', { page: 'about', ...data });
});

router.get('/projects', (req, res) => {
  const data = getSiteData();
  res.render('projects', { page: 'projects', ...data });
});

router.get('/contact', (req, res) => {
  const data = getSiteData();
  res.render('contact', { page: 'contact', ...data, sent: false, error: null });
});

router.post('/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  const data = getSiteData();

  if (!name || !email || !message) {
    return res.render('contact', { page: 'contact', ...data, sent: false, error: 'Please fill in your name, email and message.' });
  }

  db.prepare('INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)')
    .run(name.trim(), email.trim(), (subject || '').trim(), message.trim());

  res.render('contact', { page: 'contact', ...data, sent: true, error: null });
});

module.exports = router;
