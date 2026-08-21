document.addEventListener("DOMContentLoaded", () => {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const clientId =
        params.get("id");


    const loading =
        document.getElementById(
            "clientDetailsLoading"
        );


    const details =
        document.getElementById(
            "clientDetails"
        );


    const error =
        document.getElementById(
            "clientDetailsError"
        );


    function setText(
        id,
        value
    ) {

        const element =
            document.getElementById(id);


        if (!element) {
            return;
        }


        element.textContent =
            value === null ||
            value === undefined ||
            value === ""
                ? "—"
                : value;

    }


    function formatDate(value) {

        if (!value) {
            return "—";
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return value;

        }


        return date.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    }


    function formatDateTime(value) {

        if (!value) {
            return "—";
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return value;

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


    function clientTypeLabel(type) {

        const types = {

            individual:
                "Individual",

            huf:
                "HUF",

            partnership:
                "Partnership Firm",

            llp:
                "LLP",

            private_limited:
                "Private Limited Company",

            cooperative_society:
                "Co-operative Society",

            trust:
                "Trust"

        };


        return types[type] ||
            type ||
            "—";

    }


    function showError(message) {

        if (!error) {
            return;
        }


        error.textContent =
            message;


        error.style.display =
            "block";

    }


    function escapeHtml(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }


        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    async function loadClient() {

        if (!clientId) {

            showError(
                "No client ID was provided."
            );

            if (loading) {
                loading.style.display =
                    "none";
            }

            return;

        }


        try {

            const response =
                await fetch(
                    `/api/clients/${encodeURIComponent(clientId)}`,
                    {
                        method: "GET",
                        credentials: "include"
                    }
                );


            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    result.message ||
                    "Unable to load client."
                );

            }


            const client =
                result.client;


            if (!client) {

                throw new Error(
                    "Client record was not returned."
                );

            }


            renderClient(client);


            if (loading) {

                loading.style.display =
                    "none";

            }


            if (details) {

                details.style.display =
                    "block";

            }

        }

        catch (err) {

            console.error(
                "Load client details error:",
                err
            );


            if (loading) {

                loading.style.display =
                    "none";

            }


            showError(
                err.message ||
                "Unable to load client."
            );

        }

    }


    function renderClient(client) {

        const fullName =
            client.name ||
            [
                client.firstName,
                client.middleName,
                client.lastName
            ]
            .filter(Boolean)
            .join(" ");


        /*
         * HEADER
         */

        setText(
            "clientName",
            fullName || "Client"
        );


        setText(
            "clientSubtitle",
            `${clientTypeLabel(client.clientType)} • ${client.id}`
        );


        /*
         * BASIC
         */

        setText(
            "detailName",
            fullName
        );


        setText(
            "detailType",
            clientTypeLabel(
                client.clientType
            )
        );


        setText(
            "detailGender",
            client.gender
                ? client.gender
                    .charAt(0)
                    .toUpperCase() +
                  client.gender.slice(1)
                : "—"
        );


        setText(
            "detailStatus",
            client.status || "Active"
        );


        /*
         * LOCATION
         */

        setText(
            "detailLocation",
            client.locationName
        );


        setText(
            "detailState",
            client.state
        );


        setText(
            "detailDistrict",
            client.district
        );


        setText(
            "detailCity",
            client.city
        );


        setText(
            "detailAddress",
            client.address
        );


        /*
         * TAX
         */

        setText(
            "detailPan",
            client.pan
        );


        setText(
            "detailAadhaar",
            client.aadhaar
        );


        setText(
            "detailTan",
            client.tan
        );


        setText(
            "detailGst",
            client.gst
        );


        setText(
            "detailUdyam",
            client.udyam
        );


        setText(
            "detailCin",
            client.cin
        );


        setText(
            "detailFssai",
            client.fssai
        );


        setText(
            "detailPtec",
            client.ptec
        );


        setText(
            "detailPtrc",
            client.ptrc
        );


        /*
         * CONTACT
         */

        setText(
            "detailContact",
            client.contactNumber
        );


        setText(
            "detailEmail",
            client.email
        );


        /*
         * DATES
         */

        setText(
            "detailDob",
            formatDate(
                client.dateOfBirth
            )
        );


        setText(
            "detailRegistration",
            formatDate(
                client.dateOfRegistration
            )
        );


        /*
         * AUTHORISED PERSON
         */

        setText(
            "detailAuthorisedSame",
            client.authorisedSameAsClient
                ? "Yes"
                : "No"
        );


        setText(
            "detailAuthorisedName",
            client.authorisedPersonName
        );


        setText(
            "detailAuthorisedContact",
            client.authorisedPersonContact
        );


        setText(
            "detailAuthorisedEmail",
            client.authorisedPersonEmail
        );


        /*
         * RECORD
         */

        setText(
            "detailId",
            client.id
        );


        setText(
            "detailCreatedBy",
            client.createdBy
        );


        setText(
            "detailCreatedAt",
            formatDateTime(
                client.createdAt
            )
        );


        setText(
            "detailUpdatedAt",
            formatDateTime(
                client.updatedAt
            )
        );


        /*
         * ASSIGNED EMPLOYEES
         */

        const employeeContainer =
            document.getElementById(
                "assignedEmployees"
            );


        if (!employeeContainer) {
            return;
        }


        const names =
            client.assignedEmployeeNames ||
            client.assigned_employee_names;


        if (names) {

            const list =
                names
                    .split(",")
                    .map(name => name.trim())
                    .filter(Boolean);


            if (list.length) {

                employeeContainer.innerHTML =
                    list
                        .map(name => `
                            <div
                                style="
                                    padding:12px 14px;
                                    border:1px solid #eee;
                                    border-radius:8px;
                                    margin-bottom:8px;
                                "
                            >
                                ${escapeHtml(name)}
                            </div>
                        `)
                        .join("");

                return;

            }

        }


        /*
         * If names aren't returned by the API,
         * show assigned employee IDs.
         */

        if (
            Array.isArray(
                client.assignedEmployees
            ) &&
            client.assignedEmployees.length
        ) {

            employeeContainer.innerHTML =
                client.assignedEmployees
                    .map(id => `
                        <div
                            style="
                                padding:12px 14px;
                                border:1px solid #eee;
                                border-radius:8px;
                                margin-bottom:8px;
                            "
                        >
                            Employee ID:
                            ${escapeHtml(id)}
                        </div>
                    `)
                    .join("");

            return;

        }


        employeeContainer.innerHTML =
            `<span style="color:#777;">
                No employees assigned.
            </span>`;

    }


    loadClient();

});
/* =========================================================
   EDIT CLIENT PROFILE BUTTON
========================================================= */

(function addEditClientButton() {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;

    const header = document.querySelector(".client-details-header");
    if (!header) return;

    const left = header.firstElementChild;
    if (!left || document.getElementById("editClientProfileButton")) return;

    const button = document.createElement("a");
    button.id = "editClientProfileButton";
    button.href = "/admin/edit-client.html?id=" + encodeURIComponent(id);
    button.textContent = "✎ Edit Profile";
    button.style.cssText = "display:inline-flex;align-items:center;justify-content:center;margin-top:14px;height:40px;padding:0 16px;border-radius:8px;background:#111827;color:#fff;text-decoration:none;font-size:13px;font-weight:600;";
    left.appendChild(button);
})();
