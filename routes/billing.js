const express = require("express");
const router = express.Router();

const db = require("../database/database");
const { requireAuth } = require("../middleware/auth");

const clean = v => String(v ?? "").trim();

function amount(v) {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
}

function isBillable(task) {
    if (Number(task.billable) === 1) return true;

    return [
        "billable",
        "chargeable",
        "yes",
        "true"
    ].includes(
        clean(task.billing).toLowerCase()
    );
}

function isCompleted(task) {
    return clean(task.completion_date) !== "";
}

function clientName(row) {
    return [
        row.first_name,
        row.middle_name,
        row.last_name
    ].filter(Boolean).join(" ");
}

/* =========================================================
   GET BILLING RECORDS
   ========================================================= */
router.get("/billing", requireAuth, (req, res) => {
    try {
        const rows = db.prepare(`
            SELECT
                t.id AS task_id,
                t.task_name,
                t.completion_date,
                t.billable,
                t.billing,

                c.first_name,
                c.middle_name,
                c.last_name,

                b.id AS billing_id,
                b.serial_number,
                b.chargeable_amount,
                b.receipt_date,
                b.amount,
                b.payment_mode,
                b.advance_payment_date,
                b.advance_amount,
                b.advance_payment_mode,
                b.balance

            FROM office_tasks t

            LEFT JOIN clients c
                ON c.id = t.client_id

            LEFT JOIN billing_records b
                ON b.task_id = t.id

            WHERE
                t.completion_date IS NOT NULL
                AND TRIM(t.completion_date) <> ''

                AND (
                    COALESCE(t.billable, 0) = 1
                    OR LOWER(TRIM(COALESCE(t.billing, ''))) IN
                       ('billable','chargeable','yes','true')
                )

            ORDER BY
                t.completion_date DESC,
                t.id DESC
        `).all();

        const records = rows.map((r, index) => {
            const charge = Number(r.chargeable_amount || 0);
            const received = Number(r.amount || 0);
            const advance = Number(r.advance_amount || 0);

            const balance = Math.max(
                0,
                charge - received - advance
            );

            return {
                id: r.serial_number || r.billing_id || r.task_id,
                taskId: r.task_id,
                billingId: r.billing_id || null,

                serialNumber:
                    r.serial_number ||
                    String(index + 1).padStart(4, "0"),

                clientName: clientName(r),

                taskName: r.task_name || "",
                completionDate: r.completion_date || "",

                chargeableAmount: charge,
                receiptDate: r.receipt_date || "",
                amount: received,
                paymentMode: r.payment_mode || "",

                advancePaymentDate:
                    r.advance_payment_date || "",

                advanceAmount: advance,

                advancePaymentMode:
                    r.advance_payment_mode || "",

                balance
            };
        });

        res.json({
            success: true,
            records
        });

    } catch (error) {
        console.error("Billing GET error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load billing records."
        });
    }
});


/* =========================================================
   PUT BILLING RECORD

   IMPORTANT:
   Client is OPTIONAL.

   The billing record is linked to the completed task.
   No client_id validation is performed.
   ========================================================= */
router.put("/billing/:reference", requireAuth, (req, res) => {
    try {
        const reference = clean(req.params.reference);
        const body = req.body || {};

        if (!reference) {
            return res.status(400).json({
                success: false,
                message: "Billing reference is required."
            });
        }

        /*
         * Find existing billing record by:
         * 1. billing ID
         * 2. serial number
         */
        let billing = db.prepare(`
            SELECT *
            FROM billing_records
            WHERE CAST(id AS TEXT) = ?
               OR CAST(serial_number AS TEXT) = ?
            LIMIT 1
        `).get(reference, reference);

        let task;

        if (billing) {
            task = db.prepare(`
                SELECT *
                FROM office_tasks
                WHERE id = ?
                LIMIT 1
            `).get(billing.task_id);
        } else {
            /*
             * Otherwise the reference is the task ID.
             */
            task = db.prepare(`
                SELECT *
                FROM office_tasks
                WHERE id = ?
                LIMIT 1
            `).get(reference);
        }

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Completed task could not be found."
            });
        }

        if (!isCompleted(task)) {
            return res.status(400).json({
                success: false,
                message: "Only completed tasks can be billed."
            });
        }

        if (!isBillable(task)) {
            return res.status(400).json({
                success: false,
                message: "Only billable tasks can be billed."
            });
        }

        const chargeableAmount =
            amount(body.chargeableAmount);

        const received =
            amount(body.amount);

        const advance =
            amount(body.advanceAmount);

        if (received + advance > chargeableAmount) {
            return res.status(400).json({
                success: false,
                message:
                    "Amount received plus advance cannot exceed chargeable amount."
            });
        }

        const balance = Math.max(
            0,
            chargeableAmount - received - advance
        );

        const receiptDate =
            clean(body.receiptDate) || null;

        const paymentMode =
            clean(body.paymentMode) || null;

        const advancePaymentDate =
            clean(body.advancePaymentDate) || null;

        const advancePaymentMode =
            clean(body.advancePaymentMode) || null;

        const result = db.transaction(() => {

            if (billing) {

                db.prepare(`
                    UPDATE billing_records
                    SET
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
                    chargeableAmount,
                    receiptDate,
                    received,
                    paymentMode,
                    advancePaymentDate,
                    advance,
                    advancePaymentMode,
                    balance,
                    new Date().toISOString(),
                    billing.id
                );

                return {
                    billingId: billing.id,
                    serialNumber: billing.serial_number
                };
            }

            /*
             * Create a new record.
             *
             * Client ID is deliberately NOT required.
             */
            const serialRow = db.prepare(`
                SELECT
                    COALESCE(
                        MAX(CAST(serial_number AS INTEGER)),
                        0
                    ) + 1 AS next_serial
                FROM billing_records
            `).get();

            const serial =
                String(
                    Number(serialRow?.next_serial || 1)
                ).padStart(4, "0");

            const newId =
                `BIL-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 8)}`;

            db.prepare(`
                INSERT INTO billing_records
                (
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
                VALUES
                (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            `).run(
                newId,
                serial,
                task.id,

                /*
                 * NULL is intentional if the task has no client.
                 */
                clean(task.client_id) || null,

                chargeableAmount,
                receiptDate,
                received,
                paymentMode,
                advancePaymentDate,
                advance,
                advancePaymentMode,
                balance,
                req.user.id,
                new Date().toISOString(),
                new Date().toISOString()
            );

            return {
                billingId: newId,
                serialNumber: serial
            };
        })();

        res.json({
            success: true,
            message: "Billing record saved successfully.",
            billingId: result.billingId,
            serialNumber: result.serialNumber,
            taskId: task.id,
            balance,
            balanceDisplay:
                balance === 0 ? "NIL" : balance
        });

    } catch (error) {
        console.error("Billing PUT error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to save billing record."
        });
    }
});

module.exports = router;
