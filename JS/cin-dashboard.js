(() => {

    "use strict";


    const state = {

        records: [],

        filtered: []

    };


    const $ = id =>
        document.getElementById(id);


    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/[&<>"']/g, char => ({

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"

            }[char]));

    }


    function getStatus(record) {

        if (record.annualFilingDate) {

            return "FILED";

        }

        return "PENDING";

    }


    /* =====================================================
       FILTER
    ===================================================== */

    function applyFilters() {

        const search =
            $("cinSearch")
                .value
                .trim()
                .toLowerCase();

        const year =
            $("cinYearFilter")
                .value;

        const status =
            $("cinStatusFilter")
                .value;


        state.filtered =
            state.records.filter(record => {

                const cin =
                    String(
                        record.cin || ""
                    ).toLowerCase();


                if (
                    search &&
                    !cin.includes(search)
                ) {

                    return false;

                }


                if (year) {

                    const date =
                        record.annualFilingDate || "";

                    if (
                        !date.startsWith(year)
                    ) {

                        return false;

                    }

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


    /* =====================================================
       RENDER
    ===================================================== */

    function render() {

        $("cinTotalCount")
            .textContent =
            state.records.length;


        $("cinVisibleCount")
            .textContent =
            state.filtered.length;


        const body =
            $("cinTableBody");


        body.innerHTML = "";


        if (
            state.filtered.length === 0
        ) {

            $("cinTableWrap")
                .style.display = "none";

            $("cinEmpty")
                .style.display = "block";

            return;

        }


        $("cinEmpty")
            .style.display = "none";


        $("cinTableWrap")
            .style.display = "block";


        state.filtered.forEach(
            (record, index) => {

                const tr =
                    document.createElement("tr");


                const status =
                    getStatus(record);


                tr.innerHTML = `

                    <td>
                        ${index + 1}
                    </td>

                    <td>
                        ${escapeHtml(record.cin)}
                    </td>

                    <td>

                        <input
                            type="date"
                            class="cin-date"
                            data-id="${escapeHtml(record.id)}"
                            value="${escapeHtml(
                                record.annualFilingDate
                            )}"
                        >

                    </td>

                    <td class="cin-status ${
                        status === "FILED"
                            ? "filed"
                            : "pending"
                    }">

                        ${status}

                    </td>

                `;


                body.appendChild(tr);

            }
        );


        document
            .querySelectorAll(".cin-date")
            .forEach(input => {

                input.addEventListener(
                    "change",
                    () => {

                        const record =
                            state.records.find(
                                item =>
                                    item.id ===
                                    input.dataset.id
                            );


                        if (!record) {
                            return;
                        }


                        record.annualFilingDate =
                            input.value;


                        applyFilters();

                    }
                );

            });

    }


    /* =====================================================
       LOAD
    ===================================================== */

    async function loadRecords() {

        $("cinLoading")
            .style.display = "block";


        $("cinEmpty")
            .style.display = "none";


        try {

            const response =
                await fetch(
                    "/api/cin-dashboard",
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
                    "Unable to load CIN records."
                );

            }


            state.records =
                Array.isArray(data.records)
                    ? data.records
                    : [];


            populateYears();


            $("cinLoading")
                .style.display = "none";


            applyFilters();


        } catch (error) {

            $("cinLoading")
                .style.display = "none";


            $("cinError")
                .textContent =
                error.message;


            $("cinError")
                .style.display = "block";

        }

    }


    /* =====================================================
       YEAR FILTER
    ===================================================== */

    function populateYears() {

        const select =
            $("cinYearFilter");


        const current =
            select.value;


        const years =
            new Set();


        state.records.forEach(
            record => {

                if (
                    record.annualFilingDate
                ) {

                    years.add(
                        record
                            .annualFilingDate
                            .substring(0, 4)
                    );

                }

            }
        );


        select.innerHTML = `
            <option value="">
                All Years
            </option>
        `;


        Array.from(years)
            .sort()
            .reverse()
            .forEach(year => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    year;

                option.textContent =
                    year;

                select.appendChild(
                    option
                );

            });


        if (
            years.has(current)
        ) {

            select.value =
                current;

        }

    }


    /* =====================================================
       SAVE ALL
    ===================================================== */

    async function saveAll() {

        const button =
            $("cinSaveAll");


        button.disabled = true;

        button.textContent =
            "Saving...";


        $("cinError")
            .style.display = "none";


        try {

            const response =
                await fetch(
                    "/api/cin-dashboard/bulk",
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
                    "Unable to save CIN records."
                );

            }


            state.records =
                data.records ||
                state.records;


            applyFilters();


            $("cinToast")
                .textContent =
                "All CIN records saved successfully.";


            $("cinToast")
                .classList
                .add("show");


            setTimeout(
                () => {

                    $("cinToast")
                        .classList
                        .remove("show");

                },
                2500
            );


        } catch (error) {

            $("cinError")
                .textContent =
                error.message;


            $("cinError")
                .style.display =
                "block";

        } finally {

            button.disabled =
                false;

            button.textContent =
                "Save All";

        }

    }


    /* =====================================================
       EXCEL
    ===================================================== */

    function exportExcel() {

        if (
            !state.filtered.length
        ) {

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

                    "SR. NO.":
                        index + 1,

                    "CIN NUMBER":
                        record.cin,

                    "ANNUAL FILING DATE":
                        record.annualFilingDate ||
                        "",

                    "STATUS":
                        getStatus(record)

                })
            );


        const worksheet =
            XLSX.utils.json_to_sheet(
                rows
            );


        const workbook =
            XLSX.utils.book_new();


        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "CIN Dashboard"
        );


        XLSX.writeFile(
            workbook,
            "cin-dashboard.xlsx"
        );

    }


    /* =====================================================
       PDF
    ===================================================== */

    function exportPdf() {

        if (
            !state.filtered.length
        ) {

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


        const PDF =
            window.jspdf.jsPDF;


        const pdf =
            new PDF({
                orientation:
                    "landscape",

                unit:
                    "mm",

                format:
                    "a4"
            });


        pdf.setFontSize(16);

        pdf.text(
            "CIN Dashboard",
            10,
            14
        );


        pdf.setFontSize(8);

        pdf.text(
            "Annual Filing Register",
            10,
            20
        );


        pdf.autoTable({

            startY: 26,

            head: [[
                "SR. NO.",
                "CIN NUMBER",
                "ANNUAL FILING DATE",
                "STATUS"
            ]],

            body:
                state.filtered.map(
                    (record, index) => [

                        index + 1,

                        record.cin,

                        record
                            .annualFilingDate ||
                            "",

                        getStatus(
                            record
                        )

                    ]
                ),

            styles: {

                fontSize: 8,

                cellPadding: 2

            }

        });


        pdf.save(
            "cin-dashboard.pdf"
        );

    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            $("cinSearch")
                .addEventListener(
                    "input",
                    applyFilters
                );


            $("cinYearFilter")
                .addEventListener(
                    "change",
                    applyFilters
                );


            $("cinStatusFilter")
                .addEventListener(
                    "change",
                    applyFilters
                );


            $("cinSaveAll")
                .addEventListener(
                    "click",
                    saveAll
                );


            $("cinExportExcel")
                .addEventListener(
                    "click",
                    exportExcel
                );


            $("cinExportPdf")
                .addEventListener(
                    "click",
                    exportPdf
                );


            loadRecords();

        }
    );

})();