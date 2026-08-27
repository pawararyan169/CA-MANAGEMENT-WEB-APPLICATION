/*
 * CA OFFICE — UNIFIED SIDEBAR
 * One sidebar for Admin and Employee pages.
 *
 * The page HTML should NOT contain a <aside class="sidebar">.
 * This script creates the sidebar and keeps only the navigation area
 * scrollable. Brand and Sign out remain visible.
 */
(() => {
    "use strict";

    const path = window.location.pathname.toLowerCase();

    const isEmployee = path.startsWith("/employee/");
    const isAdmin = path.startsWith("/admin/");

    if (!isEmployee && !isAdmin) return;

    const ID = "ca-fixed-sidebar";
    const STYLE_ID = "ca-fixed-sidebar-style";

    function removeOldSidebars() {
        document.querySelectorAll(
            ".sidebar, aside.sidebar, #unifiedSidebar, " +
            "#caUnifiedSidebar, #ca-constant-sidebar, #CA_ADMIN_CONSTANT_SIDEBAR, #ca-fixed-sidebar"
        ).forEach((el) => {
            if (el.id !== ID) el.remove();
        });
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;

        style.textContent = `
            #${ID} {
                position: fixed !important;
                inset: 0 auto 0 0 !important;

                width: 280px !important;
                min-width: 280px !important;
                max-width: 280px !important;

                height: 100vh !important;
                max-height: 100vh !important;

                z-index: 2147483647 !important;

                display: flex !important;
                flex-direction: column !important;

                padding: 20px 16px 12px !important;
                margin: 0 !important;

                overflow: hidden !important;

                background: #fff !important;
                border-right: 1px solid #e3e7ed !important;

                box-sizing: border-box !important;

                font-family:
                    Inter,
                    -apple-system,
                    BlinkMacSystemFont,
                    "Segoe UI",
                    Arial,
                    sans-serif !important;

                color: #536174 !important;
            }

            #${ID} *,
            #${ID} *::before,
            #${ID} *::after {
                box-sizing: border-box !important;
            }

            #${ID} .ca-brand {
                flex: 0 0 52px !important;
                height: 52px !important;
                min-height: 52px !important;

                display: flex !important;
                align-items: center !important;
                gap: 10px !important;

                padding: 0 12px !important;
                margin: 0 !important;
            }

            #${ID} .ca-logo {
                width: 38px !important;
                height: 38px !important;
                min-width: 38px !important;

                display: flex !important;
                align-items: center !important;
                justify-content: center !important;

                border-radius: 10px !important;
                background: #172033 !important;
                color: #fff !important;

                font-size: 13px !important;
                font-weight: 800 !important;
            }

            #${ID} .ca-title {
                display: block !important;
                color: #172033 !important;
                font-size: 16px !important;
                line-height: 18px !important;
                font-weight: 700 !important;
            }

            #${ID} .ca-subtitle {
                display: block !important;
                margin-top: 2px !important;
                color: #8a94a6 !important;
                font-size: 10px !important;
                line-height: 12px !important;
            }

            /*
             * ONLY THIS AREA SCROLLS.
             * Brand and Sign out stay fixed.
             */
            #${ID} .ca-nav {
                flex: 1 1 auto !important;
                min-height: 0 !important;

                display: flex !important;
                flex-direction: column !important;
                gap: 1px !important;

                padding: 3px 0 8px !important;
                margin: 0 !important;

                overflow-y: auto !important;
                overflow-x: hidden !important;

                scrollbar-width: thin !important;
                scrollbar-color: #cbd2da transparent !important;
            }

            #${ID} .ca-nav::-webkit-scrollbar {
                width: 6px !important;
            }

            #${ID} .ca-nav::-webkit-scrollbar-track {
                background: transparent !important;
            }

            #${ID} .ca-nav::-webkit-scrollbar-thumb {
                background: #cbd2da !important;
                border-radius: 10px !important;
            }

            #${ID} .ca-nav::-webkit-scrollbar-thumb:hover {
                background: #aeb7c3 !important;
            }

            #${ID} .ca-section {
                flex: 0 0 19px !important;
                height: 19px !important;
                min-height: 19px !important;

                display: flex !important;
                align-items: flex-end !important;

                padding: 0 12px 3px !important;
                margin: 7px 0 1px !important;

                color: #98a2b3 !important;
                font-size: 9px !important;
                line-height: 11px !important;
                font-weight: 700 !important;
                letter-spacing: .12em !important;
            }

            #${ID} .ca-link {
                width: 100% !important;
                height: 31px !important;
                min-height: 31px !important;
                max-height: 31px !important;
                flex: 0 0 31px !important;

                display: flex !important;
                align-items: center !important;
                gap: 9px !important;

                padding: 0 10px !important;
                margin: 0 !important;

                border: 0 !important;
                border-radius: 8px !important;

                background: transparent !important;
                color: #536174 !important;

                text-decoration: none !important;

                font-size: 12px !important;
                line-height: 31px !important;
                font-weight: 500 !important;

                white-space: nowrap !important;
            }

            #${ID} .ca-link:hover {
                background: #f5f7fa !important;
                color: #172033 !important;
            }

            #${ID} .ca-link.active {
                background: #eef2f6 !important;
                color: #172033 !important;
                font-weight: 700 !important;
            }

            #${ID} .ca-icon {
                width: 18px !important;
                min-width: 18px !important;
                height: 18px !important;

                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;

                font-size: 12px !important;
                line-height: 18px !important;
                color: currentColor !important;
            }

            #${ID} .ca-bottom {
                flex: 0 0 47px !important;
                height: 47px !important;
                min-height: 47px !important;

                margin-top: 6px !important;
                padding-top: 6px !important;

                border-top: 1px solid #e5e7eb !important;
            }

            #${ID} .ca-signout {
                width: 100% !important;
                height: 34px !important;
                min-height: 34px !important;

                display: flex !important;
                align-items: center !important;
                gap: 9px !important;

                padding: 0 10px !important;

                border: 0 !important;
                border-radius: 8px !important;

                background: transparent !important;
                color: #536174 !important;

                font-family: inherit !important;
                font-size: 12px !important;
                font-weight: 500 !important;

                cursor: pointer !important;
                text-align: left !important;
            }

            #${ID} .ca-signout:hover {
                background: #fef2f2 !important;
                color: #b42318 !important;
            }

            body.ca-fixed-sidebar-page {
                padding-left: 280px !important;
            }

            body.ca-fixed-sidebar-page .dashboard-main {
                margin-left: 0 !important;
                width: 100% !important;
            }

            .dashboard-layout > .sidebar,
            .dashboard-layout > aside.sidebar,
            #CA_ADMIN_CONSTANT_SIDEBAR {
                display: none !important;
            }

            @media (max-width: 800px) {
                #${ID} {
                    width: 240px !important;
                    min-width: 240px !important;
                    max-width: 240px !important;
                }

                body.ca-fixed-sidebar-page {
                    padding-left: 240px !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function samePage(href) {
        const target = href.split("#")[0]
            .toLowerCase()
            .replace(/\/+$/, "");

        const current = window.location.pathname
            .toLowerCase()
            .replace(/\/+$/, "");

        return target === current;
    }

    // Admin uses the same navigation structure/UI as Employee.
    // Only the destination paths differ. GST intentionally opens the new GST dashboard.
    const admin = [
        ["section", "OVERVIEW"],
        ["link", "/admin/dashboard.html", "Dashboard", "⌂"],

        ["section", "WORKSPACE"],
        ["link", "/admin/clients.html", "Clients", "◉"],
        ["link", "/admin/tasks.html", "Tasks", "✓"],
        ["link", "/admin/documents.html", "Documents", "□"],
        ["link", "/admin/billing.html", "Billing", "₹"],

        ["section", "REGISTRATIONS"],
        ["link", "/admin/cin_dashboard.html", "CIN", "◇"],
        ["link", "/admin/fssai_dashboard.html", "FSSAI", "◇"],
        ["link", "/admin/gst-dashboard.html", "GST", "◇"],
        ["link", "/admin/udyam_dashboard.html", "MSME Udyam", "◇"],
        ["link", "/admin/ptec_dashboard.html", "PTEC", "◇"],
        ["link", "/admin/income_tax.html", "PAN", "◇"],
        ["link", "/admin/ptrc_dashboard.html", "PTRC", "◇"],
        ["link", "/admin/tan.html", "TAN", "◇"],
        

        ["section", "OFFICE"],
        ["link", "/admin/dashboard.html#calendar", "Calendar", "◷"],
        ["link", "/admin/dashboard.html#reports", "Reports", "◈"],

        ["section", "SYSTEM"],
        ["link", "/admin/dashboard.html#settings", "Settings", "⚙"]
    ];

    const employee = [

        ["section", "OVERVIEW"],
        ["link", "/employee/dashboard.html", "Dashboard", "⌂"],

        ["section", "WORKSPACE"],
        ["link", "/employee/clients.html", "Clients", "◉"],
        ["link", "/employee/tasks.html", "Tasks", "✓"],
        ["link", "/employee/documents.html", "Documents", "□"],
        ["link", "/employee/billing.html", "Billing", "₹"],

        ["section", "REGISTRATIONS"],
        ["link", "/employee/cin_dashboard.html", "CIN", "◇"],
        ["link", "/employee/fssai_dashboard.html", "FSSAI", "◇"],
        ["link", "/employee/gst.html", "GST", "◇"],
        ["link", "/employee/udyam_dashboard.html", "MSME Udyam", "◇"],
        ["link", "/employee/Income_tax.html", "PAN", "◇"],
        ["link", "/employee/ptec_dashboard.html", "PTEC", "◇"],
        ["link", "/employee/ptrc_dashboard.html", "PTRC", "◇"],
        ["link", "/employee/tan.html", "TAN", "◇"],
        

        ["section", "OFFICE"],
        ["link", "/employee/dashboard.html#calendar", "Calendar", "◷"],
        ["link", "/employee/dashboard.html#reports", "Reports", "◈"],

        ["section", "SYSTEM"],
        ["link", "/employee/dashboard.html#settings", "Settings", "⚙"]
    ];

    function render(items) {
        return items.map((item) => {
            if (item[0] === "section") {
                return `<div class="ca-section">${item[1]}</div>`;
            }

            const [, href, label, glyph] = item;
            const active = samePage(href);

            return `
                <a class="ca-link${active ? " active" : ""}" href="${href}">
                    <span class="ca-icon">${glyph}</span>
                    <span>${label}</span>
                </a>
            `;
        }).join("");
    }

    function create() {
        injectStyles();
        removeOldSidebars();

        const existing = document.getElementById(ID);
        if (existing) existing.remove();

        const sidebar = document.createElement("aside");
        sidebar.id = ID;

        sidebar.innerHTML = `
            <div class="ca-brand">
                <div class="ca-logo">CA</div>
                <div>
                    <span class="ca-title">CA Office</span>
                    <span class="ca-subtitle">
                        ${isEmployee ? "Employee Portal" : "Administration"}
                    </span>
                </div>
            </div>

            <nav class="ca-nav">
                ${render(isEmployee ? employee : admin)}
            </nav>

            <div class="ca-bottom">
                <button class="ca-signout" id="caFixedLogout" type="button">
                    <span class="ca-icon">↪</span>
                    <span>Sign out</span>
                </button>
            </div>
        `;

        document.body.prepend(sidebar);
        document.body.classList.add("ca-fixed-sidebar-page");

        document.getElementById("caFixedLogout")
            ?.addEventListener("click", () => {
                localStorage.removeItem("caOfficeLoggedIn");
                localStorage.removeItem("caOfficeUser");
                window.location.href = "/login.html";
            });
    }

    function init() {
        create();

        const observer = new MutationObserver(() => {
            const current = document.getElementById(ID);

            if (!current) {
                create();
                return;
            }

            removeOldSidebars();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
