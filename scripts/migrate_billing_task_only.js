const db = require("../database/database");

console.log("Migrating billing_records to task-only billing...");

const table = db.prepare(`
    SELECT sql
    FROM sqlite_master
    WHERE type = 'table'
      AND name = 'billing_records'
`).get();

if (!table) {
    console.log("billing_records table does not exist. Nothing to migrate.");
    process.exit(0);
}

const columns = db.prepare(`
    PRAGMA table_info(billing_records)
`).all();

const hasClientId = columns.some(c => c.name === "client_id");

if (!hasClientId) {
    console.log("billing_records is already task-only.");
    process.exit(0);
}

const foreignKeys = db.prepare(`
    PRAGMA foreign_key_list(billing_records)
`).all();

const taskForeignKey =
    foreignKeys.find(fk => fk.from === "task_id");

const taskTable = taskForeignKey?.table || "office_tasks";

const tx = db.transaction(() => {

    db.exec(`
        CREATE TABLE billing_records_task_only (
            id TEXT PRIMARY KEY,
            serial_number INTEGER NOT NULL UNIQUE,
            task_id TEXT NOT NULL,
            chargeable_amount REAL NOT NULL DEFAULT 0,
            receipt_date TEXT NOT NULL,
            amount REAL NOT NULL DEFAULT 0,
            payment_mode TEXT,
            advance_payment_date TEXT,
            advance_amount REAL NOT NULL DEFAULT 0,
            advance_payment_mode TEXT,
            balance REAL NOT NULL DEFAULT 0,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        INSERT INTO billing_records_task_only (
            id,
            serial_number,
            task_id,
            chargeable_amount,
            receipt_date,
            amount,
            payment_mode,
            advance_payment_date,
            advance_amount,
            advance_payment_mode,
            balance,
            created_by,
            created_at,
            updated_at
        )
        SELECT
            id,
            serial_number,
            task_id,
            chargeable_amount,
            receipt_date,
            amount,
            payment_mode,
            advance_payment_date,
            advance_amount,
            advance_payment_mode,
            balance,
            created_by,
            created_at,
            updated_at
        FROM billing_records;

        DROP TABLE billing_records;

        ALTER TABLE billing_records_task_only
            RENAME TO billing_records;

        CREATE INDEX IF NOT EXISTS idx_billing_receipt
            ON billing_records(receipt_date);

        CREATE INDEX IF NOT EXISTS idx_billing_task
            ON billing_records(task_id);
    `);
});

tx();

console.log("Billing migration completed.");
console.log("client_id has been removed from billing_records.");
console.log("Billing is now linked only by task_id.");
