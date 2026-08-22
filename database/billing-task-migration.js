const db = require("./database");

function ensureColumn(table, column, definition) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!columns.some(c => c.name === column)) {
        db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
        console.log(`Added ${table}.${column}`);
    }
}

ensureColumn("tasks", "billing", "TEXT DEFAULT 'non-billable'");
ensureColumn("tasks", "billable", "INTEGER DEFAULT 0");

console.log("Billing/task migration completed.");
