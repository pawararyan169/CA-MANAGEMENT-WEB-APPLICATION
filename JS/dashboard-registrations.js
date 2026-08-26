(() => {
    "use strict";

    const fields = {
        pan: "dashboardPanCount",
        cin: "dashboardCinCount",
        fssai: "dashboardFssaiCount",
        gst: "dashboardGstCount",
        udyam: "dashboardUdyamCount",
        ptec: "dashboardPtecCount",
        ptrc: "dashboardPtrcCount",
        tan: "dashboardTanCount"
    };

    async function loadRegistrationCounts() {
        try {
            const response = await fetch("/api/dashboard/stats", {
                credentials: "include",
                cache: "no-store",
                headers: { Accept: "application/json" }
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || "Unable to load registration counts.");
            }

            const counts = result.counts || {};
            Object.entries(fields).forEach(([field, id]) => {
                const element = document.getElementById(id);
                if (element) element.textContent = Number(counts[field] || 0);
            });
        } catch (error) {
            console.error("Registration live count error:", error);
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        loadRegistrationCounts();
        window.setInterval(loadRegistrationCounts, 10000);
    });
})();
