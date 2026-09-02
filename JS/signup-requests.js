(() => {
    "use strict";

    const requestsList = document.getElementById("requestsList");
    const requestCount = document.getElementById("requestCount");

    /*
     * =========================================================
     * HELPERS
     * =========================================================
     */

    const esc = value =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    const value = value => {
        const text = String(value ?? "").trim();
        return text ? esc(text) : "—";
    };

    const date = value => {
        if (!value) return "—";

        const d = new Date(value);

        if (Number.isNaN(d.getTime())) {
            return esc(value);
        }

        return esc(
            d.toLocaleString(undefined, {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            })
        );
    };

    const nameOf = r =>
        [
            r.firstName,
            r.middleName,
            r.lastName
        ]
            .filter(v => String(v ?? "").trim())
            .join(" ") || "Unnamed applicant";


    /*
     * =========================================================
     * API HELPER
     * =========================================================
     *
     * All API requests go through the same helper.
     * credentials: "same-origin" ensures the browser sends
     * authentication cookies/session credentials when required.
     */

    async function apiRequest(url, options = {}) {
        const config = {
            credentials: "same-origin",
            cache: "no-store",
            ...options,
            headers: {
                Accept: "application/json",
                ...(options.headers || {})
            }
        };

        let response;

        try {
            response = await fetch(url, config);
        } catch (error) {
            console.error("Network error:", error);

            throw new Error(
                "Unable to connect to the server. Please check your internet connection and try again."
            );
        }

        let result = null;

        try {
            result = await response.json();
        } catch (error) {
            console.error("Invalid server response:", error);
        }

        if (!response.ok) {
            throw new Error(
                result?.message ||
                `Server returned error ${response.status}.`
            );
        }

        if (!result || result.success !== true) {
            throw new Error(
                result?.message ||
                "The server could not complete the request."
            );
        }

        return result;
    }


    /*
     * =========================================================
     * INFORMATION ITEM
     * =========================================================
     */

    function item(label, val) {
        return `
            <div class="request-info-item">
                <span>${esc(label)}</span>
                <strong>${val}</strong>
            </div>
        `;
    }


    /*
     * =========================================================
     * RENDER SINGLE REQUEST
     * =========================================================
     */

    function render(r) {
        const name = nameOf(r);

        const initials =
            name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(x => x[0])
                .join("")
                .toUpperCase() || "?";

        const status =
            String(r.status || "pending").toLowerCase();

        const pending = status === "pending";

        return `
            <article class="request-card">

                <div class="request-header">

                    <div class="request-person">

                        <div class="request-avatar">
                            ${esc(initials)}
                        </div>

                        <div>

                            <div class="request-name">
                                ${esc(name)}
                            </div>

                            <div class="request-date">
                                Submitted ${date(r.createdAt)}
                            </div>

                            <div class="request-id">
                                Request ID: ${value(r.id)}
                            </div>

                        </div>

                    </div>


                    <span
                        class="request-status ${
                            status === "approved"
                                ? "approved"
                                : status === "rejected"
                                    ? "rejected"
                                    : ""
                        }"
                    >
                        ${esc(status)}
                    </span>

                </div>


                <div class="request-section-title">
                    All submitted information
                </div>


                <div class="request-info">

                    ${item(
                        "First name",
                        value(r.firstName)
                    )}

                    ${item(
                        "Middle name",
                        value(r.middleName)
                    )}

                    ${item(
                        "Last name",
                        value(r.lastName)
                    )}

                    ${item(
                        "Email",
                        value(r.email)
                    )}

                    ${item(
                        "Phone",
                        value(r.phone)
                    )}

                    ${item(
                        "Aadhaar",
                        value(r.aadhaar)
                    )}

                    ${item(
                        "PAN",
                        value(r.pan)
                    )}

                    ${item(
                        "Request date",
                        date(r.createdAt)
                    )}

                </div>


                <div class="request-message">

                    <span>
                        Message
                    </span>

                    <p>
                        ${value(r.message)}
                    </p>

                </div>


                ${
                    pending
                        ? `
                            <div class="approval-box">

                                <h3>
                                    Approve registration
                                </h3>

                                <p>
                                    Create the employee's login credentials after reviewing the information above.
                                </p>


                                <div class="approval-fields">

                                    <input
                                        type="text"
                                        class="approval-username"
                                        placeholder="Username"
                                        minlength="4"
                                        autocomplete="off"
                                    >

                                    <input
                                        type="password"
                                        class="approval-password"
                                        placeholder="Password"
                                        minlength="8"
                                        autocomplete="new-password"
                                    >

                                </div>


                                <div class="approval-actions">

                                    <button
                                        type="button"
                                        class="approve-btn"
                                        data-action="approve"
                                        data-id="${esc(r.id)}"
                                    >
                                        Approve &amp; Create Account
                                    </button>


                                    <button
                                        type="button"
                                        class="reject-btn"
                                        data-action="reject"
                                        data-id="${esc(r.id)}"
                                    >
                                        Reject Request
                                    </button>

                                </div>


                                <div
                                    class="request-error"
                                    hidden
                                ></div>

                            </div>
                        `
                        : (
                            r.approvedUsername
                                ? `
                                    <div class="request-message">

                                        <span>
                                            Approved username
                                        </span>

                                        <p>
                                            ${value(r.approvedUsername)}
                                        </p>

                                    </div>
                                `
                                : ""
                        )
                }

            </article>
        `;
    }


    /*
     * =========================================================
     * RENDER ALL REQUESTS
     * =========================================================
     */

    function renderRequests(requests) {

        if (
            !Array.isArray(requests) ||
            !requests.length
        ) {

            requestCount.textContent =
                "0 requests";

            requestsList.innerHTML = `
                <div class="empty-state">

                    <strong>
                        No signup requests
                    </strong>

                    <p>
                        New employee registration requests will appear here.
                    </p>

                </div>
            `;

            return;
        }


        requestCount.textContent =
            `${requests.length} request${
                requests.length === 1
                    ? ""
                    : "s"
            }`;


        requestsList.innerHTML =
            requests
                .map(render)
                .join("");
    }


    /*
     * =========================================================
     * LOAD SIGNUP REQUESTS
     * =========================================================
     */

    async function loadRequests() {

        requestsList.innerHTML = `
            <div class="empty-state">
                <strong>
                    Loading requests...
                </strong>
            </div>
        `;


        try {

            const result =
                await apiRequest(
                    "/api/admin/signup-requests",
                    {
                        method: "GET"
                    }
                );


            renderRequests(
                result.requests
            );

        } catch (error) {

            console.error(
                "Load signup requests error:",
                error
            );


            requestCount.textContent =
                "Error";


            requestsList.innerHTML = `
                <div class="empty-state">

                    <strong>
                        Unable to load signup requests
                    </strong>

                    <p>
                        ${esc(error.message)}
                    </p>

                </div>
            `;
        }
    }


    /*
     * =========================================================
     * APPROVE REQUEST
     * =========================================================
     */

    async function approve(card, id) {

        const usernameInput =
            card.querySelector(
                ".approval-username"
            );

        const passwordInput =
            card.querySelector(
                ".approval-password"
            );

        const errorBox =
            card.querySelector(
                ".request-error"
            );

        const approveBtn =
            card.querySelector(
                '[data-action="approve"]'
            );

        const rejectBtn =
            card.querySelector(
                '[data-action="reject"]'
            );


        const username =
            usernameInput?.value.trim() || "";

        const password =
            passwordInput?.value || "";


        /*
         * VALIDATE USERNAME
         */

        if (username.length < 4) {

            errorBox.textContent =
                "Username must contain at least 4 characters.";

            errorBox.hidden = false;

            usernameInput?.focus();

            return;
        }


        /*
         * VALIDATE PASSWORD
         */

        if (password.length < 8) {

            errorBox.textContent =
                "Password must contain at least 8 characters.";

            errorBox.hidden = false;

            passwordInput?.focus();

            return;
        }


        /*
         * DISABLE BUTTONS
         */

        errorBox.hidden = true;

        approveBtn.disabled = true;
        rejectBtn.disabled = true;

        approveBtn.textContent =
            "Creating account...";


        try {

            /*
             * SEND APPROVAL REQUEST
             */

            const result =
                await apiRequest(
                    `/api/admin/signup-requests/${encodeURIComponent(id)}/approve`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            username,
                            password
                        })
                    }
                );


            /*
             * SUCCESS
             */

            console.log(
                "Signup approval successful:",
                result
            );


            /*
             * Reload the list so the request
             * changes from pending -> approved.
             */

            await loadRequests();


        } catch (error) {

            console.error(
                "Approve signup request error:",
                error
            );


            errorBox.textContent =
                error.message ||
                "Unable to approve request.";


            errorBox.hidden = false;


            approveBtn.disabled = false;
            rejectBtn.disabled = false;


            approveBtn.textContent =
                "Approve & Create Account";
        }
    }


    /*
     * =========================================================
     * REJECT REQUEST
     * =========================================================
     */

    async function reject(card, id) {

        if (
            !window.confirm(
                "Reject this signup request?"
            )
        ) {
            return;
        }


        const errorBox =
            card.querySelector(
                ".request-error"
            );

        const approveBtn =
            card.querySelector(
                '[data-action="approve"]'
            );

        const rejectBtn =
            card.querySelector(
                '[data-action="reject"]'
            );


        errorBox.hidden = true;

        approveBtn.disabled = true;
        rejectBtn.disabled = true;

        rejectBtn.textContent =
            "Rejecting...";


        try {

            /*
             * SEND REJECTION REQUEST
             */

            const result =
                await apiRequest(
                    `/api/admin/signup-requests/${encodeURIComponent(id)}/reject`,
                    {
                        method: "POST"
                    }
                );


            /*
             * SUCCESS
             */

            console.log(
                "Signup rejection successful:",
                result
            );


            await loadRequests();


        } catch (error) {

            console.error(
                "Reject signup request error:",
                error
            );


            errorBox.textContent =
                error.message ||
                "Unable to reject request.";


            errorBox.hidden = false;


            approveBtn.disabled = false;
            rejectBtn.disabled = false;


            rejectBtn.textContent =
                "Reject Request";
        }
    }


    /*
     * =========================================================
     * BUTTON EVENT HANDLER
     * =========================================================
     */

    requestsList.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-action][data-id]"
                );


            if (!button) {
                return;
            }


            const card =
                button.closest(
                    ".request-card"
                );


            const id =
                button.dataset.id;


            if (!card || !id) {
                return;
            }


            if (
                button.dataset.action ===
                "approve"
            ) {

                approve(
                    card,
                    id
                );

                return;
            }


            if (
                button.dataset.action ===
                "reject"
            ) {

                reject(
                    card,
                    id
                );

                return;
            }
        }
    );


    /*
     * =========================================================
     * INITIAL LOAD
     * =========================================================
     */

    loadRequests();

})();