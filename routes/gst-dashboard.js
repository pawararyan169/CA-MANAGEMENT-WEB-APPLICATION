const express = require("express");
const crypto = require("crypto");
const db = require("../database/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const clean = value => String(value ?? "").trim();

const validMonth = value =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

const validDate = value =>
  value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value);

const REGISTRATION_TYPES =
  new Set(["REGULAR", "COMPOSITION"]);

const FREQUENCIES =
  new Set(["MONTHLY", "QUARTERLY"]);


function currentMonth() {
  const d = new Date();

  return `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}`;
}


function generateId(prefix) {
  return `${prefix}${Date.now()}${crypto.randomInt(1000, 9999)}`;
}


/* =========================================================
   SYNC GST PROFILES
========================================================= */

async function syncProfiles() {

  const clientsSnapshot =
    await db.collection("clients").get();

  const profilesSnapshot =
    await db.collection("gst_profiles").get();


  const existingClientIds =
    new Set();


  profilesSnapshot.forEach(doc => {

    const profile =
      doc.data();

    if (profile.client_id) {
      existingClientIds.add(
        profile.client_id
      );
    }

  });


  const batch =
    db.batch();

  let hasChanges =
    false;


  clientsSnapshot.forEach(clientDoc => {

    const client =
      clientDoc.data();

    const clientId =
      client.id || clientDoc.id;

    const gst =
      clean(client.gst);


    if (!gst) {
      return;
    }


    if (
      existingClientIds.has(clientId)
    ) {
      return;
    }


    const id =
      generateId("GSTP");

    const now =
      new Date().toISOString();


    const profileRef =
      db
        .collection("gst_profiles")
        .doc(id);


    batch.set(
      profileRef,
      {

        id,

        client_id:
          clientId,

        trade_name:
          "",

        effective_from:
          null,

        registration_type:
          "REGULAR",

        filing_frequency:
          "MONTHLY",

        created_at:
          now,

        updated_at:
          now

      }
    );


    hasChanges =
      true;

  });


  if (hasChanges) {
    await batch.commit();
  }


  return clientsSnapshot;
}


/* =========================================================
   ENSURE MONTH
========================================================= */

async function ensureMonth(monthKey) {

  if (!validMonth(monthKey)) {
    throw new Error("Invalid month.");
  }


  await syncProfiles();


  const [
    profilesSnapshot,
    monthlySnapshot
  ] = await Promise.all([

    db
      .collection("gst_profiles")
      .get(),

    db
      .collection("gst_monthly_records")
      .where(
        "month_key",
        "==",
        monthKey
      )
      .get()

  ]);


  const existingProfileIds =
    new Set();


  monthlySnapshot.forEach(doc => {

    const record =
      doc.data();

    if (record.gst_profile_id) {

      existingProfileIds.add(
        record.gst_profile_id
      );

    }

  });


  const clientsSnapshot =
    await db
      .collection("clients")
      .get();


  const clients =
    new Map();


  clientsSnapshot.forEach(doc => {

    const client =
      doc.data();

    const clientId =
      client.id || doc.id;

    clients.set(
      clientId,
      client
    );

  });


  const batch =
    db.batch();

  let hasChanges =
    false;


  profilesSnapshot.forEach(profileDoc => {

    const profile =
      profileDoc.data();


    if (
      existingProfileIds.has(
        profile.id || profileDoc.id
      )
    ) {
      return;
    }


    const client =
      clients.get(
        profile.client_id
      );


    if (!client) {
      return;
    }


    if (!clean(client.gst)) {
      return;
    }


    const profileId =
      profile.id || profileDoc.id;


    const id =
      generateId("GSTM");


    const now =
      new Date().toISOString();


    const recordRef =
      db
        .collection("gst_monthly_records")
        .doc(id);


    batch.set(
      recordRef,
      {

        id,

        gst_profile_id:
          profileId,

        month_key:
          monthKey,

        document_received_date:
          null,

        working_date:
          null,

        gstr1_iff_filing_date:
          null,

        tax_payment_date:
          null,

        three_b_filing_date:
          null,

        three_b_filing_date:
          null,

        set_date:
          null,

        filing_date:
          null,

        created_at:
          now,

        updated_at:
          now

      }
    );


    hasChanges =
      true;

  });


  if (hasChanges) {
    await batch.commit();
  }
}


/* =========================================================
   STATUS
========================================================= */

function getStatus(row) {

  if (row.set_date)
    return "TRANSFERED TO BILLING";

  if (row.filing_date)
    return "SET PENDING";

  if (row.three_b_filing_date)
    return "FILING PENDING";

  if (row.tax_payment_date)
    return "3B FILING PENDING";

  if (row.gstr1_iff_filing_date)
    return "TAX PENDING";

  if (row.working_date)
    return "GSTR -1/ IFF PENDING";

  if (row.document_received_date)
    return "DOCUMENT RECIEVED";

  return "DOCUMENT NOT RECIEVED";
}


/* =========================================================
   MAP ROW
========================================================= */

function mapRow(row) {

  return {

    id:
      row.id,

    profileId:
      row.profile_id,

    clientId:
      row.client_id,

    gstName:
      [
        row.first_name,
        row.middle_name,
        row.last_name
      ]
        .filter(Boolean)
        .join(" "),

    gstNumber:
      row.gst,

    tradeName:
      row.trade_name || "",

    effectiveFrom:
      row.effective_from || "",

    registrationType:
      row.registration_type ||
      "REGULAR",

    filingFrequency:
      row.filing_frequency ||
      "MONTHLY",

    month:
      row.month_key,

    documentReceivedDate:
      row.document_received_date || "",

    workingDate:
      row.working_date || "",

    gstr1IffFilingDate:
      row.gstr1_iff_filing_date || "",

    taxPaymentDate:
      row.tax_payment_date || "",

    threeBFilingDate:
      row.three_b_filing_date || "",

    setDate:
      row.set_date || "",

    status:
      getStatus(row)

  };
}


/* =========================================================
   GET ROWS
========================================================= */

async function getRows(monthKey) {

  await ensureMonth(monthKey);


  const [
    monthlySnapshot,
    profilesSnapshot,
    clientsSnapshot
  ] = await Promise.all([

    db
      .collection("gst_monthly_records")
      .where(
        "month_key",
        "==",
        monthKey
      )
      .get(),

    db
      .collection("gst_profiles")
      .get(),

    db
      .collection("clients")
      .get()

  ]);


  const profiles =
    new Map();


  profilesSnapshot.forEach(doc => {

    const profile =
      doc.data();

    const id =
      profile.id || doc.id;

    profiles.set(
      id,
      {
        ...profile,
        id
      }
    );

  });


  const clients =
    new Map();


  clientsSnapshot.forEach(doc => {

    const client =
      doc.data();

    const id =
      client.id || doc.id;

    clients.set(
      id,
      {
        ...client,
        id
      }
    );

  });


  const rows = [];


  monthlySnapshot.forEach(doc => {

    const monthly =
      doc.data();


    const profile =
      profiles.get(
        monthly.gst_profile_id
      );


    if (!profile) {
      return;
    }


    const client =
      clients.get(
        profile.client_id
      );


    if (!client) {
      return;
    }


    if (!clean(client.gst)) {
      return;
    }


    rows.push(
      mapRow({

        id:
          monthly.id || doc.id,

        profile_id:
          profile.id,

        client_id:
          profile.client_id,

        trade_name:
          profile.trade_name,

        effective_from:
          profile.effective_from,

        registration_type:
          profile.registration_type,

        filing_frequency:
          profile.filing_frequency,

        month_key:
          monthly.month_key,

        document_received_date:
          monthly.document_received_date,

        working_date:
          monthly.working_date,

        gstr1_iff_filing_date:
          monthly.gstr1_iff_filing_date,

        tax_payment_date:
          monthly.tax_payment_date,

        three_b_filing_date:
          monthly.three_b_filing_date,

        set_date:
          monthly.set_date,

        filing_date:
          monthly.filing_date,

        first_name:
          client.first_name,

        middle_name:
          client.middle_name,

        last_name:
          client.last_name,

        gst:
          client.gst

      })
    );

  });


  rows.sort((a, b) =>
    a.gstName.localeCompare(
      b.gstName
    )
  );


  return rows;
}


/* =========================================================
   VALIDATE PAYLOAD
========================================================= */

function validatePayload(body) {

  const fields = [

    "effectiveFrom",

    "documentReceivedDate",

    "workingDate",

    "gstr1IffFilingDate",

    "taxPaymentDate",

    "threeBFilingDate",

    "setDate"

  ];


  for (const f of fields) {

    if (
      !validDate(
        clean(body[f])
      )
    ) {

      throw new Error(
        `${f} must use YYYY-MM-DD.`
      );

    }

  }


  const registrationType =
    clean(
      body.registrationType
    ).toUpperCase();


  const filingFrequency =
    clean(
      body.filingFrequency
    ).toUpperCase();


  if (
    !REGISTRATION_TYPES.has(
      registrationType
    )
  ) {

    throw new Error(
      "Invalid registration type."
    );

  }


  if (
    !FREQUENCIES.has(
      filingFrequency
    )
  ) {

    throw new Error(
      "Invalid filing frequency."
    );

  }


  return {

    tradeName:
      clean(body.tradeName),

    effectiveFrom:
      clean(body.effectiveFrom),

    registrationType,

    filingFrequency,

    documentReceivedDate:
      clean(
        body.documentReceivedDate
      ),

    workingDate:
      clean(
        body.workingDate
      ),

    gstr1IffFilingDate:
      clean(
        body.gstr1IffFilingDate
      ),

    taxPaymentDate:
      clean(
        body.taxPaymentDate
      ),

    threeBFilingDate:
      clean(
        body.threeBFilingDate
      ),

    setDate:
      clean(
        body.setDate
      )

  };

}


/* =========================================================
   UPDATE ONE
========================================================= */

async function updateOne(id, body) {

  const monthlyRef =
    db
      .collection("gst_monthly_records")
      .doc(id);


  const monthlyDoc =
    await monthlyRef.get();


  if (!monthlyDoc.exists) {

    throw new Error(
      "GST monthly record not found."
    );

  }


  const existing =
    monthlyDoc.data();


  const profileId =
    existing.gst_profile_id;


  const profileRef =
    db
      .collection("gst_profiles")
      .doc(profileId);


  const profileDoc =
    await profileRef.get();


  if (!profileDoc.exists) {

    throw new Error(
      "GST profile not found."
    );

  }


  const p =
    validatePayload(body);


  const now =
    new Date().toISOString();


  const batch =
    db.batch();


  batch.update(
    profileRef,
    {

      trade_name:
        p.tradeName,

      effective_from:
        p.effectiveFrom || null,

      registration_type:
        p.registrationType,

      filing_frequency:
        p.filingFrequency,

      updated_at:
        now

    }
  );


  batch.update(
    monthlyRef,
    {

      document_received_date:
        p.documentReceivedDate ||
        null,

      working_date:
        p.workingDate ||
        null,

      gstr1_iff_filing_date:
        p.gstr1IffFilingDate ||
        null,

      tax_payment_date:
        p.taxPaymentDate ||
        null,

      three_b_filing_date:
        p.threeBFilingDate ||
        null,

      set_date:
        p.setDate ||
        null,

      updated_at:
        now

    }
  );


  await batch.commit();


  const rows =
    await getRows(
      existing.month_key
    );


  return rows.find(
    row => row.id === id
  );

}


/* =========================================================
   GET DASHBOARD
========================================================= */

router.get(
  "/gst-dashboard",
  requireAuth,
  async (req, res) => {

    try {

      const month =
        validMonth(
          clean(req.query.month)
        )
          ? clean(req.query.month)
          : currentMonth();


      res.json({

        success:
          true,

        month,

        rows:
          await getRows(month)

      });

    } catch (error) {

      console.error(
        "GST dashboard GET error:",
        error
      );


      res.status(500).json({

        success:
          false,

        message:
          "Unable to load GST dashboard."

      });

    }

  }
);


/* =========================================================
   BULK SAVE
========================================================= */

router.patch(
  "/gst-dashboard/bulk",
  requireAuth,
  async (req, res) => {

    try {

      const month =
        clean(req.body?.month);


      const rows =
        Array.isArray(
          req.body?.rows
        )
          ? req.body.rows
          : [];


      if (!validMonth(month)) {

        return res.status(400).json({

          success:
            false,

          message:
            "Invalid month."

        });

      }


      await ensureMonth(month);


      for (const row of rows) {

        await updateOne(
          row.id,
          row
        );

      }


      res.json({

        success:
          true,

        month,

        rows:
          await getRows(month)

      });

    } catch (error) {

      console.error(
        "GST dashboard BULK PATCH error:",
        error
      );


      res.status(400).json({

        success:
          false,

        message:
          error.message ||
          "Unable to save GST records."

      });

    }

  }
);


/* =========================================================
   SINGLE SAVE
========================================================= */

router.patch(
  "/gst-dashboard/:id",
  requireAuth,
  async (req, res) => {

    try {

      const row =
        await updateOne(
          clean(req.params.id),
          req.body || {}
        );


      res.json({

        success:
          true,

        row

      });

    } catch (error) {

      console.error(
        "GST dashboard PATCH error:",
        error
      );


      res.status(400).json({

        success:
          false,

        message:
          error.message ||
          "Unable to save GST record."

      });

    }

  }
);


module.exports = router;