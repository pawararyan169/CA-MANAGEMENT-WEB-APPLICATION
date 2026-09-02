/*
 * Firebase-backed database bridge.
 *
 * The application still uses its existing better-sqlite3 query code so
 * existing routes, APIs and UI do not need to change. SQLite is used only
 * as a local query/cache engine; Firebase Firestore is the persistent store.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sqlite = require("./database-sqlite-engine");
const { getFirestore } = require("../firebase-admin");

const firestore = getFirestore();

let firebaseReady = false;
let writeQueue = Promise.resolve();

function sleepTick() {
    return new Promise(resolve => setImmediate(resolve));
}

function cleanFirestoreValue(value) {
    if (value === undefined) return null;
    if (value === null) return null;

    if (Buffer.isBuffer(value)) {
        return {
            __type: "Buffer",
            base64: value.toString("base64")
        };
    }

    if (Array.isArray(value)) {
        return value.map(cleanFirestoreValue);
    }

    if (typeof value === "object") {
        const output = {};
        for (const [key, child] of Object.entries(value)) {
            output[key] = cleanFirestoreValue(child);
        }
        return output;
    }

    if (typeof value === "number") {
        if (!Number.isFinite(value)) return null;
        return value;
    }

    return value;
}

function restoreFirestoreValue(value) {
    if (value && typeof value === "object") {
        if (
            value.__type === "Buffer" &&
            typeof value.base64 === "string"
        ) {
            return Buffer.from(value.base64, "base64");
        }

        if (Array.isArray(value)) {
            return value.map(restoreFirestoreValue);
        }

        const output = {};
        for (const [key, child] of Object.entries(value)) {
            output[key] = restoreFirestoreValue(child);
        }
        return output;
    }

    return value;
}

function tableNames() {
    return sqlite
        .prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        `)
        .all()
        .map(row => row.name);
}

function rowsForTable(table) {
    return sqlite
        .prepare(`SELECT * FROM "${table.replace(/"/g, '""')}"`)
        .all();
}

function collectionFor(table) {
    return firestore.collection(table);
}

function documentIdForRow(row, index) {
    if (row.id !== undefined && row.id !== null && String(row.id) !== "") {
        return String(row.id);
    }

    if (
        row.client_id !== undefined &&
        row.client_id !== null
    ) {
        return `client_${String(row.client_id)}`;
    }

    return crypto
        .createHash("sha256")
        .update(JSON.stringify(row) + `:${index}`)
        .digest("hex")
        .slice(0, 40);
}

async function commitOperations(operations) {
    for (let i = 0; i < operations.length; i += 450) {
        const chunk = operations.slice(i, i + 450);
        const batch = firestore.batch();

        for (const operation of chunk) {
            if (operation.type === "set") {
                batch.set(
                    operation.ref,
                    operation.data,
                    { merge: false }
                );
            } else if (operation.type === "delete") {
                batch.delete(operation.ref);
            }
        }

        if (chunk.length) {
            await batch.commit();
        }
    }
}

async function syncTable(table) {
    const rows = rowsForTable(table);
    const collection = collectionFor(table);
    const existing = await collection.get();

    const operations = [];
    const currentIds = new Set();

    rows.forEach((row, index) => {
        const docId = documentIdForRow(row, index);
        currentIds.add(docId);

        operations.push({
            type: "set",
            ref: collection.doc(docId),
            data: cleanFirestoreValue(row)
        });
    });

    existing.forEach(doc => {
        if (!currentIds.has(doc.id)) {
            operations.push({
                type: "delete",
                ref: doc.ref
            });
        }
    });

    await commitOperations(operations);
}

async function syncAllTables() {
    for (const table of tableNames()) {
        await syncTable(table);
    }
}

async function clearTable(table) {
    const tableName = table.replace(/"/g, '""');
    sqlite.prepare(`DELETE FROM "${tableName}"`).run();
}

async function hydrateTable(table) {
    const snapshot = await collectionFor(table).get();
    const rows = snapshot.docs.map(doc => restoreFirestoreValue(doc.data()));

    await clearTable(table);

    if (!rows.length) return;

    const columns = sqlite
        .prepare(`PRAGMA table_info("${table.replace(/"/g, '""')}")`)
        .all()
        .map(column => column.name);

    const usableRows = rows.map(row => {
        const output = {};
        for (const column of columns) {
            if (Object.prototype.hasOwnProperty.call(row, column)) {
                output[column] = row[column];
            }
        }
        return output;
    });

    const insert = sqlite.transaction(() => {
        for (const row of usableRows) {
            const keys = Object.keys(row);
            if (!keys.length) continue;

            const quotedColumns = keys
                .map(column => `"${column.replace(/"/g, '""')}"`)
                .join(", ");

            const placeholders = keys.map(() => "?").join(", ");

            sqlite
                .prepare(
                    `INSERT OR REPLACE INTO "${table.replace(/"/g, '""')}" (${quotedColumns}) VALUES (${placeholders})`
                )
                .run(...keys.map(key => row[key]));
        }
    });

    insert();
}

async function hydrateFromFirestore() {
    const metaRef = firestore
        .collection("_ca_office_meta")
        .doc("database");

    const meta = await metaRef.get();
    const resetRequested =
        String(process.env.RESET_DATABASE || "").toLowerCase() === "true";

    if (!meta.exists || resetRequested) {
        console.log("Firebase database initialization: uploading local database to Firestore...");
        await syncAllTables();

        await metaRef.set({
            initialized: true,
            updated_at: new Date().toISOString(),
            mode: "sqlite-compatibility-bridge"
        });

        console.log("Firebase database initialization completed.");
        return;
    }

    console.log("Firebase database found: loading data into local query cache...");

    sqlite.pragma("foreign_keys = OFF");

    try {
        for (const table of tableNames()) {
            await hydrateTable(table);
        }
    } finally {
        sqlite.pragma("foreign_keys = ON");
    }

    console.log("Firebase data loaded successfully.");
}

function scheduleTableSync(table) {
    if (!firebaseReady) return;

    writeQueue = writeQueue
        .then(() => syncTable(table))
        .catch(error => {
            console.error(
                `Firebase sync failed for ${table}:`,
                error.message
            );
        });
}

function mutatedTables(sql) {
    const tables = new Set();
    const patterns = [
        /\bINSERT\s+(?:OR\s+\w+\s+)?INTO\s+["`]?([\w-]+)["`]?/gi,
        /\bUPDATE\s+["`]?([\w-]+)["`]?/gi,
        /\bDELETE\s+FROM\s+["`]?([\w-]+)["`]?/gi,
        /\bALTER\s+TABLE\s+["`]?([\w-]+)["`]?/gi,
        /\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?["`]?([\w-]+)["`]?/gi,
        /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([\w-]+)["`]?/gi
    ];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(sql))) {
            tables.add(match[1]);
        }
    }

    return [...tables];
}

function wrapStatement(statement, sql) {
    const mutations = mutatedTables(sql).filter(
        table => !/^sqlite_/i.test(table)
    );

    const originalRun = statement.run.bind(statement);
    const originalGet = statement.get.bind(statement);
    const originalAll = statement.all.bind(statement);
    const originalIterate = statement.iterate
        ? statement.iterate.bind(statement)
        : null;

    statement.run = (...args) => {
        const result = originalRun(...args);
        for (const table of mutations) {
            scheduleTableSync(table);
        }
        return result;
    };

    statement.get = (...args) => originalGet(...args);
    statement.all = (...args) => originalAll(...args);

    if (originalIterate) {
        statement.iterate = (...args) => originalIterate(...args);
    }

    return statement;
}

const originalPrepare = sqlite.prepare.bind(sqlite);
const originalExec = sqlite.exec.bind(sqlite);
const originalTransaction = sqlite.transaction.bind(sqlite);

const database = {
    prepare(sql) {
        return wrapStatement(
            originalPrepare(sql),
            String(sql)
        );
    },

    exec(sql) {
        const result = originalExec(sql);

        if (firebaseReady) {
            const mutations = mutatedTables(String(sql));

            if (mutations.length) {
                for (const table of mutations) {
                    scheduleTableSync(table);
                }
            } else {
                writeQueue = writeQueue
                    .then(() => syncAllTables())
                    .catch(error => {
                        console.error(
                            "Firebase full sync failed:",
                            error.message
                        );
                    });
            }
        }

        return result;
    },

    transaction(fn) {
        const transaction = originalTransaction(() => fn());

        return (...args) => {
            const result = transaction(...args);

            if (firebaseReady) {
                writeQueue = writeQueue
                    .then(() => syncAllTables())
                    .catch(error => {
                        console.error(
                            "Firebase transaction sync failed:",
                            error.message
                        );
                    });
            }

            return result;
        };
    },

    pragma(...args) {
        return sqlite.pragma(...args);
    },

    get backup() {
        return sqlite.backup.bind(sqlite);
    },

    get inTransaction() {
        return sqlite.inTransaction;
    },

    get memory() {
        return sqlite.memory;
    },

    get name() {
        return sqlite.name;
    },

    get readonly() {
        return sqlite.readonly;
    },

    get open() {
        return sqlite.open;
    },

    get defaultSafeIntegers() {
        return sqlite.defaultSafeIntegers.bind(sqlite);
    },

    get function() {
        return sqlite.function.bind(sqlite);
    },

    get aggregate() {
        return sqlite.aggregate.bind(sqlite);
    }
};

/*
 * Give route modules a moment to finish their existing CREATE TABLE / ALTER
 * TABLE setup. Then Firestore becomes the source of truth before the server
 * starts accepting requests.
 */
const ready = (async () => {
    await sleepTick();
    await hydrateFromFirestore();
    firebaseReady = true;
    return true;
})();

database.ready = ready;
database.firestore = firestore;
database.raw = sqlite;

module.exports = database;
