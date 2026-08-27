(() => {
    "use strict";

    const state = {
        year: new Date().getFullYear(),
        records: [],
        filtered: []
    };

    const $ = id =>
        document.getElementById(id);

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

    function getStatus(record) {
        if (record.q4FilingDate) {
            return "Q4 FILLED";
        }

        if (record.q3FilingDate) {
            return "Q4 FILING PENDING";
        }

        if (record.q2FilingDate) {
            return "Q3 FILING PENDING";
        }

        if (record.q1FilingDate) {
            return "Q2 FILING PENDING";
        }

        return "Q1 FILING PENDING";
    }

    function populateYears() {
        const select =
            $("tanYear");

        const current =
            new Date().getFullYear();

        select.innerHTML = "";

        for (
            let year = current + 1;
            year >= current - 5;
            year--
        ) {
            const option =
                document.createElement("option");

            option.value = year;
            option.textContent = year;

            select.appendChild(option);
        }

        select.value =
            String(state.year);
    }

    function applyFilters() {
        const search =
            $("tanSearch")
                .value
                .trim()
                .toLowerCase();

        const selectedStatus =
            $("tanStatus").value;

        const sort =
            $("tanSort").value;

        let records =
            state.records.filter(record => {
                if (search) {
                    const haystack = [
                        record.name,
                        record.tanNumber,
                        record.status
                    ]
                        .join(" ")
                        .toLowerCase();

                    if (!haystack.includes(search)) {
                        return false;
                    }
                }

                if (
                    selectedStatus &&
                    getStatus(record) !== selectedStatus
                ) {
                    return false;
                }

                return true;
            });

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

            if (sort === "tan-asc") {
                return String(a.tanNumber)
                    .localeCompare(
                        String(b.tanNumber),
                        undefined,
                        { sensitivity: "base" }
                    );
            }

            if (sort === "tan-desc") {
                return String(b.tanNumber)
                    .localeCompare(
                        String(a.tanNumber),
                        undefined,
                        { sensitivity: "base" }
                    );
            }

            if (sort === "q1-asc") {
                return String(a.q1FilingDate)
                    .localeCompare(
                        String(b.q1FilingDate)
                    );
            }

            if (sort === "q1-desc") {
                return String(b.q1FilingDate)
                    .localeCompare(
                        String(a.q1FilingDate)
                    );
            }

            if (sort === "q2-asc") {
                return String(a.q2FilingDate)
                    .localeCompare(
                        String(b.q2FilingDate)
                    );
            }

            if (sort === "q2-desc") {
                return String(b.q2FilingDate)
                    .localeCompare(
                        String(a.q2FilingDate)
                    );
            }

            if (sort === "q3-asc") {
                return String(a.q3FilingDate)
                    .localeCompare(
                        String(b.q3FilingDate)
                    );
            }

            if (sort === "q3-desc") {
                return String(b.q3FilingDate)
                    .localeCompare(
                        String(a.q3FilingDate)
                    );
            }

            if (sort === "q4-asc") {
                return String(a.q4FilingDate)
                    .localeCompare(
                        String(b.q4FilingDate)
                    );
            }

            if (sort === "q4-desc") {
                return String(b.q4FilingDate)
                    .localeCompare(
                        String(a.q4FilingDate)
                    );
            }

            if (sort === "status-asc") {
                return getStatus(a).localeCompare(
                    getStatus(b)
                );
            }

            if (sort === "status-desc") {
                return getStatus(b).localeCompare(
                    getStatus(a)
                );
            }

            return 0;
        });

        state.filtered = records;

        render();
    }

    function render() {
        const body =
            $("tanTableBody");

        body.innerHTML = "";

        $("tanTotal").textContent =
            state.records.length;

        $("tanVisible").textContent =
            state.filtered.length;

        $("tanYearLabel").textContent =
            state.year;

        if (!state.filtered.length) {
            $("tanTableWrap").style.display =
                "none";

            $("tanEmpty").style.display =
                "block";

            return;
        }

        $("tanEmpty").style.display =
            "none";

        $("tanTableWrap").style.display =
            "block";

        state.filtered.forEach(
            (record, index) => {
                const tr =
                    document.createElement("tr");

                tr.dataset.id =
                    record.id;

                tr.innerHTML = `
                    <td>
                        ${index + 1}
                    </td>

                    <td>
                        <strong>
                            ${esc(record.name)}
                        </strong>
                    </td>

                    <td>
                        ${esc(record.tanNumber)}
                    </td>

                    <td>
                        <input
                            type="date"
                            data-field="q1FilingDate"
                            value="${esc(record.q1FilingDate)}"
                        >
                    </td>

                    <td>
                        <input
                            type="date"
                            data-field="q2FilingDate"
                            value="${esc(record.q2FilingDate)}"
                        >
                    </td>

                    <td>
                        <input
                            type="date"
                            data-field="q3FilingDate"
                            value="${esc(record.q3FilingDate)}"
                        >
                    </td>

                    <td>
                        <input
                            type="date"
                            data-field="q4FilingDate"
                            value="${esc(record.q4FilingDate)}"
                        >
                    </td>

                    <td class="
                        tan-status
                        ${getStatus(record)
                            .toLowerCase()
                            .replace(/\s+/g, "-")}
                    ">
                        ${getStatus(record)}
                    </td>
                `;

                body.appendChild(tr);
            }
        );

        body
            .querySelectorAll(
                "input[data-field]"
            )
            .forEach(input => {
                input.addEventListener(
                    "change",
                    () => {
                        const id =
                            input.closest("tr")
                                .dataset.id;

                        const record =
                            state.records.find(
                                item =>
                                    item.id === id
                            );

                        if (!record) return;

                        /*
                        Prevent entering a later
                        quarter before the previous one.
                        */
                        const field =
                            input.dataset.field;

                        const value =
                            input.value;

                        if (
                            field === "q2FilingDate" &&
                            value &&
                            !record.q1FilingDate
                        ) {
                            alert(
                                "Enter Q1 filing date first."
                            );

                            input.value = "";
                            return;
                        }

                        if (
                            field === "q3FilingDate" &&
                            value &&
                            !record.q2FilingDate
                        ) {
                            alert(
                                "Enter Q2 filing date first."
                            );

                            input.value = "";
                            return;
                        }

                        if (
                            field === "q4FilingDate" &&
                            value &&
                            !record.q3FilingDate
                        ) {
                            alert(
                                "Enter Q3 filing date first."
                            );

                            input.value = "";
                            return;
                        }

                        record[field] = value;

                        applyFilters();
                    }
                );
            });
    }

    async function load(year) {
        $("tanLoading").style.display =
            "block";

        $("tanError").style.display =
            "none";

        $("tanTableWrap").style.display =
            "none";

        $("tanEmpty").style.display =
            "none";

        try {
            const response =
                await fetch(
                    `/api/tan-dashboard?year=${encodeURIComponent(year)}`,
                    {
                        credentials:
                            "same-origin",
                        cache:
                            "no-store"
                    }
                );

            const data =
                await response.json();

            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.message ||
                    "Unable to load TAN records."
                );
            }

            state.year =
                Number(data.year);

            state.records =
                Array.isArray(data.records)
                    ? data.records
                    : [];

            $("tanYear").value =
                String(state.year);

            $("tanLoading").style.display =
                "none";

            applyFilters();

        } catch (error) {
            console.error(
                "TAN LOAD ERROR:",
                error
            );

            $("tanLoading").style.display =
                "none";

            $("tanEmpty").style.display =
                "block";

            $("tanError").textContent =
                error.message;

            $("tanError").style.display =
                "block";
        }
    }

    async function saveAll() {
        const button =
            $("tanSave");

        button.disabled =
            true;

        button.textContent =
            "Saving...";

        $("tanError").style.display =
            "none";

        try {
            const response =
                await fetch(
                    "/api/tan-dashboard/bulk",
                    {
                        method:
                            "PATCH",

                        credentials:
                            "same-origin",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                year:
                                    state.year,

                                records:
                                    state.records
                            })
                    }
                );

            const data =
                await response.json();

            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.message ||
                    "Unable to save TAN records."
                );
            }

            state.records =
                Array.isArray(data.records)
                    ? data.records
                    : state.records;

            applyFilters();

            showToast(
                "TAN records saved successfully."
            );

        } catch (error) {
            console.error(
                "TAN SAVE ERROR:",
                error
            );

            $("tanError").textContent =
                error.message;

            $("tanError").style.display =
                "block";

        } finally {
            button.disabled =
                false;

            button.textContent =
                "Save All";
        }
    }

    function showToast(message) {
        const toast =
            $("tanToast");

        toast.textContent =
            message;

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
            state.filtered.map(
                (record, index) => ({
                    "SR. NO.": index + 1,
                    "NAME": record.name,
                    "TAN NUMBER": record.tanNumber,
                    "Q1 FILING DATE":
                        record.q1FilingDate || "",
                    "Q2 FILING DATE":
                        record.q2FilingDate || "",
                    "Q3 FILING DATE":
                        record.q3FilingDate || "",
                    "Q4 FILING DATE":
                        record.q4FilingDate || "",
                    "STATUS": getStatus(record),
                    "YEAR": state.year
                })
            );

        const worksheet =
            XLSX.utils.json_to_sheet(rows);

        worksheet["!cols"] = [
            { wch: 10 },
            { wch: 30 },
            { wch: 20 },
            { wch: 18 },
            { wch: 18 },
            { wch: 18 },
            { wch: 18 },
            { wch: 25 },
            { wch: 10 }
        ];

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "TAN"
        );

        XLSX.writeFile(
            workbook,
            `TAN-${state.year}.xlsx`
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
                orientation:
                    "landscape",
                unit:
                    "mm",
                format:
                    "a4"
            });

        pdf.setFontSize(15);

        pdf.text(
            `TAN Dashboard - ${state.year}`,
            10,
            13
        );

        if (
            typeof pdf.autoTable !==
            "function"
        ) {
            alert(
                "PDF table library is not available."
            );
            return;
        }

        pdf.autoTable({
            startY: 20,

            head: [[
                "SR. NO.",
                "NAME",
                "TAN NUMBER",
                "Q1 DATE",
                "Q2 DATE",
                "Q3 DATE",
                "Q4 DATE",
                "STATUS"
            ]],

            body:
                state.filtered.map(
                    (record, index) => [
                        index + 1,
                        record.name,
                        record.tanNumber,
                        record.q1FilingDate || "",
                        record.q2FilingDate || "",
                        record.q3FilingDate || "",
                        record.q4FilingDate || "",
                        getStatus(record)
                    ]
                ),

            styles: {
                fontSize: 7,
                cellPadding: 2
            }
        });

        pdf.save(
            `TAN-${state.year}.pdf`
        );
    }

    document.addEventListener(
        "DOMContentLoaded",
        () => {
            populateYears();

            $("tanYear").addEventListener(
                "change",
                () => {
                    state.year =
                        Number(
                            $("tanYear").value
                        );

                    load(state.year);
                }
            );

            $("tanSearch").addEventListener(
                "input",
                applyFilters
            );

            $("tanStatus").addEventListener(
                "change",
                applyFilters
            );

            $("tanSort").addEventListener(
                "change",
                applyFilters
            );

            $("tanSave").addEventListener(
                "click",
                saveAll
            );

            $("tanExcel").addEventListener(
                "click",
                exportExcel
            );

            $("tanPdf").addEventListener(
                "click",
                exportPdf
            );

            load(state.year);
        }
    );

})();
