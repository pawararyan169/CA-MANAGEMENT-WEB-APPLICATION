const express = require('express');
const db = require('../database/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function safeCount(sql, params = []) {
    try {
        const row = db.prepare(sql).get(...params);
        return Number(row?.count || 0);
    } catch (error) {
        console.error('Dashboard stats query error:', error.message);
        return 0;
    }
}

router.get('/dashboard/stats', requireAuth, (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';

        const activeClients = safeCount(`
            SELECT COUNT(*) AS count
            FROM clients
            WHERE COALESCE(status, 'active') = 'active'
        `);

        const employees = safeCount(`
            SELECT COUNT(*) AS count
            FROM users
            WHERE role = 'employee' AND status = 'active'
        `);

        const taskScope = isAdmin
            ? ''
            : ' AND assigned_employee_id = ?';
        const taskParams = isAdmin ? [] : [req.user.id];

        const totalTasks = safeCount(`
            SELECT COUNT(*) AS count
            FROM office_tasks
            WHERE 1=1${taskScope}
        `, taskParams);

        const completedTasks = safeCount(`
            SELECT COUNT(*) AS count
            FROM office_tasks
            WHERE status = 'completed'${taskScope}
        `, taskParams);

        const pendingTasks = safeCount(`
            SELECT COUNT(*) AS count
            FROM office_tasks
            WHERE status <> 'completed'${taskScope}
        `, taskParams);

        const registrations = {
            cin: safeCount(`SELECT COUNT(*) AS count FROM clients WHERE COALESCE(status, 'active') = 'active' AND TRIM(COALESCE(cin, '')) <> ''`),
            fssai: safeCount(`SELECT COUNT(*) AS count FROM clients WHERE COALESCE(status, 'active') = 'active' AND TRIM(COALESCE(fssai, '')) <> ''`),
            gst: safeCount(`SELECT COUNT(*) AS count FROM clients WHERE COALESCE(status, 'active') = 'active' AND TRIM(COALESCE(gst, '')) <> ''`),
            udyam: safeCount(`SELECT COUNT(*) AS count FROM clients WHERE COALESCE(status, 'active') = 'active' AND TRIM(COALESCE(udyam, '')) <> ''`),
            ptec: safeCount(`SELECT COUNT(*) AS count FROM clients WHERE COALESCE(status, 'active') = 'active' AND TRIM(COALESCE(ptec, '')) <> ''`),
            ptrc: safeCount(`SELECT COUNT(*) AS count FROM clients WHERE COALESCE(status, 'active') = 'active' AND TRIM(COALESCE(ptrc, '')) <> ''`),
            tan: safeCount(`SELECT COUNT(*) AS count FROM clients WHERE COALESCE(status, 'active') = 'active' AND TRIM(COALESCE(tan, '')) <> ''`)
        };

        res.json({
            success: true,
            role: req.user.role,
            counts: {
                employees,
                clients: activeClients,
                tasks: isAdmin ? pendingTasks : totalTasks,
                completedTasks,
                pendingTasks,
                ...registrations
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to load dashboard statistics.'
        });
    }
});

module.exports = router;
