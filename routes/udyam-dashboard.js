const express = require("express");
const db = require("../database/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/*
=========================================================
UDYAM YEAR-WISE RECORDS
=========================================================
One record = one client + one year.
The Udyam number is read from the clients table.
*/

db.exec(`
    CREATE TABLE IF NOT EXISTS udyam_yearly_records (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        record_year INTEGER NOT NULL,
        date_of_renewal TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(client_id, record_year),
        FOREIGN KEY(client_id)
            REFERENCES clients(id)
            ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_udyam_year
    ON udyam_yearly_records(record_year);
`);

function clean(value) {
    return String(value ?? "").trim();
}

function normalizeYear(value) {
    const year = Number(value);
    if (Number.isInteger(year) && year >= 2000 && year <= 2100) {
        return year;
    }
    return new Date().getFullYear();
}

function validDate(value) {
    return value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function makeId() {
    return `UDYAM_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

function getColumns() {
    return db.prepare("PRAGMA table_info(clients)").all()
        .map(column => column.name);
}

function getUdyamColumn() {
    const columns = getColumns();

    const candidates = [
        "udyam",
        "udyam_number",
        "udyam_no",
        "udyamNumber",
        "udyam_registration",
        "udyam_registration_number"
    ];

    for (const candidate of candidates) {
        const found = columns.find(
            name => name.toLowerCase() === candidate.toLowerCase()
        );

        if (found) return found;
    }

    throw new Error(
        "Udyam column was not found in the clients table. " +
        "Add an Udyam field to client registration first."
    );
}

function syncRecords(year) {
    const udyamColumn = getUdyamColumn();

    const clients = db.prepare(`
        SELECT id
        FROM clients
        WHERE "${udyamColumn}" IS NOT NULL
          AND TRIM("${udyamColumn}") <> ''
    `).all();

    const exists = db.prepare(`
        SELECT id
        FROM udyam_yearly_records
        WHERE client_id = ?
          AND record_year = ?
    `);

    const insert = db.prepare(`
        INSERT INTO udyam_yearly_records
        (
            id,
            client_id,
            record_year,
            date_of_renewal,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, NULL, ?, ?)
    `);

    const now = new Date().toISOString();

    db.transaction(() => {
        for (const client of clients) {
            if (!exists.get(client.id, year)) {
                insert.run(
                    makeId(),
                    client.id,
                    year,
                    now,
                    now
                );
            }
        }
    })();
}

function getRecords(year) {
    year = normalizeYear(year);

    syncRecords(year);

    const udyamColumn = getUdyamColumn();

    const rows = db.prepare(`
        SELECT
            ur.id,
            ur.client_id,
            ur.record_year,
            ur.date_of_renewal,
            c.first_name,
            c.middle_name,
            c.last_name,
            c."${udyamColumn}" AS udyam_number
        FROM udyam_yearly_records ur
        INNER JOIN clients c
            ON c.id = ur.client_id
        WHERE ur.record_year = ?
          AND c."${udyamColumn}" IS NOT NULL
          AND TRIM(c."${udyamColumn}") <> ''
        ORDER BY
            c.first_name ASC,
            c.last_name ASC
    `).all(year);

    return rows.map(row => {
        const name = [
            row.first_name,
            row.middle_name,
            row.last_name
        ].filter(Boolean).join(" ").trim();

        return {
            id: row.id,
            clientId: row.client_id,
            year: row.record_year,
            name,
            udyamNumber: row.udyam_number,
            dateOfRenewal: row.date_of_renewal || "",
            status: row.date_of_renewal
                ? "RENEWAL DONE"
                : "RENEWAL PENDING"
        };
    });
}

/*
=========================================================
GET UDYAM
=========================================================
*/
router.get(
    "/udyam-dashboard",
    requireAuth,
    (req, res) => {
        try {
            const year = normalizeYear(req.query.year);

            res.json({
                success: true,
                year,
                records: getRecords(year)
            });
        } catch (error) {
            console.error("UDYAM GET ERROR:", error);

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Unable to load Udyam records."
            });
        }
    }
);

/*
=========================================================
SAVE ALL UDYAM RECORDS
=========================================================
*/
router.patch(
    "/udyam-dashboard/bulk",
    requireAuth,
    (req, res) => {
        try {
            const year = normalizeYear(req.body?.year);

            const records =
                Array.isArray(req.body?.records)
                    ? req.body.records
                    : [];

            syncRecords(year);

            const update = db.prepare(`
                UPDATE udyam_yearly_records
                SET
                    date_of_renewal = ?,
                    updated_at = ?
                WHERE id = ?
                  AND record_year = ?
            `);

            const now = new Date().toISOString();

            db.transaction(() => {
                for (const record of records) {
                    const id = clean(record.id);
                    const date = clean(record.dateOfRenewal);

                    if (!id) {
                        throw new Error(
                            "Invalid Udyam record ID."
                        );
                    }

                    if (!validDate(date)) {
                        throw new Error(
                            "Invalid Date of Renewal."
                        );
                    }

                    update.run(
                        date || null,
                        now,
                        id,
                        year
                    );
                }
            })();

            res.json({
                success: true,
                year,
                records: getRecords(year)
            });
        } catch (error) {
            console.error("UDYAM SAVE ERROR:", error);

            res.status(400).json({
                success: false,
                message:
                    error.message ||
                    "Unable to save Udyam records."
            });
        }
    }
);

module.exports = router;
