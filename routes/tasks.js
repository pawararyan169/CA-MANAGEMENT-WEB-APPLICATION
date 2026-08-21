const express = require("express");

const router = express.Router();

const db = require("../database/database");


/* =========================================================
   GET EMPLOYEES FOR TASK ASSIGNMENT
========================================================= */

router.get(
    "/admin/task-employees",
    (req, res) => {

        try {

            const employees = db.prepare(`
                SELECT
                    id,
                    username,
                    first_name,
                    middle_name,
                    last_name,
                    designation,
                    email
                FROM users
                WHERE
                    role = 'employee'
                    AND status = 'active'
                ORDER BY first_name ASC
            `).all();


            const result = employees.map(employee => ({

                id: employee.id,

                name: [
                    employee.first_name,
                    employee.middle_name,
                    employee.last_name
                ]
                    .filter(Boolean)
                    .join(" ") || employee.username,

                username:
                    employee.username,

                designation:
                    employee.designation || "",

                email:
                    employee.email || ""

            }));


            return res.json({

                success: true,

                employees: result

            });

        }

        catch (error) {

            console.error(
                "Task employee error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to load employees."

            });

        }

    }
);


/* =========================================================
   GET CLIENTS FOR TASK ASSIGNMENT
========================================================= */

router.get(
    "/admin/task-clients",
    (req, res) => {

        try {

            const clients = db.prepare(`
                SELECT *
                FROM clients
                ORDER BY created_at DESC
            `).all();


            const result = clients.map(client => {

                const name = [
                    client.first_name,
                    client.middle_name,
                    client.last_name
                ]
                    .filter(Boolean)
                    .join(" ");


                return {

                    id:
                        client.id,

                    name:
                        name ||
                        client.name ||
                        client.business_name ||
                        "Unnamed Client",

                    type:
                        client.type || "",

                    pan:
                        client.pan_number || ""

                };

            });


            return res.json({

                success: true,

                clients: result

            });

        }

        catch (error) {

            console.error(
                "Task client error:",
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
   CREATE / ASSIGN TASK
========================================================= */

router.post(
    "/admin/tasks",
    (req, res) => {

        try {

            const {
                title,
                description,
                assigned_to,
                client_id,
                priority,
                due_date
            } = req.body;


            /* -----------------------------------------
               VALIDATION
            ----------------------------------------- */

            if (
                !title ||
                !assigned_to
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Task title and employee are required."

                });

            }


            /* -----------------------------------------
               CHECK EMPLOYEE
            ----------------------------------------- */

            const employee =
                db.prepare(`
                    SELECT
                        id,
                        username,
                        first_name,
                        middle_name,
                        last_name
                    FROM users
                    WHERE
                        id = ?
                        AND role = 'employee'
                        AND status = 'active'
                `).get(
                    assigned_to
                );


            if (!employee) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Selected employee was not found."

                });

            }


            /* -----------------------------------------
               CHECK CLIENT
            ----------------------------------------- */

            if (client_id) {

                const client =
                    db.prepare(`
                        SELECT id
                        FROM clients
                        WHERE id = ?
                    `).get(
                        client_id
                    );


                if (!client) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "Selected client was not found."

                    });

                }

            }


            /* -----------------------------------------
               CREATE TASK ID
            ----------------------------------------- */

            const taskId =
                "TASK" +
                Date.now() +
                Math.floor(
                    Math.random() * 1000
                );


            const now =
                new Date().toISOString();


            const taskPriority =
                [
                    "low",
                    "medium",
                    "high",
                    "urgent"
                ].includes(
                    String(priority).toLowerCase()
                )
                    ? String(priority).toLowerCase()
                    : "medium";


            /* -----------------------------------------
               INSERT TASK
            ----------------------------------------- */

            db.prepare(`
                INSERT INTO tasks (
                    id,
                    title,
                    description,
                    assigned_to,
                    client_id,
                    status,
                    priority,
                    due_date,
                    created_at,
                    updated_at
                )

                VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    'pending',
                    ?,
                    ?,
                    ?,
                    ?
                )
            `).run(

                taskId,

                title.trim(),

                description
                    ? description.trim()
                    : "",

                assigned_to,

                client_id || null,

                taskPriority,

                due_date || null,

                now,

                now

            );


            return res.status(201).json({

                success: true,

                message:
                    "Task assigned successfully.",

                task: {

                    id:
                        taskId,

                    title:
                        title.trim(),

                    assigned_to:
                        assigned_to,

                    client_id:
                        client_id || null,

                    status:
                        "pending",

                    priority:
                        taskPriority,

                    due_date:
                        due_date || null

                }

            });

        }

        catch (error) {

            console.error(
                "Create task error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to create task.",

                error:
                    process.env.NODE_ENV === "development"
                        ? error.message
                        : undefined

            });

        }

    }
);


/* =========================================================
   ADMIN - GET ALL TASKS
========================================================= */

router.get(
    "/admin/tasks",
    (req, res) => {

        try {

            const tasks = db.prepare(`
                SELECT
                    tasks.*,

                    users.first_name,
                    users.middle_name,
                    users.last_name,
                    users.username,
                    users.designation

                FROM tasks

                LEFT JOIN users
                    ON users.id = tasks.assigned_to

                ORDER BY
                    tasks.created_at DESC
            `).all();


            const result =
                tasks.map(task => ({

                    ...task,

                    employee_name: [

                        task.first_name,
                        task.middle_name,
                        task.last_name

                    ]
                        .filter(Boolean)
                        .join(" ") ||
                        task.username ||
                        "Unassigned"

                }));


            return res.json({

                success: true,

                tasks:
                    result

            });

        }

        catch (error) {

            console.error(
                "Get tasks error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to load tasks."

            });

        }

    }
);


module.exports = router;