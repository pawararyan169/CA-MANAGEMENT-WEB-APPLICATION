const express = require("express");
const db = require("../database/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/*
  FSSAI data is stored separately for every client + year.
  The FSSAI number itself comes from clients.fssai.
*/
db.exec(`
  CREATE TABLE IF NOT EXISTS fssai_yearly_records (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    record_year INTEGER NOT NULL,
    date_of_expiry TEXT,
    renewal_date TEXT,
    new_expiry_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(client_id, record_year),
    FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_fssai_year
  ON fssai_yearly_records(record_year);
`);

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

function syncYear(year) {
  const clients = db.prepare(`
    SELECT id
    FROM clients
    WHERE fssai IS NOT NULL
      AND TRIM(fssai) <> ''
  `).all();

  const find = db.prepare(`
    SELECT id
    FROM fssai_yearly_records
    WHERE client_id = ? AND record_year = ?
  `);

  const insert = db.prepare(`
    INSERT INTO fssai_yearly_records
      (id, client_id, record_year, date_of_expiry,
       renewal_date, new_expiry_date, created_at, updated_at)
    VALUES (?, ?, ?, NULL, NULL, NULL, ?, ?)
  `);

  const now = new Date().toISOString();

  db.transaction(() => {
    for (const client of clients) {
      if (!find.get(client.id, year)) {
        insert.run(makeId(), client.id, year, now, now);
      }
    }
  })();
}

function getRecords(year) {
  year = yearOf(year);
  syncYear(year);

  const rows = db.prepare(`
    SELECT
      fy.id,
      fy.client_id,
      fy.record_year,
      fy.date_of_expiry,
      fy.renewal_date,
      fy.new_expiry_date,
      c.fssai
    FROM fssai_yearly_records fy
    INNER JOIN clients c ON c.id = fy.client_id
    WHERE fy.record_year = ?
      AND c.fssai IS NOT NULL
      AND TRIM(c.fssai) <> ''
    ORDER BY c.fssai ASC
  `).all(year);

  return rows.map(row => ({
    id: row.id,
    clientId: row.client_id,
    year: row.record_year,
    fssaiNumber: row.fssai,
    dateOfExpiry: row.date_of_expiry || "",
    renewalDate: row.renewal_date || "",
    newExpiryDate: row.new_expiry_date || "",
    status: row.date_of_expiry ? "ACTIVE" : "EXPIRED"
  }));
}

/* GET current selected year's records */
router.get("/fssai-dashboard", requireAuth, (req, res) => {
  try {
    const year = yearOf(req.query.year);
    res.json({
      success: true,
      year,
      records: getRecords(year)
    });
  } catch (error) {
    console.error("FSSAI GET ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Unable to load FSSAI records."
    });
  }
});

/* Save all rows for the selected year */
router.patch("/fssai-dashboard/bulk", requireAuth, (req, res) => {
  try {
    const year = yearOf(req.body?.year);
    const records = Array.isArray(req.body?.records) ? req.body.records : [];

    syncYear(year);

    const update = db.prepare(`
      UPDATE fssai_yearly_records
      SET
        date_of_expiry = ?,
        renewal_date = ?,
        new_expiry_date = ?,
        updated_at = ?
      WHERE id = ? AND record_year = ?
    `);

    const now = new Date().toISOString();

    db.transaction(() => {
      for (const record of records) {
        const id = clean(record.id);
        const expiry = clean(record.dateOfExpiry);
        const renewal = clean(record.renewalDate);
        const newExpiry = clean(record.newExpiryDate);

        if (!id) throw new Error("Invalid FSSAI record ID.");
        if (!validDate(expiry)) throw new Error("Invalid Date of Expiry.");
        if (!validDate(renewal)) throw new Error("Invalid Renewal Date.");
        if (!validDate(newExpiry)) throw new Error("Invalid New Expiry Date.");

        update.run(
          expiry || null,
          renewal || null,
          newExpiry || null,
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
    console.error("FSSAI SAVE ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Unable to save FSSAI records."
    });
  }
});

module.exports = router;
