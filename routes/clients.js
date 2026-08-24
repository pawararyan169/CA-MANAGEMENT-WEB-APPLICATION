const express = require("express");
const crypto = require("crypto");

const db = require("../database/database");

const {
    requireAuth,
    requireRole
} = require("../middleware/auth");

const router = express.Router();


/* =========================================================
   HELPERS
========================================================= */

function generateClientId() {
    return `CLI${Date.now()}${crypto.randomInt(1000, 9999)}`;
}


function clean(value) {
    return String(value ?? "").trim();
}


const CLIENT_TYPES = new Set([
    "individual",
    "huf",
    "partnership",
    "llp",
    "private_limited",
    "cooperative_society",
    "trust"
]);


function clientName(row) {

    return [
        row.first_name,
        row.middle_name,
        row.last_name
    ]
        .filter(Boolean)
        .join(" ");

}


/* =========================================================
   MAP CLIENT
========================================================= */

function mapClient(row) {

    return {

        id: row.id,

        firstName: row.first_name || "",

        middleName: row.middle_name || "",

        lastName: row.last_name || "",

        name: clientName(row),

        clientType: row.client_type || "",

        locationId: row.location_id || "",

        locationName: row.location_name || "",

        address: row.address || "",

        state: row.state || "",

        district: row.district || "",

        city: row.city || "",

        pan: row.pan || "",

        aadhaar: row.aadhaar || "",

        tan: row.tan || "",

        gst: row.gst || "",

        udyam: row.udyam || "",

        cin: row.cin || "",

        fssai: row.fssai || "",

        ptec: row.ptec || "",

        ptrc: row.ptrc || "",

        contactNumber:
            row.contact_number ||
            row.contact ||
            "",

        email: row.email || "",

        dateOfBirth:
            row.date_of_birth || "",

        dateOfRegistration:
            row.date_of_registration || "",

        gender:
            row.gender || "",

        authorisedSameAsClient:
            Boolean(
                row.authorised_same_as_client ??
                row.authorised_person_same_as_client ??
                0
            ),

        authorisedPersonName:
            row.authorised_person_name || "",

        authorisedPersonContact:
            row.authorised_person_contact || "",

        authorisedPersonEmail:
            row.authorised_person_email || "",

        status:
            row.status || "active",

        createdBy:
            row.created_by || "",

        createdAt:
            row.created_at || "",

        updatedAt:
            row.updated_at || ""

    };

}


/* =========================================================
   GET ONE CLIENT
========================================================= */

function getClient(clientId) {

    return db.prepare(`

        SELECT
            c.*,

            l.name AS location_name

        FROM clients c

        LEFT JOIN locations l
            ON l.id = c.location_id

        WHERE c.id = ?

        LIMIT 1

    `).get(clientId);

}


/* =========================================================
   GET ALL CLIENTS
   ADMIN + EVERY EMPLOYEE
========================================================= */

router.get(
    "/clients",
    requireAuth,
    (req, res) => {

        try {

            const rows = db.prepare(`

                SELECT
                    c.*,

                    l.name AS location_name

                FROM clients c

                LEFT JOIN locations l
                    ON l.id = c.location_id

                WHERE
                    c.status = 'active'

                ORDER BY
                    c.created_at DESC

            `).all();

            const assignmentRows = db.prepare(`
                SELECT
                    ca.client_id,
                    u.id,
                    u.username,
                    u.first_name,
                    u.middle_name,
                    u.last_name,
                    u.email,
                    u.designation
                FROM client_assignments ca
                JOIN users u
                    ON u.id = ca.employee_id
                WHERE
                    u.role = 'employee'
                    AND u.status = 'active'
                ORDER BY
                    u.first_name,
                    u.last_name
            `).all();

            const assignmentsByClient = new Map();

            assignmentRows.forEach(employee => {
                if (!assignmentsByClient.has(employee.client_id)) {
                    assignmentsByClient.set(employee.client_id, []);
                }

                assignmentsByClient.get(employee.client_id).push({
                    id: employee.id,
                    username: employee.username,
                    name: [
                        employee.first_name,
                        employee.middle_name,
                        employee.last_name
                    ].filter(Boolean).join(" "),
                    email: employee.email || "",
                    designation: employee.designation || ""
                });
            });

            return res.json({

                success: true,

                clients:
                    rows.map(row => ({
                        ...mapClient(row),
                        assignedEmployees:
                            assignmentsByClient.get(row.id) || []
                    }))

            });

        }

        catch (error) {

            console.error(
                "Get clients error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to load clients."

            });

        }

    }
);


/* =========================================================
   GET CLIENT COUNT
========================================================= */

router.get(
    "/clients/count",
    requireAuth,
    (req, res) => {

        try {

            const result = db.prepare(`

                SELECT COUNT(*) AS count

                FROM clients

                WHERE status = 'active'

            `).get();


            return res.json({

                success: true,

                count:
                    result.count || 0

            });

        }

        catch (error) {

            console.error(
                "Get client count error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to load client count."

            });

        }

    }
);


/* =========================================================
   GET SINGLE CLIENT
========================================================= */

router.get(
    "/clients/:id",
    requireAuth,
    (req, res) => {

        try {

            const row =
                getClient(
                    req.params.id
                );


            if (!row) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Client not found."

                });

            }


            const assignedEmployees =
                db.prepare(`
                    SELECT
                        u.id,
                        u.username,
                        u.first_name,
                        u.middle_name,
                        u.last_name,
                        u.email,
                        u.designation
                    FROM client_assignments ca
                    JOIN users u
                        ON u.id = ca.employee_id
                    WHERE
                        ca.client_id = ?
                        AND u.role = 'employee'
                        AND u.status = 'active'
                    ORDER BY
                        u.first_name,
                        u.last_name
                `).all(req.params.id);

            return res.json({

                success: true,

                client: {
                    ...mapClient(row),
                    assignedEmployees:
                        assignedEmployees.map(employee => ({
                            id: employee.id,
                            username: employee.username,
                            name: [
                                employee.first_name,
                                employee.middle_name,
                                employee.last_name
                            ].filter(Boolean).join(" "),
                            email: employee.email || "",
                            designation: employee.designation || ""
                        }))
                }

            });

        }

        catch (error) {

            console.error(
                "Get client error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to load client."

            });

        }

    }
);


/* =========================================================
   CREATE CLIENT
   ADMIN + EMPLOYEE
========================================================= */

router.post(
    "/clients",
    requireAuth,
    (req, res) => {

        try {

            const b = req.body || {};


            const firstName =
                clean(b.firstName);


            const middleName =
                clean(b.middleName);


            const lastName =
                clean(b.lastName);


            const clientType =
                clean(b.clientType);


            const contactNumber =
                clean(
                    b.contactNumber ||
                    b.contact
                );


            /* -------------------------------------------------
               VALIDATION
            ------------------------------------------------- */

            if (!firstName) {

                return res.status(400).json({

                    success: false,

                    message:
                        "First name is required."

                });

            }


            if (!lastName) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Last name is required."

                });

            }


            if (!clientType) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Client type is required."

                });

            }


            if (!CLIENT_TYPES.has(clientType)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid client type."

                });

            }


            if (!contactNumber) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Contact number is required."

                });

            }


            /* -------------------------------------------------
               LOCATION
            ------------------------------------------------- */

            const state =
                clean(b.state);


            const district =
                clean(b.district);


            const city =
                clean(b.city);


            /*
             * location_id is kept because it already exists
             * in the current database.
             *
             * If the form sends a real location ID we use it.
             * Otherwise use a stable office value.
             */

            const locationId =
                clean(b.locationId) ||
                "MAIN-OFFICE";


            const now =
                new Date().toISOString();


            const clientId =
                generateClientId();


            /* -------------------------------------------------
               AUTHORISED PERSON
            ------------------------------------------------- */

            const same =
                Boolean(
                    b.authorisedSameAsClient
                );


            const authName =
                same

                    ? [
                        firstName,
                        middleName,
                        lastName
                    ]
                        .filter(Boolean)
                        .join(" ")

                    : clean(
                        b.authorisedPersonName
                    );


            const authContact =
                same

                    ? contactNumber

                    : clean(
                        b.authorisedPersonContact
                    );


            const authEmail =
                same

                    ? clean(
                        b.email
                    ).toLowerCase()

                    : clean(
                        b.authorisedPersonEmail
                    ).toLowerCase();


            /* -------------------------------------------------
               INSERT
               
               IMPORTANT:
               EXACTLY 33 COLUMNS
               EXACTLY 33 VALUES
            ------------------------------------------------- */

            db.prepare(`

                INSERT INTO clients (

                    id,

                    first_name,
                    middle_name,
                    last_name,

                    client_type,

                    location_id,

                    address,

                    pan,
                    aadhaar,
                    tan,
                    gst,
                    udyam,
                    cin,
                    fssai,
                    ptec,
                    ptrc,

                    contact,
                    contact_number,

                    email,

                    date_of_birth,
                    date_of_registration,

                    gender,

                    authorised_same_as_client,

                    authorised_person_name,
                    authorised_person_contact,
                    authorised_person_email,

                    created_by,

                    created_at,
                    updated_at,

                    state,
                    district,
                    city,

                    status

                )

                VALUES (

                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?

                )

            `).run(

                clientId,

                firstName,
                middleName,
                lastName,

                clientType,

                locationId,

                clean(b.address),

                clean(b.pan).toUpperCase(),
                clean(b.aadhaar),
                clean(b.tan).toUpperCase(),
                clean(b.gst).toUpperCase(),
                clean(b.udyam),
                clean(b.cin).toUpperCase(),
                clean(b.fssai),
                clean(b.ptec),
                clean(b.ptrc),

                contactNumber,
                contactNumber,

                clean(b.email).toLowerCase(),

                b.dateOfBirth || null,
                b.dateOfRegistration || null,

                clean(b.gender),

                same ? 1 : 0,

                authName,
                authContact,
                authEmail,

                req.user.id,

                now,
                now,

                state,
                district,
                city,

                "active"

            );


            const created =
                getClient(clientId);


            return res.status(201).json({

                success: true,

                message:
                    "Client created successfully.",

                client:
                    mapClient(created)

            });

        }

        catch (error) {

            console.error(
                "Create client error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to create client."

            });

        }

    }
);


/* =========================================================
   UPDATE CLIENT
   ADMIN + EMPLOYEE
========================================================= */

router.put(
    "/clients/:id",
    requireAuth,
    (req, res) => {

        try {

            const existing =
                getClient(
                    req.params.id
                );


            if (!existing) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Client not found."

                });

            }


            const b =
                req.body || {};


            const firstName =
                clean(b.firstName);


            const middleName =
                clean(b.middleName);


            const lastName =
                clean(b.lastName);


            const clientType =
                clean(b.clientType);


            const contactNumber =
                clean(
                    b.contactNumber ||
                    b.contact
                );


            const pan =
                clean(b.pan).toUpperCase();


            if (
                !firstName ||
                !lastName ||
                !CLIENT_TYPES.has(clientType) ||
                !contactNumber ||
                !pan
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "First name, last name, client type and contact number are required."

                });

            }


            if (
                !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Enter a valid PAN number."

                });

            }


            const same =
                Boolean(
                    b.authorisedSameAsClient
                );


            const authName =
                same

                    ? [
                        firstName,
                        middleName,
                        lastName
                    ]
                        .filter(Boolean)
                        .join(" ")

                    : clean(
                        b.authorisedPersonName
                    );


            const authContact =
                same

                    ? contactNumber

                    : clean(
                        b.authorisedPersonContact
                    );


            const authEmail =
                same

                    ? clean(
                        b.email
                    ).toLowerCase()

                    : clean(
                        b.authorisedPersonEmail
                    ).toLowerCase();


            const now =
                new Date().toISOString();


            db.prepare(`

                UPDATE clients

                SET

                    first_name = ?,
                    middle_name = ?,
                    last_name = ?,

                    client_type = ?,

                    address = ?,

                    pan = ?,
                    aadhaar = ?,
                    tan = ?,
                    gst = ?,
                    udyam = ?,
                    cin = ?,
                    fssai = ?,
                    ptec = ?,
                    ptrc = ?,

                    contact = ?,
                    contact_number = ?,

                    email = ?,

                    date_of_birth = ?,
                    date_of_registration = ?,

                    gender = ?,

                    authorised_same_as_client = ?,

                    authorised_person_name = ?,
                    authorised_person_contact = ?,
                    authorised_person_email = ?,

                    state = ?,
                    district = ?,
                    city = ?,

                    updated_at = ?

                WHERE id = ?

            `).run(

                firstName,
                middleName,
                lastName,

                clientType,

                clean(b.address),

                clean(b.pan).toUpperCase(),
                clean(b.aadhaar),
                clean(b.tan).toUpperCase(),
                clean(b.gst).toUpperCase(),
                clean(b.udyam),
                clean(b.cin).toUpperCase(),
                clean(b.fssai),
                clean(b.ptec),
                clean(b.ptrc),

                contactNumber,
                contactNumber,

                clean(b.email).toLowerCase(),

                b.dateOfBirth || null,
                b.dateOfRegistration || null,

                clean(b.gender),

                same ? 1 : 0,

                authName,
                authContact,
                authEmail,

                clean(b.state),
                clean(b.district),
                clean(b.city),

                now,

                req.params.id

            );


            return res.json({

                success: true,

                message:
                    "Client updated successfully.",

                client:
                    mapClient(
                        getClient(
                            req.params.id
                        )
                    )

            });

        }

        catch (error) {

            console.error(
                "Update client error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to update client."

            });

        }

    }
);


/* =========================================================
   DEACTIVATE CLIENT
   ADMIN ONLY
========================================================= */

router.delete(
    "/clients/:id",
    requireAuth,
    requireRole("admin"),
    (req, res) => {

        try {

            const result =
                db.prepare(`

                    UPDATE clients

                    SET
                        status = 'inactive',
                        updated_at = ?

                    WHERE id = ?

                `).run(

                    new Date().toISOString(),

                    req.params.id

                );


            if (!result.changes) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Client not found."

                });

            }


            return res.json({

                success: true,

                message:
                    "Client deactivated."

            });

        }

        catch (error) {

            console.error(
                "Delete client error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to deactivate client."

            });

        }

    }
);



/* =========================================================
   ADMIN - CLIENT EMPLOYEE ASSIGNMENTS
========================================================= */

router.get(
    "/clients/:id/assignments",
    requireAuth,
    requireRole("admin"),
    (req, res) => {

        try {
            const client = db.prepare(`
                SELECT id
                FROM clients
                WHERE id = ?
                LIMIT 1
            `).get(req.params.id);

            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: "Client not found."
                });
            }

            const employees = db.prepare(`
                SELECT
                    u.id,
                    u.username,
                    u.first_name,
                    u.middle_name,
                    u.last_name,
                    u.email,
                    u.designation
                FROM users u
                WHERE
                    u.role = 'employee'
                    AND u.status = 'active'
                ORDER BY
                    u.first_name,
                    u.last_name,
                    u.username
            `).all();

            const assigned = db.prepare(`
                SELECT employee_id
                FROM client_assignments
                WHERE client_id = ?
            `).all(req.params.id);

            const assignedIds = new Set(
                assigned.map(row => row.employee_id)
            );

            return res.json({
                success: true,
                employees: employees.map(employee => ({
                    id: employee.id,
                    username: employee.username,
                    name: [
                        employee.first_name,
                        employee.middle_name,
                        employee.last_name
                    ].filter(Boolean).join(" "),
                    email: employee.email || "",
                    designation: employee.designation || "",
                    assigned: assignedIds.has(employee.id)
                }))
            });

        } catch (error) {
            console.error("Get client assignments error:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to load employee assignments."
            });
        }
    }
);


router.put(
    "/clients/:id/assignments",
    requireAuth,
    requireRole("admin"),
    (req, res) => {

        try {
            const clientId = clean(req.params.id);
            const employeeIds = Array.isArray(req.body?.employeeIds)
                ? [...new Set(req.body.employeeIds.map(clean).filter(Boolean))]
                : [];

            const client = db.prepare(`
                SELECT id
                FROM clients
                WHERE id = ?
                LIMIT 1
            `).get(clientId);

            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: "Client not found."
                });
            }

            if (employeeIds.length) {
                const placeholders =
                    employeeIds.map(() => "?").join(",");

                const validEmployees = db.prepare(`
                    SELECT id
                    FROM users
                    WHERE
                        role = 'employee'
                        AND status = 'active'
                        AND id IN (${placeholders})
                `).all(...employeeIds);

                if (validEmployees.length !== employeeIds.length) {
                    return res.status(400).json({
                        success: false,
                        message: "One or more selected employees are invalid."
                    });
                }
            }

            const now = new Date().toISOString();

            db.transaction(() => {
                db.prepare(`
                    DELETE FROM client_assignments
                    WHERE client_id = ?
                `).run(clientId);

                const insert = db.prepare(`
                    INSERT INTO client_assignments
                    (
                        id,
                        client_id,
                        employee_id,
                        assigned_by,
                        assigned_at
                    )
                    VALUES (?, ?, ?, ?, ?)
                `);

                employeeIds.forEach(employeeId => {
                    insert.run(
                        `CA${Date.now()}${Math.random().toString(36).slice(2,8)}`,
                        clientId,
                        employeeId,
                        req.user.id,
                        now
                    );
                });
            })();

            return res.json({
                success: true,
                message: employeeIds.length
                    ? "Employees assigned to client successfully."
                    : "All employee assignments removed.",
                employeeIds
            });

        } catch (error) {
            console.error("Update client assignments error:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to update client assignments."
            });
        }
    }
);


module.exports = router;