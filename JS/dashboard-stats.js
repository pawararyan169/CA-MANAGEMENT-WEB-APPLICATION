const express = require('express');
const db = require('../database/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/* =========================================================
   LIVE DASHBOARD STATISTICS
   Shared by Admin + Employee dashboards.
   Counts are calculated directly from the current database,
   so every request reflects the latest saved records.
========================================================= */

function countRegistration(column) {
    const allowed = new Set([
        'cin', 'fssai', 'gst', 'udyam', 'ptec', 'ptrc', 'tan'
    ]);

    if (!allowed.has(column)) return 0;

    const row = db.prepare(`
        SELECT COUNT(*) AS count
        FROM clients
        WHERE status = 'active'
          AND ${column} IS NOT NULL
          AND TRIM(${column}) <> ''
    `).get();

    return Number(row?.count || 0);
}

router.get('/dashboard/stats', requireAuth, (req, res) => {
    try {
        const activeClients = Number(db.prepare(`
            SELECT COUNT(*) AS count
            FROM clients
            WHERE status = 'active'
        `).get()?.count || 0);

        const activeEmployees = Number(db.prepare(`
            SELECT COUNT(*) AS count
            FROM users
            WHERE role = 'employee'
              AND status = 'active'
        `).get()?.count || 0);

        let totalTasks = 0;
        let pendingTasks = 0;
        let completedTasks = 0;

        if (req.user.role === 'employee') {
            const taskRows = db.prepare(`
                SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN completion_date IS NULL OR TRIM(completion_date) = '' THEN 1 ELSE 0 END) AS pending,
                    SUM(CASE WHEN completion_date IS NOT NULL AND TRIM(completion_date) <> '' THEN 1 ELSE 0 END) AS completed
                FROM office_tasks
                WHERE assigned_employee_id = ?
            `).get(req.user.id);

            totalTasks = Number(taskRows?.total || 0);
            pendingTasks = Number(taskRows?.pending || 0);
            completedTasks = Number(taskRows?.completed || 0);
        } else {
            const taskRows = db.prepare(`
                SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN completion_date IS NULL OR TRIM(completion_date) = '' THEN 1 ELSE 0 END) AS pending,
                    SUM(CASE WHEN completion_date IS NOT NULL AND TRIM(completion_date) <> '' THEN 1 ELSE 0 END) AS completed
                FROM office_tasks
            `).get();

            totalTasks = Number(taskRows?.total || 0);
            pendingTasks = Number(taskRows?.pending || 0);
            completedTasks = Number(taskRows?.completed || 0);
        }

        return res.json({
            success: true,
            role: req.user.role,
            stats: {
                activeClients,
                activeEmployees,
                totalTasks,
                pendingTasks,
                completedTasks,
                registrations: {
                    cin: countRegistration('cin'),
                    fssai: countRegistration('fssai'),
                    gst: countRegistration('gst'),
                    udyam: countRegistration('udyam'),
                    ptec: countRegistration('ptec'),
                    ptrc: countRegistration('ptrc'),
                    tan: countRegistration('tan')
                },
                updatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to load live dashboard statistics.'
        });
    }
});

module.exports = router;
