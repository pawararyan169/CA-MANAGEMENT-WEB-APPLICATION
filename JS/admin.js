document.addEventListener('DOMContentLoaded', () => {
    const REFRESH_MS = 10000;
    let refreshTimer = null;
    let requestInFlight = false;

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = Number.isFinite(Number(value)) ? value : '0';
    }

    function updateRegistrationCounts(registrations = {}) {
        setText('dashboardPanCount', registrations.pan || 0);
        setText('dashboardCinCount', registrations.cin || 0);
        setText('dashboardFssaiCount', registrations.fssai || 0);
        setText('dashboardGstCount', registrations.gst || 0);
        setText('dashboardUdyamCount', registrations.udyam || 0);
        setText('dashboardPtecCount', registrations.ptec || 0);
        setText('dashboardPtrcCount', registrations.ptrc || 0);
        setText('dashboardTanCount', registrations.tan || 0);
    }

    async function loadDashboardStats() {
        if (requestInFlight) return;
        requestInFlight = true;

        try {
            const response = await fetch('/api/dashboard/stats', {
                method: 'GET',
                credentials: 'include',
                headers: { Accept: 'application/json' },
                cache: 'no-store'
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || `Unable to load dashboard statistics (${response.status}).`);
            }

            const stats = result.stats || {};

            setText('employeeCount', stats.activeEmployees || 0);
            setText('clientCount', stats.activeClients || 0);
            setText('taskCount', stats.pendingTasks || 0);
            updateRegistrationCounts(stats.registrations);
        } catch (error) {
            console.error('Admin live dashboard count error:', error);
        } finally {
            requestInFlight = false;
        }
    }

    function loadAdminProfile() {
        const storedUser = localStorage.getItem('caOfficeUser');
        if (!storedUser) return;

        try {
            const user = JSON.parse(storedUser);
            const displayName = user.name || user.fullName || [
                user.firstName, user.middleName, user.lastName
            ].filter(Boolean).join(' ') || 'Administrator';

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
        logoutButton.addEventListener('click', async () => {
            try {
                await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
            } catch (_) {}

            localStorage.removeItem('caOfficeLoggedIn');
            localStorage.removeItem('caOfficeUser');
            window.location.href = '/login.html';
        });
    }

    loadAdminProfile();
    loadDashboardStats();
    refreshTimer = window.setInterval(loadDashboardStats, REFRESH_MS);

    window.addEventListener('beforeunload', () => {
        if (refreshTimer) window.clearInterval(refreshTimer);
    });
});
