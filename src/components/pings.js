export default class Pings {
    constructor() {
        this.pingsContainer = document.getElementById('pingsContainer');
        this.pingsView = document.getElementById('pingsView');
        this.pingsList = document.querySelector('.pings-list');
        
        this.initialize();
    }

    initialize() {
        // Add sample notification (replace with real data later)
        this.addPing({
            title: 'Welcome',
            message: 'You will see your notifications here',
            timestamp: new Date(),
            read: false
        });
    }

    addPing(ping) {
        const pingElement = document.createElement('div');
        pingElement.className = `ping-item ${ping.read ? 'read' : 'unread'}`;
        
        pingElement.innerHTML = `
            <div class="ping-header">
                <span class="ping-title">${ping.title}</span>
                <span class="ping-time">
                    ${ping.timestamp.toLocaleTimeString()}
                </span>
            </div>
            <div class="ping-content">${ping.message}</div>
        `;
        
        // Add click handler to mark as read
        pingElement.addEventListener('click', () => {
            pingElement.classList.remove('unread');
            pingElement.classList.add('read');
        });
        
        this.pingsList.insertBefore(pingElement, this.pingsList.firstChild);
    }
} 