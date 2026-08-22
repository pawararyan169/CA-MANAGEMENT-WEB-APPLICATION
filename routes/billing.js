const express = require("express");
const crypto = require("crypto");

const db = require("../database/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/* =========================================================
   TASK BILLING FIELD MIGRATION
   The task screen already has a Billing option. This makes
   the database able to store it without deleting existing data.
========================================================= */

function ensureColumn(table, column, definition) {
    const columns = db
        .prepare(`PRAGMA table_info(${table})`)
        .all();

    if (!columns.some(item => item.name === column)) {
        db.prepare(
            `ALTER TABLE ${table}
             ADD COLUMN ${column} ${definition}`
        ).run();
    }
}

ensureColumn(
    "tasks",
    "billing",
    "TEXT DEFAULT 'non-billable'"
);

/* =========================================================
   BILLING TABLE
========================================================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS billing_records (
        id TEXT PRIMARY KEY,
        serial_number INTEGER NOT NULL UNIQUE,
        task_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        chargeable_amount REAL NOT NULL DEFAULT 0,
        receipt_date TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        payment_mode TEXT,
        advance_payment_date TEXT,
        advance_amount REAL NOT NULL DEFAULT 0,
        advance_payment_mode TEXT,
        balance REAL NOT NULL DEFAULT 0,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS
        idx_billing_records_task
    ON billing_records(task_id);

    CREATE INDEX IF NOT EXISTS
        idx_billing_records_client
    ON billing_records(client_id);

    CREATE INDEX IF NOT EXISTS
        idx_billing_records_receipt
    ON billing_records(receipt_date);
`);

/* =========================================================
   HELPERS
========================================================= */

function clean(value) {
    return String(value ?? "").trim();
}

function amount(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
}

function id() {
    return (
        "BIL-" +
        Date.now() +
        "-" +
        crypto.randomBytes(4).toString("hex")
    );
}

function fullName(row) {
    return [
        row.first_name,
        row.middle_name,
        row.last_name
    ]
        .filter(Boolean)
        .join(" ")
        .trim();
}

function nextSerial() {
    const row = db.prepare(`
        SELECT COALESCE(MAX(serial_number), 0) + 1 AS next_serial
        FROM billing_records
    `).get();

    return Number(row.next_serial || 1);
}

/* =========================================================
   COMPLETED + BILLABLE TASK CONDITION
========================================================= */

function completedBillableWhere() {
    return `
        (
            LOWER(COALESCE(t.status, '')) IN
            ('complete', 'completed')
        )
        AND
        LOWER(
            REPLACE(
                REPLACE(
                    COALESCE(t.billing, 'non-billable'),
                    '_',
                    '-'
                ),
                ' ',
                '-'
            )
        ) IN
        (
            'billable',
            'chargeable',
            'yes'
        )
    `;
}

/* =========================================================
   GET ELIGIBLE TASKS

   A task appears here only after:
   1. Status = Complete / Completed
   2. Billing = Billable / Chargeable / Yes
========================================================= */

router.get(
    "/billing/eligible-tasks",
    requireAuth,
    (req, res) => {
        try {
            const rows = db.prepare(`
                SELECT
                    t.id,
                    t.title,
                    t.client_id,
                    t.status,
                    t.billing,

                    TRIM(
                        COALESCE(c.first_name, '') ||
                        CASE
                            WHEN c.middle_name IS NOT NULL
                                 AND TRIM(c.middle_name) <> ''
                            THEN ' ' || c.middle_name
                            ELSE ''
                        END ||
                        CASE
                            WHEN c.last_name IS NOT NULL
                                 AND TRIM(c.last_name) <> ''
                            THEN ' ' || c.last_name
                            ELSE ''
                        END
                    ) AS client_name,

                    c.pan AS pan,

                    CASE
                        WHEN b.id IS NULL THEN 0
                        ELSE 1
                    END AS already_billed,

                    b.id AS billing_id

                FROM tasks t

                LEFT JOIN clients c
                    ON c.id = t.client_id

                LEFT JOIN billing_records b
                    ON b.task_id = t.id

                WHERE
                    ${completedBillableWhere()}

                ORDER BY
                    t.updated_at DESC,
                    t.created_at DESC
            `).all();

            return res.json({
                success: true,
                tasks: rows.map(row => ({
                    id: row.id,
                    title: row.title || "",
                    clientId: row.client_id || "",
                    clientName: row.client_name || "",
                    pan: row.pan || "",
                    status: row.status || "",
                    billing: row.billing || "",
                    alreadyBilled: Boolean(row.already_billed),
                    billingId: row.billing_id || null
                }))
            });

        } catch (error) {
            console.error(
                "Billing eligible task error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load completed billable tasks."
            });
        }
    }
);

/* =========================================================
   NEXT SERIAL
========================================================= */

router.get(
    "/billing/next-serial",
    requireAuth,
    (req, res) => {
        try {
            return res.json({
                success: true,
                serialNumber: nextSerial()
            });
        } catch (error) {
            console.error(
                "Billing serial error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to generate billing serial."
            });
        }
    }
);

/* =========================================================
   GET BILLING RECORDS

   Only records connected to completed + billable tasks
   are returned.
========================================================= */

router.get(
    "/billing",
    requireAuth,
    (req, res) => {
        try {
            const rows = db.prepare(`
                SELECT
                    b.*,

                    TRIM(
                        COALESCE(c.first_name, '') ||
                        CASE
                            WHEN c.middle_name IS NOT NULL
                                 AND TRIM(c.middle_name) <> ''
                            THEN ' ' || c.middle_name
                            ELSE ''
                        END ||
                        CASE
                            WHEN c.last_name IS NOT NULL
                                 AND TRIM(c.last_name) <> ''
                            THEN ' ' || c.last_name
                            ELSE ''
                        END
                    ) AS client_name,

                    c.pan AS pan,

                    t.title AS task_name,
                    t.status AS task_status,
                    t.billing AS task_billing

                FROM billing_records b

                INNER JOIN tasks t
                    ON t.id = b.task_id

                LEFT JOIN clients c
                    ON c.id = b.client_id

                WHERE
                    ${completedBillableWhere()}

                ORDER BY
                    b.receipt_date DESC,
                    b.serial_number DESC
            `).all();

            return res.json({
                success: true,
                records: rows.map(row => ({
                    id: row.id,
                    serialNumber: row.serial_number,
                    taskId: row.task_id,
                    clientId: row.client_id,
                    clientName: row.client_name || "",
                    pan: row.pan || "",
                    taskName: row.task_name || "",
                    chargeableAmount:
                        Number(row.chargeable_amount || 0),
                    receiptDate:
                        row.receipt_date || "",
                    amount:
                        Number(row.amount || 0),
                    paymentMode:
                        row.payment_mode || null,
                    advancePaymentDate:
                        row.advance_payment_date || null,
                    advanceAmount:
                        Number(row.advance_amount || 0),
                    advancePaymentMode:
                        row.advance_payment_mode || null,
                    balance:
                        Number(row.balance || 0)
                }))
            });

        } catch (error) {
            console.error(
                "Get billing records error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load billing records."
            });
        }
    }
);

/* =========================================================
   GET ONE BILLING RECORD
========================================================= */

router.get(
    "/billing/:id",
    requireAuth,
    (req, res) => {
        try {
            const row = db.prepare(`
                SELECT
                    b.*,

                    TRIM(
                        COALESCE(c.first_name, '') ||
                        CASE
                            WHEN c.middle_name IS NOT NULL
                                 AND TRIM(c.middle_name) <> ''
                            THEN ' ' || c.middle_name
                            ELSE ''
                        END ||
                        CASE
                            WHEN c.last_name IS NOT NULL
                                 AND TRIM(c.last_name) <> ''
                            THEN ' ' || c.last_name
                            ELSE ''
                        END
                    ) AS client_name,

                    c.pan AS pan,
                    t.title AS task_name

                FROM billing_records b

                INNER JOIN tasks t
                    ON t.id = b.task_id

                LEFT JOIN clients c
                    ON c.id = b.client_id

                WHERE
                    b.id = ?
                    AND ${completedBillableWhere()}
            `).get(req.params.id);

            if (!row) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Billing record not found."
                });
            }

            return res.json({
                success: true,
                record: {
                    id: row.id,
                    serialNumber: row.serial_number,
                    taskId: row.task_id,
                    clientId: row.client_id,
                    clientName: row.client_name || "",
                    pan: row.pan || "",
                    taskName: row.task_name || "",
                    chargeableAmount:
                        Number(row.chargeable_amount || 0),
                    receiptDate:
                        row.receipt_date || "",
                    amount:
                        Number(row.amount || 0),
                    paymentMode:
                        row.payment_mode || null,
                    advancePaymentDate:
                        row.advance_payment_date || null,
                    advanceAmount:
                        Number(row.advance_amount || 0),
                    advancePaymentMode:
                        row.advance_payment_mode || null,
                    balance:
                        Number(row.balance || 0)
                }
            });

        } catch (error) {
            console.error(
                "Get billing record error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load billing record."
            });
        }
    }
);

/* =========================================================
   VALIDATE BILLING INPUT
========================================================= */

function validateBillingInput(body, currentId = null) {
    const taskId = clean(body.taskId);
    const chargeableAmount =
        amount(body.chargeableAmount);
    const receiptDate =
        clean(body.receiptDate);

    const receivedAmount =
        amount(body.amount);

    const advanceAmount =
        amount(body.advanceAmount);

    const paymentMode =
        clean(body.paymentMode);

    const advancePaymentDate =
        clean(body.advancePaymentDate);

    const advancePaymentMode =
        clean(body.advancePaymentMode);

    if (!taskId) {
        return {
            error:
                "A completed billable task is required."
        };
    }

    if (!receiptDate) {
        return {
            error:
                "Date of receipt is required."
        };
    }

    if (chargeableAmount <= 0) {
        return {
            error:
                "Chargeable amount must be greater than zero."
        };
    }

    if (
        receivedAmount +
        advanceAmount >
        chargeableAmount
    ) {
        return {
            error:
                "Amount received plus advance cannot exceed the chargeable amount."
        };
    }

    if (
        receivedAmount > 0 &&
        !["online", "cash"].includes(paymentMode)
    ) {
        return {
            error:
                "Select Online or Cash for the payment mode."
        };
    }

    if (advanceAmount > 0) {
        if (!advancePaymentDate) {
            return {
                error:
                    "Advance payment date is required."
            };
        }

        if (
            !["online", "cash"]
                .includes(advancePaymentMode)
        ) {
            return {
                error:
                    "Select Online or Cash for advance payment mode."
            };
        }
    }

    const task = db.prepare(`
        SELECT
            t.id,
            t.client_id,
            t.title,
            t.status,
            t.billing
        FROM tasks t
        WHERE t.id = ?
          AND ${completedBillableWhere()}
    `).get(taskId);

    if (!task) {
        return {
            error:
                "The selected task is not both Complete and Billable."
        };
    }

    const client = db.prepare(`
        SELECT id
        FROM clients
        WHERE id = ?
    `).get(task.client_id);

    if (!client) {
        return {
            error:
                "The client linked to this task does not exist."
        };
    }

    const duplicate = db.prepare(`
        SELECT id
        FROM billing_records
        WHERE task_id = ?
          AND id <> ?
    `).get(
        taskId,
        currentId || ""
    );

    if (duplicate) {
        return {
            error:
                "This completed billable task already has a billing record."
        };
    }

    const balance = Math.max(
        0,
        chargeableAmount -
        receivedAmount -
        advanceAmount
    );

    return {
        task,
        client,
        values: {
            taskId,
            clientId: task.client_id,
            chargeableAmount,
            receiptDate,
            amount: receivedAmount,
            paymentMode:
                receivedAmount > 0
                    ? paymentMode
                    : null,
            advancePaymentDate:
                advanceAmount > 0
                    ? advancePaymentDate
                    : null,
            advanceAmount,
            advancePaymentMode:
                advanceAmount > 0
                    ? advancePaymentMode
                    : null,
            balance
        }
    };
}

/* =========================================================
   CREATE BILLING RECORD
========================================================= */

router.post(
    "/billing",
    requireAuth,
    (req, res) => {
        try {
            const validation =
                validateBillingInput(
                    req.body || {}
                );

            if (validation.error) {
                return res.status(400).json({
                    success: false,
                    message: validation.error
                });
            }

            const values =
                validation.values;

            const recordId =
                id();

            const serial =
                nextSerial();

            const now =
                new Date().toISOString();

            db.prepare(`
                INSERT INTO billing_records (
                    id,
                    serial_number,
                    task_id,
                    client_id,
                    chargeable_amount,
                    receipt_date,
                    amount,
                    payment_mode,
                    advance_payment_date,
                    advance_amount,
                    advance_payment_mode,
                    balance,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            `).run(
                recordId,
                serial,
                values.taskId,
                values.clientId,
                values.chargeableAmount,
                values.receiptDate,
                values.amount,
                values.paymentMode,
                values.advancePaymentDate,
                values.advanceAmount,
                values.advancePaymentMode,
                values.balance,
                req.user.id,
                now,
                now
            );

            return res.status(201).json({
                success: true,
                message:
                    "Billing record created successfully.",
                id: recordId,
                serialNumber: serial
            });

        } catch (error) {
            console.error(
                "Create billing record error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to create billing record."
            });
        }
    }
);

/* =========================================================
   UPDATE BILLING RECORD
========================================================= */

router.put(
    "/billing/:id",
    requireAuth,
    (req, res) => {
        try {
            const existing = db.prepare(`
                SELECT id
                FROM billing_records
                WHERE id = ?
            `).get(req.params.id);

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Billing record not found."
                });
            }

            const validation =
                validateBillingInput(
                    req.body || {},
                    req.params.id
                );

            if (validation.error) {
                return res.status(400).json({
                    success: false,
                    message: validation.error
                });
            }

            const values =
                validation.values;

            db.prepare(`
                UPDATE billing_records
                SET
                    task_id = ?,
                    client_id = ?,
                    chargeable_amount = ?,
                    receipt_date = ?,
                    amount = ?,
                    payment_mode = ?,
                    advance_payment_date = ?,
                    advance_amount = ?,
                    advance_payment_mode = ?,
                    balance = ?,
                    updated_at = ?
                WHERE id = ?
            `).run(
                values.taskId,
                values.clientId,
                values.chargeableAmount,
                values.receiptDate,
                values.amount,
                values.paymentMode,
                values.advancePaymentDate,
                values.advanceAmount,
                values.advancePaymentMode,
                values.balance,
                new Date().toISOString(),
                req.params.id
            );

            return res.json({
                success: true,
                message:
                    "Billing record updated successfully."
            });

        } catch (error) {
            console.error(
                "Update billing record error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to update billing record."
            });
        }
    }
);

module.exports = router;
