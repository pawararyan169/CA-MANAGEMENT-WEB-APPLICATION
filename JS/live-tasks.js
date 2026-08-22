(() => {
    'use strict';

    const tableBody = document.getElementById('liveTasksTableBody');
    const emptyBox = document.getElementById('liveTasksEmpty');
    const countBox = document.getElementById('liveTasksCount');

    if (!tableBody) return;

    function esc(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function days(assignedDate, completionDate) {
        if (!assignedDate) return 0;

        const start = new Date(`${assignedDate}T00:00:00`);
        const end = completionDate
            ? new Date(`${completionDate}T00:00:00`)
            : new Date();

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return 0;
        }

        return Math.max(
            0,
            Math.floor((end.getTime() - start.getTime()) / 86400000)
        );
    }

    function date(value) {
        if (!value) return '—';
        const d = new Date(`${value}T00:00:00`);
        return Number.isNaN(d.getTime())
            ? value
            : d.toLocaleDateString('en-IN');
    }

    async function loadLiveTasks() {
        try {
            const response = await fetch('/api/tasks', {
                credentials: 'same-origin',
                cache: 'no-store',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Unable to load tasks.');
            }

            const tasks = Array.isArray(result.tasks)
                ? result.tasks
                : [];

            /*
             * Live register = tasks that are still open.
             * Completed tasks are not part of the live queue.
             */
            const live = tasks.filter(task =>
                task.status === 'wip'
            );

            if (countBox) {
                countBox.textContent = live.length;
            }

            if (!live.length) {
                tableBody.innerHTML = '';
                if (emptyBox) {
                    emptyBox.style.display = 'block';
                    emptyBox.textContent = 'No live tasks at the moment.';
                }
                return;
            }

            if (emptyBox) {
                emptyBox.style.display = 'none';
            }

            tableBody.innerHTML = live.map(task => {
                const isMisc = task.workType === 'miscellaneous';
                const status = task.status === 'wip'
                    ? 'W.I.P'
                    : 'Incomplete';

                return `
                    <tr>
                        <td>
                            <strong>${esc(task.taskName)}</strong>
                        </td>
                        <td>${isMisc ? 'Miscellaneous' : 'Office Work'}</td>
                        <td>${esc(task.clientName || '—')}</td>
                        <td>${esc(task.assignedEmployeeName || '—')}</td>
                        <td>${esc(date(task.assignedDate))}</td>
                        <td>
                            <strong>${esc(days(task.assignedDate, task.completionDate))}</strong>
                            <span class="live-task-days">days</span>
                        </td>
                        <td>
                            <span class="live-task-status live-task-${esc(task.status)}">
                                ${esc(status)}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');

        } catch (error) {
            console.error('Live task register error:', error);

            tableBody.innerHTML = '';

            if (emptyBox) {
                emptyBox.style.display = 'block';
                emptyBox.textContent =
                    error.message || 'Unable to load live tasks.';
            }
        }
    }

    loadLiveTasks();
    setInterval(loadLiveTasks, 60000);

})();
