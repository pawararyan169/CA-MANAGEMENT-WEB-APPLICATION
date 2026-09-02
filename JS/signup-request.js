/* =========================================================
   SIGNUP REQUESTS — ADMIN
========================================================= */

(() => {

    'use strict';


    /* =====================================================
       DOM HELPERS
    ===================================================== */

    const $ = id =>
        document.getElementById(id);


    const escapeHtml = value => {

        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

    };


    /* =====================================================
       API REQUEST HELPER
    ===================================================== */

    async function apiRequest(
        url,
        options = {}
    ) {

        const config = {
            credentials: 'same-origin',
            cache: 'no-store',
            ...options,

            headers: {
                Accept: 'application/json',
                ...(options.headers || {})
            }
        };


        let response;


        try {

            response =
                await fetch(
                    url,
                    config
                );

        } catch (error) {

            console.error(
                'API connection error:',
                error
            );

            throw new Error(
                'Unable to connect to the server. Please check your internet connection and try again.'
            );

        }


        let data = null;


        try {

            data =
                await response.json();

        } catch (_) {

            data = null;

        }


        if (!response.ok) {

            throw new Error(
                data?.message ||
                `Server returned HTTP ${response.status}.`
            );

        }


        if (
            data &&
            data.success === false
        ) {

            throw new Error(
                data.message ||
                'The server rejected the request.'
            );

        }


        return data || {};

    }


    /* =====================================================
       LOAD REQUESTS
    ===================================================== */

    async function loadRequests() {

        const list =
            $('requestsList');

        const count =
            $('requestCount');


        if (list) {

            list.innerHTML = `
                <div class="empty-state">
                    <strong>
                        Loading requests...
                    </strong>
                </div>
            `;

        }


        if (count) {

            count.textContent =
                'Loading...';

        }


        try {

            const data =
                await apiRequest(
                    '/api/admin/signup-requests',
                    {
                        method: 'GET'
                    }
                );


            const requests =
                Array.isArray(
                    data.requests
                )
                    ? data.requests
                    : [];


            renderRequests(
                requests
            );


        } catch (error) {

            console.error(
                'Load signup requests error:',
                error
            );


            if (count) {

                count.textContent =
                    'Unable to load';

            }


            if (list) {

                list.innerHTML = `
                    <div class="empty-state">
                        <strong>
                            Unable to load signup requests.
                        </strong>

                        <div class="request-error">
                            ${escapeHtml(error.message)}
                        </div>

                        <button
                            type="button"
                            class="approve-btn"
                            id="retrySignupRequests"
                            style="margin-top:12px;"
                        >
                            Retry
                        </button>
                    </div>
                `;


                const retry =
                    $('retrySignupRequests');


                retry?.addEventListener(
                    'click',
                    loadRequests
                );

            }

        }

    }


    /* =====================================================
       RENDER REQUESTS
    ===================================================== */

    function renderRequests(
        requests
    ) {

        const list =
            $('requestsList');

        const count =
            $('requestCount');


        if (!list) {
            return;
        }


        if (count) {

            count.textContent =
                `${requests.length} request${requests.length === 1 ? '' : 's'}`;

        }


        if (!requests.length) {

            list.innerHTML = `
                <div class="empty-state">
                    <strong>
                        No signup requests
                    </strong>

                    <span>
                        There are currently no employee registration requests.
                    </span>
                </div>
            `;

            return;

        }


        list.innerHTML =
            requests
                .map(renderRequest)
                .join('');


        attachEvents();

    }


    /* =====================================================
       RENDER SINGLE REQUEST
    ===================================================== */

    function renderRequest(
        request
    ) {

        const id =
            escapeHtml(
                request.id
            );


        const firstName =
            escapeHtml(
                request.firstName
            );

        const middleName =
            escapeHtml(
                request.middleName
            );

        const lastName =
            escapeHtml(
                request.lastName
            );

        const email =
            escapeHtml(
                request.email
            );

        const phone =
            escapeHtml(
                request.phone
            );

        const aadhaar =
            escapeHtml(
                request.aadhaar
            );

        const pan =
            escapeHtml(
                request.pan
            );

        const message =
            escapeHtml(
                request.message
            );


        const fullName =
            [
                request.firstName,
                request.middleName,
                request.lastName
            ]
                .filter(Boolean)
                .join(' ');


        const status =
            String(
                request.status || 'pending'
            ).toLowerCase();


        const createdAt =
            formatDate(
                request.createdAt
            );


        let statusLabel =
            status;


        if (status === 'pending') {

            statusLabel =
                'PENDING';

        } else if (status === 'approved') {

            statusLabel =
                'APPROVED';

        } else if (status === 'rejected') {

            statusLabel =
                'REJECTED';

        }


        const processed =
            status !== 'pending';


        return `
            <article
                class="request-card"
                data-request-id="${id}"
            >

                <div class="request-header">

                    <div>
                        <strong class="request-title">
                            ${fullName || 'Unnamed applicant'}
                        </strong>

                        <span class="request-id">
                            Request ID: ${id}
                        </span>
                    </div>

                    <span class="request-status ${status}">
                        ${statusLabel}
                    </span>

                </div>


                <div class="request-info">

                    <div class="request-info-item">
                        <span>Name</span>
                        <strong>
                            ${fullName || '—'}
                        </strong>
                    </div>


                    <div class="request-info-item">
                        <span>Email</span>
                        <strong>
                            ${email || '—'}
                        </strong>
                    </div>


                    <div class="request-info-item">
                        <span>Phone</span>
                        <strong>
                            ${phone || '—'}
                        </strong>
                    </div>


                    <div class="request-info-item">
                        <span>Aadhaar</span>
                        <strong>
                            ${aadhaar || '—'}
                        </strong>
                    </div>


                    <div class="request-info-item">
                        <span>PAN</span>
                        <strong>
                            ${pan || '—'}
                        </strong>
                    </div>


                    <div class="request-info-item">
                        <span>Submitted</span>
                        <strong>
                            ${createdAt}
                        </strong>
                    </div>


                    ${
                        message
                            ? `
                                <div class="request-info-item full-width">
                                    <span>Message</span>
                                    <strong>
                                        ${message}
                                    </strong>
                                </div>
                            `
                            : ''
                    }

                </div>


                ${
                    !processed
                        ? `
                            <div class="approval-section">

                                <div class="approval-fields">

                                    <div>
                                        <label>
                                            Username
                                        </label>

                                        <input
                                            type="text"
                                            class="approval-username"
                                            placeholder="Employee username"
                                            minlength="4"
                                            autocomplete="off"
                                        >
                                    </div>


                                    <div>
                                        <label>
                                            Password
                                        </label>

                                        <input
                                            type="password"
                                            class="approval-password"
                                            placeholder="Minimum 8 characters"
                                            minlength="8"
                                            autocomplete="new-password"
                                        >
                                    </div>

                                </div>


                                <div class="approval-actions">

                                    <button
                                        type="button"
                                        class="approve-btn"
                                        data-action="approve"
                                        data-id="${id}"
                                    >
                                        Approve & Create Account
                                    </button>


                                    <button
                                        type="button"
                                        class="reject-btn"
                                        data-action="reject"
                                        data-id="${id}"
                                    >
                                        Reject
                                    </button>

                                </div>


                                <div
                                    class="request-error"
                                    data-error-for="${id}"
                                    style="display:none;"
                                ></div>

                            </div>
                        `
                        : ''
                }

            </article>
        `;

    }


    /* =====================================================
       FORMAT DATE
    ===================================================== */

    function formatDate(
        value
    ) {

        if (!value) {
            return '—';
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return escapeHtml(
                value
            );

        }


        return date.toLocaleString(
            undefined,
            {
                dateStyle: 'medium',
                timeStyle: 'short'
            }
        );

    }


    /* =====================================================
       ATTACH EVENTS
    ===================================================== */

    function attachEvents() {

        document
            .querySelectorAll(
                '[data-action="approve"]'
            )
            .forEach(button => {

                button.addEventListener(
                    'click',
                    () => {

                        approveRequest(
                            button.dataset.id,
                            button
                        );

                    }
                );

            });


        document
            .querySelectorAll(
                '[data-action="reject"]'
            )
            .forEach(button => {

                button.addEventListener(
                    'click',
                    () => {

                        rejectRequest(
                            button.dataset.id,
                            button
                        );

                    }
                );

            });

    }


    /* =====================================================
       APPROVE REQUEST
    ===================================================== */

    async function approveRequest(
        id,
        button
    ) {

        const card =
            document.querySelector(
                `[data-request-id="${CSS.escape(id)}"]`
            );


        if (!card) {
            return;
        }


        const usernameInput =
            card.querySelector(
                '.approval-username'
            );


        const passwordInput =
            card.querySelector(
                '.approval-password'
            );


        const errorBox =
            card.querySelector(
                `[data-error-for="${CSS.escape(id)}"]`
            );


        const username =
            usernameInput?.value.trim() ||
            '';

        const password =
            passwordInput?.value ||
            '';


        if (username.length < 4) {

            showRequestError(
                errorBox,
                'Username must contain at least 4 characters.'
            );

            usernameInput?.focus();

            return;

        }


        if (password.length < 8) {

            showRequestError(
                errorBox,
                'Password must contain at least 8 characters.'
            );

            passwordInput?.focus();

            return;

        }


        const confirmed =
            window.confirm(
                `Approve this signup request and create the employee account "${username}"?`
            );


        if (!confirmed) {
            return;
        }


        button.disabled = true;

        button.dataset.originalText =
            button.textContent;

        button.textContent =
            'Creating account...';


        hideRequestError(
            errorBox
        );


        try {

            const data =
                await apiRequest(
                    `/api/admin/signup-requests/${encodeURIComponent(id)}/approve`,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body:
                            JSON.stringify({
                                username,
                                password
                            })
                    }
                );


            alert(
                data.message ||
                'Employee account created successfully.'
            );


            await loadRequests();


        } catch (error) {

            console.error(
                'Approve request error:',
                error
            );


            showRequestError(
                errorBox,
                error.message
            );


            button.disabled = false;

            button.textContent =
                button.dataset.originalText ||
                'Approve & Create Account';

        }

    }


    /* =====================================================
       REJECT REQUEST
    ===================================================== */

    async function rejectRequest(
        id,
        button
    ) {

        const confirmed =
            window.confirm(
                'Reject this signup request?'
            );


        if (!confirmed) {
            return;
        }


        const card =
            document.querySelector(
                `[data-request-id="${CSS.escape(id)}"]`
            );


        const errorBox =
            card?.querySelector(
                `[data-error-for="${CSS.escape(id)}"]`
            );


        button.disabled = true;

        button.dataset.originalText =
            button.textContent;

        button.textContent =
            'Rejecting...';


        hideRequestError(
            errorBox
        );


        try {

            const data =
                await apiRequest(
                    `/api/admin/signup-requests/${encodeURIComponent(id)}/reject`,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body:
                            JSON.stringify({})
                    }
                );


            alert(
                data.message ||
                'Signup request rejected.'
            );


            await loadRequests();


        } catch (error) {

            console.error(
                'Reject request error:',
                error
            );


            showRequestError(
                errorBox,
                error.message
            );


            button.disabled = false;

            button.textContent =
                button.dataset.originalText ||
                'Reject';

        }

    }


    /* =====================================================
       ERROR HELPERS
    ===================================================== */

    function showRequestError(
        element,
        message
    ) {

        if (!element) {

            alert(
                message
            );

            return;

        }


        element.textContent =
            message;

        element.style.display =
            'block';

    }


    function hideRequestError(
        element
    ) {

        if (!element) {
            return;
        }


        element.textContent =
            '';

        element.style.display =
            'none';

    }


    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    document.addEventListener(
        'DOMContentLoaded',
        () => {

            loadRequests();

        }
    );


})();