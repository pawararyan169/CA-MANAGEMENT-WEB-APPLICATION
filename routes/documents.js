const express = require('express');
const crypto = require('crypto');

const db = require('../database/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/* =========================================================
   DOCUMENT REGISTER TABLE

   Created here so the existing database.js does not have to
   be rewritten. This is intentionally independent of the
   existing clients/tasks tables.
========================================================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS office_documents (

        id TEXT PRIMARY KEY,

        serial_no INTEGER NOT NULL UNIQUE,

        client_id TEXT NOT NULL,

        purpose TEXT NOT NULL,

        mode TEXT NOT NULL CHECK (mode IN ('online', 'offline')),

        receipt_date TEXT NOT NULL,

        dispatch_date TEXT,

        receiving_staff_id TEXT,

        delivering_staff_id TEXT,

        created_by TEXT NOT NULL,

        created_at TEXT NOT NULL,

        updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_office_documents_client
        ON office_documents(client_id);

    CREATE INDEX IF NOT EXISTS idx_office_documents_receipt
        ON office_documents(receipt_date);

    CREATE INDEX IF NOT EXISTS idx_office_documents_mode
        ON office_documents(mode);
`);


try {
    const documentColumns =
        db.prepare(`PRAGMA table_info(office_documents)`).all();

    if (
        !documentColumns.some(
            column => column.name === 'assigned_employee_id'
        )
    ) {
        db.exec(`
            ALTER TABLE office_documents
            ADD COLUMN assigned_employee_id TEXT
        `);
    }

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_office_documents_assigned_employee
            ON office_documents(assigned_employee_id);
    `);
} catch (migrationError) {
    console.error(
        'Document assigned employee migration error:',
        migrationError
    );
}

/* =========================================================
   DATE OF COMPLETION MIGRATION
========================================================= */

try {
    const documentColumns =
        db.prepare(`PRAGMA table_info(office_documents)`).all();

    if (
        !documentColumns.some(
            column => column.name === 'completion_date'
        )
    ) {
        db.exec(`
            ALTER TABLE office_documents
            ADD COLUMN completion_date TEXT
        `);
    }
} catch (completionMigrationError) {
    console.error(
        'Document completion date migration error:',
        completionMigrationError
    );
}

/* =========================================================
   HELPERS
========================================================= */

function clean(value) {
    return String(value ?? '').trim();
}


function generateId() {
    return `DOC${Date.now()}${crypto.randomInt(1000, 9999)}`;
}


function displayName(first, middle, last) {
    return [
        first,
        middle,
        last
    ]
        .filter(Boolean)
        .join(' ')
        .trim();
}


function formatSerial(serial) {
    return `DOC-${String(serial).padStart(6, '0')}`;
}


function mapDocument(row) {

    return {

        id: row.id,

        serialNumber: row.serial_no,

        serialLabel: formatSerial(row.serial_no),

        clientId: row.client_id,

        clientName: row.client_name || 'Unknown Client',

        clientPan: row.client_pan || '',

        purpose: row.purpose || '',

        mode: row.mode || '',

        receiptDate: row.receipt_date || '',

        dispatchDate: row.dispatch_date || '',

        completionDate:
            row.completion_date || '',

        status:
            row.completion_date
                ? 'COMPLETE'
                : 'W.I.P',

        receivingStaffId:
            row.receiving_staff_id || '',

        receivingStaff:
            row.receiving_staff_name || '',

        deliveringStaffId:
            row.delivering_staff_id || '',

        deliveringStaff:
            row.delivering_staff_name || '',

        assignedEmployeeId:
            row.assigned_employee_id || '',

        assignedEmployee:
            row.assigned_employee_name || '',

        createdBy:
            row.created_by || '',

        createdAt:
            row.created_at || '',

        updatedAt:
            row.updated_at || ''
    };
}


function documentQuery() {

    return `
        SELECT

            d.*,

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
                COALESCE(r.first_name, '') ||
                CASE
                    WHEN r.middle_name IS NOT NULL
                         AND r.middle_name != ''
                    THEN ' ' || r.middle_name
                    ELSE ''
                END ||
                CASE
                    WHEN r.last_name IS NOT NULL
                         AND r.last_name != ''
                    THEN ' ' || r.last_name
                    ELSE ''
                END
            ) AS receiving_staff_name,

            TRIM(
                COALESCE(del.first_name, '') ||
                CASE
                    WHEN del.middle_name IS NOT NULL
                         AND del.middle_name != ''
                    THEN ' ' || del.middle_name
                    ELSE ''
                END ||
                CASE
                    WHEN del.last_name IS NOT NULL
                         AND del.last_name != ''
                    THEN ' ' || del.last_name
                    ELSE ''
                END
            ) AS delivering_staff_name,

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


function getNextSerialNumber() {

    const result = db.prepare(`

        SELECT
            COALESCE(MAX(serial_no), 0) + 1 AS next_serial

        FROM office_documents

    `).get();


    return Number(result.next_serial || 1);
}


/* =========================================================
   GET NEXT SERIAL NUMBER
========================================================= */

router.get(
    '/documents/next-serial',
    requireAuth,
    (req, res) => {

        try {

            const nextSerial =
                getNextSerialNumber();


            return res.json({

                success: true,

                serialNumber: nextSerial,

                serialLabel:
                    formatSerial(nextSerial)
            });

        }
        catch (error) {

            console.error(
                'Get next document serial error:',
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    'Unable to generate document serial number.'
            });
        }
    }
);


/* =========================================================
   GET CLIENTS FOR DROPDOWN
========================================================= */

router.get(
    '/documents/clients',
    requireAuth,
    (req, res) => {

        try {

            const clients = db.prepare(`

                SELECT
                    id,
                    first_name,
                    middle_name,
                    last_name,
                    pan

                FROM clients

                WHERE
                    status = 'active'

                ORDER BY
                    first_name,
                    last_name

            `).all();


            return res.json({

                success: true,

                clients: clients.map(client => ({

                    id: client.id,

                    name: displayName(
                        client.first_name,
                        client.middle_name,
                        client.last_name
                    ),

                    pan: client.pan || ''
                }))
            });

        }
        catch (error) {

            console.error(
                'Get document clients error:',
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    'Unable to load clients.'
            });
        }
    }
);


/* =========================================================
   GET ACTIVE STAFF

   Both Admin and Employee can select staff. Admin is included
   because the office administrator can also receive/deliver
   documents.
========================================================= */

router.get(
    '/documents/staff',
    requireAuth,
    (req, res) => {

        try {

            const staff = db.prepare(`

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

                WHERE
                    status = 'active'

                ORDER BY
                    CASE
                        WHEN role = 'admin' THEN 0
                        ELSE 1
                    END,
                    first_name,
                    last_name

            `).all();


            return res.json({

                success: true,

                staff: staff.map(person => ({

                    id: person.id,

                    name: displayName(
                        person.first_name,
                        person.middle_name,
                        person.last_name
                    ) || person.username,

                    username:
                        person.username || '',

                    email:
                        person.email || '',

                    role:
                        person.role || 'employee',

                    designation:
                        person.designation || ''
                }))
            });

        }
        catch (error) {

            console.error(
                'Get document staff error:',
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    'Unable to load staff.'
            });
        }
    }
);


/* =========================================================
   GET DOCUMENTS

   Both Admin and Employee can see the office document register.
========================================================= */

router.get(
    '/documents',
    requireAuth,
    (req, res) => {

        try {

            const rows = db.prepare(`

                ${documentQuery()}

                ORDER BY
                    d.serial_no DESC

            `).all();


            return res.json({

                success: true,

                documents:
                    rows.map(mapDocument)
            });

        }
        catch (error) {

            console.error(
                'Get documents error:',
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    'Unable to load office documents.'
            });
        }
    }
);


/* =========================================================
   EMPLOYEES FOR DOCUMENT ASSIGNMENT
========================================================= */

router.get(
    '/documents/employees',
    requireAuth,
    (req, res) => {

        try {

            const rows = db.prepare(`
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
                'Document employees error:',
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
   CREATE DOCUMENT

   Both Admin and Employee can create a document register entry.
========================================================= */

router.post(
    '/documents',
    requireAuth,
    (req, res) => {

        try {

            const body = req.body || {};

            const clientId =
                clean(body.clientId);

            const purpose =
                clean(body.purpose);

            const mode =
                clean(body.mode).toLowerCase();

            const receiptDate =
                clean(body.receiptDate);

            const requestedDispatchDate =
                clean(body.dispatchDate);

            const completionDate =
                clean(body.completionDate);

            /*
             * Online documents never have a dispatch date.
             * Enforce this on the server as well so the rule
             * cannot be bypassed by a direct API request.
             */
            const dispatchDate =
                mode === 'online'
                    ? ''
                    : requestedDispatchDate;

            const receivingStaffId =
                clean(body.receivingStaffId);

            const deliveringStaffId =
                clean(body.deliveringStaffId);

            const assignedEmployeeId =
                clean(body.assignedEmployeeId);

            if (!assignedEmployeeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Please select the employee assigned to this document.'
                });
            }

            const assignedEmployee =
                db.prepare(`
                    SELECT id
                    FROM users
                    WHERE
                        id = ?
                        AND role = 'employee'
                        AND status = 'active'
                    LIMIT 1
                `).get(assignedEmployeeId);

            if (!assignedEmployee) {
                return res.status(400).json({
                    success: false,
                    message: 'Selected employee is not available.'
                });
            }


            if (!clientId) {

                return res.status(400).json({
                    success: false,
                    message: 'Please select a client.'
                });
            }


            if (!purpose) {

                return res.status(400).json({
                    success: false,
                    message: 'Please select the document purpose.'
                });
            }


            if (!['online', 'offline'].includes(mode)) {

                return res.status(400).json({
                    success: false,
                    message: 'Please select a valid document mode.'
                });
            }


            if (!receiptDate) {

                return res.status(400).json({
                    success: false,
                    message: 'Date of receipt is required.'
                });
            }


            if (
                completionDate &&
                completionDate < receiptDate
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Date of completion cannot be earlier than the date of receipt.'
                });
            }

            if (
                dispatchDate &&
                completionDate &&
                completionDate < dispatchDate
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Date of completion cannot be earlier than the date of dispatch.'
                });
            }

            if (
                dispatchDate &&
                dispatchDate < receiptDate
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Date of dispatch cannot be earlier than the date of receipt.'
                });
            }


            const client = db.prepare(`

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
                    message: 'Selected client is not available.'
                });
            }


            if (receivingStaffId) {

                const staff = db.prepare(`

                    SELECT id
                    FROM users
                    WHERE
                        id = ?
                        AND status = 'active'
                    LIMIT 1

                `).get(receivingStaffId);


                if (!staff) {

                    return res.status(400).json({
                        success: false,
                        message:
                            'Selected receiving staff member is not available.'
                    });
                }
            }


            if (deliveringStaffId) {

                const staff = db.prepare(`

                    SELECT id
                    FROM users
                    WHERE
                        id = ?
                        AND status = 'active'
                    LIMIT 1

                `).get(deliveringStaffId);


                if (!staff) {

                    return res.status(400).json({
                        success: false,
                        message:
                            'Selected delivering staff member is not available.'
                    });
                }
            }


            const now =
                new Date().toISOString();

            const documentId =
                generateId();


            /*
             * Generate the serial inside a transaction so the
             * serial number and document row are created together.
             */
            const createDocument = db.transaction(() => {

                const serialNumber =
                    getNextSerialNumber();


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
                    receivingStaffId || null,
                    deliveringStaffId || null,
                    assignedEmployeeId,
                    req.user.id,
                    now,
                    now
                );


                return serialNumber;
            });


            const serialNumber =
                createDocument();


            const created = db.prepare(`

                ${documentQuery()}

                WHERE d.id = ?

                LIMIT 1

            `).get(documentId);


            return res.status(201).json({

                success: true,

                message:
                    'Document record created successfully.',

                document:
                    mapDocument(created),

                serialNumber,

                serialLabel:
                    formatSerial(serialNumber)
            });

        }
        catch (error) {

            console.error(
                'Create document error:',
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    'Unable to create document record.'
            });
        }
    }
);



/* =========================================================
   UPDATE DISPATCH DATE
========================================================= */

router.patch(
    '/documents/:id/dispatch-date',
    requireAuth,
    (req, res) => {

        try {

            const documentId = clean(req.params.id);
            const dispatchDate = clean(req.body?.dispatchDate);

            const document = db.prepare(`
                SELECT id, mode, receipt_date
                FROM office_documents
                WHERE id = ?
                LIMIT 1
            `).get(documentId);

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Document record not found.'
                });
            }

            if (document.mode === 'online') {
                return res.status(400).json({
                    success: false,
                    message: 'Dispatch date is not applicable for online documents.'
                });
            }

            if (dispatchDate && dispatchDate < document.receipt_date) {
                return res.status(400).json({
                    success: false,
                    message: 'Date of dispatch cannot be earlier than the date of receipt.'
                });
            }

            db.prepare(`
                UPDATE office_documents
                SET dispatch_date = ?, updated_at = ?
                WHERE id = ?
            `).run(
                dispatchDate || null,
                new Date().toISOString(),
                documentId
            );

            const updated = db.prepare(`
                ${documentQuery()}
                WHERE d.id = ?
                LIMIT 1
            `).get(documentId);

            return res.json({
                success: true,
                message: 'Dispatch date updated successfully.',
                document: mapDocument(updated)
            });

        } catch (error) {

            console.error('Update dispatch date error:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to update dispatch date.'
            });
        }
    }
);


/* =========================================================
   UPDATE DATE OF COMPLETION
========================================================= */

router.patch(
    '/documents/:id/completion-date',
    requireAuth,
    (req, res) => {

        try {

            const documentId =
                clean(req.params.id);

            const completionDate =
                clean(req.body?.completionDate);

            const document =
                db.prepare(`
                    SELECT
                        id,
                        receipt_date,
                        dispatch_date
                    FROM office_documents
                    WHERE id = ?
                    LIMIT 1
                `).get(documentId);

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Document record not found.'
                });
            }

            if (
                completionDate &&
                completionDate < document.receipt_date
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Date of completion cannot be earlier than the date of receipt.'
                });
            }

            if (
                completionDate &&
                document.dispatch_date &&
                completionDate < document.dispatch_date
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Date of completion cannot be earlier than the date of dispatch.'
                });
            }

            db.prepare(`
                UPDATE office_documents
                SET
                    completion_date = ?,
                    updated_at = ?
                WHERE id = ?
            `).run(
                completionDate || null,
                new Date().toISOString(),
                documentId
            );

            const updated =
                db.prepare(`
                    ${documentQuery()}
                    WHERE d.id = ?
                    LIMIT 1
                `).get(documentId);

            return res.json({
                success: true,
                message:
                    completionDate
                        ? 'Document marked complete.'
                        : 'Document returned to W.I.P.',
                document:
                    mapDocument(updated)
            });

        } catch (error) {

            console.error(
                'Update completion date error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Unable to update completion date.'
            });
        }
    }
);


module.exports = router;
