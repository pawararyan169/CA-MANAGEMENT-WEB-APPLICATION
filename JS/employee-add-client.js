document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
       ELEMENTS
    ========================================================= */

    const form =
        document.getElementById("clientForm");

    const saveButton =
        document.getElementById("saveClientButton");

    const errorBox =
        document.getElementById("clientError");

    const successBox =
        document.getElementById("clientSuccess");

    const stateSelect =
        document.getElementById("clientState") ||
        document.getElementById("state");

    const districtSelect =
        document.getElementById("clientDistrict") ||
        document.getElementById("district");

    const citySelect =
        document.getElementById("clientCity") ||
        document.getElementById("city");

    const locationSelect =
        document.getElementById("locationId");

    const authorisedSame =
        document.getElementById(
            "authorisedSameAsClient"
        ) ||
        document.getElementById(
            "authorisedPersonSameAsClient"
        );


    /* =========================================================
       SAFETY
    ========================================================= */

    if (!form) {

        console.error(
            "Employee Add Client: #clientForm not found."
        );

        return;
    }


    /* =========================================================
       HELPERS
    ========================================================= */

    function value(id) {

        const element =
            document.getElementById(id);

        if (!element) {
            return "";
        }

        return String(
            element.value || ""
        ).trim();
    }


    function showError(message) {

        console.error(
            "Employee Add Client:",
            message
        );

        if (!errorBox) {
            alert(message);
            return;
        }

        errorBox.textContent =
            message;

        errorBox.style.display =
            "block";

        errorBox.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }


    function showSuccess(message) {

        if (!successBox) {
            alert(message);
            return;
        }

        successBox.textContent =
            message;

        successBox.style.display =
            "block";

        successBox.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }


    function hideMessages() {

        if (errorBox) {

            errorBox.style.display =
                "none";

            errorBox.textContent =
                "";
        }

        if (successBox) {

            successBox.style.display =
                "none";

            successBox.textContent =
                "";
        }
    }


    /* =========================================================
       LOCATION SYSTEM
    ========================================================= */

    function resetDistricts() {

        if (!districtSelect) {
            return;
        }

        districtSelect.innerHTML = `
            <option value="">
                Select district
            </option>
        `;

        districtSelect.disabled =
            true;
    }


    function resetCities() {

        if (!citySelect) {
            return;
        }

        citySelect.innerHTML = `
            <option value="">
                Select city / town
            </option>
        `;

        citySelect.disabled =
            true;
    }


    function getLocationData() {

        if (window.CAOfficeLocation) {
            return window.CAOfficeLocation;
        }

        if (window.locationData) {
            return window.locationData;
        }

        return null;
    }


    /*
     * IMPORTANT FIX:
     *
     * location-data.js creates CAOfficeLocation inside
     * its own DOMContentLoaded callback.
     *
     * This script also starts on DOMContentLoaded.
     *
     * Therefore we wait for the API instead of immediately
     * saying "location-data.js is not loaded".
     */

    async function initializeLocations() {

        let locationAPI =
            getLocationData();


        for (
            let attempt = 0;
            !locationAPI && attempt < 40;
            attempt++
        ) {

            await new Promise(resolve => {
                setTimeout(resolve, 50);
            });

            locationAPI =
                getLocationData();
        }


        if (!locationAPI) {

            console.error(
                "Location API is unavailable after waiting for location-data.js."
            );

            showError(
                "Location data could not be loaded. Check /JS/location-data.js."
            );

            return;
        }


        try {

            if (
                typeof locationAPI.populateStates ===
                "function"
            ) {

                locationAPI.populateStates();

            }
            else if (
                typeof window.populateStates ===
                "function"
            ) {

                window.populateStates();

            }
            else {

                throw new Error(
                    "populateStates() is not available."
                );
            }

        }
        catch (error) {

            console.error(
                "Location initialization error:",
                error
            );

            showError(
                "Unable to initialize states."
            );
        }
    }


    /* =========================================================
       STATE CHANGE
    ========================================================= */

    if (stateSelect) {

        stateSelect.addEventListener(
            "change",
            function () {

                const state =
                    this.value.trim();


                resetDistricts();
                resetCities();


                if (!state) {
                    return;
                }


                const locationAPI =
                    getLocationData();


                if (!locationAPI) {

                    showError(
                        "Location data is still loading. Please try again in a moment."
                    );

                    return;
                }


                try {

                    if (
                        typeof locationAPI.populateDistricts ===
                        "function"
                    ) {

                        locationAPI.populateDistricts(
                            state
                        );

                    }
                    else if (
                        typeof window.populateDistricts ===
                        "function"
                    ) {

                        window.populateDistricts(
                            state
                        );

                    }
                    else {

                        throw new Error(
                            "populateDistricts() is not available."
                        );
                    }

                }
                catch (error) {

                    console.error(
                        "District loading error:",
                        error
                    );

                    showError(
                        "Unable to load districts for " +
                        state +
                        "."
                    );
                }

            }
        );
    }


    /* =========================================================
       DISTRICT CHANGE
    ========================================================= */

    if (districtSelect) {

        districtSelect.addEventListener(
            "change",
            function () {

                const state =
                    stateSelect
                        ? stateSelect.value.trim()
                        : "";

                const district =
                    this.value.trim();


                resetCities();


                if (
                    !state ||
                    !district
                ) {
                    return;
                }


                const locationAPI =
                    getLocationData();


                if (!locationAPI) {

                    showError(
                        "Location data is still loading. Please try again in a moment."
                    );

                    return;
                }


                try {

                    if (
                        typeof locationAPI.populateCities ===
                        "function"
                    ) {

                        locationAPI.populateCities(
                            state,
                            district
                        );

                    }
                    else if (
                        typeof window.populateCities ===
                        "function"
                    ) {

                        window.populateCities(
                            state,
                            district
                        );

                    }
                    else {

                        throw new Error(
                            "populateCities() is not available."
                        );
                    }

                }
                catch (error) {

                    console.error(
                        "City loading error:",
                        error
                    );

                    showError(
                        "Unable to load cities for " +
                        district +
                        "."
                    );
                }

            }
        );
    }


    /* =========================================================
       INITIALIZE LOCATION DATA
    ========================================================= */

    initializeLocations();


    /* =========================================================
       OFFICE LOCATIONS
    ========================================================= */

    async function loadOfficeLocations() {

        if (!locationSelect) {

            console.warn(
                "#locationId not found."
            );

            return;
        }


        locationSelect.innerHTML = `
            <option value="">
                Loading office locations...
            </option>
        `;

        locationSelect.disabled =
            true;


        try {

            const response =
                await fetch(
                    "/api/locations",
                    {
                        method: "GET",

                        credentials:
                            "same-origin",

                        headers: {
                            "Accept":
                                "application/json"
                        }
                    }
                );


            const result =
                await response.json();


            if (
                !response.ok ||
                !result.success
            ) {

                throw new Error(
                    result.message ||
                    "Unable to load office locations."
                );
            }


            const locations =
                Array.isArray(
                    result.locations
                )
                    ? result.locations
                    : [];


            locationSelect.innerHTML = `
                <option value="">
                    Select office location
                </option>
            `;


            locations.forEach(
                location => {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        String(
                            location.id
                        );


                    let label =
                        location.name ||
                        "Office";


                    if (
                        location.city
                    ) {

                        label +=
                            " — " +
                            location.city;
                    }


                    if (
                        location.state
                    ) {

                        label +=
                            ", " +
                            location.state;
                    }


                    option.textContent =
                        label;


                    locationSelect.appendChild(
                        option
                    );

                }
            );


            if (
                locations.length === 0
            ) {

                locationSelect.innerHTML = `
                    <option value="">
                        No office locations available
                    </option>
                `;
            }


            locationSelect.disabled =
                false;

        }
        catch (error) {

            console.error(
                "Office location error:",
                error
            );


            locationSelect.innerHTML = `
                <option value="">
                    Unable to load office locations
                </option>
            `;


            locationSelect.disabled =
                false;
        }
    }


    loadOfficeLocations();


    /* =========================================================
       CLIENT NAME
    ========================================================= */

    function getClientName() {

        return [
            value("firstName"),
            value("middleName"),
            value("lastName")
        ]
            .filter(Boolean)
            .join(" ");
    }


    /* =========================================================
       AUTHORISED PERSON
    ========================================================= */

    function copyClientToAuthorisedPerson() {

        const name =
            document.getElementById(
                "authorisedPersonName"
            );

        const contact =
            document.getElementById(
                "authorisedPersonContact"
            );

        const email =
            document.getElementById(
                "authorisedPersonEmail"
            );


        if (name) {

            name.value =
                getClientName();
        }


        if (contact) {

            contact.value =
                value("contact");
        }


        if (email) {

            email.value =
                value("email");
        }
    }


    function setAuthorisedDisabled(
        disabled
    ) {

        [
            "authorisedPersonName",
            "authorisedPersonContact",
            "authorisedPersonEmail"
        ]
            .forEach(
                id => {

                    const element =
                        document.getElementById(
                            id
                        );


                    if (element) {

                        element.disabled =
                            disabled;
                    }

                }
            );
    }


    if (authorisedSame) {

        authorisedSame.addEventListener(
            "change",
            function () {

                if (this.checked) {

                    copyClientToAuthorisedPerson();

                    setAuthorisedDisabled(
                        true
                    );

                }
                else {

                    setAuthorisedDisabled(
                        false
                    );
                }

            }
        );
    }


    /* =========================================================
       KEEP AUTHORISED PERSON UPDATED
    ========================================================= */

    [
        "firstName",
        "middleName",
        "lastName",
        "contact",
        "email"
    ]
        .forEach(
            id => {

                const element =
                    document.getElementById(
                        id
                    );


                if (!element) {
                    return;
                }


                element.addEventListener(
                    "input",
                    () => {

                        if (
                            authorisedSame &&
                            authorisedSame.checked
                        ) {

                            copyClientToAuthorisedPerson();
                        }

                    }
                );

            }
        );


    /* =========================================================
       FORM SUBMIT
    ========================================================= */

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            hideMessages();


            const formData =
                new FormData(form);


            const data =
                Object.fromEntries(
                    formData.entries()
                );


            /* =================================================
               NORMALIZE
            ================================================= */

            Object.keys(data)
                .forEach(
                    key => {

                        if (
                            typeof data[key] ===
                            "string"
                        ) {

                            data[key] =
                                data[key].trim();
                        }

                    }
                );


            data.authorisedSameAsClient =
                authorisedSame
                    ? authorisedSame.checked
                    : false;


            data.pan =
                (
                    data.pan || ""
                ).toUpperCase();


            data.tan =
                (
                    data.tan || ""
                ).toUpperCase();


            data.gst =
                (
                    data.gst || ""
                ).toUpperCase();


            data.udyam =
                (
                    data.udyam || ""
                ).toUpperCase();


            data.cin =
                (
                    data.cin || ""
                ).toUpperCase();


            data.ptec =
                (
                    data.ptec || ""
                ).toUpperCase();


            data.ptrc =
                (
                    data.ptrc || ""
                ).toUpperCase();


            data.aadhaar =
                (
                    data.aadhaar || ""
                )
                    .replace(
                        /\s/g,
                        ""
                    );


            /* =================================================
               FORCE LOCATION VALUES
            ================================================= */

            if (stateSelect) {

                data.state =
                    stateSelect.value.trim();
            }


            if (districtSelect) {

                data.district =
                    districtSelect.value.trim();
            }


            if (citySelect) {

                data.city =
                    citySelect.value.trim();
            }


            if (locationSelect) {

                data.locationId =
                    locationSelect.value.trim();
            }


            /* =================================================
               VALIDATION
            ================================================= */

            if (
                !data.firstName ||
                !data.lastName
            ) {

                showError(
                    "First name and last name are required."
                );

                return;
            }


            if (
                !data.clientType
            ) {

                showError(
                    "Please select the client type."
                );

                return;
            }


            if (
                !data.state
            ) {

                showError(
                    "Please select a state."
                );

                return;
            }


            if (
                !data.district
            ) {

                showError(
                    "Please select a district."
                );

                return;
            }


            if (
                !data.city
            ) {

                showError(
                    "Please select a city / town."
                );

                return;
            }


            if (
                !data.locationId
            ) {

                showError(
                    "Please select the office location."
                );

                return;
            }


            if (
                !data.contact
            ) {

                showError(
                    "Contact number is required."
                );

                return;
            }


            if (
                !/^[6-9][0-9]{9}$/.test(
                    data.contact
                )
            ) {

                showError(
                    "Enter a valid 10-digit Indian mobile number."
                );

                return;
            }


            if (
                data.email &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                    data.email
                )
            ) {

                showError(
                    "Enter a valid email address."
                );

                return;
            }


            if (
                data.pan &&
                !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(
                    data.pan
                )
            ) {

                showError(
                    "Enter a valid PAN number."
                );

                return;
            }


            if (
                data.aadhaar &&
                !/^[0-9]{12}$/.test(
                    data.aadhaar
                )
            ) {

                showError(
                    "Aadhaar number must contain 12 digits."
                );

                return;
            }


            /* =================================================
               SAVE
            ================================================= */

            if (saveButton) {

                saveButton.disabled =
                    true;

                saveButton.textContent =
                    "Saving...";
            }


            try {

                const response =
                    await fetch(
                        "/api/clients",
                        {
                            method: "POST",

                            credentials:
                                "same-origin",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                "Accept":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    data
                                )
                        }
                    );


                let result;


                try {

                    result =
                        await response.json();

                }
                catch {

                    throw new Error(
                        "Server returned an invalid response."
                    );
                }


                if (
                    !response.ok ||
                    !result.success
                ) {

                    throw new Error(
                        result.message ||
                        "Unable to create client."
                    );
                }


                showSuccess(
                    "Client created successfully."
                );


                setTimeout(
                    () => {

                        window.location.href =
                            "/employee/clients.html";

                    },
                    800
                );

            }
            catch (error) {

                console.error(
                    "Employee Add Client Error:",
                    error
                );


                showError(
                    error.message ||
                    "Unable to create client."
                );

            }
            finally {

                if (saveButton) {

                    saveButton.disabled =
                        false;

                    saveButton.textContent =
                        "Save Client";
                }
            }

        }
    );


    /* =========================================================
       LOGOUT
    ========================================================= */

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            () => {

                localStorage.removeItem(
                    "caOfficeLoggedIn"
                );

                localStorage.removeItem(
                    "caOfficeUser"
                );

                window.location.href =
                    "/login.html";
            }
        );
    }


    /* =========================================================
       EMPLOYEE USER
    ========================================================= */

    function loadEmployeeUser() {

        const stored =
            localStorage.getItem(
                "caOfficeUser"
            );


        if (!stored) {
            return;
        }


        try {

            const user =
                JSON.parse(
                    stored
                );


            const displayName =
                user.name ||
                user.fullName ||
                [
                    user.firstName,
                    user.middleName,
                    user.lastName
                ]
                    .filter(Boolean)
                    .join(" ") ||
                "Employee";


            const nameElement =
                document.getElementById(
                    "employeeName"
                );


            const roleElement =
                document.getElementById(
                    "employeeRole"
                );


            const avatarElement =
                document.getElementById(
                    "employeeAvatar"
                );


            if (nameElement) {

                nameElement.textContent =
                    displayName;
            }


            if (roleElement) {

                roleElement.textContent =
                    user.role ||
                    "Employee";
            }


            if (avatarElement) {

                avatarElement.textContent =
                    displayName
                        .charAt(0)
                        .toUpperCase();
            }

        }
        catch (error) {

            console.error(
                "Unable to load employee user:",
                error
            );
        }
    }


    loadEmployeeUser();

});