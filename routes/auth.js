const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-this-secret';
const COOKIE_OPTIONS = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 };

router.post('/login', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password are required.' });

  const user = db.prepare(`SELECT * FROM users WHERE username = ? COLLATE NOCASE`).get(username);
  if (!user || user.status !== 'active' || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ success: false, message: 'Invalid username or password.' });
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  res.cookie('ca_session', token, COOKIE_OPTIONS);

  res.json({ success: true, user: { id: user.id, username: user.username, name: [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' '), email: user.email, phone: user.phone, role: user.role } });
});

router.post('/logout', (req, res) => {
  res.clearCookie('ca_session');
  res.json({ success: true, message: 'Logged out.' });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
