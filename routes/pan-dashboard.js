const express = require("express");
const db = require("../database/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/* =========================================================
   PAN BILLING STATUS
   PAN is a client-level service, so its transfer status is
   stored separately from clients.status.
========================================================= */
db.exec(`
CREATE TABLE IF NOT EXISTS pan_billing_status (
    client_id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'PENDING',
    transferred_at TEXT,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pan_billing_status_status
    ON pan_billing_status(status);
`);

function ensurePanBillingStatus(clientId) {
    const existing = db.prepare(`
        SELECT client_id FROM pan_billing_status WHERE client_id = ?
    `).get(clientId);
    if (!existing) {
        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO pan_billing_status(client_id, status, transferred_at, updated_at)
            VALUES (?, 'PENDING', NULL, ?)
        `).run(clientId, now);
    }
}


function findColumn(candidates) {
    const columns = db.prepare("PRAGMA table_info(clients)").all()
        .map(c => c.name);

    for (const candidate of candidates) {
        const found = columns.find(
            c => c.toLowerCase() === candidate.toLowerCase()
        );
        if (found) return found;
    }

    return null;
}

function requiredColumn(candidates, label) {
    const column = findColumn(candidates);

    if (!column) {
        throw new Error(
            `${label} column was not found in the clients table.`
        );
    }

    return column;
}

function optionalColumn(candidates) {
    return findColumn(candidates);
}

function fullName(row, first, middle, last) {
    const name = [
        first ? row[first] : "",
        middle ? row[middle] : "",
        last ? row[last] : ""
    ]
        .filter(v => String(v ?? "").trim() !== "")
        .join(" ")
        .trim();

    return name || row.name || row.full_name || "Unnamed Client";
}

router.get(
    "/pan-dashboard",
    requireAuth,
    (req, res) => {
        try {
            const pan = requiredColumn(
                ["pan", "pan_number", "pan_no", "panNumber"],
                "PAN"
            );

            const id = requiredColumn(
                ["id", "client_id", "clientId"],
                "Client ID"
            );

            const first = optionalColumn([
                "first_name",
                "firstName"
            ]);

            const middle = optionalColumn([
                "middle_name",
                "middleName"
            ]);

            const last = optionalColumn([
                "last_name",
                "lastName"
            ]);

            const nameColumn = optionalColumn([
                "name",
                "full_name",
                "client_name",
                "clientName"
            ]);

            const cin = optionalColumn([
                "cin",
                "cin_number",
                "cin_no",
                "cinNumber"
            ]);

            const clientType = optionalColumn([
                "client_type",
                "clientType",
                "type"
            ]);

            const contact = optionalColumn([
                "phone",
                "mobile",
                "mobile_number",
                "contact",
                "contact_number",
                "contactNumber"
            ]);

            const email = optionalColumn([
                "email",
                "email_address"
            ]);

            const city = optionalColumn([
                "city",
                "town"
            ]);

            const district = optionalColumn([
                "district"
            ]);

            const state = optionalColumn([
                "state"
            ]);

            const location = optionalColumn([
                "location",
                "office_location",
                "officeLocation"
            ]);

            const selectParts = [
                `"${id}" AS client_id`,
                `"${pan}" AS pan`
            ];

            if (nameColumn) {
                selectParts.push(`"${nameColumn}" AS direct_name`);
            } else {
                selectParts.push(`NULL AS direct_name`);
            }

            if (first) {
                selectParts.push(`"${first}" AS first_name`);
            } else {
                selectParts.push(`NULL AS first_name`);
            }

            if (middle) {
                selectParts.push(`"${middle}" AS middle_name`);
            } else {
                selectParts.push(`NULL AS middle_name`);
            }

            if (last) {
                selectParts.push(`"${last}" AS last_name`);
            } else {
                selectParts.push(`NULL AS last_name`);
            }

            const fields = [
                ["cin", cin],
                ["client_type", clientType],
                ["contact", contact],
                ["email", email],
                ["city", city],
                ["district", district],
                ["state", state],
                ["location", location]
            ];

            for (const [alias, column] of fields) {
                if (column) {
                    selectParts.push(`"${column}" AS "${alias}"`);
                } else {
                    selectParts.push(`NULL AS "${alias}"`);
                }
            }

            const rows = db.prepare(`
                SELECT
                    ${selectParts.join(",\n                    ")}
                FROM clients
                WHERE "${pan}" IS NOT NULL
                  AND TRIM("${pan}") <> ''
                ORDER BY
                    COALESCE(
                        NULLIF(TRIM(${first ? `"${first}"` : "''"}), ''),
                        NULLIF(TRIM(${nameColumn ? `"${nameColumn}"` : "''"}), '')
                    ) COLLATE NOCASE ASC
            `).all();

            const records = rows.map(row => {
                ensurePanBillingStatus(row.client_id);
                const billingStatus = db.prepare(`
                    SELECT status, transferred_at
                    FROM pan_billing_status
                    WHERE client_id = ?
                `).get(row.client_id) || { status: "PENDING", transferred_at: null };
                let name = row.direct_name;

                if (!name || !String(name).trim()) {
                    name = [
                        row.first_name,
                        row.middle_name,
                        row.last_name
                    ]
                        .filter(v => String(v ?? "").trim() !== "")
                        .join(" ")
                        .trim();
                }

                return {
                    id: row.client_id,
                    name: name || "Unnamed Client",
                    cin: row.cin || "",
                    clientType: row.client_type || "",
                    location: row.location || "",
                    city: row.city || "",
                    district: row.district || "",
                    state: row.state || "",
                    pan: row.pan || "",
                    contact: row.contact || "",
                    email: row.email || "",
                    billingStatus: billingStatus.status || "PENDING",
                    transferredAt: billingStatus.transferred_at || ""
                };
            });

            res.json({
                success: true,
                records
            });

        } catch (error) {
            console.error("PAN DASHBOARD ERROR:", error);

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Unable to load PAN records."
            });
        }
    }
);

/* =========================================================
   UPDATE PAN BILLING STATUS
========================================================= */
router.patch(
    "/pan-dashboard/:id/billing-status",
    requireAuth,
    (req, res) => {
        try {
            const clientId = String(req.params.id || "").trim();
            const status = String(req.body?.status || "PENDING").trim().toUpperCase();

            if (!clientId) {
                return res.status(400).json({ success: false, message: "Client ID is required." });
            }

            if (!["PENDING", "TRANSFERED TO BILLING"].includes(status)) {
                return res.status(400).json({ success: false, message: "Invalid PAN billing status." });
            }

            const client = db.prepare(`SELECT id FROM clients WHERE id = ? LIMIT 1`).get(clientId);
            if (!client) {
                return res.status(404).json({ success: false, message: "PAN client not found." });
            }

            const now = new Date().toISOString();
            ensurePanBillingStatus(clientId);

            db.prepare(`
                UPDATE pan_billing_status
                SET status = ?,
                    transferred_at = CASE WHEN ? = 'TRANSFERED TO BILLING' THEN COALESCE(transferred_at, ?) ELSE NULL END,
                    updated_at = ?
                WHERE client_id = ?
            `).run(status, status, now, now, clientId);

            const updated = db.prepare(`
                SELECT status, transferred_at
                FROM pan_billing_status
                WHERE client_id = ?
            `).get(clientId);

            return res.json({
                success: true,
                billingStatus: updated.status,
                transferredAt: updated.transferred_at || ""
            });
        } catch (error) {
            console.error("PAN BILLING STATUS ERROR:", error);
            return res.status(500).json({
                success: false,
                message: error.message || "Unable to update PAN billing status."
            });
        }
    }
);

module.exports = router;
