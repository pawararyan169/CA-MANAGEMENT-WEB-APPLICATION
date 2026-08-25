const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

/* =========================================================
   DATABASE LOCATION
========================================================= */

const dataDirectory = path.join(
    __dirname,
    "..",
    "data"
);

if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(
        dataDirectory,
        {
            recursive: true
        }
    );
}

const databasePath = path.join(
    dataDirectory,
    "ca-office.sqlite"
);

console.log(
    "Database:",
    databasePath
);

const db = new Database(
    databasePath
);

db.pragma(
    "journal_mode = WAL"
);

db.pragma(
    "foreign_keys = ON"
);


/* =========================================================
   USERS
========================================================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS users (

        id TEXT PRIMARY KEY,

        username TEXT NOT NULL UNIQUE,

        password_hash TEXT NOT NULL,

        first_name TEXT NOT NULL,

        middle_name TEXT,

        last_name TEXT NOT NULL,

        email TEXT,

        phone TEXT,

        designation TEXT,

        role TEXT NOT NULL DEFAULT 'employee',

        status TEXT NOT NULL DEFAULT 'active',

        created_at TEXT NOT NULL,

        approved_at TEXT

    );
`);


/* =========================================================
   SIGNUP REQUESTS
========================================================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS signup_requests (

        id TEXT PRIMARY KEY,

        first_name TEXT NOT NULL,

        middle_name TEXT,

        last_name TEXT NOT NULL,

        email TEXT NOT NULL,

        phone TEXT NOT NULL,

        aadhaar TEXT,

        pan TEXT,

        designation TEXT,

        message TEXT,

        status TEXT NOT NULL DEFAULT 'pending',

        created_at TEXT NOT NULL,

        reviewed_at TEXT,

        reviewed_by TEXT,

        approved_username TEXT

    );
`);


/* =========================================================
   LOCATIONS
========================================================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS locations (

        id TEXT PRIMARY KEY,

        name TEXT NOT NULL UNIQUE,

        city TEXT,

        state TEXT,

        country TEXT,

        address TEXT,

        status TEXT NOT NULL DEFAULT 'active',

        created_by TEXT,

        created_at TEXT NOT NULL

    );
`);


/* =========================================================
   CLIENTS
========================================================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS clients (

        id TEXT PRIMARY KEY,

        first_name TEXT NOT NULL,

        middle_name TEXT,

        last_name TEXT NOT NULL,

        client_type TEXT NOT NULL,

        location_id TEXT NOT NULL,

        address TEXT NOT NULL,

        pan TEXT,

        aadhaar TEXT,

        tan TEXT,

        gst TEXT,

        udyam TEXT,

        cin TEXT,

        fssai TEXT,

        ptec TEXT,

        ptrc TEXT,

        contact TEXT NOT NULL,

        email TEXT,

        date_of_birth TEXT,

        date_of_registration TEXT,

        gender TEXT,

        authorised_person_same_as_client
            INTEGER DEFAULT 0,

        authorised_person_name TEXT,

        authorised_person_contact TEXT,

        authorised_person_email TEXT,

        created_by TEXT NOT NULL,

        created_at TEXT NOT NULL,

        updated_at TEXT,

        state TEXT,

        district TEXT,

        city TEXT,

        contact_number TEXT,

        status TEXT DEFAULT 'active',

        authorised_same_as_client
            INTEGER DEFAULT 0,

        FOREIGN KEY (
            location_id
        )
        REFERENCES locations(id)

    );
`);



/* =========================================================
   BILLING RECORDS
========================================================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS billing_records (

        id TEXT PRIMARY KEY,

        serial_number TEXT NOT NULL UNIQUE,

        task_id TEXT NOT NULL UNIQUE,

        chargeable_amount REAL NOT NULL DEFAULT 0,

        receipt_date TEXT,

        amount REAL NOT NULL DEFAULT 0,

        payment_mode TEXT,

        advance_payment_date TEXT,

        advance_amount REAL NOT NULL DEFAULT 0,

        advance_payment_mode TEXT,

        balance REAL NOT NULL DEFAULT 0,

        created_by TEXT,

        created_at TEXT NOT NULL,

        updated_at TEXT NOT NULL

    );

    CREATE INDEX IF NOT EXISTS idx_billing_task
        ON billing_records(task_id);
`);


/* =========================================================
   TASKS
========================================================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (

        id TEXT PRIMARY KEY,

        title TEXT NOT NULL,

        description TEXT,

        client_id TEXT,

        employee_id TEXT,

        priority TEXT DEFAULT 'medium',

        status TEXT DEFAULT 'pending',

        progress INTEGER DEFAULT 0,

        due_date TEXT,

        latest_update TEXT,

        created_by TEXT NOT NULL,

        created_at TEXT NOT NULL,

        updated_at TEXT NOT NULL

    );
`);


/* =========================================================
   CLIENT ASSIGNMENTS
========================================================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS client_assignments (

        id TEXT PRIMARY KEY,

        client_id TEXT NOT NULL,

        employee_id TEXT NOT NULL,

        assigned_by TEXT NOT NULL,

        assigned_at TEXT NOT NULL,

        UNIQUE (
            client_id,
            employee_id
        )

    );
`);


/* =========================================================
   AUDIT LOGS
========================================================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (

        id TEXT PRIMARY KEY,

        user_id TEXT,

        action TEXT NOT NULL,

        entity_type TEXT,

        entity_id TEXT,

        description TEXT,

        created_at TEXT NOT NULL

    );
`);


/* =========================================================
   GENERIC MIGRATION HELPER
========================================================= */

function addColumnIfMissing(
    tableName,
    columnName,
    columnDefinition
) {

    const columns =
        db.prepare(
            `PRAGMA table_info(${tableName})`
        ).all();

    const exists =
        columns.some(
            column =>
                column.name === columnName
        );

    if (!exists) {

        console.log(
            `Adding ${columnName} to ${tableName}...`
        );

        db.prepare(
            `ALTER TABLE ${tableName}
             ADD COLUMN ${columnName}
             ${columnDefinition}`
        ).run();

    }

}


/* =========================================================
   TASK MIGRATIONS
========================================================= */

addColumnIfMissing(
    "tasks",
    "assigned_to",
    "TEXT"
);

addColumnIfMissing(
    "tasks",
    "client_id",
    "TEXT"
);

addColumnIfMissing(
    "tasks",
    "description",
    "TEXT"
);

addColumnIfMissing(
    "tasks",
    "status",
    "TEXT DEFAULT 'pending'"
);

addColumnIfMissing(
    "tasks",
    "priority",
    "TEXT DEFAULT 'medium'"
);

addColumnIfMissing(
    "tasks",
    "due_date",
    "TEXT"
);

addColumnIfMissing(
    "tasks",
    "updated_at",
    "TEXT"
);

addColumnIfMissing(
    "tasks",
    "progress",
    "INTEGER DEFAULT 0"
);

addColumnIfMissing(
    "tasks",
    "latest_update",
    "TEXT"
);


/* =========================================================
   CLIENT MIGRATIONS
========================================================= */

function addClientColumnIfMissing(
    columnName,
    definition
) {

    const columns =
        db
            .prepare(
                `PRAGMA table_info(clients)`
            )
            .all();

    const exists =
        columns.some(
            column =>
                column.name === columnName
        );

    if (!exists) {

        console.log(
            `Adding clients.${columnName}...`
        );

        db.prepare(
            `ALTER TABLE clients
             ADD COLUMN ${columnName}
             ${definition}`
        ).run();

    }

}


/* =========================================================
   REQUIRED CLIENT COLUMNS
========================================================= */

addClientColumnIfMissing(
    "first_name",
    "TEXT"
);

addClientColumnIfMissing(
    "middle_name",
    "TEXT"
);

addClientColumnIfMissing(
    "last_name",
    "TEXT"
);

addClientColumnIfMissing(
    "client_type",
    "TEXT"
);

addClientColumnIfMissing(
    "location_id",
    "TEXT"
);

addClientColumnIfMissing(
    "state",
    "TEXT"
);

addClientColumnIfMissing(
    "district",
    "TEXT"
);

addClientColumnIfMissing(
    "city",
    "TEXT"
);

addClientColumnIfMissing(
    "address",
    "TEXT"
);

addClientColumnIfMissing(
    "gender",
    "TEXT"
);

addClientColumnIfMissing(
    "pan",
    "TEXT"
);

addClientColumnIfMissing(
    "aadhaar",
    "TEXT"
);

addClientColumnIfMissing(
    "tan",
    "TEXT"
);

addClientColumnIfMissing(
    "gst",
    "TEXT"
);

addClientColumnIfMissing(
    "udyam",
    "TEXT"
);

addClientColumnIfMissing(
    "cin",
    "TEXT"
);

addClientColumnIfMissing(
    "fssai",
    "TEXT"
);

addClientColumnIfMissing(
    "ptec",
    "TEXT"
);

addClientColumnIfMissing(
    "ptrc",
    "TEXT"
);

addClientColumnIfMissing(
    "contact_number",
    "TEXT"
);

addClientColumnIfMissing(
    "email",
    "TEXT"
);

addClientColumnIfMissing(
    "date_of_birth",
    "TEXT"
);

addClientColumnIfMissing(
    "date_of_registration",
    "TEXT"
);

addClientColumnIfMissing(
    "authorised_person_name",
    "TEXT"
);

addClientColumnIfMissing(
    "authorised_person_contact",
    "TEXT"
);

addClientColumnIfMissing(
    "authorised_person_email",
    "TEXT"
);

addClientColumnIfMissing(
    "created_by",
    "TEXT"
);

addClientColumnIfMissing(
    "created_at",
    "TEXT"
);


/* =========================================================
   IMPORTANT FIXES
========================================================= */

addClientColumnIfMissing(
    "updated_at",
    "TEXT"
);

addClientColumnIfMissing(
    "status",
    "TEXT DEFAULT 'active'"
);

addClientColumnIfMissing(
    "authorised_same_as_client",
    "INTEGER DEFAULT 0"
);


/* =========================================================
   CLIENT COMPATIBILITY MIGRATION
========================================================= */

try {

    const clientColumns =
        db
            .prepare(
                `PRAGMA table_info(clients)`
            )
            .all()
            .map(
                column =>
                    column.name
            );


    /*
     * Copy old authorised-person flag
     * into the new field.
     */

    if (
        clientColumns.includes(
            "authorised_person_same_as_client"
        ) &&
        clientColumns.includes(
            "authorised_same_as_client"
        )
    ) {

        db.prepare(`
            UPDATE clients

            SET authorised_same_as_client =
                COALESCE(
                    authorised_person_same_as_client,
                    0
                )

            WHERE
                authorised_same_as_client IS NULL
                OR authorised_same_as_client = 0

        `).run();

    }


    /*
     * Existing clients should be active.
     */

    if (
        clientColumns.includes(
            "status"
        )
    ) {

        db.prepare(`
            UPDATE clients

            SET status = 'active'

            WHERE
                status IS NULL
                OR TRIM(status) = ''

        `).run();

    }


    /*
     * Keep contact fields synchronized.
     */

    if (
        clientColumns.includes(
            "contact"
        ) &&
        clientColumns.includes(
            "contact_number"
        )
    ) {

        db.prepare(`
            UPDATE clients

            SET contact_number = contact

            WHERE
                (
                    contact_number IS NULL
                    OR TRIM(contact_number) = ''
                )
                AND contact IS NOT NULL

        `).run();


        db.prepare(`
            UPDATE clients

            SET contact = contact_number

            WHERE
                (
                    contact IS NULL
                    OR TRIM(contact) = ''
                )
                AND contact_number IS NOT NULL

        `).run();

    }

}
catch (migrationError) {

    console.error(
        "Client compatibility migration warning:",
        migrationError
    );

}


console.log(
    "Client database migration completed."
);


module.exports = db;