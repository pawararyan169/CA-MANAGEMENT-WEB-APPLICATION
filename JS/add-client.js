document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
       ELEMENTS
    ========================================================= */

    const form =
        document.getElementById("clientForm");

    const errorBox =
        document.getElementById("clientError");

    const successBox =
        document.getElementById("clientSuccess");

    const saveButton =
        document.getElementById("saveClientButton");

    const stateSelect =
        document.getElementById("clientState");

    const districtSelect =
        document.getElementById("clientDistrict");

    const citySelect =
        document.getElementById("clientCity");

    const locationSelect =
        document.getElementById("locationId");

    const authorisedSame =
        document.getElementById(
            "authorisedPersonSameAsClient"
        );


    /* =========================================================
       GUJARAT DATA

       District -> Town / City / Taluka
    ========================================================= */

    const gujaratData = {

        Ahmedabad: [
            "Ahmedabad",
            "Bavla",
            "Daskroi",
            "Dhandhuka",
            "Dholera",
            "Dholka",
            "Detroj-Rampura",
            "Mandal",
            "Sanand",
            "Viramgam"
        ],

        Amreli: [
            "Amreli",
            "Babra",
            "Bagasara",
            "Dhari",
            "Jafrabad",
            "Khambha",
            "Kunkavav-Vadia",
            "Lathi",
            "Lilia",
            "Rajula",
            "Savarkundla"
        ],

        Anand: [
            "Anand",
            "Anklav",
            "Borsad",
            "Khambhat",
            "Petlad",
            "Sojitra",
            "Tarapur",
            "Umreth"
        ],

        Aravalli: [
            "Bayad",
            "Bhiloda",
            "Dhansura",
            "Malpur",
            "Meghraj",
            "Modasa"
        ],

        Banaskantha: [
            "Amirgadh",
            "Bhabhar",
            "Danta",
            "Dantiwada",
            "Deesa",
            "Deodar",
            "Dhanera",
            "Kankrej",
            "Lakhani",
            "Palanpur",
            "Suigam",
            "Tharad",
            "Vadgam",
            "Vav"
        ],

        Bharuch: [
            "Amod",
            "Ankleshwar",
            "Bharuch",
            "Hansot",
            "Jambusar",
            "Jhagadia",
            "Netrang",
            "Valia",
            "Vagra"
        ],

        Bhavnagar: [
            "Bhavnagar",
            "Gariadhar",
            "Ghogha",
            "Gadhada",
            "Mahuva",
            "Palitana",
            "Sihor",
            "Talaja",
            "Umrala",
            "Vallabhipur"
        ],

        Botad: [
            "Barwala",
            "Botad",
            "Gadhada",
            "Ranpur"
        ],

        "Chhota Udaipur": [
            "Bodeli",
            "Chhota Udaipur",
            "Jetpur Pavi",
            "Kavant",
            "Naswadi",
            "Sankheda"
        ],

        Dahod: [
            "Dahod",
            "Devgad Baria",
            "Dhanpur",
            "Fatepura",
            "Garbada",
            "Jhalod",
            "Limkheda",
            "Sanjeli"
        ],

        Dang: [
            "Ahwa",
            "Subir",
            "Waghai"
        ],

        "Devbhumi Dwarka": [
            "Bhanvad",
            "Dwarka",
            "Kalyanpur",
            "Khambhalia",
            "Okha"
        ],

        Gandhinagar: [
            "Dahegam",
            "Gandhinagar",
            "Kalol",
            "Mansa"
        ],

        "Gir Somnath": [
            "Gir Gadhada",
            "Kodinar",
            "Patan-Veraval",
            "Sutrapada",
            "Talala",
            "Una",
            "Veraval"
        ],

        Jamnagar: [
            "Dhrol",
            "Jamnagar",
            "Jodiya",
            "Kalavad",
            "Lalpur"
        ],

        Junagadh: [
            "Bhesan",
            "Junagadh",
            "Keshod",
            "Maliya Hatina",
            "Manavadar",
            "Mangrol",
            "Mendarda",
            "Vanthali",
            "Visavadar"
        ],

        Kheda: [
            "Balasinor",
            "Kapadvanj",
            "Kheda",
            "Mahudha",
            "Matar",
            "Mahemdavad",
            "Nadiad",
            "Thasra"
        ],

        Kutch: [
            "Abdasa",
            "Anjar",
            "Bhachau",
            "Bhuj",
            "Gandhidham",
            "Lakhpat",
            "Mandvi",
            "Mundra",
            "Nakhatrana",
            "Rapar"
        ],

        Mahisagar: [
            "Balasinor",
            "Kadana",
            "Khanpur",
            "Lunawada",
            "Santrampur",
            "Virpur"
        ],

        Mehsana: [
            "Becharaji",
            "Jotana",
            "Kadi",
            "Kheralu",
            "Mehsana",
            "Satlasana",
            "Unjha",
            "Vadnagar",
            "Vijapur",
            "Visnagar"
        ],

        Morbi: [
            "Halvad",
            "Maliya",
            "Morbi",
            "Tankara",
            "Wankaner"
        ],

        Narmada: [
            "Dediapada",
            "Garudeshwar",
            "Nandod",
            "Rajpipla",
            "Sagbara",
            "Tilakwada"
        ],

        Navsari: [
            "Bansda",
            "Bilimora",
            "Chikhli",
            "Gandevi",
            "Jalalpore",
            "Navsari",
            "Vansda"
        ],

        Panchmahal: [
            "Ghoghamba",
            "Godhra",
            "Halol",
            "Jambughoda",
            "Kalol",
            "Morwa Hadaf",
            "Shehera"
        ],

        Patan: [
            "Chanasma",
            "Harij",
            "Patan",
            "Radhanpur",
            "Sami",
            "Santalpur",
            "Siddhpur"
        ],

        Porbandar: [
            "Kutiyana",
            "Porbandar",
            "Ranavav"
        ],

        Rajkot: [
            "Dhoraji",
            "Gondal",
            "Jasdan",
            "Jetpur",
            "Kotda Sangani",
            "Lodhika",
            "Paddhari",
            "Rajkot",
            "Upleta",
            "Vinchiya"
        ],

        Sabarkantha: [
            "Himatnagar",
            "Idar",
            "Khedbrahma",
            "Poshina",
            "Prantij",
            "Talod",
            "Vadali",
            "Vijaynagar"
        ],

        Surat: [
            "Bardoli",
            "Choryasi",
            "Kamrej",
            "Mahuva",
            "Mandvi",
            "Mangrol",
            "Olpad",
            "Palsana",
            "Umarpada",
            "Surat"
        ],

        Surendranagar: [
            "Chotila",
            "Chuda",
            "Dasada",
            "Dhrangadhra",
            "Lakhtar",
            "Limbdi",
            "Muli",
            "Patdi",
            "Sayla",
            "Surendranagar",
            "Wadhwan"
        ],

        Tapi: [
            "Dolvan",
            "Nizar",
            "Songadh",
            "Uchchhal",
            "Valod",
            "Vyara"
        ],

        Vadodara: [
            "Dabhoi",
            "Karjan",
            "Padra",
            "Savli",
            "Shinor",
            "Vadodara",
            "Vaghodia"
        ],

        Valsad: [
            "Dharampur",
            "Kaprada",
            "Pardi",
            "Umbergaon",
            "Valsad",
            "Vapi"
        ]

    };


    /* =========================================================
       POPULATE DISTRICTS
    ========================================================= */

    function populateDistricts() {

        districtSelect.innerHTML =
            `<option value="">
                Select district
            </option>`;

        citySelect.innerHTML =
            `<option value="">
                Select city / town
            </option>`;

        citySelect.disabled = true;

        const districts =
            Object.keys(
                gujaratData
            ).sort(
                (a, b) =>
                    a.localeCompare(b)
            );


        districts.forEach(
            district => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    district;

                option.textContent =
                    district;

                districtSelect.appendChild(
                    option
                );

            }
        );


        districtSelect.disabled =
            false;

    }


    /* =========================================================
       POPULATE CITIES
    ========================================================= */

    function populateCities(
        district
    ) {

        citySelect.innerHTML =
            `<option value="">
                Select city / town
            </option>`;

        citySelect.disabled = true;


        const cities =
            gujaratData[district];


        if (!cities) {
            return;
        }


        cities
            .slice()
            .sort(
                (a, b) =>
                    a.localeCompare(b)
            )
            .forEach(
                city => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        city;

                    option.textContent =
                        city;

                    citySelect.appendChild(
                        option
                    );

                }
            );


        citySelect.disabled =
            false;

    }


    /* =========================================================
       STATE CHANGE
    ========================================================= */

    stateSelect.addEventListener(
        "change",
        () => {

            if (
                stateSelect.value ===
                "Gujarat"
            ) {

                populateDistricts();

            }

            else {

                districtSelect.innerHTML =
                    `<option value="">
                        Select district
                    </option>`;

                citySelect.innerHTML =
                    `<option value="">
                        Select city / town
                    </option>`;

                districtSelect.disabled =
                    true;

                citySelect.disabled =
                    true;

            }

        }
    );


    /* =========================================================
       DISTRICT CHANGE
    ========================================================= */

    districtSelect.addEventListener(
        "change",
        () => {

            populateCities(
                districtSelect.value
            );

        }
    );


    /* =========================================================
       INITIALIZE GUJARAT
    ========================================================= */

    if (
        stateSelect.value ===
        "Gujarat"
    ) {

        populateDistricts();

    }


    /* =========================================================
       LOAD OFFICE LOCATIONS
    ========================================================= */

    async function loadOfficeLocations() {

        locationSelect.innerHTML =
            `<option value="">
                Loading office locations...
            </option>`;


        try {

            const response =
                await fetch(
                    "/api/locations"
                );


            const result =
                await response.json();


            if (
                !response.ok ||
                !result.success
            ) {

                throw new Error(
                    result.message ||
                    "Unable to load locations."
                );

            }


            locationSelect.innerHTML =
                `<option value="">
                    Select office location
                </option>`;


            const locations =
                result.locations || [];


            locations.forEach(
                location => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        location.id;

                    let label =
                        location.name || "";


                    if (location.city) {

                        label +=
                            ` — ${location.city}`;

                    }

                    if (location.state) {

                        label +=
                            `, ${location.state}`;

                    }


                    option.textContent =
                        label;

                    locationSelect.appendChild(
                        option
                    );

                }
            );


        }

        catch (error) {

            console.error(
                "Office location error:",
                error
            );


            locationSelect.innerHTML =
                `<option value="">
                    Unable to load office locations
                </option>`;

        }

    }


    loadOfficeLocations();


    /* =========================================================
       AUTHORISED PERSON
    ========================================================= */

    function getClientName() {

        const first =
            document
                .getElementById("firstName")
                ?.value
                .trim() || "";

        const middle =
            document
                .getElementById("middleName")
                ?.value
                .trim() || "";

        const last =
            document
                .getElementById("lastName")
                ?.value
                .trim() || "";


        return [
            first,
            middle,
            last
        ]
            .filter(Boolean)
            .join(" ");

    }


    function copyClientToAuthorisedPerson() {

        const authorisedName =
            document.getElementById(
                "authorisedPersonName"
            );

        const authorisedContact =
            document.getElementById(
                "authorisedPersonContact"
            );

        const authorisedEmail =
            document.getElementById(
                "authorisedPersonEmail"
            );


        const clientContact =
            document
                .getElementById("contact")
                ?.value
                .trim() || "";


        const clientEmail =
            document
                .getElementById("email")
                ?.value
                .trim() || "";


        if (authorisedName) {

            authorisedName.value =
                getClientName();

        }


        if (authorisedContact) {

            authorisedContact.value =
                clientContact;

        }


        if (authorisedEmail) {

            authorisedEmail.value =
                clientEmail;

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
            () => {

                if (
                    authorisedSame.checked
                ) {

                    copyClientToAuthorisedPerson();

                    setAuthorisedDisabled(
                        true
                    );

                }

                else {

                    setAuthorisedDisabled(
                        false
                    );

                    document.getElementById(
                        "authorisedPersonName"
                    ).value = "";

                    document.getElementById(
                        "authorisedPersonContact"
                    ).value = "";

                    document.getElementById(
                        "authorisedPersonEmail"
                    ).value = "";

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
               CLEAN DATA
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


            data.pan =
                data.pan
                    ?.toUpperCase() || "";

            data.tan =
                data.tan
                    ?.toUpperCase() || "";

            data.gst =
                data.gst
                    ?.toUpperCase() || "";

            data.udyam =
                data.udyam
                    ?.toUpperCase() || "";

            data.cin =
                data.cin
                    ?.toUpperCase() || "";

            data.ptec =
                data.ptec
                    ?.toUpperCase() || "";

            data.ptrc =
                data.ptrc
                    ?.toUpperCase() || "";

            data.aadhaar =
                data.aadhaar
                    ?.replace(
                        /\s/g,
                        ""
                    ) || "";


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


            if (!data.clientType) {

                showError(
                    "Please select the client type."
                );

                return;

            }


            if (!data.state) {

                showError(
                    "Please select the state."
                );

                return;

            }


            if (!data.district) {

                showError(
                    "Please select the district."
                );

                return;

            }


            if (!data.city) {

                showError(
                    "Please select the city / town."
                );

                return;

            }


            if (!data.locationId) {

                showError(
                    "Please select the office location."
                );

                return;

            }


            if (
                !data.contact ||
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
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    .test(data.email)
            ) {

                showError(
                    "Enter a valid email address."
                );

                return;

            }


            if (
                data.pan &&
                !/^[A-Z]{5}[0-9]{4}[A-Z]$/
                    .test(data.pan)
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

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    data
                                )

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
                        "Unable to create client."
                    );

                }


                showSuccess(
                    "Client created successfully."
                );


                form.reset();


                stateSelect.value =
                    "Gujarat";

                populateDistricts();


                citySelect.innerHTML =
                    `<option value="">
                        Select city / town
                    </option>`;

                citySelect.disabled =
                    true;


                setAuthorisedDisabled(
                    false
                );


                setTimeout(
                    () => {

                        window.location.href =
                            "/admin/clients.html";

                    },
                    1000
                );

            }

            catch (error) {

                console.error(
                    "Create client error:",
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
       USER DISPLAY
    ========================================================= */

    loadUser();


    function loadUser() {

        const stored =
            localStorage.getItem(
                "caOfficeUser"
            );


        if (!stored) {
            return;
        }


        try {

            const user =
                JSON.parse(stored);


            const name =
                document.getElementById(
                    "userName"
                );

            const role =
                document.getElementById(
                    "userRole"
                );

            const avatar =
                document.getElementById(
                    "userAvatar"
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
                "Administrator";


            if (name) {

                name.textContent =
                    displayName;

            }


            if (role) {

                role.textContent =
                    user.role === "admin"
                        ? "Administrator"
                        : "Staff";

            }


            if (avatar) {

                avatar.textContent =
                    displayName
                        .charAt(0)
                        .toUpperCase();

            }

        }

        catch (error) {

            console.error(
                "User loading error:",
                error
            );

        }

    }


    /* =========================================================
       ALERTS
    ========================================================= */

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


    function showError(
        message
    ) {

        if (!errorBox) {

            alert(message);

            return;

        }


        errorBox.textContent =
            message;

        errorBox.style.display =
            "block";


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }


    function showSuccess(
        message
    ) {

        if (!successBox) {

            alert(message);

            return;

        }


        successBox.textContent =
            message;

        successBox.style.display =
            "block";


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }

});