/* =========================================================
   LIVE REGISTRATION COUNTS
   Shared by Admin + Employee dashboards.

   Counts are calculated from the live /api/clients response.
   Only active clients are returned by that endpoint, so each
   registration count represents active clients with that field.
========================================================= */
(function () {
    "use strict";

    const REGISTRATIONS = [
        ["cin", "dashboardCinCount"],
        ["fssai", "dashboardFssaiCount"],
        ["gst", "dashboardGstCount"],
        ["udyam", "dashboardUdyamCount"],
        ["ptec", "dashboardPtecCount"],
        ["ptrc", "dashboardPtrcCount"],
        ["tan", "dashboardTanCount"]
    ];

    const POLL_MS = 10000;
    let timer = null;
    let requestInProgress = false;

    function setCount(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = String(value);
        }
    }

    function setAllCounts(value) {
        REGISTRATIONS.forEach(([, id]) => setCount(id, value));
    }

    function hasValue(value) {
        return value !== null &&
            value !== undefined &&
            String(value).trim() !== "";
    }

    async function loadRegistrationCounts() {
        if (requestInProgress) return;
        requestInProgress = true;

        try {
            const response = await fetch("/api/clients", {
                method: "GET",
                credentials: "include",
                headers: {
                    Accept: "application/json"
                },
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error(`Clients API returned ${response.status}`);
            }

            const result = await response.json();
            if (!result || !result.success || !Array.isArray(result.clients)) {
                throw new Error("Invalid clients API response.");
            }

            REGISTRATIONS.forEach(([field, id]) => {
                const count = result.clients.reduce(
                    (total, client) => total + (hasValue(client[field]) ? 1 : 0),
                    0
                );
                setCount(id, count);
            });

        } catch (error) {
            console.error("Live registration count error:", error);
            // Keep the last known values instead of replacing them with 0.
        } finally {
            requestInProgress = false;
        }
    }

    function startLiveCounts() {
        loadRegistrationCounts();

        if (timer) {
            clearInterval(timer);
        }

        timer = setInterval(loadRegistrationCounts, POLL_MS);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startLiveCounts, { once: true });
    } else {
        startLiveCounts();
    }

    window.loadRegistrationCounts = loadRegistrationCounts;
})();
