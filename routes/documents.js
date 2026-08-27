const express = require("express");
const crypto = require("crypto");

const db = require("../database/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/* =========================================================
   HELPERS
========================================================= */

function clean(value) {
    return String(value ?? "").trim();
}

function generateId() {
    return (
        "DOC" +
        Date.now() +
        crypto.randomInt(1000, 9999)
    );
}

function displayName(first, middle, last) {
    return [
        clean(first),
        clean(middle),
        clean(last)
    ]
        .filter(Boolean)
        .join(" ")
        .trim();
}

function formatSerial(number) {
    return `DOC-${String(number).padStart(6, "0")}`;
}

/* =========================================================
   DATABASE MIGRATION
========================================================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS office_documents (
        id TEXT PRIMARY KEY,
        serial_no INTEGER NOT NULL UNIQUE,
        client_id TEXT NOT NULL,
        purpose TEXT NOT NULL,
        mode TEXT NOT NULL,
        receipt_date TEXT NOT NULL,
        dispatch_date TEXT,
        receiving_staff_id TEXT,
        delivering_staff_id TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
`);

/* Assigned employee */

try {
    const columns = db
        .prepare(`PRAGMA table_info(office_documents)`)
        .all();

    const exists = columns.some(
        column =>
            column.name === "assigned_employee_id"
    );

    if (!exists) {
        db.exec(`
            ALTER TABLE office_documents
            ADD COLUMN assigned_employee_id TEXT
        `);
    }
} catch (error) {
    console.error(
        "Assigned employee migration error:",
        error
    );
}

/* Completion date */

try {
    const columns = db
        .prepare(`PRAGMA table_info(office_documents)`)
        .all();

    const exists = columns.some(
        column =>
            column.name === "completion_date"
    );

    if (!exists) {
        db.exec(`
            ALTER TABLE office_documents
            ADD COLUMN completion_date TEXT
        `);
    }
} catch (error) {
    console.error(
        "Completion date migration error:",
        error
    );
}

/* Indexes */

try {
    db.exec(`
        CREATE INDEX IF NOT EXISTS
        idx_office_documents_client
        ON office_documents(client_id);

        CREATE INDEX IF NOT EXISTS
        idx_office_documents_receipt
        ON office_documents(receipt_date);

        CREATE INDEX IF NOT EXISTS
        idx_office_documents_mode
        ON office_documents(mode);

        CREATE INDEX IF NOT EXISTS
        idx_office_documents_completion
        ON office_documents(completion_date);

        CREATE INDEX IF NOT EXISTS
        idx_office_documents_assigned_employee
        ON office_documents(assigned_employee_id);
    `);
} catch (error) {
    console.error(
        "Document indexes error:",
        error
    );
}

/* =========================================================
   DOCUMENT SELECT
========================================================= */

function documentQuery() {
    return `
        SELECT

            d.id,
            d.serial_no,
            d.client_id,
            d.purpose,
            d.mode,
            d.receipt_date,
            d.dispatch_date,
            d.completion_date,

            d.receiving_staff_id,
            d.delivering_staff_id,
            d.assigned_employee_id,

            d.created_by,
            d.created_at,
            d.updated_at,

            /* CLIENT */

            TRIM(
                COALESCE(c.first_name, '')
                ||
                CASE
                    WHEN c.middle_name IS NOT NULL
                    AND c.middle_name != ''
                    THEN ' ' || c.middle_name
                    ELSE ''
                END
                ||
                CASE
                    WHEN c.last_name IS NOT NULL
                    AND c.last_name != ''
                    THEN ' ' || c.last_name
                    ELSE ''
                END
            ) AS client_name,

            c.pan AS client_pan,

            /* RECEIVING STAFF */

            TRIM(
                COALESCE(r.first_name, '')
                ||
                CASE
                    WHEN r.middle_name IS NOT NULL
                    AND r.middle_name != ''
                    THEN ' ' || r.middle_name
                    ELSE ''
                END
                ||
                CASE
                    WHEN r.last_name IS NOT NULL
                    AND r.last_name != ''
                    THEN ' ' || r.last_name
                    ELSE ''
                END
            ) AS receiving_staff_name,

            /* DELIVERING STAFF */

            TRIM(
                COALESCE(del.first_name, '')
                ||
                CASE
                    WHEN del.middle_name IS NOT NULL
                    AND del.middle_name != ''
                    THEN ' ' || del.middle_name
                    ELSE ''
                END
                ||
                CASE
                    WHEN del.last_name IS NOT NULL
                    AND del.last_name != ''
                    THEN ' ' || del.last_name
                    ELSE ''
                END
            ) AS delivering_staff_name,

            /* ASSIGNED EMPLOYEE */

            TRIM(
                COALESCE(ae.first_name, '')
                ||
                CASE
                    WHEN ae.middle_name IS NOT NULL
                    AND ae.middle_name != ''
                    THEN ' ' || ae.middle_name
                    ELSE ''
                END
                ||
                CASE
                    WHEN ae.last_name IS NOT NULL
                    AND ae.last_name != ''
                    THEN ' ' || ae.last_name
                    ELSE ''
                END
            ) AS assigned_employee_name

        FROM office_documents d

        LEFT JOIN clients c
            ON c.id = d.client_id

        LEFT JOIN users r
            ON r.id = d.receiving_staff_id

        LEFT JOIN users del
            ON del.id = d.delivering_staff_id

        LEFT JOIN users ae
            ON ae.id = d.assigned_employee_id
    `;
}

/* =========================================================
   MAP DOCUMENT
========================================================= */

function mapDocument(row) {

    if (!row) {
        return null;
    }

    return {

        id:
            row.id || "",

        serialNumber:
            row.serial_no || "",

        serialLabel:
            row.serial_no
                ? formatSerial(row.serial_no)
                : "",

        clientId:
            row.client_id || "",

        clientName:
            row.client_name ||
            "Unknown Client",

        clientPan:
            row.client_pan || "",

        purpose:
            row.purpose || "",

        mode:
            row.mode || "",

        receiptDate:
            row.receipt_date || "",

        dispatchDate:
            row.dispatch_date || "",

        completionDate:
            row.completion_date || "",

        receivingStaffId:
            row.receiving_staff_id || "",

        receivingStaffName:
            row.receiving_staff_name || "",

        deliveringStaffId:
            row.delivering_staff_id || "",

        deliveringStaffName:
            row.delivering_staff_name || "",

        assignedEmployeeId:
            row.assigned_employee_id || "",

        assignedEmployeeName:
            row.assigned_employee_name || "",

        createdBy:
            row.created_by || "",

        createdAt:
            row.created_at || "",

        updatedAt:
            row.updated_at || "",

        status:
            row.completion_date
                ? "COMPLETE"
                : "W.I.P"
    };
}

/* =========================================================
   NEXT SERIAL
========================================================= */

function getNextSerialNumber() {

    const result =
        db.prepare(`
            SELECT
                COALESCE(
                    MAX(serial_no),
                    0
                ) + 1 AS next_serial
            FROM office_documents
        `).get();

    return Number(
        result?.next_serial || 1
    );
}

/* =========================================================
   NEXT SERIAL API
========================================================= */

router.get(
    "/documents/next-serial",
    requireAuth,
    (req, res) => {

        try {

            const serial =
                getNextSerialNumber();

            return res.json({
                success: true,
                serialNumber: serial,
                serialLabel:
                    formatSerial(serial)
            });

        } catch (error) {

            console.error(
                "Next serial error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to generate document serial."
            });
        }
    }
);

/* =========================================================
   CLIENTS
========================================================= */

router.get(
    "/documents/clients",
    requireAuth,
    (req, res) => {

        try {

            const rows =
                db.prepare(`
                    SELECT
                        id,
                        first_name,
                        middle_name,
                        last_name,
                        pan
                    FROM clients
                    WHERE status = 'active'
                    ORDER BY
                        first_name COLLATE NOCASE,
                        last_name COLLATE NOCASE
                `).all();

            const clients =
                rows.map(row => ({
                    id: row.id,

                    name:
                        displayName(
                            row.first_name,
                            row.middle_name,
                            row.last_name
                        ),

                    pan:
                        row.pan || ""
                }));

            return res.json({
                success: true,
                clients
            });

        } catch (error) {

            console.error(
                "Document clients error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load clients."
            });
        }
    }
);

/* =========================================================
   STAFF
========================================================= */

router.get(
    "/documents/staff",
    requireAuth,
    (req, res) => {

        try {

            const rows =
                db.prepare(`
                    SELECT
                        id,
                        username,
                        first_name,
                        middle_name,
                        last_name,
                        email,
                        role,
                        designation
                    FROM users
                    WHERE status = 'active'
                    ORDER BY
                        first_name COLLATE NOCASE,
                        last_name COLLATE NOCASE
                `).all();

            const staff =
                rows.map(row => ({
                    id: row.id,

                    name:
                        displayName(
                            row.first_name,
                            row.middle_name,
                            row.last_name
                        ) ||
                        row.username ||
                        "Staff",

                    username:
                        row.username || "",

                    email:
                        row.email || "",

                    role:
                        row.role || "",

                    designation:
                        row.designation || ""
                }));

            return res.json({
                success: true,
                staff
            });

        } catch (error) {

            console.error(
                "Document staff error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load staff."
            });
        }
    }
);

/* =========================================================
   EMPLOYEES
========================================================= */

router.get(
    "/documents/employees",
    requireAuth,
    (req, res) => {

        try {

            const rows =
                db.prepare(`
                    SELECT
                        id,
                        first_name,
                        middle_name,
                        last_name,
                        username
                    FROM users
                    WHERE
                        role = 'employee'
                        AND status = 'active'
                    ORDER BY
                        first_name COLLATE NOCASE,
                        last_name COLLATE NOCASE
                `).all();

            const employees =
                rows.map(row => ({
                    id: row.id,

                    name:
                        displayName(
                            row.first_name,
                            row.middle_name,
                            row.last_name
                        ) ||
                        row.username ||
                        "Employee"
                }));

            return res.json({
                success: true,
                employees
            });

        } catch (error) {

            console.error(
                "Document employees error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load employees."
            });
        }
    }
);

/* =========================================================
   GET DOCUMENTS
   THIS IS THE LIVE REGISTER API
========================================================= */

router.get(
    "/documents",
    requireAuth,
    (req, res) => {

        try {

            const rows =
                db.prepare(`
                    ${documentQuery()}

                    ORDER BY
                        d.serial_no DESC
                `).all();

            const documents =
                rows
                    .map(mapDocument)
                    .filter(Boolean);

            return res.json({

                success: true,

                documents,

                total:
                    documents.length,

                timestamp:
                    new Date().toISOString()
            });

        } catch (error) {

            console.error(
                "Get documents error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Unable to load documents."
            });
        }
    }
);

/* =========================================================
   CREATE DOCUMENT
========================================================= */

router.post(
    "/documents",
    requireAuth,
    (req, res) => {

        try {

            const body =
                req.body || {};

            const clientId =
                clean(body.clientId);

            const purpose =
                clean(body.purpose);

            const mode =
                clean(body.mode)
                    .toLowerCase();

            const receiptDate =
                clean(body.receiptDate);

            let dispatchDate =
                clean(body.dispatchDate);

            const completionDate =
                clean(body.completionDate);

            const receivingStaffId =
                clean(
                    body.receivingStaffId
                );

            const deliveringStaffId =
                clean(
                    body.deliveringStaffId
                );

            const assignedEmployeeId =
                clean(
                    body.assignedEmployeeId
                );

            /* ONLINE */

            if (mode === "online") {
                dispatchDate = "";
            }

            /* VALIDATION */

            if (!clientId) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Please select a client."
                });
            }

            if (!purpose) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Please select document purpose."
                });
            }

            if (
                mode !== "online" &&
                mode !== "offline"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Please select Online or Offline."
                });
            }

            if (!receiptDate) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Date of receipt is required."
                });
            }

            if (
                dispatchDate &&
                dispatchDate < receiptDate
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Dispatch date cannot be earlier than receipt date."
                });
            }

            if (
                completionDate &&
                completionDate < receiptDate
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Completion date cannot be earlier than receipt date."
                });
            }

            if (
                completionDate &&
                dispatchDate &&
                completionDate < dispatchDate
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Completion date cannot be earlier than dispatch date."
                });
            }

            /* CLIENT */

            const client =
                db.prepare(`
                    SELECT id
                    FROM clients
                    WHERE
                        id = ?
                        AND status = 'active'
                    LIMIT 1
                `).get(clientId);

            if (!client) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Selected client is not available."
                });
            }

            /* ASSIGNED EMPLOYEE */

            if (!assignedEmployeeId) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Please select the employee assigned to this document."
                });
            }

            const employee =
                db.prepare(`
                    SELECT id
                    FROM users
                    WHERE
                        id = ?
                        AND role = 'employee'
                        AND status = 'active'
                    LIMIT 1
                `).get(
                    assignedEmployeeId
                );

            if (!employee) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Selected employee is not available."
                });
            }

            /* RECEIVING STAFF */

            if (receivingStaffId) {

                const staff =
                    db.prepare(`
                        SELECT id
                        FROM users
                        WHERE
                            id = ?
                            AND status = 'active'
                        LIMIT 1
                    `).get(
                        receivingStaffId
                    );

                if (!staff) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Receiving staff member is not available."
                    });
                }
            }

            /* DELIVERING STAFF */

            if (deliveringStaffId) {

                const staff =
                    db.prepare(`
                        SELECT id
                        FROM users
                        WHERE
                            id = ?
                            AND status = 'active'
                        LIMIT 1
                    `).get(
                        deliveringStaffId
                    );

                if (!staff) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Delivering staff member is not available."
                    });
                }
            }

            /* CREATE */

            const documentId =
                generateId();

            const serialNumber =
                getNextSerialNumber();

            const now =
                new Date().toISOString();

            db.prepare(`
                INSERT INTO office_documents (

                    id,
                    serial_no,
                    client_id,
                    purpose,
                    mode,
                    receipt_date,
                    dispatch_date,
                    completion_date,
                    receiving_staff_id,
                    delivering_staff_id,
                    assigned_employee_id,
                    created_by,
                    created_at,
                    updated_at

                )

                VALUES (

                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?

                )
            `).run(

                documentId,

                serialNumber,

                clientId,

                purpose,

                mode,

                receiptDate,

                dispatchDate || null,

                completionDate || null,

                receivingStaffId || null,

                deliveringStaffId || null,

                assignedEmployeeId,

                req.user.id,

                now,

                now
            );

            /* FETCH CREATED RECORD */

            const created =
                db.prepare(`
                    ${documentQuery()}

                    WHERE
                        d.id = ?

                    LIMIT 1
                `).get(
                    documentId
                );

            /*
             * NEVER call mapDocument()
             * if the row doesn't exist.
             */

            if (!created) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Document was saved but could not be loaded."
                });
            }

            return res.status(201).json({

                success: true,

                message:
                    "Document saved successfully.",

                document:
                    mapDocument(created),

                serialNumber,

                serialLabel:
                    formatSerial(
                        serialNumber
                    )
            });

        } catch (error) {

            console.error(
                "Create document error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Unable to create document."
            });
        }
    }
);

/* =========================================================
   UPDATE DISPATCH DATE
========================================================= */

router.patch(
    "/documents/:id/dispatch-date",
    requireAuth,
    (req, res) => {

        try {

            const id =
                clean(req.params.id);

            const dispatchDate =
                clean(
                    req.body?.dispatchDate
                );

            const document =
                db.prepare(`
                    SELECT
                        id,
                        mode,
                        receipt_date,
                        completion_date
                    FROM office_documents
                    WHERE id = ?
                    LIMIT 1
                `).get(id);

            if (!document) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Document not found."
                });
            }

            if (
                document.mode === "online"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Online documents do not have a dispatch date."
                });
            }

            if (
                dispatchDate &&
                dispatchDate <
                    document.receipt_date
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Dispatch date cannot be earlier than receipt date."
                });
            }

            if (
                dispatchDate &&
                document.completion_date &&
                document.completion_date <
                    dispatchDate
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Dispatch date cannot be later than completion date."
                });
            }

            db.prepare(`
                UPDATE office_documents

                SET
                    dispatch_date = ?,
                    updated_at = ?

                WHERE
                    id = ?
            `).run(

                dispatchDate || null,

                new Date().toISOString(),

                id
            );

            const updated =
                db.prepare(`
                    ${documentQuery()}

                    WHERE
                        d.id = ?

                    LIMIT 1
                `).get(id);

            if (!updated) {

                return res.status(500).json({
                    success: false,
                    message:
                        "Document was updated but could not be reloaded."
                });
            }

            return res.json({

                success: true,

                document:
                    mapDocument(updated)
            });

        } catch (error) {

            console.error(
                "Dispatch update error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Unable to update dispatch date."
            });
        }
    }
);

/* =========================================================
   UPDATE COMPLETION DATE
========================================================= */

router.patch(
    "/documents/:id/completion-date",
    requireAuth,
    (req, res) => {

        try {

            const id =
                clean(req.params.id);

            const completionDate =
                clean(
                    req.body?.completionDate
                );

            const document =
                db.prepare(`
                    SELECT
                        id,
                        receipt_date,
                        dispatch_date
                    FROM office_documents
                    WHERE id = ?
                    LIMIT 1
                `).get(id);

            if (!document) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Document not found."
                });
            }

            if (
                completionDate &&
                completionDate <
                    document.receipt_date
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Completion date cannot be earlier than receipt date."
                });
            }

            if (
                completionDate &&
                document.dispatch_date &&
                completionDate <
                    document.dispatch_date
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Completion date cannot be earlier than dispatch date."
                });
            }

            db.prepare(`
                UPDATE office_documents

                SET
                    completion_date = ?,
                    updated_at = ?

                WHERE
                    id = ?
            `).run(

                completionDate || null,

                new Date().toISOString(),

                id
            );

            const updated =
                db.prepare(`
                    ${documentQuery()}

                    WHERE
                        d.id = ?

                    LIMIT 1
                `).get(id);

            if (!updated) {

                return res.status(500).json({
                    success: false,
                    message:
                        "Completion date was saved but document could not be reloaded."
                });
            }

            return res.json({

                success: true,

                message:
                    completionDate
                        ? "Document marked COMPLETE."
                        : "Document returned to W.I.P.",

                document:
                    mapDocument(updated)
            });

        } catch (error) {

            console.error(
                "Completion update error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Unable to update completion date."
            });
        }
    }
);

/* =========================================================
   DELETE DOCUMENT
========================================================= */

router.delete(
    "/documents/:id",
    requireAuth,
    (req, res) => {

        try {

            const id =
                clean(req.params.id);

            const existing =
                db.prepare(`
                    SELECT id
                    FROM office_documents
                    WHERE id = ?
                    LIMIT 1
                `).get(id);

            if (!existing) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Document not found."
                });
            }

            db.prepare(`
                DELETE FROM office_documents
                WHERE id = ?
            `).run(id);

            return res.json({

                success: true,

                message:
                    "Document deleted successfully."
            });

        } catch (error) {

            console.error(
                "Delete document error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Unable to delete document."
            });
        }
    }
);

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;