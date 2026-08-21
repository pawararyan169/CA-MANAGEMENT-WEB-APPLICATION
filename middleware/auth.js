const jwt = require('jsonwebtoken');
const db = require('../database/database');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-this-secret';

function requireAuth(req, res, next) {
  const token = req.cookies?.ca_session;
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required.' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare(`SELECT id, username, first_name, middle_name, last_name, email, phone, role, status FROM users WHERE id = ?`).get(payload.sub);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Your session is no longer valid.' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired session.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
