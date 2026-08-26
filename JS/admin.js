document.addEventListener('DOMContentLoaded', () => {
    async function loadDashboardStats() {
        try {
            const response = await fetch('/api/dashboard/stats', {
                credentials: 'include',
                cache: 'no-store'
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || `Unable to load dashboard statistics. HTTP ${response.status}`);
            }

            const c = result.counts || {};
            const set = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = Number(value || 0);
            };

            set('employeeCount', c.employees);
            set('clientCount', c.clients);
            set('taskCount', c.tasks);
            set('dashboardCinCount', c.cin);
            set('dashboardFssaiCount', c.fssai);
            set('dashboardGstCount', c.gst);
            set('dashboardUdyamCount', c.udyam);
            set('dashboardPtecCount', c.ptec);
            set('dashboardPtrcCount', c.ptrc);
            set('dashboardTanCount', c.tan);
        } catch (error) {
            console.error('Admin live dashboard count error:', error);
        }
    }

    const storedUser = localStorage.getItem('caOfficeUser');
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            const displayName = user.name || user.fullName || [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ') || 'Administrator';
            const name = document.getElementById('adminName');
            const role = document.getElementById('adminRole');
            const avatar = document.getElementById('adminAvatar');
            if (name) name.textContent = displayName;
            if (role) role.textContent = 'Administrator';
            if (avatar) avatar.textContent = displayName.charAt(0).toUpperCase();
        } catch (error) {
            console.error('Admin profile error:', error);
        }
    }

    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('caOfficeLoggedIn');
            localStorage.removeItem('caOfficeUser');
            window.location.href = '/login.html';
        });
    }

    loadDashboardStats();
    setInterval(loadDashboardStats, 10000);
});
