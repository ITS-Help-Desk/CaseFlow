export default class LogsChat {
    constructor() {
        this.logsContainer = document.getElementById('logsContainer');
        this.logsView = document.getElementById('logsView');
        this.logsInput = document.getElementById('logsInput');
        this.messagesContainer = document.querySelector('.logs-messages');
        
        this.initialize();
    }

    initialize() {
        // Add send message functionality
        const sendButton = this.logsContainer.querySelector('.btn-send');
        sendButton.addEventListener('click', () => this.sendMessage());
        
        // Add enter key functionality
        this.logsInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Add some sample messages (replace with real data later)
        this.addMessage({
            user: 'System',
            message: 'Welcome to Logs Chat',
            timestamp: new Date()
        });
    }

    showLogsView() {
        // Hide all other views
        document.querySelectorAll('[id$="View"]').forEach(view => {
            view.style.display = 'none';
        });
        this.logsView.style.display = 'block';
    }

    sendMessage() {
        const message = this.logsInput.value.trim();
        if (message) {
            this.addMessage({
                user: 'You', // Replace with actual user name
                message: message,
                timestamp: new Date()
            });
            this.logsInput.value = '';
        }
    }

    addMessage(messageData) {
        const messageElement = document.createElement('div');
        messageElement.className = 'log-message';
        
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-user">${messageData.user}</span>
                <span class="message-time">${messageData.timestamp.toLocaleTimeString()}</span>
            </div>
            <div class="message-content">${messageData.message}</div>
        `;
        
        this.messagesContainer.appendChild(messageElement);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
} 