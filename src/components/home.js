import { API_BASE_URL } from '../../config.js';

export default class Home {
    constructor() {
        this.homeContainer = document.getElementById('homeContainer');
        this.homeView = document.getElementById('homeView');
        this.activityList = document.querySelector('.activity-list');
        this.stats = {
            active: document.querySelector('.stat-card:nth-child(1) .stat-number'),
            completed: document.querySelector('.stat-card:nth-child(2) .stat-number'),
            total: document.querySelector('.stat-card:nth-child(3) .stat-number')
        };
        
        this.initialize();
    }

    initialize() {
        // Add sample activity (replace with real data later)
        this.addActivity({
            type: 'case_claimed',
            user: 'System',
            details: 'Welcome to your dashboard',
            timestamp: new Date()
        });

        // Initialize stats (replace with real data)
        this.updateStats({
            active: 0,
            completed: 0,
            total: 0
        });
        
        this.fetchRoles(); // Fetch and display roles
    }

    updateStats(stats) {
        this.stats.active.textContent = stats.active;
        this.stats.completed.textContent = stats.completed;
        this.stats.total.textContent = stats.total;
    }

    async fetchRoles() {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/api/user/roles/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${authToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const roles = await response.json();
            this.displayRoles(roles);
        } catch (error) {
            console.error("Error fetching roles:", error);
        }
    }

    displayRoles(roles) {
        const rolesContainer = document.createElement('div');
        rolesContainer.className = 'roles-container';
        rolesContainer.innerHTML = '<h3>Available Roles:</h3>';
        
        const rolesList = document.createElement('ul');
        rolesList.className = 'roles-list';
        rolesList.style.color = 'white'; // Simple styling for visibility

        roles.forEach(role => {
            const listItem = document.createElement('li');
            listItem.textContent = role.name;
            rolesList.appendChild(listItem);
        });
        
        rolesContainer.appendChild(rolesList);
        this.homeContainer.appendChild(rolesContainer);
    }

    addActivity(activity) {
        const activityElement = document.createElement('div');
        activityElement.className = 'activity-item';
        
        activityElement.innerHTML = `
            <div class="activity-header">
                <span class="activity-user">${activity.user}</span>
                <span class="activity-time">
                    ${activity.timestamp.toLocaleTimeString()}
                </span>
            </div>
            <div class="activity-content">${activity.details}</div>
        `;
        
        this.activityList.insertBefore(activityElement, this.activityList.firstChild);
    }
} 