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
                t.id DESC
        `).all();


        const records = rows.map((r, index) => {

            const charge =
                Number(r.chargeable_amount || 0);

            const received =
                Number(r.amount || 0);

            const advance =
                Number(r.advance_amount || 0);

            const balance =
                Math.max(
                    0,
                    charge - received - advance
                );


            return {

                id:
                    r.billing_id ||
                    r.task_id,

                taskId:
                    r.task_id,

                billingId:
                    r.billing_id || null,

                serialNumber:
                    r.serial_number ||
                    String(index + 1).padStart(4, "0"),

                taskName:
                    r.task_name || "",

                completionDate:
                    r.completion_date || "",

                chargeableAmount:
                    charge,

                receiptDate:
                    r.receipt_date || "",

                amount:
                    received,

                paymentMode:
                    r.payment_mode || "",

                advancePaymentDate:
                    r.advance_payment_date || "",

                advanceAmount:
                    advance,

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

        console.error(
            "Billing GET error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to load billing records."
        });
    }
});


/* =========================================================
   PUT BILLING RECORD
   Billing is linked ONLY to the completed billable task.
   Client is not used.
   ========================================================= */

router.put(
    "/billing/:reference",
    requireAuth,
    (req, res) => {

        try {

            const reference =
                clean(req.params.reference);

            const body =
                req.body || {};


            if (!reference) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Billing reference is required."
                });
            }


            /*
             * Existing billing record:
             * reference may be billing ID or serial number.
             */

            let billing =
                db.prepare(`
                    SELECT *
                    FROM billing_records
                    WHERE CAST(id AS TEXT) = ?
                       OR CAST(serial_number AS TEXT) = ?
                    LIMIT 1
                `)
                .get(
                    reference,
                    reference
                );


            let task;


            /*
             * Existing billing -> use its task.
             * New billing -> reference is the task ID.
             */

            if (billing) {

                task =
                    db.prepare(`
                        SELECT *
                        FROM office_tasks
                        WHERE id = ?
                        LIMIT 1
                    `)
                    .get(
                        billing.task_id
                    );

            } else {

                task =
                    db.prepare(`
                        SELECT *
                        FROM office_tasks
                        WHERE id = ?
                        LIMIT 1
                    `)
                    .get(
                        reference
                    );
            }


            if (!task) {

                return res.status(404).json({
                    success: false,
                    message:
                        "The selected task could not be found."
                });
            }


            if (!isCompleted(task)) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Only completed tasks can be billed."
                });
            }


            if (!isBillable(task)) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Only billable tasks can be billed."
                });
            }


            const chargeableAmount =
                amount(
                    body.chargeableAmount
                );

            const received =
                amount(
                    body.amount
                );

            const advance =
                amount(
                    body.advanceAmount
                );


            if (
                received + advance >
                chargeableAmount
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Amount received plus advance cannot exceed chargeable amount."
                });
            }


            const balance =
                Math.max(
                    0,
                    chargeableAmount -
                    received -
                    advance
                );


            const receiptDate =
                clean(
                    body.receiptDate
                );

            const paymentMode =
                clean(
                    body.paymentMode
                );

            const advancePaymentDate =
                clean(
                    body.advancePaymentDate
                );

            const advancePaymentMode =
                clean(
                    body.advancePaymentMode
                );


            const result =
                db.transaction(() => {


                    /*
                     * UPDATE EXISTING RECORD
                     */

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
                        `)
                        .run(

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
                            billingId:
                                billing.id,

                            serialNumber:
                                billing.serial_number
                        };
                    }


                    /*
                     * CREATE NEW RECORD
                     *
                     * IMPORTANT:
                     * There is deliberately NO client_id here.
                     */

                    const serialRow =
                        db.prepare(`
                            SELECT
                                COALESCE(
                                    MAX(
                                        CAST(
                                            serial_number
                                            AS INTEGER
                                        )
                                    ),
                                    0
                                ) + 1 AS next_serial
                            FROM billing_records
                        `)
                        .get();


                    const serial =
                        String(
                            Number(
                                serialRow?.next_serial ||
                                1
                            )
                        )
                        .padStart(
                            4,
                            "0"
                        );


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
                            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                        )
                    `)
                    .run(

                        newId,
                        serial,
                        task.id,
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

                        billingId:
                            newId,

                        serialNumber:
                            serial
                    };

                })();


            res.json({

                success: true,

                message:
                    "Billing record saved successfully.",

                billingId:
                    result.billingId,

                serialNumber:
                    result.serialNumber,

                taskId:
                    task.id,

                taskName:
                    task.task_name || "",

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

            res.status(500).json({
                success: false,
                message:
                    "Unable to save billing record."
            });
        }
    }
);



/* =========================================================
   DELETE BILLING RECORD
   Deletes only billing_records. The original task remains.
========================================================= */
router.delete(
    "/billing/:reference",
    requireAuth,
    (req, res) => {
        try {
            const reference = clean(req.params.reference);

            if (!reference) {
                return res.status(400).json({
                    success: false,
                    message: "Billing record reference is required."
                });
            }

            const record = db.prepare(`
                SELECT id, task_id, serial_number
                FROM billing_records
                WHERE CAST(id AS TEXT) = ?
                   OR CAST(serial_number AS TEXT) = ?
                   OR CAST(task_id AS TEXT) = ?
                LIMIT 1
            `).get(reference, reference, reference);

            if (!record) {
                return res.status(404).json({
                    success: false,
                    message: "Billing record not found."
                });
            }

            db.prepare(`
                DELETE FROM billing_records
                WHERE id = ?
            `).run(record.id);

            return res.json({
                success: true,
                message: "Billing record removed successfully.",
                billingId: record.id,
                taskId: record.task_id,
                serialNumber: record.serial_number
            });

        } catch (error) {
            console.error("Billing DELETE error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to remove billing record."
            });
        }
    }
);

module.exports = router;
