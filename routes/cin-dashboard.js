const express = require("express");

const db =
    require("../database/database");

const {
    requireAuth
} = require("../middleware/auth");

const router =
    express.Router();


/* =========================================================
   CREATE CIN TABLE
========================================================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS cin_records (

        id TEXT PRIMARY KEY,

        client_id TEXT NOT NULL UNIQUE,

        annual_filing_date TEXT,

        created_at TEXT NOT NULL,

        updated_at TEXT NOT NULL,

        FOREIGN KEY(client_id)
            REFERENCES clients(id)
            ON DELETE CASCADE

    );
`);


/* =========================================================
   HELPERS
========================================================= */

function clean(value) {

    return String(
        value ?? ""
    ).trim();

}


function isValidDate(value) {

    return (
        value === "" ||
        /^\\d{4}-\\d{2}-\\d{2}$/.test(value)
    );

}


function makeId() {

    return (
        "CIN" +
        Date.now() +
        Math.floor(
            Math.random() * 10000
        )
    );

}


/* =========================================================
   SYNC CLIENTS HAVING CIN
========================================================= */

function syncCinRecords() {

    const clients =
        db.prepare(`
            SELECT id
            FROM clients

            WHERE cin IS NOT NULL
              AND TRIM(cin) <> ''
        `).all();


    const find =
        db.prepare(`
            SELECT id
            FROM cin_records

            WHERE client_id = ?
        `);


    const insert =
        db.prepare(`
            INSERT INTO cin_records
            (
                id,
                client_id,
                created_at,
                updated_at
            )

            VALUES
            (?, ?, ?, ?)
        `);


    const now =
        new Date().toISOString();


    db.transaction(() => {

        clients.forEach(client => {

            const existing =
                find.get(
                    client.id
                );


            if (!existing) {

                insert.run(
                    makeId(),
                    client.id,
                    now,
                    now
                );

            }

        });

    })();

}


/* =========================================================
   GET RECORDS
========================================================= */

function getRecords() {

    syncCinRecords();


    return db.prepare(`
        SELECT

            cr.id,

            cr.client_id,

            c.cin,

            cr.annual_filing_date,

            c.first_name,

            c.middle_name,

            c.last_name

        FROM cin_records cr

        INNER JOIN clients c

            ON c.id =
               cr.client_id

        WHERE c.cin IS NOT NULL

          AND TRIM(c.cin) <> ''

        ORDER BY
            c.cin ASC

    `).all().map(row => ({

        id:
            row.id,

        clientId:
            row.client_id,

        cin:
            row.cin,

        partyName:
            [
                row.first_name,
                row.middle_name,
                row.last_name
            ]
                .filter(Boolean)
                .join(" "),

        annualFilingDate:
            row.annual_filing_date ||
            "",

        status:
            row.annual_filing_date
                ? "FILED"
                : "PENDING"

    }));

}


/* =========================================================
   GET API
========================================================= */

router.get(
    "/cin-dashboard",
    requireAuth,
    (req, res) => {

        try {

            const records =
                getRecords();


            res.json({

                success:
                    true,

                records

            });


        } catch (error) {

            console.error(
                "CIN dashboard GET:",
                error
            );


            res.status(500).json({

                success:
                    false,

                message:
                    error.message ||
                    "Unable to load CIN records."

            });

        }

    }
);


/* =========================================================
   SAVE ALL
========================================================= */

router.patch(
    "/cin-dashboard/bulk",
    requireAuth,
    (req, res) => {

        try {

            const records =
                Array.isArray(
                    req.body?.records
                )
                    ? req.body.records
                    : [];


            const update =
                db.prepare(`
                    UPDATE cin_records

                    SET
                        annual_filing_date = ?,
                        updated_at = ?

                    WHERE id = ?
                `);


            const now =
                new Date().toISOString();


            db.transaction(() => {

                records.forEach(record => {

                    const date =
                        clean(
                            record.annualFilingDate
                        );


                    if (
                        !isValidDate(date)
                    ) {

                        throw new Error(
                            "Annual Filing Date must use YYYY-MM-DD."
                        );

                    }


                    update.run(
                        date || null,
                        now,
                        clean(record.id)
                    );

                });

            })();


            res.json({

                success:
                    true,

                records:
                    getRecords()

            });


        } catch (error) {

            console.error(
                "CIN dashboard SAVE:",
                error
            );


            res.status(400).json({

                success:
                    false,

                message:
                    error.message ||
                    "Unable to save CIN records."

            });

        }

    }
);


module.exports =
    router;