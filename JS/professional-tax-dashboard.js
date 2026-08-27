(() => {

    "use strict";


    const state = {

        type:
            document.body.dataset.taxType ||
            "PTEC",

        year:
            new Date().getFullYear(),

        records: [],

        filtered: []

    };


    const $ =
        id =>
            document.getElementById(id);


    /*
    =====================================================
    ESCAPE
    =====================================================
    */

    function esc(value) {

        return String(
            value ?? ""
        ).replace(
            /[&<>"']/g,
            character => ({

                "&":
                    "&amp;",

                "<":
                    "&lt;",

                ">":
                    "&gt;",

                '"':
                    "&quot;",

                "'":
                    "&#039;"

            }[character])
        );

    }


    /*
    =====================================================
    STATUS
    =====================================================
    */

    function getStatus(record) {

        return record.dateOfPayment
            ? "PAYMENT DONE"
            : "PAYMENT PENDING";

    }


    /*
    =====================================================
    YEARS
    =====================================================
    */

    function populateYears() {

        const select =
            $("professionalTaxYear");


        const currentYear =
            new Date().getFullYear();


        select.innerHTML = "";


        for (
            let year =
                currentYear + 1;

            year >=
                currentYear - 5;

            year--
        ) {

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

        }


        select.value =
            String(
                state.year
            );

    }


    /*
    =====================================================
    FILTER
    =====================================================
    */

    function applyFilters() {

        const search =
            $("professionalTaxSearch")
                .value
                .trim()
                .toLowerCase();


        const status =
            $("professionalTaxStatus")
                .value;


        state.filtered =
            state.records.filter(
                record => {

                    if (
                        search &&
                        !String(
                            record.name
                        )
                        .toLowerCase()
                        .includes(search) &&

                        !String(
                            record.taxNumber
                        )
                        .toLowerCase()
                        .includes(search)
                    ) {

                        return false;

                    }


                    if (
                        status &&
                        getStatus(record) !==
                        status
                    ) {

                        return false;

                    }


                    return true;

                }
            );


        render();

    }


    /*
    =====================================================
    RENDER
    =====================================================
    */

    function render() {

        const body =
            $("professionalTaxTableBody");


        body.innerHTML = "";


        $("professionalTaxTotal")
            .textContent =
            state.records.length;


        $("professionalTaxVisible")
            .textContent =
            state.filtered.length;


        $("professionalTaxYearLabel")
            .textContent =
            state.year;


        if (
            !state.filtered.length
        ) {

            $("professionalTaxTableWrap")
                .style.display =
                "none";


            $("professionalTaxEmpty")
                .style.display =
                "block";


            return;

        }


        $("professionalTaxEmpty")
            .style.display =
            "none";


        $("professionalTaxTableWrap")
            .style.display =
            "block";


        state.filtered.forEach(
            (record, index) => {

                const tr =
                    document.createElement(
                        "tr"
                    );


                tr.dataset.id =
                    record.id;


                tr.innerHTML = `

                    <td>
                        ${index + 1}
                    </td>

                    <td>
                        ${esc(
                            record.name
                        )}
                    </td>

                    <td>
                        ${esc(
                            record.taxNumber
                        )}
                    </td>

                    <td>

                        <input
                            type="date"
                            data-field="dateOfPayment"
                            value="${esc(
                                record.dateOfPayment
                            )}"
                        >

                    </td>

                    <td
                        class="
                            professional-tax-status
                            ${
                                getStatus(
                                    record
                                )
                                .toLowerCase()
                                .replace(
                                    /\s+/g,
                                    "-"
                                )
                            }
                        "
                    >

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
            .forEach(
                input => {

                    input.addEventListener(
                        "change",
                        () => {

                            const id =
                                input
                                    .closest("tr")
                                    .dataset
                                    .id;


                            const record =
                                state.records.find(
                                    item =>
                                        item.id ===
                                        id
                                );


                            if (!record)
                                return;


                            record[
                                input.dataset.field
                            ] =
                                input.value;


                            applyFilters();

                        }
                    );

                }
            );

    }


    /*
    =====================================================
    LOAD
    =====================================================
    */

    async function load(year) {

        $("professionalTaxLoading")
            .style.display =
            "block";


        $("professionalTaxError")
            .style.display =
            "none";


        try {

            const endpoint =
                state.type === "PTEC"
                    ? "ptec-dashboard"
                    : "ptrc-dashboard";


            const response =
                await fetch(
                    `/api/${endpoint}?year=${encodeURIComponent(year)}`,
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
                    `Unable to load ${state.type} records.`
                );

            }


            state.year =
                Number(
                    data.year
                );


            state.records =
                Array.isArray(
                    data.records
                )
                    ? data.records
                    : [];


            $("professionalTaxYear")
                .value =
                String(
                    state.year
                );


            $("professionalTaxLoading")
                .style.display =
                "none";


            applyFilters();

        }
        catch (error) {

            console.error(
                `${state.type} LOAD ERROR:`,
                error
            );


            $("professionalTaxLoading")
                .style.display =
                "none";


            $("professionalTaxTableWrap")
                .style.display =
                "none";


            $("professionalTaxEmpty")
                .style.display =
                "block";


            $("professionalTaxError")
                .textContent =
                error.message;


            $("professionalTaxError")
                .style.display =
                "block";

        }

    }


    /*
    =====================================================
    SAVE ALL
    =====================================================
    */

    async function saveAll() {

        const button =
            $("professionalTaxSave");


        button.disabled =
            true;


        button.textContent =
            "Saving...";


        try {

            const endpoint =
                state.type === "PTEC"
                    ? "ptec-dashboard"
                    : "ptrc-dashboard";


            const response =
                await fetch(
                    `/api/${endpoint}/bulk`,
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
                    "Unable to save records."
                );

            }


            state.records =
                Array.isArray(
                    data.records
                )
                    ? data.records
                    : state.records;


            applyFilters();


            showToast(
                `${state.type} records saved successfully.`
            );

        }
        catch (error) {

            console.error(
                `${state.type} SAVE ERROR:`,
                error
            );


            $("professionalTaxError")
                .textContent =
                error.message;


            $("professionalTaxError")
                .style.display =
                "block";

        }
        finally {

            button.disabled =
                false;


            button.textContent =
                "Save All";

        }

    }


    /*
    =====================================================
    TOAST
    =====================================================
    */

    function showToast(message) {

        const toast =
            $("professionalTaxToast");


        toast.textContent =
            message;


        toast.classList.add(
            "show"
        );


        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2500
        );

    }


    /*
    =====================================================
    EXCEL
    =====================================================
    */

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

                    "NAME":
                        record.name,

                    [`${state.type} NUMBER`]:
                        record.taxNumber,

                    "DATE OF PAYMENT":
                        record.dateOfPayment || "",

                    "STATUS":
                        getStatus(record),

                    "YEAR":
                        state.year

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
            state.type
        );


        XLSX.writeFile(
            workbook,
            `${state.type}-${state.year}.xlsx`
        );

    }


    /*
    =====================================================
    PDF
    =====================================================
    */

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


        const pdf =
            new window.jspdf.jsPDF({

                orientation:
                    "landscape",

                unit:
                    "mm",

                format:
                    "a4"

            });


        pdf.setFontSize(
            16
        );


        pdf.text(
            `${state.type} Dashboard - ${state.year}`,
            10,
            14
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

            startY:
                22,

            head: [[

                "SR. NO.",

                "NAME",

                `${state.type} NUMBER`,

                "DATE OF PAYMENT",

                "STATUS"

            ]],

            body:
                state.filtered.map(
                    (record, index) => [

                        index + 1,

                        record.name,

                        record.taxNumber,

                        record.dateOfPayment || "",

                        getStatus(record)

                    ]
                ),

            styles: {

                fontSize:
                    8,

                cellPadding:
                    2

            }

        });


        pdf.save(
            `${state.type}-${state.year}.pdf`
        );

    }


    /*
    =====================================================
    INIT
    =====================================================
    */

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            populateYears();


            $("professionalTaxYear")
                .addEventListener(
                    "change",
                    () => {

                        state.year =
                            Number(
                                $("professionalTaxYear")
                                    .value
                            );


                        load(
                            state.year
                        );

                    }
                );


            $("professionalTaxSearch")
                .addEventListener(
                    "input",
                    applyFilters
                );


            $("professionalTaxStatus")
                .addEventListener(
                    "change",
                    applyFilters
                );


            $("professionalTaxSave")
                .addEventListener(
                    "click",
                    saveAll
                );


            $("professionalTaxExcel")
                .addEventListener(
                    "click",
                    exportExcel
                );


            $("professionalTaxPdf")
                .addEventListener(
                    "click",
                    exportPdf
                );


            load(
                state.year
            );

        }
    );

})();