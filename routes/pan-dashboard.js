const express = require("express");
const db = require("../database/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

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
                    email: row.email || ""
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

module.exports = router;
