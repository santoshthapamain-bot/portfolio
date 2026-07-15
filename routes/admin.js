const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, redirectIfAuth } = require('../middleware/auth');

// ---------- Login ----------
router.get('/login', redirectIfAuth, (req, res) => {
  res.render('admin-login', { page: 'admin-login', error: null, notice: null });
});

router.post('/login', redirectIfAuth, (req, res) => {
  const { email, password } = req.body;
  const admin = db.prepare('SELECT * FROM admin WHERE email = ?').get((email || '').trim().toLowerCase());

  if (!admin || !bcrypt.compareSync(password || '', admin.password)) {
    return res.render('admin-login', { page: 'admin-login', error: 'Invalid email or password.', notice: null });
  }

  req.session.adminId = admin.id;
  req.session.adminEmail = admin.email;
  res.redirect('/admin/dashboard');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ---------- Forgot / reset password ----------
// Since no email/SMTP is configured, the reset link is shown directly on screen
// and printed to the server console. Wire up nodemailer in production to email it instead.
router.get('/forgot-password', redirectIfAuth, (req, res) => {
  res.render('admin-forgot', { page: 'admin-login', resetLink: null, error: null });
});

router.post('/forgot-password', redirectIfAuth, (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const admin = db.prepare('SELECT * FROM admin WHERE email = ?').get(email);

  if (!admin) {
    return res.render('admin-forgot', { page: 'admin-login', resetLink: null, error: 'No admin account found with that email.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 1000 * 60 * 30; // 30 minutes
  db.prepare('UPDATE admin SET reset_token = ?, reset_expires = ? WHERE id = ?').run(token, expires, admin.id);

  const resetLink = `${req.protocol}://${req.get('host')}/admin/reset-password/${token}`;
  console.log(`[password reset] Link for ${admin.email}: ${resetLink}`);

  res.render('admin-forgot', { page: 'admin-login', resetLink, error: null });
});

router.get('/reset-password/:token', redirectIfAuth, (req, res) => {
  const admin = db.prepare('SELECT * FROM admin WHERE reset_token = ?').get(req.params.token);
  if (!admin || !admin.reset_expires || admin.reset_expires < Date.now()) {
    return res.render('admin-reset', { page: 'admin-login', token: null, error: 'This reset link is invalid or has expired.' });
  }
  res.render('admin-reset', { page: 'admin-login', token: req.params.token, error: null });
});

router.post('/reset-password/:token', redirectIfAuth, (req, res) => {
  const admin = db.prepare('SELECT * FROM admin WHERE reset_token = ?').get(req.params.token);
  if (!admin || !admin.reset_expires || admin.reset_expires < Date.now()) {
    return res.render('admin-reset', { page: 'admin-login', token: null, error: 'This reset link is invalid or has expired.' });
  }

  const { password, confirm } = req.body;
  if (!password || password.length < 6) {
    return res.render('admin-reset', { page: 'admin-login', token: req.params.token, error: 'Password must be at least 6 characters.' });
  }
  if (password !== confirm) {
    return res.render('admin-reset', { page: 'admin-login', token: req.params.token, error: 'Passwords do not match.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE admin SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?').run(hash, admin.id);

  res.render('admin-login', { page: 'admin-login', error: null, notice: 'Password updated. You can now log in.' });
});

// ---------- Dashboard (SPA-ish shell, data loaded via /api) ----------
router.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', { page: 'dashboard', adminEmail: req.session.adminEmail });
});

module.exports = router;
