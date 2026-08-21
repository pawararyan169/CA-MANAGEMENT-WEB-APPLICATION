document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadClientDetails();

    }
);


/* =========================================================
   LOAD CLIENT
========================================================= */

async function loadClientDetails() {

    const loading =
        document.getElementById(
            "clientDetailsLoading"
        );

    const details =
        document.getElementById(
            "clientDetails"
        );

    const errorBox =
        document.getElementById(
            "clientDetailsError"
        );


    try {

        const params =
            new URLSearchParams(
                window.location.search
            );


        const clientId =
            params.get("id");


        if (!clientId) {

            throw new Error(
                "Client ID is missing."
            );

        }


        const response =
            await fetch(
                `/api/clients/${encodeURIComponent(clientId)}`,
                {
                    method: "GET",
                    credentials: "same-origin",
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        const result =
            await response.json();


        console.log(
            "Employee client details:",
            result
        );


        if (!response.ok) {

            throw new Error(
                result.message ||
                `Server returned ${response.status}`
            );

        }


        if (!result.success) {

            throw new Error(
                result.message ||
                "Unable to load client."
            );

        }


        const client =
            result.client;


        if (!client) {

            throw new Error(
                "Client information was not returned."
            );

        }


        populateClient(
            client
        );


        if (loading) {

            loading.style.display =
                "none";

        }


        if (details) {

            details.style.display =
                "block";

        }

    }

    catch (error) {

        console.error(
            "Employee client details error:",
            error
        );


        if (loading) {

            loading.style.display =
                "none";

        }


        if (errorBox) {

            errorBox.textContent =
                error.message ||
                "Unable to load client details.";

            errorBox.style.display =
                "block";

        }

    }

}


/* =========================================================
   POPULATE
========================================================= */

function populateClient(
    client
) {

    setText(
        "clientName",
        client.name ||
        "Unnamed Client"
    );


    setText(
        "clientSubtitle",
        formatClientType(
            client.clientType
        )
    );


    setText(
        "detailName",
        client.name
    );


    setText(
        "detailType",
        formatClientType(
            client.clientType
        )
    );


    setText(
        "detailGender",
        formatGender(
            client.gender
        )
    );


    setText(
        "detailStatus",
        formatStatus(
            client.status
        )
    );


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


    setText(
        "detailContact",
        client.contactNumber
    );


    setText(
        "detailEmail",
        client.email
    );


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

}


/* =========================================================
   SET TEXT
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.textContent =
        value === null ||
        value === undefined ||
        String(value).trim() === ""
            ? "—"
            : String(value);

}


/* =========================================================
   CLIENT TYPE
========================================================= */

function formatClientType(
    type
) {

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


    return (
        types[type] ||
        type ||
        "Client"
    );

}


/* =========================================================
   GENDER
========================================================= */

function formatGender(
    gender
) {

    if (!gender) {
        return "—";
    }


    const values = {

        male:
            "Male",

        female:
            "Female",

        other:
            "Other"

    };


    return (
        values[gender] ||
        gender
    );

}


/* =========================================================
   STATUS
========================================================= */

function formatStatus(
    status
) {

    if (!status) {
        return "Active";
    }


    return String(
        status
    )
        .charAt(0)
        .toUpperCase() +
        String(
            status
        ).slice(1);

}


/* =========================================================
   DATE
========================================================= */

function formatDate(
    value
) {

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


/* =========================================================
   DATE + TIME
========================================================= */

function formatDateTime(
    value
) {

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
    button.href = "/employee/edit-client.html?id=" + encodeURIComponent(id);
    button.textContent = "✎ Edit Profile";
    button.style.cssText = "display:inline-flex;align-items:center;justify-content:center;margin-top:14px;height:40px;padding:0 16px;border-radius:8px;background:#111827;color:#fff;text-decoration:none;font-size:13px;font-weight:600;";
    left.appendChild(button);
})();
