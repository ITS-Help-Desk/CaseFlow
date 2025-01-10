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
    }

    updateStats(stats) {
        this.stats.active.textContent = stats.active;
        this.stats.completed.textContent = stats.completed;
        this.stats.total.textContent = stats.total;
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