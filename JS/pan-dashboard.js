(() => {
    "use strict";

    const state = {
        records: [],
        filtered: []
    };

    const $ = id => document.getElementById(id);

    function esc(value) {
        return String(value ?? "").replace(
            /[&<>"']/g,
            ch => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[ch])
        );
    }

    function applyFilters() {
        const search =
            $("panSearch").value.trim().toLowerCase();

        let records = state.records.filter(record => {
            if (!search) return true;

            return [
                record.name,
                record.cin,
                record.clientType,
                record.location,
                record.city,
                record.district,
                record.state,
                record.pan,
                record.contact,
                record.email
            ]
                .join(" ")
                .toLowerCase()
                .includes(search);
        });

        const sort = $("panSort").value;

        records.sort((a, b) => {
            if (sort === "name-asc") {
                return a.name.localeCompare(
                    b.name,
                    undefined,
                    { sensitivity: "base" }
                );
            }

            if (sort === "name-desc") {
                return b.name.localeCompare(
                    a.name,
                    undefined,
                    { sensitivity: "base" }
                );
            }

            if (sort === "cin-asc") {
                return a.cin.localeCompare(
                    b.cin,
                    undefined,
                    { sensitivity: "base" }
                );
            }

            if (sort === "cin-desc") {
                return b.cin.localeCompare(
                    a.cin,
                    undefined,
                    { sensitivity: "base" }
                );
            }

            return 0;
        });

        state.filtered = records;

        render();
    }

    function locationText(record) {
        const parts = [
            record.city,
            record.district,
            record.state
        ].filter(Boolean);

        if (parts.length) {
            return parts.join(" • ");
        }

        return record.location || "—";
    }

    function render() {
        const body = $("panTableBody");

        body.innerHTML = "";

        $("panTotal").textContent =
            state.records.length;

        $("panVisible").textContent =
            state.filtered.length;

        if (!state.filtered.length) {
            $("panTableWrap").style.display = "none";
            $("panEmpty").style.display = "block";
            return;
        }

        $("panEmpty").style.display = "none";
        $("panTableWrap").style.display = "block";

        state.filtered.forEach((record, index) => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td class="pan-client-cell">
                    <strong>${esc(record.name)}</strong>
                    <span>ID: ${esc(record.id)}</span>
                </td>

                <td>
                    ${esc(record.cin || "—")}
                </td>

                <td>
                    ${esc(record.clientType || "—")}
                </td>

                <td>
                    ${esc(locationText(record))}
                </td>

                <td>
                    <strong>${esc(record.pan)}</strong>
                </td>

                <td>
                    ${esc(record.contact || "—")}
                </td>

                <td>
                    ${esc(record.email || "—")}
                </td>

                <td>
                    <button
                        type="button"
                        class="pan-action-btn"
                        data-id="${esc(record.id)}"
                    >
                        View
                    </button>
                </td>
            `;

            body.appendChild(tr);
        });

        body.querySelectorAll(".pan-action-btn")
            .forEach(button => {
                button.addEventListener("click", () => {
                    const record =
                        state.records.find(
                            item =>
                                String(item.id) ===
                                String(button.dataset.id)
                        );

                    if (!record) return;

                    /*
                     * The existing client action can be
                     * connected here later without changing
                     * the PAN table.
                     */
                    if (record.id) {
                        window.location.href =
                            `/admin/clients.html?id=${encodeURIComponent(record.id)}`;
                    }
                });
            });
    }

    async function load() {
        $("panLoading").style.display = "block";
        $("panTableWrap").style.display = "none";
        $("panEmpty").style.display = "none";
        $("panError").style.display = "none";

        try {
            const response = await fetch(
                "/api/pan-dashboard",
                {
                    credentials: "same-origin",
                    cache: "no-store"
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Unable to load PAN records."
                );
            }

            state.records =
                Array.isArray(data.records)
                    ? data.records
                    : [];

            $("panLoading").style.display = "none";

            applyFilters();

        } catch (error) {
            console.error(
                "PAN LOAD ERROR:",
                error
            );

            $("panLoading").style.display = "none";
            $("panTableWrap").style.display = "none";
            $("panEmpty").style.display = "block";

            $("panError").textContent =
                error.message ||
                "Unable to load PAN records.";

            $("panError").style.display = "block";
        }
    }

    function exportExcel() {
        if (!state.filtered.length) {
            alert("No records match the current filter.");
            return;
        }

        if (!window.XLSX) {
            alert("Excel export library is not available.");
            return;
        }

        const rows =
            state.filtered.map((record, index) => ({
                "SR. NO.": index + 1,
                "CLIENT": record.name,
                "CLIENT ID": record.id,
                "CIN NUMBER": record.cin,
                "CLIENT TYPE": record.clientType,
                "LOCATION": locationText(record),
                "PAN": record.pan,
                "CONTACT": record.contact,
                "EMAIL": record.email
            }));

        const worksheet =
            XLSX.utils.json_to_sheet(rows);

        worksheet["!cols"] = [
            { wch: 10 },
            { wch: 28 },
            { wch: 25 },
            { wch: 20 },
            { wch: 20 },
            { wch: 35 },
            { wch: 18 },
            { wch: 18 },
            { wch: 32 }
        ];

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "PAN Clients"
        );

        XLSX.writeFile(
            workbook,
            "PAN-Client-Records.xlsx"
        );
    }

    function exportPdf() {
        if (!state.filtered.length) {
            alert("No records match the current filter.");
            return;
        }

        if (
            !window.jspdf ||
            !window.jspdf.jsPDF
        ) {
            alert("PDF export library is not available.");
            return;
        }

        const pdf =
            new window.jspdf.jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4"
            });

        pdf.setFontSize(15);
        pdf.text(
            "PAN Client Records",
            10,
            13
        );

        if (typeof pdf.autoTable !== "function") {
            alert("PDF table library is not available.");
            return;
        }

        pdf.autoTable({
            startY: 20,

            head: [[
                "SR. NO.",
                "CLIENT",
                "CLIENT ID",
                "CIN",
                "CLIENT TYPE",
                "LOCATION",
                "PAN",
                "CONTACT",
                "EMAIL"
            ]],

            body:
                state.filtered.map(
                    (record, index) => [
                        index + 1,
                        record.name,
                        record.id,
                        record.cin || "",
                        record.clientType || "",
                        locationText(record),
                        record.pan,
                        record.contact || "",
                        record.email || ""
                    ]
                ),

            styles: {
                fontSize: 6.5,
                cellPadding: 2
            }
        });

        pdf.save(
            "PAN-Client-Records.pdf"
        );
    }

    document.addEventListener(
        "DOMContentLoaded",
        () => {
            $("panSearch").addEventListener(
                "input",
                applyFilters
            );

            $("panSort").addEventListener(
                "change",
                applyFilters
            );

            $("panExcel").addEventListener(
                "click",
                exportExcel
            );

            $("panPdf").addEventListener(
                "click",
                exportPdf
            );

            load();
        }
    );

})();
