const express = require("express");
const crypto = require("crypto");
const db = require("../database/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

db.exec(`
CREATE TABLE IF NOT EXISTS gst_profiles (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE,
  trade_name TEXT DEFAULT '',
  effective_from TEXT,
  registration_type TEXT DEFAULT 'REGULAR' CHECK (registration_type IN ('REGULAR','COMPOSITION')),
  filing_frequency TEXT DEFAULT 'MONTHLY' CHECK (filing_frequency IN ('MONTHLY','QUARTERLY')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gst_monthly_records (
  id TEXT PRIMARY KEY,
  gst_profile_id TEXT NOT NULL,
  month_key TEXT NOT NULL,
  document_received_date TEXT,
  working_date TEXT,
  gstr1_filing_date TEXT,
  iff_filing_date TEXT,
  tax_payment_date TEXT,
  three_b_filing_date TEXT,
  filing_date TEXT,
  set_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(gst_profile_id, month_key),
  FOREIGN KEY (gst_profile_id) REFERENCES gst_profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_gst_monthly_month ON gst_monthly_records(month_key);
`);

for (const sql of [
  `ALTER TABLE gst_profiles ADD COLUMN effective_from TEXT`,
  `ALTER TABLE gst_monthly_records ADD COLUMN working_date TEXT`,
  `ALTER TABLE gst_monthly_records ADD COLUMN gstr1_filing_date TEXT`,
  `ALTER TABLE gst_monthly_records ADD COLUMN iff_filing_date TEXT`,
  `ALTER TABLE gst_monthly_records ADD COLUMN tax_payment_date TEXT`,
  `ALTER TABLE gst_monthly_records ADD COLUMN three_b_filing_date TEXT`,
  `ALTER TABLE gst_monthly_records ADD COLUMN filing_date TEXT`,
  `ALTER TABLE gst_monthly_records ADD COLUMN set_date TEXT`
]) { try { db.exec(sql); } catch (_) {} }

const clean = value => String(value ?? "").trim();
const validMonth = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const validDate = value => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value);
const REGISTRATION_TYPES = new Set(["REGULAR","COMPOSITION"]);
const FREQUENCIES = new Set(["MONTHLY","QUARTERLY"]);

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function generateId(prefix) {
  return `${prefix}${Date.now()}${crypto.randomInt(1000,9999)}`;
}

function syncProfiles() {
  const clients = db.prepare(`
    SELECT id, first_name, middle_name, last_name, gst
    FROM clients
    WHERE gst IS NOT NULL AND TRIM(gst) <> ''
    ORDER BY first_name, middle_name, last_name
  `).all();

  const find = db.prepare(`SELECT id FROM gst_profiles WHERE client_id = ?`);
  const insert = db.prepare(`
    INSERT INTO gst_profiles
    (id,client_id,trade_name,effective_from,registration_type,filing_frequency,created_at,updated_at)
    VALUES (?,?, '', NULL,'REGULAR','MONTHLY',?,?)
  `);
  const now = new Date().toISOString();

  db.transaction(() => {
    for (const client of clients) {
      if (!find.get(client.id)) insert.run(generateId("GSTP"), client.id, now, now);
    }
  })();

  return clients;
}

function ensureMonth(monthKey) {
  if (!validMonth(monthKey)) throw new Error("Invalid month.");
  syncProfiles();

  const profiles = db.prepare(`
    SELECT gp.id FROM gst_profiles gp
    JOIN clients c ON c.id = gp.client_id
    WHERE c.gst IS NOT NULL AND TRIM(c.gst) <> ''
  `).all();

  const find = db.prepare(`
    SELECT id FROM gst_monthly_records WHERE gst_profile_id = ? AND month_key = ?
  `);
  const insert = db.prepare(`
    INSERT INTO gst_monthly_records
    (id,gst_profile_id,month_key,document_received_date,working_date,
     gstr1_filing_date,iff_filing_date,tax_payment_date,three_b_filing_date,
     filing_date,set_date,created_at,updated_at)
    VALUES (?,?,?,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,?,?)
  `);
  const now = new Date().toISOString();

  db.transaction(() => {
    for (const p of profiles) {
      if (!find.get(p.id, monthKey)) insert.run(generateId("GSTM"),p.id,monthKey,now,now);
    }
  })();
}

function getStatus(row) {
  if (row.set_date) return "TRANSFERED TO BILLING";
  if (row.filing_date) return "SET PENDING";
  if (row.three_b_filing_date) return "FILING PENDING";
  if (row.tax_payment_date) return "3B FILING PENDING";
  if (row.gstr1_filing_date || row.iff_filing_date) return "TAX PENDING";
  if (row.working_date) return "GSTR -1/ IFF PENDING";
  if (row.document_received_date) return "DOCUMENT RECIEVED";
  return "DOCUMENT NOT RECIEVED";
}

function mapRow(row) {
  return {
    id: row.id,
    profileId: row.profile_id,
    clientId: row.client_id,
    gstName: [row.first_name,row.middle_name,row.last_name].filter(Boolean).join(" "),
    gstNumber: row.gst,
    tradeName: row.trade_name || "",
    effectiveFrom: row.effective_from || "",
    registrationType: row.registration_type || "REGULAR",
    filingFrequency: row.filing_frequency || "MONTHLY",
    month: row.month_key,
    documentReceivedDate: row.document_received_date || "",
    workingDate: row.working_date || "",
    gstr1FilingDate: row.gstr1_filing_date || "",
    iffFilingDate: row.iff_filing_date || "",
    taxPaymentDate: row.tax_payment_date || "",
    threeBFilingDate: row.three_b_filing_date || "",
    filingDate: row.filing_date || "",
    setDate: row.set_date || "",
    status: getStatus(row)
  };
}

function getRows(monthKey) {
  ensureMonth(monthKey);
  return db.prepare(`
    SELECT gm.id, gp.id AS profile_id, gp.client_id, gp.trade_name, gp.effective_from,
           gp.registration_type, gp.filing_frequency, gm.month_key,
           gm.document_received_date, gm.working_date, gm.gstr1_filing_date,
           gm.iff_filing_date, gm.tax_payment_date, gm.three_b_filing_date,
           gm.filing_date, gm.set_date,
           c.first_name, c.middle_name, c.last_name, c.gst
    FROM gst_monthly_records gm
    JOIN gst_profiles gp ON gp.id = gm.gst_profile_id
    JOIN clients c ON c.id = gp.client_id
    WHERE gm.month_key = ? AND c.gst IS NOT NULL AND TRIM(c.gst) <> ''
    ORDER BY c.first_name,c.middle_name,c.last_name
  `).all(monthKey).map(mapRow);
}

function validatePayload(body) {
  const fields = [
    "effectiveFrom","documentReceivedDate","workingDate","gstr1FilingDate",
    "iffFilingDate","taxPaymentDate","threeBFilingDate","filingDate","setDate"
  ];
  for (const f of fields) {
    if (!validDate(clean(body[f]))) throw new Error(`${f} must use YYYY-MM-DD.`);
  }
  const registrationType = clean(body.registrationType).toUpperCase();
  const filingFrequency = clean(body.filingFrequency).toUpperCase();
  if (!REGISTRATION_TYPES.has(registrationType)) throw new Error("Invalid registration type.");
  if (!FREQUENCIES.has(filingFrequency)) throw new Error("Invalid filing frequency.");
  return {
    tradeName: clean(body.tradeName),
    effectiveFrom: clean(body.effectiveFrom),
    registrationType,
    filingFrequency,
    documentReceivedDate: clean(body.documentReceivedDate),
    workingDate: clean(body.workingDate),
    gstr1FilingDate: clean(body.gstr1FilingDate),
    iffFilingDate: clean(body.iffFilingDate),
    taxPaymentDate: clean(body.taxPaymentDate),
    threeBFilingDate: clean(body.threeBFilingDate),
    filingDate: clean(body.filingDate),
    setDate: clean(body.setDate)
  };
}

function updateOne(id, body) {
  const existing = db.prepare(`
    SELECT gm.id, gm.month_key, gp.id AS profile_id
    FROM gst_monthly_records gm
    JOIN gst_profiles gp ON gp.id = gm.gst_profile_id
    WHERE gm.id = ?
  `).get(id);
  if (!existing) throw new Error("GST monthly record not found.");

  const p = validatePayload(body);
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(`
      UPDATE gst_profiles
      SET trade_name=?, effective_from=?, registration_type=?, filing_frequency=?, updated_at=?
      WHERE id=?
    `).run(p.tradeName,p.effectiveFrom || null,p.registrationType,p.filingFrequency,now,existing.profile_id);

    db.prepare(`
      UPDATE gst_monthly_records
      SET document_received_date=?, working_date=?, gstr1_filing_date=?, iff_filing_date=?,
          tax_payment_date=?, three_b_filing_date=?, filing_date=?, set_date=?, updated_at=?
      WHERE id=?
    `).run(
      p.documentReceivedDate || null,p.workingDate || null,p.gstr1FilingDate || null,
      p.iffFilingDate || null,p.taxPaymentDate || null,p.threeBFilingDate || null,
      p.filingDate || null,p.setDate || null,now,id
    );
  })();

  return getRows(existing.month_key).find(row => row.id === id);
}

router.get("/gst-dashboard", requireAuth, (req,res) => {
  try {
    const month = validMonth(clean(req.query.month)) ? clean(req.query.month) : currentMonth();
    res.json({success:true,month,rows:getRows(month)});
  } catch (error) {
    console.error("GST dashboard GET error:",error);
    res.status(500).json({success:false,message:"Unable to load GST dashboard."});
  }
});

router.patch("/gst-dashboard/bulk", requireAuth, (req,res) => {
  try {
    const month = clean(req.body?.month);
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!validMonth(month)) return res.status(400).json({success:false,message:"Invalid month."});

    ensureMonth(month);

    for (const row of rows) {
      updateOne(row.id,row);
    }

    res.json({success:true,month,rows:getRows(month)});
  } catch (error) {
    console.error("GST dashboard BULK PATCH error:",error);
    res.status(400).json({success:false,message:error.message || "Unable to save GST records."});
  }
});

router.patch("/gst-dashboard/:id", requireAuth, (req,res) => {
  try {
    const row = updateOne(clean(req.params.id),req.body || {});
    res.json({success:true,row});
  } catch (error) {
    console.error("GST dashboard PATCH error:",error);
    res.status(400).json({success:false,message:error.message || "Unable to save GST record."});
  }
});

module.exports = router;
