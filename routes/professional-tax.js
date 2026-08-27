const express = require("express");
const db = require("../database/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/*
=========================================================
YEAR-WISE PROFESSIONAL TAX TABLE
=========================================================

One record is maintained for:

CLIENT + TAX TYPE + YEAR

tax_type:
    PTEC
    PTRC
*/

db.exec(`
    CREATE TABLE IF NOT EXISTS professional_tax_yearly_records (

        id TEXT PRIMARY KEY,

        client_id TEXT NOT NULL,

        tax_type TEXT NOT NULL,

        record_year INTEGER NOT NULL,

        date_of_payment TEXT,

        created_at TEXT NOT NULL,

        updated_at TEXT NOT NULL,

        UNIQUE(
            client_id,
            tax_type,
            record_year
        ),

        FOREIGN KEY(client_id)
            REFERENCES clients(id)
            ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS
    idx_professional_tax_year_type
    ON professional_tax_yearly_records(
        record_year,
        tax_type
    );
`);


/*
=========================================================
HELPERS
=========================================================
*/

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


function validYear(value) {

    const year =
        Number(value);

    return (
        Number.isInteger(year) &&
        year >= 2000 &&
        year <= 2100
    );

}


function normalizeYear(value) {

    return validYear(value)
        ? Number(value)
        : new Date().getFullYear();

}


function normalizeType(value) {

    const type =
        clean(value).toUpperCase();

    if (
        type !== "PTEC" &&
        type !== "PTRC"
    ) {

        throw new Error(
            "Invalid professional tax type."
        );

    }

    return type;

}


function validDate(value) {

    return (
        value === "" ||
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    );

}


function makeId() {

    return (
        "PTAX_" +
        Date.now() +
        "_" +
        Math.floor(
            Math.random() * 1000000
        )
    );

}


/*
=========================================================
CLIENT COLUMN DETECTION

This allows the route to work even if your client
number column uses a slightly different naming style.
=========================================================
*/

function getClientColumns() {

    const columns =
        db.prepare(
            "PRAGMA table_info(clients)"
        ).all();

    return columns.map(
        column => column.name
    );

}


function findColumn(
    columns,
    candidates
) {

    for (
        const candidate
        of candidates
    ) {

        const found =
            columns.find(
                column =>
                    column.toLowerCase() ===
                    candidate.toLowerCase()
            );

        if (found) {

            return found;

        }

    }

    return null;

}


function getTaxColumn(type) {

    const columns =
        getClientColumns();

    if (type === "PTEC") {

        const column =
            findColumn(
                columns,
                [
                    "ptec",
                    "ptec_number",
                    "ptec_no",
                    "ptecNumber"
                ]
            );

        if (!column) {

            throw new Error(
                "PTEC column was not found in clients table."
            );

        }

        return column;

    }


    const column =
        findColumn(
            columns,
            [
                "ptrc",
                "ptrc_number",
                "ptrc_no",
                "ptrcNumber"
            ]
        );

    if (!column) {

        throw new Error(
            "PTRC column was not found in clients table."
        );

    }

    return column;

}


/*
=========================================================
SYNC CLIENTS INTO YEARLY RECORDS
=========================================================
*/

function syncRecords(
    year,
    type
) {

    const taxColumn =
        getTaxColumn(type);

    /*
     Column name comes only from the actual
     database schema above, not user input.
    */

    const clients =
        db.prepare(`
            SELECT
                id,
                first_name,
                middle_name,
                last_name,
                "${taxColumn}" AS tax_number
            FROM clients
            WHERE "${taxColumn}" IS NOT NULL
            AND TRIM("${taxColumn}") <> ''
        `).all();


    const findExisting =
        db.prepare(`
            SELECT id
            FROM professional_tax_yearly_records
            WHERE client_id = ?
            AND tax_type = ?
            AND record_year = ?
        `);


    const insert =
        db.prepare(`
            INSERT INTO professional_tax_yearly_records
            (
                id,
                client_id,
                tax_type,
                record_year,
                date_of_payment,
                created_at,
                updated_at
            )
            VALUES (
                ?,
                ?,
                ?,
                ?,
                NULL,
                ?,
                ?
            )
        `);


    const now =
        new Date().toISOString();


    db.transaction(() => {

        for (
            const client
            of clients
        ) {

            const existing =
                findExisting.get(
                    client.id,
                    type,
                    year
                );


            if (!existing) {

                insert.run(
                    makeId(),
                    client.id,
                    type,
                    year,
                    now,
                    now
                );

            }

        }

    })();

}


/*
=========================================================
GET RECORDS
=========================================================
*/

function getRecords(
    year,
    type
) {

    year =
        normalizeYear(year);

    type =
        normalizeType(type);


    syncRecords(
        year,
        type
    );


    const taxColumn =
        getTaxColumn(type);


    const rows =
        db.prepare(`
            SELECT

                pt.id,

                pt.client_id,

                pt.record_year,

                pt.date_of_payment,

                c.first_name,

                c.middle_name,

                c.last_name,

                c."${taxColumn}" AS tax_number

            FROM professional_tax_yearly_records pt

            INNER JOIN clients c
                ON c.id = pt.client_id

            WHERE pt.record_year = ?

            AND pt.tax_type = ?

            AND c."${taxColumn}" IS NOT NULL

            AND TRIM(
                c."${taxColumn}"
            ) <> ''

            ORDER BY
                c.first_name ASC,
                c.last_name ASC

        `).all(
            year,
            type
        );


    return rows.map(
        row => {

            const name = [
                row.first_name,
                row.middle_name,
                row.last_name
            ]
            .filter(Boolean)
            .join(" ")
            .trim();


            return {

                id:
                    row.id,

                clientId:
                    row.client_id,

                year:
                    row.record_year,

                name,

                taxNumber:
                    row.tax_number,

                dateOfPayment:
                    row.date_of_payment ||
                    "",

                status:
                    row.date_of_payment
                        ? "PAYMENT DONE"
                        : "PAYMENT PENDING"

            };

        }
    );

}


/*
=========================================================
GET PTEC
=========================================================
*/

router.get(
    "/ptec-dashboard",
    requireAuth,
    (req, res) => {

        try {

            const year =
                normalizeYear(
                    req.query.year
                );


            res.json({

                success:
                    true,

                taxType:
                    "PTEC",

                year,

                records:
                    getRecords(
                        year,
                        "PTEC"
                    )

            });

        }
        catch (error) {

            console.error(
                "PTEC GET ERROR:",
                error
            );


            res.status(500).json({

                success:
                    false,

                message:
                    error.message ||
                    "Unable to load PTEC records."

            });

        }

    }
);


/*
=========================================================
GET PTRC
=========================================================
*/

router.get(
    "/ptrc-dashboard",
    requireAuth,
    (req, res) => {

        try {

            const year =
                normalizeYear(
                    req.query.year
                );


            res.json({

                success:
                    true,

                taxType:
                    "PTRC",

                year,

                records:
                    getRecords(
                        year,
                        "PTRC"
                    )

            });

        }
        catch (error) {

            console.error(
                "PTRC GET ERROR:",
                error
            );


            res.status(500).json({

                success:
                    false,

                message:
                    error.message ||
                    "Unable to load PTRC records."

            });

        }

    }
);


/*
=========================================================
SAVE PTEC
=========================================================
*/

router.patch(
    "/ptec-dashboard/bulk",
    requireAuth,
    (req, res) => {

        saveRecords(
            req,
            res,
            "PTEC"
        );

    }
);


/*
=========================================================
SAVE PTRC
=========================================================
*/

router.patch(
    "/ptrc-dashboard/bulk",
    requireAuth,
    (req, res) => {

        saveRecords(
            req,
            res,
            "PTRC"
        );

    }
);


/*
=========================================================
COMMON SAVE FUNCTION
=========================================================
*/

function saveRecords(
    req,
    res,
    type
) {

    try {

        const year =
            normalizeYear(
                req.body?.year
            );


        const records =
            Array.isArray(
                req.body?.records
            )
                ? req.body.records
                : [];


        syncRecords(
            year,
            type
        );


        const update =
            db.prepare(`
                UPDATE
                    professional_tax_yearly_records

                SET
                    date_of_payment = ?,
                    updated_at = ?

                WHERE id = ?

                AND tax_type = ?

                AND record_year = ?
            `);


        const now =
            new Date().toISOString();


        db.transaction(() => {

            for (
                const record
                of records
            ) {

                const id =
                    clean(record.id);

                const date =
                    clean(
                        record.dateOfPayment
                    );


                if (!id) {

                    throw new Error(
                        "Invalid record ID."
                    );

                }


                if (!validDate(date)) {

                    throw new Error(
                        "Date of Payment must use YYYY-MM-DD."
                    );

                }


                update.run(

                    date || null,

                    now,

                    id,

                    type,

                    year

                );

            }

        })();


        res.json({

            success:
                true,

            taxType:
                type,

            year,

            records:
                getRecords(
                    year,
                    type
                )

        });

    }
    catch (error) {

        console.error(
            `${type} SAVE ERROR:`,
            error
        );


        res.status(400).json({

            success:
                false,

            message:
                error.message ||
                `Unable to save ${type} records.`

        });

    }

}


module.exports = router;