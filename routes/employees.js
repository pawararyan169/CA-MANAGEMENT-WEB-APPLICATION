const express = require("express");

const db = require("../database/database");

const router = express.Router();


/* =========================================================
   GENERATE REQUEST ID
========================================================= */

function generateRequestId() {

    return (
        "REQ" +
        Date.now() +
        Math.floor(
            Math.random() * 1000
        )
    );

}


/* =========================================================
   EMPLOYEE SIGNUP REQUEST
========================================================= */

router.post(
    "/signup-request",
    (req, res) => {

        try {

            const {

                firstName,
                middleName,
                lastName,

                email,
                phone,

                message

            } = req.body;


            /* -----------------------------------------
               VALIDATION
            ----------------------------------------- */

            if (
                !firstName ||
                !lastName ||
                !email ||
                !phone
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "First name, last name, email and contact number are required."

                });

            }


            const normalizedEmail =
                email
                    .trim()
                    .toLowerCase();


            /* -----------------------------------------
               CHECK EXISTING USER
            ----------------------------------------- */

            const existingUser =
                db.prepare(`
                    SELECT id
                    FROM users
                    WHERE email = ?
                    COLLATE NOCASE
                `).get(
                    normalizedEmail
                );


            if (existingUser) {

                return res.status(409).json({

                    success: false,

                    message:
                        "An account already exists with this email."

                });

            }


            /* -----------------------------------------
               CHECK PENDING REQUEST
            ----------------------------------------- */

            const existingRequest =
                db.prepare(`
                    SELECT id
                    FROM signup_requests
                    WHERE email = ?
                    COLLATE NOCASE
                    AND status = 'pending'
                `).get(
                    normalizedEmail
                );


            if (existingRequest) {

                return res.status(409).json({

                    success: false,

                    message:
                        "A signup request for this email is already pending."

                });

            }


            /* -----------------------------------------
               CREATE REQUEST
            ----------------------------------------- */

            const requestId =
                generateRequestId();


            const now =
                new Date().toISOString();


            db.prepare(`
                INSERT INTO signup_requests (

                    id,

                    first_name,
                    middle_name,
                    last_name,

                    email,
                    phone,

                    message,

                    status,

                    created_at

                )

                VALUES (

                    ?,

                    ?,
                    ?,
                    ?,

                    ?,
                    ?,

                    ?,

                    'pending',

                    ?

                )
            `).run(

                requestId,

                firstName.trim(),

                middleName
                    ? middleName.trim()
                    : "",

                lastName.trim(),


                normalizedEmail,

                phone.trim(),


                message
                    ? message.trim()
                    : "",


                now

            );


            /* -----------------------------------------
               RESPONSE
            ----------------------------------------- */

            return res.status(201).json({

                success: true,

                message:
                    "Your signup request has been sent to the administrator. Please wait for approval.",

                requestId

            });

        }

        catch (error) {

            console.error(
                "Signup request error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to submit signup request."

            });

        }

    }
);


/* =========================================================
   ADMIN - GET SIGNUP REQUESTS
========================================================= */

router.get(
    "/admin/signup-requests",
    (req, res) => {

        try {

            const requests =
                db.prepare(`
                    SELECT

                        id,

                        first_name,
                        middle_name,
                        last_name,

                        email,
                        phone,

                        message,

                        status,

                        created_at,

                        reviewed_at,
                        reviewed_by,

                        approved_username

                    FROM signup_requests

                    ORDER BY
                        created_at DESC

                `).all();


            return res.json({

                success: true,

                requests

            });

        }

        catch (error) {

            console.error(
                "Get signup requests error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load signup requests."

            });

        }

    }
);


/* =========================================================
   ADMIN - APPROVE REQUEST
========================================================= */

router.post(
    "/admin/signup-requests/:id/approve",
    (req, res) => {

        try {

            const {

                username,
                password

            } = req.body;


            if (
                !username ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Username and password are required."

                });

            }


            if (
                username.trim().length < 4
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Username must contain at least 4 characters."

                });

            }


            if (
                password.length < 8
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Password must contain at least 8 characters."

                });

            }


            /* -----------------------------------------
               GET REQUEST
            ----------------------------------------- */

            const request =
                db.prepare(`
                    SELECT *
                    FROM signup_requests
                    WHERE id = ?
                `).get(
                    req.params.id
                );


            if (!request) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Signup request not found."

                });

            }


            if (
                request.status !==
                "pending"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This signup request has already been processed."

                });

            }


            /* -----------------------------------------
               USERNAME CHECK
            ----------------------------------------- */

            const usernameExists =
                db.prepare(`
                    SELECT id
                    FROM users
                    WHERE username = ?
                    COLLATE NOCASE
                `).get(
                    username.trim()
                );


            if (usernameExists) {

                return res.status(409).json({

                    success: false,

                    message:
                        "That username is already in use."

                });

            }


            /* -----------------------------------------
               HASH PASSWORD
            ----------------------------------------- */

            const bcrypt =
                require("bcryptjs");


            const passwordHash =
                bcrypt.hashSync(
                    password,
                    12
                );


            const employeeId =
                "EMP" +
                Date.now();


            const now =
                new Date().toISOString();


            /* -----------------------------------------
               CREATE EMPLOYEE
            ----------------------------------------- */

            db.prepare(`
                INSERT INTO users (

                    id,

                    username,
                    password_hash,

                    first_name,
                    middle_name,
                    last_name,

                    email,
                    phone,

                    role,
                    status,

                    created_at,
                    approved_at

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

                    'employee',
                    'active',

                    ?,
                    ?

                )
            `).run(

                employeeId,

                username.trim(),

                passwordHash,


                request.first_name,

                request.middle_name,

                request.last_name,


                request.email,

                request.phone,


                now,

                now

            );


            /* -----------------------------------------
               UPDATE REQUEST
            ----------------------------------------- */

            db.prepare(`
                UPDATE signup_requests

                SET

                    status = 'approved',

                    reviewed_at = ?,

                    reviewed_by = 'ADMIN001',

                    approved_username = ?

                WHERE id = ?

            `).run(

                now,

                username.trim(),

                request.id

            );


            return res.json({

                success: true,

                message:
                    "Employee approved successfully.",

                employee: {

                    id:
                        employeeId,

                    username:
                        username.trim(),

                    firstName:
                        request.first_name,

                    middleName:
                        request.middle_name,

                    lastName:
                        request.last_name

                }

            });

        }

        catch (error) {

            console.error(
                "Approve signup error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to approve signup request."

            });

        }

    }
);


/* =========================================================
   ADMIN - REJECT REQUEST
========================================================= */

router.post(
    "/admin/signup-requests/:id/reject",
    (req, res) => {

        try {

            const request =
                db.prepare(`
                    SELECT id, status
                    FROM signup_requests
                    WHERE id = ?
                `).get(
                    req.params.id
                );


            if (!request) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Signup request not found."

                });

            }


            if (
                request.status !==
                "pending"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This request has already been processed."

                });

            }


            db.prepare(`
                UPDATE signup_requests

                SET

                    status = 'rejected',

                    reviewed_at = ?,

                    reviewed_by = 'ADMIN001'

                WHERE id = ?

            `).run(

                new Date().toISOString(),

                request.id

            );


            return res.json({

                success: true,

                message:
                    "Signup request rejected."

            });

        }

        catch (error) {

            console.error(
                "Reject signup error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to reject signup request."

            });

        }

    }
);


module.exports = router;