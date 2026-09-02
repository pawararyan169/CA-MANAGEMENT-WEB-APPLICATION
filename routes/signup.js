const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const db = require('../database/database');
const {
    requireAuth,
    requireRole
} = require('../middleware/auth');

const router = express.Router();


/* =========================================================
   HELPERS
========================================================= */

const id = prefix =>
    `${prefix}${Date.now()}${crypto.randomInt(1000, 9999)}`;

const clean = value =>
    String(value || '').trim();


/* =========================================================
   PUBLIC SIGNUP REQUEST
========================================================= */

router.post('/signup-request', (req, res) => {

    try {

        const firstName =
            clean(req.body.firstName);

        const middleName =
            clean(req.body.middleName);

        const lastName =
            clean(req.body.lastName);

        const email =
            clean(req.body.email).toLowerCase();

        const phone =
            clean(req.body.phone);

        const aadhaar =
            clean(req.body.aadhaar);

        const pan =
            clean(req.body.pan).toUpperCase();

        const message =
            clean(req.body.message);


        /* -------------------------------------------------
           VALIDATION
        ------------------------------------------------- */

        if (
            !firstName ||
            !lastName ||
            !email ||
            !phone ||
            !aadhaar ||
            !pan
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'Please complete all required fields.'
            });

        }


        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'Enter a valid email address.'
            });

        }


        if (
            !/^\d{12}$/.test(
                aadhaar.replace(/\s/g, '')
            )
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'Aadhaar number must contain 12 digits.'
            });

        }


        if (
            !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'Enter a valid PAN number.'
            });

        }


        /* -------------------------------------------------
           CHECK EXISTING USER
        ------------------------------------------------- */

        const existingUser =
            db.prepare(`
                SELECT id
                FROM users
                WHERE email = ?
                COLLATE NOCASE
            `).get(email);


        if (existingUser) {

            return res.status(409).json({
                success: false,
                message:
                    'An account already exists for this email.'
            });

        }


        /* -------------------------------------------------
           CHECK PENDING REQUEST
        ------------------------------------------------- */

        const pending =
            db.prepare(`
                SELECT id
                FROM signup_requests
                WHERE email = ?
                COLLATE NOCASE
                AND status = 'pending'
            `).get(email);


        if (pending) {

            return res.status(409).json({
                success: false,
                message:
                    'A registration request for this email is already pending.'
            });

        }


        /* -------------------------------------------------
           CREATE REQUEST
        ------------------------------------------------- */

        const requestId =
            id('REQ');

        const createdAt =
            new Date().toISOString();


        db.prepare(`
            INSERT INTO signup_requests
            (
                id,
                first_name,
                middle_name,
                last_name,
                email,
                phone,
                aadhaar,
                pan,
                message,
                created_at
            )
            VALUES
            (
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
            requestId,
            firstName,
            middleName,
            lastName,
            email,
            phone,
            aadhaar,
            pan,
            message,
            createdAt
        );


        return res.status(201).json({
            success: true,
            message:
                'Your registration request has been submitted to the administrator.',
            requestId
        });


    } catch (error) {

        console.error(
            'Signup request error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Unable to submit signup request.'
        });

    }

});


/* =========================================================
   ADMIN — GET SIGNUP REQUESTS
========================================================= */

router.get(
    '/admin/signup-requests',
    requireAuth,
    requireRole('admin'),
    (req, res) => {

        try {

            const requests =
                db.prepare(`
                    SELECT
                        id,
                        first_name AS firstName,
                        middle_name AS middleName,
                        last_name AS lastName,
                        email,
                        phone,
                        aadhaar,
                        pan,
                        message,
                        status,
                        created_at AS createdAt,
                        reviewed_at AS reviewedAt,
                        approved_username AS approvedUsername
                    FROM signup_requests
                    ORDER BY created_at DESC
                `).all();


            return res.json({
                success: true,
                requests
            });


        } catch (error) {

            console.error(
                'Get signup requests error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Unable to load signup requests.'
            });

        }

    }
);


/* =========================================================
   ADMIN — APPROVE SIGNUP REQUEST
========================================================= */

router.post(
    '/admin/signup-requests/:id/approve',
    requireAuth,
    requireRole('admin'),
    (req, res) => {

        try {

            const username =
                clean(req.body.username);

            const password =
                String(req.body.password || '');


            /* -------------------------------------------------
               VALIDATION
            ------------------------------------------------- */

            if (username.length < 4) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Username must contain at least 4 characters.'
                });

            }


            if (password.length < 8) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Password must contain at least 8 characters.'
                });

            }


            /* -------------------------------------------------
               FIND REQUEST
            ------------------------------------------------- */

            const request =
                db.prepare(`
                    SELECT *
                    FROM signup_requests
                    WHERE id = ?
                `).get(req.params.id);


            if (!request) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Signup request not found.'
                });

            }


            /* -------------------------------------------------
               CHECK REQUEST STATUS
            ------------------------------------------------- */

            if (
                request.status !== 'pending'
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        'This request has already been processed.'
                });

            }


            /* -------------------------------------------------
               CHECK USERNAME
            ------------------------------------------------- */

            const existingUsername =
                db.prepare(`
                    SELECT id
                    FROM users
                    WHERE username = ?
                    COLLATE NOCASE
                `).get(username);


            if (existingUsername) {

                return res.status(409).json({
                    success: false,
                    message:
                        'That username is already in use.'
                });

            }


            /* -------------------------------------------------
               CREATE EMPLOYEE
            ------------------------------------------------- */

            const employeeId =
                id('EMP');

            const now =
                new Date().toISOString();

            const passwordHash =
                bcrypt.hashSync(
                    password,
                    12
                );


            /* -------------------------------------------------
               TRANSACTION
            ------------------------------------------------- */

            const tx =
                db.transaction(() => {

                    db.prepare(`
                        INSERT INTO users
                        (
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
                        VALUES
                        (
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
                        username,
                        passwordHash,
                        request.first_name,
                        request.middle_name,
                        request.last_name,
                        request.email,
                        request.phone,
                        now,
                        now
                    );


                    db.prepare(`
                        UPDATE signup_requests
                        SET
                            status = 'approved',
                            reviewed_at = ?,
                            reviewed_by = ?,
                            approved_username = ?
                        WHERE id = ?
                    `).run(
                        now,
                        req.user.id,
                        username,
                        request.id
                    );

                });


            tx();


            /* -------------------------------------------------
               SUCCESS
            ------------------------------------------------- */

            return res.json({
                success: true,
                message:
                    'Employee account created successfully.',
                user: {
                    username,
                    name: [
                        request.first_name,
                        request.middle_name,
                        request.last_name
                    ]
                        .filter(Boolean)
                        .join(' '),
                    email:
                        request.email
                }
            });


        } catch (error) {

            console.error(
                'Approve signup request error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Unable to approve signup request.'
            });

        }

    }
);


/* =========================================================
   ADMIN — REJECT SIGNUP REQUEST
========================================================= */

router.post(
    '/admin/signup-requests/:id/reject',
    requireAuth,
    requireRole('admin'),
    (req, res) => {

        try {

            const request =
                db.prepare(`
                    SELECT *
                    FROM signup_requests
                    WHERE id = ?
                `).get(req.params.id);


            if (!request) {

                return res.status(404).json({
                    success: false,
                    message:
                        'Signup request not found.'
                });

            }


            if (
                request.status !== 'pending'
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        'This request has already been processed.'
                });

            }


            db.prepare(`
                UPDATE signup_requests
                SET
                    status = 'rejected',
                    reviewed_at = ?,
                    reviewed_by = ?
                WHERE id = ?
            `).run(
                new Date().toISOString(),
                req.user.id,
                request.id
            );


            return res.json({
                success: true,
                message:
                    'Signup request rejected.'
            });


        } catch (error) {

            console.error(
                'Reject signup request error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Unable to reject signup request.'
            });

        }

    }
);


/* =========================================================
   ADMIN — DEBUG SIGNUP REQUEST
========================================================= */

router.get(
    '/admin/signup-requests/debug/:id',
    requireAuth,
    requireRole('admin'),
    (req, res) => {

        try {

            const request =
                db.prepare(`
                    SELECT
                        id,
                        first_name,
                        middle_name,
                        last_name,
                        email,
                        phone,
                        aadhaar,
                        pan,
                        message,
                        status,
                        created_at,
                        reviewed_at,
                        reviewed_by,
                        approved_username
                    FROM signup_requests
                    WHERE id = ?
                `).get(req.params.id);


            return res.json({
                success: true,
                found: !!request,
                request: request || null
            });


        } catch (error) {

            console.error(
                'Signup debug error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Unable to inspect signup request.'
            });

        }

    }
);


/* =========================================================
   EXPORT
========================================================= */

module.exports = router;