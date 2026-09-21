(() => {
    'use strict';

    const STORAGE_KEY = 'ca_office_calendar_todos_v1';

    const state = {
        todos: loadTodos(),
        month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        selectedDate: dateKey(new Date()),
        filter: 'all'
    };

    const $ = id => document.getElementById(id);

    function dateKey(date) {
        const d = new Date(date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function loadTodos() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            const parsed = saved ? JSON.parse(saved) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function saveTodos() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.todos));
    }

    function formatDate(dateString) {
        const d = new Date(`${dateString}T00:00:00`);
        return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    function renderCalendar() {
        const grid = $('calendarGrid');
        const title = $('calendarTitle');

        const year = state.month.getFullYear();
        const month = state.month.getMonth();

        title.textContent = state.month.toLocaleDateString('en-IN', {
            month: 'long',
            year: 'numeric'
        });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const previousDays = new Date(year, month, 0).getDate();

        let html = '';

        for (let i = firstDay - 1; i >= 0; i--) {
            const day = previousDays - i;
            const date = dateKey(new Date(year, month - 1, day));
            html += renderDay(date, day, true);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = dateKey(new Date(year, month, day));
            html += renderDay(date, day, false);
        }

        const totalCells = firstDay + daysInMonth;
        const trailing = (7 - (totalCells % 7)) % 7;

        for (let day = 1; day <= trailing; day++) {
            const date = dateKey(new Date(year, month + 1, day));
            html += renderDay(date, day, true);
        }

        grid.innerHTML = html;

        grid.querySelectorAll('.calendar-day').forEach(day => {
            day.addEventListener('click', () => {
                state.selectedDate = day.dataset.date;
                const selected = new Date(`${state.selectedDate}T00:00:00`);

                state.month = new Date(
                    selected.getFullYear(),
                    selected.getMonth(),
                    1
                );

                $('todoDate').value = state.selectedDate;
                renderCalendar();
                renderTodoList();
            });
        });
    }

    function renderDay(date, day, otherMonth) {
        const todos = state.todos.filter(todo => todo.date === date);
        const today = date === dateKey(new Date());
        const selected = date === state.selectedDate;

        const todoHtml = todos
            .slice(0, 3)
            .map(todo => `
                <div class="day-todo ${todo.completed ? 'completed' : ''}">
                    ${escapeHtml(todo.text)}
                </div>
            `)
            .join('');

        const more = todos.length > 3
            ? `<div class="day-todo">+${todos.length - 3} more</div>`
            : '';

        return `
            <div
                class="calendar-day
                    ${otherMonth ? 'other-month' : ''}
                    ${today ? 'today' : ''}
                    ${selected ? 'selected' : ''}"
                data-date="${date}"
            >
                <span class="day-number">${day}</span>
                <div class="day-todos">
                    ${todoHtml}
                    ${more}
                </div>
            </div>
        `;
    }

    function renderTodoList() {
        const list = $('todoList');
        const selectedDate = state.selectedDate;

        $('selectedDateLabel').textContent =
            `Tasks for ${formatDate(selectedDate)}`;

        let todos = state.todos.filter(todo => todo.date === selectedDate);

        if (state.filter === 'open') {
            todos = todos.filter(todo => !todo.completed);
        }

        if (state.filter === 'completed') {
            todos = todos.filter(todo => todo.completed);
        }

        todos.sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }

            const priority = {
                high: 1,
                medium: 2,
                low: 3
            };

            return priority[a.priority] - priority[b.priority];
        });

        if (!todos.length) {
            list.innerHTML = `
                <div class="todo-empty">
                    No to-do items for this date.
                </div>
            `;
            return;
        }

        list.innerHTML = todos.map(todo => `
            <div class="todo-item ${todo.completed ? 'completed' : ''}">

                <input
                    class="todo-check"
                    type="checkbox"
                    data-id="${escapeHtml(todo.id)}"
                    ${todo.completed ? 'checked' : ''}
                    aria-label="Complete ${escapeHtml(todo.text)}"
                >

                <div class="todo-content">

                    <span class="todo-text">
                        ${escapeHtml(todo.text)}
                    </span>

                    <div class="todo-meta">
                        <span class="todo-badge ${escapeHtml(todo.priority)}">
                            ${escapeHtml(todo.priority.toUpperCase())}
                        </span>

                        <span class="todo-badge">
                            ${escapeHtml(formatDate(todo.date))}
                        </span>
                    </div>

                </div>

                <button
                    type="button"
                    class="todo-delete"
                    data-delete-id="${escapeHtml(todo.id)}"
                    title="Delete"
                >
                    ×
                </button>

            </div>
        `).join('');

        list.querySelectorAll('.todo-check').forEach(input => {
            input.addEventListener('change', () => {
                const todo = state.todos.find(
                    item => String(item.id) === String(input.dataset.id)
                );

                if (!todo) return;

                todo.completed = input.checked;
                saveTodos();
                renderCalendar();
                renderTodoList();
            });
        });

        list.querySelectorAll('.todo-delete').forEach(button => {
            button.addEventListener('click', () => {
                state.todos = state.todos.filter(
                    todo => String(todo.id) !== String(button.dataset.deleteId)
                );

                saveTodos();
                renderCalendar();
                renderTodoList();
            });
        });
    }

    function addTodo(event) {
        event.preventDefault();

        const text = $('todoText').value.trim();
        const date = $('todoDate').value;
        const priority = $('todoPriority').value;

        if (!text || !date) return;

        state.todos.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            text,
            date,
            priority,
            completed: false,
            createdAt: new Date().toISOString()
        });

        state.selectedDate = date;

        const selected = new Date(`${date}T00:00:00`);
        state.month = new Date(
            selected.getFullYear(),
            selected.getMonth(),
            1
        );

        saveTodos();

        $('todoText').value = '';

        renderCalendar();
        renderTodoList();
    }

    function init() {
        $('todoDate').value = state.selectedDate;

        $('todoForm').addEventListener('submit', addTodo);

        $('previousMonth').addEventListener('click', () => {
            state.month = new Date(
                state.month.getFullYear(),
                state.month.getMonth() - 1,
                1
            );
            renderCalendar();
        });

        $('nextMonth').addEventListener('click', () => {
            state.month = new Date(
                state.month.getFullYear(),
                state.month.getMonth() + 1,
                1
            );
            renderCalendar();
        });

        $('todayButton').addEventListener('click', () => {
            const today = new Date();

            state.month = new Date(
                today.getFullYear(),
                today.getMonth(),
                1
            );

            state.selectedDate = dateKey(today);
            $('todoDate').value = state.selectedDate;

            renderCalendar();
            renderTodoList();
        });

        document.querySelectorAll('.todo-filter').forEach(button => {
            button.addEventListener('click', () => {
                state.filter = button.dataset.filter;
                renderTodoList();
            });
        });

        renderCalendar();
        renderTodoList();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
