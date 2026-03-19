import { API_BASE_URL } from '../../config.js';

export default class Home {
    constructor() {
        this.homeContainer = document.getElementById('homeContainer');
        this.homeView = document.getElementById('homeView');
        
        // Profile elements
        this.profileAvatar = document.getElementById('profileAvatar');
        this.avatarInitials = document.getElementById('avatarInitials');
        this.profileName = document.getElementById('profileName');
        this.profileRole = document.getElementById('profileRole');
        this.profileEmail = document.getElementById('profileEmail');
        this.profileFirstName = document.getElementById('profileFirstName');
        this.profileLastName = document.getElementById('profileLastName');
        this.profileUsername = document.getElementById('profileUsername');
        this.profileEmailInput = document.getElementById('profileEmailInput');
        this.changeAvatarBtn = document.getElementById('changeAvatarBtn');
        this.avatarFileInput = document.getElementById('avatarFileInput');
        this.saveProfileBtn = document.getElementById('saveProfileBtn');
        this.cancelProfileBtn = document.getElementById('cancelProfileBtn');
        
        // Leaderboard elements
        this.techLeaderboardGraph = document.getElementById('techLeaderboardGraph');
        this.techLeaderboardTable = document.getElementById('techLeaderboardTable');
        this.leadLeaderboardGraph = document.getElementById('leadLeaderboardGraph');
        this.leadLeaderboardTable = document.getElementById('leadLeaderboardTable');
        
        // Store original profile data for cancel functionality
        this.originalProfileData = null;
        
        // Store leaderboard data for view switching
        this.techLeaderboardData = [];
        this.leadLeaderboardData = [];
        
        // Loading state
        this.isLoadingLeaderboards = false;
        
        // Current time period filter
        this.currentPeriod = 'week';
        this.periodDisplay = document.getElementById('periodDisplay');
        
        // Month/Semester selectors
        this.monthSelector = document.getElementById('monthSelector');
        this.monthSelect = document.getElementById('monthSelect');
        this.monthYearSelect = document.getElementById('monthYearSelect');
        this.semesterSelector = document.getElementById('semesterSelector');
        this.semesterSelect = document.getElementById('semesterSelect');
        this.semesterYearSelect = document.getElementById('semesterYearSelect');
        
        // Selected values
        this.selectedMonth = new Date().getMonth();
        this.selectedMonthYear = new Date().getFullYear();
        this.selectedSemester = this.getCurrentSemesterName();
        this.selectedSemesterYear = new Date().getFullYear();
        
        this.initialize();
    }
    
    getCurrentSemesterName() {
        const month = new Date().getMonth();
        if (month === 0) return 'winter';
        if (month >= 1 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        return 'fall';
    }

    initialize() {
        this.setupEventListeners();
        this.loadUserProfile();
        this.loadLeaderboards();
    }

    setupEventListeners() {
        // Avatar change
        if (this.changeAvatarBtn && this.avatarFileInput) {
            this.changeAvatarBtn.addEventListener('click', () => {
                this.avatarFileInput.click();
            });
            
            this.avatarFileInput.addEventListener('change', (e) => {
                this.handleAvatarChange(e);
            });
        }
        
        // Profile form buttons
        if (this.saveProfileBtn) {
            this.saveProfileBtn.addEventListener('click', () => {
                this.saveProfile();
            });
        }
        
        if (this.cancelProfileBtn) {
            this.cancelProfileBtn.addEventListener('click', () => {
                this.cancelProfileEdit();
            });
        }
        
        // Leaderboard view toggle
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = btn.dataset.view;
                const target = btn.dataset.target;
                this.toggleLeaderboardView(target, view);
                
                // Update active button state
                btn.closest('.view-toggle').querySelectorAll('.view-toggle-btn').forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
            });
        });
        
        // Time period filter
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const period = btn.dataset.period;
                this.currentPeriod = period;
                
                // Update active button state
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Show/hide selectors
                this.updateSelectorVisibility();
                
                // Update display and re-fetch from server
                this.updatePeriodDisplay();
                this.loadLeaderboards();
            });
        });
        
        // Month selector change handlers
        if (this.monthSelect) {
            this.monthSelect.addEventListener('change', () => {
                this.selectedMonth = parseInt(this.monthSelect.value);
                this.updatePeriodDisplay();
                this.loadLeaderboards();
            });
        }
        
        if (this.monthYearSelect) {
            this.monthYearSelect.addEventListener('change', () => {
                this.selectedMonthYear = parseInt(this.monthYearSelect.value);
                this.updatePeriodDisplay();
                this.loadLeaderboards();
            });
        }
        
        // Semester selector change handlers
        if (this.semesterSelect) {
            this.semesterSelect.addEventListener('change', () => {
                this.selectedSemester = this.semesterSelect.value;
                this.updatePeriodDisplay();
                this.loadLeaderboards();
            });
        }
        
        if (this.semesterYearSelect) {
            this.semesterYearSelect.addEventListener('change', () => {
                this.selectedSemesterYear = parseInt(this.semesterYearSelect.value);
                this.updatePeriodDisplay();
                this.loadLeaderboards();
            });
        }
        
        // Initialize year dropdowns
        this.initializeYearSelectors();
    }
    
    initializeYearSelectors() {
        const currentYear = new Date().getFullYear();
        const years = [];
        
        // Generate years from 2020 to current year + 1
        for (let y = currentYear + 1; y >= 2020; y--) {
            years.push(y);
        }
        
        // Populate month year selector
        if (this.monthYearSelect) {
            this.monthYearSelect.innerHTML = years.map(y => 
                `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`
            ).join('');
        }
        
        // Populate semester year selector
        if (this.semesterYearSelect) {
            this.semesterYearSelect.innerHTML = years.map(y => 
                `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`
            ).join('');
        }
        
        // Set current month as selected
        if (this.monthSelect) {
            this.monthSelect.value = new Date().getMonth().toString();
        }
        
        // Set current semester as selected
        if (this.semesterSelect) {
            this.semesterSelect.value = this.getCurrentSemesterName();
        }
    }
    
    updateSelectorVisibility() {
        // Hide all selectors first
        if (this.monthSelector) this.monthSelector.style.display = 'none';
        if (this.semesterSelector) this.semesterSelector.style.display = 'none';
        
        // Show the appropriate selector
        if (this.currentPeriod === 'month' && this.monthSelector) {
            this.monthSelector.style.display = 'flex';
        } else if (this.currentPeriod === 'semester' && this.semesterSelector) {
            this.semesterSelector.style.display = 'flex';
        }
    }
    
    toggleLeaderboardView(target, view) {
        const graphEl = document.getElementById(`${target}LeaderboardGraph`);
        const tableEl = document.getElementById(`${target}LeaderboardTable`);
        
        if (view === 'graph') {
            graphEl.style.display = 'flex';
            tableEl.style.display = 'none';
        } else {
            graphEl.style.display = 'none';
            tableEl.style.display = 'block';
        }
    }
    
    getSemesterInfo(date) {
        const month = date.getMonth(); // 0-indexed (0 = January)
        const year = date.getFullYear();
        
        // January (month 0) = Winter
        if (month === 0) {
            return {
                name: 'Winter',
                year: year,
                start: new Date(year, 0, 1),  // Jan 1
                end: new Date(year, 0, 31, 23, 59, 59)  // Jan 31
            };
        }
        // February-May (months 1-4) = Spring
        else if (month >= 1 && month <= 4) {
            return {
                name: 'Spring',
                year: year,
                start: new Date(year, 1, 1),  // Feb 1
                end: new Date(year, 4, 31, 23, 59, 59)  // May 31
            };
        }
        // June-August (months 5-7) = Summer
        else if (month >= 5 && month <= 7) {
            return {
                name: 'Summer',
                year: year,
                start: new Date(year, 5, 1),  // June 1
                end: new Date(year, 7, 31, 23, 59, 59)  // Aug 31
            };
        }
        // September-December (months 8-11) = Fall
        else {
            return {
                name: 'Fall',
                year: year,
                start: new Date(year, 8, 1),  // Sep 1
                end: new Date(year, 11, 31, 23, 59, 59)  // Dec 31
            };
        }
    }
    
    getDateRange(period) {
        const now = new Date();
        
        if (period === 'week') {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            return { start: startOfWeek, end: now };
        }
        else if (period === 'month') {
            // Use selected month and year
            const year = this.selectedMonthYear;
            const month = this.selectedMonth;
            const startOfMonth = new Date(year, month, 1);
            startOfMonth.setHours(0, 0, 0, 0);
            
            // End of month (last day)
            const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
            
            return { start: startOfMonth, end: endOfMonth };
        }
        else if (period === 'semester') {
            // Use selected semester and year
            const semester = this.getSemesterByName(this.selectedSemester, this.selectedSemesterYear);
            return { start: semester.start, end: semester.end, semester };
        }
        
        return { start: now, end: now };
    }
    
    getSemesterByName(name, year) {
        switch (name) {
            case 'winter':
                return {
                    name: 'Winter',
                    year: year,
                    start: new Date(year, 0, 1),  // Jan 1
                    end: new Date(year, 0, 31, 23, 59, 59)  // Jan 31
                };
            case 'spring':
                return {
                    name: 'Spring',
                    year: year,
                    start: new Date(year, 1, 1),  // Feb 1
                    end: new Date(year, 4, 31, 23, 59, 59)  // May 31
                };
            case 'summer':
                return {
                    name: 'Summer',
                    year: year,
                    start: new Date(year, 5, 1),  // June 1
                    end: new Date(year, 7, 31, 23, 59, 59)  // Aug 31
                };
            case 'fall':
            default:
                return {
                    name: 'Fall',
                    year: year,
                    start: new Date(year, 8, 1),  // Sep 1
                    end: new Date(year, 11, 31, 23, 59, 59)  // Dec 31
                };
        }
    }
    
    updatePeriodDisplay() {
        if (!this.periodDisplay) return;
        
        const range = this.getDateRange(this.currentPeriod);
        const options = { month: 'short', day: 'numeric' };
        
        if (this.currentPeriod === 'week') {
            const startStr = range.start.toLocaleDateString('en-US', options);
            const endStr = new Date().toLocaleDateString('en-US', options);
            this.periodDisplay.textContent = `${startStr} - ${endStr}`;
        }
        else if (this.currentPeriod === 'month') {
            // Use selected month and year
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                               'July', 'August', 'September', 'October', 'November', 'December'];
            this.periodDisplay.textContent = `${monthNames[this.selectedMonth]} ${this.selectedMonthYear}`;
        }
        else if (this.currentPeriod === 'semester') {
            // Use selected semester and year
            const semester = this.getSemesterByName(this.selectedSemester, this.selectedSemesterYear);
            this.periodDisplay.textContent = `${semester.name} ${semester.year}`;
        }
    }

    async loadUserProfile() {
        try {
            const authToken = localStorage.getItem('authToken');
            const userId = localStorage.getItem('userId');
            const username = localStorage.getItem('username');
            const userEmail = localStorage.getItem('userEmail');
            const firstName = localStorage.getItem('firstName');
            const lastName = localStorage.getItem('lastName');
            const userRole = localStorage.getItem('userRole');
            
            // Use locally stored data first
            const fullName = (firstName && lastName) 
                ? `${firstName} ${lastName}` 
                : username || 'User';
            
            this.originalProfileData = {
                firstName: firstName || '',
                lastName: lastName || '',
                username: username || '',
                email: userEmail || ''
            };
            
            // Update UI
            this.updateProfileUI({
                fullName,
                firstName: firstName || '',
                lastName: lastName || '',
                username: username || '',
                email: userEmail || '',
                role: userRole || 'Tech'
            });
            
            // Try to fetch fresh data from the API
            if (authToken && userId) {
                const response = await fetch(`${API_BASE_URL}/api/user/${userId}/`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Token ${authToken}`
                    }
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    const fetchedFullName = (userData.first_name && userData.last_name)
                        ? `${userData.first_name} ${userData.last_name}`
                        : userData.username || 'User';
                    
                    this.originalProfileData = {
                        firstName: userData.first_name || '',
                        lastName: userData.last_name || '',
                        username: userData.username || '',
                        email: userData.email || ''
                    };
                    
                    // Determine role from groups
                    let role = 'Tech';
                    if (userData.groups && userData.groups.length > 0) {
                        const groupNames = userData.groups.map(g => 
                            typeof g === 'object' ? g.name : g
                        );
                        if (groupNames.some(name => name.toLowerCase().includes('lead'))) {
                            role = 'Lead';
                        } else if (groupNames.some(name => name.toLowerCase().includes('admin'))) {
                            role = 'Admin';
                        }
                    }
                    
                    this.updateProfileUI({
                        fullName: fetchedFullName,
                        firstName: userData.first_name || '',
                        lastName: userData.last_name || '',
                        username: userData.username || '',
                        email: userData.email || '',
                        role
                    });
                }
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    updateProfileUI(data) {
        if (this.profileName) this.profileName.textContent = data.fullName;
        if (this.profileEmail) this.profileEmail.textContent = data.email;
        if (this.profileRole) this.profileRole.textContent = data.role;
        if (this.profileFirstName) this.profileFirstName.value = data.firstName;
        if (this.profileLastName) this.profileLastName.value = data.lastName;
        if (this.profileUsername) this.profileUsername.value = data.username;
        if (this.profileEmailInput) this.profileEmailInput.value = data.email;
        
        // Update initials
        if (this.avatarInitials) {
            const initials = this.getInitials(data.firstName, data.lastName, data.username);
            this.avatarInitials.textContent = initials;
        }
    }

    getInitials(firstName, lastName, username) {
        if (firstName && lastName) {
            return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        } else if (firstName) {
            return firstName.charAt(0).toUpperCase();
        } else if (username) {
            return username.substring(0, 2).toUpperCase();
        }
        return 'U';
    }

    handleAvatarChange(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                // Replace initials with image
                if (this.profileAvatar) {
                    this.profileAvatar.innerHTML = `<img src="${e.target.result}" alt="Profile">`;
                }
                // Store for later save (would need to upload to server)
                this.newAvatarData = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    async saveProfile() {
        const newData = {
            first_name: this.profileFirstName?.value || '',
            last_name: this.profileLastName?.value || '',
            email: this.profileEmailInput?.value || ''
        };
        
        // For now, just update the UI and localStorage since there's no update endpoint
        const fullName = (newData.first_name && newData.last_name)
            ? `${newData.first_name} ${newData.last_name}`
            : this.profileUsername?.value || 'User';
        
        // Update localStorage
        localStorage.setItem('firstName', newData.first_name);
        localStorage.setItem('lastName', newData.last_name);
        localStorage.setItem('userEmail', newData.email);
        
        // Update displayed name
        if (this.profileName) this.profileName.textContent = fullName;
        if (this.profileEmail) this.profileEmail.textContent = newData.email;
        
        // Update initials
        if (this.avatarInitials && !this.newAvatarData) {
            const initials = this.getInitials(newData.first_name, newData.last_name, this.profileUsername?.value);
            this.avatarInitials.textContent = initials;
        }
        
        // Update original data
        this.originalProfileData = {
            firstName: newData.first_name,
            lastName: newData.last_name,
            username: this.profileUsername?.value || '',
            email: newData.email
        };
        
        // Show success feedback
        this.showNotification('Profile updated successfully', 'success');
    }

    cancelProfileEdit() {
        // Restore original values
        if (this.originalProfileData) {
            if (this.profileFirstName) this.profileFirstName.value = this.originalProfileData.firstName;
            if (this.profileLastName) this.profileLastName.value = this.originalProfileData.lastName;
            if (this.profileEmailInput) this.profileEmailInput.value = this.originalProfileData.email;
        }
        
        // Reset avatar if changed
        if (this.newAvatarData && this.profileAvatar) {
            const initials = this.getInitials(
                this.originalProfileData?.firstName,
                this.originalProfileData?.lastName,
                this.originalProfileData?.username
            );
            this.profileAvatar.innerHTML = `<span class="avatar-initials" id="avatarInitials">${initials}</span>`;
            this.avatarInitials = document.getElementById('avatarInitials');
            this.newAvatarData = null;
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#43b581' : type === 'error' ? '#f04747' : '#5865f2'};
            color: white;
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    async loadLeaderboards() {
        if (this.isLoadingLeaderboards) return;
        this.isLoadingLeaderboards = true;

        try {
            const authToken = localStorage.getItem('authToken');
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Token ${authToken}`
            };
            
            // Build date range params for the server-side endpoint
            const dateRange = this.getDateRange(this.currentPeriod);
            const formatDate = (d) => d.toISOString().split('T')[0]; // YYYY-MM-DD
            const params = new URLSearchParams({
                start_date: formatDate(dateRange.start),
                end_date: formatDate(dateRange.end),
                limit: '10'
            });
            
            const response = await fetch(
                `${API_BASE_URL}/api/reports/leaderboard/?${params}`,
                { method: 'GET', headers }
            );
            
            if (response.ok) {
                const data = await response.json();
                
                this.techLeaderboardData = data.tech_leaderboard || [];
                this.leadLeaderboardData = data.lead_leaderboard || [];
                
                this.renderLeaderboardGraph(this.techLeaderboardGraph, this.techLeaderboardData, 'tech');
                this.renderLeaderboardTable(this.techLeaderboardTable, this.techLeaderboardData, 'tech');
                this.renderLeaderboardGraph(this.leadLeaderboardGraph, this.leadLeaderboardData, 'lead');
                this.renderLeaderboardTable(this.leadLeaderboardTable, this.leadLeaderboardData, 'lead');
            } else {
                console.log('Could not fetch leaderboard (may require Lead permissions)');
                this.showEmptyLeaderboards('Requires Lead permissions to view');
            }
        } catch (error) {
            console.error('Error loading leaderboards:', error);
            this.showEmptyLeaderboards();
        } finally {
            this.isLoadingLeaderboards = false;
        }
    }

    renderLeaderboardGraph(container, data, type) {
        if (!container) return;
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="leaderboard-empty">
                    <p>No data available for this week</p>
                </div>
            `;
            return;
        }
        
        // Take top 10
        const topUsers = data.slice(0, 10);
        const maxCount = Math.max(...topUsers.map(u => u.count));
        
        if (type === 'lead') {
            // Lead leaderboard with stacked bar showing breakdown
            container.innerHTML = topUsers.map((user, index) => {
                const barWidth = maxCount > 0 ? (user.count / maxCount) * 100 : 0;
                
                // Calculate segment widths as percentage of user's total
                const kudosWidth = user.count > 0 ? (user.kudosCount / user.count) * 100 : 0;
                const checksWidth = user.count > 0 ? (user.checksCount / user.count) * 100 : 0;
                const pingsWidth = user.count > 0 ? (user.pingsCount / user.count) * 100 : 0;
                const doneWidth = user.count > 0 ? (user.doneCount / user.count) * 100 : 0;
                
                return `
                    <div class="graph-bar-row">
                        <span class="graph-rank">${index + 1}</span>
                        <span class="graph-name" title="${user.username}">${user.username}</span>
                        <div class="graph-bar-container">
                            <div class="graph-bar-stacked" style="width: ${Math.max(barWidth, 8)}%">
                                ${user.kudosCount > 0 ? `<div class="bar-segment bar-kudos" style="width: ${kudosWidth}%" title="Kudos: ${user.kudosCount}"></div>` : ''}
                                ${user.checksCount > 0 ? `<div class="bar-segment bar-checks" style="width: ${checksWidth}%" title="Checks: ${user.checksCount}"></div>` : ''}
                                ${user.pingsCount > 0 ? `<div class="bar-segment bar-pings" style="width: ${pingsWidth}%" title="Pings: ${user.pingsCount}"></div>` : ''}
                                ${user.doneCount > 0 ? `<div class="bar-segment bar-done" style="width: ${doneWidth}%" title="Done: ${user.doneCount}"></div>` : ''}
                                <span class="graph-bar-value">${user.count}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            // Tech leaderboard (original style)
            container.innerHTML = topUsers.map((user, index) => {
                const barWidth = maxCount > 0 ? (user.count / maxCount) * 100 : 0;
                const kudosDisplay = user.kudosCount > 0 
                    ? `<span class="graph-kudos">⭐ ${user.kudosCount}</span>` 
                    : '';
                
                return `
                    <div class="graph-bar-row">
                        <span class="graph-rank">${index + 1}</span>
                        <span class="graph-name" title="${user.username}">${user.username}</span>
                        <div class="graph-bar-container">
                            <div class="graph-bar ${type}-bar" style="width: ${Math.max(barWidth, 8)}%">
                                <span class="graph-bar-value">${user.count}</span>
                            </div>
                        </div>
                        ${kudosDisplay}
                    </div>
                `;
            }).join('');
        }
    }
    
    renderLeaderboardTable(container, data, type) {
        if (!container) return;
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="leaderboard-empty">
                    <p>No data available for this week</p>
                </div>
            `;
            return;
        }
        
        // Take top 10
        const topUsers = data.slice(0, 10);
        
        if (type === 'lead') {
            // Lead table with breakdown columns
            const rows = topUsers.map((user, index) => {
                const rankClass = index < 3 ? `rank-${index + 1}` : 'rank-default';
                
                return `
                    <tr>
                        <td class="table-rank">
                            <span class="table-rank-badge ${rankClass}">${index + 1}</span>
                        </td>
                        <td class="table-name">${user.username}</td>
                        <td class="table-count">${user.count}</td>
                        <td class="table-kudos">${user.kudosCount > 0 ? `⭐ ${user.kudosCount}` : '-'}</td>
                        <td class="table-checks">${user.checksCount > 0 ? `✓ ${user.checksCount}` : '-'}</td>
                        <td class="table-pings">${user.pingsCount > 0 ? `🔔 ${user.pingsCount}` : '-'}</td>
                    </tr>
                `;
            }).join('');
            
            container.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th class="table-rank">Rank</th>
                            <th>Name</th>
                            <th>Total</th>
                            <th>Kudos</th>
                            <th>Checks</th>
                            <th>Pings</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            `;
        } else {
            // Tech table (original style)
            const rows = topUsers.map((user, index) => {
                const rankClass = index < 3 ? `rank-${index + 1}` : 'rank-default';
                
                return `
                    <tr>
                        <td class="table-rank">
                            <span class="table-rank-badge ${rankClass}">${index + 1}</span>
                        </td>
                        <td class="table-name">${user.username}</td>
                        <td class="table-count">${user.count}</td>
                        <td class="table-kudos">${user.kudosCount > 0 ? `⭐ ${user.kudosCount}` : '-'}</td>
                    </tr>
                `;
            }).join('');
            
            container.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th class="table-rank">Rank</th>
                            <th>Name</th>
                            <th>Checks</th>
                            <th>Kudos</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            `;
        }
    }

    showEmptyLeaderboards(message = 'No data available for this week') {
        const emptyMessage = `
            <div class="leaderboard-empty">
                <p>${message}</p>
            </div>
        `;
        
        if (this.techLeaderboardGraph) this.techLeaderboardGraph.innerHTML = emptyMessage;
        if (this.techLeaderboardTable) this.techLeaderboardTable.innerHTML = emptyMessage;
        if (this.leadLeaderboardGraph) this.leadLeaderboardGraph.innerHTML = emptyMessage;
        if (this.leadLeaderboardTable) this.leadLeaderboardTable.innerHTML = emptyMessage;
    }
}
