const express = require("express");
const db = require("../database/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/*
=========================================================
TAN YEAR-WISE QUARTERLY FILING RECORDS
=========================================================
One record = one client + one financial/reporting year.
The TAN number is read from the clients table.
*/

db.exec(`
    CREATE TABLE IF NOT EXISTS tan_yearly_records (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        record_year INTEGER NOT NULL,
        q1_filing_date TEXT,
        q2_filing_date TEXT,
        q3_filing_date TEXT,
        q4_filing_date TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,

        UNIQUE(client_id, record_year),

        FOREIGN KEY(client_id)
            REFERENCES clients(id)
            ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tan_year
    ON tan_yearly_records(record_year);
`);

function clean(value) {
    return String(value ?? "").trim();
}

function normalizeYear(value) {
    const year = Number(value);

    if (
        Number.isInteger(year) &&
        year >= 2000 &&
        year <= 2100
    ) {
        return year;
    }

    return new Date().getFullYear();
}

function validDate(value) {
    return (
        value === "" ||
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    );
}

function makeId() {
    return (
        "TAN_" +
        Date.now() +
        "_" +
        Math.floor(Math.random() * 1000000)
    );
}

function getTanColumn() {
    const columns = db.prepare(
        "PRAGMA table_info(clients)"
    ).all().map(c => c.name);

    const candidates = [
        "tan",
        "tan_number",
        "tan_no",
        "tanNumber"
    ];

    for (const candidate of candidates) {
        const found = columns.find(
            name =>
                name.toLowerCase() ===
                candidate.toLowerCase()
        );

        if (found) return found;
    }

    throw new Error(
        "TAN column was not found in the clients table. " +
        "Add a TAN field to client registration first."
    );
}

function syncRecords(year) {
    const tanColumn = getTanColumn();

    const clients = db.prepare(`
        SELECT id
        FROM clients
        WHERE "${tanColumn}" IS NOT NULL
          AND TRIM("${tanColumn}") <> ''
    `).all();

    const exists = db.prepare(`
        SELECT id
        FROM tan_yearly_records
        WHERE client_id = ?
          AND record_year = ?
    `);

    const insert = db.prepare(`
        INSERT INTO tan_yearly_records
        (
            id,
            client_id,
            record_year,
            q1_filing_date,
            q2_filing_date,
            q3_filing_date,
            q4_filing_date,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, NULL, NULL, NULL, NULL, ?, ?)
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

    const tanColumn = getTanColumn();

    const rows = db.prepare(`
        SELECT
            tr.id,
            tr.client_id,
            tr.record_year,
            tr.q1_filing_date,
            tr.q2_filing_date,
            tr.q3_filing_date,
            tr.q4_filing_date,

            c.first_name,
            c.middle_name,
            c.last_name,

            c."${tanColumn}" AS tan_number

        FROM tan_yearly_records tr

        INNER JOIN clients c
            ON c.id = tr.client_id

        WHERE tr.record_year = ?

          AND c."${tanColumn}" IS NOT NULL

          AND TRIM(c."${tanColumn}") <> ''

        ORDER BY
            c.first_name ASC,
            c.last_name ASC
    `).all(year);

    return rows.map(row => {
        const name = [
            row.first_name,
            row.middle_name,
            row.last_name
        ]
            .filter(Boolean)
            .join(" ")
            .trim();

        let status = "Q1 FILING PENDING";

        if (row.q1_filing_date) {
            status = "Q2 FILING PENDING";
        }

        if (row.q2_filing_date) {
            status = "Q3 FILING PENDING";
        }

        if (row.q3_filing_date) {
            status = "Q4 FILING PENDING";
        }

        if (row.q4_filing_date) {
            status = "Q4 FILLED";
        }

        return {
            id: row.id,
            clientId: row.client_id,
            year: row.record_year,
            name,
            tanNumber: row.tan_number,
            q1FilingDate: row.q1_filing_date || "",
            q2FilingDate: row.q2_filing_date || "",
            q3FilingDate: row.q3_filing_date || "",
            q4FilingDate: row.q4_filing_date || "",
            status
        };
    });
}

/*
=========================================================
GET TAN DASHBOARD
=========================================================
*/
router.get(
    "/tan-dashboard",
    requireAuth,
    (req, res) => {
        try {
            const year =
                normalizeYear(req.query.year);

            res.json({
                success: true,
                year,
                records: getRecords(year)
            });
        } catch (error) {
            console.error(
                "TAN GET ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Unable to load TAN records."
            });
        }
    }
);

/*
=========================================================
SAVE ALL TAN RECORDS
=========================================================
*/
router.patch(
    "/tan-dashboard/bulk",
    requireAuth,
    (req, res) => {
        try {
            const year =
                normalizeYear(req.body?.year);

            const records =
                Array.isArray(req.body?.records)
                    ? req.body.records
                    : [];

            syncRecords(year);

            const update = db.prepare(`
                UPDATE tan_yearly_records

                SET
                    q1_filing_date = ?,
                    q2_filing_date = ?,
                    q3_filing_date = ?,
                    q4_filing_date = ?,
                    updated_at = ?

                WHERE id = ?

                  AND record_year = ?
            `);

            const now =
                new Date().toISOString();

            db.transaction(() => {
                for (const record of records) {
                    const id =
                        clean(record.id);

                    const q1 =
                        clean(record.q1FilingDate);

                    const q2 =
                        clean(record.q2FilingDate);

                    const q3 =
                        clean(record.q3FilingDate);

                    const q4 =
                        clean(record.q4FilingDate);

                    if (!id) {
                        throw new Error(
                            "Invalid TAN record ID."
                        );
                    }

                    if (
                        !validDate(q1) ||
                        !validDate(q2) ||
                        !validDate(q3) ||
                        !validDate(q4)
                    ) {
                        throw new Error(
                            "Invalid TAN filing date."
                        );
                    }

                    /*
                    Keep the workflow sequential.
                    A later quarter cannot be filled
                    before its previous quarter.
                    */
                    if (q2 && !q1) {
                        throw new Error(
                            "Q1 filing date must be entered before Q2."
                        );
                    }

                    if (q3 && !q2) {
                        throw new Error(
                            "Q2 filing date must be entered before Q3."
                        );
                    }

                    if (q4 && !q3) {
                        throw new Error(
                            "Q3 filing date must be entered before Q4."
                        );
                    }

                    update.run(
                        q1 || null,
                        q2 || null,
                        q3 || null,
                        q4 || null,
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
            console.error(
                "TAN SAVE ERROR:",
                error
            );

            res.status(400).json({
                success: false,
                message:
                    error.message ||
                    "Unable to save TAN records."
            });
        }
    }
);

module.exports = router;
