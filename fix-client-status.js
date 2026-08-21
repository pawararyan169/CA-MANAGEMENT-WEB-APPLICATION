const db = require('./database/database');

console.log('========================================');
console.log(' CLIENT DATABASE STATUS MIGRATION');
console.log('========================================');

function addColumnIfMissing(table, column, definition) {

    const columns = db
        .prepare(`PRAGMA table_info(${table})`)
        .all();

    const exists = columns.some(
        item => item.name === column
    );

    if (exists) {

        console.log(
            `✓ ${table}.${column} already exists`
        );

        return;
    }

    console.log(
        `Adding ${table}.${column}...`
    );

    db.prepare(`
        ALTER TABLE ${table}
        ADD COLUMN ${column} ${definition}
    `).run();

    console.log(
        `✓ Added ${table}.${column}`
    );
}


/*
=========================================================
CLIENT STATUS
=========================================================
*/

addColumnIfMissing(
    'clients',
    'status',
    "TEXT DEFAULT 'active'"
);


/*
=========================================================
MAKE EXISTING CLIENTS ACTIVE
=========================================================
*/

db.prepare(`
    UPDATE clients
    SET status = 'active'
    WHERE status IS NULL
`).run();


/*
=========================================================
VERIFY
=========================================================
*/

console.log('');
console.log('Final clients status information:');

const statusColumn =
    db.prepare(`
        PRAGMA table_info(clients)
    `)
    .all()
    .find(column => column.name === 'status');

console.log(statusColumn);

const clients =
    db.prepare(`
        SELECT
            id,
            first_name,
            last_name,
            status
        FROM clients
        ORDER BY created_at DESC
    `)
    .all();

console.table(clients);

console.log('');
console.log('========================================');
console.log(' CLIENT DATABASE MIGRATION COMPLETED');
console.log('========================================');