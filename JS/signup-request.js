document.addEventListener(
    "DOMContentLoaded",
    () => {


        const container =
            document.getElementById(
                "signupRequestsList"
            );


        if (!container) {

            return;

        }


        loadRequests();


        async function loadRequests() {

            try {

                const response =
                    await fetch(
                        "/api/admin/signup-requests"
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.message
                    );

                }


                renderRequests(
                    result.requests
                );

            }

            catch (error) {

                console.error(
                    error
                );


                container.innerHTML = `

                    <div class="empty-state">

                        <strong>
                            Unable to load requests
                        </strong>

                        <span>
                            Make sure the server is running.
                        </span>

                    </div>

                `;

            }

        }


        function renderRequests(
            requests
        ) {

            const pending =
                requests.filter(
                    request =>
                        request.status ===
                        "pending"
                );


            if (
                pending.length ===
                0
            ) {

                container.innerHTML = `

                    <div class="empty-state">

                        <strong>
                            No pending requests
                        </strong>

                        <span>
                            New employee registration requests will appear here.
                        </span>

                    </div>

                `;

                return;

            }


            container.innerHTML =
                pending.map(
                    request =>
                        createRequestCard(
                            request
                        )
                ).join("");


            attachEvents();

        }


        function createRequestCard(
            request
        ) {

            return `

                <div
                    class="signup-request-card"
                    data-request-id="${request.id}"
                >

                    <div class="request-main">


                        <div class="request-avatar">

                            ${escapeHtml(
                                request.fullName
                                    .charAt(0)
                                    .toUpperCase()
                            )}

                        </div>


                        <div class="request-details">

                            <div class="request-title-row">

                                <div>

                                    <span class="work-id">
                                        ${request.id}
                                    </span>

                                    <h3>
                                        ${escapeHtml(request.fullName)}
                                    </h3>

                                </div>

                                <span class="request-status">
                                    Pending
                                </span>

                            </div>


                            <div class="request-information">

                                <div>

                                    <span>
                                        Email
                                    </span>

                                    <strong>
                                        ${escapeHtml(request.email)}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Phone
                                    </span>

                                    <strong>
                                        ${escapeHtml(request.phone)}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Designation
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            request.designation ||
                                            "Not specified"
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Submitted
                                    </span>

                                    <strong>
                                        ${formatDate(
                                            request.createdAt
                                        )}
                                    </strong>

                                </div>

                            </div>


                            ${
                                request.message
                                    ? `
                                    <div class="request-message">

                                        <span>
                                            Applicant note
                                        </span>

                                        <p>
                                            ${escapeHtml(
                                                request.message
                                            )}
                                        </p>

                                    </div>
                                    `
                                    : ""
                            }


                            <div
                                class="approval-form"
                                id="approval-${request.id}"
                            >

                                <div class="approval-heading">

                                    <strong>
                                        Create employee credentials
                                    </strong>

                                    <span>
                                        These credentials will be used for login.
                                    </span>

                                </div>


                                <div class="approval-grid">

                                    <div class="form-group">

                                        <label>
                                            Username
                                        </label>

                                        <input
                                            type="text"
                                            class="approval-username"
                                            data-id="${request.id}"
                                            placeholder="e.g. rahul.mehta"
                                        >

                                    </div>


                                    <div class="form-group">

                                        <label>
                                            Temporary password
                                        </label>

                                        <input
                                            type="password"
                                            class="approval-password"
                                            data-id="${request.id}"
                                            placeholder="Minimum 8 characters"
                                        >

                                    </div>

                                </div>


                                <div
                                    class="approval-error"
                                    id="approvalError-${request.id}"
                                ></div>


                                <div class="approval-actions">

                                    <button
                                        type="button"
                                        class="approve-request-button"
                                        data-id="${request.id}"
                                    >
                                        Approve & create account
                                    </button>


                                    <button
                                        type="button"
                                        class="reject-request-button"
                                        data-id="${request.id}"
                                    >
                                        Reject
                                    </button>

                                </div>

                            </div>


                        </div>

                    </div>

                </div>

            `;

        }


        function attachEvents() {

            document
                .querySelectorAll(
                    ".approve-request-button"
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            "click",
                            () => {

                                approveRequest(
                                    button.dataset.id
                                );

                            }
                        );

                    }
                );


            document
                .querySelectorAll(
                    ".reject-request-button"
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            "click",
                            () => {

                                rejectRequest(
                                    button.dataset.id
                                );

                            }
                        );

                    }
                );

        }


        async function approveRequest(
            requestId
        ) {

            const username =
                document.querySelector(
                    `.approval-username[data-id="${requestId}"]`
                )?.value.trim();


            const password =
                document.querySelector(
                    `.approval-password[data-id="${requestId}"]`
                )?.value;


            const errorElement =
                document.getElementById(
                    `approvalError-${requestId}`
                );


            if (!username) {

                showError(
                    errorElement,
                    "Enter a username."
                );

                return;

            }


            if (
                username.length <
                4
            ) {

                showError(
                    errorElement,
                    "Username must contain at least 4 characters."
                );

                return;

            }


            if (!password) {

                showError(
                    errorElement,
                    "Enter a temporary password."
                );

                return;

            }


            if (
                password.length <
                8
            ) {

                showError(
                    errorElement,
                    "Password must contain at least 8 characters."
                );

                return;

            }


            try {

                const response =
                    await fetch(
                        `/api/admin/signup-requests/${requestId}/approve`,
                        {

                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({

                                    username,

                                    password

                                })

                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    showError(
                        errorElement,
                        result.message
                    );

                    return;

                }


                alert(
                    `Account created successfully.\n\nUsername: ${username}\nPassword: ${password}`
                );


                loadRequests();

            }

            catch (error) {

                console.error(
                    error
                );


                showError(
                    errorElement,
                    "Unable to connect to server."
                );

            }

        }


        async function rejectRequest(
            requestId
        ) {

            const confirmed =
                confirm(
                    "Are you sure you want to reject this registration request?"
                );


            if (!confirmed) {

                return;

            }


            try {

                const response =
                    await fetch(
                        `/api/admin/signup-requests/${requestId}/reject`,
                        {
                            method:
                                "POST"
                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    alert(
                        result.message
                    );

                    return;

                }


                loadRequests();

            }

            catch (error) {

                console.error(
                    error
                );

                alert(
                    "Unable to connect to server."
                );

            }

        }


        function showError(
            element,
            message
        ) {

            if (!element) {

                return;

            }


            element.textContent =
                message;

        }


        function formatDate(
            date
        ) {

            return new Date(
                date
            ).toLocaleString(
                "en-IN",
                {
                    day:
                        "2-digit",

                    month:
                        "short",

                    year:
                        "numeric",

                    hour:
                        "2-digit",

                    minute:
                        "2-digit"
                }
            );

        }


        function escapeHtml(
            value
        ) {

            const div =
                document.createElement(
                    "div"
                );


            div.textContent =
                value || "";


            return div.innerHTML;

        }

    }
);