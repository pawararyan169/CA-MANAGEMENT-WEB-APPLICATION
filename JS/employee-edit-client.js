document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("clientForm");
    const saveButton = document.getElementById("saveClientButton");
    const errorBox = document.getElementById("clientError");
    const successBox = document.getElementById("clientSuccess");

    const stateSelect = document.getElementById("state");
    const districtSelect = document.getElementById("district");
    const citySelect = document.getElementById("city");
    const locationSelect = document.getElementById("locationId");

    const params = new URLSearchParams(window.location.search);
    const clientId = params.get("id");

    if (!form) {
        console.error("Edit Client: #clientForm not found.");
        return;
    }

    if (!clientId) {
        showError("Client ID is missing from the URL.");
        if (saveButton) saveButton.disabled = true;
        return;
    }

    const value = id => {
        const el = document.getElementById(id);
        return el ? String(el.value || "").trim() : "";
    };

    const setValue = (id, valueToSet) => {
        const el = document.getElementById(id);
        if (el) el.value = valueToSet == null ? "" : String(valueToSet);
    };

    function normalizeDate(v) {
        if (!v) return "";
        const s = String(v);
        return s.length >= 10 ? s.slice(0, 10) : s;
    }

    function resetSelect(select, placeholder, disabled = true) {
        if (!select) return;
        select.innerHTML = "";
        const option = document.createElement("option");
        option.value = "";
        option.textContent = placeholder;
        select.appendChild(option);
        select.disabled = disabled;
    }

    function addOptions(select, values, selectedValue = "") {
        if (!select) return false;
        const wanted = String(selectedValue || "").trim();
        let selected = false;
        (values || []).forEach(v => {
            const text = String(v).trim();
            if (!text) return;
            const option = document.createElement("option");
            option.value = text;
            option.textContent = text;
            if (text.toLowerCase() === wanted.toLowerCase()) {
                option.selected = true;
                selected = true;
            }
            select.appendChild(option);
        });
        return selected;
    }

    function canonicalState(state) {
        const s = String(state || "").trim();
        const aliases = window.CLIENT_EDIT_STATE_ALIASES || {};
        return aliases[s] || s;
    }

    function findStateKey(state) {
        const requested = canonicalState(state).toLowerCase();
        const names = window.CLIENT_EDIT_STATE_NAMES || [];
        const match = names.find(n => canonicalState(n).toLowerCase() === requested);
        return match || state || "";
    }

    function getDistrictsForState(state) {
        const canonical = canonicalState(state);
        const gujarat = window.CLIENT_EDIT_GUJARAT_DATA || {};
        if (canonical.toLowerCase() === "gujarat") {
            return Object.keys(gujarat).sort((a,b) => a.localeCompare(b));
        }
        const generic = window.CLIENT_EDIT_STATE_LOCALITIES || {};
        const key = findStateKey(state);
        return (generic[key] || generic[state] || []).slice().sort((a,b) => a.localeCompare(b));
    }

    function getCitiesForStateDistrict(state, district) {
        const canonical = canonicalState(state);
        const gujarat = window.CLIENT_EDIT_GUJARAT_DATA || {};
        if (canonical.toLowerCase() === "gujarat") {
            return (gujarat[district] || []).slice().sort((a,b) => a.localeCompare(b));
        }
        // The supplied non-Gujarat location source is state -> locality rather than
        // state -> district -> city. Use the selected locality as the district and
        // expose the same locality list as city/town choices so editing remains usable.
        const generic = window.CLIENT_EDIT_STATE_LOCALITIES || {};
        const key = findStateKey(state);
        return (generic[key] || generic[state] || []).slice().sort((a,b) => a.localeCompare(b));
    }

    function populateStates(selectedState = "") {
        if (!stateSelect) return;
        resetSelect(stateSelect, "Select state", false);
        const names = window.CLIENT_EDIT_STATE_NAMES || [];
        let selected = addOptions(stateSelect, names, selectedState);
        if (!selected && selectedState) {
            const option = document.createElement("option");
            option.value = selectedState;
            option.textContent = selectedState;
            option.selected = true;
            stateSelect.appendChild(option);
        }
    }

    function populateDistricts(state, selectedDistrict = "") {
        resetSelect(districtSelect, "Select district", true);
        resetSelect(citySelect, "Select city / town", true);
        if (!state) return;
        const districts = getDistrictsForState(state);
        if (!districts.length) return;
        const selected = addOptions(districtSelect, districts, selectedDistrict);
        if (!selected && selectedDistrict) {
            const option = document.createElement("option");
            option.value = selectedDistrict;
            option.textContent = selectedDistrict;
            option.selected = true;
            districtSelect.appendChild(option);
        }
        districtSelect.disabled = false;
    }

    function populateCities(state, district, selectedCity = "") {
        resetSelect(citySelect, "Select city / town", true);
        if (!state || !district) return;
        const cities = getCitiesForStateDistrict(state, district);
        if (!cities.length) {
            // Preserve an existing saved city even if the supplied locality list changed.
            if (selectedCity) {
                const option = document.createElement("option");
                option.value = selectedCity;
                option.textContent = selectedCity;
                option.selected = true;
                citySelect.appendChild(option);
                citySelect.disabled = false;
            }
            return;
        }
        const selected = addOptions(citySelect, cities, selectedCity);
        if (!selected && selectedCity) {
            const option = document.createElement("option");
            option.value = selectedCity;
            option.textContent = selectedCity;
            option.selected = true;
            citySelect.appendChild(option);
        }
        citySelect.disabled = false;
    }

    function wireLocationDropdowns() {
        if (stateSelect) {
            stateSelect.addEventListener("change", () => {
                populateDistricts(stateSelect.value, "");
            });
        }
        if (districtSelect) {
            districtSelect.addEventListener("change", () => {
                populateCities(stateSelect.value, districtSelect.value, "");
            });
        }
    }

    async function loadOfficeLocations(selectedLocationId = "") {
        if (!locationSelect) return;
        resetSelect(locationSelect, "Loading office locations...", true);
        try {
            const response = await fetch("/api/locations", {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
                headers: { Accept: "application/json", "Cache-Control": "no-cache" }
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || "Unable to load office locations.");
            }
            resetSelect(locationSelect, "Select office location", false);
            const locations = Array.isArray(result.locations) ? result.locations : [];
            let selected = false;
            locations.forEach(location => {
                const option = document.createElement("option");
                option.value = location.id == null ? "" : String(location.id);
                let label = location.name || "Office";
                if (location.city) label += ` — ${location.city}`;
                if (location.state) label += `, ${location.state}`;
                option.textContent = label;
                if (String(location.id) === String(selectedLocationId)) {
                    option.selected = true;
                    selected = true;
                }
                locationSelect.appendChild(option);
            });
            if (!selected && selectedLocationId) {
                const option = document.createElement("option");
                option.value = String(selectedLocationId);
                option.textContent = "Current office location";
                option.selected = true;
                locationSelect.appendChild(option);
            }
        } catch (error) {
            console.error("Office location error:", error);
            resetSelect(locationSelect, "Unable to load office locations", true);
            if (selectedLocationId) {
                const option = document.createElement("option");
                option.value = String(selectedLocationId);
                option.textContent = "Current office location";
                option.selected = true;
                locationSelect.appendChild(option);
                locationSelect.disabled = false;
            }
        }
    }

    async function loadClient() {
        try {
            const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
                headers: { Accept: "application/json", "Cache-Control": "no-cache" }
            });
            const result = await response.json();
            if (!response.ok || !result.success || !result.client) {
                throw new Error(result.message || "Unable to load client.");
            }
            const c = result.client;

            setValue("firstName", c.firstName);
            setValue("middleName", c.middleName);
            setValue("lastName", c.lastName);
            setValue("clientType", c.clientType);
            setValue("gender", c.gender);
            setValue("address", c.address);
            setValue("pan", c.pan);
            setValue("aadhaar", c.aadhaar);
            setValue("tan", c.tan);
            setValue("gst", c.gst);
            setValue("udyam", c.udyam);
            setValue("cin", c.cin);
            setValue("fssai", c.fssai);
            setValue("ptec", c.ptec);
            setValue("ptrc", c.ptrc);
            setValue("contact", c.contactNumber || c.contact);
            setValue("email", c.email);
            setValue("dateOfBirth", normalizeDate(c.dateOfBirth));
            setValue("dateOfRegistration", normalizeDate(c.dateOfRegistration));
            setValue("authorisedPersonName", c.authorisedPersonName);
            setValue("authorisedPersonContact", c.authorisedPersonContact);
            setValue("authorisedPersonEmail", c.authorisedPersonEmail);

            populateStates(c.state || "");
            populateDistricts(c.state || "", c.district || "");
            populateCities(c.state || "", c.district || "", c.city || "");
            await loadOfficeLocations(c.locationId || "");

            const same = document.getElementById("authorisedSameAsClient");
            if (same) {
                same.checked = Boolean(c.authorisedSameAsClient);
                setAuthorisedState(same.checked);
            }

            const heading = document.querySelector("h1");
            if (heading) heading.textContent = `Edit: ${c.name || "Client"}`;

        } catch (error) {
            console.error("Edit Client Load Error:", error);
            showError(error.message || "Unable to load client.");
        }
    }

    function getFullName() {
        return [value("firstName"), value("middleName"), value("lastName")].filter(Boolean).join(" ");
    }

    function copyClientToAuthorised() {
        setValue("authorisedPersonName", getFullName());
        setValue("authorisedPersonContact", value("contact"));
        setValue("authorisedPersonEmail", value("email"));
    }

    function setAuthorisedState(disabled) {
        ["authorisedPersonName", "authorisedPersonContact", "authorisedPersonEmail"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = disabled;
        });
        if (disabled) copyClientToAuthorised();
    }

    const same = document.getElementById("authorisedSameAsClient");
    if (same) same.addEventListener("change", () => setAuthorisedState(same.checked));

    ["firstName", "middleName", "lastName", "contact", "email"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", () => {
            if (same && same.checked) copyClientToAuthorised();
        });
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        hideMessages();

        const data = {
            firstName: value("firstName"), middleName: value("middleName"), lastName: value("lastName"),
            clientType: value("clientType"), state: value("state"), district: value("district"), city: value("city"),
            gender: value("gender"), address: value("address"), pan: value("pan").toUpperCase(),
            aadhaar: value("aadhaar").replace(/\s/g, ""), tan: value("tan").toUpperCase(), gst: value("gst").toUpperCase(),
            udyam: value("udyam").toUpperCase(), cin: value("cin").toUpperCase(), fssai: value("fssai"),
            ptec: value("ptec").toUpperCase(), ptrc: value("ptrc").toUpperCase(), contact: value("contact"),
            email: value("email").toLowerCase(), dateOfBirth: value("dateOfBirth"), dateOfRegistration: value("dateOfRegistration"),
            authorisedSameAsClient: same ? same.checked : false,
            authorisedPersonName: value("authorisedPersonName"), authorisedPersonContact: value("authorisedPersonContact"),
            authorisedPersonEmail: value("authorisedPersonEmail").toLowerCase(), locationId: value("locationId")
        };

        if (!data.firstName || !data.lastName) return showError("First name and last name are required.");
        if (!data.clientType) return showError("Please select the client type.");
        if (!data.state) return showError("Please select the state.");
        if (!data.district) return showError("Please select the district.");
        if (!data.city) return showError("Please select the city / town.");
        if (!data.locationId) return showError("Please select the office location.");
        if (!data.pan) return showError("PAN number is required.");
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(data.pan)) return showError("Enter a valid PAN number.");
        if (data.aadhaar && !/^\d{12}$/.test(data.aadhaar)) return showError("Aadhaar number must contain 12 digits.");
        if (!/^[6-9][0-9]{9}$/.test(data.contact)) return showError("Enter a valid 10-digit Indian mobile number.");
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return showError("Enter a valid email address.");

        if (saveButton) { saveButton.disabled = true; saveButton.textContent = "Saving..."; }
        try {
            const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
                method: "PUT", credentials: "same-origin",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || "Unable to update client.");
            showSuccess("Client profile updated successfully.");
            setTimeout(() => {
                const role = location.pathname.startsWith("/employee/") ? "employee" : "admin";
                window.location.href = `/${role}/client-details.html?id=${encodeURIComponent(clientId)}`;
            }, 700);
        } catch (error) {
            console.error("Edit Client Save Error:", error);
            showError(error.message || "Unable to update client.");
        } finally {
            if (saveButton) { saveButton.disabled = false; saveButton.textContent = "Save Changes"; }
        }
    });

    function hideMessages() {
        if (errorBox) { errorBox.style.display = "none"; errorBox.textContent = ""; }
        if (successBox) { successBox.style.display = "none"; successBox.textContent = ""; }
    }
    function showError(message) {
        if (!errorBox) { alert(message); return; }
        errorBox.textContent = message; errorBox.style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
    function showSuccess(message) {
        if (!successBox) { alert(message); return; }
        successBox.textContent = message; successBox.style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    wireLocationDropdowns();
    populateStates();
    loadClient();
});
