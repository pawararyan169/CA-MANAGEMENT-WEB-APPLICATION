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

    return ["billable", "chargeable", "yes", "true"].includes(
        clean(task.billing).toLowerCase()
    );
}

function isCompleted(task) {
    return clean(task.completion_date) !== "";
}

/* =========================================================
   SOURCE RECORD HELPERS

   GST and PAN are services, not office_tasks. They therefore
   use their own billing source keys inside billing_records.task_id.
========================================================= */

function getTransferredService(reference) {
    const ref = clean(reference);

    if (!ref) return null;

    /*
     * GST DIRECT SOURCE
     *
     * GST Dashboard status is TRANSFERED TO BILLING when set_date exists.
     * There is NO office_tasks dependency.
     */
    if (ref.startsWith("GSTBILL-")) {
        const id = ref.slice("GSTBILL-".length);

        const row = db.prepare(`
            SELECT
                gm.id,
                gm.set_date,
                gm.updated_at,
                gm.month_key,
                c.id AS client_id,
                c.first_name,
                c.middle_name,
                c.last_name,
                c.pan,
                c.gst
            FROM gst_monthly_records gm
            JOIN gst_profiles gp ON gp.id = gm.gst_profile_id
            JOIN clients c ON c.id = gp.client_id
            WHERE gm.id = ?
              AND gm.set_date IS NOT NULL
              AND TRIM(gm.set_date) <> ''
              AND c.gst IS NOT NULL
              AND TRIM(c.gst) <> ''
            LIMIT 1
        `).get(id);

        if (!row) return null;

        return {
            sourceKey: `GSTBILL-${row.id}`,
            sourceType: "GST",
            sourceId: row.id,
            clientId: row.client_id,
            clientName: [row.first_name, row.middle_name, row.last_name]
                .filter(Boolean).join(" ").trim() || "Unnamed Client",
            pan: row.pan || "",
            gstNumber: row.gst || "",
            receiptDate: row.set_date || row.updated_at || "",
            completionDate: row.set_date || row.updated_at || "",
            taskName: "GST"
        };
    }

    /*
     * INCOME TAX / PAN DIRECT SOURCE
     *
     * Income Tax Dashboard status is TRANSFER TO BILLING when set_date exists.
     * The dashboard uses income_tax_monthly_records, NOT office_tasks.
     */
    if (ref.startsWith("PANBILL-")) {
        const id = ref.slice("PANBILL-".length);

        const row = db.prepare(`
            SELECT
                im.id,
                im.set_date,
                im.updated_at,
                im.month_key,
                itp.client_id,
                c.first_name,
                c.middle_name,
                c.last_name,
                c.pan,
                c.gst
            FROM income_tax_monthly_records im
            JOIN income_tax_profiles itp
              ON itp.id = im.income_tax_profile_id
            JOIN clients c
              ON c.id = itp.client_id
            WHERE im.id = ?
              AND im.set_date IS NOT NULL
              AND TRIM(im.set_date) <> ''
              AND c.pan IS NOT NULL
              AND TRIM(c.pan) <> ''
            LIMIT 1
        `).get(id);

        if (!row) return null;

        return {
            sourceKey: `PANBILL-${row.id}`,
            sourceType: "PAN",
            sourceId: row.id,
            clientId: row.client_id,
            clientName: [row.first_name, row.middle_name, row.last_name]
                .filter(Boolean).join(" ").trim() || "Unnamed Client",
            pan: row.pan || "",
            gstNumber: row.gst || "",
            receiptDate: row.set_date || row.updated_at || "",
            completionDate: row.set_date || row.updated_at || "",
            taskName: "PAN"
        };
    }

    return null;
}

function transferredServiceRows() {
    const rows = [];

    /*
     * GST: every monthly GST record with a Set Date is directly
     * available to Billing.
     */
    const gstRows = db.prepare(`
        SELECT
            gm.id,
            gm.set_date,
            gm.updated_at,
            gm.month_key,
            c.id AS client_id,
            c.first_name,
            c.middle_name,
            c.last_name,
            c.pan,
            c.gst
        FROM gst_monthly_records gm
        JOIN gst_profiles gp ON gp.id = gm.gst_profile_id
        JOIN clients c ON c.id = gp.client_id
        WHERE gm.set_date IS NOT NULL
          AND TRIM(gm.set_date) <> ''
          AND c.gst IS NOT NULL
          AND TRIM(c.gst) <> ''
        ORDER BY gm.set_date DESC, gm.id DESC
    `).all();

    for (const r of gstRows) {
        rows.push({
            sourceKey: `GSTBILL-${r.id}`,
            sourceType: "GST",
            sourceId: r.id,
            clientId: r.client_id,
            clientName: [r.first_name, r.middle_name, r.last_name]
                .filter(Boolean).join(" ").trim() || "Unnamed Client",
            pan: r.pan || "",
            gstNumber: r.gst || "",
            receiptDate: r.set_date || r.updated_at || "",
            completionDate: r.set_date || r.updated_at || "",
            taskName: "GST"
        });
    }

    /*
     * Income Tax / PAN: every monthly Income Tax record with a Set Date
     * is directly available to Billing.
     */
    const panRows = db.prepare(`
        SELECT
            im.id,
            im.set_date,
            im.updated_at,
            im.month_key,
            itp.client_id,
            c.first_name,
            c.middle_name,
            c.last_name,
            c.pan,
            c.gst
        FROM income_tax_monthly_records im
        JOIN income_tax_profiles itp
          ON itp.id = im.income_tax_profile_id
        JOIN clients c
          ON c.id = itp.client_id
        WHERE im.set_date IS NOT NULL
          AND TRIM(im.set_date) <> ''
          AND c.pan IS NOT NULL
          AND TRIM(c.pan) <> ''
        ORDER BY im.set_date DESC, im.id DESC
    `).all();

    for (const r of panRows) {
        rows.push({
            sourceKey: `PANBILL-${r.id}`,
            sourceType: "PAN",
            sourceId: r.id,
            clientId: r.client_id,
            clientName: [r.first_name, r.middle_name, r.last_name]
                .filter(Boolean).join(" ").trim() || "Unnamed Client",
            pan: r.pan || "",
            gstNumber: r.gst || "",
            receiptDate: r.set_date || r.updated_at || "",
            completionDate: r.set_date || r.updated_at || "",
            taskName: "PAN"
        });
    }

    return rows;
}

function billingRecordFor(sourceKey) {
    return db.prepare(`
        SELECT *
        FROM billing_records
        WHERE task_id = ?
        LIMIT 1
    `).get(sourceKey);
}

function makeRecord(base, billing, fallbackSerial) {
    const charge = Number(billing?.chargeable_amount || 0);
    const received = Number(billing?.amount || 0);
    const advance = Number(billing?.advance_amount || 0);

    return {
        id: billing?.id || base.sourceKey,
        taskId: base.sourceKey,
        billingId: billing?.id || null,
        sourceType: base.sourceType,
        sourceId: base.sourceId,
        clientId: base.clientId || "",
        clientName: base.clientName || "",
        name: base.clientName || "",
        pan: base.pan || "",
        gstNumber: base.gstNumber || "",
        serialNumber: billing?.serial_number || String(fallbackSerial).padStart(4, "0"),
        taskName: base.taskName,
        status: "TRANSFERRED TO BILLING",
        transferredToBilling: true,
        completionDate: base.completionDate || "",
        chargeableAmount: charge,
        receiptDate: billing?.receipt_date || base.receiptDate || "",
        amount: received,
        paymentMode: billing?.payment_mode || "",
        advancePaymentDate: billing?.advance_payment_date || "",
        advanceAmount: advance,
        advancePaymentMode: billing?.advance_payment_mode || "",
        balance: Math.max(0, charge - received - advance)
    };
}

/* =========================================================
   GET BILLING RECORDS

   Includes:
   1. Existing completed + billable office tasks
   2. Every GST record whose status is TRANSFERED TO BILLING
   3. Every PAN record whose status is TRANSFERED TO BILLING
========================================================= */
router.get("/billing", requireAuth, (req, res) => {
    try {
        const records = [];

        const taskRows = db.prepare(`
            SELECT
                t.id AS task_id,
                t.task_name,
                t.completion_date,
                t.billable,
                t.billing,
                c.id AS client_id,
                c.first_name,
                c.middle_name,
                c.last_name,
                c.pan,
                c.gst,
                b.id AS billing_id,
                b.serial_number,
                b.chargeable_amount,
                b.receipt_date,
                b.amount,
                b.payment_mode,
                b.advance_payment_date,
                b.advance_amount,
                b.advance_payment_mode
            FROM office_tasks t
            LEFT JOIN clients c ON c.id = t.client_id
            LEFT JOIN billing_records b ON b.task_id = t.id
            WHERE t.completion_date IS NOT NULL
              AND TRIM(t.completion_date) <> ''
              AND (
                  COALESCE(t.billable, 0) = 1
                  OR LOWER(TRIM(COALESCE(t.billing, ''))) IN ('billable','chargeable','yes','true')
              )
            ORDER BY t.completion_date DESC, t.id DESC
        `).all();

        for (let i = 0; i < taskRows.length; i++) {
            const r = taskRows[i];
            records.push({
                id: r.billing_id || r.task_id,
                taskId: r.task_id,
                billingId: r.billing_id || null,
                sourceType: "TASK",
                sourceId: r.task_id,
                clientId: r.client_id || "",
                clientName: [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(" ").trim() || "",
                name: [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(" ").trim() || "",
                pan: r.pan || "",
                gstNumber: r.gst || "",
                serialNumber: r.serial_number || String(i + 1).padStart(4, "0"),
                taskName: r.task_name || "",
                completionDate: r.completion_date || "",
                chargeableAmount: Number(r.chargeable_amount || 0),
                receiptDate: r.receipt_date || "",
                amount: Number(r.amount || 0),
                paymentMode: r.payment_mode || "",
                advancePaymentDate: r.advance_payment_date || "",
                advanceAmount: Number(r.advance_amount || 0),
                advancePaymentMode: r.advance_payment_mode || "",
                balance: Math.max(0, Number(r.chargeable_amount || 0) - Number(r.amount || 0) - Number(r.advance_amount || 0)),
                status: "completed",
                billable: true
            });
        }

        const serviceRows = transferredServiceRows();
        let serial = taskRows.length + 1;

        for (const service of serviceRows) {
            const billing = billingRecordFor(service.sourceKey);
            records.push(makeRecord(service, billing, serial++));
        }

        records.sort((a, b) => {
            const da = String(a.completionDate || a.receiptDate || "");
            const dbb = String(b.completionDate || b.receiptDate || "");
            return dbb.localeCompare(da) || String(a.id).localeCompare(String(b.id));
        });

        return res.json({ success: true, records });
    } catch (error) {
        console.error("Billing GET error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to load billing records."
        });
    }
});

/* =========================================================
   PUT BILLING RECORD
   Supports both normal office tasks and GST/PAN transferred
   service records.
========================================================= */
router.put("/billing/:reference", requireAuth, (req, res) => {
    try {
        const reference = clean(req.params.reference);
        const body = req.body || {};

        if (!reference) {
            return res.status(400).json({ success: false, message: "Billing reference is required." });
        }

        let billing = db.prepare(`
            SELECT * FROM billing_records
            WHERE CAST(id AS TEXT) = ?
               OR CAST(serial_number AS TEXT) = ?
            LIMIT 1
        `).get(reference, reference);

        let task = null;
        let service = null;

        if (billing) {
            service = getTransferredService(billing.task_id);
            if (!service) {
                task = db.prepare(`SELECT * FROM office_tasks WHERE id = ? LIMIT 1`).get(billing.task_id);
            }
        } else {
            service = getTransferredService(reference);
            if (!service) {
                task = db.prepare(`SELECT * FROM office_tasks WHERE id = ? LIMIT 1`).get(reference);
            }
        }

        if (!task && !service) {
            return res.status(404).json({ success: false, message: "The billing source could not be found or is no longer transferred to billing." });
        }

        if (task) {
            if (!isCompleted(task)) {
                return res.status(400).json({ success: false, message: "Only completed tasks can be billed." });
            }
            if (!isBillable(task)) {
                return res.status(400).json({ success: false, message: "Only billable tasks can be billed." });
            }
        }

        const chargeableAmount = amount(body.chargeableAmount);
        const received = amount(body.amount);
        const advance = amount(body.advanceAmount);

        if (received + advance > chargeableAmount) {
            return res.status(400).json({ success: false, message: "Amount received plus advance cannot exceed chargeable amount." });
        }

        const balance = Math.max(0, chargeableAmount - received - advance);
        const receiptDate = clean(body.receiptDate);
        const paymentMode = clean(body.paymentMode);
        const advancePaymentDate = clean(body.advancePaymentDate);
        const advancePaymentMode = clean(body.advancePaymentMode);
        const taskId = billing?.task_id || service?.sourceKey || task?.id;

        const result = db.transaction(() => {
            if (billing) {
                db.prepare(`
                    UPDATE billing_records
                    SET chargeable_amount = ?, receipt_date = ?, amount = ?, payment_mode = ?,
                        advance_payment_date = ?, advance_amount = ?, advance_payment_mode = ?,
                        balance = ?, updated_at = ?
                    WHERE id = ?
                `).run(
                    chargeableAmount, receiptDate, received, paymentMode,
                    advancePaymentDate, advance, advancePaymentMode, balance,
                    new Date().toISOString(), billing.id
                );

                return { billingId: billing.id, serialNumber: billing.serial_number };
            }

            const serialRow = db.prepare(`
                SELECT COALESCE(MAX(CAST(serial_number AS INTEGER)), 0) + 1 AS next_serial
                FROM billing_records
            `).get();

            const serial = String(Number(serialRow?.next_serial || 1)).padStart(4, "0");
            const newId = `BIL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const now = new Date().toISOString();

            db.prepare(`
                INSERT INTO billing_records
                (id, serial_number, task_id, chargeable_amount, receipt_date, amount,
                 payment_mode, advance_payment_date, advance_amount, advance_payment_mode,
                 balance, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                newId, serial, taskId, chargeableAmount, receiptDate, received,
                paymentMode, advancePaymentDate, advance, advancePaymentMode,
                balance, req.user.id, now, now
            );

            return { billingId: newId, serialNumber: serial };
        })();

        return res.json({
            success: true,
            message: "Billing record saved successfully.",
            billingId: result.billingId,
            serialNumber: result.serialNumber,
            taskId,
            taskName: service?.taskName || task?.task_name || "",
            sourceType: service?.sourceType || "TASK",
            balance,
            balanceDisplay: balance === 0 ? "NIL" : balance
        });
    } catch (error) {
        console.error("Billing PUT error:", error);
        return res.status(500).json({ success: false, message: error.message || "Unable to save billing record." });
    }
});

/* =========================================================
   DELETE BILLING RECORD
========================================================= */
router.delete("/billing/:reference", requireAuth, (req, res) => {
    try {
        const reference = clean(req.params.reference);
        if (!reference) {
            return res.status(400).json({ success: false, message: "Billing record reference is required." });
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
            return res.status(404).json({ success: false, message: "Billing record not found." });
        }

        db.prepare(`DELETE FROM billing_records WHERE id = ?`).run(record.id);

        return res.json({
            success: true,
            message: "Billing record removed successfully.",
            billingId: record.id,
            taskId: record.task_id,
            serialNumber: record.serial_number
        });
    } catch (error) {
        console.error("Billing DELETE error:", error);
        return res.status(500).json({ success: false, message: "Unable to remove billing record." });
    }
});

module.exports = router;
