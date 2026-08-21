document.addEventListener(
    "DOMContentLoaded",
    () => {

        const list =
            document.getElementById(
                "requestsList"
            );

        const count =
            document.getElementById(
                "requestCount"
            );


        async function loadRequests() {

            try {

                console.log(
                    "Loading signup requests..."
                );


                const response =
                    await fetch(
                        "/api/admin/signup-requests"
                    );


                const result =
                    await response.json();


                console.log(
                    "Signup requests response:",
                    result
                );


                if (!response.ok) {

                    throw new Error(
                        result.message ||
                        "Unable to load signup requests."
                    );

                }


                const requests =
                    result.requests || [];


                count.textContent =
                    requests.length +
                    (
                        requests.length === 1
                            ? " request"
                            : " requests"
                    );


                renderRequests(
                    requests
                );

            }

            catch (error) {

                console.error(
                    "Signup request load error:",
                    error
                );


                list.innerHTML = `

                    <div class="empty-state">

                        <strong>
                            Unable to load signup requests
                        </strong>

                        <span>
                            ${escapeHtml(
                                error.message
                            )}
                        </span>

                    </div>

                `;

                count.textContent =
                    "Error";

            }

        }


        function renderRequests(
            requests
        ) {

            if (!requests.length) {

                list.innerHTML = `

                    <div class="empty-state">

                        <strong>
                            No signup requests
                        </strong>

                        <span>
                            New employee registrations will appear here.
                        </span>

                    </div>

                `;

                return;

            }


            list.innerHTML =
                requests
                    .map(
                        request =>
                            createRequestCard(
                                request
                            )
                    )
                    .join("");


            attachEvents();

        }


        function createRequestCard(
            request
        ) {

            const fullName =
                [
                    request.first_name,
                    request.middle_name,
                    request.last_name
                ]
                    .filter(Boolean)
                    .join(" ");


            const initials =
                fullName
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(
                        word =>
                            word
                                .charAt(0)
                                .toUpperCase()
                    )
                    .join("");


            const status =
                request.status ||
                "pending";


            const isPending =
                status === "pending";


            return `

                <article
                    class="request-card"
                    data-request-id="${escapeHtml(
                        request.id
                    )}"
                >

                    <div class="request-header">


                        <div class="request-person">


                            <div class="request-avatar">

                                ${escapeHtml(
                                    initials || "E"
                                )}

                            </div>


                            <div>

                                <div class="request-name">

                                    ${escapeHtml(
                                        fullName ||
                                        "Unnamed applicant"
                                    )}

                                </div>


                                <div class="request-date">

                                    Submitted
                                    ${formatDate(
                                        request.created_at
                                    )}

                                </div>

                            </div>


                        </div>


                        <span
                            class="
                                request-status
                                ${status}
                            "
                        >

                            ${escapeHtml(
                                status
                            )}

                        </span>


                    </div>


                    <div class="request-info">


                        <div class="request-info-item">

                            <span>
                                Email
                            </span>

                            <strong>
                                ${escapeHtml(
                                    request.email
                                )}
                            </strong>

                        </div>


                        <div class="request-info-item">

                            <span>
                                Contact
                            </span>

                            <strong>
                                ${escapeHtml(
                                    request.phone
                                )}
                            </strong>

                        </div>


                        <div class="request-info-item">

                            <span>
                                Request ID
                            </span>

                            <strong>
                                ${escapeHtml(
                                    request.id
                                )}
                            </strong>

                        </div>


                    </div>


                    ${
                        request.message
                            ? `

                                <div class="request-message">

                                    <span>
                                        Message
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


                    ${
                        isPending
                            ? `

                                <div class="approval-box">

                                    <h3>
                                        Approve employee
                                    </h3>

                                    <p>
                                        Create the login credentials for this employee.
                                    </p>


                                    <div class="approval-fields">

                                        <input
                                            type="text"
                                            class="approval-username"
                                            placeholder="Username"
                                            minlength="4"
                                        >

                                        <input
                                            type="password"
                                            class="approval-password"
                                            placeholder="Password"
                                            minlength="8"
                                        >

                                    </div>


                                    <div class="approval-actions">

                                        <button
                                            type="button"
                                            class="approve-btn"
                                            data-action="approve"
                                        >
                                            Approve & Create Account
                                        </button>


                                        <button
                                            type="button"
                                            class="reject-btn"
                                            data-action="reject"
                                        >
                                            Reject
                                        </button>

                                    </div>


                                    <div
                                        class="request-error"
                                    ></div>

                                </div>

                              `
                            : ""
                    }

                </article>

            `;

        }


        function attachEvents() {

            document
                .querySelectorAll(
                    "[data-action='approve']"
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            "click",
                            () => {

                                const card =
                                    button.closest(
                                        ".request-card"
                                    );


                                approveRequest(
                                    card
                                );

                            }
                        );

                    }
                );


            document
                .querySelectorAll(
                    "[data-action='reject']"
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            "click",
                            () => {

                                const card =
                                    button.closest(
                                        ".request-card"
                                    );


                                rejectRequest(
                                    card
                                );

                            }
                        );

                    }
                );

        }


        async function approveRequest(
            card
        ) {

            const requestId =
                card.dataset.requestId;


            const username =
                card
                    .querySelector(
                        ".approval-username"
                    )
                    .value
                    .trim();


            const password =
                card
                    .querySelector(
                        ".approval-password"
                    )
                    .value;


            const errorBox =
                card.querySelector(
                    ".request-error"
                );


            if (
                username.length < 4
            ) {

                errorBox.textContent =
                    "Username must contain at least 4 characters.";

                return;

            }


            if (
                password.length < 8
            ) {

                errorBox.textContent =
                    "Password must contain at least 8 characters.";

                return;

            }


            errorBox.textContent =
                "";


            try {

                const response =
                    await fetch(
                        `/api/admin/signup-requests/${encodeURIComponent(
                            requestId
                        )}/approve`,
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

                    throw new Error(
                        result.message ||
                        "Unable to approve request."
                    );

                }


                alert(
                    "Employee approved successfully."
                );


                await loadRequests();

            }

            catch (error) {

                console.error(
                    error
                );


                errorBox.textContent =
                    error.message;

            }

        }


        async function rejectRequest(
            card
        ) {

            const requestId =
                card.dataset.requestId;


            const confirmed =
                confirm(
                    "Reject this signup request?"
                );


            if (!confirmed) {

                return;

            }


            try {

                const response =
                    await fetch(
                        `/api/admin/signup-requests/${encodeURIComponent(
                            requestId
                        )}/reject`,
                        {

                            method:
                                "POST"

                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.message ||
                        "Unable to reject request."
                    );

                }


                await loadRequests();

            }

            catch (error) {

                console.error(
                    error
                );

                alert(
                    error.message
                );

            }

        }


        function formatDate(
            value
        ) {

            if (!value) {

                return "—";

            }


            const date =
                new Date(
                    value
                );


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {

                return "—";

            }


            return date.toLocaleString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );

        }


        function escapeHtml(
            value
        ) {

            return String(
                value ?? ""
            )
                .replace(
                    /&/g,
                    "&amp;"
                )
                .replace(
                    /</g,
                    "&lt;"
                )
                .replace(
                    />/g,
                    "&gt;"
                )
                .replace(
                    /"/g,
                    "&quot;"
                )
                .replace(
                    /'/g,
                    "&#039;"
                );

        }


        loadRequests();

    }
);