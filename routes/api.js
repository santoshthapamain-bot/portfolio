const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db/database');
const upload = require('../utils/upload');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

const ok = (res, data = {}) => res.json({ success: true, ...data });
const fail = (res, message, code = 400) => res.status(code).json({ success: false, message });

/* ================= PROFILE ================= */
router.get('/profile', (req, res) => {
  ok(res, { profile: db.prepare('SELECT * FROM profile WHERE id = 1').get() });
});

router.put('/profile', upload.single('profile_photo'), (req, res) => {
  const { name, role, bio, resume_link } = req.body;
  const current = db.prepare('SELECT * FROM profile WHERE id = 1').get();
  const profile_photo = req.file ? `/uploads/${req.file.filename}` : current.profile_photo;

  db.prepare(`UPDATE profile SET name = ?, role = ?, bio = ?, profile_photo = ?, resume_link = ? WHERE id = 1`)
    .run(name || current.name, role || current.role, bio || current.bio, profile_photo, resume_link || current.resume_link);

  ok(res, { profile: db.prepare('SELECT * FROM profile WHERE id = 1').get() });
});

router.put('/change-password', (req, res) => {
  const { current_password, new_password } = req.body;
  const admin = db.prepare('SELECT * FROM admin WHERE id = ?').get(req.session.adminId);

  if (!bcrypt.compareSync(current_password || '', admin.password)) {
    return fail(res, 'Current password is incorrect.');
  }
  if (!new_password || new_password.length < 6) {
    return fail(res, 'New password must be at least 6 characters.');
  }
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE admin SET password = ? WHERE id = ?').run(hash, admin.id);
  ok(res);
});

/* ================= HERO PHOTOS ================= */
router.get('/hero-photos', (req, res) => {
  ok(res, { items: db.prepare('SELECT * FROM hero_photos ORDER BY sort_order ASC, id ASC').all() });
});

router.post('/hero-photos', upload.single('image'), (req, res) => {
  if (!req.file) return fail(res, 'An image file is required.');
  const image = `/uploads/${req.file.filename}`;
  const info = db.prepare('INSERT INTO hero_photos (image) VALUES (?)').run(image);
  ok(res, { item: db.prepare('SELECT * FROM hero_photos WHERE id = ?').get(info.lastInsertRowid) });
});

router.delete('/hero-photos/:id', (req, res) => {
  db.prepare('DELETE FROM hero_photos WHERE id = ?').run(req.params.id);
  ok(res);
});

/* ================= Generic CRUD factory for simple tables ================= */
function registerCrud({ path: routePath, table, fields, hasImage }) {
  router.get(`/${routePath}`, (req, res) => {
    ok(res, { items: db.prepare(`SELECT * FROM ${table} ORDER BY sort_order ASC, id ASC`).all() });
  });

  const middlewares = hasImage ? [upload.single('image')] : [];

  router.post(`/${routePath}`, ...middlewares, (req, res) => {
    const cols = [...fields];
    const placeholders = cols.map(() => '?').join(', ');
    const values = cols.map((f) => {
      if (f === 'image' && hasImage) return req.file ? `/uploads/${req.file.filename}` : (req.body.image || '');
      return req.body[f] ?? '';
    });
    const info = db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`).run(...values);
    ok(res, { item: db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(info.lastInsertRowid) });
  });

  router.put(`/${routePath}/:id`, ...middlewares, (req, res) => {
    const current = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    if (!current) return fail(res, 'Not found', 404);

    const cols = [...fields];
    const setClause = cols.map((f) => `${f} = ?`).join(', ');
    const values = cols.map((f) => {
      if (f === 'image' && hasImage) return req.file ? `/uploads/${req.file.filename}` : (req.body.image ?? current.image);
      return req.body[f] ?? current[f];
    });
    db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`).run(...values, req.params.id);
    ok(res, { item: db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id) });
  });

  router.delete(`/${routePath}/:id`, (req, res) => {
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
    ok(res);
  });
}

registerCrud({ path: 'skills', table: 'skills', fields: ['title', 'image', 'sort_order'], hasImage: true });
registerCrud({ path: 'education', table: 'education', fields: ['degree', 'institution', 'year', 'description', 'sort_order'], hasImage: false });
registerCrud({ path: 'hobbies', table: 'hobbies', fields: ['title', 'icon', 'sort_order'], hasImage: false });
registerCrud({ path: 'trainings', table: 'trainings', fields: ['title', 'organization', 'year', 'description', 'sort_order'], hasImage: false });
registerCrud({ path: 'projects', table: 'projects', fields: ['title', 'description', 'image', 'link', 'tags', 'sort_order'], hasImage: true });
registerCrud({ path: 'social-links', table: 'social_links', fields: ['platform', 'url', 'icon', 'sort_order'], hasImage: false });

/* ================= CONTACT INFO ================= */
router.get('/contact-info', (req, res) => {
  ok(res, { info: db.prepare('SELECT * FROM contact_info WHERE id = 1').get() });
});

router.put('/contact-info', (req, res) => {
  const { email, phone, address } = req.body;
  db.prepare('UPDATE contact_info SET email = ?, phone = ?, address = ? WHERE id = 1').run(email || '', phone || '', address || '');
  ok(res, { info: db.prepare('SELECT * FROM contact_info WHERE id = 1').get() });
});

/* ================= MESSAGES (contact form responses) ================= */
router.get('/messages', (req, res) => {
  ok(res, { items: db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all() });
});

router.put('/messages/:id/read', (req, res) => {
  db.prepare('UPDATE messages SET is_read = 1 WHERE id = ?').run(req.params.id);
  ok(res);
});

router.delete('/messages/:id', (req, res) => {
  db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
  ok(res);
});

module.exports = router;
