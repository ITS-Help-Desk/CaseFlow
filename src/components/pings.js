// Import API configuration
import { API_BASE_URL } from '../../config.js';

export default class Pings {
    constructor() {
        this.pingsContainer = document.getElementById('pingsContainer');
        this.pingsView = document.getElementById('pingsView');
        this.pingsList = document.querySelector('.pings-list');
        this.websocket = null;
        
        this.initialize();
        this.initializeWebSocket();
    }

    initialize() {
        // Load pings from API
        this.loadPingsFromAPI();
    }

    // Get authentication headers
    getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Token ${token}`
        };
    }

    // Load pings from API
    async loadPingsFromAPI() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/reviewedclaim/list/`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                console.error('Failed to load pings:', response.status);
                this.showWelcomeMessage();
                return;
            }

            const reviewedClaims = await response.json();
            
            // Convert reviewed claims to ping format
            const pings = reviewedClaims
                .filter(claim => this.isPingStatus(claim.status))
                .map(claim => this.convertReviewedClaimToPing(claim))
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // Clear existing pings
            this.pingsList.innerHTML = '';
            
            if (pings.length === 0) {
                this.showWelcomeMessage();
            } else {
                pings.forEach(ping => this.addPing(ping));
            }

        } catch (error) {
            console.error('Error loading pings:', error);
            this.showWelcomeMessage();
        }
    }

    // Check if a status is a ping status
    isPingStatus(status) {
        return ['pingedlow', 'pingedmed', 'pingedhigh'].includes(status);
    }

    // Convert backend status to frontend severity
    mapBackendStatusToSeverity(backendStatus) {
        const statusMap = {
            'pingedlow': 'Low',
            'pingedmed': 'Moderate',
            'pingedhigh': 'High'
        };
        return statusMap[backendStatus] || 'Low';
    }

    // Convert ReviewedClaim to ping format
    convertReviewedClaimToPing(reviewedClaim) {
        const severity = this.mapBackendStatusToSeverity(reviewedClaim.status);
        
        // Parse description and todo from comment
        const comment = reviewedClaim.comment || '';
        const parts = comment.split('\n\nTo Do:');
        const description = parts[0] || '';
        const todo = parts[1] || '';

        return {
            id: reviewedClaim.id,
            caseNumber: reviewedClaim.casenum,
            caseId: reviewedClaim.id,
            severity: severity,
            description: description,
            todo: todo,
            sender: reviewedClaim.lead_id?.username || 'Unknown User',
            timestamp: new Date(reviewedClaim.review_time),
            status: 'pending', // All pings start as pending
            reviewedClaimId: reviewedClaim.id,
            acknowledgedBy: null,
            acknowledgedAt: null,
            resolution: null,
            resolvedAt: null
        };
    }

    // Show welcome message when no pings exist
    showWelcomeMessage() {
        this.addPing({
            id: 'welcome',
            title: 'Welcome',
            message: 'You will see your notifications here',
            timestamp: new Date(),
            read: false,
            severity: 'Low',
            status: 'pending'
        });
    }

    loadPingsFromStorage() {
        if (window.pingStorage && Array.isArray(window.pingStorage)) {
            // Sort by timestamp (newest first)
            const sortedPings = [...window.pingStorage].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            sortedPings.forEach(ping => this.addPing(ping));
        }
    }

    addPing(ping) {
        const pingElement = document.createElement('div');
        pingElement.className = `ping-item ${ping.read ? 'read' : 'unread'}`;
        pingElement.dataset.pingId = ping.id;
        
        // Build the ping content based on status
        let content = this.buildPingContent(ping);
        pingElement.innerHTML = content;
        
        // Add event listeners
        this.setupPingEventListeners(pingElement, ping);
        
        this.pingsList.insertBefore(pingElement, this.pingsList.firstChild);
    }

    buildPingContent(ping) {
        const timeString = ping.timestamp.toLocaleTimeString();
        const statusClass = ping.status || 'pending';
        
        let actionsHTML = '';
        let acknowledgeSection = '';
        
        if (ping.status === 'pending') {
            actionsHTML = `
                <div class="ping-actions">
                    <button class="btn btn-primary btn-acknowledge">Acknowledge</button>
                </div>
            `;
        } else if (ping.status === 'acknowledged') {
            actionsHTML = `
                <div class="ping-actions">
                    <button class="btn btn-success btn-resolve">Mark as Resolved</button>
                    <button class="btn btn-secondary btn-unping">Unping</button>
                </div>
            `;
        } else if (ping.status === 'resolved') {
            // No action buttons for resolved status
            actionsHTML = '';
        } else if (ping.status === 'unpinged') {
            // No action buttons for unpinged status
            actionsHTML = '';
        }
        
        if (ping.status === 'acknowledged' && ping.resolution) {
            acknowledgeSection = `
                <div class="ping-acknowledge-section">
                    <strong>Resolution:</strong>
                    <p>${ping.resolution}</p>
                </div>
            `;
        }
        
        return `
            <div class="ping-header">
                <span class="ping-title">
                    <span class="ping-severity">${ping.severity || 'Low'}</span>
                    Case ${ping.caseNumber || 'Unknown'} - ${ping.title || 'Ping'}
                    <span class="ping-status ${statusClass}">${statusClass}</span>
                </span>
                <span class="ping-time">${timeString}</span>
            </div>
            <div class="ping-content">
                <p><strong>From:</strong> ${ping.sender || 'Unknown User'}</p>
                <p><strong>Description:</strong> ${ping.description || ping.message || 'No description'}</p>
                ${ping.todo ? `<p><strong>To Do:</strong> ${ping.todo}</p>` : ''}
                ${acknowledgeSection}
            </div>
            ${actionsHTML}
        `;
    }

    setupPingEventListeners(pingElement, ping) {
        // Mark as read on click
        pingElement.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                pingElement.classList.remove('unread');
                pingElement.classList.add('read');
                ping.read = true;
            }
        });

        // Acknowledge button
        const acknowledgeBtn = pingElement.querySelector('.btn-acknowledge');
        if (acknowledgeBtn) {
            acknowledgeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showAcknowledgeModal(pingElement, ping);
            });
        }

        // Resolve button
        const resolveBtn = pingElement.querySelector('.btn-resolve');
        if (resolveBtn) {
            resolveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.resolvePing(pingElement, ping);
            });
        }

        // Unping button
        const unpingBtn = pingElement.querySelector('.btn-unping');
        if (unpingBtn) {
            unpingBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.unping(pingElement, ping);
            });
        }
    }

    showAcknowledgeModal(pingElement, ping) {
        const acknowledgeSection = pingElement.querySelector('.ping-acknowledge-section');
        if (acknowledgeSection) {
            acknowledgeSection.style.display = 'block';
            return;
        }

        // Create acknowledge section
        const section = document.createElement('div');
        section.className = 'ping-acknowledge-section';
        section.innerHTML = `
            <textarea placeholder="What did you fix? (optional)" maxlength="1000"></textarea>
            <div class="ping-actions">
                <button class="btn btn-primary btn-submit-acknowledge">Submit</button>
                <button class="btn btn-secondary btn-cancel-acknowledge">Cancel</button>
            </div>
        `;

        pingElement.querySelector('.ping-content').appendChild(section);

        // Set up event listeners
        const submitBtn = section.querySelector('.btn-submit-acknowledge');
        const cancelBtn = section.querySelector('.btn-cancel-acknowledge');
        const textarea = section.querySelector('textarea');

        submitBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const resolution = textarea.value.trim();
            this.acknowledgePing(pingElement, ping, resolution);
        });

        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            section.remove();
        });
    }

    async acknowledgePing(pingElement, ping, resolution) {
        try {
            // Update ping data locally
            ping.status = 'acknowledged';
            ping.acknowledgedBy = localStorage.getItem('username') || 'Current User';
            ping.acknowledgedAt = new Date();
            ping.resolution = resolution;

            // Update UI
            pingElement.innerHTML = this.buildPingContent(ping);
            this.setupPingEventListeners(pingElement, ping);

            // Note: Backend doesn't have acknowledge endpoint, so we just update locally
            // In a real implementation, you'd need to add an acknowledge endpoint
            console.log('Ping acknowledged locally:', ping);

        } catch (error) {
            console.error('Error acknowledging ping:', error);
            alert('Failed to acknowledge ping');
        }
    }

    async resolvePing(pingElement, ping) {
        try {
            // For now, just update locally since we don't have a proper resolve endpoint
            // The backend doesn't have a specific endpoint to update existing ReviewedClaim status
            ping.status = 'resolved';
            ping.resolvedAt = new Date();

            // Update UI
            pingElement.innerHTML = this.buildPingContent(ping);
            this.setupPingEventListeners(pingElement, ping);

            console.log('Ping resolved locally:', ping);

        } catch (error) {
            console.error('Error resolving ping:', error);
            alert('Failed to resolve ping');
        }
    }

    async unping(pingElement, ping) {
        try {
            // Remove the ping from the UI
            pingElement.remove();

            // Remove from storage if it exists
            if (window.pingStorage) {
                window.pingStorage = window.pingStorage.filter(p => p.id !== ping.id);
            }

            console.log('Ping removed:', ping);

        } catch (error) {
            console.error('Error unpinging:', error);
            alert('Failed to unping');
        }
    }

    updatePingInStorage(ping) {
        if (window.pingStorage) {
            const index = window.pingStorage.findIndex(p => p.id === ping.id);
            if (index !== -1) {
                window.pingStorage[index] = ping;
            }
        }
    }

    // WebSocket methods for real-time updates
    initializeWebSocket() {
        try {
            // Use ws:// for development, wss:// for production
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsHost = '10.41.16.153:8000'; // Your API host
            this.websocket = new WebSocket(`${wsProtocol}//${wsHost}/ws/caseflow/`);

            this.websocket.onopen = () => {
                console.log('WebSocket connected to caseflow channel (pings)');
            };

            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.websocket.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason);
                // Attempt to reconnect after 3 seconds
                setTimeout(() => {
                    console.log('Attempting to reconnect WebSocket...');
                    this.initializeWebSocket();
                }, 3000);
            };

            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
        }
    }

    handleWebSocketMessage(data) {
        console.log('Received WebSocket message (pings):', data);
        
        switch (data.type) {
            case 'ping':
                if (data.event === 'create') {
                    // New ping created
                    this.addPing(data.ping);
                } else if (data.event === 'update') {
                    // Ping updated (acknowledged, resolved, etc.)
                    this.updatePing(data.ping);
                } else if (data.event === 'delete') {
                    // Ping deleted/unpinged
                    this.removePing(data.pingId);
                }
                break;
            default:
                console.log('Unknown WebSocket message type for pings:', data.type);
        }
    }

    updatePing(pingData) {
        // Find existing ping element
        const pingElement = this.pingsList.querySelector(`[data-ping-id="${pingData.id}"]`);
        if (pingElement) {
            // Update the ping data in storage
            this.updatePingInStorage(pingData);
            
            // Rebuild the ping content
            pingElement.innerHTML = this.buildPingContent(pingData);
            this.setupPingEventListeners(pingElement, pingData);
        }
    }

    removePing(pingId) {
        const pingElement = this.pingsList.querySelector(`[data-ping-id="${pingId}"]`);
        if (pingElement) {
            pingElement.remove();
        }
        
        // Remove from storage
        if (window.pingStorage) {
            window.pingStorage = window.pingStorage.filter(p => p.id !== pingId);
        }
    }

    // Send ping via WebSocket (for real-time updates)
    sendPingViaWebSocket(ping) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'ping',
                event: 'create',
                ping: ping
            }));
        }
    }

    // Send ping update via WebSocket
    sendPingUpdateViaWebSocket(ping) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'ping',
                event: 'update',
                ping: ping
            }));
        }
    }

    // Clean up WebSocket connection when component is destroyed
    destroy() {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
    }
} 