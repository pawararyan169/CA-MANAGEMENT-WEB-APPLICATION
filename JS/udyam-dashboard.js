(() => {
    "use strict";

    const state = {
        year: new Date().getFullYear(),
        records: [],
        filtered: []
    };

    const $ = id => document.getElementById(id);

    function esc(value) {
        return String(value ?? "").replace(
            /[&<>"']/g,
            character => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[character])
        );
    }

    function getStatus(record) {
        return record.dateOfRenewal
            ? "RENEWAL DONE"
            : "RENEWAL PENDING";
    }

    function populateYears() {
        const select = $("udyamYear");
        const current = new Date().getFullYear();

        select.innerHTML = "";

        for (let year = current + 1; year >= current - 5; year--) {
            const option = document.createElement("option");
            option.value = year;
            option.textContent = year;
            select.appendChild(option);
        }

        select.value = String(state.year);
    }

    function applyFilters() {
        const search =
            $("udyamSearch").value.trim().toLowerCase();

        const status =
            $("udyamStatus").value;

        state.filtered = state.records.filter(record => {
            if (
                search &&
                !String(record.name || "")
                    .toLowerCase()
                    .includes(search) &&
                !String(record.udyamNumber || "")
                    .toLowerCase()
                    .includes(search)
            ) {
                return false;
            }

            if (
                status &&
                getStatus(record) !== status
            ) {
                return false;
            }

            return true;
        });

        render();
    }

    function render() {
        const body = $("udyamTableBody");

        body.innerHTML = "";

        $("udyamTotal").textContent =
            state.records.length;

        $("udyamVisible").textContent =
            state.filtered.length;

        $("udyamYearLabel").textContent =
            state.year;

        if (!state.filtered.length) {
            $("udyamTableWrap").style.display = "none";
            $("udyamEmpty").style.display = "block";
            return;
        }

        $("udyamEmpty").style.display = "none";
        $("udyamTableWrap").style.display = "block";

        state.filtered.forEach((record, index) => {
            const tr = document.createElement("tr");

            tr.dataset.id = record.id;

            tr.innerHTML = `
                <td>${index + 1}</td>

                <td>
                    <strong>${esc(record.name)}</strong>
                </td>

                <td>
                    ${esc(record.udyamNumber)}
                </td>

                <td>
                    <input
                        type="date"
                        data-field="dateOfRenewal"
                        value="${esc(record.dateOfRenewal)}"
                    >
                </td>

                <td class="
                    udyam-status
                    ${getStatus(record)
                        .toLowerCase()
                        .replace(/\s+/g, "-")}
                ">
                    ${getStatus(record)}
                </td>
            `;

            body.appendChild(tr);
        });

        body.querySelectorAll(
            "input[data-field]"
        ).forEach(input => {
            input.addEventListener("change", () => {
                const id =
                    input.closest("tr").dataset.id;

                const record =
                    state.records.find(
                        item => item.id === id
                    );

                if (!record) return;

                record[input.dataset.field] =
                    input.value;

                applyFilters();
            });
        });
    }

    async function load(year) {
        $("udyamLoading").style.display = "block";
        $("udyamError").style.display = "none";

        try {
            const response = await fetch(
                `/api/udyam-dashboard?year=${encodeURIComponent(year)}`,
                {
                    credentials: "same-origin",
                    cache: "no-store"
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Unable to load Udyam records."
                );
            }

            state.year = Number(data.year);

            state.records =
                Array.isArray(data.records)
                    ? data.records
                    : [];

            $("udyamYear").value =
                String(state.year);

            $("udyamLoading").style.display =
                "none";

            applyFilters();
        } catch (error) {
            console.error(
                "UDYAM LOAD ERROR:",
                error
            );

            $("udyamLoading").style.display =
                "none";

            $("udyamTableWrap").style.display =
                "none";

            $("udyamEmpty").style.display =
                "block";

            $("udyamError").textContent =
                error.message;

            $("udyamError").style.display =
                "block";
        }
    }

    async function saveAll() {
        const button = $("udyamSave");

        button.disabled = true;
        button.textContent = "Saving...";

        $("udyamError").style.display = "none";

        try {
            const response = await fetch(
                "/api/udyam-dashboard/bulk",
                {
                    method: "PATCH",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        year: state.year,
                        records: state.records
                    })
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Unable to save Udyam records."
                );
            }

            state.records =
                Array.isArray(data.records)
                    ? data.records
                    : state.records;

            applyFilters();

            showToast(
                "Udyam records saved successfully."
            );
        } catch (error) {
            console.error(
                "UDYAM SAVE ERROR:",
                error
            );

            $("udyamError").textContent =
                error.message;

            $("udyamError").style.display =
                "block";
        } finally {
            button.disabled = false;
            button.textContent = "Save All";
        }
    }

    function showToast(message) {
        const toast = $("udyamToast");

        toast.textContent = message;
        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 2500);
    }

    function exportExcel() {
        if (!state.filtered.length) {
            alert(
                "No records match the current filters."
            );
            return;
        }

        if (!window.XLSX) {
            alert(
                "Excel export library is not available."
            );
            return;
        }

        const rows =
            state.filtered.map((record, index) => ({
                "SR. NO.": index + 1,
                "NAME": record.name,
                "UDYAM NUMBER": record.udyamNumber,
                "DATE OF RENEWAL":
                    record.dateOfRenewal || "",
                "STATUS": getStatus(record),
                "YEAR": state.year
            }));

        const worksheet =
            XLSX.utils.json_to_sheet(rows);

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "UDYAM"
        );

        XLSX.writeFile(
            workbook,
            `UDYAM-${state.year}.xlsx`
        );
    }

    function exportPdf() {
        if (!state.filtered.length) {
            alert(
                "No records match the current filters."
            );
            return;
        }

        if (
            !window.jspdf ||
            !window.jspdf.jsPDF
        ) {
            alert(
                "PDF export library is not available."
            );
            return;
        }

        const pdf =
            new window.jspdf.jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4"
            });

        pdf.setFontSize(16);

        pdf.text(
            `Udyam Dashboard - ${state.year}`,
            10,
            14
        );

        if (
            typeof pdf.autoTable !== "function"
        ) {
            alert(
                "PDF table library is not available."
            );
            return;
        }

        pdf.autoTable({
            startY: 22,

            head: [[
                "SR. NO.",
                "NAME",
                "UDYAM NUMBER",
                "DATE OF RENEWAL",
                "STATUS"
            ]],

            body:
                state.filtered.map(
                    (record, index) => [
                        index + 1,
                        record.name,
                        record.udyamNumber,
                        record.dateOfRenewal || "",
                        getStatus(record)
                    ]
                ),

            styles: {
                fontSize: 8,
                cellPadding: 2
            }
        });

        pdf.save(
            `UDYAM-${state.year}.pdf`
        );
    }

    document.addEventListener(
        "DOMContentLoaded",
        () => {
            populateYears();

            $("udyamYear").addEventListener(
                "change",
                () => {
                    state.year =
                        Number(
                            $("udyamYear").value
                        );

                    load(state.year);
                }
            );

            $("udyamSearch").addEventListener(
                "input",
                applyFilters
            );

            $("udyamStatus").addEventListener(
                "change",
                applyFilters
            );

            $("udyamSave").addEventListener(
                "click",
                saveAll
            );

            $("udyamExcel").addEventListener(
                "click",
                exportExcel
            );

            $("udyamPdf").addEventListener(
                "click",
                exportPdf
            );

            load(state.year);
        }
    );

})();
