const db = require("./database/database");

console.log("\n========== TASKS ==========");

try {
    console.table(
        db.prepare("PRAGMA table_info(tasks)").all()
    );
} catch (error) {
    console.log("Tasks table error:", error.message);
}


console.log("\n========== USERS ==========");

try {
    console.table(
        db.prepare("PRAGMA table_info(users)").all()
    );
} catch (error) {
    console.log("Users table error:", error.message);
}


console.log("\n========== CLIENTS ==========");

try {
    console.table(
        db.prepare("PRAGMA table_info(clients)").all()
    );
} catch (error) {
    console.log("Clients table error:", error.message);
}