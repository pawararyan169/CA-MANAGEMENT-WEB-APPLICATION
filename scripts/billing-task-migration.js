const db = require("../database/database");

console.log("Checking billing_records schema...");

const columns = db.prepare(`
    PRAGMA table_info(billing_records)
`).all();

const hasClientId = columns.some(c => c.name === "client_id");

if (hasClientId) {
    throw new Error(
        "billing_records still contains client_id. " +
        "Back up the database and run the billing schema migration."
    );
}

const hasTaskId = columns.some(c => c.name === "task_id");

if (!hasTaskId) {
    throw new Error(
        "billing_records is missing task_id."
    );
}

console.log("Billing schema is task-only.");
console.log("client_id is not required for billing.");
