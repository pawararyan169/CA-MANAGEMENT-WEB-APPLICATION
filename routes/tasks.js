const express = require('express');
const crypto = require('crypto');

const db = require('../database/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/* =========================================================
   TASK REGISTER
   Historical records are never deleted by monthly reset.
   The UI defaults to the current month; previous months remain
   available through the date filter.
========================================================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS office_tasks (

        id TEXT PRIMARY KEY,

        task_name TEXT NOT NULL,

        client_id TEXT,

        work_type TEXT NOT NULL
            CHECK (work_type IN ('office', 'miscellaneous')),

        assigned_date TEXT NOT NULL,

        completion_date TEXT,

        billable INTEGER NOT NULL DEFAULT 0,

        status TEXT NOT NULL DEFAULT 'incomplete'
            CHECK (status IN ('incomplete', 'wip', 'completed')),

        assigned_by TEXT NOT NULL,

        created_at TEXT NOT NULL,

        updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_office_tasks_assigned_date
        ON office_tasks(assigned_date);

    CREATE INDEX IF NOT EXISTS idx_office_tasks_client
        ON office_tasks(client_id);

    CREATE INDEX IF NOT EXISTS idx_office_tasks_status
        ON office_tasks(status);

    CREATE INDEX IF NOT EXISTS idx_office_tasks_assigned_by
        ON office_tasks(assigned_by);
`);


try {
    const taskColumns =
        db.prepare(`PRAGMA table_info(office_tasks)`).all();

    if (
        !taskColumns.some(
            column => column.name === 'assigned_employee_id'
        )
    ) {
        db.exec(`
            ALTER TABLE office_tasks
            ADD COLUMN assigned_employee_id TEXT
        `);
    }

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_office_tasks_assigned_employee
            ON office_tasks(assigned_employee_id);
    `);
} catch (migrationError) {
    console.error(
        'Task assigned employee migration error:',
        migrationError
    );
}

function clean(value) {
    return String(value ?? '').trim();
}


function generateId() {
    return `TASK${Date.now()}${crypto.randomInt(1000, 9999)}`;
}


function displayName(first, middle, last) {
    return [
        first,
        middle,
        last
    ].filter(Boolean).join(' ').trim();
}


function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}


function calculateDays(assignedDate, completionDate, status) {

    if (!assignedDate || !validDate(assignedDate)) {
        return 0;
    }

    const start =
        new Date(`${assignedDate}T00:00:00`);

    let end;

    if (
        status === 'completed' &&
        completionDate &&
        validDate(completionDate)
    ) {
        end =
            new Date(`${completionDate}T00:00:00`);
    } else {
        end = new Date();
    }

    const diff =
        end.getTime() - start.getTime();

    return Math.max(
        0,
        Math.floor(diff / (24 * 60 * 60 * 1000))
    );
}


function taskQuery() {

    return `
        SELECT
            t.*,

            TRIM(
                COALESCE(c.first_name, '') ||
                CASE
                    WHEN c.middle_name IS NOT NULL
                         AND c.middle_name != ''
                    THEN ' ' || c.middle_name
                    ELSE ''
                END ||
                CASE
                    WHEN c.last_name IS NOT NULL
                         AND c.last_name != ''
                    THEN ' ' || c.last_name
                    ELSE ''
                END
            ) AS client_name,

            c.pan AS client_pan,

            TRIM(
                COALESCE(u.first_name, '') ||
                CASE
                    WHEN u.middle_name IS NOT NULL
                         AND u.middle_name != ''
                    THEN ' ' || u.middle_name
                    ELSE ''
                END ||
                CASE
                    WHEN u.last_name IS NOT NULL
                         AND u.last_name != ''
                    THEN ' ' || u.last_name
                    ELSE ''
                END
            ) AS assigned_by_name,

            TRIM(
                COALESCE(ae.first_name, '') ||
                CASE
                    WHEN ae.middle_name IS NOT NULL
                         AND ae.middle_name != ''
                    THEN ' ' || ae.middle_name
                    ELSE ''
                END ||
                CASE
                    WHEN ae.last_name IS NOT NULL
                         AND ae.last_name != ''
                    THEN ' ' || ae.last_name
                    ELSE ''
                END
            ) AS assigned_employee_name

        FROM office_tasks t

        LEFT JOIN clients c
            ON c.id = t.client_id

        LEFT JOIN users u
            ON u.id = t.assigned_by

        LEFT JOIN users ae
            ON ae.id = t.assigned_employee_id
    `;
}


function mapTask(row) {

    return {
        id: row.id,
        taskName: row.task_name || '',
        clientId: row.client_id || '',
        clientName: row.client_name || '',
        clientPan: row.client_pan || '',
        workType: row.work_type || '',
        assignedDate: row.assigned_date || '',
        completionDate: row.completion_date || '',
        billable: Boolean(row.billable),
        status: row.status || 'incomplete',
        assignedBy: row.assigned_by || '',
        assignedByName: row.assigned_by_name || 'Unknown',
        assignedEmployeeId: row.assigned_employee_id || '',
        assignedEmployeeName: row.assigned_employee_name || '',
        numberOfDays:
            calculateDays(
                row.assigned_date,
                row.completion_date,
                row.status
            ),
        createdAt: row.created_at || '',
        updatedAt: row.updated_at || ''
    };
}


/* =========================================================
   CLIENTS
========================================================= */

router.get(
    '/tasks/clients',
    requireAuth,
    (req, res) => {

        try {

            const rows = db.prepare(`
                SELECT
                    id,
                    first_name,
                    middle_name,
                    last_name,
                    pan
                FROM clients
                WHERE status = 'active'
                ORDER BY first_name COLLATE NOCASE,
                         last_name COLLATE NOCASE
            `).all();

            return res.json({
                success: true,
                clients: rows.map(row => ({
                    id: row.id,
                    name: displayName(
                        row.first_name,
                        row.middle_name,
                        row.last_name
                    ),
                    pan: row.pan || ''
                }))
            });

        } catch (error) {

            console.error('Task clients error:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to load clients.'
            });
        }
    }
);


/* =========================================================
   EMPLOYEES AVAILABLE FOR TASK ASSIGNMENT
========================================================= */

router.get(
    '/tasks/employees',
    requireAuth,
    (req, res) => {

        try {

            const rows = db.prepare(`
                SELECT
                    id,
                    first_name,
                    middle_name,
                    last_name,
                    username,
                    role
                FROM users
                WHERE
                    status = 'active'
                    AND role = 'employee'
                ORDER BY
                    first_name COLLATE NOCASE,
                    last_name COLLATE NOCASE
            `).all();

            return res.json({
                success: true,
                employees: rows.map(row => ({
                    id: row.id,
                    name:
                        displayName(
                            row.first_name,
                            row.middle_name,
                            row.last_name
                        ) ||
                        row.username ||
                        'Employee'
                }))
            });

        } catch (error) {

            console.error(
                'Task employees error:',
                error
            );

            return res.status(500).json({
                success: false,
                message: 'Unable to load employees.'
            });
        }
    }
);


/* =========================================================
   LIST TASKS
========================================================= */

router.get(
    '/tasks',
    requireAuth,
    (req, res) => {

        try {

            const rows =
                db.prepare(`
                    ${taskQuery()}
                    ORDER BY
                        t.assigned_date DESC,
                        t.created_at DESC
                `).all();

            return res.json({
                success: true,
                tasks: rows.map(mapTask)
            });

        } catch (error) {

            console.error('Load tasks error:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to load tasks.'
            });
        }
    }
);


/* =========================================================
   CREATE TASK
========================================================= */

router.post(
    '/tasks',
    requireAuth,
    (req, res) => {

        try {

            const body = req.body || {};

            const taskName =
                clean(body.taskName);

            const workType =
                clean(body.workType).toLowerCase();

            const clientId =
                clean(body.clientId);

            const assignedEmployeeId =
                clean(body.assignedEmployeeId);

            const assignedDate =
                clean(body.assignedDate);

            const completionDate =
                clean(body.completionDate);

            const billable =
                Boolean(body.billable);

            let status =
                clean(body.status).toLowerCase();

            if (!['office', 'miscellaneous'].includes(workType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select Office Work or Miscellaneous.'
                });
            }

            if (!taskName) {
                return res.status(400).json({
                    success: false,
                    message: 'Task / work description is required.'
                });
            }

            if (!assignedEmployeeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select the employee assigned to this task.'
                });
            }

            const assignedEmployee =
                db.prepare(`
                    SELECT id
                    FROM users
                    WHERE
                        id = ?
                        AND LOWER(role) = 'employee'
                        AND LOWER(status) = 'active'
                    LIMIT 1
                `).get(assignedEmployeeId);

            if (!assignedEmployee) {
                return res.status(400).json({
                    success: false,
                    message: 'Selected employee is not available.'
                });
            }

            if (!assignedDate || !validDate(assignedDate)) {
                return res.status(400).json({
                    success: false,
                    message: 'A valid date of assigning is required.'
                });
            }

            if (!['wip', 'completed'].includes(status)) {
                status = 'wip';
            }

            /*
             * Miscellaneous tasks must never contain a client.
             */
            const finalClientId =
                workType === 'miscellaneous'
                    ? null
                    : clientId || null;

            if (
                workType === 'office' &&
                !finalClientId
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select a client for Office Work.'
                });
            }

            if (
                finalClientId
            ) {

                const client =
                    db.prepare(`
                        SELECT id
                        FROM clients
                        WHERE
                            id = ?
                            AND status = 'active'
                        LIMIT 1
                    `).get(finalClientId);

                if (!client) {
                    return res.status(400).json({
                        success: false,
                        message: 'Selected client is not available.'
                    });
                }
            }

            if (
                completionDate &&
                !validDate(completionDate)
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid completion date.'
                });
            }

            if (
                completionDate &&
                completionDate < assignedDate
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Date of completion cannot be earlier than date of assigning.'
                });
            }

            /*
             * Status intentionally has only W.I.P and Incomplete.
             * Completion date remains an optional data field and does not
             * create a third status.
             */

            const now =
                new Date().toISOString();

            const id =
                generateId();

            db.prepare(`
                INSERT INTO office_tasks (
                    id,
                    task_name,
                    client_id,
                    assigned_employee_id,
                    work_type,
                    assigned_date,
                    completion_date,
                    billable,
                    status,
                    assigned_by,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                id,
                taskName,
                finalClientId,
                assignedEmployeeId,
                workType,
                assignedDate,
                completionDate || null,
                billable ? 1 : 0,
                status,
                req.user.id,
                now,
                now
            );

            const created =
                db.prepare(`
                    ${taskQuery()}
                    WHERE t.id = ?
                    LIMIT 1
                `).get(id);

            return res.status(201).json({
                success: true,
                message: 'Task created successfully.',
                task: mapTask(created)
            });

        } catch (error) {

            console.error('Create task error:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to create task.'
            });
        }
    }
);


/* =========================================================
   UPDATE TASK
========================================================= */

router.patch(
    '/tasks/:id',
    requireAuth,
    (req, res) => {

        try {

            const id =
                clean(req.params.id);

            const existing =
                db.prepare(`
                    SELECT *
                    FROM office_tasks
                    WHERE id = ?
                    LIMIT 1
                `).get(id);

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found.'
                });
            }

            const body = req.body || {};

            const taskName =
                clean(
                    body.taskName ??
                    existing.task_name
                );

            const workType =
                clean(
                    body.workType ??
                    existing.work_type
                ).toLowerCase();

            const assignedDate =
                clean(
                    body.assignedDate ??
                    existing.assigned_date
                );

            const completionDate =
                clean(
                    body.completionDate ??
                    existing.completion_date ??
                    ''
                );

            const billable =
                body.billable === undefined
                    ? Boolean(existing.billable)
                    : Boolean(body.billable);

            let status =
                clean(
                    body.status ??
                    existing.status
                ).toLowerCase();

            const clientId =
                clean(
                    body.clientId ??
                    existing.client_id ??
                    ''
                );

            const assignedEmployeeId =
                clean(
                    body.assignedEmployeeId ??
                    existing.assigned_employee_id ??
                    ''
                );

            if (!taskName) {
                return res.status(400).json({
                    success: false,
                    message: 'Task / work description is required.'
                });
            }

            if (!['office', 'miscellaneous'].includes(workType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid work type.'
                });
            }

            if (!validDate(assignedDate)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid date of assigning.'
                });
            }

            if (
                completionDate &&
                !validDate(completionDate)
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid completion date.'
                });
            }

            if (
                completionDate &&
                completionDate < assignedDate
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Date of completion cannot be earlier than date of assigning.'
                });
            }

            if (!['wip', 'completed'].includes(status)) {
                status = 'wip';
            }

            const assignedEmployee =
                db.prepare(`
                    SELECT id
                    FROM users
                    WHERE
                        id = ?
                        AND LOWER(role) = 'employee'
                        AND LOWER(status) = 'active'
                    LIMIT 1
                `).get(assignedEmployeeId);

            if (!assignedEmployee) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select a valid employee for this task.'
                });
            }

            if (workType === 'miscellaneous') {
                /* Client is intentionally forced empty. */
            } else if (!clientId) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select a client for Office Work.'
                });
            }

            db.prepare(`
                UPDATE office_tasks
                SET
                    task_name = ?,
                    client_id = ?,
                    assigned_employee_id = ?,
                    work_type = ?,
                    assigned_date = ?,
                    completion_date = ?,
                    billable = ?,
                    status = ?,
                    updated_at = ?
                WHERE id = ?
            `).run(
                taskName,
                workType === 'miscellaneous'
                    ? null
                    : clientId || null,
                assignedEmployeeId,
                workType,
                assignedDate,
                completionDate || null,
                billable ? 1 : 0,
                status,
                new Date().toISOString(),
                id
            );

            const updated =
                db.prepare(`
                    ${taskQuery()}
                    WHERE t.id = ?
                    LIMIT 1
                `).get(id);

            return res.json({
                success: true,
                message: 'Task updated successfully.',
                task: mapTask(updated)
            });

        } catch (error) {

            console.error('Update task error:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to update task.'
            });
        }
    }
);

module.exports = router;
