const express = require("express");
const db = require("../database/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/*
  FSSAI data is stored separately for every client + year.
  The FSSAI number itself comes from clients.fssai.
*/

function clean(v) {
  return String(v ?? "").trim();
}

function validYear(v) {
  const y = Number(v);
  return Number.isInteger(y) && y >= 2000 && y <= 2100;
}

function yearOf(v) {
  return validYear(v) ? Number(v) : new Date().getFullYear();
}

function validDate(v) {
  return v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function makeId() {
  return `FSSAI_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}


/* =========================================================
   SYNC CLIENTS HAVING FSSAI
========================================================= */

async function syncYear(year) {

  const clientsSnapshot =
    await db.collection("clients").get();

  const recordsSnapshot =
    await db.collection("fssai_yearly_records")
      .where("record_year", "==", year)
      .get();

  const existingClientIds = new Set();

  recordsSnapshot.forEach(doc => {
    const data = doc.data();

    if (data.client_id) {
      existingClientIds.add(data.client_id);
    }
  });


  const batch = db.batch();

  let hasChanges = false;

  clientsSnapshot.forEach(clientDoc => {

    const client = clientDoc.data();

    const clientId =
      client.id || clientDoc.id;

    const fssai =
      clean(client.fssai);

    if (!fssai) {
      return;
    }

    if (existingClientIds.has(clientId)) {
      return;
    }


    const id = makeId();

    const recordRef =
      db
        .collection("fssai_yearly_records")
        .doc(id);

    const now =
      new Date().toISOString();


    batch.set(recordRef, {

      id,

      client_id:
        clientId,

      record_year:
        year,

      date_of_expiry:
        null,

      renewal_date:
        null,

      new_expiry_date:
        null,

      created_at:
        now,

      updated_at:
        now

    });

    hasChanges = true;

  });


  if (hasChanges) {
    await batch.commit();
  }
}


/* =========================================================
   GET RECORDS
========================================================= */

async function getRecords(year) {

  year = yearOf(year);

  await syncYear(year);


  const [
    recordsSnapshot,
    clientsSnapshot
  ] = await Promise.all([

    db
      .collection("fssai_yearly_records")
      .where("record_year", "==", year)
      .get(),

    db
      .collection("clients")
      .get()

  ]);


  const clients = new Map();


  clientsSnapshot.forEach(doc => {

    const client =
      doc.data();

    const clientId =
      client.id || doc.id;

    clients.set(
      clientId,
      {
        ...client,
        id: clientId
      }
    );

  });


  const rows = [];


  recordsSnapshot.forEach(doc => {

    const record =
      doc.data();

    const client =
      clients.get(record.client_id);


    if (!client) {
      return;
    }


    const fssai =
      clean(client.fssai);


    if (!fssai) {
      return;
    }


    rows.push({

      id:
        record.id || doc.id,

      clientId:
        record.client_id,

      year:
        record.record_year,

      fssaiNumber:
        fssai,

      dateOfExpiry:
        record.date_of_expiry || "",

      renewalDate:
        record.renewal_date || "",

      newExpiryDate:
        record.new_expiry_date || "",

      status:
        record.date_of_expiry
          ? "ACTIVE"
          : "EXPIRED"

    });

  });


  rows.sort((a, b) =>
    a.fssaiNumber.localeCompare(
      b.fssaiNumber
    )
  );


  return rows;
}


/* =========================================================
   GET CURRENT SELECTED YEAR
========================================================= */

router.get(
  "/fssai-dashboard",
  requireAuth,
  async (req, res) => {

    try {

      const year =
        yearOf(req.query.year);


      res.json({

        success:
          true,

        year,

        records:
          await getRecords(year)

      });

    } catch (error) {

      console.error(
        "FSSAI GET ERROR:",
        error
      );


      res.status(500).json({

        success:
          false,

        message:
          error.message ||
          "Unable to load FSSAI records."

      });

    }

  }
);


/* =========================================================
   SAVE ALL ROWS
========================================================= */

router.patch(
  "/fssai-dashboard/bulk",
  requireAuth,
  async (req, res) => {

    try {

      const year =
        yearOf(req.body?.year);


      const records =
        Array.isArray(
          req.body?.records
        )
          ? req.body.records
          : [];


      await syncYear(year);


      const now =
        new Date().toISOString();


      const batch =
        db.batch();


      for (const record of records) {

        const id =
          clean(record.id);

        const expiry =
          clean(record.dateOfExpiry);

        const renewal =
          clean(record.renewalDate);

        const newExpiry =
          clean(record.newExpiryDate);


        if (!id) {
          throw new Error(
            "Invalid FSSAI record ID."
          );
        }


        if (!validDate(expiry)) {
          throw new Error(
            "Invalid Date of Expiry."
          );
        }


        if (!validDate(renewal)) {
          throw new Error(
            "Invalid Renewal Date."
          );
        }


        if (!validDate(newExpiry)) {
          throw new Error(
            "Invalid New Expiry Date."
          );
        }


        const recordRef =
          db
            .collection("fssai_yearly_records")
            .doc(id);


        batch.update(
          recordRef,
          {

            date_of_expiry:
              expiry || null,

            renewal_date:
              renewal || null,

            new_expiry_date:
              newExpiry || null,

            updated_at:
              now

          }
        );

      }


      if (records.length > 0) {
        await batch.commit();
      }


      res.json({

        success:
          true,

        year,

        records:
          await getRecords(year)

      });

    } catch (error) {

      console.error(
        "FSSAI SAVE ERROR:",
        error
      );


      res.status(400).json({

        success:
          false,

        message:
          error.message ||
          "Unable to save FSSAI records."

      });

    }

  }
);


module.exports = router;