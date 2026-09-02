const express = require("express");

const db = require("../database/database");

const {
    requireAuth
} = require("../middleware/auth");

const router = express.Router();


/* =========================================================
   HELPERS
========================================================= */

function clean(value) {
    return String(value ?? "").trim();
}


function isValidDate(value) {
    return (
        value === "" ||
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    );
}


function makeId() {
    return (
        "CIN" +
        Date.now() +
        Math.floor(Math.random() * 10000)
    );
}


/* =========================================================
   SYNC CLIENTS HAVING CIN
========================================================= */

async function syncCinRecords() {

    const clientsSnapshot =
        await db.collection("clients").get();

    const cinSnapshot =
        await db.collection("cin_records").get();

    const existingClientIds = new Set();

    cinSnapshot.forEach(doc => {
        const data = doc.data();

        if (data.client_id) {
            existingClientIds.add(data.client_id);
        }
    });

    const batch = db.batch();

    let hasChanges = false;

    clientsSnapshot.forEach(clientDoc => {

        const client = clientDoc.data();

        if (
            client.cin !== null &&
            client.cin !== undefined &&
            clean(client.cin) !== ""
        ) {

            const clientId =
                client.id || clientDoc.id;

            if (!existingClientIds.has(clientId)) {

                const id = makeId();

                const recordRef =
                    db.collection("cin_records").doc(id);

                const now =
                    new Date().toISOString();

                batch.set(recordRef, {
                    id,
                    client_id: clientId,
                    annual_filing_date: null,
                    created_at: now,
                    updated_at: now
                });

                hasChanges = true;
            }
        }

    });

    if (hasChanges) {
        await batch.commit();
    }
}


/* =========================================================
   GET RECORDS
========================================================= */

async function getRecords() {

    await syncCinRecords();

    const [
        cinSnapshot,
        clientsSnapshot
    ] = await Promise.all([
        db.collection("cin_records").get(),
        db.collection("clients").get()
    ]);

    const clients = new Map();

    clientsSnapshot.forEach(doc => {

        const client = doc.data();

        const clientId =
            client.id || doc.id;

        clients.set(clientId, {
            ...client,
            id: clientId
        });

    });


    const records = [];

    cinSnapshot.forEach(doc => {

        const record =
            doc.data();

        const client =
            clients.get(record.client_id);

        if (!client) {
            return;
        }


        const cin =
            clean(client.cin);

        if (!cin) {
            return;
        }


        records.push({

            id:
                record.id || doc.id,

            clientId:
                record.client_id,

            cin,

            partyName:
                [
                    client.first_name,
                    client.middle_name,
                    client.last_name
                ]
                    .filter(Boolean)
                    .join(" "),

            annualFilingDate:
                record.annual_filing_date || "",

            status:
                record.annual_filing_date
                    ? "FILED"
                    : "PENDING"

        });

    });


    records.sort((a, b) =>
        a.cin.localeCompare(b.cin)
    );


    return records;
}


/* =========================================================
   GET API
========================================================= */

router.get(
    "/cin-dashboard",
    requireAuth,
    async (req, res) => {

        try {

            const records =
                await getRecords();


            res.json({

                success: true,

                records

            });


        } catch (error) {

            console.error(
                "CIN dashboard GET:",
                error
            );


            res.status(500).json({

                success: false,

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
    async (req, res) => {

        try {

            const records =
                Array.isArray(
                    req.body?.records
                )
                    ? req.body.records
                    : [];


            const now =
                new Date().toISOString();


            const batch =
                db.batch();


            records.forEach(record => {

                const date =
                    clean(
                        record.annualFilingDate
                    );


                if (!isValidDate(date)) {

                    throw new Error(
                        "Annual Filing Date must use YYYY-MM-DD."
                    );

                }


                const id =
                    clean(record.id);


                if (!id) {
                    return;
                }


                const recordRef =
                    db
                        .collection("cin_records")
                        .doc(id);


                batch.update(
                    recordRef,
                    {
                        annual_filing_date:
                            date || null,

                        updated_at:
                            now
                    }
                );

            });


            await batch.commit();


            res.json({

                success: true,

                records:
                    await getRecords()

            });


        } catch (error) {

            console.error(
                "CIN dashboard SAVE:",
                error
            );


            res.status(400).json({

                success: false,

                message:
                    error.message ||
                    "Unable to save CIN records."

            });

        }

    }
);


module.exports = router;