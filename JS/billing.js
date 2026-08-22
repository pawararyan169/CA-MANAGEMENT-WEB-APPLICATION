(() => {
    "use strict";

    /*
     * ============================================================
     * BILLING RECORD
     * ============================================================
     *
     * Table order:
     *
     * 1.  Serial Number
     * 2.  Name
     * 3.  Name of Task
     * 4.  Chargeable Amount
     * 5.  Date of Receipt
     * 6.  Amount
     * 7.  Mode
     * 8.  Date of Advance Payment
     * 9.  Advance Paid Amount
     * 10. Advance Payment Mode
     * 11. Balance
     *
     * Only COMPLETED + BILLABLE tasks are shown.
     *
     * Client name and task name are read-only.
     *
     * Payment fields are editable directly in the table.
     *
     * Balance:
     *
     * Chargeable Amount
     * - Amount
     * - Advance Paid Amount
     *
     * If balance = 0:
     *     NIL
     *
     * ============================================================
     */

    const API = "/api/billing";

    let records = [];
    let savingTimers = new Map();


    /* ============================================================
       BASIC HELPERS
    ============================================================ */

    const $ = (id) => document.getElementById(id);


    function setText(id, value) {
        const element = $(id);

        if (element) {
            element.textContent = value;
        }
    }


    function esc(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function number(value) {
        const n = Number(value);

        return Number.isFinite(n) ? n : 0;
    }


    function money(value) {
        const n = number(value);

        return "₹" + n.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }


    function formatDate(value) {

        if (!value) {
            return "—";
        }

        const raw = String(value).slice(0, 10);

        const parts = raw.split("-");

        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }

        return String(value);
    }


    function inputDate(value) {

        if (!value) {
            return "";
        }

        const raw = String(value).slice(0, 10);

        /*
         * Already YYYY-MM-DD
         */
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            return raw;
        }

        /*
         * DD/MM/YYYY
         */
        const parts = raw.split("/");

        if (
            parts.length === 3 &&
            parts[0].length === 2 &&
            parts[1].length === 2 &&
            parts[2].length === 4
        ) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        return "";
    }


    function showError(message) {

        const box = $("billingError");

        if (!box) {
            return;
        }

        box.textContent = message;
        box.hidden = false;

        const success = $("billingSuccess");

        if (success) {
            success.hidden = true;
        }
    }


    function showSuccess(message) {

        const box = $("billingSuccess");

        if (!box) {
            return;
        }

        box.textContent = message;
        box.hidden = false;

        const error = $("billingError");

        if (error) {
            error.hidden = true;
        }

        setTimeout(() => {

            if (box) {
                box.hidden = true;
            }

        }, 2500);
    }


    function clearMessages() {

        const error = $("billingError");
        const success = $("billingSuccess");

        if (error) {
            error.hidden = true;
        }

        if (success) {
            success.hidden = true;
        }
    }


    /* ============================================================
       COMPLETED + BILLABLE CHECK
    ============================================================ */

    function isCompleted(record) {

        const status = String(
            record.status ??
            record.taskStatus ??
            ""
        )
            .trim()
            .toLowerCase();

        /*
         * Your backend already returns completed billing records.
         *
         * Accept all common spellings.
         */
        return (
            status === "completed" ||
            status === "complete"
        );
    }


    function isBillable(record) {

        const value =
            record.billable ??
            record.billing ??
            record.billingStatus ??
            record.isBillable;

        if (value === true || value === 1) {
            return true;
        }

        const text = String(value ?? "")
            .trim()
            .toLowerCase();

        return (
            text === "billable" ||
            text === "yes" ||
            text === "true" ||
            text === "chargeable"
        );
    }


    /*
     * IMPORTANT:
     *
     * If the API already returns ONLY completed + billable records,
     * do not accidentally remove records because the API omitted
     * status/billable fields.
     */
    function eligibleForBilling(record) {

        const hasStatus =
            record.status !== undefined ||
            record.taskStatus !== undefined;

        const hasBillable =
            record.billable !== undefined ||
            record.billing !== undefined ||
            record.billingStatus !== undefined ||
            record.isBillable !== undefined;

        if (!hasStatus && !hasBillable) {
            return true;
        }

        if (hasStatus && !isCompleted(record)) {
            return false;
        }

        if (hasBillable && !isBillable(record)) {
            return false;
        }

        return true;
    }


    /* ============================================================
       SEARCH + DATE FILTER
    ============================================================ */

    function filteredRecords() {

        const searchElement = $("billingSearch");
        const fromElement = $("billingDateFrom");
        const toElement = $("billingDateTo");

        const search = searchElement
            ? searchElement.value.trim().toLowerCase()
            : "";

        const from = fromElement
            ? fromElement.value
            : "";

        const to = toElement
            ? toElement.value
            : "";

        return records.filter(record => {

            /*
             * Completed + billable only.
             */
            if (!eligibleForBilling(record)) {
                return false;
            }


            /*
             * Search.
             */
            const searchable = [
                record.serialNumber,
                record.clientName,
                record.name,
                record.pan,
                record.taskName,
                record.task,
                record.nameOfTask
            ]
                .filter(value => value !== undefined && value !== null)
                .join(" ")
                .toLowerCase();


            if (
                search &&
                !searchable.includes(search)
            ) {
                return false;
            }


            /*
             * Receipt date filter.
             */
            const receiptDate =
                String(
                    record.receiptDate ||
                    record.dateOfReceipt ||
                    ""
                ).slice(0, 10);


            if (
                from &&
                receiptDate &&
                receiptDate < from
            ) {
                return false;
            }


            if (
                to &&
                receiptDate &&
                receiptDate > to
            ) {
                return false;
            }


            return true;
        });
    }


    /* ============================================================
       BALANCE
    ============================================================ */

    function calculateBalance(record) {

        const chargeable = Math.max(
            0,
            number(record.chargeableAmount)
        );

        const received = Math.max(
            0,
            number(record.amount)
        );

        const advance = Math.max(
            0,
            number(record.advanceAmount)
        );

        const balance =
            chargeable -
            received -
            advance;

        return Math.max(0, balance);
    }


    function balanceHTML(balance) {

        if (balance <= 0) {

            return `
                <span class="balance-paid">
                    NIL
                </span>
            `;
        }

        return `
            <span class="balance-due">
                ${esc(money(balance))}
            </span>
        `;
    }


    /* ============================================================
       MODE OPTIONS
    ============================================================ */

    function modeSelect(
        field,
        selected
    ) {

        const value = String(
            selected || ""
        ).toLowerCase();

        return `
            <select
                class="billing-select"
                data-field="${field}"
            >

                <option value="">
                    Select
                </option>

                <option
                    value="online"
                    ${value === "online" ? "selected" : ""}
                >
                    Online
                </option>

                <option
                    value="cash"
                    ${value === "cash" ? "selected" : ""}
                >
                    Cash
                </option>

            </select>
        `;
    }


    /* ============================================================
       RENDER TABLE
    ============================================================ */

    function render() {

        const tbody = $("billingTableBody");

        const visible = filteredRecords();


        /*
         * Counter.
         */
        setText(
            "visibleCount",
            visible.length
        );


        setText(
            "registerState",
            visible.length
                ? `${visible.length} record(s)`
                : "No records"
        );


        if (!tbody) {

            console.warn(
                "Billing: #billingTableBody does not exist."
            );

            return;
        }


        /*
         * Empty state.
         */
        if (!visible.length) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="11"
                        class="empty"
                    >
                        No completed and billable
                        billing records found.
                    </td>
                </tr>
            `;

            return;
        }


        /*
         * Render every row.
         *
         * IMPORTANT:
         *
         * The order here EXACTLY matches billing.html:
         *
         * 1 Serial Number
         * 2 Name
         * 3 Name of Task
         * 4 Chargeable Amount
         * 5 Date of Receipt
         * 6 Amount
         * 7 Mode
         * 8 Date of Advance Payment
         * 9 Advance Paid Amount
         * 10 Advance Payment Mode
         * 11 Balance
         */
        tbody.innerHTML = visible.map((record, index) => {

            const chargeableAmount =
                number(
                    record.chargeableAmount
                );


            const amount =
                number(
                    record.amount
                );


            const advanceAmount =
                number(
                    record.advanceAmount
                );


            const balance =
                calculateBalance(record);


            const clientName =
                record.clientName ||
                record.name ||
                "—";


            const taskName =
                record.taskName ||
                record.task ||
                record.nameOfTask ||
                "—";


            const pan =
                record.pan ||
                "";


            const receiptDate =
                inputDate(
                    record.receiptDate ||
                    record.dateOfReceipt
                );


            const advanceDate =
                inputDate(
                    record.advancePaymentDate ||
                    record.dateOfAdvancePayment
                );


            const paymentMode =
                record.paymentMode ||
                record.mode ||
                "";


            const advancePaymentMode =
                record.advancePaymentMode ||
                record.advanceMode ||
                "";


            /*
             * ID used when saving.
             */
            const rowId =
                record.id ??
                record.billingId ??
                record.taskId ??
                record.task_id ??
                "";


            return `
                <tr
                    data-id="${esc(rowId)}"
                    data-task-id="${esc(
                        record.taskId ??
                        record.task_id ??
                        ""
                    )}"
                >

                    <!-- 1. SERIAL NUMBER -->
                    <td>
                        <strong>
                            ${esc(
                                record.serialNumber ||
                                String(index + 1).padStart(4, "0")
                            )}
                        </strong>
                    </td>


                    <!-- 2. NAME -->
                    <td>
                        <span class="client-name">
                            ${esc(clientName)}
                        </span>

                        ${
                            pan
                                ? `
                                    <small class="pan">
                                        PAN: ${esc(pan)}
                                    </small>
                                  `
                                : ""
                        }
                    </td>


                    <!-- 3. NAME OF TASK -->
                    <td>
                        <span class="task-name">
                            ${esc(taskName)}
                        </span>
                    </td>


                    <!-- 4. CHARGEABLE AMOUNT -->
                    <td>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            class="billing-input money-input"
                            data-field="chargeableAmount"
                            value="${esc(chargeableAmount)}"
                        >
                    </td>


                    <!-- 5. DATE OF RECEIPT -->
                    <td>
                        <input
                            type="date"
                            class="billing-input"
                            data-field="receiptDate"
                            value="${esc(receiptDate)}"
                        >
                    </td>


                    <!-- 6. AMOUNT -->
                    <td>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            class="billing-input money-input"
                            data-field="amount"
                            value="${esc(amount)}"
                        >
                    </td>


                    <!-- 7. MODE -->
                    <td>
                        ${modeSelect(
                            "paymentMode",
                            paymentMode
                        )}
                    </td>


                    <!-- 8. DATE OF ADVANCE PAYMENT -->
                    <td>
                        <input
                            type="date"
                            class="billing-input"
                            data-field="advancePaymentDate"
                            value="${esc(advanceDate)}"
                        >
                    </td>


                    <!-- 9. ADVANCE PAID AMOUNT -->
                    <td>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            class="billing-input money-input"
                            data-field="advanceAmount"
                            value="${esc(advanceAmount)}"
                        >
                    </td>


                    <!-- 10. ADVANCE PAYMENT MODE -->
                    <td>
                        ${modeSelect(
                            "advancePaymentMode",
                            advancePaymentMode
                        )}
                    </td>


                    <!-- 11. BALANCE -->
                    <td
                        class="
                            balance-cell
                            ${balance > 0
                                ? "balance-due"
                                : "balance-paid"
                            }
                        "
                        data-balance
                    >
                        ${balanceHTML(balance)}
                    </td>

                </tr>
            `;

        }).join("");


        /*
         * Attach events after rendering.
         */
        attachTableEvents();
    }


    /* ============================================================
       LIVE BALANCE
    ============================================================ */

    function updateRowBalance(row) {

        if (!row) {
            return;
        }


        const chargeableInput =
            row.querySelector(
                '[data-field="chargeableAmount"]'
            );


        const amountInput =
            row.querySelector(
                '[data-field="amount"]'
            );


        const advanceInput =
            row.querySelector(
                '[data-field="advanceAmount"]'
            );


        const balanceCell =
            row.querySelector(
                "[data-balance]"
            );


        if (
            !chargeableInput ||
            !amountInput ||
            !advanceInput ||
            !balanceCell
        ) {
            return;
        }


        const chargeable =
            Math.max(
                0,
                number(chargeableInput.value)
            );


        const amount =
            Math.max(
                0,
                number(amountInput.value)
            );


        const advance =
            Math.max(
                0,
                number(advanceInput.value)
            );


        const balance =
            Math.max(
                0,
                chargeable -
                amount -
                advance
            );


        balanceCell.classList.remove(
            "balance-due",
            "balance-paid"
        );


        if (balance === 0) {

            balanceCell.classList.add(
                "balance-paid"
            );

            balanceCell.innerHTML = `
                <span class="balance-paid">
                    NIL
                </span>
            `;

        } else {

            balanceCell.classList.add(
                "balance-due"
            );

            balanceCell.innerHTML = `
                <span class="balance-due">
                    ${esc(money(balance))}
                </span>
            `;
        }
    }


    /* ============================================================
       READ ROW
    ============================================================ */

    function readRow(row) {

        const get =
            field =>
                row.querySelector(
                    `[data-field="${field}"]`
                );


        return {

            chargeableAmount:
                Math.max(
                    0,
                    number(
                        get("chargeableAmount")?.value
                    )
                ),

            receiptDate:
                get("receiptDate")?.value || null,

            amount:
                Math.max(
                    0,
                    number(
                        get("amount")?.value
                    )
                ),

            paymentMode:
                get("paymentMode")?.value || null,

            advancePaymentDate:
                get("advancePaymentDate")?.value || null,

            advanceAmount:
                Math.max(
                    0,
                    number(
                        get("advanceAmount")?.value
                    )
                ),

            advancePaymentMode:
                get("advancePaymentMode")?.value || null
        };
    }


    /* ============================================================
       VALIDATE ROW
    ============================================================ */

    function validateRow(data) {

        if (data.chargeableAmount < 0) {

            return {
                valid: false,
                message:
                    "Chargeable amount cannot be negative."
            };
        }


        if (data.amount < 0) {

            return {
                valid: false,
                message:
                    "Amount cannot be negative."
            };
        }


        if (data.advanceAmount < 0) {

            return {
                valid: false,
                message:
                    "Advance amount cannot be negative."
            };
        }


        /*
         * Do not allow payments above the chargeable amount.
         */
        if (
            data.amount +
            data.advanceAmount >
            data.chargeableAmount
        ) {

            return {
                valid: false,
                message:
                    "Amount received plus advance paid amount cannot exceed the chargeable amount."
            };
        }


        return {
            valid: true,
            message: ""
        };
    }


    /* ============================================================
       SAVE ROW
    ============================================================ */

    async function saveRow(row) {

        if (!row) {
            return;
        }


        const id =
            row.dataset.taskId ||
            row.dataset.id;


        if (!id) {

            console.warn(
                "Billing: row does not have an ID.",
                row
            );

            showError(
                "This billing record has no ID and cannot be saved."
            );

            return;
        }


        const data =
            readRow(row);


        const validation =
            validateRow(data);


        if (!validation.valid) {

            showError(
                validation.message
            );

            return;
        }


        const payload = {

            chargeableAmount:
                data.chargeableAmount,

            receiptDate:
                data.receiptDate,

            amount:
                data.amount,

            paymentMode:
                data.paymentMode,

            advancePaymentDate:
                data.advancePaymentDate,

            advanceAmount:
                data.advanceAmount,

            advancePaymentMode:
                data.advancePaymentMode
        };


        /*
         * Save indicator.
         *
         * Since there is no separate Action column,
         * the row gets a small temporary visual state.
         */
        row.classList.add("saving");


        try {

            const response =
                await fetch(
                    `${API}/${encodeURIComponent(id)}`,
                    {
                        method: "PUT",

                        credentials:
                            "same-origin",

                        headers: {
                            "Accept":
                                "application/json",

                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(payload)
                    }
                );


            let result = {};

            try {
                result =
                    await response.json();
            } catch (_) {}


            if (!response.ok) {

                throw new Error(
                    result.message ||
                    `Billing update failed with HTTP ${response.status}.`
                );
            }


            /*
             * Update local record.
             */
            const localRecord =
                records.find(record => {

                    const recordId =
                        String(
                            record.id ??
                            record.billingId ??
                            record.taskId ??
                            record.task_id ??
                            ""
                        );

                    return recordId === String(id);
                });


            if (localRecord) {

                Object.assign(
                    localRecord,
                    payload
                );


                localRecord.balance =
                    Math.max(
                        0,
                        data.chargeableAmount -
                        data.amount -
                        data.advanceAmount
                    );
            }


            row.classList.remove("saving");
            row.classList.add("saved");


            setTimeout(() => {

                row.classList.remove("saved");

            }, 1200);


            updateRowBalance(row);


            showSuccess(
                "Billing record saved."
            );


        } catch (error) {

            row.classList.remove(
                "saving"
            );


            console.error(
                "Billing save error:",
                error
            );


            showError(
                error.message
            );
        }
    }


    /* ============================================================
       AUTO SAVE
    ============================================================ */

    function scheduleSave(row) {

        if (!row) {
            return;
        }


        const id =
            row.dataset.id ||
            row.dataset.taskId ||
            Math.random();


        /*
         * Cancel previous timer for same row.
         */
        if (savingTimers.has(id)) {

            clearTimeout(
                savingTimers.get(id)
            );
        }


        /*
         * Small delay prevents multiple API
         * requests while the user is typing.
         */
        const timer =
            setTimeout(
                () => {

                    saveRow(row);

                    savingTimers.delete(id);

                },
                650
            );


        savingTimers.set(
            id,
            timer
        );
    }


    /* ============================================================
       TABLE EVENTS
    ============================================================ */

    function attachTableEvents() {

        const tbody =
            $("billingTableBody");


        if (!tbody) {
            return;
        }


        const controls =
            tbody.querySelectorAll(
                "[data-field]"
            );


        controls.forEach(control => {

            /*
             * Live balance while typing.
             */
            control.addEventListener(
                "input",
                event => {

                    const row =
                        event.target.closest("tr");

                    updateRowBalance(row);

                    /*
                     * Don't auto-save every single
                     * keystroke immediately.
                     */
                    scheduleSave(row);
                }
            );


            /*
             * Select/date changes save immediately.
             */
            control.addEventListener(
                "change",
                event => {

                    const row =
                        event.target.closest("tr");

                    updateRowBalance(row);

                    scheduleSave(row);
                }
            );


            /*
             * Save when leaving an input.
             */
            control.addEventListener(
                "blur",
                event => {

                    const row =
                        event.target.closest("tr");

                    updateRowBalance(row);

                    scheduleSave(row);
                }
            );

        });
    }


    /* ============================================================
       LOAD RECORDS
    ============================================================ */

    async function loadRecords() {

        clearMessages();

        setText(
            "registerState",
            "Loading..."
        );


        const tbody =
            $("billingTableBody");


        if (tbody) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="11"
                        class="empty"
                    >
                        Loading billing records...
                    </td>
                </tr>
            `;
        }


        try {

            const response =
                await fetch(
                    API,
                    {
                        method: "GET",

                        credentials:
                            "same-origin",

                        headers: {
                            "Accept":
                                "application/json"
                        }
                    }
                );


            let data = {};


            try {

                data =
                    await response.json();

            } catch (_) {}


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    `Billing API returned HTTP ${response.status}.`
                );
            }


            records =
                Array.isArray(
                    data.records
                )
                    ? data.records
                    : [];


            /*
             * Normalize records.
             */
            records =
                records.map(record => {

                    return {

                        ...record,

                        serialNumber:
                            record.serialNumber ||
                            record.serial ||
                            "",

                        clientName:
                            record.clientName ||
                            record.name ||
                            "",

                        taskName:
                            record.taskName ||
                            record.task ||
                            record.nameOfTask ||
                            "",

                        pan:
                            record.pan ||
                            "",

                        chargeableAmount:
                            number(
                                record.chargeableAmount
                            ),

                        receiptDate:
                            record.receiptDate ||
                            record.dateOfReceipt ||
                            "",

                        amount:
                            number(
                                record.amount
                            ),

                        paymentMode:
                            record.paymentMode ||
                            record.mode ||
                            "",

                        advancePaymentDate:
                            record.advancePaymentDate ||
                            record.dateOfAdvancePayment ||
                            "",

                        advanceAmount:
                            number(
                                record.advanceAmount
                            ),

                        advancePaymentMode:
                            record.advancePaymentMode ||
                            record.advanceMode ||
                            "",

                        balance:
                            Math.max(
                                0,
                                number(
                                    record.chargeableAmount
                                ) -
                                number(
                                    record.amount
                                ) -
                                number(
                                    record.advanceAmount
                                )
                            )
                    };
                });


            render();


        } catch (error) {

            console.error(
                "Billing record load error:",
                error
            );


            setText(
                "registerState",
                "Unable to load records"
            );


            showError(
                error.message
            );


            if (tbody) {

                tbody.innerHTML = `
                    <tr>
                        <td
                            colspan="11"
                            class="empty"
                        >
                            Unable to load billing records.
                        </td>
                    </tr>
                `;
            }
        }
    }


    /* ============================================================
       EXPORT EXCEL
    ============================================================ */

    function exportExcel() {

        const rows =
            filteredRecords();


        if (!rows.length) {

            alert(
                "There are no billing records to export."
            );

            return;
        }


        if (!window.XLSX) {

            alert(
                "Excel export library is not loaded."
            );

            return;
        }


        const data =
            rows.map(record => {

                const balance =
                    calculateBalance(record);


                return {

                    "Serial Number":
                        record.serialNumber || "",

                    "Name":
                        record.clientName || "",

                    "PAN":
                        record.pan || "",

                    "Name of Task":
                        record.taskName || "",

                    "Chargeable Amount":
                        number(
                            record.chargeableAmount
                        ),

                    "Date of Receipt":
                        record.receiptDate || "",

                    "Amount":
                        number(
                            record.amount
                        ),

                    "Mode":
                        record.paymentMode || "",

                    "Date of Advance Payment":
                        record.advancePaymentDate || "",

                    "Advance Paid Amount":
                        number(
                            record.advanceAmount
                        ),

                    "Advance Payment Mode":
                        record.advancePaymentMode || "",

                    "Balance":
                        balance === 0
                            ? "NIL"
                            : balance
                };
            });


        const worksheet =
            XLSX.utils.json_to_sheet(
                data
            );


        /*
         * Excel column widths.
         */
        worksheet["!cols"] = [
            { wch: 15 },
            { wch: 25 },
            { wch: 30 },
            { wch: 18 },
            { wch: 16 },
            { wch: 15 },
            { wch: 15 },
            { wch: 12 },
            { wch: 23 },
            { wch: 20 },
            { wch: 23 },
            { wch: 15 }
        ];


        const workbook =
            XLSX.utils.book_new();


        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Billing Records"
        );


        XLSX.writeFile(
            workbook,
            "billing-records.xlsx"
        );
    }


    /* ============================================================
       EXPORT PDF
    ============================================================ */

    function exportPdf() {

        const rows =
            filteredRecords();


        if (!rows.length) {

            alert(
                "There are no billing records to export."
            );

            return;
        }


        const JsPDF =
            window.jspdf?.jsPDF;


        if (!JsPDF) {

            alert(
                "PDF export library is not loaded."
            );

            return;
        }


        const pdf =
            new JsPDF(
                "landscape",
                "mm",
                "a4"
            );


        pdf.setFontSize(16);

        pdf.text(
            "Billing Records",
            12,
            13
        );


        pdf.setFontSize(8);

        pdf.text(
            "Completed + Billable",
            12,
            18
        );


        pdf.autoTable({

            startY: 23,

            head: [[

                "Serial",

                "Name",

                "Task",

                "Chargeable",

                "Receipt",

                "Amount",

                "Mode",

                "Advance Date",

                "Advance",

                "Advance Mode",

                "Balance"
            ]],


            body:
                rows.map(record => {

                    const balance =
                        calculateBalance(
                            record
                        );


                    return [

                        record.serialNumber ||
                            "—",

                        record.clientName ||
                            "—",

                        record.taskName ||
                            "—",

                        money(
                            record.chargeableAmount
                        ),

                        formatDate(
                            record.receiptDate
                        ),

                        money(
                            record.amount
                        ),

                        record.paymentMode ||
                            "—",

                        formatDate(
                            record.advancePaymentDate
                        ),

                        money(
                            record.advanceAmount
                        ),

                        record.advancePaymentMode ||
                            "—",

                        balance === 0
                            ? "NIL"
                            : money(balance)
                    ];
                }),


            styles: {
                fontSize: 7,
                cellPadding: 2
            },


            headStyles: {
                fontSize: 7,
                fontStyle: "bold"
            },


            columnStyles: {

                0: {
                    cellWidth: 18
                },

                1: {
                    cellWidth: 30
                },

                2: {
                    cellWidth: 35
                },

                3: {
                    cellWidth: 24
                },

                4: {
                    cellWidth: 22
                },

                5: {
                    cellWidth: 22
                },

                6: {
                    cellWidth: 18
                },

                7: {
                    cellWidth: 28
                },

                8: {
                    cellWidth: 24
                },

                9: {
                    cellWidth: 28
                },

                10: {
                    cellWidth: 24
                }
            }
        });


        pdf.save(
            "billing-records.pdf"
        );
    }


    /* ============================================================
       RESET FILTERS
    ============================================================ */

    function resetFilters() {

        const search =
            $("billingSearch");

        const from =
            $("billingDateFrom");

        const to =
            $("billingDateTo");


        if (search) {
            search.value = "";
        }


        if (from) {
            from.value = "";
        }


        if (to) {
            to.value = "";
        }


        clearMessages();

        render();
    }


    /* ============================================================
       REFRESH
    ============================================================ */

    async function refreshRecords() {

        const button =
            $("refreshBilling");


        if (button) {

            button.disabled = true;
            button.textContent = "Refreshing...";
        }


        try {

            await loadRecords();

        } finally {

            if (button) {

                button.disabled = false;
                button.textContent = "↻ Refresh";
            }
        }
    }


    /* ============================================================
       INIT
    ============================================================ */

    function init() {

        const search =
            $("billingSearch");

        const from =
            $("billingDateFrom");

        const to =
            $("billingDateTo");

        const reset =
            $("resetBillingFilters");

        const excel =
            $("exportBillingExcel");

        const pdf =
            $("exportBillingPdf");

        const refresh =
            $("refreshBilling");


        /*
         * Search.
         */
        search?.addEventListener(
            "input",
            render
        );


        /*
         * Date filters.
         */
        from?.addEventListener(
            "change",
            render
        );

        to?.addEventListener(
            "change",
            render
        );


        /*
         * Reset.
         */
        reset?.addEventListener(
            "click",
            resetFilters
        );


        /*
         * Exports.
         */
        excel?.addEventListener(
            "click",
            exportExcel
        );

        pdf?.addEventListener(
            "click",
            exportPdf
        );


        /*
         * Refresh.
         */
        refresh?.addEventListener(
            "click",
            refreshRecords
        );


        /*
         * Initial load.
         */
        loadRecords();
    }


    /* ============================================================
       START
    ============================================================ */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );

    } else {

        init();
    }

})();