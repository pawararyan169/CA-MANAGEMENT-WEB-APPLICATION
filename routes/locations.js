const express = require('express');
const crypto = require('crypto');
const db = require('../database/database');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const id = () => `LOC${Date.now()}${crypto.randomInt(1000, 9999)}`;
const clean = v => String(v || '').trim();

router.get('/locations', requireAuth, (req, res) => {
  const locations = db.prepare(`SELECT id, name, city, state, country, status, created_at AS createdAt FROM locations WHERE status = 'active' ORDER BY name`).all();
  res.json({ success: true, locations });
});

router.get('/admin/locations', requireAuth, requireRole('admin'), (req, res) => {
  const locations = db.prepare(`SELECT l.id, l.name, l.city, l.state, l.country, l.status, l.created_at AS createdAt, COUNT(c.id) AS clientCount FROM locations l LEFT JOIN clients c ON c.location_id = l.id AND c.status = 'active' GROUP BY l.id ORDER BY l.name`).all();
  res.json({ success: true, locations });
});

router.post('/admin/locations', requireAuth, requireRole('admin'), (req, res) => {
  const name = clean(req.body.name);
  const city = clean(req.body.city);
  const state = clean(req.body.state);
  const country = clean(req.body.country) || 'India';
  if (!name || !city || !state) return res.status(400).json({ success: false, message: 'Location name, city and state are required.' });
  try {
    const locationId = id();
    db.prepare(`INSERT INTO locations (id, name, city, state, country, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(locationId, name, city, state, country, new Date().toISOString(), req.user.id);
    res.status(201).json({ success: true, message: 'Location created.', location: { id: locationId, name, city, state, country, status: 'active' } });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ success: false, message: 'That location already exists.' });
    throw e;
  }
});

router.put('/admin/locations/:id', requireAuth, requireRole('admin'), (req, res) => {
  const name = clean(req.body.name);
  const city = clean(req.body.city);
  const state = clean(req.body.state);
  const country = clean(req.body.country) || 'India';
  const status = req.body.status === 'inactive' ? 'inactive' : 'active';
  if (!name || !city || !state) return res.status(400).json({ success: false, message: 'Location name, city and state are required.' });
  const result = db.prepare(`UPDATE locations SET name = ?, city = ?, state = ?, country = ?, status = ? WHERE id = ?`).run(name, city, state, country, status, req.params.id);
  if (!result.changes) return res.status(404).json({ success: false, message: 'Location not found.' });
  res.json({ success: true, message: 'Location updated.' });
});

module.exports = router;
