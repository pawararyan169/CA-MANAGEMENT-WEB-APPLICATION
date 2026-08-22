const express = require("express");
const router = express.Router();

const db = require("../database/database");
const { requireAuth } = require("../middleware/auth");

/*
=========================================================
BILLING RECORDS
=========================================================

Only tasks that have a completion date AND are billable
appear in the Billing Records page.

Important database facts for this project:
- Task table: office_tasks
- Task name column: task_name
- Task ID is TEXT, e.g. TASK17873872735585285
- Client ID: client_id
- Completion date: completion_date
- Billable flag: billable
- Billing table requires client_id when inserting
- Billing table is linked to the task through task_id

The frontend can edit:
- chargeable amount
- receipt date
- amount
- payment mode
- advance payment date
- advance amount
- advance payment mode

Balance is always calculated on the server:
chargeable - amount - advance
If balance is zero, the frontend displays NIL.
=========================================================
*/


function clean(value) {
    return String(value ?? "").trim();
}


function fullName(row) {
    return [
        row.first_name,
        row.middle_name,
        row.last_name
    ]
        .filter(value => value && String(value).trim())
        .join(" ")
        .trim();
}


function toAmount(value) {
    const n = Number(value);

    if (!Number.isFinite(n) || n < 0) {
        return 0;
    }

    return n;
}


function nextSerial() {

    const row = db.prepare(`
        SELECT
            COALESCE(MAX(CAST(serial_number AS INTEGER)), 0) + 1
            AS next_serial
        FROM billing_records
    `).get();

    return Number(row?.next_serial || 1);
}


function isBillable(task) {

    if (Number(task.billable) === 1) {
        return true;
    }

    const billing = String(
        task.billing ?? ""
    )
        .trim()
        .toLowerCase();

    return [
        "billable",
        "chargeable",
        "yes",
        "true"
    ].includes(billing);
}


function isCompleted(task) {

    /*
     * Current task logic derives completion from
     * completion_date. We therefore use the date as the
     * primary source of truth.
     */
    return Boolean(
        clean(task.completion_date)
    );
}


/*
=========================================================
GET BILLING RECORDS
=========================================================
*/
router.get(
    "/billing",
    requireAuth,
    (req, res) => {

        try {

            const rows = db.prepare(`
                SELECT
                    t.id AS task_id,
                    t.task_name AS task_name,
                    t.client_id AS task_client_id,
                    t.completion_date AS completion_date,
                    t.billable AS task_billable,
                    t.billing AS task_billing,

                    c.first_name AS first_name,
                    c.middle_name AS middle_name,
                    c.last_name AS last_name,
                    c.pan AS pan,

                    b.id AS billing_id,
                    b.serial_number AS serial_number,
                    b.client_id AS billing_client_id,
                    b.chargeable_amount AS chargeable_amount,
                    b.receipt_date AS receipt_date,
                    b.amount AS amount,
                    b.payment_mode AS payment_mode,
                    b.advance_payment_date AS advance_payment_date,
                    b.advance_amount AS advance_amount,
                    b.advance_payment_mode AS advance_payment_mode,
                    b.balance AS stored_balance

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

                        OR LOWER(
                            TRIM(
                                COALESCE(t.billing, '')
                            )
                        ) IN (
                            'billable',
                            'chargeable',
                            'yes',
                            'true'
                        )
                    )

                ORDER BY
                    t.completion_date DESC,
                    t.created_at DESC,
                    t.id DESC
            `).all();


            const records = rows.map(
                (row, index) => {

                    const chargeable =
                        Number(
                            row.chargeable_amount || 0
                        );

                    const amount =
                        Number(
                            row.amount || 0
                        );

                    const advance =
                        Number(
                            row.advance_amount || 0
                        );

                    const balance =
                        Math.max(
                            0,
                            chargeable -
                            amount -
                            advance
                        );


                    return {

                        /*
                         * Use the billing record ID when it
                         * exists. Otherwise use the task ID.
                         *
                         * The task ID is TEXT and can be:
                         * TASK17873872735585285
                         */
                        id:
                            row.billing_id ||
                            row.task_id,

                        taskId:
                            row.task_id,

                        billingId:
                            row.billing_id || null,

                        serialNumber:
                            row.serial_number ||
                            String(index + 1).padStart(
                                4,
                                "0"
                            ),

                        clientId:
                            row.task_client_id ||
                            row.billing_client_id ||
                            "",

                        clientName:
                            fullName(row),

                        pan:
                            row.pan || "",

                        taskName:
                            row.task_name || "",

                        completionDate:
                            row.completion_date || "",

                        status:
                            "completed",

                        billable:
                            true,

                        chargeableAmount:
                            chargeable,

                        receiptDate:
                            row.receipt_date || "",

                        amount:
                            amount,

                        paymentMode:
                            row.payment_mode || "",

                        advancePaymentDate:
                            row.advance_payment_date || "",

                        advanceAmount:
                            advance,

                        advancePaymentMode:
                            row.advance_payment_mode || "",

                        balance:
                            balance
                    };
                }
            );


            return res.json({
                success: true,
                records
            });


        } catch (error) {

            console.error(
                "Billing GET error:",
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


/*
=========================================================
PUT /api/billing/:id

:id may be either:
1. Existing billing record ID
2. Task ID such as TASK17873872735585285

If the task has no billing record yet, one is created.
=========================================================
*/
router.put(
    "/billing/:id",
    requireAuth,
    (req, res) => {

        try {

            const routeId =
                clean(req.params.id);

            if (!routeId) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Billing/task ID is required."
                });
            }


            const body =
                req.body || {};


            /*
             * First determine whether :id is an existing
             * billing record.
             *
             * Billing IDs in this project are TEXT.
             */
            let existingBilling =
                db.prepare(`
                    SELECT
                        b.*
                    FROM billing_records b
                    WHERE b.id = ?
                    LIMIT 1
                `).get(routeId);


            let task = null;


            /*
             * If it isn't a billing ID, treat it as
             * the task ID.
             */
            if (existingBilling) {

                task =
                    db.prepare(`
                        SELECT
                            *
                        FROM office_tasks
                        WHERE id = ?
                        LIMIT 1
                    `).get(
                        existingBilling.task_id
                    );

            } else {

                task =
                    db.prepare(`
                        SELECT
                            *
                        FROM office_tasks
                        WHERE id = ?
                        LIMIT 1
                    `).get(
                        routeId
                    );


                /*
                 * If the frontend ever sends task-<id>,
                 * support that as well.
                 */
                if (!task && routeId.startsWith("task-")) {

                    const taskId =
                        routeId.slice(5);

                    task =
                        db.prepare(`
                            SELECT
                                *
                            FROM office_tasks
                            WHERE id = ?
                            LIMIT 1
                        `).get(taskId);
                }
            }


            if (!task) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Task not found."
                });
            }


            /*
             * Billing is only available for completed tasks.
             */
            if (!isCompleted(task)) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Only completed tasks can be billed."
                });
            }


            /*
             * Billing is only available for billable tasks.
             */
            if (!isBillable(task)) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Only billable tasks can be billed."
                });
            }


            /*
             * The database requires client_id NOT NULL.
             *
             * Therefore a task without a client cannot be
             * inserted into billing_records.
             */
            const clientId =
                clean(
                    task.client_id
                );


            if (!clientId) {

                return res.status(400).json({
                    success: false,
                    message:
                        "This billable task has no client linked to it."
                });
            }


            /*
             * Make sure the client exists.
             */
            const client =
                db.prepare(`
                    SELECT
                        id
                    FROM clients
                    WHERE id = ?
                    LIMIT 1
                `).get(clientId);


            if (!client) {

                return res.status(400).json({
                    success: false,
                    message:
                        "The client linked to this task does not exist."
                });
            }


            /*
             * Read and validate payment values.
             */
            const chargeableAmount =
                toAmount(
                    body.chargeableAmount
                );

            const amount =
                toAmount(
                    body.amount
                );

            const advanceAmount =
                toAmount(
                    body.advanceAmount
                );


            if (
                amount +
                advanceAmount >
                chargeableAmount
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Amount plus advance cannot exceed the chargeable amount."
                });
            }


            /*
             * Empty fields are allowed.
             *
             * This is important because the billing record
             * can initially be blank and filled in directly
             * from the spreadsheet.
             */
            const receiptDate =
                clean(
                    body.receiptDate
                ) || null;

            const paymentMode =
                clean(
                    body.paymentMode
                ) || null;

            const advancePaymentDate =
                clean(
                    body.advancePaymentDate
                ) || null;

            const advancePaymentMode =
                clean(
                    body.advancePaymentMode
                ) || null;


            /*
             * Automatic balance.
             */
            const balance =
                Math.max(
                    0,
                    chargeableAmount -
                    amount -
                    advanceAmount
                );


            /*
             * Save atomically.
             */
            const save =
                db.transaction(() => {

                    /*
                     * Existing billing record.
                     */
                    if (existingBilling) {

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

                            task.id,
                            clientId,

                            chargeableAmount,

                            receiptDate,

                            amount,

                            paymentMode,

                            advancePaymentDate,

                            advanceAmount,

                            advancePaymentMode,

                            balance,

                            new Date().toISOString(),

                            existingBilling.id
                        );


                        return {
                            billingId:
                                existingBilling.id,

                            serialNumber:
                                existingBilling.serial_number
                        };
                    }


                    /*
                     * No billing record yet.
                     *
                     * Create one automatically.
                     */
                    const serial =
                        nextSerial();


                    /*
                     * Use a unique TEXT billing ID.
                     */
                    const billingId =
                        `BIL-${Date.now()}-${Math.random()
                            .toString(36)
                            .slice(2, 10)}`;


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
                            ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?,
                            ?, ?, ?
                        )
                    `).run(

                        billingId,

                        serial,

                        task.id,

                        clientId,

                        chargeableAmount,

                        receiptDate,

                        amount,

                        paymentMode,

                        advancePaymentDate,

                        advanceAmount,

                        advancePaymentMode,

                        balance,

                        req.user.id,

                        new Date().toISOString(),

                        new Date().toISOString()
                    );


                    return {
                        billingId,
                        serialNumber: serial
                    };
                });


            return res.json({
                success: true,
                message:
                    "Billing record saved successfully.",
                billingId:
                    save.billingId,
                taskId:
                    task.id,
                serialNumber:
                    save.serialNumber,
                balance:
                    balance,
                balanceDisplay:
                    balance === 0
                        ? "NIL"
                        : balance
            });


        } catch (error) {

            console.error(
                "Billing PUT error:",
                error
            );


            return res.status(500).json({
                success: false,
                message:
                    "Unable to save billing record."
            });
        }
    }
);


module.exports = router;
